<script setup lang="ts">
import { PhCircle, PhWarning } from "@phosphor-icons/vue"

const props = defineProps<{
	up: boolean
	ago?: number
}>()
</script>
<template>
	<PhCircle v-if="props.up" weight="fill" :size="14" class="isUp" />
	<PhWarning v-if="!props.up" weight="fill" :size="14" class="isUp isUp--down" />
</template>