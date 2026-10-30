import { VAULT_KEY } from "./vault";
export type Edition = { id: string; label: string };
const INDEX = "relish.edition-shelf.v1";
export const editionKey = (id: string) =>
  id === "original" ? VAULT_KEY : `${VAULT_KEY}:${id}`;
export function listEditions(): Edition[] {
  let labels: Edition[] = [];
  try {
    const v = JSON.parse(localStorage.getItem(INDEX) || "[]");
    if (Array.isArray(v))
      labels = v.filter(
        (x) => x && typeof x.id === "string" && typeof x.label === "string",
      );
  } catch {}
  const ids: string[] = [];
  if (localStorage.getItem(VAULT_KEY)) ids.push("original");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${VAULT_KEY}:`)) {
      const id = key.slice(VAULT_KEY.length + 1);
      if (/^[a-f0-9-]{36}$/.test(id)) ids.push(id);
    }
  }
  return [...new Set(ids)].map((id, i) => ({
    id,
    label:
      labels.find((x) => x.id === id)?.label.slice(0, 60) ||
      `Private edition ${i + 1}`,
  }));
}
// The envelope is authoritative; a lost shelf label never loses an edition.
export function labelEdition(id: string, label: string) {
  const editions = listEditions().map((e) =>
    e.id === id ? { id, label: label.slice(0, 60) } : e,
  );
  try {
    localStorage.setItem(INDEX, JSON.stringify(editions));
  } catch {
    /* Still discoverable by its envelope. */
  }
}

export function removeEditionLabel(id: string) {
  try {
    localStorage.setItem(
      INDEX,
      JSON.stringify(listEditions().filter((e) => e.id !== id)),
    );
  } catch {
    /* No envelope remains; shelf discovery is authoritative. */
  }
}
