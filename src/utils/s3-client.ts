const EMPTY_PAYLOAD_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

const textEncoder = new TextEncoder()

export type S3Method = "GET" | "PUT" | "POST" | "DELETE" | "HEAD"
export type S3QueryValue = string | number | boolean | null | undefined
export type S3Query = Record<string, S3QueryValue | S3QueryValue[]>

export type S3ClientConfig = {
	endpoint: string
	region: string
	accessKeyId: string
	secretAccessKey: string
	sessionToken?: string
	forcePathStyle: boolean
	requestEndpoint?: string
}

export type S3RequestInput = {
	method: S3Method
	bucket: string
	key?: string
	query?: S3Query
	headers?: HeadersInit
	body?: BodyInit | null
}

export type S3Requester = {
	request(input: S3RequestInput): Promise<Response>
}

export class S3ConfigError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "S3ConfigError"
	}
}

const s3DebugEnabled = envFlag("VITE_S3_DEBUG", false)

function s3Debug(message: string, data?: unknown) {
	if (!s3DebugEnabled) return
	if (data === undefined) {
		console.debug(`[s3] ${message}`)
		return
	}
	console.debug(`[s3] ${message}`, data)
}

function resolveUrl(input: string): URL {
	if (input.startsWith("http://") || input.startsWith("https://")) {
		return new URL(input)
	}

	if (typeof window !== "undefined") {
		return new URL(input, window.location.origin)
	}

	throw new S3ConfigError(`Relative S3 URL "${input}" requires browser runtime`)
}

function encodeRfc3986(value: string): string {
	return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function normalizePath(path: string): string {
	const normalized = path.replace(/\/{2,}/g, "/")
	if (normalized === "") return "/"
	return normalized.startsWith("/") ? normalized : `/${normalized}`
}

function joinPath(basePath: string, ...parts: string[]): string {
	const cleanedBase = basePath.replace(/\/+$/, "")
	const cleanedParts = parts
		.map((part) => part.trim())
		.filter((part) => part.length > 0)
		.map((part) => part.replace(/^\/+|\/+$/g, ""))

	const joined = [cleanedBase, ...cleanedParts].filter(Boolean).join("/")
	return normalizePath(joined)
}

function encodeObjectKey(key: string): string {
	return key
		.split("/")
		.map((segment) => encodeRfc3986(segment))
		.join("/")
}

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
	if (data.buffer instanceof ArrayBuffer && data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
		return data.buffer
	}

	const copy = new Uint8Array(data.byteLength)
	copy.set(data)
	return copy.buffer
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
	const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
	return toHex(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)))
}

async function importHmacKey(raw: ArrayBuffer | Uint8Array | string): Promise<CryptoKey> {
	const bytes = typeof raw === "string" ? textEncoder.encode(raw) : raw instanceof Uint8Array ? raw : new Uint8Array(raw)
	return crypto.subtle.importKey("raw", toArrayBuffer(bytes), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
}

async function hmacSha256(rawKey: ArrayBuffer | Uint8Array | string, data: string): Promise<ArrayBuffer> {
	const key = await importHmacKey(rawKey)
	return crypto.subtle.sign("HMAC", key, toArrayBuffer(textEncoder.encode(data)))
}

async function createSigningKey(secretAccessKey: string, dateStamp: string, region: string): Promise<ArrayBuffer> {
	const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp)
	const kRegion = await hmacSha256(kDate, region)
	const kService = await hmacSha256(kRegion, "s3")
	return hmacSha256(kService, "aws4_request")
}

function normalizeHeaderValue(value: string): string {
	return value.replace(/\s+/g, " ").trim()
}

