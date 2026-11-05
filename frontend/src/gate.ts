import { storage } from "@/src/utils/storage";

/** First-launch gate: language + terms must be done before any screen, including invite links. */
export const TERMS_KEY = "terms_v1"; // age (14+ or parent permission) + rules of use accepted

let termsOk = false;
let pending: { pathname: string; params: Record<string, string> } | null = null;

export async function loadTerms() {
  termsOk = !!(await storage.getItem(TERMS_KEY, false));
}
export const termsAccepted = () => termsOk;
export async function acceptTerms() {
  termsOk = true;
  await storage.setItem(TERMS_KEY, true);
}

/** The screen an invite link wanted to open, resumed once the gate is passed. */
export const setPending = (p: typeof pending) => (pending = p);
export function takePending() {
  const p = pending;
  pending = null;
  return p ?? { pathname: "/", params: {} };
}
