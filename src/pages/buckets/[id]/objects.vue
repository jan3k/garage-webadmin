<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterLink, useRoute } from "vue-router"
import {
	PhArrowClockwise,
	PhArrowLeft,
	PhArrowRight,
	PhDownloadSimple,
	PhEye,
	PhFile,
	PhFolder,
	PhTrash,
	PhUploadSimple,
} from "@phosphor-icons/vue"
import type { components } from "../../../api-schema.d.ts"
import Banner from "../../../components/Banner.vue"
import BannerError from "../../../components/BannerError.vue"
import LayoutDefault from "../../../components/layouts/Default.vue"
import { client } from "../../../store.ts"
import { successOrThrow } from "../../../utils/api.ts"
import { formatBytes } from "../../../utils/labels.ts"
import { S3ConfigError, createS3ClientFromEnv, type S3Requester } from "../../../utils/s3-client.ts"
import {
	deleteObject,
	downloadObject,
	getObjectMetadata,
	listObjectsV2,
	uploadObject,
	type S3ListObjectsResult,
	type S3ObjectMetadata,
} from "../../../utils/s3-object-api.ts"

type InspectObjectVersionView = Pick<
	components["schemas"]["InspectObjectVersion"],
	"aborted" | "blocks" | "deleteMarker" | "encrypted" | "etag" | "size" | "timestamp" | "uploading" | "uuid"
>
type InspectObjectView = {
	bucketId: string
	key: string
	versions: InspectObjectVersionView[]
}

const route = useRoute()

const bucketId = computed(() => {
	const raw = route.params.id
	return Array.isArray(raw) ? raw[0] : raw
})

const s3Client = ref<S3Requester | null>(null)
const s3ConfigError = ref<string | null>(null)

try {
	s3Client.value = createS3ClientFromEnv()
} catch (error) {
	if (error instanceof S3ConfigError) {
		s3ConfigError.value = error.message
	} else if (error instanceof Error) {
		s3ConfigError.value = `${error.name}: ${error.message}`
	} else {
		s3ConfigError.value = "Unable to initialize S3 client"
	}
}

const prefix = ref<string>("")
const delimiter = ref<string>("/")
const continuationToken = ref<string | null>(null)
const nextContinuationToken = ref<string | null>(null)
const isTruncated = ref<boolean>(false)
const listing = ref<S3ListObjectsResult | null>(null)
const loading = ref<boolean>(false)
const error = ref<unknown | null>(null)

const metadataByKey = ref<Record<string, S3ObjectMetadata>>({})
const metadataError = ref<unknown | null>(null)
const metadataLoadingKey = ref<string | null>(null)

const actionLoadingKey = ref<string | null>(null)
const actionError = ref<unknown | null>(null)
const actionInfo = ref<string | null>(null)

const uploadFile = ref<File | null>(null)
const uploadKey = ref<string>("")
const uploadLoading = ref<boolean>(false)

const inspectLoading = ref<boolean>(false)
const inspectError = ref<unknown | null>(null)
const inspectObject = ref<InspectObjectView | null>(null)
const inspectObjectKey = ref<string>("")

const objects = computed(() => listing.value?.objects || [])
const folders = computed(() => listing.value?.commonPrefixes || [])

const folderParts = computed(() => {
	const normalized = prefix.value.replace(/^\/+|\/+$/g, "")
	if (!normalized) return []

	const parts = normalized.split("/").filter(Boolean)
	const result: Array<{ label: string; value: string }> = []
	let current = ""
	for (const part of parts) {
		current = `${current}${part}/`
		result.push({ label: part, value: current })
	}
	return result
})

const parentPrefix = computed(() => {
	if (!prefix.value) return ""
	const parts = prefix.value.split("/").filter(Boolean)
	if (parts.length <= 1) return ""
	return `${parts.slice(0, -1).join("/")}/`
})

function objectLabel(key: string): string {
	const normalized = key.endsWith("/") ? key.slice(0, -1) : key
	const segments = normalized.split("/")
	return segments[segments.length - 1] || key
}

function resetMessages() {
	actionError.value = null
	actionInfo.value = null
}