function toCanonicalQueryString(query?: S3Query): string {
	if (!query) return ""

	const pairs: Array<[string, string]> = []
	for (const [key, value] of Object.entries(query)) {
		if (value == null) continue

		if (Array.isArray(value)) {
			for (const item of value) {
				if (item == null) continue
				pairs.push([key, String(item)])
			}
		} else {
			pairs.push([key, String(value)])
		}
	}

	pairs.sort((a, b) => {
		if (a[0] === b[0]) return a[1].localeCompare(b[1])
		return a[0].localeCompare(b[0])
	})

	return pairs.map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`).join("&")
}

async function bodyToBytes(body?: BodyInit | null): Promise<Uint8Array> {
	if (!body) return new Uint8Array()
	if (typeof body === "string") return textEncoder.encode(body)
	if (body instanceof URLSearchParams) return textEncoder.encode(body.toString())
	if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer())
	if (body instanceof ArrayBuffer) return new Uint8Array(body)
	if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength)

	throw new S3ConfigError("Unsupported body type for S3 signing")
}

function getAmzDate(now: Date): { amzDate: string; dateStamp: string } {
	const year = now.getUTCFullYear()
	const month = String(now.getUTCMonth() + 1).padStart(2, "0")
	const day = String(now.getUTCDate()).padStart(2, "0")
	const hours = String(now.getUTCHours()).padStart(2, "0")
	const minutes = String(now.getUTCMinutes()).padStart(2, "0")
	const seconds = String(now.getUTCSeconds()).padStart(2, "0")

	const dateStamp = `${year}${month}${day}`
	return {
		amzDate: `${dateStamp}T${hours}${minutes}${seconds}Z`,
		dateStamp,
	}
}

export class S3Client {
	constructor(private readonly config: S3ClientConfig) {}

	async request(input: S3RequestInput): Promise<Response> {
		const endpointUrl = resolveUrl(this.config.endpoint)
		const requestEndpointUrl = resolveUrl(this.config.requestEndpoint || this.config.endpoint)
		const keyPath = input.key ? encodeObjectKey(input.key) : ""

		const resourcePath = this.config.forcePathStyle
			? joinPath(endpointUrl.pathname, encodeRfc3986(input.bucket), keyPath)
			: joinPath(endpointUrl.pathname, keyPath)
		const requestResourcePath = this.config.forcePathStyle
			? joinPath(requestEndpointUrl.pathname, encodeRfc3986(input.bucket), keyPath)
			: joinPath(requestEndpointUrl.pathname, keyPath)

		if (!this.config.forcePathStyle) {
			endpointUrl.hostname = `${input.bucket}.${endpointUrl.hostname}`
			requestEndpointUrl.hostname = `${input.bucket}.${requestEndpointUrl.hostname}`
		}

		const canonicalQuery = toCanonicalQueryString(input.query)
		endpointUrl.pathname = resourcePath
		requestEndpointUrl.pathname = requestResourcePath
		endpointUrl.search = canonicalQuery
		requestEndpointUrl.search = canonicalQuery

		const bodyBytes = await bodyToBytes(input.body)
		const payloadHash = bodyBytes.length > 0 ? await sha256Hex(bodyBytes) : EMPTY_PAYLOAD_HASH
		const { amzDate, dateStamp } = getAmzDate(new Date())

		const headers = new Headers(input.headers)
		headers.set("x-amz-content-sha256", payloadHash)
		headers.set("x-amz-date", amzDate)
		if (this.config.sessionToken) {
			headers.set("x-amz-security-token", this.config.sessionToken)
		}
		headers.set("host", endpointUrl.host)

		const normalizedHeaders = new Map<string, string>()
		for (const [headerName, headerValue] of headers.entries()) {
			normalizedHeaders.set(headerName.toLowerCase(), normalizeHeaderValue(headerValue))
		}

		const sortedHeaderNames = [...normalizedHeaders.keys()].sort()
		const canonicalHeaders = sortedHeaderNames.map((headerName) => `${headerName}:${normalizedHeaders.get(headerName)}\n`).join("")
		const signedHeaders = sortedHeaderNames.join(";")

		const canonicalRequest = [input.method, endpointUrl.pathname || "/", canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join(
			"\n",
		)

		const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`
		const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(textEncoder.encode(canonicalRequest))].join("\n")
		const signingKey = await createSigningKey(this.config.secretAccessKey, dateStamp, this.config.region)
		const signature = toHex(await hmacSha256(signingKey, stringToSign))

		headers.set(
			"Authorization",
			`AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
		)
		headers.delete("host")
		s3Debug("request", {
			method: input.method,
			bucket: input.bucket,
			key: input.key || null,
			query: input.query || null,
			endpoint: requestEndpointUrl.toString(),
		})

		try {
			const response = await fetch(requestEndpointUrl.toString(), {
				method: input.method,
				headers,
				body: input.body ?? undefined,
			})
			s3Debug("response", {
				method: input.method,
				bucket: input.bucket,
				key: input.key || null,
				status: response.status,
				statusText: response.statusText,
				requestId: response.headers.get("x-amz-request-id"),
				id2: response.headers.get("x-amz-id-2"),
			})
			return response
		} catch (error) {
			s3Debug("network_error", {
				method: input.method,
				bucket: input.bucket,
				key: input.key || null,
				error,
			})
			throw error
		}
	}
}

function envFlag(name: string, defaultValue: boolean): boolean {
	const raw = import.meta.env[name]
	if (raw == null) return defaultValue
	return !["0", "false", "no", "off"].includes(String(raw).toLowerCase())
}

export function createS3ClientFromEnv(): S3Client {
	const endpoint = import.meta.env.VITE_S3_ENDPOINT
	const accessKeyId = import.meta.env.VITE_S3_ACCESS_KEY_ID
	const secretAccessKey = import.meta.env.VITE_S3_SECRET_ACCESS_KEY

	if (!endpoint) {
		throw new S3ConfigError("Missing VITE_S3_ENDPOINT")
	}
	if (!accessKeyId) {
		throw new S3ConfigError("Missing VITE_S3_ACCESS_KEY_ID")
	}
	if (!secretAccessKey) {
		throw new S3ConfigError("Missing VITE_S3_SECRET_ACCESS_KEY")
	}

	const proxyPath = import.meta.env.VITE_S3_PROXY_PATH || "/s3"
	const requestEndpoint = import.meta.env.DEV && endpoint.startsWith("http") ? proxyPath : endpoint
	s3Debug("client_config", {
		endpoint,
		requestEndpoint,
		region: import.meta.env.VITE_S3_REGION || "garage",
		forcePathStyle: envFlag("VITE_S3_FORCE_PATH_STYLE", true),
		hasSessionToken: Boolean(import.meta.env.VITE_S3_SESSION_TOKEN),
	})

	return new S3Client({
		endpoint,
		requestEndpoint,
		accessKeyId,
		secretAccessKey,
		sessionToken: import.meta.env.VITE_S3_SESSION_TOKEN || undefined,
		region: import.meta.env.VITE_S3_REGION || "garage",
		forcePathStyle: envFlag("VITE_S3_FORCE_PATH_STYLE", true),
	})
}