// popover api
;(async () => {
	if (!(typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype === "object" && "popover" in HTMLElement.prototype)) {
		console.log("Popover API polyfill needed")
		const { apply: applyPopoverPolyfill } = await import("@oddbird/popover-polyfill/fn")
		applyPopoverPolyfill()
	}
})()

// Anchor Positioning

;(async () => {
	if (!("anchorName" in document.documentElement.style)) {
		console.log("Anchor Positioning polyfill needed")
		await import("@oddbird/css-anchor-positioning")
	}
})()

// Invoker Command
;(async () => {
	if (
		!(
			typeof HTMLButtonElement !== "undefined" &&
			"command" in HTMLButtonElement.prototype &&
			"source" in ((globalThis.CommandEvent || {}).prototype || {})
		)
	) {
		console.log("Invoker Command polyfill needed")
		const { apply: applyInvokerCommandPolyfill } = await import("invokers-polyfill/fn")
		applyInvokerCommandPolyfill()
	}
})()

// closedby
function isSupportedClosedby() {
	if (
		typeof HTMLDialogElement === "undefined" ||
		typeof HTMLDialogElement.prototype !== "object" ||
		!("closedBy" in HTMLDialogElement.prototype)
	) {
		return false
	}
	if (typeof document === "undefined" || typeof document.createElement !== "function") {
		return false
	}
	try {
		const testDialog = document.createElement("dialog")
		testDialog.setAttribute("closedby", "none")
		return testDialog.closedBy === "none"
	} catch {
		return false
	}
}
;(async () => {
	if (!isSupportedClosedby()) {
		console.log("closedby polyfill needed")
		const { apply: applyClosedbyPolyfill } = await import("dialog-closedby-polyfill")
		applyClosedbyPolyfill()
	}
})()