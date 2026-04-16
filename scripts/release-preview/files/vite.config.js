// File only dedicated to test-releases

// You probably wanna take a look at vite.config.js
export default {
	server: {
		proxy: {
			"/api": {
				target: process.env.API_HOST,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
}