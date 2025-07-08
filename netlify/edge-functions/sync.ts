import type { Config, Context } from "@netlify/edge-functions";
// import { getStore } from "@netlify/blobs";
import { automergeWasmBase64 } from "@automerge/automerge/automerge.wasm.base64";
import {
  // Automerge,
  cbor,
  // type DocumentId,
  initializeBase64Wasm,
  Message,
  NetworkAdapter,
  PeerId,
  PeerMetadata,
  Repo,
} from "@automerge/vanillajs/slim";
// import { initSyncState } from "@automerge/automerge/slim";
import Blobs from "@chee/automerge-repo-storage-netlify-blobs";

// const docStore = getStore({
//   name: "autosync-doc1",
//   consistency: "strong",
//   siteID: "5142446f-ae99-4362-a2ba-acc04654120a",
//   token: Deno.env.get("NETLIFY_TOKEN"),
// });
// const syncStore = getStore({
//   name: "autosync-sync1",
//   consistency: "strong",
//   siteID: "5142446f-ae99-4362-a2ba-acc04654120a",
//   token: Deno.env.get("NETLIFY_TOKEN"),
// });

let repo: Repo;
const init: (() => Promise<void>) & { done?: boolean } = async () => {
  if (init.done) return;
  init.done = true;
  await initializeBase64Wasm(automergeWasmBase64);
  repo = new Repo({
    storage: new Blobs({
      name: "autoauto",
    }),
  });
};

// const senderId = "edge-function" as PeerId;
const senderId = Math.random().toString() as PeerId;
export default async function handle(request: Request, context: Context) {
  await init();

  const outgoing: NetlifyServerMessage[] = [];
  const incoming = cbor.decode(
    new Uint8Array(await request.arrayBuffer()),
  ) as NetlifyClientMessage[];
  const { resolve, promise } = Promise.withResolvers<Response>();
  setTimeout(() => {
    resolve(new Response(cbor.encode(outgoing)));
  }, 5000);
  repo.networkSubsystem.addNetworkAdapter(
    new (class extends NetworkAdapter {
      async connect(peerId: PeerId, peerMetadata: PeerMetadata) {
        this.peerId = peerId;
        this.peerMetadata = peerMetadata;
        let remotePeerId: PeerId = "" as PeerId;
        let remotePeerMetadata: PeerMetadata = {};

        for (const msg of incoming) {
          remotePeerId = msg.senderId;
          remotePeerMetadata ??= msg.peerMetadata;
          this.emit("peer-candidate", {
            peerId: remotePeerId,
            peerMetadata: remotePeerMetadata,
          });
          if (isHelloFromClient(msg)) {
            outgoing.push(
              {
                type: "hi-back",
                senderId: peerId,
                targetId: msg.senderId,
                peerMetadata,
              } as Message & { peerMetadata: PeerMetadata },
            );
          } else {
            this.emit("message", msg);
            console.log({ msg });
          }
        }

        await new Promise((r) => setTimeout(r, 100));
        this.emit("peer-disconnected", {
          peerId: remotePeerId,
        });

        // messages.length = 0;
        resolve(
          new Response(cbor.encode(outgoing)),
        );
      }
      isReady() {
        return true;
      }
      whenReady() {
        return Promise.resolve();
      }
      override disconnect(): void {
      }
      override send(message: Message): void {
        outgoing.push(message);
        console.log("added", message);
      }
    })(),
  );

  // return new Response(cbor.encode(outgoing));

  return promise;
}

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
