/**
 * A whole entry's photos going with it when it's shared (2026-11-23): copies
 * with their own ids, re-encrypted for where they go. Our family journal's
 * copies use the family book's key; a send's copies use a key made for that
 * send, carried only inside each chosen person's encrypted passage.
 */
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import type { User } from "firebase/auth";
import { emptyBook, isBook, type Book } from "../model";
import {
  copyPhotos,
  decryptPhoto,
  deletePhotos,
  encryptPhoto,
  getPhoto,
  importPhotoKey,
  isPhotoKey,
  newPhotoKey,
  photoIds,
  putPhoto,
  type EncryptedPhoto,
  type Photo,
  type PhotoCopy,
} from "../photos";
import {
  decryptPassage,
  encryptPassage,
  isConnections,
  keepReceived,
  keyFingerprint,
  makeIdentity,
  type Identity,
  type Packet,
} from "../sharing";
import { keepIncoming, loadCircle, openIncomingPhoto, sendToPartners } from "../partner-share";
import { changeFamilyBook, loadFamilyPages } from "../family-book";
import { isFamilyPage, newFamilyPage } from "../family-pages";
import { photosDone, sentPhotoIds } from "../connections-server";
import { journalStream } from "../journal-stream";
import { createVault } from "../vault";
import { fakeLibrary } from "./family-remote";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
afterEach(() => vi.unstubAllGlobals());

const jpeg = (n: number) =>
  new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, n, n + 1, n + 2])], { type: "image/jpeg" });
const bytes = async (b: Blob) => Array.from(new Uint8Array(await b.arrayBuffer()));
const photo = (caption = ""): Photo => ({ id: crypto.randomUUID(), width: 800, height: 600, caption });
const user = (uid: string) =>
  ({ uid, emailVerified: true, getIdToken: async () => uid }) as unknown as User;
const member = async (identity: Identity, name: string) => ({
  uid: identity.uid,
  name,
  publicKey: identity.publicKey,
  keyId: await keyFingerprint(identity.publicKey),
});

/** A private entry's photos, kept in an in-memory "journal". */
function journal(...photos: Photo[]) {
  const kept = new Map<string, Blob>(photos.map((p, i) => [p.id, jpeg(i * 10)]));
  return {
    kept,
    load: async (id: string) => {
      const b = kept.get(id);
      if (!b) throw new Error("missing");
      return b;
    },
    store: async (copies: PhotoCopy[]) => {
      for (const c of copies) kept.set(c.photo.id, c.blob);
    },
  };
}

/**
 * A circle of Alex (me), Anna and Sam, and a relay that answers like the
 * connections API: photos are uploaded before the send, read back only by a
 * recipient still deciding, and removed when a send that didn't go is
 * discarded.
 */
async function relay() {
  const me = await makeIdentity("me"),
    anna = await makeIdentity("anna"),
    sam = await makeIdentity("sam");
  const members = [await member(me, "Alex"), await member(anna, "Anna"), await member(sam, "Sam")];
  const calls: Record<string, unknown>[] = [];
  const photos = new Map<string, EncryptedPhoto>();
  const sent = new Map<string, Record<string, unknown>>();
  let failSend = false;
  const respond = (status: number, body: unknown) =>
    ({ ok: status < 400, status, json: async () => body }) as Response;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string; headers: Record<string, string> }) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      const who = init.headers.Authorization.slice("Bearer ".length);
      if (body.action === "list")
        return respond(200, {
          profile: members.find((m) => m.uid === who),
          circle: { id: "circle", name: "Us", ownerId: "me", members },
          deliveries: [...sent.values()].map((s) => ({
            id: s.id,
            circleId: "circle",
            sender: "me",
            senderName: "Alex",
            createdAt: "2026-11-23T09:00:00Z",
            recipients: s.recipients,
            receipts: { [who]: "pending" },
            packet: (s.packets as Record<string, Packet>)[who],
            revoked: false,
          })),
        });
      if (body.action === "photo") {
        if (sent.has(body.id)) return respond(409, { error: "already sent" });
        photos.set(`${body.id}_${body.photo.id}`, body.photo);
        return respond(200, { ok: true });
      }
      if (body.action === "send") {
        if (failSend) return respond(503, { error: "The connection is unavailable." });
        for (const p of body.photos || [])
          if (!photos.has(`${body.id}_${p}`)) return respond(409, { error: "photos missing" });
        sent.set(body.id, body);
        return respond(200, { ok: true });
      }
      if (body.action === "photo-get") {
        const s = sent.get(body.id);
        const p = photos.get(`${body.id}_${body.photo}`);
        if (!s || !p || !(s.photos as string[] | undefined)?.includes(body.photo))
          return respond(404, { error: "This photo is no longer available." });
        if (!(s.recipients as string[]).includes(who)) return respond(403, { error: "not yours" });
        return respond(200, { photo: p });
      }
      if (body.action === "photo-discard") {
        if (!sent.has(body.id))
          for (const k of [...photos.keys()]) if (k.startsWith(`${body.id}_`)) photos.delete(k);
        return respond(200, { ok: true });
      }
      return respond(200, { ok: true });
    }),
  );
  const bookOf = (identity: Identity, owner: string) => {
    let book: Book = { ...emptyBook(owner), profile: { kind: "adult" }, connections: { identity, received: [] } };
    return {
      get: () => book,
      save: async (change: (b: Book) => Book) => {
        book = change(book);
      },
    };
  };
  return {
    me,
    anna,
    sam,
    calls,
    photos,
    failNextSend: () => (failSend = true),
    alex: bookOf(me, "Alex"),
    annaBook: bookOf(anna, "Anna"),
  };
}

