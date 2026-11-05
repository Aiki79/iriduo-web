import { getLocales } from "expo-localization";
import { useSyncExternalStore } from "react";

import { storage } from "@/src/utils/storage";

export type Lang = "it" | "en";
const LANG_KEY = "lang_v1";

/** Phone language, used to pre-select the choice on first launch. */
export const deviceLang = (): Lang => (getLocales()[0]?.languageCode === "it" ? "it" : "en");

let current: Lang = deviceLang();
let chosen = false;
const listeners = new Set<() => void>();

/** Loads the saved choice; returns true if the user has already picked a language. */
export async function loadLang() {
  const v = await storage.getItem(LANG_KEY, null);
  if (v === "it" || v === "en") {
    current = v;
    chosen = true;
  }
  return chosen;
}

export const langChosen = () => chosen;
export const getLang = () => current;

export async function setLang(l: Lang) {
  current = l;
  chosen = true;
  await storage.setItem(LANG_KEY, l);
  listeners.forEach((f) => f());
}

/** Inline translation: tr("Ciao", "Hi"). Screens call useLang() so they re-render on change. */
export const tr = (it: string, en: string) => (current === "en" ? en : it);

export function useLang() {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    getLang,
    getLang,
  );
}
