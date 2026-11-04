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
  | { type: "guest"; code: string; state: string };

export type StageHandle = { send: (c: StageCmd) => void; reload: () => void };

export const stageUrl = (mode: string, query?: string) => `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/stage?mode=${mode}${query ? `&${query}` : ""}`;
export const stageOrigin = () => new URL(String(process.env.EXPO_PUBLIC_BACKEND_URL)).origin;
