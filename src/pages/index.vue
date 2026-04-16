<script lang="ts">
import BannerError from "../components/BannerError.vue"

import {
	useClusterHealth,
	useClusterStatus,
	useClusterStatistics,
	useNodesStatistics,
	useListKeys,
	useListAdminTokens,
	useListWorkerVariables,
} from "../loaders/dashboard.ts"
export {
	useClusterHealth,
	useClusterStatus,
	useClusterStatistics,
	useNodesStatistics,
	useListKeys,
	useListAdminTokens,
	useListWorkerVariables,
}
</script>

<script lang="ts" setup>
import { computed } from "vue"
import { RouterLink } from "vue-router"
import LayoutDefault from "../components/layouts/Default.vue"
import CardNode from "../components/CardNode.vue"
import { formatBytes, shortNumber } from "../utils/labels.ts"
import { PhArrowsCounterClockwise, PhArrowRight, PhSealCheck, PhWarning, PhWarningOctagon, PhWarningDiamond } from "@phosphor-icons/vue"
import EmptyState from "../components/EmptyState.vue"

const { data: clusterHealth, isLoading: clusterHealthLoading, error: clusterHealthError, reload: clusterHealthReload } = useClusterHealth()
const { data: clusterStatus, isLoading: clusterStatusLoading, error: clusterStatusError, reload: clusterStatusReload } = useClusterStatus()
const { data: clusterStats, isLoading: clusterStatsLoading, error: clusterStatsError, reload: clusterStatsReload } = useClusterStatistics()
const { data: nodesStats, isLoading: nodesStatsLoading, error: nodesStatsError, reload: nodesStatsReload } = useNodesStatistics()
const { data: keys, isLoading: keysLoading, error: keysError, reload: keysReload } = useListKeys()
const { data: tokens, isLoading: tokensLoading, error: tokensError, reload: tokensReload } = useListAdminTokens()
const { data: workersVar, isLoading: workersVarLoading, error: workersVarError, reload: workersVarReload } = useListWorkerVariables()

function reloadAll() {
	clusterHealthReload()
	clusterStatusReload()
	clusterStatsReload()
	nodesStatsReload()
	keysReload()
	tokensReload()
	workersVarReload()
}

const isSomethingLoading = computed(() => {
	return (
		clusterHealthLoading.value ||
		clusterStatusLoading.value ||
		clusterStatsLoading.value ||
		nodesStatsLoading.value ||
		keysLoading.value ||
		tokensLoading.value ||
		workersVarLoading.value
	)
})

const isStorageError = computed(() => {
	return !!(clusterStatusError.value || nodesStatsError.value || workersVarError.value)
})

const ApiErrorList = computed(() => {
	return [
		{ id: "api_error_cluster_health", error: clusterHealthError.value },
		{ id: "api_error_cluster_status", error: clusterStatusError.value },
		{ id: "api_error_cluster_stats", error: clusterStatsError.value },
		{ id: "api_error_nodes_stats", error: nodesStatsError.value },
		{ id: "api_error_keys_list", error: keysError.value },
		{ id: "api_error_tokens_list", error: tokensError.value },
		{ id: "api_error_workers_list", error: workersVarError.value },
	].filter((e) => e.error != null)
})

const stats = computed(() => {
	if (!(clusterHealth.value && keys.value && tokens.value)) return null
	const storageNodes = clusterHealth.value.storageNodes
	const storageNodesUp = clusterHealth.value.storageNodesUp
	return {
		nodes: {
			connected: clusterHealth.value.connectedNodes,
			known: clusterHealth.value.knownNodes,
			storage: storageNodes,
			storageUp: storageNodesUp,
			storageUpPercent: storageNodes > 0 ? Math.floor((storageNodesUp / storageNodes) * 100) : 0,
		},
		status: clusterHealth.value.status,
		space: {
			data: clusterStats.value?.dataAvail != null ? formatBytes(clusterStats.value.dataAvail) : null,
			meta: clusterStats.value?.metadataAvail != null ? formatBytes(clusterStats.value.metadataAvail) : null,
			incomplete: clusterStats?.value?.incompleteAvailInfo || false,
		},
		buckets: {
			total: clusterStats.value?.totalObjectBytes != null ? formatBytes(clusterStats.value.totalObjectBytes) : null,
			objects: clusterStats.value?.totalObjectCount != null ? shortNumber(clusterStats.value.totalObjectCount) : null,
			count: clusterStats.value?.bucketCount,
		},
		keys: {
			total: keys.value.length,
			active: keys.value.reduce((acc, { expired }) => acc + (expired ? 0 : 1), 0),
		},
		tokens: {
			total: tokens.value.length,
			active: tokens.value.reduce((acc, { expired }) => acc + (expired ? 0 : 1), 0),
		},
	}
})

