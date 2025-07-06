import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";
import { automergeWasmBase64 } from "@automerge/automerge/automerge.wasm.base64";
import {
  Automerge,
  cbor,
  type DocumentId,
  initializeBase64Wasm,
  Message,
  NetworkAdapter,
  PeerId,
  PeerMetadata,
  Repo,
} from "@automerge/vanillajs/slim";
import { initSyncState } from "@automerge/automerge/slim";
// import Blobs from "@chee/automerge-repo-storage-netlify-blobs";

const docStore = getStore({
  name: "autosync-docs",
  consistency: "strong",
  siteID: "5142446f-ae99-4362-a2ba-acc04654120a",
  token: Deno.env.get("NETLIFY_TOKEN"),
});
const syncStore = getStore({
  name: "autosync-sync",
  consistency: "strong",
  siteID: "5142446f-ae99-4362-a2ba-acc04654120a",
  token: Deno.env.get("NETLIFY_TOKEN"),
});

let init: (() => Promise<void>) & { done?: boolean } = async () => {
  if (init.done) return;
  init.done = true;
  await initializeBase64Wasm(automergeWasmBase64);
};

// const peerId = "edge-function" as PeerId;
const senderId = Math.random().toString() as PeerId;
export default async (request: Request, context: Context) => {
  await init();
  const outgoing: NetlifyServerMessage[] = [];
  const { resolve, promise } = Promise.withResolvers<Response>();
  const incoming = cbor.decode(
    new Uint8Array(await request.arrayBuffer()),
  ) as NetlifyClientMessage[];
  for (const message of incoming) {
    if (isHelloFromClient(message)) {
      outgoing.push(
        {
          type: "hi-back",
          senderId,
          targetId: message.senderId,
        },
      );
    } else if (message.type == "sync") {
      const { data, documentId } = message;
      const docBlob = await docStore.get(documentId!, {
        consistency: "strong",
        type: "arrayBuffer",
      });
      let doc = docBlob
        ? Automerge.load(new Uint8Array(docBlob))
        : Automerge.init();
      const syncKey = `${message.senderId}-${documentId}`;
      console.log(
        syncKey,
        await syncStore.get(syncKey, {
          consistency: "strong",
          type: "json",
        }),
      );
      const syncState = await syncStore.get(syncKey, {
        consistency: "strong",
        type: "json",
      }) ?? initSyncState();
      const [nextDoc, nextSyncState, syncMessage] = Automerge
        .receiveSyncMessage(doc, syncState, data!);
      await syncStore.setJSON(syncKey, nextSyncState);
      console.log(
        syncKey,
        await syncStore.get(syncKey, {
          consistency: "strong",
          type: "json",
        }),
      );
      docStore.set(documentId!, Automerge.save(nextDoc).buffer as ArrayBuffer);
      outgoing.push({
        type: "sync",
        senderId,
        targetId: message.senderId,
        documentId,
        data: syncMessage!,
      });
    } else if (message.type == "request") {
      const doc = await docStore.get(message.documentId!, {
        consistency: "strong",
        type: "arrayBuffer",
      });
      outgoing.push({
        type: "sync",
        senderId,
        targetId: message.senderId,
        documentId: message.documentId,
        data: new Uint8Array(doc),
      });
    }
  }
  return new Response(cbor.encode(outgoing));

  // setTimeout(() => {
  //   resolve(new Response());
  // }, 10000);
  // const repo = new Repo({
  //   storage: new Blobs({
  //     name: "auto",
  //   }),
  //   network: [
  //     new (class extends NetworkAdapter {
  //       async connect(peerId: PeerId, peerMetadata: PeerMetadata) {
  //         this.peerId = peerId;
  //         this.peerMetadata = peerMetadata;
  //         const messages = cbor.decode(
  //           new Uint8Array(await request.arrayBuffer()),
  //         ) as NetlifyClientMessage[];
  //         if (!messages.length) {
  //           resolve(new Response());
  //         }
  //         for (const msg of messages) {
  //           if (isHelloFromClient(msg)) {
  //             console.log("she said hello");
  //             this.emit("peer-candidate", {
  //               peerId: msg.senderId,
  //               peerMetadata: msg.peerMetadata,
  //             });
  //             outgoing.push(
  //               {
  //                 type: "hi-back",
  //                 senderId: peerId,
  //                 targetId: msg.senderId,
  //                 peerMetadata,
  //               } as Message & { peerMetadata: PeerMetadata },
  //             );
  //           } else {
  //             this.emit("message", msg);
  //             console.log({ msg });
  //           }
  //         }
  //         await new Promise((r) => setTimeout(r, 1000));
  //         messages.length = 0;
  //         resolve(
  //           new Response(cbor.encode(outgoing)),
  //         );
  //       }
  //       isReady() {
  //         return true;
  //       }
  //       whenReady() {
  //         return Promise.resolve();
  //       }
  //       override disconnect(): void {
  //       }
  //       override send(message: Message): void {
  //         console.log("adding message", message);
  //         // resolve(new Response(cbor.encode(message)));
  //         outgoing.push(message);
  //       }
  //     })(),
  //   ],
  // });

  // return promise;
};

export const config: Config = {
  path: "/sync",
};

type HelloFromClient = {
  type: "hi";
  senderId: PeerId;
  peerMetadata: PeerMetadata;
  targetId: never;
};

type HelloFromServer = {
  type: "hi-back";
  senderId: PeerId;
  peerMetadata: PeerMetadata;
  targetId: PeerId;
};

export type NetlifyClientMessage = HelloFromClient | Message;
export type NetlifyServerMessage = HelloFromServer | Message;

export const isHelloFromClient = (
  message: Message,
): message is HelloFromClient => message.type === "hi";

export const isHelloFromServer = (
  message: Message,
): message is HelloFromServer => message.type === "hi-back";
