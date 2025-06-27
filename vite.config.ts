import {defineConfig} from "vite"
import solid from "vite-plugin-solid"
import wasm from "vite-plugin-wasm"
export default defineConfig({
	plugins: [solid(), wasm()],
	server: {port: 1234},
	build: {target: "esnext"},
})