async function loadObjects({ resetToken = true }: { resetToken?: boolean } = {}) {
	if (!s3Client.value || !bucketId.value) return

	try {
		loading.value = true
		error.value = null
		if (resetToken) continuationToken.value = null

		const result = await listObjectsV2(s3Client.value, bucketId.value, {
			prefix: prefix.value || undefined,
			delimiter: delimiter.value || undefined,
			continuationToken: continuationToken.value || undefined,
		})

		listing.value = result
		nextContinuationToken.value = result.nextContinuationToken
		isTruncated.value = result.isTruncated
	} catch (newError) {
		listing.value = null
		error.value = newError
	} finally {
		loading.value = false
	}
}

function openPrefix(newPrefix: string) {
	prefix.value = newPrefix
	continuationToken.value = null
	loadObjects({ resetToken: true })
}

function openParentPrefix() {
	prefix.value = parentPrefix.value
	continuationToken.value = null
	loadObjects({ resetToken: true })
}

function refresh() {
	loadObjects({ resetToken: true })
}

async function nextPage() {
	if (!nextContinuationToken.value) return
	continuationToken.value = nextContinuationToken.value
	await loadObjects({ resetToken: false })
}

async function loadMetadata(key: string) {
	if (!s3Client.value || !bucketId.value) return

	try {
		metadataLoadingKey.value = key
		metadataError.value = null
		metadataByKey.value[key] = await getObjectMetadata(s3Client.value, bucketId.value, key)
	} catch (newError) {
		metadataError.value = newError
	} finally {
		metadataLoadingKey.value = null
	}
}

async function download(key: string) {
	if (!s3Client.value || !bucketId.value) return

	try {
		actionLoadingKey.value = key
		resetMessages()
		const result = await downloadObject(s3Client.value, bucketId.value, key)
		const objectUrl = URL.createObjectURL(result.blob)
		const link = document.createElement("a")
		link.href = objectUrl
		link.download = objectLabel(key)
		document.body.appendChild(link)
		link.click()
		link.remove()
		URL.revokeObjectURL(objectUrl)
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoadingKey.value = null
	}
}

async function removeObject(key: string) {
	if (!s3Client.value || !bucketId.value) return
	if (!window.confirm(`Delete object "${key}"?`)) return

	try {
		actionLoadingKey.value = key
		resetMessages()
		await deleteObject(s3Client.value, bucketId.value, key)
		actionInfo.value = `Deleted object "${key}"`
		await loadObjects({ resetToken: true })
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoadingKey.value = null
	}
}

async function inspectByKey(key: string) {
	if (!bucketId.value) return

	try {
		inspectLoading.value = true
		inspectError.value = null
		inspectObjectKey.value = key
		const response = successOrThrow(
			await client.GET("/v2/InspectObject", {
				params: {
					query: {
						bucketId: bucketId.value,
						key,
					},
				},
			}),
		)
		inspectObject.value = {
			bucketId: response.bucketId,
			key: response.key,
			versions: response.versions.map((version) => ({
				aborted: version.aborted,
				blocks: version.blocks,
				deleteMarker: version.deleteMarker,
				encrypted: version.encrypted,
				etag: version.etag,
				size: version.size,
				timestamp: version.timestamp,
				uploading: version.uploading,
				uuid: version.uuid,
			})),
		}
	} catch (newError) {
		inspectObject.value = null
		inspectError.value = newError
	} finally {
		inspectLoading.value = false
	}
}

function onUploadFileChange(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0] || null
	uploadFile.value = file
	if (!file) return

	if (!uploadKey.value.trim()) {
		uploadKey.value = `${prefix.value}${file.name}`
	}
}

async function submitUpload(event: SubmitEvent) {
	event.preventDefault()
	if (!s3Client.value || !bucketId.value || !uploadFile.value) return

	const key = uploadKey.value.trim() || `${prefix.value}${uploadFile.value.name}`
	if (!key) return

	try {
		uploadLoading.value = true
		resetMessages()
		await uploadObject(s3Client.value, bucketId.value, key, uploadFile.value, uploadFile.value.type)
		actionInfo.value = `Uploaded "${key}"`
		uploadFile.value = null
		uploadKey.value = ""
		await loadObjects({ resetToken: true })
	} catch (newError) {
		actionError.value = newError
	} finally {
		uploadLoading.value = false
	}
}

