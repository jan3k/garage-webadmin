<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterLink, useRoute, useRouter } from "vue-router"
import { PhArrowRight, PhArrowsCounterClockwise, PhBroom, PhFloppyDisk, PhPlus, PhSpinnerGap, PhTrash } from "@phosphor-icons/vue"
import type { components } from "../../api-schema.d.ts"
import Banner from "../../components/Banner.vue"
import BannerError from "../../components/BannerError.vue"
import LayoutDefault from "../../components/layouts/Default.vue"
import { client } from "../../store.ts"
import { successOrThrow } from "../../utils/api.ts"
import { formatBytes } from "../../utils/labels.ts"

type BucketInfo = components["schemas"]["GetBucketInfoResponse"]
type ListKeysResponseItem = components["schemas"]["ListKeysResponseItem"]
type ApiBucketKeyPerm = components["schemas"]["ApiBucketKeyPerm"]
type BucketAliasEnum = components["schemas"]["BucketAliasEnum"]
type UpdateBucketRequestBody = components["schemas"]["UpdateBucketRequestBody"]
type UpdateBucketWebsiteAccess = components["schemas"]["UpdateBucketWebsiteAccess"]

const route = useRoute()
const router = useRouter()

const bucket = ref<BucketInfo | null>(null)
const loading = ref<boolean>(false)
const error = ref<unknown | null>(null)

const actionLoading = ref<boolean>(false)
const actionError = ref<unknown | null>(null)
const actionInfo = ref<string | null>(null)

const knownKeys = ref<ListKeysResponseItem[]>([])
const keysLoading = ref<boolean>(false)

const websiteEnabled = ref<boolean>(false)
const websiteIndexDocument = ref<string>("")
const websiteErrorDocument = ref<string>("")
const websiteRoutingRulesJson = ref<string>("")
const quotaMaxObjects = ref<string>("")
const quotaMaxSize = ref<string>("")
const corsRulesJson = ref<string>("")
const lifecycleRulesJson = ref<string>("")

const newGlobalAlias = ref<string>("")
const newLocalAlias = ref<string>("")
const newLocalAliasAccessKeyId = ref<string>("")

const keyPermissionAccessKeyId = ref<string>("")
const keyPermissionRead = ref<boolean>(false)
const keyPermissionWrite = ref<boolean>(false)
const keyPermissionOwner = ref<boolean>(false)

const cleanupOlderThanSecs = ref<number>(86400)
const deleteConfirm = ref<string>("")

const bucketId = computed(() => {
	const raw = route.params.id
	return Array.isArray(raw) ? raw[0] : raw
})

const bucketName = computed(() => {
	if (!bucket.value) return bucketId.value || "Bucket"
	return bucket.value.globalAliases[0] || bucket.value.id
})

const localAliases = computed(() => {
	if (!bucket.value) return []
	return bucket.value.keys.flatMap((key) =>
		key.bucketLocalAliases.map((alias) => ({
			alias,
			accessKeyId: key.accessKeyId,
			name: key.name,
		})),
	)
})

function formatDate(date?: string | null) {
	if (!date) return "-"
	return new Date(date).toLocaleString()
}

function formatPermission(perm?: boolean) {
	if (perm === true) return "Yes"
	if (perm === false) return "No"
	return "-"
}

function resetActionMessages() {
	actionError.value = null
	actionInfo.value = null
}

function fillFormFromBucket(currentBucket: BucketInfo) {
	websiteEnabled.value = currentBucket.websiteAccess
	websiteIndexDocument.value = currentBucket.websiteConfig?.indexDocument || ""
	websiteErrorDocument.value = currentBucket.websiteConfig?.errorDocument || ""
	websiteRoutingRulesJson.value = currentBucket.websiteConfig?.routingRules
		? JSON.stringify(currentBucket.websiteConfig.routingRules, null, 2)
		: ""

	quotaMaxObjects.value = currentBucket.quotas.maxObjects != null ? String(currentBucket.quotas.maxObjects) : ""
	quotaMaxSize.value = currentBucket.quotas.maxSize != null ? String(currentBucket.quotas.maxSize) : ""
	corsRulesJson.value = currentBucket.corsRules ? JSON.stringify(currentBucket.corsRules, null, 2) : ""
	lifecycleRulesJson.value = currentBucket.lifecycleRules ? JSON.stringify(currentBucket.lifecycleRules, null, 2) : ""
}

