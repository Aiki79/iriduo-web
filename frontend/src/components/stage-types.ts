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
  | { type: "test"; name: string }
  | { type: "devices"; cams: Device[]; mics: Device[]; cam: string; mic: string }
  | { type: "resolution"; w: number; h: number; requested: number };

export type StageHandle = { send: (c: StageCmd) => void; reload: () => void };

export const stageUrl = (mode: string) => `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/stage?mode=${mode}`;
