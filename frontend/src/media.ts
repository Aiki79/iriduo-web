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
