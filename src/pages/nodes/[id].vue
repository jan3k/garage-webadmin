<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterLink, useRoute } from "vue-router"
import { PhArrowsCounterClockwise, PhArrowRight } from "@phosphor-icons/vue"
import type { components } from "../../api-schema.d.ts"
import Banner from "../../components/Banner.vue"
import BannerError from "../../components/BannerError.vue"
import LayoutDefault from "../../components/layouts/Default.vue"
import SpaceLineChart from "../../components/SpaceLineChart.vue"
import { client } from "../../store.ts"
import { successOrThrow } from "../../utils/api.ts"
import { formatSeconds, shortId } from "../../utils/labels.ts"

type NodeResp = components["schemas"]["NodeResp"]
type NodeInfo = components["schemas"]["LocalGetNodeInfoResponse"]
type NodeStats = components["schemas"]["LocalGetNodeStatisticsResponse"]

const route = useRoute()

const node = ref<NodeResp | null>(null)
const nodeInfo = ref<NodeInfo | null>(null)
const nodeStats = ref<NodeStats | null>(null)
const nodeInfoError = ref<string | null>(null)
const nodeStatsError = ref<string | null>(null)
const error = ref<unknown | null>(null)
const loading = ref<boolean>(false)

const nodeId = computed(() => {
	const raw = route.params.id
	return Array.isArray(raw) ? raw[0] : raw
})

const nodeLabel = computed(() => {
	if (!nodeId.value) return "Unknown"
	return node.value?.hostname || nodeInfo.value?.hostname || shortId(nodeId.value, "small")
})

async function loadNodeData() {
	if (!nodeId.value) return

	try {
		loading.value = true
		error.value = null
		nodeInfoError.value = null
		nodeStatsError.value = null

		const [clusterStatus, nodeInfoResp, nodeStatsResp] = await Promise.all([
			successOrThrow(await client.GET("/v2/GetClusterStatus")),
			successOrThrow(
				await client.GET("/v2/GetNodeInfo", {
					params: {
						query: {
							node: nodeId.value,
						},
					},
				}),
			),
			successOrThrow(
				await client.GET("/v2/GetNodeStatistics", {
					params: {
						query: {
							node: nodeId.value,
						},
					},
				}),
			),
		])

		node.value = clusterStatus.nodes.find((statusNode) => statusNode.id === nodeId.value) || null

		nodeInfo.value = Object.values(nodeInfoResp.success)[0] || null
		nodeStats.value = Object.values(nodeStatsResp.success)[0] || null

		nodeInfoError.value = nodeInfoResp.error[nodeId.value] || Object.values(nodeInfoResp.error)[0] || null
		nodeStatsError.value = nodeStatsResp.error[nodeId.value] || Object.values(nodeStatsResp.error)[0] || null
	} catch (newError) {
		error.value = newError
		node.value = null
		nodeInfo.value = null
		nodeStats.value = null
	} finally {
		loading.value = false
	}
}

watch(nodeId, loadNodeData, { immediate: true })
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Node details</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': loading }" @click="loadNodeData">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="node_detail_error" />
		<Banner type="warn" v-if="nodeInfoError">Node info: {{ nodeInfoError }}</Banner>
		<Banner type="warn" v-if="nodeStatsError">Node stats: {{ nodeStatsError }}</Banner>

		<div class="flex flex-column gap gap--12" v-if="nodeId">
			<div class="card flex flex-column gap gap--10">
				<div class="flex flex-wrap gap gap--10 items-center">
					<div class="text-semibold">{{ nodeLabel }}</div>
					<div class="tag tag--small color-gray text-uppercase text-monospace">{{ shortId(nodeId, "tiny") }}</div>
					<div class="tag tag--small" :class="{ 'tag--green': node?.isUp, 'tag--red': !node?.isUp }">
						{{ node?.isUp ? "Connected" : "Disconnected" }}
					</div>
				</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>
						Node ID: <span class="text-monospace">{{ nodeId }}</span>
					</div>
					<div>Address: {{ node?.addr || "-" }}</div>
					<div>Role zone: {{ node?.role?.zone || "Unassigned" }}</div>
					<div v-if="node?.lastSeenSecsAgo != null">Last seen: {{ formatSeconds(node.lastSeenSecsAgo) }} ago</div>
				</div>
			</div>

			<div class="card flex flex-column gap gap--10" v-if="nodeInfo">
				<div class="text-semibold">Runtime information</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>Hostname: {{ nodeInfo.hostname || "-" }}</div>
					<div>Garage: {{ nodeInfo.garageVersion }}</div>
					<div>Rust: {{ nodeInfo.rustVersion }}</div>
					<div>DB engine: {{ nodeInfo.dbEngine }}</div>
				</div>
				<div class="flex flex-wrap gap gap--8" v-if="nodeInfo.garageFeatures && nodeInfo.garageFeatures.length > 0">
					<span class="tag tag--small" v-for="feature in nodeInfo.garageFeatures" :key="feature">{{ feature }}</span>
				</div>
			</div>

			<div class="card flex flex-column gap gap--12" v-if="node">
				<div class="text-semibold">Storage partitions</div>
				<SpaceLineChart
					v-if="node.dataPartition"
					:available="node.dataPartition.available"
					:total="node.dataPartition.total"
					label="Disk usage"
					prefix-label="Data"
				/>
				<SpaceLineChart
					v-if="node.metadataPartition"
					:available="node.metadataPartition.available"
					:total="node.metadataPartition.total"
					label="Disk usage"
					prefix-label="Metadata"
				/>
			</div>

			<div class="card flex flex-column gap gap--10" v-if="nodeStats && nodeStats.blockManagerStats">
				<div class="text-semibold">Block manager</div>
				<div class="grid grid-2 lg:grid-1 gap--10 color-gray text-small">
					<div>Reference entries: {{ nodeStats.blockManagerStats.rcEntries }}</div>
					<div>Resync queue: {{ nodeStats.blockManagerStats.resyncQueueLen }}</div>
					<div>Resync errors: {{ nodeStats.blockManagerStats.resyncErrors }}</div>
				</div>
			</div>

			<RouterLink :to="{ path: '/nodes' }" class="btn btn--text">Back to Nodes <PhArrowRight :size="20" weight="bold" /></RouterLink>
		</div>
	</LayoutDefault>
</template>