import type { S3Requester } from "./s3-client.ts"

export type S3ListObject = {
	key: string
	size: number
	lastModified?: string
	etag?: string
	storageClass?: string
}

export type S3ObjectMetadata = {
	contentLength: number | null
	contentType: string | null
	etag: string | null
	lastModified: string | null
	headers: Record<string, string>
}

export type S3ListObjectsInput = {
	prefix?: string
	delimiter?: string
	continuationToken?: string
	maxKeys?: number
}

export type S3ListObjectsResult = {
	objects: S3ListObject[]
	commonPrefixes: string[]
	isTruncated: boolean
	nextContinuationToken: string | null
}

export type S3DownloadObjectResult = {
	blob: Blob
	contentType: string | null
	contentDisposition: string | null
}

export class S3ResponseError extends Error {
	constructor(
		message: string,
		public status: number,
		public body: string,
	) {
		super(message)
		this.name = "S3ResponseError"
	}
}

const s3DebugEnabled = !["0", "false", "no", "off"].includes(String(import.meta.env.VITE_S3_DEBUG || "").toLowerCase())

function s3ObjectDebug(message: string, data?: unknown) {
	if (!s3DebugEnabled) return
	if (data === undefined) {
		console.debug(`[s3-object-api] ${message}`)
		return
	}
	console.debug(`[s3-object-api] ${message}`, data)
}

function getNodeText(parent: Element, tagName: string): string | null {
	const node = parent.getElementsByTagName(tagName)[0]
	return node?.textContent?.trim() || null
}

async function responseText(response: Response): Promise<string> {
	try {
		return await response.text()
	} catch {
		return ""
	}
}

async function throwOnHttpError(response: Response, fallbackMessage: string): Promise<void> {
	if (response.ok) return
	const body = await responseText(response)
	const message = body || `${fallbackMessage} (${response.status})`
	s3ObjectDebug("http_error", {
		fallbackMessage,
		status: response.status,
		statusText: response.statusText,
		body,
	})
	throw new S3ResponseError(message, response.status, body)
}

function parseListObjectsXml(xml: string): S3ListObjectsResult {
	const parser = new DOMParser()
	const doc = parser.parseFromString(xml, "application/xml")
	const parseError = doc.getElementsByTagName("parsererror")[0]
	if (parseError) {
		s3ObjectDebug("xml_parse_error", {
			error: parseError.textContent || "",
			xmlHead: xml.slice(0, 500),
		})
		throw new Error("Failed to parse S3 XML response")
	}

	const listResult = doc.getElementsByTagName("ListBucketResult")[0]
	if (!listResult) {
		throw new Error("Invalid S3 XML response: missing ListBucketResult")
	}

	const objects = Array.from(listResult.getElementsByTagName("Contents")).map((node) => {
		const key = getNodeText(node, "Key") || ""
		const size = Number(getNodeText(node, "Size") || 0)
		return {
			key,
			size,
			lastModified: getNodeText(node, "LastModified") || undefined,
			etag: getNodeText(node, "ETag") || undefined,
			storageClass: getNodeText(node, "StorageClass") || undefined,
		} satisfies S3ListObject
	})

	const commonPrefixes = Array.from(listResult.getElementsByTagName("CommonPrefixes"))
		.map((node) => getNodeText(node, "Prefix"))
		.filter((prefix): prefix is string => Boolean(prefix))

	const isTruncated = (getNodeText(listResult, "IsTruncated") || "").toLowerCase() === "true"
	const nextContinuationToken = getNodeText(listResult, "NextContinuationToken")

	return {
		objects,
		commonPrefixes,
		isTruncated,
		nextContinuationToken,
	}
}

export async function listObjectsV2(client: S3Requester, bucket: string, options: S3ListObjectsInput = {}): Promise<S3ListObjectsResult> {
	s3ObjectDebug("list_objects_start", {
		bucket,
		prefix: options.prefix || "",
		delimiter: options.delimiter || "",
		continuationToken: options.continuationToken || null,
		maxKeys: options.maxKeys || 200,
	})
	const response = await client.request({
		method: "GET",
		bucket,
		query: {
			"list-type": 2,
			prefix: options.prefix || undefined,
			delimiter: options.delimiter || undefined,
			"continuation-token": options.continuationToken || undefined,
			"max-keys": options.maxKeys || 200,
		},
	})

	await throwOnHttpError(response, "Unable to list S3 objects")
	const parsed = parseListObjectsXml(await response.text())
	s3ObjectDebug("list_objects_done", {
		bucket,
		objectCount: parsed.objects.length,
		commonPrefixCount: parsed.commonPrefixes.length,
		isTruncated: parsed.isTruncated,
		nextContinuationToken: parsed.nextContinuationToken,
	})
	return parsed
}

export async function getObjectMetadata(client: S3Requester, bucket: string, key: string): Promise<S3ObjectMetadata> {
	const response = await client.request({
		method: "HEAD",
		bucket,
		key,
	})

	await throwOnHttpError(response, "Unable to load object metadata")

	return {
		contentLength: Number(response.headers.get("content-length")) || null,
		contentType: response.headers.get("content-type"),
		etag: response.headers.get("etag"),
		lastModified: response.headers.get("last-modified"),
		headers: Object.fromEntries(response.headers.entries()),
	}
}

export async function deleteObject(client: S3Requester, bucket: string, key: string): Promise<void> {
	const response = await client.request({
		method: "DELETE",
		bucket,
		key,
	})

	await throwOnHttpError(response, "Unable to delete object")
}

export async function downloadObject(client: S3Requester, bucket: string, key: string): Promise<S3DownloadObjectResult> {
	const response = await client.request({
		method: "GET",
		bucket,
		key,
	})

	await throwOnHttpError(response, "Unable to download object")

	return {
		blob: await response.blob(),
		contentType: response.headers.get("content-type"),
		contentDisposition: response.headers.get("content-disposition"),
	}
}

export async function uploadObject(
	client: S3Requester,
	bucket: string,
	key: string,
	file: File,
	contentType?: string | null,
): Promise<{ etag: string | null }> {
	const response = await client.request({
		method: "PUT",
		bucket,
		key,
		body: file,
		headers: {
			"content-type": contentType || file.type || "application/octet-stream",
		},
	})

	await throwOnHttpError(response, "Unable to upload object")
	return {
		etag: response.headers.get("etag"),
	}
}