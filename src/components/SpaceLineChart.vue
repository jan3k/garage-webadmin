<script setup lang="ts">
import { computed } from "vue"
import { formatBytes } from "../utils/labels.ts"

const props = defineProps<{
	available: number
	total: number
	label?: string
	prefixLabel?: string
}>()

const usedPercent = computed(() => {
	if (props.total <= 0) return 0
	const used = ((props.total - props.available) / props.total) * 100
	return Math.max(0, Math.min(100, Math.floor(used)))
})

const availableLabel = computed(() => {
	return formatBytes(Math.max(0, props.available))
})
</script>

<template>
	<div>
		<div class="flex justify-between flex-wrap gap mb4">
			<div class="flex items-center flex-wrap gap">
				<span class="tag tag--small" v-if="prefixLabel">{{ prefixLabel }}</span>
				<span class="color-gray"
					><span class="lg:sr-only">{{ label }}:</span> <span class="text-semibold color-text tabular-nums">{{ usedPercent }}</span
					>%</span
				>
			</div>
			<div class="color-gray">
				<span class="text-semibold color-text tabular-nums">{{ availableLabel.value }}</span
				>&ThinSpace;{{ availableLabel.unit }} free
			</div>
		</div>
		<div class="progressbar" :style="{ '--progressbar-value': usedPercent }">
			<div class="progressbar-progress"></div>
		</div>
	</div>
</template>