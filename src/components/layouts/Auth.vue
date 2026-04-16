<script setup lang="ts">
import Logo from "../../assets/img/logo.svg?raw"

const version = import.meta.env.VITE_APP_VERSION + (import.meta.env.MODE === "development" ? "-dev" : "")

const props = defineProps({
	title: { type: String, required: true },
})
</script>

<template>
	<div class="auth">
		<div class="auth-logo"><Logo /></div>
		<main class="auth-main">
			<h1 class="auth-title">{{ $props.title }}</h1>
			<div class="auth-content">
				<slot>No content loaded! ⚠️</slot>
			</div>
			<div class="auth-footer" v-if="$slots.footer">
				<slot name="footer" />
			</div>
		</main>
		<div class="auth-version">Garage Web Admin v{{ version }}</div>
	</div>
</template>