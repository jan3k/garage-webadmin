<script setup lang="ts">
const props = defineProps<{
	id: string
	size?: "default" | "small"
}>()
</script>

<template>
	<div
		class="dropdown"
		:class="{
			'dropdown--small': size === 'small',
		}"
		:id="props.id"
		popover
	>
		<slot></slot>
	</div>
</template>