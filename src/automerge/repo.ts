/* @refresh reload */

import {Repo, IndexedDBStorageAdapter} from "@automerge/vanillajs"
import {NetlifyClient} from "./polling-client.ts"

export default new Repo({
	storage: new IndexedDBStorageAdapter(),
	network: [new NetlifyClient()],
	enableRemoteHeadsGossiping: true,
})
