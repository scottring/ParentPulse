import { it, expect, vi, afterEach } from "vitest";
import type { User } from "firebase/auth";
import { createVault, unlockVault } from "../vault";
import { emptyBook } from "../model";
import { newJournalDraft, writeJournalPage } from "../journal";
import { encryptPhoto, decryptPhoto } from "../photos";
import {
  hashSync,
  validManifest,
  validSyncBlob,
  type SyncBlob,
  type SyncedEdition,
} from "../book-sync";
import { uploadBook, downloadBook } from "../book-sync-client";
const user = { getIdToken: async () => "fictional-test-token" } as User;
afterEach(() => vi.unstubAllGlobals());
it("round-trips a real encrypted book and photo without transmitting passphrases or writing", async () => {
  const words = "This private thought must never be uploaded in plaintext.";
  const book = writeJournalPage(
    emptyBook("Fictional owner"),
    { ...newJournalDraft(), text: words },
    0,
    "kept",
  );
  const vault = await createVault(book, "only a fictional book passphrase");
  const photo = await encryptPhoto(
    crypto.randomUUID(),
    new Blob([new Uint8Array([255, 216, 255, 10])], { type: "image/jpeg" }),
    vault.key,
  );
  const blobs = new Map<string, SyncBlob>();
  let sent = "";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      sent += init.body;
      const data = JSON.parse(init.body);
      if (data.action === "put") {
        expect(validSyncBlob(data.blob)).toBe(true);
        const hash = await hashSync(data.blob);
        blobs.set(hash, data.blob);
        return Response.json({ hash });
      }
      if (data.action === "get")
        return Response.json({ blob: blobs.get(data.hash) });
      expect(validManifest(data.manifest)).toBe(true);
      return Response.json({
        book: {
          id: data.id,
          label: data.label,
          revision: crypto.randomUUID(),
          updatedAt: Date.now(),
          manifest: data.manifest,
        },
      });
    }),
  );
  const head = await uploadBook(
    user,
    { envelope: vault.envelope, media: [photo], label: book.owner },
    crypto.randomUUID(),
    null,
    new AbortController().signal,
  );
  const raw = await downloadBook(user, head, new AbortController().signal);
  expect(
    (await unlockVault(raw, "only a fictional book passphrase")).book,
  ).toEqual(book);
  expect(
    await (
      await decryptPhoto(JSON.parse(raw).media[0], vault.key)
    ).arrayBuffer(),
  ).toEqual(
    await new Blob([new Uint8Array([255, 216, 255, 10])]).arrayBuffer(),
  );
  expect(sent).not.toContain(words);
  expect(sent).not.toContain("fictional book passphrase");
});
it("splits large ciphertext below function/document limits and rejects tampered downloads", async () => {
  const vault = await createVault(
    emptyBook("Test"),
    "fictional passphrase only",
  );
  vault.envelope.ciphertext = "A".repeat(900004);
  const sizes: number[] = [];
  const blobs = new Map<string, SyncBlob>();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const d = JSON.parse(init.body);
      if (d.action === "put") {
        sizes.push(init.body.length);
        const hash = await hashSync(d.blob);
        blobs.set(hash, d.blob);
        return Response.json({ hash });
      }
      if (d.action === "get")
        return Response.json({ blob: { kind: "text", data: "BBBB" } });
      return Response.json({
        book: {
          id: d.id,
          label: d.label,
          revision: crypto.randomUUID(),
          updatedAt: Date.now(),
          manifest: d.manifest,
        },
      });
    }),
  );
  const head = await uploadBook(
    user,
    { envelope: vault.envelope, media: [], label: "Test" },
    crypto.randomUUID(),
    null,
    new AbortController().signal,
  );
  expect(sizes).toHaveLength(3);
  expect(Math.max(...sizes)).toBeLessThan(600000);
  await expect(
    downloadBook(user, head as SyncedEdition, new AbortController().signal),
  ).rejects.toThrow("verified");
});
it("rejects plaintext fields and malformed manifests", async () => {
  expect(
    validSyncBlob({ kind: "text", data: "AAAA", passphrase: "secret" }),
  ).toBe(false);
  expect(validSyncBlob({ kind: "text", data: "plain words" })).toBe(false);
  expect(
    validManifest({
      envelope: { parts: [] },
      photos: [],
      fingerprint: "a".repeat(64),
    }),
  ).toBe(false);
});
