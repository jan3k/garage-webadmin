import { createRouter, createWebHistory } from "vue-router"
import { routes } from "vue-router/auto-routes"
import { authenticated } from "../store.ts"

export const LOGIN_PATH = "/login"
const LEGACY_LOGIN_PATH = "/Login"

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

// Navigation guards
router.beforeEach((to) => {
	if (to.path === LEGACY_LOGIN_PATH) {
		return { path: LOGIN_PATH, query: to.query, hash: to.hash }
	}

	const isToLogin = to.path === LOGIN_PATH
	const isAuthenticated = authenticated.value !== null

	if (!isAuthenticated && !isToLogin) {
		return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
	}
})

export default router