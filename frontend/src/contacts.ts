import { storage } from "@/src/utils/storage";

export type Contact = { code: string; name: string };

const KEY = "contacts";

export async function getContacts(): Promise<Contact[]> {
  const raw = await storage.getItem(KEY, "");
  if (!raw) return [];
  try {
    const list = JSON.parse(String(raw));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function save(list: Contact[]) {
  await storage.setItem(KEY, JSON.stringify(list));
  return list;
}

export async function upsertContact(c: Contact) {
  const list = (await getContacts()).filter((x) => x.code !== c.code);
  return save([...list, c].sort((a, b) => a.name.localeCompare(b.name, "it")));
}

export async function removeContact(code: string) {
  return save((await getContacts()).filter((x) => x.code !== code));
}

export const nameFor = (contacts: Contact[], code: string) => contacts.find((c) => c.code === code)?.name;
