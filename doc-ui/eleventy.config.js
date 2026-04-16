import { IdAttributePlugin } from "@11ty/eleventy";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import postcss from "postcss";
import postcssImport from "postcss-import";
import postcssCustomMedia from "postcss-custom-media";
import cleanCSS from "clean-css";

import ColorTokens from "./../src/design-tokens/colors.json" with { type: "json" };

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyNavigationPlugin);
	eleventyConfig.addPlugin(IdAttributePlugin);
	eleventyConfig.addGlobalData("tokens.colors", ColorTokens);
	eleventyConfig.addPassthroughCopy({
		"./static/": "/",
		"./demos/": "/demos",
		"../src/components/": "/kit",
	});
	// Per-page bundles, see https://github.com/11ty/eleventy-plugin-bundle
	// Bundle <style> content and adds a {% css %} paired shortcode
	eleventyConfig.addBundle("css", {
		// Add all <style> content to `css` bundle (use eleventy:ignore to opt-out)
		// supported selectors: https://www.npmjs.com/package/posthtml-match-helper
		bundleHtmlContentFromSelector: "style",
		// Process sources
		transforms: [
			// PostCSS plugins
			async function (content) {
				let result = await postcss([
					postcssImport,
					postcssCustomMedia,
				]).process(content, { from: undefined });
				return result.css;
			},
			// Minify
			async function (content) {
				return new cleanCSS().minify(content).styles;
			},
		],
	});

	// Watch content images for the image pipeline.
	eleventyConfig.addWatchTarget("content/**/*.{svg,webp,png,jpeg}");
	eleventyConfig.addWatchTarget("styles/**/*.css");

	// Shortcodes
	eleventyConfig.addShortcode("colorTokenList", (tokens, prefix) => {
		const dataArray = Object.entries(tokens);
		const list = dataArray
			.filter((el) => typeof el[1] !== "object")
			.map((el) => {
				const label = (prefix ?? "") + el[0];
				const helper = "--color-" + (prefix ?? "") + el[0];
				const color = el[1];
				return `
				<div class="tokenColor-item">
					<div class="tokenColor-pill" style="--value: ${color}"></div>
					<div class="tokenColor-label">${label}</div>
					<div class="tokenColor-helper">${helper}</div>
					<div class="tokenColor-value">${color}</div>
				</div>
			`;
			})
			.join("");
		return `<div class="tokenColor-list">${list}</div>`.replace(
			/[\r\n]+/gm,
			" ",
		);
	});

	eleventyConfig.addShortcode(
		"demo",
		(path) => `<div class="example-showcase">
		<div class="example-showcase_title">Example showcase</div>

		<is-land on:interaction>
			<button class="btn">Load Example</button>
			<template data-island="replace">
				<script type="module" src="/js/vue-demo.js"></script>
				<vue-demo src="${path}"></vue-demo>
			</template>
		</is-land>
	</div>`,
	);

	eleventyConfig.addFilter("findCurrentNavItem", function (nav, page) {
		const currentNavItem = nav.find(
			(i) => i.data.page.inputPath === page.inputPath,
		);

		return currentNavItem;
	});
}

export const config = {
	// Eleventy default directories
	dir: {
		input: "content", // default: "."
		includes: "../includes", // default: "_includes" (`input` relative)
		data: "../data", // default: "_data" (`input` relative)/*  */
		output: "public", // default: "_site"
	},
	// Pre-process *.md files with
	markdownTemplateEngine: "njk",
	// Pre-process *.html files with
	htmlTemplateEngine: "njk",
};