describe("photo copies", () => {
  it("copies chosen photos under new ids with the same pictures", async () => {
    const a = photo("Leo in the fort"),
      b = photo();
    const j = journal(a, b);
    const copies = await copyPhotos([a, b], j);
    expect(copies.map((c) => c.photo.id)).not.toContain(a.id);
    expect(new Set(copies.map((c) => c.photo.id)).size).toBe(2);
    expect(copies[0].photo).toMatchObject({ caption: "Leo in the fort", width: 800, height: 600 });
    expect(await bytes(copies[0].blob)).toEqual(await bytes(j.kept.get(a.id)!));
    expect(await copyPhotos(undefined, j)).toEqual([]);
    // Never more than four, as on a page.
    const many = [photo(), photo(), photo(), photo(), photo()];
    expect(await copyPhotos(many, journal(...many))).toHaveLength(4);
  });

  it("counts shared copies among a journal's photos, so backups and sync carry them", () => {
    const [entry, family, kept, sent] = [photo(), photo(), photo(), photo()];
    const book: Book = {
      ...emptyBook("Alex"),
      journal: [
        { id: "j", title: "t", text: "w", style: "sky", status: "kept", revision: 1, createdAt: "2026-11-23T09:00:00Z", updatedAt: "2026-11-23T09:00:00Z", photos: [entry] },
      ],
      familyPages: [newFamilyPage({ kind: "page", text: "w", byName: "Alex", byBookId: "b", photos: [family] })],
      connections: {
        received: [{ id: "r", title: "t", text: "w", from: "anna", fromName: "Anna", createdAt: "2026-11-23T09:00:00Z", acceptedAt: "2026-11-23T09:00:00Z", photos: [kept] }],
        outgoing: [{ id: "o", circleId: "c", title: "t", text: "w", recipients: ["anna"], packets: {}, createdAt: "2026-11-23T09:00:00Z", sent: true, photos: [sent] }],
      },
    };
    expect(isBook(book)).toBe(true);
    expect(photoIds(book).toSorted()).toEqual([entry, family, kept, sent].map((p) => p.id).toSorted());
  });

  it("forgets only the photos asked for", async () => {
    const { key } = await createVault(emptyBook("A"), "fictional passphrase A");
    const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
    await putPhoto("ed", await encryptPhoto(a, jpeg(1), key));
    await putPhoto("ed", await encryptPhoto(b, jpeg(2), key));
    await deletePhotos("ed", [a]);
    await expect(getPhoto("ed", a)).rejects.toThrow(/missing/);
    expect(await bytes(await decryptPhoto(await getPhoto("ed", b), key))).toEqual(await bytes(jpeg(2)));
  });

  it("a send's photo key opens its photos and nothing else", async () => {
    const one = await newPhotoKey(),
      other = await newPhotoKey();
    expect(isPhotoKey(one.raw)).toBe(true);
    const id = crypto.randomUUID();
    const sealed = await encryptPhoto(id, jpeg(5), one.key);
    expect(await bytes(await decryptPhoto(sealed, await importPhotoKey(one.raw)))).toEqual(await bytes(jpeg(5)));
    await expect(decryptPhoto(sealed, other.key)).rejects.toThrow();
    await expect(importPhotoKey("not a key")).rejects.toThrow();
  });
});