function objectMetadata(key: string): S3ObjectMetadata | null {
	return metadataByKey.value[key] || null
}

watch(
	bucketId,
	() => {
		prefix.value = ""
		continuationToken.value = null
		loadObjects({ resetToken: true })
	},
	{ immediate: true },
)
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Bucket objects</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': loading }" @click="refresh">
					<PhArrowClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<Banner type="warn" v-if="s3ConfigError" icon>
			S3 client is not configured: {{ s3ConfigError }}. Configure `VITE_S3_ENDPOINT`, `VITE_S3_ACCESS_KEY_ID`, and
			`VITE_S3_SECRET_ACCESS_KEY`.
		</Banner>
		<BannerError v-if="error" :error="error" id="bucket_objects_error" />
		<BannerError v-if="actionError" :error="actionError" id="bucket_objects_action_error" />
		<BannerError v-if="metadataError" :error="metadataError" id="bucket_objects_metadata_error" />
		<BannerError v-if="inspectError" :error="inspectError" id="bucket_objects_inspect_error" />
		<Banner v-if="actionInfo">{{ actionInfo }}</Banner>

		<div class="card flex flex-column gap gap--12">
			<div class="flex flex-wrap gap gap--8 items-center">
				<RouterLink :to="{ path: `/buckets/${bucketId}` }" class="btn btn--small">
					<PhArrowLeft :size="16" weight="bold" />Back to bucket
				</RouterLink>
				<span class="tag tag--small color-gray text-uppercase text-monospace">{{ bucketId }}</span>
			</div>
			<div class="flex flex-wrap gap gap--8 items-center">
				<span class="color-gray text-small">Path:</span>
				<button class="btn btn--small" @click="openPrefix('')">/</button>
				<template v-for="part in folderParts" :key="part.value">
					<span class="color-gray">/</span>
					<button class="btn btn--small" @click="openPrefix(part.value)">{{ part.label }}</button>
				</template>
			</div>
			<form class="grid grid-3 lg:grid-1 gap--10" @submit.prevent="refresh">
				<div class="f-group m0">
					<label for="objects_prefix">Prefix</label>
					<input id="objects_prefix" type="text" v-model="prefix" placeholder="folder/subfolder/" />
				</div>
				<div class="f-group m0">
					<label for="objects_delimiter">Delimiter</label>
					<input id="objects_delimiter" type="text" v-model="delimiter" placeholder="/" />
				</div>
				<div class="f-group m0 flex items-end">
					<button class="btn btn--primary w100">Apply filters</button>
				</div>
			</form>
		</div>

		<div class="card flex flex-column gap gap--12 mt12">
			<div class="text-semibold">Upload object</div>
			<form class="grid grid-3 lg:grid-1 gap--10" @submit="submitUpload">
				<div class="f-group m0">
					<label for="object_file">File</label>
					<input id="object_file" type="file" @change="onUploadFileChange" required />
				</div>
				<div class="f-group m0">
					<label for="object_key">Object key</label>
					<input id="object_key" type="text" v-model="uploadKey" placeholder="path/to/file.ext" />
				</div>
				<div class="f-group m0 flex items-end">
					<button class="btn btn--primary w100" :class="{ 'btn--loading': uploadLoading }">
						<PhUploadSimple :size="20" weight="bold" />Upload
					</button>
				</div>
			</form>
		</div>

		<div class="card flex flex-column gap gap--12 mt12">
			<div class="text-semibold">Folders</div>
			<div class="flex flex-wrap gap gap--8" v-if="prefix">
				<button class="btn btn--small" @click="openParentPrefix"><PhArrowLeft :size="16" weight="bold" />Up</button>
			</div>
			<div class="flex flex-column gap gap--8" v-if="folders.length > 0">
				<button class="cardLink" v-for="folder in folders" :key="folder" @click="openPrefix(folder)">
					<div class="flex-grow min-w0 flex items-center gap gap--8">
						<PhFolder :size="18" weight="fill" />
						<span class="text-semibold">{{ folder }}</span>
					</div>
					<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
				</button>
			</div>
			<div class="color-gray text-small" v-else>No prefixes in current view</div>
		</div>

		<div class="card flex flex-column gap gap--12 mt12">
			<div class="text-semibold">Objects</div>
			<div class="flex flex-column gap gap--8" v-if="objects.length > 0">
				<div class="card flex flex-column gap gap--8" v-for="object in objects" :key="object.key">
					<div class="flex flex-wrap gap gap--10 items-center justify-between">
						<div class="flex flex-wrap gap gap--8 items-center min-w0">
							<PhFile :size="18" weight="duotone" />
							<span class="text-semibold text-break">{{ object.key }}</span>
						</div>
						<div class="inline-flex flex-wrap gap gap--8">
							<button class="btn btn--small" @click="loadMetadata(object.key)"><PhEye :size="16" weight="bold" />Metadata</button>
							<button class="btn btn--small" @click="inspectByKey(object.key)"><PhEye :size="16" weight="bold" />Inspect</button>
							<button class="btn btn--small" :class="{ 'btn--loading': actionLoadingKey === object.key }" @click="download(object.key)">
								<PhDownloadSimple :size="16" weight="bold" />Download
							</button>
							<button class="btn btn--small" :class="{ 'btn--loading': actionLoadingKey === object.key }" @click="removeObject(object.key)">
								<PhTrash :size="16" weight="bold" />Delete
							</button>
						</div>
					</div>
					<div class="grid grid-3 lg:grid-1 gap--10 color-gray text-small">
						<div>Size: {{ formatBytes(object.size).value }} {{ formatBytes(object.size).unit }}</div>
						<div>Last modified: {{ object.lastModified || "-" }}</div>
						<div>ETag: {{ object.etag || "-" }}</div>
					</div>
					<div class="card" v-if="objectMetadata(object.key)">
						<div class="text-semibold mb8">Metadata</div>
						<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
							<div>Content-Type: {{ objectMetadata(object.key)?.contentType || "-" }}</div>
							<div>Content-Length: {{ objectMetadata(object.key)?.contentLength ?? "-" }}</div>
							<div>ETag: {{ objectMetadata(object.key)?.etag || "-" }}</div>
							<div>Last-Modified: {{ objectMetadata(object.key)?.lastModified || "-" }}</div>
						</div>
					</div>
					<div class="color-gray text-small" v-if="metadataLoadingKey === object.key">Loading metadata...</div>
				</div>
			</div>
			<div class="color-gray text-small" v-else-if="!loading">No objects in current view</div>
			<div class="flex justify-end" v-if="isTruncated && nextContinuationToken">
				<button class="btn" @click="nextPage">Next page <PhArrowRight :size="20" weight="bold" /></button>
			</div>
		</div>

		<div class="card flex flex-column gap gap--10 mt12" v-if="inspectObject || inspectLoading">
			<div class="text-semibold">InspectObject diagnostics</div>
			<div class="color-gray text-small" v-if="inspectLoading">Loading diagnostic data...</div>
			<template v-if="inspectObject">
				<div class="color-gray text-small">Object key: {{ inspectObjectKey }}</div>
				<div class="color-gray text-small">Versions: {{ inspectObject.versions.length }}</div>
				<div class="flex flex-column gap gap--8">
					<div class="card" v-for="version in inspectObject.versions" :key="version.uuid">
						<div class="flex flex-wrap gap gap--8 items-center">
							<span class="tag tag--small color-gray text-uppercase text-monospace">{{ version.uuid }}</span>
							<span class="tag tag--small" v-if="version.uploading">Uploading</span>
							<span class="tag tag--small" v-if="version.deleteMarker">Delete marker</span>
						</div>
						<div class="grid grid-3 lg:grid-1 gap--10 color-gray text-small mt8">
							<div>Timestamp: {{ version.timestamp }}</div>
							<div>Size: {{ version.size ?? "-" }}</div>
							<div>Etag: {{ version.etag || "-" }}</div>
						</div>
						<div class="color-gray text-small mt8" v-if="version.blocks">Blocks: {{ version.blocks.length }}</div>
					</div>
				</div>
			</template>
		</div>
	</LayoutDefault>
</template>