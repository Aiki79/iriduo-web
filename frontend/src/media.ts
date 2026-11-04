import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export type Memory = { name: string; uri: string; size: number; kind: "photo" | "video"; at: number };

const isWeb = Platform.OS === "web";

function galleryDir() {
  const d = new Directory(Paths.document, "ricordi");
  if (!d.exists) d.create({ idempotent: true });
  return d;
}

function fileFor(name: string) {
  const f = new File(galleryDir(), name);
  if (f.exists) f.delete();
  f.create();
  return f;
}

export async function shareFile(uri: string, mimeType: string) {
  if (isWeb) return;
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType, dialogTitle: "Salva o condividi" });
}

/** Saves a photo into the in-app gallery and opens the share sheet. */
export async function saveAndShare(name: string, base64: string, mimeType: string) {
  const f = fileFor(name);
  await f.write(base64, { encoding: "base64" });
  await shareFile(f.uri, mimeType);
}

export function listMemories(): Memory[] {
  if (isWeb) return [];
  return galleryDir()
    .list()
    .filter((x): x is File => x instanceof File)
    .map((f) => ({
      name: f.name,
      uri: f.uri,
      size: f.size ?? 0,
      kind: /\.jpe?g$/i.test(f.name) ? ("photo" as const) : ("video" as const),
      at: f.modificationTime ?? f.creationTime ?? 0,
    }))
    .sort((a, b) => b.at - a.at);
}

export function deleteMemory(name: string) {
  const f = new File(galleryDir(), name);
  if (f.exists) f.delete();
}

export async function readMemoryBase64(name: string) {
  return new File(galleryDir(), name).base64();
}

const toB64 = (u: Uint8Array) => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Streams a saved recording to the 3D stage in base64 chunks (the stage cannot read local files). */
export async function sendVideoFile(name: string, send: (c: { type: string; [k: string]: unknown }) => void) {
  const bytes = await new File(galleryDir(), name).bytes();
  const CH = 3 * 128 * 1024;
  const n = Math.ceil(bytes.length / CH);
  const mime = /\.mp4$/i.test(name) ? "video/mp4" : "video/webm";
  for (let i = 0; i < n; i++) {
    send({ type: "vidChunk", i, n, mime, data: toB64(bytes.subarray(i * CH, (i + 1) * CH)) });
    await new Promise((r) => setTimeout(r, 15));
  }
}

/** Receives a recording in ordered base64 chunks, keeps it in the gallery and shares it when complete. */
export class ChunkReceiver {
  private file: File | null = null;
  private chain: Promise<void> = Promise.resolve();

  push(i: number, n: number, name: string, data: string, mime: string, onDone: (ok: boolean) => void) {
    this.chain = this.chain
      .then(async () => {
        if (i === 0) this.file = fileFor(name);
        if (!this.file) throw new Error("missing file");
        await this.file.write(data, { encoding: "base64", append: true });
        if (i === n - 1) {
          const uri = this.file.uri;
          this.file = null;
          onDone(true);
          await shareFile(uri, mime);
        }
      })
      .catch(() => {
        this.file = null;
        onDone(false);
      });
  }
}
