/* @refresh reload */

import {Repo, IndexedDBStorageAdapter} from "@automerge/vanillajs"
/* todo import NetlifyExtensionPollingNetworkAdapter */

export default new Repo({
	storage: new IndexedDBStorageAdapter(),
	network: [/* todo */],
	enableRemoteHeadsGossiping: true,
})
