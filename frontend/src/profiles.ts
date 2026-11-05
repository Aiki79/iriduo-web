import { useEffect, useState } from "react";

import type { Fisheye } from "@/src/components/FisheyePanel";
import { storage } from "@/src/utils/storage";

/** Named fisheye calibrations (one per camera), kept only on this device. */
export type CameraProfile = { id: string; name: string; fe: Fisheye };

const KEY = "fisheye_profiles";
const MAX = 20;

export async function getProfiles(): Promise<CameraProfile[]> {
  const raw = await storage.getItem(KEY, "");
  try {
    const list = JSON.parse(String(raw || "[]"));
    return Array.isArray(list) ? (list as CameraProfile[]) : [];
  } catch {
    return [];
  }
}

async function save(list: CameraProfile[]) {
  await storage.setItem(KEY, JSON.stringify(list));
  return list;
}

/** Saves the current calibration; a profile with the same name (any case) is overwritten. */
export async function saveProfile(name: string, fe: Fisheye) {
  const n = name.trim().slice(0, 30);
  const list = await getProfiles();
  const same = list.find((p) => p.name.toLowerCase() === n.toLowerCase());
  if (same) return save(list.map((p) => (p === same ? { ...p, name: n, fe } : p)));
  return save([{ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: n, fe }, ...list].slice(0, MAX));
}

export async function deleteProfile(id: string) {
  return save((await getProfiles()).filter((p) => p.id !== id));
}

export function useProfiles() {
  const [list, setList] = useState<CameraProfile[]>([]);
  useEffect(() => {
    getProfiles().then(setList);
  }, []);
  return [list, setList] as const;
}

export const sameFe = (a: Fisheye, b: Fisheye) => (Object.keys(a) as (keyof Fisheye)[]).every((k) => a[k] === b[k]);
