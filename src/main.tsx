/* @refresh reload */
import {render} from "solid-js/web"
import App from "./app.tsx"
const app = document.getElementById("app")
render(() => <App />, app!)
