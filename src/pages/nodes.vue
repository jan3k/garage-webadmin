<script lang="ts">
import { defineBasicLoader } from "vue-router/experimental"
import { client } from "../store.ts"
import { HttpError, successOrThrow } from "../utils/api.ts"

export const useClusterStatus = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/GetClusterStatus")), {
	errors: [HttpError, Error],
})
</script>

<script lang="ts" setup>
import { computed, ref, reactive, useTemplateRef } from "vue"
import { RouterLink } from "vue-router"
import LayoutDefault from "../components/layouts/Default.vue"
import { roleLabel } from "../utils/labels.ts"
import { ObjectGroupBy } from "../utils/polyfills.ts"
import { PhArrowsCounterClockwise, PhArrowRight, PhPlus, PhSpinnerGap } from "@phosphor-icons/vue"
import EmptyState from "../components/EmptyState.vue"
import CardNode from "../components/CardNode.vue"
import Modal from "../components/Modal.vue"
import Banner from "../components/Banner.vue"
import BannerError from "../components/BannerError.vue"

const { data: clusterStatus, isLoading: clusterStatusLoading, error: clusterStatusError, reload: clusterStatusReload } = useClusterStatus()

function reloadAll() {
	clusterStatusReload()
}

const isSomethingLoading = computed(() => {
	return !!clusterStatusLoading.value
})

const isStorageError = computed(() => {
	return !!clusterStatusError.value
})

const ApiErrorList = computed(() => {
	return [{ id: "api_error_cluster_status", error: clusterStatusError.value }].filter((e) => e.error != null)
})

const groupBy = ref("zone")

const groupByChoices = reactive([
	{ id: "zone", label: "Zone" },
	{ id: "connectivity", label: "Connectivity" },
	{ id: "role", label: "Role" },
])

const groupByKey = computed(() => {
	switch (groupBy.value) {
		case "zone":
			return "zoneLabel"
		case "role":
			return "roleLabel"
		default:
			return "connectivityLabel"
	}
})

let nodes = computed(() => {
	if (!clusterStatus.value) return null
	return clusterStatus.value.nodes.map((n) => {
		return {
			...n,
			roleLabel: roleLabel(n.role?.capacity),
			connectivityLabel: n.isUp ? "Connected" : "Disconnected",
			zoneLabel: n.role?.zone ?? "Unassigned",
		}
	})
})

let nodesGrouped = computed(() => {
	if (!nodes.value) return null
	const gNodes = ObjectGroupBy(nodes.value, (n) => n[groupByKey.value])
	const sKeys = Object.keys(gNodes).sort((a, b) => {
		if (a === "Unassigned") return -1
		if (b === "Unassigned") return 1
		return a.localeCompare(b)
	})
	return Object.fromEntries(sKeys.map((k) => [k, gNodes[k]]))
})

const connectForm = useTemplateRef("connect-node-form")
const connectFormLoading = ref<boolean>(false)
const connectFormField = ref<string | null>("")
const connectFormError = ref<string[] | null>(null)
const connectFormApiError = ref<unknown | null>(null)

function connectFormReset() {
	connectFormError.value = null
	connectFormApiError.value = null
	connectFormLoading.value = false
	connectFormField.value = ""
	connectForm.value?.reset()
}

