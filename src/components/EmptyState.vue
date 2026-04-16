<script setup lang="ts">
const props = defineProps<{
	title: string
	subtitle?: string
}>()
import { PhEmpty } from "@phosphor-icons/vue"
</script>

<template>
	<div class="emptyState">
		<div class="emptyState-ico"><PhEmpty weight="duotone" :size="36" /></div>
		<div class="emptyState-content">
			<div class="text-large text-bold">{{ title }}</div>
			<div class="color-gray" v-if="subtitle">{{ subtitle }}</div>
			<slot v-if="$slots.default"></slot>
		</div>
		<div class="emptyState-actions" v-if="$slots.actions">
			<slot name="actions"></slot>
		</div>
	</div>
</template>