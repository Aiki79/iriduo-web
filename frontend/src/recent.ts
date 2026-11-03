import { storage } from "@/src/utils/storage";

const KEY = "recent_codes";

export async function getRecentCodes(): Promise<string[]> {
  const raw = await storage.getItem(KEY, "");
  return raw ? String(raw).split(",").filter(Boolean) : [];
}

export async function addRecentCode(code: string): Promise<string[]> {
  const list = [code, ...(await getRecentCodes()).filter((c) => c !== code)].slice(0, 5);
  await storage.setItem(KEY, list.join(","));
  return list;
}
