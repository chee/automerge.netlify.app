import {
	NetworkAdapter,
	type Message,
	type PeerId,
	type PeerMetadata,
	cbor,
} from "@automerge/vanillajs"
import debug from "debug"
const log = debug("automerge.netlify.app:netlify-client")

export class NetlifyClient extends NetworkAdapter {
	#ready = false
	#readyResolver = () => {}
	#readyPromise: Promise<void> = new Promise<void>(resolve => {
		this.#readyResolver = resolve
	})

	isReady() {
		return this.#ready
	}
	whenReady() {
		return this.#readyPromise
	}

	#becomeReady() {
		if (!this.#ready) {
			this.#ready = true
			this.#readyResolver()
		}
	}

	#serverPeerId?: PeerId

	#poller = setTimeout(() => {})
	#abort = new AbortController()
	#url = "/sync"
	#interval = 1000

	constructor(config: {url?: string; interval?: number} = {}) {
		super()
		if (config.url) {
			this.#url = config.url
		}
		if (typeof config.interval == "number") {
			this.#interval = config.interval
		}
	}

	startPolling() {
		log("starting to poll")
		this.#poller = setTimeout(() => this.poll(), this.#interval)
	}

	async poll() {
		if (!this.#abort.signal.aborted) {
			this.#abort.abort()
		}
		this.#abort = new AbortController()
		await fetch(this.#url, {
			method: "POST",
			signal: this.#abort.signal,
			body: cbor.encode(this.#pending),
		})
			.then(async res => {
				if (res.ok) {
					this.#pending.length = 0
					const bytes = await res.bytes()
					const messages = cbor.decode(bytes) as NetlifyServerMessage[]
					for (const message of messages) {
						console.log({message})
						this.receiveMessage(message)
					}
				} else {
					throw new Error(`${res.status}`)
				}
			})
			.catch(e => {
				console.log("bad", e)
			})

		this.#poller = setTimeout(() => this.poll(), this.#interval)
	}

	receiveMessage(message: NetlifyServerMessage) {
		if (isHelloFromServer(message)) {
			this.#becomeReady()
			this.#serverPeerId = message.senderId
			this.emit("peer-candidate", {
				peerId: message.senderId,
				peerMetadata: message.peerMetadata,
			})
		} else {
			this.emit("message", message)
		}
	}

	async connect(peerId: PeerId, peerMetadata?: PeerMetadata) {
		this.peerId = peerId
		this.peerMetadata = peerMetadata
		this.startPolling()

		this.send({
			type: "hi",
			peerMetadata: this.peerMetadata!,
			senderId: this.peerId!,
		})
		// setTimeout(() => this.#becomeReady(), 1000)
	}

	disconnect() {
		clearTimeout(this.#poller)
		this.#serverPeerId &&
			this.emit("peer-disconnected", {
				peerId: this.#serverPeerId,
			})
		this.emit("close")
	}

	#pending: Uint8Array[] = []

	send(message: NetlifyClientMessage) {
		// if (!this.#serverPeerId) {
		// log("not ready, but trying to act like i'm ready")
		// }
		this.#pending.push(message)
	}
}

type HelloFromClient = {
	type: "hi"
	senderId: PeerId
	peerMetadata: PeerMetadata
	targetId: never
}

type HelloFromServer = {
	type: "hi-back"
	senderId: PeerId
	peerMetadata: PeerMetadata
	targetId: PeerId
}

export type NetlifyClientMessage = HelloFromClient | Message
export type NetlifyServerMessage = HelloFromServer | Message

export const isHelloFromClient = (
	message: Message
): message is HelloFromClient => message.type === "hi"

export const isHelloFromServer = (
	message: Message
): message is HelloFromServer => message.type === "hi-back"
