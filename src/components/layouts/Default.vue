<script setup lang="ts">
import Sidebar from "../Sidebar.vue"
import Dropdown from "../Dropdown.vue"
import Modal from "../Modal.vue"
import { PhLifebuoy, PhCaretDown, PhSignOut, PhArrowRight, PhMapPin, PhTag } from "@phosphor-icons/vue"
import { authenticated } from "../../store.ts"
import router, { LOGIN_PATH } from "../../router/index.ts"
import { shortId } from "../../utils/labels.ts"
import metadata from "../../metadata.json" with { type: "json" }

function logout() {
	authenticated.value = null
	router.push({ path: LOGIN_PATH })
}
</script>

<template>
	<div class="layout">
		<header class="layout-header">
			<Sidebar />
			<Dropdown id="navigation_mobile" size="small" class="">
				<Sidebar />
			</Dropdown>
		</header>
		<div class="layout-top">
			<button class="btn hidden md:block" popovertarget="navigation_mobile" id="navigation_mobile_btn">Menu</button>
			<div class="layout-topBreadcrumb md:hidden">{{ "" /* TODO: breadcrumb */ }}</div>
			<div class="layout-topActions">
				<button class="btn btn--small btn--square gap" popovertarget="connexion_infos" id="connexion_infos_btn">
					<div class="tag tag--tiny tag--green">Connected</div>
					<span class="color-gray text-normal">node</span>
					{{ authenticated?.nodeInfo?.hostname ?? "" }}<PhCaretDown :size="14" weight="bold" class="mr2" />
				</button>

				<Dropdown id="connexion_infos" size="small" v-if="authenticated">
					<div class="dropdown-title">Node connected</div>
					<router-link :to="{ path: `/nodes/${authenticated?.nodeInfo.id}` }" class="dropdown-item">
						<div class="dropdown-itemContent gap flex flex-column">
							<div>
								<span class="tag tag--small color-gray text-uppercase tabular-nums">{{
									shortId(authenticated?.nodeInfo.id || "", "tiny")
								}}</span>
								{{ " " }}
								<span class="text-semibold text-underline">{{ authenticated?.nodeInfo?.hostname || "" }}</span>
							</div>
							<div class="inline-flex flex-wrap gap gap--8">
								<div class="inline-flex items-center gap color-gray text-small">
									<PhMapPin :size="16" weight="duotone" class="vertical-align-middle" />
									{{ authenticated?.nodeInfo.role?.zone }}
								</div>
								<div class="inline-flex items-center gap color-gray text-small">
									<PhTag :size="16" weight="duotone" class="vertical-align-middle" />
									{{ authenticated?.nodeInfo.role?.tags.join(", ") }}
								</div>
							</div>
						</div>
						<PhArrowRight :size="20" weight="bold" />
					</router-link>
					<hr class="dropdown-separator" />
					<div class="dropdown-title">Admin token used</div>
					<router-link :to="{ path: `/admin-tokens/${authenticated?.tokenInfo?.id}` }" class="dropdown-item">
						<div class="dropdown-itemContent flex flex-column gap gap--4">
							<div>
								<span class="text-semibold text-underline">{{ authenticated?.tokenInfo.name || authenticated?.tokenInfo.id }}</span>
							</div>
							<div class="color-gray text-small text-monospace">{{ authenticated?.tokenInfo.id }}</div>
						</div>
						<PhArrowRight :size="20" weight="bold" />
					</router-link>
					<hr class="dropdown-separator" />
					<button class="dropdown-item dropdown-item--destructive" @click="logout">
						<PhSignOut :size="20" weight="duotone" />&nbsp;Sign Out
					</button>
				</Dropdown>

				<button class="btn btn--small" command="show-modal" commandfor="help_infos_modal">
					<PhLifebuoy :size="14" weight="bold" />&nbsp;Help
				</button>

				<Modal id="help_infos_modal" title="Need help?" closedby="any">
					<div class="flex flex-column gap items-start">
						<div class="text-semibold text-large">Read the documentation</div>
						<p class="color-gray">It includes plenty of ressources like cookbooks, operations guides and reference manual</p>
						<a :href="metadata.documentation" class="btn btn--small" target="_blank"
							>Go to documentation <PhArrowRight :size="14" weight="bold"
						/></a>
					</div>
					<div class="flex flex-column gap items-start">
						<div class="text-semibold text-large">Join our support channel</div>
						<p class="color-gray">Reach out to the Garage’s team and community Matrix channel</p>
						<a :href="metadata.matrix" class="btn btn--small" target="_blank"
							>#garage:deuxfleurs.fr <PhArrowRight :size="14" weight="bold"
						/></a>
					</div>
					<button class="btn btn--primary btn--big w100" command="close" commandfor="help_infos_modal" autofocus>Close</button>
				</Modal>
			</div>
		</div>
		<main class="layout-main">
			<div class="container">
				<slot>No content loaded! ⚠️</slot>
			</div>
		</main>
	</div>
</template>