let nodes = computed(() => {
	if (!(clusterStatus.value && nodesStats.value && workersVar.value)) return null

	const nStats = nodesStats.value.success
	const wVariables = workersVar.value.success

	return clusterStatus.value.nodes
		.filter((n) => n.role?.capacity != null)
		.map((n) => {
			const scrubCorruptions = wVariables[n.id]?.["scrub-corruptions_detected"]
			return {
				...n,
				statistics: {
					...nStats[n.id]?.blockManagerStats,
					scrubCorruptionsDetected: scrubCorruptions ? parseInt(scrubCorruptions) : null,
				},
			}
		})
})
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Overview</h1>
			</div>
			<div class="sectionHeader-side">
				<!-- <div class="text-small color-gray">Last updated [[todo]] ago</div> -->
				<button class="btn" :class="{ 'btn--loading': isSomethingLoading }" @click="reloadAll">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>
		<BannerError v-for="ApiErrorItem in ApiErrorList" :error="ApiErrorItem.error" :id="ApiErrorItem.id" />
		<dl class="summary" v-if="stats">
			<div class="summary-cell">
				<dt class="summary-label">Connected nodes</dt>
				<dd class="summary-detail">
					{{ stats.nodes.connected }}&ThinSpace;
					<div class="summary-secondary">of {{ stats.nodes.known }} known</div>
				</dd>
			</div>
			<div class="summary-cell">
				<dt class="summary-label">Storage nodes</dt>
				<dd class="summary-detail">
					<div class="flex flex-wrap items-center gap">
						<span>
							{{ stats.nodes.storageUp }}<span class="color-gray text-normal">&ThinSpace;/&ThinSpace;{{ stats.nodes.storage }}</span>
						</span>
						<span
							class="tag tag--small text-bold text-capitalize"
							:class="{
								'tag--green': stats.status === 'healthy',
								'tag--orange': stats.status === 'degraded',
								'tag--red': stats.status === 'unavailable',
							}"
						>
							<PhSealCheck :size="14" weight="fill" v-if="stats.status === 'healthy'" />
							<PhWarningOctagon :size="14" weight="fill" v-if="stats.status === 'degraded'" />
							<PhWarningDiamond :size="14" weight="fill" v-if="stats.status === 'unavailable'" />
							{{ `Cluster ${stats.status}` }}
						</span>
					</div>
					<div class="summary-secondary">{{ stats.nodes.storageUpPercent }}% connected</div>
				</dd>
			</div>
			<div class="summary-cell" v-if="stats.buckets.total?.value && stats.buckets.objects">
				<dt class="summary-label">Buckets content</dt>
				<dd class="summary-detail">
					{{ stats.buckets.total?.value ?? "-" }}&ThinSpace;<span class="color-gray text-normal">{{ stats.buckets.total?.unit }}</span>
					<div class="summary-secondary">{{ stats.buckets.objects ?? "-" }} objects</div>
				</dd>
			</div>
			<div class="summary-cell">
				<dt class="summary-label">Data space available</dt>
				<dd class="summary-detail">
					<span v-if="stats.space.incomplete" class="color-gray" aria-label="More or less ">~</span>
					{{ stats.space.data?.value ?? "-" }}&ThinSpace;<span class="color-gray text-normal">{{ stats.space.data?.unit }}</span>
					<div class="summary-secondary">estimated</div>
				</dd>
			</div>
			<div class="summary-cell">
				<dt class="summary-label">Metadata space available</dt>
				<dd class="summary-detail">
					<span v-if="stats.space.incomplete" class="color-gray" aria-label="More or less ">~</span>
					{{ stats.space.meta?.value ?? "-" }}&ThinSpace;<span class="color-gray text-normal">{{ stats.space.meta?.unit }}</span>
					<div class="summary-secondary">estimated</div>
				</dd>
			</div>
		</dl>

		<div class="grid grid-3 md:grid-1 gap--12" v-if="stats">
			<router-link :to="{ path: '/buckets' }" class="cardLink">
				<div class="flex-grow min-w0">
					<div class="cardLink-title mb8">Buckets</div>
					<div>
						<span class="text-semibold">{{ stats.buckets.count ?? "-" }}</span> <span class="color-gray">active</span>
					</div>
				</div>
				<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
			</router-link>
			<router-link :to="{ path: '/access-keys' }" class="cardLink">
				<div class="flex-grow min-w0">
					<div class="cardLink-title mb8">Access Keys</div>
					<div>
						<span class="text-semibold">{{ stats.keys.active ?? "-" }}</span
						>&ThinSpace;<span class="color-gray">/&ThinSpace;{{ stats.keys.total ?? "-" }} active</span>
					</div>
				</div>
				<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
			</router-link>
			<router-link :to="{ path: '/admin-tokens' }" class="cardLink">
				<div class="flex-grow min-w0">
					<div class="cardLink-title mb8">Admin Tokens</div>
					<div>
						<span class="text-semibold">{{ stats.tokens.active ?? "-" }}</span
						>&ThinSpace;<span class="color-gray">/&ThinSpace;{{ stats.tokens.total ?? "-" }} active</span>
					</div>
				</div>
				<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
			</router-link>
		</div>

		<div class="flex flex-column gap gap--12" v-if="!isStorageError">
			<div class="flex flex-wrap justify-between items-center gap">
				<h2 class="title title-2">Storage health</h2>
				<div>
					<router-link :to="{ path: '/nodes' }" class="btn btn--text mr16">All nodes <PhArrowRight :size="20" weight="bold" /></router-link>
				</div>
			</div>
			<template v-for="node in nodes">
				<CardNode :node="node">
					<div>
						Resync queue:
						<span
							class="tabular-nums"
							:class="[node.statistics?.resyncQueueLen !== undefined ? 'text-semibold color-text' : 'color-gray']"
							>{{ node.statistics?.resyncQueueLen ?? "-" }}</span
						>
					</div>
					<div>
						Resync error:
						<span
							class="tabular-nums"
							:class="[
								node.statistics?.resyncErrors === undefined ? 'color-gray' : 'text-semibold',
								node.statistics?.resyncErrors === 0 && 'color-text',
								node.statistics?.resyncErrors && 'color-warning',
							]"
							>{{ node.statistics?.resyncErrors ?? "-" }}
							<PhWarning v-if="node.statistics?.resyncErrors" weight="fill" :size="18" class="color-warning vertical-align-bottom"
						/></span>
					</div>
					<div>
						Scrub corruption:
						<span
							class="tabular-nums"
							:class="[
								node.statistics?.scrubCorruptionsDetected === undefined ? 'color-gray' : 'text-semibold',
								node.statistics?.scrubCorruptionsDetected === 0 && 'color-text',
								node.statistics?.scrubCorruptionsDetected && 'color-warning',
							]"
							>{{ node.statistics?.scrubCorruptionsDetected ?? "-" }}
							<PhWarning
								v-if="node.statistics?.scrubCorruptionsDetected"
								weight="fill"
								:size="18"
								class="color-warning vertical-align-bottom"
						/></span>
					</div>
				</CardNode>
			</template>

			<div v-if="nodes?.length == 0" class="cardLink cardLink--disabled flex justify-center">
				<div class="flex flex-column items-center justify-center mt12 mb12">
					<EmptyState title="No Storage Node" subtitle="Assign storage nodes in the cluster layout section">
						<template #actions>
							<router-link to="/" class="btn btn--primary">Configure Layout<PhArrowRight :size="20" weight="bold" /></router-link>
						</template>
					</EmptyState>
				</div>
			</div>
		</div>
	</LayoutDefault>
</template>