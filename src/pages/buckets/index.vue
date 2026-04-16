<script lang="ts">
import { useListBuckets } from "../../loaders/dashboard.ts"
export { useListBuckets }
</script>

<script lang="ts" setup>
import { computed, ref } from "vue"
import { RouterLink } from "vue-router"
import { PhArrowRight, PhArrowsCounterClockwise, PhPlus, PhSpinnerGap } from "@phosphor-icons/vue"
import type { components } from "../../api-schema.d.ts"
import Banner from "../../components/Banner.vue"
import BannerError from "../../components/BannerError.vue"
import EmptyState from "../../components/EmptyState.vue"
import Modal from "../../components/Modal.vue"
import LayoutDefault from "../../components/layouts/Default.vue"
import { client } from "../../store.ts"
import { successOrThrow } from "../../utils/api.ts"

type ListKeysResponseItem = components["schemas"]["ListKeysResponseItem"]
type CreateBucketLocalAlias = components["schemas"]["CreateBucketLocalAlias"]

const { data: buckets, isLoading, error, reload } = useListBuckets()

const sortedBuckets = computed(() => {
	if (!buckets.value) return []
	return [...buckets.value].sort((a, b) => b.created.localeCompare(a.created))
})

const knownKeys = ref<ListKeysResponseItem[]>([])
const knownKeysLoading = ref<boolean>(false)

const createLoading = ref<boolean>(false)
const createError = ref<unknown | null>(null)
const createInfo = ref<string | null>(null)
const createFormGlobalAlias = ref<string>("")
const createFormLocalAlias = ref<string>("")
const createFormAccessKeyId = ref<string>("")
const createAllowRead = ref<boolean>(false)
const createAllowWrite = ref<boolean>(false)
const createAllowOwner = ref<boolean>(false)

function formatDate(date: string) {
	return new Date(date).toLocaleString()
}

function resetCreateForm() {
	createFormGlobalAlias.value = ""
	createFormLocalAlias.value = ""
	createFormAccessKeyId.value = ""
	createAllowRead.value = false
	createAllowWrite.value = false
	createAllowOwner.value = false
	createError.value = null
}

function closeCreateModal() {
	const modal = document.getElementById("create_bucket_modal")
	if (modal instanceof HTMLDialogElement) {
		modal.close()
	}
}

async function loadKnownKeys() {
	if (knownKeys.value.length > 0 || knownKeysLoading.value) return

	try {
		knownKeysLoading.value = true
		knownKeys.value = successOrThrow(await client.GET("/v2/ListKeys"))
	} finally {
		knownKeysLoading.value = false
	}
}

function getCreateLocalAlias(): CreateBucketLocalAlias | null {
	const localAlias = createFormLocalAlias.value.trim()
	const accessKeyId = createFormAccessKeyId.value.trim()
	if (!localAlias && !accessKeyId) return null

	if (!localAlias || !accessKeyId) {
		throw new Error("For local alias creation both alias and access key ID are required")
	}

	const allow = {
		read: createAllowRead.value ? true : undefined,
		write: createAllowWrite.value ? true : undefined,
		owner: createAllowOwner.value ? true : undefined,
	}
	const hasPermissions = Boolean(allow.read || allow.write || allow.owner)

	return {
		alias: localAlias,
		accessKeyId,
		allow: hasPermissions ? allow : undefined,
	}
}

async function submitCreateBucket(event: SubmitEvent) {
	event.preventDefault()

	try {
		createLoading.value = true
		createError.value = null
		createInfo.value = null

		const globalAlias = createFormGlobalAlias.value.trim()
		if (!globalAlias) {
			throw new Error("Global alias is required")
		}

		const localAlias = getCreateLocalAlias()
		const createdBucket = successOrThrow(
			await client.POST("/v2/CreateBucket", {
				body: {
					globalAlias,
					localAlias,
				},
			}),
		)

		createInfo.value = `Bucket "${createdBucket.globalAliases[0] || createdBucket.id}" created`
		await reload()
		resetCreateForm()
		closeCreateModal()
	} catch (newError) {
		createError.value = newError
	} finally {
		createLoading.value = false
	}
}
</script>

