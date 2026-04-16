<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterLink, useRoute } from "vue-router"
import { PhArrowsCounterClockwise, PhArrowRight } from "@phosphor-icons/vue"
import type { components } from "../../api-schema.d.ts"
import BannerError from "../../components/BannerError.vue"
import LayoutDefault from "../../components/layouts/Default.vue"
import { client } from "../../store.ts"
import { successOrThrow } from "../../utils/api.ts"

type KeyInfo = components["schemas"]["GetKeyInfoResponse"]

const route = useRoute()

const accessKey = ref<KeyInfo | null>(null)
const loading = ref<boolean>(false)
const error = ref<unknown | null>(null)

const accessKeyId = computed(() => {
	const raw = route.params.id
	return Array.isArray(raw) ? raw[0] : raw
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

async function loadAccessKey() {
	if (!accessKeyId.value) return

	try {
		loading.value = true
		error.value = null
		accessKey.value = successOrThrow(
			await client.GET("/v2/GetKeyInfo", {
				params: {
					query: {
						id: accessKeyId.value,
					},
				},
			}),
		)
	} catch (newError) {
		accessKey.value = null
		error.value = newError
	} finally {
		loading.value = false
	}
}

watch(accessKeyId, loadAccessKey, { immediate: true })
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Access Key</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': loading }" @click="loadAccessKey">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="access_key_detail_error" />

		<div class="flex flex-column gap gap--12" v-if="accessKey">
			<div class="card flex flex-column gap gap--10">
				<div class="flex flex-wrap gap gap--10 items-center">
					<div class="text-semibold">{{ accessKey.name || accessKey.accessKeyId }}</div>
					<div class="tag tag--small color-gray text-uppercase text-monospace">{{ accessKey.accessKeyId }}</div>
					<div class="tag tag--small" :class="{ 'tag--green': !accessKey.expired, 'tag--red': accessKey.expired }">
						{{ accessKey.expired ? "Expired" : "Active" }}
					</div>
				</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>Created: {{ formatDate(accessKey.created) }}</div>
					<div>Expiration: {{ formatDate(accessKey.expiration) }}</div>
				</div>
			</div>

			<div class="card flex flex-column gap gap--8">
				<div class="text-semibold">Global permissions</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>Create bucket: {{ formatPermission(accessKey.permissions.createBucket) }}</div>
				</div>
			</div>

			<div class="card flex flex-column gap gap--8">
				<div class="text-semibold">Bucket permissions</div>
				<div class="flex flex-column gap gap--8" v-if="accessKey.buckets.length > 0">
					<div class="card" v-for="bucket in accessKey.buckets" :key="bucket.id">
						<div class="flex flex-wrap gap gap--10 items-center">
							<div class="text-semibold">{{ bucket.globalAliases[0] || bucket.id }}</div>
							<div class="tag tag--small color-gray text-uppercase text-monospace">{{ bucket.id }}</div>
						</div>
						<div class="grid grid-3 md:grid-1 gap--10 color-gray text-small mt8">
							<div>Read: {{ formatPermission(bucket.permissions.read) }}</div>
							<div>Write: {{ formatPermission(bucket.permissions.write) }}</div>
							<div>Owner: {{ formatPermission(bucket.permissions.owner) }}</div>
						</div>
						<div class="flex flex-wrap gap gap--8 mt8" v-if="bucket.localAliases.length > 0">
							<span class="tag tag--small" v-for="alias in bucket.localAliases" :key="alias">{{ alias }}</span>
						</div>
					</div>
				</div>
				<div class="color-gray text-small" v-else>No bucket permissions configured</div>
			</div>

			<RouterLink :to="{ path: '/access-keys' }" class="btn btn--text"
				>Back to Access Keys <PhArrowRight :size="20" weight="bold"
			/></RouterLink>
		</div>
	</LayoutDefault>
</template>