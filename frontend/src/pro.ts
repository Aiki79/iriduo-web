import { useEffect, useState } from "react";

import { tr } from "@/src/i18n";
import { storage } from "@/src/utils/storage";

/**
 * IriDuo Pro — DEMO mode. No real payment: activating only flips a local flag,
 * clearly labelled "prova" in the UI. Real store billing is not connected yet.
 */
export type Plan = "monthly" | "annual";
export type ProState = { pro: boolean; plan: Plan | null; month: string; hdCalls: number };

export const PLANS = (): { id: Plan; label: string; price: string; note: string }[] => [
  { id: "monthly", label: tr("Mensile", "Monthly"), price: tr("6,99 € / mese", "€6.99 / month"), note: tr("Disdici quando vuoi", "Cancel anytime") },
  { id: "annual", label: tr("Annuale", "Yearly"), price: tr("59,99 € / anno", "€59.99 / year"), note: tr("Risparmi circa il 28%", "Save about 28%") },
];

export const FREE_HD_CALLS = 3;
export const FREE_HISTORY = 3;
export const FREE_REACTIONS = 3;
export const FREE_RESOLUTION = "1920x960";
/** Resolutions usable on the free plan: HD + the native mode of USB stereo webcams (3840×1080). */
export const isFreeRes = (r: string) => r === FREE_RESOLUTION || r === "3840x1080";

const KEY = "pro_state";
const thisMonth = () => {
  const d = new Date(); // local time, so the free calls reset at local midnight
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

let state: ProState = { pro: false, plan: null, month: thisMonth(), hdCalls: 0 };
const listeners = new Set<(s: ProState) => void>();

const set = (s: ProState) => {
  state = s;
  listeners.forEach((l) => l(s));
  storage.setItem(KEY, JSON.stringify(s));
};

const loaded = storage.getItem(KEY, "").then((raw) => {
  if (!raw) return;
  try {
    const s = JSON.parse(String(raw)) as ProState;
    state = s.month === thisMonth() ? s : { ...s, month: thisMonth(), hdCalls: 0 };
    listeners.forEach((l) => l(state));
  } catch {}
});

export function useProState() {
  const [s, setS] = useState(state);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    listeners.add(setS);
    loaded.then(() => {
      setS(state);
      setReady(true);
    });
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return { ...s, ready };
}

export const activatePro = (plan: Plan) => set({ ...state, pro: true, plan });
export const deactivatePro = () => set({ ...state, pro: false, plan: null });

/** Free plan: counts one HD call for the current month. */
export function countCall() {
  if (state.pro) return;
  const base = state.month === thisMonth() ? state : { ...state, month: thisMonth(), hdCalls: 0 };
  set({ ...base, hdCalls: base.hdCalls + 1 });
}

export const callsLeft = (s: ProState) => (s.pro ? Infinity : Math.max(0, FREE_HD_CALLS - (s.month === thisMonth() ? s.hdCalls : 0)));
