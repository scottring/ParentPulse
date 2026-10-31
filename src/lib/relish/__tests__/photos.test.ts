import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook } from "../model";
import { createVault, unlockVault, parseEnvelope } from "../vault";
import {
  encryptPhoto,
  decryptPhoto,
  putPhoto,
  getPhoto,
  backupPhotos,
  restorePhotos,
  removePhotos,
} from "../photos";
import { newJournalDraft, writeJournalPage } from "../journal";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
const jpeg = new Blob(
  [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6])],
  { type: "image/jpeg" },
);
describe("encrypted photo storage", () => {
  it("binds each photo to its book key and id, and encrypts fresh copies differently", async () => {
    const a = await createVault(emptyBook("A"), "fictional passphrase A"),
      b = await createVault(emptyBook("B"), "fictional passphrase B");
    const id = crypto.randomUUID(),
      encrypted = await encryptPhoto(id, jpeg, a.key);
    expect(await (await decryptPhoto(encrypted, a.key)).arrayBuffer()).toEqual(
      await jpeg.arrayBuffer(),
    );
    await expect(decryptPhoto(encrypted, b.key)).rejects.toThrow();
    await expect(
      decryptPhoto({ ...encrypted, id: crypto.randomUUID() }, a.key),
    ).rejects.toThrow();
    expect((await encryptPhoto(id, jpeg, a.key)).iv).not.toBe(encrypted.iv);
  });
  it("isolates editions and restores authenticated photos with an encrypted backup", async () => {
    const photo = {
      id: crypto.randomUUID(),
      width: 500,
      height: 300,
      caption: "PRIVATE CAPTION",
    };
    const book = writeJournalPage(
      emptyBook("A"),
      { ...newJournalDraft(), photos: [photo] },
      0,
      "kept",
    );
    const { key, envelope } = await createVault(
      book,
      "fictional photo passphrase",
    );
    await putPhoto("source", await encryptPhoto(photo.id, jpeg, key));
    await expect(getPhoto("other", photo.id)).rejects.toThrow("missing");
    const media = await backupPhotos(book, "source"),
      raw = JSON.stringify({ ...envelope, media });
    expect(raw).not.toContain("PRIVATE CAPTION");
    expect(parseEnvelope(raw)).not.toHaveProperty("media");
    const restored = await unlockVault(raw, "fictional photo passphrase");
    await restorePhotos(raw, restored.book, restored.key, "restored");
    expect(
      await (
        await decryptPhoto(await getPhoto("restored", photo.id), restored.key)
      ).arrayBuffer(),
    ).toEqual(await jpeg.arrayBuffer());
    await removePhotos("restored");
    await expect(getPhoto("restored", photo.id)).rejects.toThrow();
    expect(await getPhoto("source", photo.id)).toBeTruthy();
  });
  it("rejects missing, extra or tampered photo data before writing restored media", async () => {
    const photo = { id: crypto.randomUUID(), width: 1, height: 1, caption: "" };
    const book = writeJournalPage(
      emptyBook("A"),
      { ...newJournalDraft(), photos: [photo] },
      0,
      "kept",
    );
    const { key, envelope } = await createVault(
      book,
      "fictional photo passphrase",
    );
    const media = await encryptPhoto(photo.id, jpeg, key);
    await expect(
      restorePhotos(JSON.stringify(envelope), book, key, "bad"),
    ).rejects.toThrow("missing");
    await expect(
      restorePhotos(
        JSON.stringify({ ...envelope, media: [media, media] }),
        book,
        key,
        "bad",
      ),
    ).rejects.toThrow();
    const bytes = Buffer.from(media.ciphertext, "base64");
    bytes[0] ^= 0xff;
    await expect(
      restorePhotos(
        JSON.stringify({
          ...envelope,
          media: [{ ...media, ciphertext: bytes.toString("base64") }],
        }),
        book,
        key,
        "bad",
      ),
    ).rejects.toThrow();
    await expect(getPhoto("bad", photo.id)).rejects.toThrow();
  });
});
