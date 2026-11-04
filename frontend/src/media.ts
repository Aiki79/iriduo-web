import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

/** Writes base64 data to a cache file and opens the share sheet (save to Photos/Files, send...). */
export async function saveAndShare(name: string, base64: string, mimeType: string) {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  await f.write(base64, { encoding: "base64" });
  await share(f.uri, mimeType);
}

async function share(uri: string, mimeType: string) {
  if (Platform.OS === "web") return;
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType, dialogTitle: "Salva o condividi" });
}

/** Receives a recording in ordered base64 chunks and shares it when complete. */
export class ChunkReceiver {
  private file: File | null = null;
  private chain: Promise<void> = Promise.resolve();

  push(i: number, n: number, name: string, data: string, mime: string, onDone: (ok: boolean) => void) {
    this.chain = this.chain
      .then(async () => {
        if (i === 0) {
          const f = new File(Paths.cache, name);
          if (f.exists) f.delete();
          f.create();
          this.file = f;
        }
        if (!this.file) throw new Error("missing file");
        await this.file.write(data, { encoding: "base64", append: true });
        if (i === n - 1) {
          const uri = this.file.uri;
          this.file = null;
          onDone(true);
          await share(uri, mime);
        }
      })
      .catch(() => {
        this.file = null;
        onDone(false);
      });
  }
}
