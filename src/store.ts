import useLocalStorage from "./utils/localstorage-sync.js"
import { default as createApiClient, type Authenticated } from "./utils/create-api-client.js"

export const authenticated = useLocalStorage<Authenticated | null>("authenticated", null)

export const client = createApiClient()