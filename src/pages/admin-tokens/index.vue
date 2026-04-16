<script lang="ts">
import { useListAdminTokens } from "../../loaders/dashboard.ts"
export { useListAdminTokens }
</script>

<script lang="ts" setup>
import { computed } from "vue"
import { RouterLink } from "vue-router"
import { PhArrowsCounterClockwise, PhArrowRight } from "@phosphor-icons/vue"
import BannerError from "../../components/BannerError.vue"
import EmptyState from "../../components/EmptyState.vue"
import LayoutDefault from "../../components/layouts/Default.vue"

const { data: tokens, isLoading, error, reload } = useListAdminTokens()

const sortedTokens = computed(() => {
	if (!tokens.value) return []
	return [...tokens.value].sort((a, b) => a.name.localeCompare(b.name))
})

function formatDate(date?: string | null) {
	if (!date) return "-"
	return new Date(date).toLocaleString()
}
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Admin Tokens</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': isLoading }" @click="reload">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="admin_tokens_error" />

		<div class="flex flex-column gap gap--12" v-if="sortedTokens.length > 0">
			<template v-for="token in sortedTokens" :key="token.id || token.name">
				<RouterLink v-if="token.id" :to="{ path: `/admin-tokens/${token.id}` }" class="cardLink">
					<div class="flex-grow min-w0 flex flex-column gap gap--8">
						<div class="flex flex-wrap gap gap--10 items-center">
							<div class="text-semibold">{{ token.name || token.id }}</div>
							<div class="tag tag--small color-gray text-uppercase text-monospace">{{ token.id }}</div>
							<div class="tag tag--small" :class="{ 'tag--green': !token.expired, 'tag--red': token.expired }">
								{{ token.expired ? "Expired" : "Active" }}
							</div>
						</div>
						<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
							<div>Created: {{ formatDate(token.created) }}</div>
							<div>Expiration: {{ formatDate(token.expiration) }}</div>
						</div>
						<div class="flex flex-wrap gap gap--8" v-if="token.scope.length > 0">
							<span class="tag tag--small" v-for="scope in token.scope" :key="scope">{{ scope }}</span>
						</div>
					</div>
					<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
				</RouterLink>
				<div v-else class="card flex flex-column gap gap--8">
					<div class="text-semibold">{{ token.name }}</div>
					<div class="color-gray text-small">Token ID unavailable</div>
				</div>
			</template>
		</div>

		<div class="cardLink cardLink--disabled flex justify-center" v-else-if="!isLoading && !error">
			<div class="flex flex-column items-center justify-center mt12 mb12">
				<EmptyState title="No Admin Tokens" subtitle="No admin tokens are currently visible for this admin token" />
			</div>
		</div>
	</LayoutDefault>
</template>