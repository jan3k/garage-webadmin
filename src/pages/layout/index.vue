<script lang="ts">
import { defineBasicLoader } from "vue-router/experimental"
import { client } from "../../store.ts"
import { HttpError, successOrThrow } from "../../utils/api.ts"

const expectedErrors = [HttpError, Error]

export const useClusterLayout = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/GetClusterLayout")), {
	errors: expectedErrors,
})

export const useClusterStatus = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/GetClusterStatus")), {
	errors: expectedErrors,
})
</script>

<script setup lang="ts">
import { computed } from "vue"
import { PhArrowsCounterClockwise } from "@phosphor-icons/vue"
import BannerError from "../../components/BannerError.vue"
import EmptyState from "../../components/EmptyState.vue"
import LayoutDefault from "../../components/layouts/Default.vue"
import { formatBytes, shortId } from "../../utils/labels.ts"

const { data: layout, isLoading: layoutLoading, error: layoutError, reload: layoutReload } = useClusterLayout()
const { data: status, isLoading: statusLoading, error: statusError, reload: statusReload } = useClusterStatus()

function reloadAll() {
	layoutReload()
	statusReload()
}

const isLoading = computed(() => layoutLoading.value || statusLoading.value)

const nodeNameById = computed(() => {
	if (!status.value) return {}
	return Object.fromEntries(status.value.nodes.map((node) => [node.id, node.hostname || shortId(node.id, "small")]))
})

const zoneRedundancyLabel = computed(() => {
	const zoneRedundancy = layout.value?.parameters.zoneRedundancy
	if (!zoneRedundancy) return "-"
	if (typeof zoneRedundancy === "string") return zoneRedundancy
	return `at least ${zoneRedundancy.atLeast}`
})

const roles = computed(() => {
	if (!layout.value) return []
	return [...layout.value.roles].sort((a, b) => a.zone.localeCompare(b.zone) || a.id.localeCompare(b.id))
})

const stagedChanges = computed(() => {
	if (!layout.value) return []
	return layout.value.stagedRoleChanges.map((change) => {
		const normalized = change as {
			id: string
			remove?: boolean
			zone?: string
			tags?: string[]
			capacity?: number | null
		}

		return {
			id: normalized.id,
			remove: normalized.remove === true,
			zone: normalized.zone,
			tags: normalized.tags ?? [],
			capacity: normalized.capacity,
		}
	})
})
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Layout</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': isLoading }" @click="reloadAll">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="layoutError" :error="layoutError" id="layout_error" />
		<BannerError v-if="statusError" :error="statusError" id="layout_status_error" />

		<div class="flex flex-column gap gap--12" v-if="layout">
			<dl class="summary">
				<div class="summary-cell">
					<dt class="summary-label">Layout version</dt>
					<dd class="summary-detail">{{ layout.version }}</dd>
				</div>
				<div class="summary-cell">
					<dt class="summary-label">Partition size</dt>
					<dd class="summary-detail">{{ formatBytes(layout.partitionSize).value }} {{ formatBytes(layout.partitionSize).unit }}</dd>
				</div>
				<div class="summary-cell">
					<dt class="summary-label">Zone redundancy</dt>
					<dd class="summary-detail text-capitalize">{{ zoneRedundancyLabel }}</dd>
				</div>
				<div class="summary-cell">
					<dt class="summary-label">Configured roles</dt>
					<dd class="summary-detail">{{ roles.length }}</dd>
				</div>
			</dl>

			<div class="card flex flex-column gap gap--10">
				<div class="text-semibold">Current roles</div>
				<div class="flex flex-column gap gap--8" v-if="roles.length > 0">
					<div class="card" v-for="role in roles" :key="role.id">
						<div class="flex flex-wrap gap gap--8 items-center">
							<div class="text-semibold">{{ nodeNameById[role.id] || shortId(role.id, "small") }}</div>
							<div class="tag tag--small color-gray text-uppercase text-monospace">{{ shortId(role.id, "tiny") }}</div>
							<div class="tag tag--small">{{ role.zone }}</div>
						</div>
						<div class="color-gray text-small mt8">
							{{ role.capacity != null ? `${formatBytes(role.capacity).value} ${formatBytes(role.capacity).unit}` : "Gateway" }}
						</div>
						<div class="flex flex-wrap gap gap--8 mt8" v-if="role.tags.length > 0">
							<span class="tag tag--small" v-for="tag in role.tags" :key="tag">{{ tag }}</span>
						</div>
					</div>
				</div>
				<div class="color-gray text-small" v-else>No nodes in current layout</div>
			</div>

			<div class="card flex flex-column gap gap--10">
				<div class="text-semibold">Staged role changes</div>
				<div class="flex flex-column gap gap--8" v-if="stagedChanges.length > 0">
					<div class="card" v-for="change in stagedChanges" :key="change.id">
						<div class="flex flex-wrap gap gap--8 items-center">
							<div class="text-semibold">{{ nodeNameById[change.id] || shortId(change.id, "small") }}</div>
							<div class="tag tag--small color-gray text-uppercase text-monospace">{{ shortId(change.id, "tiny") }}</div>
							<div class="tag tag--small" :class="{ 'tag--red': change.remove, 'tag--green': !change.remove }">
								{{ change.remove ? "Remove" : "Update" }}
							</div>
						</div>
						<div class="color-gray text-small mt8" v-if="!change.remove">
							{{ change.zone || "Unassigned" }}
							{{ change.capacity != null ? `, ${formatBytes(change.capacity).value} ${formatBytes(change.capacity).unit}` : ", Gateway" }}
						</div>
					</div>
				</div>
				<div class="color-gray text-small" v-else>No staged role changes</div>
			</div>
		</div>

		<div class="cardLink cardLink--disabled flex justify-center" v-else-if="!isLoading && !layoutError">
			<div class="flex flex-column items-center justify-center mt12 mb12">
				<EmptyState title="Layout unavailable" subtitle="Could not load cluster layout data" />
			</div>
		</div>
	</LayoutDefault>
</template>