describe("family pages with photos", () => {
  it("checks a page's photos, and leaves out an empty list", () => {
    const p = newFamilyPage({ kind: "page", title: "Fort", text: "w", byName: "Alex", byBookId: "b", photos: [photo()] });
    expect(isFamilyPage(p)).toBe(true);
    expect("photos" in newFamilyPage({ kind: "page", text: "w", byName: "Alex", byBookId: "b", photos: [] })).toBe(false);
    expect(isFamilyPage({ ...p, photos: [{ id: "x" }] })).toBe(false);
    expect(isFamilyPage({ ...p, photos: [photo(), photo(), photo(), photo(), photo()] })).toBe(false);
  });

  it("keeps them in the account's family book under its own key, opens them, and drops them with the page", async () => {
    const lib = fakeLibrary();
    const source = photo("The fort");
    const copies = await copyPhotos([source], journal(source));
    const page = newFamilyPage({ kind: "page", title: "Fort", text: "We built a fort.", byName: "Alex", byBookId: "b", photos: copies.map((c) => c.photo) });
    await changeFamilyBook(lib.remote, { add: page, photos: copies });
    const [head] = [...lib.heads.values()];
    const entry = head.manifest.photos[0];
    expect(entry.id).toBe(copies[0].photo.id);
    // Stored encrypted: not the JPEG, and only the family book's key opens it.
    const stored = lib.blobs.get(entry.hash)!;
    expect(stored.ciphertext).not.toContain(btoa(String.fromCharCode(0xff, 0xd8, 0xff)));
    const other = await createVault(emptyBook("x"), "another fictional passphrase");
    await expect(decryptPhoto(stored, other.key)).rejects.toThrow();
    const read = await loadFamilyPages(lib.remote);
    expect(read.pages[0].photos).toEqual(copies.map((c) => c.photo));
    expect(await bytes(await read.photo(entry.id))).toEqual(await bytes(copies[0].blob));
    // Opened once, then remembered.
    await read.photo(entry.id);
    expect(lib.calls.photos).toBe(1);

    // Another page keeps this photo without sending it again.
    await changeFamilyBook(lib.remote, { add: newFamilyPage({ kind: "passage", text: "Snow lion cat.", byName: "Alex", byBookId: "b" }) });
    expect(lib.heads.get(head.id)!.manifest.photos).toEqual([entry]);
    // A page's photos must come with it.
    await expect(
      changeFamilyBook(lib.remote, { add: newFamilyPage({ kind: "page", text: "w", byName: "Alex", byBookId: "b", photos: [photo()] }) }),
    ).rejects.toThrow(/photos/);
    // Taking the page out takes its photos out of the family book.
    await changeFamilyBook(lib.remote, { remove: page.id });
    expect(lib.heads.get(head.id)!.manifest.photos).toEqual([]);
    await expect((await loadFamilyPages(lib.remote)).photo(entry.id)).rejects.toThrow();
  });
});

