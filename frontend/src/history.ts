import { tr } from "@/src/i18n";
import { storage } from "@/src/utils/storage";

export type CallResult = "completata" | "rifiutata" | "annullata" | "senza-risposta" | "persa" | "non-trovato";

export type CallRecord = {
  id: string;
  role: "in" | "out";
  code: string;
  at: number;
  duration: number;
  quality: string | null;
  result: CallResult;
};

const KEY = "call_history";
const MAX = 100;

export async function getHistory(): Promise<CallRecord[]> {
  const raw = await storage.getItem(KEY, "");
  if (!raw) return [];
  try {
    const list = JSON.parse(String(raw));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function addCall(rec: Omit<CallRecord, "id">) {
  const list = [{ ...rec, id: `${rec.at}-${Math.random().toString(36).slice(2, 8)}` }, ...(await getHistory())].slice(0, MAX);
  await storage.setItem(KEY, JSON.stringify(list));
}

export async function clearHistory() {
  await storage.removeItem(KEY);
}

/** Most frequent measured quality label during the call. */
export function topQuality(counts: Record<string, number>): string | null {
  let best: string | null = null;
  for (const [k, v] of Object.entries(counts)) if (k !== "Misuro…" && (best === null || v > counts[best])) best = k;
  return best;
}

export const RESULT_LABEL = (r: CallResult) =>
  ({
    completata: tr("Completata", "Completed"),
    rifiutata: tr("Rifiutata", "Declined"),
    annullata: tr("Annullata", "Cancelled"),
    "senza-risposta": tr("Nessuna risposta", "No answer"),
    persa: tr("Persa", "Missed"),
    "non-trovato": tr("Codice non trovato", "Code not found"),
  })[r];

/** Quality is stored with its Italian key ("Buona", "Media", "Debole", "Misuro…"): translate only for display. */
export const qualityLabel = (q: string) => ({ Buona: tr("Buona", "Good"), Media: tr("Media", "Fair"), Debole: tr("Debole", "Weak"), "Misuro…": tr("Misuro…", "Measuring…") })[q] ?? q;