async function connectFormSubmit(event: SubmitEvent) {
	event.preventDefault()
	if (connectFormField.value === null) return

	try {
		connectFormLoading.value = true
		connectFormError.value = null
		connectFormApiError.value = null
		const data = successOrThrow(
			await client.POST("/v2/ConnectClusterNodes", {
				body: [connectFormField.value ?? ""],
			}),
		)

		connectFormError.value = data
			.filter((el) => !el.success && el.error)
			.map((el) => el.error ?? null)
			.filter((el) => el != null)
		clusterStatusReload()
	} catch (error) {
		connectFormApiError.value = error
	} finally {
		connectFormLoading.value = false
	}
}
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Nodes</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': isSomethingLoading }" @click="reloadAll">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
				<button class="btn btn--primary" command="show-modal" commandfor="connect_node_modal">
					<PhPlus :size="20" weight="bold" />Connect a node
				</button>
				<Modal id="connect_node_modal" title="Connect a node" closedby="any" @close="connectFormReset()">
					<form action="" method="post" ref="connect-node-form" @submit="connectFormSubmit">
						<Banner type="info" icon>
							Run “<code class="text-small">garage node id</code>” on the node’s console to obtain the required information
						</Banner>
						<div class="f-group">
							<label for="connect_node_id">Node ID + Address</label>
							<input
								class="w100 text-monospace"
								type="text"
								name="connect_node_id"
								id="connect_node_id"
								placeholder="<id>@<address>"
								v-model="connectFormField"
								required
							/>
						</div>
						<div class="f-group" v-if="connectFormError || connectFormApiError">
							<Banner type="error" v-for="message in connectFormError" class="text-break">{{ message }}</Banner>
							<BannerError v-if="connectFormApiError" :error="connectFormApiError" id="connect_node_api_error" />
						</div>
						<div class="f-group">
							<button class="btn btn--primary btn--big w100" :class="{ 'btn--loading': connectFormLoading }">
								Connect node
								<PhSpinnerGap :size="20" weight="bold" v-show="connectFormLoading" />
							</button>
						</div>
					</form>
					<button class="btn w100 mt20" command="close" commandfor="connect_node_modal" autofocus>Cancel</button>
				</Modal>
			</div>
		</div>

		<BannerError v-for="ApiErrorItem in ApiErrorList" :error="ApiErrorItem.error" :id="ApiErrorItem.id" />

		<div class="flex flex-column gap gap--12" v-if="!isStorageError">
			<div class="card flex flex-wrap justify-between items-center gap">
				{{ nodes?.length ?? "-" }} {{ (nodes?.length ?? 0) > 0 ? "nodes" : "nodes" }}
				<fieldset class="flex flex-wrap justify-between items-center gap gap--12 m0 p0 border-none">
					<legend class="sr-only">Group by</legend>
					<span aria-hidden="true">Group by</span>
					<div class="segmented">
						<button
							v-for="opt in groupByChoices"
							:aria-pressed="opt.id === groupBy"
							class="btn"
							:class="{ 'btn--pressed': opt.id === groupBy }"
							@click="groupBy = opt.id"
						>
							{{ opt.label }}
						</button>
					</div>
				</fieldset>
			</div>

			<div v-for="(gNodes, gTitle) in nodesGrouped" class="flex flex-column gap gap--12">
				<template v-if="gNodes?.length">
					<div class="flex flex-wrap gap gap--10 items-baseline">
						<span class="tag tag--square inline-block text-bold tabular-nums">{{ gNodes?.length }}</span>
						<span class="text-big text-semibold letter-capitalize">{{ gTitle }} nodes</span>
					</div>
					<CardNode v-for="node in gNodes" :node="node">
						<div>
							Garage:
							<span class="color-text text-semibold">{{ node.garageVersion ?? "-" }}</span>
						</div>
						<div>
							Role:
							<span class="color-text text-semibold">{{ node.roleLabel }}</span>
						</div>
					</CardNode>
				</template>
			</div>

			<div v-if="nodes?.length == 0" class="cardLink cardLink--disabled flex justify-center">
				<div class="flex flex-column items-center justify-center mt12 mb12">
					<EmptyState title="No Storage Node" subtitle="Assign storage nodes in the cluster layout section">
						<template #actions>
							<router-link to="/layout" class="btn btn--primary">Configure Layout<PhArrowRight :size="20" weight="bold" /></router-link>
						</template>
					</EmptyState>
				</div>
			</div>
		</div>
	</LayoutDefault>
</template>