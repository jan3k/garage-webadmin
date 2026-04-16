import { default as createClient, type Client, type Middleware } from "openapi-fetch"
import type { paths, components } from "../api-schema.d.ts"
import { successOrThrow } from "./api.js"
import { authenticated } from "../store.ts"

type GetAdminTokenInfoResponse = components["schemas"]["GetAdminTokenInfoResponse"]
export type NodeResp = components["schemas"]["NodeResp"]

type GarageAPIClient = Client<paths>

export default function (): GarageAPIClient {
	const client = createClient<paths>({
		baseUrl: "/api",
	})

	client.use({
		async onRequest({ request }) {
			if (authenticated.value) {
				request.headers.set("Authorization", `Bearer ${authenticated.value.token}`)
			}
		},
	} satisfies Middleware)
	return client
}

export type Authenticated = {
	token: string
	tokenInfo: GetAdminTokenInfoResponse
	nodeInfo: NodeResp
}

export async function fetchAuthenticated(token: string): Promise<Authenticated> {
	const client = createClient<paths>({
		baseUrl: "/api",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})

	const tokenCurrent = successOrThrow(await client.GET("/v2/GetCurrentAdminTokenInfo"))
	const nodeResp = successOrThrow(
		await client.GET("/v2/GetNodeInfo", {
			params: {
				query: {
					node: "self",
				},
			},
		}),
	)

	const nodeInfo = Object.values(nodeResp.success)[0]
	if (nodeInfo == null) {
		throw new Error("This node is unable to complete the API call")
	}
	const cluster = successOrThrow(await client.GET("/v2/GetClusterStatus"))
	const nodes = cluster.nodes
	const node = nodes.find((n) => nodeInfo.nodeId === n.id)

	if (node == null) {
		throw new Error("Can't found its own node")
	}

	return {
		token,
		tokenInfo: tokenCurrent,
		nodeInfo: node,
	}
}