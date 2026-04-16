<script lang="ts">
import { useListKeys } from "../../loaders/dashboard.ts"
export { useListKeys }
</script>

<script lang="ts" setup>
import { computed } from "vue"
import { RouterLink } from "vue-router"
import { PhArrowsCounterClockwise, PhArrowRight } from "@phosphor-icons/vue"
import BannerError from "../../components/BannerError.vue"
import EmptyState from "../../components/EmptyState.vue"
import LayoutDefault from "../../components/layouts/Default.vue"

const { data: keys, isLoading, error, reload } = useListKeys()

const sortedKeys = computed(() => {
	if (!keys.value) return []
	return [...keys.value].sort((a, b) => a.name.localeCompare(b.name))
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
				<h1 class="title title-1">Access Keys</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': isLoading }" @click="reload">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="access_keys_error" />

		<div class="flex flex-column gap gap--12" v-if="sortedKeys.length > 0">
			<RouterLink v-for="key in sortedKeys" :key="key.id" :to="{ path: `/access-keys/${key.id}` }" class="cardLink">
				<div class="flex-grow min-w0 flex flex-column gap gap--8">
					<div class="flex flex-wrap gap gap--10 items-center">
						<div class="text-semibold">{{ key.name || "Unnamed Key" }}</div>
						<div class="tag tag--small color-gray text-uppercase text-monospace">{{ key.id }}</div>
						<div class="tag tag--small" :class="{ 'tag--green': !key.expired, 'tag--red': key.expired }">
							{{ key.expired ? "Expired" : "Active" }}
						</div>
					</div>
					<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
						<div>Created: {{ formatDate(key.created) }}</div>
						<div>Expiration: {{ formatDate(key.expiration) }}</div>
					</div>
				</div>
				<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
			</RouterLink>
		</div>

		<div class="cardLink cardLink--disabled flex justify-center" v-else-if="!isLoading && !error">
			<div class="flex flex-column items-center justify-center mt12 mb12">
				<EmptyState title="No Access Keys" subtitle="No access keys are currently visible for this admin token" />
			</div>
		</div>
	</LayoutDefault>
</template>