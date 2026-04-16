import { defineBasicLoader } from "vue-router/experimental"
import { client } from "../store.ts"
import { HttpError, successOrThrow } from "../utils/api.ts"

const expectedErrors = [HttpError, Error]

export const useClusterHealth = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/GetClusterHealth")), {
	errors: expectedErrors,
})
export const useClusterStatus = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/GetClusterStatus")), {
	errors: expectedErrors,
})
export const useClusterStatistics = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/GetClusterStatistics")), {
	errors: expectedErrors,
})
export const useListBuckets = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/ListBuckets")), { errors: expectedErrors })
export const useListKeys = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/ListKeys")), { errors: expectedErrors })
export const useListAdminTokens = defineBasicLoader(async () => successOrThrow(await client.GET("/v2/ListAdminTokens")), {
	errors: expectedErrors,
})
export const useListWorkers = defineBasicLoader(
	async () =>
		successOrThrow(
			await client.POST("/v2/ListWorkers", {
				params: {
					query: {
						node: "*",
					},
				},
				body: {},
			}),
		),
	{ errors: expectedErrors },
)

export const useListWorkerVariables = defineBasicLoader(
	async () =>
		successOrThrow(
			await client.POST("/v2/GetWorkerVariable", {
				params: {
					query: {
						node: "*",
					},
				},
				body: {},
			}),
		),
	{ errors: expectedErrors },
)

export const useNodesStatistics = defineBasicLoader(
	async () =>
		successOrThrow(
			await client.GET("/v2/GetNodeStatistics", {
				params: {
					query: {
						node: "*",
					},
				},
			}),
		),
	{ errors: expectedErrors },
)