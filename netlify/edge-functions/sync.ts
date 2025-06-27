import type {Config, Context} from "@netlify/edge-functions"
import {automergeWasmBase64} from "@automerge/automerge/automerge.wasm.base64.js"
import {
	initializeBase64Wasm,
	// Repo,
	// type DocumentId,
} from "@automerge/vanillajs/slim"
// import Blobs from "@chee/automerge-repo-storage-netlify-blobs"

let init: (() => Promise<void>) & {done?: boolean} = async () => {
	if (init.done) return
	init.done = true
	await initializeBase64Wasm(automergeWasmBase64)
}

export default async (request: Request, context: Context) => {
	// const repo = new Repo({storage: new Blobs()})
	await init()
	const url = new URL(request.url)
}

export const config: Config = {
	path: "/sync/*",
}
