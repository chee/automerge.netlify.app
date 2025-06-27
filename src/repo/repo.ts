/* @refresh reload */

import {Repo} from "@automerge/automerge-repo"
import {IndexedDBStorageAdapter} from "@automerge/automerge-repo-storage-indexeddb"

export default new Repo({
	storage: new IndexedDBStorageAdapter(),
	network: [],
	enableRemoteHeadsGossiping: true,
})
