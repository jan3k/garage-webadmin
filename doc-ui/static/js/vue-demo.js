import * as Vue from '/dependencies/vue.runtime.esm-browser@3.5.27.js'
import { loadModule } from '/dependencies/vue3-sfc-loader.esm@0.9.5.js'

const loadSfc = (url) => loadModule(url, {
	moduleCache: { vue: Vue },
	getFile: (url) => fetch(url).then(r => r.text()),
	addStyle: () => {}
})

export class VueDemo extends HTMLElement {
	constructor() {
		super()
	}

	async connectedCallback() {
		this.replaceChildren()
		Vue.createApp(await loadSfc(this.getAttribute("src")))
			.mount(this)
	}
}

customElements.define("vue-demo", VueDemo)
