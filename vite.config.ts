import { fileURLToPath, URL } from "node:url"
import Vue from "@vitejs/plugin-vue"
import VueRouter from "vue-router/vite"
import { defineConfig, loadEnv } from "vite"
import magicalSvg from "vite-plugin-magical-svg"
import vueDevTools from "vite-plugin-vue-devtools"
import pkg from "./package.json" with { type: "json" }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "")
	const s3ProxyPath = env.VITE_S3_PROXY_PATH || "/s3"
	const proxy = {
		"/api": {
			target: env.API_HOST,
			changeOrigin: true,
			rewrite: (path: string) => path.replace(/^\/api/, ""),
		},
	} as Record<string, { target: string; changeOrigin: boolean; rewrite: (path: string) => string }>

	if (env.VITE_S3_ENDPOINT) {
		const s3ProxyMatcher = new RegExp(`^${s3ProxyPath}`)
		proxy[s3ProxyPath] = {
			target: env.VITE_S3_ENDPOINT,
			changeOrigin: true,
			rewrite: (path: string) => path.replace(s3ProxyMatcher, ""),
		}
	}

	return {
		plugins: [
			VueRouter(),
			Vue(),
			magicalSvg({
				target: "vue",
				svgo: false,
				preserveWidthHeight: true,
				restoreMissingViewBox: true,
			}),
			vueDevTools(),
		],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		publicDir: "static",
		server: {
			proxy,
		},
		define: {
			"import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
		},
	}
})