<template>
	<LayoutDefault>
		<div class="sectionHeader">
			<div class="sectionHeader-content">
				<h1 class="title title-1">Buckets</h1>
			</div>
			<div class="sectionHeader-side">
				<button class="btn" :class="{ 'btn--loading': isLoading }" @click="reload">
					<PhArrowsCounterClockwise :size="20" weight="bold" />Refresh
				</button>
				<button class="btn btn--primary" command="show-modal" commandfor="create_bucket_modal" @click="loadKnownKeys">
					<PhPlus :size="20" weight="bold" />Create bucket
				</button>
			</div>
		</div>

		<BannerError v-if="error" :error="error" id="buckets_error" />
		<BannerError v-if="createError" :error="createError" id="bucket_create_error" />
		<Banner v-if="createInfo">{{ createInfo }}</Banner>

		<Modal
			id="create_bucket_modal"
			title="Create bucket"
			subtitle="Creates bucket via Admin API CreateBucket and optionally attaches a local alias to an access key"
			closedby="any"
			@close="resetCreateForm"
		>
			<form action="" method="post" @submit="submitCreateBucket">
				<div class="f-group">
					<label for="bucket_global_alias">Global alias</label>
					<input id="bucket_global_alias" type="text" v-model="createFormGlobalAlias" placeholder="my-bucket" required />
				</div>

				<div class="f-group">
					<label for="bucket_local_alias">Local alias (optional)</label>
					<input id="bucket_local_alias" type="text" v-model="createFormLocalAlias" placeholder="reports" />
				</div>

				<div class="f-group">
					<label for="bucket_access_key">Access key ID (optional, required with local alias)</label>
					<input id="bucket_access_key" type="text" v-model="createFormAccessKeyId" placeholder="GK..." list="known_access_keys" />
					<datalist id="known_access_keys">
						<option v-for="key in knownKeys" :key="key.id" :value="key.id">{{ key.name }}</option>
					</datalist>
					<div class="text-small color-gray" v-if="knownKeysLoading">Loading access keys...</div>
				</div>

				<div class="f-group">
					<div class="label">Initial local alias permissions (optional)</div>
					<div class="flex flex-wrap gap gap--10">
						<label class="inline-flex gap gap--6 items-center"><input type="checkbox" v-model="createAllowRead" />Read</label>
						<label class="inline-flex gap gap--6 items-center"><input type="checkbox" v-model="createAllowWrite" />Write</label>
						<label class="inline-flex gap gap--6 items-center"><input type="checkbox" v-model="createAllowOwner" />Owner</label>
					</div>
				</div>

				<div class="f-group">
					<button class="btn btn--primary btn--big w100" :class="{ 'btn--loading': createLoading }">
						Create bucket
						<PhSpinnerGap :size="20" weight="bold" v-show="createLoading" />
					</button>
				</div>
			</form>
			<button class="btn w100 mt20" command="close" commandfor="create_bucket_modal" autofocus>Cancel</button>
		</Modal>

		<div class="flex flex-column gap gap--12" v-if="sortedBuckets.length > 0">
			<RouterLink v-for="bucket in sortedBuckets" :key="bucket.id" :to="{ path: `/buckets/${bucket.id}` }" class="cardLink">
				<div class="flex-grow min-w0 flex flex-column gap gap--8">
					<div class="flex flex-wrap gap gap--10 items-center">
						<div class="text-semibold">{{ bucket.globalAliases[0] || bucket.id }}</div>
						<div class="tag tag--small color-gray text-uppercase text-monospace">{{ bucket.id }}</div>
					</div>
					<div class="color-gray text-small">Created: {{ formatDate(bucket.created) }}</div>
					<div class="flex flex-wrap gap gap--8" v-if="bucket.globalAliases.length > 0">
						<span class="tag tag--small" v-for="alias in bucket.globalAliases" :key="alias">{{ alias }}</span>
					</div>
					<div class="flex flex-wrap gap gap--8" v-if="bucket.localAliases.length > 0">
						<span class="tag tag--small color-gray" v-for="alias in bucket.localAliases" :key="`${alias.accessKeyId}-${alias.alias}`">
							{{ alias.alias }}
						</span>
					</div>
				</div>
				<div class="cardLink-ico"><PhArrowRight :size="20" weight="bold" /></div>
			</RouterLink>
		</div>

		<div class="cardLink cardLink--disabled flex justify-center" v-else-if="!isLoading && !error">
			<div class="flex flex-column items-center justify-center mt12 mb12">
				<EmptyState title="No Buckets" subtitle="No buckets are currently visible for this admin token" />
			</div>
		</div>
	</LayoutDefault>
</template>