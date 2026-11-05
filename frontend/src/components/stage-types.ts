import type { Fisheye } from "./FisheyePanel";

export type StageCmd = { type: string; [k: string]: unknown };

export type Device = { id: string; label: string };

export type StageEvent =
  | { type: "ready"; mode: string }
  | { type: "code"; code: string }
  | { type: "status"; text: string }
  | { type: "error"; text: string }
  | { type: "permError"; text: string }
  | { type: "incoming" }
  | { type: "calling" }
  | { type: "connected" }
  | { type: "ended" }
  | { type: "test"; name: string | null }
  | { type: "devices"; cams: Device[]; mics: Device[]; cam: string; mic: string }
  | { type: "resolution"; w: number; h: number; requested: number }
  | { type: "stats"; kbps: number; fps: number; w: number; h: number; rtt: number | null; loss: number }
  | { type: "chat"; text: string; from?: string }
  | { type: "react"; kind: string }
  | { type: "chatSent"; id: string }
  | { type: "chatError"; id: string }
  | { type: "snapshot"; name: string; data?: string; web?: boolean }
  | { type: "snapError"; text: string }
  | { type: "recStarted" }
  | { type: "recError"; text: string }
  | { type: "recSaved"; name: string; web?: boolean }
  | { type: "recChunk"; i: number; n: number; data: string; name: string; mime: string }
  | { type: "codeTaken" }
  | { type: "guest"; code: string; state: string }
  | { type: "fisheye"; value: Fisheye }
  | { type: "xrSupport"; on: boolean }
  | { type: "recAsk" }
  | { type: "recPeer"; on: boolean }
  | { type: "recWaiting" }
  | { type: "reported"; ok: boolean }
  | { type: "blocked" }
  | { type: "suspended" }
  | { type: "xr"; on: boolean };

export type StageHandle = { send: (c: StageCmd) => void; reload: () => void };

import { API_BASE } from "@/src/api";
import { getLang } from "@/src/i18n";

export const stageUrl = (mode: string, query?: string) => `${API_BASE}/api/stage?mode=${mode}&lang=${getLang()}${query ? `&${query}` : ""}`;
export const stageOrigin = () => new URL(API_BASE).origin;
