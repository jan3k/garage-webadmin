/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly API_HOST: string
	readonly VITE_S3_ENDPOINT?: string
	readonly VITE_S3_REGION?: string
	readonly VITE_S3_ACCESS_KEY_ID?: string
	readonly VITE_S3_SECRET_ACCESS_KEY?: string
	readonly VITE_S3_SESSION_TOKEN?: string
	readonly VITE_S3_FORCE_PATH_STYLE?: string
	readonly VITE_S3_PROXY_PATH?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}