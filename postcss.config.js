import tokens from "./src/design-tokens/tokens.js"

export default {
	plugins: {
		"postcss-custom-media": {},
		"postcss-design-token-utils": {
			tokens,
		},
	},
}