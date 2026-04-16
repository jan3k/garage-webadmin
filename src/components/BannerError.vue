<script lang="ts">
import { HttpError } from "../utils/api"

export function formatErrorContent(error: unknown) {
	// Considering the Garage errors structured here https://git.deuxfleurs.fr/Deuxfleurs/garage/src/tag/v2.2.0/src/api/admin/error.rs#L98-L103 because errors from API aren't typed for now
	if (error instanceof HttpError) {
		return {
			title: error.body?.message?.toString() ?? error.response.statusText,
			code: error.response.status,
			more: JSON.stringify(
				{
					status: error.response.status,
					headers: Object.fromEntries(error.response.headers.entries()),
					body: error.body,
				},
				null,
				"\t",
			),
		}
	} else if (error instanceof Error) {
		return {
			title: `${error.name}: ${error.message}`,
			code: undefined,
			more: error.stack ?? "",
		}
	} else {
		return {
			title: `Unknown error: ${error?.toString() ?? error}`,
			code: undefined,
			more: JSON.stringify(error),
		}
	}
}
</script>

<script lang="ts" setup>
import { ref, computed } from "vue"
import Banner from "./Banner.vue"

import { PhCaretDown, PhCaretUp } from "@phosphor-icons/vue"

const props = defineProps<{
	error: unknown
	id?: string
	logs?: boolean
}>()

const content = computed(() => {
	return formatErrorContent(props.error)
})

const errorCodesToLog = [500, 503]

const isLogs = computed(() => {
	return (content.value?.code ? errorCodesToLog.includes(content.value?.code) : false) || props.logs
})

const logsExpanded = ref<boolean>(false)
</script>

<template>
	<Banner type="error" icon iconTop :id="props.id">
		<div>{{ content.title }}</div>
		<pre class="banner-logs" v-if="logsExpanded && isLogs">{{ content.more }}</pre>
		<template #actions v-if="isLogs">
			<button class="btn btn--small" type="button" :aria-expanded="logsExpanded" @click="logsExpanded = !logsExpanded">
				Logs
				<PhCaretDown v-if="!logsExpanded" :size="14" weight="bold" />
				<PhCaretUp v-if="logsExpanded" :size="14" weight="bold" />
			</button>
		</template>
	</Banner>
</template>