<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterLink, useRoute } from "vue-router"
import { PhArrowsCounterClockwise, PhArrowRight } from "@phosphor-icons/vue"
import type { components } from "../../api-schema.d.ts"
import BannerError from "../../components/BannerError.vue"
import LayoutDefault from "../../components/layouts/Default.vue"
import { client } from "../../store.ts"
import { successOrThrow } from "../../utils/api.ts"
import { formatBytes } from "../../utils/labels.ts"

type BucketInfo = components["schemas"]["GetBucketInfoResponse"]

const route = useRoute()

const bucket = ref<BucketInfo | null>(null)
const loading = ref<boolean>(false)
const error = ref<unknown | null>(null)

const bucketId = computed(() => {
	const raw = route.params.id
	return Array.isArray(raw) ? raw[0] : raw
})

const bucketName = computed(() => {
	if (!bucket.value) return bucketId.value || "Bucket"
	return bucket.value.globalAliases[0] || bucket.value.id
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

async function loadBucket() {
	if (!bucketId.value) return

	try {
		loading.value = true
		error.value = null
		bucket.value = successOrThrow(
			await client.GET("/v2/GetBucketInfo", {
				params: {
					query: {
						id: bucketId.value,
					},
				},
			}),
		)
	} catch (newError) {
		bucket.value = null
		error.value = newError
	} finally {
		loading.value = false
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

		<div class="flex flex-column gap gap--12" v-if="bucket">
			<div class="card flex flex-column gap gap--10">
				<div class="flex flex-wrap gap gap--10 items-center">
					<div class="text-semibold">{{ bucketName }}</div>
					<div class="tag tag--small color-gray text-uppercase text-monospace">{{ bucket.id }}</div>
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

			<div class="card flex flex-column gap gap--8">
				<div class="text-semibold">Aliases</div>
				<div class="flex flex-wrap gap gap--8" v-if="bucket.globalAliases.length > 0">
					<span class="tag tag--small" v-for="alias in bucket.globalAliases" :key="alias">{{ alias }}</span>
				</div>
				<div class="color-gray text-small" v-else>No global aliases</div>
			</div>

			<div class="card flex flex-column gap gap--8">
				<div class="text-semibold">Quotas</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>Max objects: {{ bucket.quotas.maxObjects ?? "Unlimited" }}</div>
					<div>
						Max size:
						{{
							bucket.quotas.maxSize != null
								? `${formatBytes(bucket.quotas.maxSize).value} ${formatBytes(bucket.quotas.maxSize).unit}`
								: "Unlimited"
						}}
					</div>
				</div>
			</div>

			<div class="card flex flex-column gap gap--8">
				<div class="text-semibold">Access keys</div>
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
						<div class="flex flex-wrap gap gap--8 mt8" v-if="key.bucketLocalAliases.length > 0">
							<span class="tag tag--small" v-for="alias in key.bucketLocalAliases" :key="alias">{{ alias }}</span>
						</div>
					</div>
				</div>
				<div class="color-gray text-small" v-else>No access keys with bucket permissions</div>
			</div>

			<RouterLink :to="{ path: '/buckets' }" class="btn btn--text">Back to Buckets <PhArrowRight :size="20" weight="bold" /></RouterLink>
		</div>
	</LayoutDefault>
</template>