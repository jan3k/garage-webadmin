<script lang="ts">
import { useListBuckets } from "../../loaders/dashboard.ts"
export { useListBuckets }
</script>

<script lang="ts" setup>
import { computed } from "vue"
import { RouterLink } from "vue-router"
import { PhArrowsCounterClockwise, PhArrowRight } from "@phosphor-icons/vue"
import BannerError from "../../components/BannerError.vue"
import EmptyState from "../../components/EmptyState.vue"
import LayoutDefault from "../../components/layouts/Default.vue"

const { data: buckets, isLoading, error, reload } = useListBuckets()

const sortedBuckets = computed(() => {
	if (!buckets.value) return []
	return [...buckets.value].sort((a, b) => b.created.localeCompare(a.created))
})

function formatDate(date: string) {
	return new Date(date).toLocaleString()
}
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Buckets</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': isLoading }" @click="reload">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="buckets_error" />

		<div class="flex flex-column gap gap--12" v-if="sortedBuckets.length > 0">
			<RouterLink v-for="bucket in sortedBuckets" :key="bucket.id" :to="{ path: `/buckets/${bucket.id}` }" class="cardLink">
				<div class="flex-grow min-w0 flex flex-column gap gap--8">
					<div class="flex flex-wrap gap gap--10 items-center">
						<div class="text-semibold">{{ bucket.globalAliases[0] || bucket.id }}</div>
						<div class="tag tag--small color-gray text-uppercase text-monospace">{{ bucket.id }}</div>
					</div>
					<div class="color-gray text-small">Created: {{ formatDate(bucket.created) }}</div>
					<div class="flex flex-wrap gap gap--8" v-if="bucket.globalAliases.length > 0">
						<span class="tag tag--small" v-for="alias in bucket.globalAliases" :key="alias">{{ alias }}</span>
					</div>
					<div class="flex flex-wrap gap gap--8" v-if="bucket.localAliases.length > 0">
						<span class="tag tag--small color-gray" v-for="alias in bucket.localAliases" :key="`${alias.accessKeyId}-${alias.alias}`">
							{{ alias.alias }}
						</span>
					</div>
				</div>
				<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
			</RouterLink>
		</div>

		<div class="cardLink cardLink--disabled flex justify-center" v-else-if="!isLoading && !error">
			<div class="flex flex-column items-center justify-center mt12 mb12">
				<EmptyState title="No Buckets" subtitle="No buckets are currently visible for this admin token" />
			</div>
		</div>
	</LayoutDefault>
</template>