describe("photos sent with a whole entry", () => {
  it("encrypts each photo once, uploads it before the send, and only a chosen person can open it", async () => {
    const r = await relay();
    const source = photo("The fort");
    const copies = await copyPhotos([source], journal(source));
    const id = crypto.randomUUID();
    const sent = await sendToPartners(
      user("me"),
      r.alex.get(),
      r.alex.save,
      { id, title: "Fort", text: "We built a fort." },
      { recipients: ["anna"], audience: "direct", photos: copies, keepPhotoCopies: true },
    );
    expect(sent).toBe(1);
    const actions = r.calls.map((c) => c.action);
    expect(actions.indexOf("photo")).toBeLessThan(actions.indexOf("send"));
    const send = r.calls.find((c) => c.action === "send")!;
    expect(send.photos).toEqual([copies[0].photo.id]);
    // The relay holds ciphertext, never the picture or its key.
    const relayed = r.photos.get(`${id}_${copies[0].photo.id}`)!;
    expect(JSON.stringify(r.calls)).not.toContain(btoa(String.fromCharCode(0xff, 0xd8, 0xff)));
    // Your copy lists the photos, with no key.
    const out = r.alex.get().connections!.outgoing![0];
    expect(out.photos).toEqual([copies[0].photo]);
    expect(JSON.stringify(out)).not.toContain("photoKey");
    expect(isConnections(r.alex.get().connections)).toBe(true);

    // Anna opens her passage, and with the key inside it, the photo.
    const packet = (send.packets as Record<string, Packet>).anna;
    const words = await decryptPassage(packet, r.anna, { id, circleId: "circle", sender: "me" });
    expect(words.photos).toEqual([copies[0].photo]);
    expect(await bytes(await decryptPhoto(relayed, await importPhotoKey(words.photoKey!)))).toEqual(
      await bytes(copies[0].blob),
    );
    // Sam wasn't chosen: no passage of his own, and Alex's key to Anna's packet isn't his.
    await expect(decryptPassage(packet, r.sam, { id, circleId: "circle", sender: "me" })).rejects.toThrow();
  });

  it("a family page's photos go to every partner, and the sender keeps no extra copy", async () => {
    const r = await relay();
    const source = photo();
    const copies = await copyPhotos([source], journal(source));
    await sendToPartners(user("me"), r.alex.get(), r.alex.save, { id: crypto.randomUUID(), title: "t", text: "w" }, { audience: "family", photos: copies });
    expect(r.calls.find((c) => c.action === "send")!.recipients).toEqual(["anna", "sam"]);
    expect(r.calls.filter((c) => c.action === "photo")).toHaveLength(1);
    expect(r.alex.get().connections!.outgoing![0].photos).toBeUndefined();
  });

  it("removes uploaded photos when the send doesn't go", async () => {
    const r = await relay();
    const source = photo();
    const copies = await copyPhotos([source], journal(source));
    r.failNextSend();
    await expect(
      sendToPartners(user("me"), r.alex.get(), r.alex.save, { id: crypto.randomUUID(), title: "t", text: "w" }, { recipients: ["anna"], photos: copies }),
    ).rejects.toThrow(/unavailable/);
    expect(r.calls.at(-1)!.action).toBe("photo-discard");
    expect(r.photos.size).toBe(0);
  });

  it("Keep it brings the photos into the recipient's journal under its own key, and drops the send's key", async () => {
    const r = await relay();
    const source = photo("The fort");
    const copies = await copyPhotos([source], journal(source));
    await sendToPartners(user("me"), r.alex.get(), r.alex.save, { id: crypto.randomUUID(), title: "Fort", text: "We built a fort." }, { recipients: ["anna"], audience: "direct", photos: copies, keepPhotoCopies: true });
    const loaded = await loadCircle(user("anna"), r.annaBook.get());
    const offer = loaded!.incoming[0];
    expect(offer.photos).toEqual([copies[0].photo]);
    // Shown while it waits, opened on Anna's device.
    expect(await bytes((await openIncomingPhoto(user("anna"), offer, copies[0].photo.id))!)).toEqual(await bytes(copies[0].blob));
    await expect(openIncomingPhoto(user("anna"), offer, crypto.randomUUID())).rejects.toThrow(/isn’t part/);

    const annas = journal();
    await keepIncoming(user("anna"), r.annaBook.get(), r.annaBook.save, offer, annas.store);
    expect(await bytes(annas.kept.get(copies[0].photo.id)!)).toEqual(await bytes(copies[0].blob));
    const kept = r.annaBook.get().connections!.received[0];
    expect(kept.photos).toEqual([copies[0].photo]);
    expect(JSON.stringify(kept)).not.toContain("photoKey");
    expect(isConnections(r.annaBook.get().connections)).toBe(true);
    expect(photoIds(r.annaBook.get())).toEqual([copies[0].photo.id]);
    expect(r.calls.at(-1)).toMatchObject({ action: "receipt", status: "accepted" });
  });

  it("keeps the words when the relay no longer has a photo", async () => {
    const r = await relay();
    const source = photo();
    const copies = await copyPhotos([source], journal(source));
    await sendToPartners(user("me"), r.alex.get(), r.alex.save, { id: crypto.randomUUID(), title: "t", text: "words" }, { recipients: ["anna"], photos: copies });
    r.photos.clear();
    const offer = (await loadCircle(user("anna"), r.annaBook.get()))!.incoming[0];
    const store = vi.fn();
    await keepIncoming(user("anna"), r.annaBook.get(), r.annaBook.save, offer, store);
    expect(store).not.toHaveBeenCalled();
    expect(r.annaBook.get().connections!.received[0]).toMatchObject({ text: "words" });
    expect(r.annaBook.get().connections!.received[0].photos).toBeUndefined();
  });

  it("refuses a passage that claims photos without their key, or a key without photos", async () => {
    const anna = await makeIdentity("anna");
    const to = await member(anna, "Anna");
    const { raw } = await newPhotoKey();
    await expect(encryptPassage({ title: "t", text: "w", photos: [photo()] }, to, "x", "c", "me")).rejects.toThrow(/photos/);
    await expect(encryptPassage({ title: "t", text: "w", photoKey: raw }, to, "x", "c", "me")).rejects.toThrow(/photos/);
    // keepReceived keeps photos only when they were kept, and never the key.
    const offer = { id: "o", sender: "me", senderName: "Alex", createdAt: "2026-11-23T09:00:00Z", title: "t", text: "w", photos: [photo()], photoKey: raw };
    const kept = keepReceived(undefined, offer).received[0];
    expect(kept.photos).toBeUndefined();
    expect("photoKey" in kept).toBe(false);
  });
});

