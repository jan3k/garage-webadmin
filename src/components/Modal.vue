<script setup lang="ts">
import { PhX } from "@phosphor-icons/vue"

const props = defineProps<{
	id: string
	closedby?: "any" | "closerequest" | "none"
	title: string
	subtitle?: string
	size?: "default" | "medium" | "large"
}>()
</script>

<template>
	<dialog
		class="modal"
		:class="{
			'modal--medium': props.size === 'medium',
			'modal--large': props.size === 'large',
		}"
		:id="props.id"
		:closedby="props.closedby || 'none'"
	>
		<div class="modal-head">
			<h1 class="modal-title">{{ props.title }}</h1>
			<div class="modal-subtitle" v-if="props.subtitle">{{ props.subtitle }}</div>
			<slot name="head" v-if="$slots.head"></slot>
		</div>
		<div class="modal-content">
			<slot>No content ⚠️</slot>
		</div>
		<button class="modal-close" command="close" :commandfor="props.id" aria-label="Close modal">
			<PhX :size="30" />
		</button>
	</dialog>
</template>