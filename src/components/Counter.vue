<script setup>
import { ref } from "vue"

const count = ref(0)
function increment() {
	count.value++
}
</script>

<template>
	<span>Count: {{ count }}</span
	>&nbsp;-
	<button class="btn btn--small" @click="increment">make the number go up!</button>
</template>