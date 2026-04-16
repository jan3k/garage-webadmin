<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterLink, useRoute } from "vue-router"
import { PhArrowsCounterClockwise, PhArrowRight } from "@phosphor-icons/vue"
import type { components } from "../../api-schema.d.ts"
import BannerError from "../../components/BannerError.vue"
import LayoutDefault from "../../components/layouts/Default.vue"
import { client } from "../../store.ts"
import { successOrThrow } from "../../utils/api.ts"

type AdminToken = components["schemas"]["GetAdminTokenInfoResponse"]

const route = useRoute()

const token = ref<AdminToken | null>(null)
const loading = ref<boolean>(false)
const error = ref<unknown | null>(null)

const tokenId = computed(() => {
	const raw = route.params.id
	return Array.isArray(raw) ? raw[0] : raw
})

function formatDate(date?: string | null) {
	if (!date) return "-"
	return new Date(date).toLocaleString()
}

async function loadToken() {
	if (!tokenId.value) return

	try {
		loading.value = true
		error.value = null
		token.value = successOrThrow(
			await client.GET("/v2/GetAdminTokenInfo", {
				params: {
					query: {
						id: tokenId.value,
					},
				},
			}),
		)
	} catch (newError) {
		token.value = null
		error.value = newError
	} finally {
		loading.value = false
	}
}

watch(tokenId, loadToken, { immediate: true })
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Admin Token</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': loading }" @click="loadToken">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="admin_token_detail_error" />

		<div class="flex flex-column gap gap--12" v-if="token">
			<div class="card flex flex-column gap gap--10">
				<div class="flex flex-wrap gap gap--10 items-center">
					<div class="text-semibold">{{ token.name || token.id }}</div>
					<div class="tag tag--small color-gray text-uppercase text-monospace" v-if="token.id">{{ token.id }}</div>
					<div class="tag tag--small" :class="{ 'tag--green': !token.expired, 'tag--red': token.expired }">
						{{ token.expired ? "Expired" : "Active" }}
					</div>
				</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>Created: {{ formatDate(token.created) }}</div>
					<div>Expiration: {{ formatDate(token.expiration) }}</div>
				</div>
			</div>

			<div class="card flex flex-column gap gap--8">
				<div class="text-semibold">Scope</div>
				<div class="flex flex-wrap gap gap--8" v-if="token.scope.length > 0">
					<span class="tag tag--small" v-for="scope in token.scope" :key="scope">{{ scope }}</span>
				</div>
				<div class="color-gray text-small" v-else>No scope entries</div>
			</div>

			<RouterLink :to="{ path: '/admin-tokens' }" class="btn btn--text">
				Back to Admin Tokens <PhArrowRight :size="20" weight="bold" />
			</RouterLink>
		</div>
	</LayoutDefault>
</template>