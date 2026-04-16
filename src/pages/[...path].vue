<script lang="ts" setup>
import LayoutDefault from "../components/layouts/Default.vue"
import EmptyState from "../components/EmptyState.vue"
import { PhArrowRight } from "@phosphor-icons/vue"
import { RouterLink } from "vue-router"
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">404</h1>
			</div>
		</div>
		<div class="flex flex-column items-center justify-center min-h66vh">
			<EmptyState
				title="Page Not Found"
				subtitle="Well, stuff can go wrong sometimes and maybe you mistyped a URL, tapped/clicked on a broken link"
			>
				<template #actions>
					<router-link to="/" class="btn btn--primary">Go To Overview<PhArrowRight :size="20" weight="bold" /></router-link>
				</template>
			</EmptyState>
		</div>
	</LayoutDefault>
</template>