async function loadKnownKeys() {
	if (knownKeys.value.length > 0 || keysLoading.value) return
	try {
		keysLoading.value = true
		knownKeys.value = successOrThrow(await client.GET("/v2/ListKeys"))
	} finally {
		keysLoading.value = false
	}
}

async function loadBucket() {
	if (!bucketId.value) return

	try {
		loading.value = true
		error.value = null
		const currentBucket = successOrThrow(
			await client.GET("/v2/GetBucketInfo", {
				params: {
					query: {
						id: bucketId.value,
					},
				},
			}),
		)
		bucket.value = currentBucket
		fillFormFromBucket(currentBucket)
		await loadKnownKeys()
	} catch (newError) {
		bucket.value = null
		error.value = newError
	} finally {
		loading.value = false
	}
}

function parseOptionalJsonArray(raw: string, fieldName: string): unknown[] | null | undefined {
	const value = raw.trim()
	if (!value) return undefined

	let parsed: unknown
	try {
		parsed = JSON.parse(value)
	} catch {
		throw new Error(`${fieldName} must be valid JSON`)
	}

	if (!Array.isArray(parsed)) {
		throw new Error(`${fieldName} must be a JSON array`)
	}

	return parsed
}

function parseOptionalNumber(raw: string, fieldName: string): number | null {
	const value = raw.trim()
	if (!value) return null
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${fieldName} must be a non-negative number`)
	}
	return parsed
}

async function updateBucket() {
	if (!bucket.value) return

	try {
		actionLoading.value = true
		resetActionMessages()

		const quotas = {
			maxObjects: parseOptionalNumber(quotaMaxObjects.value, "Quota maxObjects"),
			maxSize: parseOptionalNumber(quotaMaxSize.value, "Quota maxSize"),
		}

		let websiteAccess: UpdateBucketRequestBody["websiteAccess"] | undefined
		if (websiteEnabled.value) {
			const indexDocument = websiteIndexDocument.value.trim()
			if (!indexDocument) {
				throw new Error("Index document is required when website access is enabled")
			}
			websiteAccess = {
				enabled: true,
				indexDocument,
				errorDocument: websiteErrorDocument.value.trim() || undefined,
				routingRules: parseOptionalJsonArray(
					websiteRoutingRulesJson.value,
					"Website routingRules",
				) as UpdateBucketWebsiteAccess["routingRules"],
			} satisfies UpdateBucketWebsiteAccess
		} else {
			websiteAccess = {
				enabled: false,
			} satisfies UpdateBucketWebsiteAccess
		}

		const body: UpdateBucketRequestBody = {
			quotas,
			websiteAccess,
			corsRules: parseOptionalJsonArray(corsRulesJson.value, "CORS rules") as UpdateBucketRequestBody["corsRules"],
			lifecycleRules: parseOptionalJsonArray(lifecycleRulesJson.value, "Lifecycle rules") as UpdateBucketRequestBody["lifecycleRules"],
		}

		bucket.value = successOrThrow(
			await client.POST("/v2/UpdateBucket", {
				params: {
					query: {
						id: bucket.value.id,
					},
				},
				body,
			}),
		)
		fillFormFromBucket(bucket.value)
		actionInfo.value = `Bucket "${bucketName.value}" updated`
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoading.value = false
	}
}

async function addAlias(payload: BucketAliasEnum, infoLabel: string) {
	if (!bucket.value) return

	try {
		actionLoading.value = true
		resetActionMessages()
		bucket.value = successOrThrow(
			await client.POST("/v2/AddBucketAlias", {
				body: payload,
			}),
		)
		actionInfo.value = infoLabel
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoading.value = false
	}
}

async function removeAlias(payload: BucketAliasEnum, infoLabel: string) {
	if (!bucket.value) return

	try {
		actionLoading.value = true
		resetActionMessages()
		bucket.value = successOrThrow(
			await client.POST("/v2/RemoveBucketAlias", {
				body: payload,
			}),
		)
		actionInfo.value = infoLabel
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoading.value = false
	}
}

async function submitGlobalAlias(event: SubmitEvent) {
	event.preventDefault()
	if (!bucket.value) return

	const alias = newGlobalAlias.value.trim()
	if (!alias) return

	await addAlias(
		{
			bucketId: bucket.value.id,
			globalAlias: alias,
		},
		`Global alias "${alias}" added`,
	)
	newGlobalAlias.value = ""
}

async function submitLocalAlias(event: SubmitEvent) {
	event.preventDefault()
	if (!bucket.value) return

	const alias = newLocalAlias.value.trim()
	const accessKeyId = newLocalAliasAccessKeyId.value.trim()
	if (!alias || !accessKeyId) {
		actionError.value = new Error("Both local alias and access key ID are required")
		return
	}

	await addAlias(
		{
			bucketId: bucket.value.id,
			accessKeyId,
			localAlias: alias,
		},
		`Local alias "${alias}" added for key "${accessKeyId}"`,
	)
	newLocalAlias.value = ""
	newLocalAliasAccessKeyId.value = ""
}

function selectedPermissions(): ApiBucketKeyPerm {
	return {
		read: keyPermissionRead.value ? true : undefined,
		write: keyPermissionWrite.value ? true : undefined,
		owner: keyPermissionOwner.value ? true : undefined,
	}
}

async function setBucketKeyPermissions(endpoint: "/v2/AllowBucketKey" | "/v2/DenyBucketKey", successMessage: string) {
	if (!bucket.value) return

	const accessKeyId = keyPermissionAccessKeyId.value.trim()
	const permissions = selectedPermissions()
	if (!accessKeyId) {
		actionError.value = new Error("Access key ID is required")
		return
	}
	if (!(permissions.read || permissions.write || permissions.owner)) {
		actionError.value = new Error("Select at least one permission flag")
		return
	}

	try {
		actionLoading.value = true
		resetActionMessages()
		bucket.value = successOrThrow(
			await client.POST(endpoint, {
				body: {
					bucketId: bucket.value.id,
					accessKeyId,
					permissions,
				},
			}),
		)
		actionInfo.value = successMessage
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoading.value = false
	}
}

async function cleanupUploads(event: SubmitEvent) {
	event.preventDefault()
	if (!bucket.value) return

	try {
		actionLoading.value = true
		resetActionMessages()
		const response = successOrThrow(
			await client.POST("/v2/CleanupIncompleteUploads", {
				body: {
					bucketId: bucket.value.id,
					olderThanSecs: Math.max(0, Math.floor(cleanupOlderThanSecs.value || 0)),
				},
			}),
		)
		actionInfo.value = `Removed ${response.uploadsDeleted} incomplete uploads`
		await loadBucket()
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoading.value = false
	}
}

async function deleteBucket() {
	if (!bucket.value) return
	if (deleteConfirm.value.trim() !== bucket.value.id) {
		actionError.value = new Error("Type exact bucket ID to confirm deletion")
		return
	}

	try {
		actionLoading.value = true
		resetActionMessages()
		const result = await client.POST("/v2/DeleteBucket", {
			params: {
				query: {
					id: bucket.value.id,
				},
			},
		})
		if (!result.response.ok) {
			throw new Error(`Delete bucket failed (${result.response.status})`)
		}
		await router.push({ path: "/buckets" })
	} catch (newError) {
		actionError.value = newError
	} finally {
		actionLoading.value = false
	}
}

watch(bucketId, loadBucket, { immediate: true })
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Bucket</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': loading }" @click="loadBucket">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="bucket_detail_error" />
		<BannerError v-if="actionError" :error="actionError" id="bucket_detail_action_error" />
		<Banner v-if="actionInfo">{{ actionInfo }}</Banner>

		<div class="flex flex-column gap gap--12" v-if="bucket">
			<div class="card flex flex-column gap gap--10">
				<div class="flex flex-wrap gap gap--10 items-center justify-between">
					<div class="flex flex-wrap gap gap--10 items-center">
						<div class="text-semibold">{{ bucketName }}</div>
						<div class="tag tag--small color-gray text-uppercase text-monospace">{{ bucket.id }}</div>
					</div>
					<div class="flex flex-wrap gap gap--8">
						<RouterLink :to="{ path: `/buckets/${bucket.id}/objects` }" class="btn btn--primary">
							Objects <PhArrowRight :size="20" weight="bold" />
						</RouterLink>
					</div>
				</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>Created: {{ formatDate(bucket.created) }}</div>
					<div>Website access: {{ bucket.websiteAccess ? "Enabled" : "Disabled" }}</div>
				</div>
			</div>

			<dl class="summary">
				<div class="summary-cell">
					<dt class="summary-label">Objects</dt>
					<dd class="summary-detail tabular-nums">{{ bucket.objects }}</dd>
				</div>
				<div class="summary-cell">
					<dt class="summary-label">Size</dt>
					<dd class="summary-detail tabular-nums">{{ formatBytes(bucket.bytes).value }} {{ formatBytes(bucket.bytes).unit }}</dd>
				</div>
				<div class="summary-cell">
					<dt class="summary-label">Unfinished uploads</dt>
					<dd class="summary-detail tabular-nums">{{ bucket.unfinishedUploads }}</dd>
				</div>
				<div class="summary-cell">
					<dt class="summary-label">Multipart uploads</dt>
					<dd class="summary-detail tabular-nums">{{ bucket.unfinishedMultipartUploads }}</dd>
				</div>
			</dl>

			<div class="card flex flex-column gap gap--10">
				<div class="text-semibold">Bucket settings</div>
				<form action="" method="post" @submit.prevent="updateBucket">
					<div class="grid grid-2 lg:grid-1 gap--12">
						<div class="f-group m0">
							<label class="inline-flex items-center gap gap--6">
								<input type="checkbox" v-model="websiteEnabled" />
								Website access enabled
							</label>
						</div>
						<div class="f-group m0">
							<label for="quota_max_objects">Quota max objects</label>
							<input id="quota_max_objects" type="number" min="0" step="1" v-model="quotaMaxObjects" placeholder="Unlimited" />
						</div>
						<div class="f-group m0">
							<label for="website_index">Website index document</label>
							<input id="website_index" type="text" v-model="websiteIndexDocument" :disabled="!websiteEnabled" placeholder="index.html" />
						</div>
						<div class="f-group m0">
							<label for="quota_max_size">Quota max size (bytes)</label>
							<input id="quota_max_size" type="number" min="0" step="1" v-model="quotaMaxSize" placeholder="Unlimited" />
						</div>
						<div class="f-group m0">
							<label for="website_error">Website error document</label>
							<input id="website_error" type="text" v-model="websiteErrorDocument" :disabled="!websiteEnabled" placeholder="error.html" />
						</div>
						<div class="f-group m0">
							<label for="website_routing_rules">Website routingRules JSON (optional)</label>
							<textarea
								id="website_routing_rules"
								rows="3"
								v-model="websiteRoutingRulesJson"
								:disabled="!websiteEnabled"
								placeholder='[{"Condition":{"KeyPrefixEquals":"old/"},"Redirect":{"ReplaceKeyPrefixWith":"new/"}}]'
							/>
						</div>
						<div class="f-group m0">
							<label for="cors_rules">CORS rules JSON array (optional)</label>
							<textarea id="cors_rules" rows="4" v-model="corsRulesJson" placeholder='[{"AllowedMethod":["GET"],"AllowedOrigin":["*"]}]' />
						</div>
						<div class="f-group m0">
							<label for="lifecycle_rules">Lifecycle rules JSON array (optional)</label>
							<textarea id="lifecycle_rules" rows="4" v-model="lifecycleRulesJson" placeholder='[{"ID":"clean-old","Status":"Enabled"}]' />
						</div>
					</div>
					<div class="f-group">
						<button class="btn btn--primary" :class="{ 'btn--loading': actionLoading }">
							<PhFloppyDisk :size="20" weight="bold" />Update bucket
						</button>
					</div>
				</form>
			</div>

			<div class="card flex flex-column gap gap--10">
				<div class="text-semibold">Aliases</div>
				<div class="flex flex-column gap gap--8">
					<div class="card" v-for="alias in bucket.globalAliases" :key="alias">
						<div class="flex flex-wrap gap gap--8 items-center justify-between">
							<div class="text-monospace">{{ alias }}</div>
							<button
								class="btn btn--small"
								:class="{ 'btn--loading': actionLoading }"
								@click="removeAlias({ bucketId: bucket.id, globalAlias: alias }, `Global alias '${alias}' removed`)"
							>
								<PhTrash :size="16" weight="bold" />Remove
							</button>
						</div>
					</div>
				</div>
				<form class="grid grid-2 lg:grid-1 gap--10" @submit="submitGlobalAlias">
					<div class="f-group m0">
						<label for="new_global_alias">Add global alias</label>
						<input id="new_global_alias" type="text" v-model="newGlobalAlias" placeholder="new-alias" required />
					</div>
					<div class="f-group m0 flex items-end">
						<button class="btn w100" :class="{ 'btn--loading': actionLoading }"><PhPlus :size="20" weight="bold" />Add</button>
					</div>
				</form>

				<div class="text-semibold">Local aliases</div>
				<div class="flex flex-column gap gap--8" v-if="localAliases.length > 0">
					<div class="card" v-for="entry in localAliases" :key="`${entry.accessKeyId}:${entry.alias}`">
						<div class="flex flex-wrap gap gap--8 items-center justify-between">
							<div>
								<span class="text-monospace">{{ entry.alias }}</span>
								<span class="color-gray text-small">&ThinSpace;({{ entry.name || entry.accessKeyId }})</span>
							</div>
							<button
								class="btn btn--small"
								:class="{ 'btn--loading': actionLoading }"
								@click="
									removeAlias(
										{
											bucketId: bucket.id,
											accessKeyId: entry.accessKeyId,
											localAlias: entry.alias,
										},
										`Local alias '${entry.alias}' removed`,
									)
								"
							>
								<PhTrash :size="16" weight="bold" />Remove
							</button>
						</div>
					</div>
				</div>
				<div class="color-gray text-small" v-else>No local aliases</div>

				<form class="grid grid-3 lg:grid-1 gap--10" @submit="submitLocalAlias">
					<div class="f-group m0">
						<label for="new_local_alias">Local alias</label>
						<input id="new_local_alias" type="text" v-model="newLocalAlias" placeholder="reports" required />
					</div>
					<div class="f-group m0">
						<label for="new_local_alias_key">Access key ID</label>
						<input id="new_local_alias_key" type="text" v-model="newLocalAliasAccessKeyId" list="known_keys" placeholder="GK..." required />
					</div>
					<div class="f-group m0 flex items-end">
						<button class="btn w100" :class="{ 'btn--loading': actionLoading }"><PhPlus :size="20" weight="bold" />Add local alias</button>
					</div>
				</form>
			</div>

			<div class="card flex flex-column gap gap--10">
				<div class="text-semibold">Access keys permissions</div>
				<div class="flex flex-column gap gap--8" v-if="bucket.keys.length > 0">
					<div class="card" v-for="key in bucket.keys" :key="key.accessKeyId">
						<div class="flex flex-wrap gap gap--10 items-center">
							<div class="text-semibold">{{ key.name || key.accessKeyId }}</div>
							<div class="tag tag--small color-gray text-uppercase text-monospace">{{ key.accessKeyId }}</div>
						</div>
						<div class="grid grid-3 md:grid-1 gap--10 color-gray text-small mt8">
							<div>Read: {{ formatPermission(key.permissions.read) }}</div>
							<div>Write: {{ formatPermission(key.permissions.write) }}</div>
							<div>Owner: {{ formatPermission(key.permissions.owner) }}</div>
						</div>
					</div>
				</div>
				<div class="color-gray text-small" v-else>No keys assigned to bucket</div>

				<datalist id="known_keys">
					<option v-for="key in knownKeys" :key="key.id" :value="key.id">{{ key.name }}</option>
				</datalist>

				<div class="grid grid-2 lg:grid-1 gap--10">
					<div class="f-group m0">
						<label for="permissions_key_id">Access key ID</label>
						<input id="permissions_key_id" type="text" v-model="keyPermissionAccessKeyId" list="known_keys" placeholder="GK..." />
					</div>
					<div class="f-group m0">
						<div class="label">Permissions flags</div>
						<div class="flex flex-wrap gap gap--10">
							<label class="inline-flex gap gap--6 items-center"><input type="checkbox" v-model="keyPermissionRead" />Read</label>
							<label class="inline-flex gap gap--6 items-center"><input type="checkbox" v-model="keyPermissionWrite" />Write</label>
							<label class="inline-flex gap gap--6 items-center"><input type="checkbox" v-model="keyPermissionOwner" />Owner</label>
						</div>
					</div>
				</div>
				<div class="flex flex-wrap gap gap--8">
					<button
						class="btn"
						:class="{ 'btn--loading': actionLoading }"
						@click="setBucketKeyPermissions('/v2/AllowBucketKey', `Permissions allowed for key '${keyPermissionAccessKeyId.trim()}'`)"
					>
						Allow selected permissions
					</button>
					<button
						class="btn"
						:class="{ 'btn--loading': actionLoading }"
						@click="setBucketKeyPermissions('/v2/DenyBucketKey', `Permissions denied for key '${keyPermissionAccessKeyId.trim()}'`)"
					>
						Deny selected permissions
					</button>
					<div class="text-small color-gray" v-if="keysLoading">Loading keys...</div>
				</div>
			</div>

			<div class="card flex flex-column gap gap--10">
				<div class="text-semibold">Maintenance</div>
				<form class="grid grid-2 lg:grid-1 gap--10" @submit="cleanupUploads">
					<div class="f-group m0">
						<label for="cleanup_older_than">Cleanup incomplete uploads older than (seconds)</label>
						<input id="cleanup_older_than" type="number" min="0" step="1" v-model="cleanupOlderThanSecs" />
					</div>
					<div class="f-group m0 flex items-end">
						<button class="btn w100" :class="{ 'btn--loading': actionLoading }"><PhBroom :size="20" weight="bold" />Cleanup</button>
					</div>
				</form>
			</div>

			<div class="card flex flex-column gap gap--10">
				<div class="text-semibold color-warning">Danger zone</div>
				<div class="color-gray text-small">Delete works only for empty buckets. Type bucket ID to confirm.</div>
				<div class="grid grid-2 lg:grid-1 gap--10">
					<div class="f-group m0">
						<label for="delete_confirm">Confirm bucket ID</label>
						<input id="delete_confirm" type="text" v-model="deleteConfirm" :placeholder="bucket.id" />
					</div>
					<div class="f-group m0 flex items-end">
						<button class="btn w100" :class="{ 'btn--loading': actionLoading }" @click="deleteBucket">
							<PhTrash :size="20" weight="bold" />Delete bucket
						</button>
					</div>
				</div>
			</div>

			<RouterLink :to="{ path: '/buckets' }" class="btn btn--text">Back to Buckets <PhArrowRight :size="20" weight="bold" /></RouterLink>
		</div>
	</LayoutDefault>
</template>