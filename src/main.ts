import "./assets/css/styles.css"
import "./polyfills.js"

import { createApp } from "vue"
import { DataLoaderPlugin } from "vue-router/experimental"
import App from "./App.vue"
import router from "./router"

const app = createApp(App)

app.use(DataLoaderPlugin, { router })
app.use(router)

app.mount("#app")