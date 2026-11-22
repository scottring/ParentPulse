import { afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import type { User } from "firebase/auth";
import { emptyBook, type Book } from "../model";
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
import { chooseRecipients, keepIncoming, loadCircle, sendToPartners } from "../partner-share";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
afterEach(() => vi.unstubAllGlobals());

const member = async (identity: Identity, name: string) => ({
  uid: identity.uid,
  name,
  publicKey: identity.publicKey,
  keyId: await keyFingerprint(identity.publicKey),
});
const user = (uid: string) =>
  ({ uid, emailVerified: true, getIdToken: async () => "test-token" }) as unknown as User;

/** Three grown-ups in one circle; `me` sends. Fetch answers like the connections API. */
async function circle() {
  const me = await makeIdentity("me"),
    anna = await makeIdentity("anna"),
    sam = await makeIdentity("sam");
  const members = [await member(me, "Alex"), await member(anna, "Anna"), await member(sam, "Sam")];
  const calls: Record<string, unknown>[] = [];
  let deliveries: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      const result =
        body.action === "list"
          ? { profile: members[0], circle: { id: "circle", name: "Us", ownerId: "me", members }, deliveries }
          : { ok: true };
      return { ok: true, json: async () => result } as Response;
    }),
  );
  let book: Book = {
    ...emptyBook("Alex"),
    profile: { kind: "adult" },
    connections: { identity: me, received: [] },
  };
  const save = async (change: (b: Book) => Book) => {
    book = change(book);
  };
  return {
    me,
    anna,
    sam,
    members,
    calls,
    save,
    book: () => book,
    setDeliveries: (d: unknown[]) => (deliveries = d),
  };
}

describe("sending a line to chosen people", () => {
  it("chooses everyone else, or only the people chosen, and refuses someone who left", async () => {
    const { members } = await circle();
    expect(chooseRecipients(members, "me").map((m) => m.name)).toEqual(["Anna", "Sam"]);
    expect(chooseRecipients(members, "me", ["anna"]).map((m) => m.name)).toEqual(["Anna"]);
    expect(() => chooseRecipients(members, "me", ["anna", "gone"])).toThrow(/isn’t connected/);
  });

  it("encrypts only for the chosen person and keeps a direct copy with their name", async () => {
    const c = await circle();
    const sent = await sendToPartners(
      user("me"),
      c.book(),
      c.save,
      { id: crypto.randomUUID(), title: "The pool", text: "Like being inside a cold hug." },
      { recipients: ["anna"], audience: "direct", note: "You saw it too.", caption: "Leo, at the pool", sourceId: "entry-1" },
    );
    expect(sent).toBe(1);
    const send = c.calls.find((x) => x.action === "send")!;
    expect(send.recipients).toEqual(["anna"]);
    expect(Object.keys(send.packets as object)).toEqual(["anna"]);
    const out = c.book().connections!.outgoing![0];
    expect(out).toMatchObject({ recipients: ["anna"], recipientNames: ["Anna"], audience: "direct", sent: true, packets: {}, sourceId: "entry-1", note: "You saw it too." });
    expect(isConnections(c.book().connections)).toBe(true);
    // Anna opens exactly the words, the note and the caption; Sam can't.
    const packet = (send.packets as Record<string, Packet>).anna;
    const delivery = { id: send.id as string, circleId: "circle", sender: "me" };
    expect(await decryptPassage(packet, c.anna, delivery)).toEqual({
      title: "The pool",
      text: "Like being inside a cold hug.",
      note: "You saw it too.",
      caption: "Leo, at the pool",
      audience: "direct",
    });
    await expect(decryptPassage(packet, c.sam, delivery)).rejects.toThrow();
  });

  it("without a subset, a family page still goes to every partner", async () => {
    const c = await circle();
    expect(await sendToPartners(user("me"), c.book(), c.save, { id: crypto.randomUUID(), title: "t", text: "words" }, { audience: "family" })).toBe(2);
    expect(c.calls.find((x) => x.action === "send")!.recipients).toEqual(["anna", "sam"]);
  });

  it("opens what's waiting, then Keep it saves it and records the receipt", async () => {
    const c = await circle();
    const id = crypto.randomUUID();
    const mine = c.members[0];
    const packet = await encryptPassage({ title: "At the pool", text: "You stayed so calm.", audience: "direct" }, mine, id, "circle", "anna");
    c.setDeliveries([
      { id, circleId: "circle", sender: "anna", senderName: "Anna", createdAt: "2026-11-22T18:00:00Z", recipients: ["me"], receipts: { me: "pending" }, packet, revoked: false },
      { id: crypto.randomUUID(), circleId: "circle", sender: "anna", senderName: "Anna", createdAt: "2026-11-21T18:00:00Z", recipients: ["me"], receipts: { me: "declined" }, revoked: false },
    ]);
    const loaded = await loadCircle(user("me"), c.book());
    expect(loaded?.recipients).toEqual([{ uid: "anna", name: "Anna" }, { uid: "sam", name: "Sam" }]);
    expect(loaded?.incoming).toEqual([
      { id, sender: "anna", senderName: "Anna", createdAt: "2026-11-22T18:00:00Z", title: "At the pool", text: "You stayed so calm.", audience: "direct" },
    ]);
    await keepIncoming(user("me"), c.book(), c.save, loaded!.incoming[0]);
    expect(c.book().connections!.received).toEqual([
      expect.objectContaining({ id, from: "anna", fromName: "Anna", text: "You stayed so calm.", audience: "direct" }),
    ]);
    expect(c.calls.at(-1)).toEqual({ action: "receipt", id, status: "accepted" });
    // Kept once, however often it's kept.
    expect(keepReceived(c.book().connections, loaded!.incoming[0]).received).toHaveLength(1);
  });

  it("does nothing for a journal that isn't the signed-in account's", async () => {
    const c = await circle();
    expect(await sendToPartners(user("someone-else"), c.book(), c.save, { id: "x", title: "t", text: "w" }, { recipients: ["anna"] })).toBe(0);
    expect(await loadCircle(null, c.book())).toBeNull();
    expect(c.calls).toEqual([]);
  });
});
