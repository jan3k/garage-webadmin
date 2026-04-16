<script setup lang="ts">
import { ref } from "vue"
import { PhInfo, PhHash, PhGitFork, PhSpinnerGap } from "@phosphor-icons/vue"
import LayoutAuth from "../components/layouts/Auth.vue"
import { fetchAuthenticated } from "../utils/create-api-client.ts"
import { authenticated } from "../store.ts"
import BannerError from "../components/BannerError.vue"
import router, { LOGIN_PATH } from "../router/index.ts"
import metadata from "../metadata.json" with { type: "json" }

function goRedirect() {
	const redirect = router.currentRoute.value.query.redirect
	if (typeof redirect === "string" && redirect !== LOGIN_PATH && redirect !== LOGIN_PATH.toLowerCase()) {
		router.push(redirect)
	} else {
		router.push({ path: "/" })
	}
}

const tokenField = ref<string | null>("")

const apiError = ref<null | unknown>(null)
const apiLoading = ref<boolean>(false)

async function submit(event: SubmitEvent) {
	event.preventDefault()
	const token = tokenField.value

	if (token === null) return

	try {
		apiLoading.value = true
		apiError.value = null
		authenticated.value = await fetchAuthenticated(token)
		goRedirect()
	} catch (error) {
		apiError.value = error
	} finally {
		apiLoading.value = false
	}
}
</script>

<template>
	<LayoutAuth title="Login">
		<form action="" method="post" @submit="submit">
			<div class="f-group">
				<label class="w100" for="token_admin">Admin Token</label>
				<input
					class="w100"
					type="password"
					autocomplete="off"
					id="token_admin"
					:aria-describedby="apiError ? 'token_admin_error' : undefined"
					v-model="tokenField"
					required
				/>
			</div>
			<div class="f-group" v-if="apiError">
				<BannerError :error="apiError" id="token_admin_error" />
			</div>
			<div class="f-group">
				<button class="btn btn--primary btn--big w100" :class="{ 'btn--loading': apiLoading }">
					Log In
					<PhSpinnerGap :size="20" weight="bold" v-show="apiLoading" />
				</button>
			</div>
		</form>
		<template #footer>
			<a :href="metadata.documentation" class="btn btn--small"> <PhInfo :size="14" weight="bold" />&nbsp;Documentation </a>
			<a :href="metadata.matrix" class="btn btn--small"> <PhHash :size="14" weight="bold" />&nbsp;Support channel (Matrix) </a>
			<a :href="metadata.sources" class="btn btn--small"> <PhGitFork :size="14" weight="bold" />&nbsp;Source code </a>
		</template>
	</LayoutAuth>
</template>