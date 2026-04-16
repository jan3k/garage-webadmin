<script setup lang="ts">
import { RouterLink } from "vue-router"
import { formatBytes, shortId, shortNumber, formatSeconds } from "../utils/labels.ts"
import {
	PhArrowsCounterClockwise,
	PhArrowRight,
	PhSealCheck,
	PhWarning,
	PhWarningOctagon,
	PhWarningDiamond,
	PhMapPin,
	PhTag,
	PhPlus,
} from "@phosphor-icons/vue"
import IcoIsUp from "./IsUp.vue"
import SpaceLineChart from "./SpaceLineChart.vue"

import type { NodeResp } from "../utils/create-api-client.ts"

const props = defineProps<{
	node: NodeResp
}>()
</script>

<template>
	<router-link :to="{ path: `/nodes/${node.id}` }" class="cardLink gap--8">
		<div class="flex md:flex-column items-center md:items-strech flex-grow gap gap--12">
			<div class="flex items-center flex-grow gap gap--8">
				<div class="align-self-center">
					<IcoIsUp :up="node.isUp" />
				</div>
				<div class="flex-grow">
					<div class="flex-grow min-w0">
						<span class="tag tag--small color-gray text-uppercase tabular-nums" :title="node.id">{{ shortId(node.id, "tiny") }}</span
						>&nbsp;<span class="cardLink-title" :class="{ 'text-monospace text-small': !node.hostname || node.hostname === '' }">{{
							!node.hostname || node.hostname === "" ? shortId(node.id, "small") : node.hostname
						}}</span>
					</div>
					<div>
						<div class="inline-flex flex-wrap gap gap--8 mt4">
							<div class="inline-flex items-center gap color-gray text-small">
								<PhMapPin :size="16" weight="duotone" class="vertical-align-middle" />
								{{ node.role?.zone }}
							</div>
							<div v-if="node.role?.tags.length" class="inline-flex items-center gap color-gray text-small">
								<PhTag :size="16" weight="duotone" class="vertical-align-middle" />
								{{ node.role?.tags.join(", ") }}
							</div>
						</div>
						<div class="text-small text-semibold color-warning" v-if="!node.isUp && node.lastSeenSecsAgo != null">
							last seen {{ formatSeconds(node.lastSeenSecsAgo) }} ago
						</div>
					</div>
				</div>
			</div>
			<div class="min-w15 flex-no-shrink text-small color-gray flex flex-column gap">
				<slot></slot>
				<template v-if="$slots.stat">
					<div>label: <slot name="stat"></slot></div>
				</template>
			</div>
			<div class="flex-no-shrink min-w50 lg:min-w33 text-small">
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
					class="mt12"
				/>
			</div>
		</div>
		<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
	</router-link>
</template>