describe("the relay's rules", () => {
  it("names up to four distinct photo ids, and lets photos go once nobody is deciding", () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    expect(sentPhotoIds(undefined)).toEqual([]);
    expect(sentPhotoIds(ids)).toEqual(ids);
    expect(sentPhotoIds([ids[0], ids[0]])).toBeNull();
    expect(sentPhotoIds(["../x"])).toBeNull();
    expect(sentPhotoIds(Array.from({ length: 5 }, () => crypto.randomUUID()))).toBeNull();
    expect(photosDone({ anna: "accepted", sam: "pending" })).toBe(false);
    expect(photosDone({ anna: "accepted", sam: "declined" })).toBe(true);
  });
});

describe("where shared photos show", () => {
  it("on a line kept, a line you sent, and your entry once its photos went with it", () => {
    const [entryPhoto, sentPhoto, keptPhoto] = [photo(), photo(), photo()];
    const book: Book = {
      ...emptyBook("Alex"),
      journal: [
        { id: "j", title: "Fort", text: "We built a fort.", style: "sky", status: "kept", revision: 1, createdAt: "2026-11-23T09:00:00Z", updatedAt: "2026-11-23T09:00:00Z", photos: [entryPhoto] },
        { id: "k", title: "Quiet", text: "Just words.", style: "sky", status: "kept", revision: 1, createdAt: "2026-11-22T09:00:00Z", updatedAt: "2026-11-22T09:00:00Z", photos: [photo()] },
      ],
      connections: {
        received: [{ id: "r", title: "Pool", text: "Cold hug.", from: "anna", fromName: "Anna", createdAt: "2026-11-23T08:00:00Z", acceptedAt: "2026-11-23T08:00:00Z", audience: "direct", photos: [keptPhoto] }],
        outgoing: [
          { id: "o", circleId: "c", title: "Fort", text: "We built a fort.", recipients: ["anna"], recipientNames: ["Anna"], packets: {}, createdAt: "2026-11-23T09:10:00Z", sent: true, audience: "direct", sourceId: "j", photos: [sentPhoto] },
          { id: "p", circleId: "c", title: "Fort", text: "Only part of it.", recipients: ["anna"], recipientNames: ["Anna"], packets: {}, createdAt: "2026-11-23T09:20:00Z", sent: true, audience: "direct", sourceId: "j", photos: [sentPhoto] },
        ],
      },
    };
    const items = journalStream(book);
    const of = (key: string) => items.find((i) => i.key === key);
    expect(of("passage:r")?.photos).toEqual([keptPhoto]);
    expect(of("sent:p")?.photos).toEqual([sentPhoto]);
    expect(of("journal:j")?.photos).toEqual([entryPhoto]);
    expect(of("journal:j")?.shared).toMatchObject({ pageTo: ["Anna"], photos: true });
    // An entry whose photos stayed private shows none on its card.
    expect(of("journal:k")?.photos).toBeUndefined();
  });
});
