// @vitest-environment node
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook } from "../model";
import { createVault, unlockVault, seal, parseEnvelope } from "../vault";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
const pass = "a long test-only passphrase";
describe("encrypted relationship book", () => {
  it("round trips a book without exposing personal text or the passphrase", async () => {
    const book = emptyBook("Private Person");
    book.people.push({
      id: "1",
      name: "Secret Name",
      role: "Friend",
      color: "sage",
      note: "A private memory",
      lessons: [],
    });
    const { envelope } = await createVault(book, pass);
    const raw = JSON.stringify(envelope);
    expect(raw).not.toContain("Secret Name");
    expect(raw).not.toContain(pass);
    expect(raw).not.toContain("Private Person");
    expect((await unlockVault(raw, pass)).book).toEqual(book);
  });
  it("rejects an incorrect passphrase", async () => {
    const { envelope } = await createVault(emptyBook("Alex"), pass);
    await expect(
      unlockVault(JSON.stringify(envelope), "wrong passphrase"),
    ).rejects.toThrow("didn’t unlock");
  });
  it("detects modified ciphertext", async () => {
    const { envelope } = await createVault(emptyBook("Alex"), pass);
    const bytes = Buffer.from(envelope.ciphertext, "base64");
    bytes[2] ^= 255;
    envelope.ciphertext = bytes.toString("base64");
    await expect(unlockVault(JSON.stringify(envelope), pass)).rejects.toThrow();
  });
  it("uses fresh nonces for each save and non-exportable encryption keys", async () => {
    const book = emptyBook("Alex");
    const { key, envelope } = await createVault(book, pass);
    const next = await seal(book, key, envelope.salt);
    expect(key.extractable).toBe(false);
    expect(next.iv).not.toBe(envelope.iv);
    expect(next.ciphertext).not.toBe(envelope.ciphertext);
    expect((await unlockVault(JSON.stringify(next), pass)).book).toEqual(book);
  });
  it("rejects short passphrases and invalid backup parameters", async () => {
    await expect(createVault(emptyBook("Alex"), "short")).rejects.toThrow("12");
    expect(() => parseEnvelope('{"version":2}')).toThrow();
    expect(() => parseEnvelope('{"version":1,"iterations":1}')).toThrow();
  });
  it("validates decrypted structure before treating a backup as a book", async () => {
    const result = await createVault(
      { version: 1, owner: "Alex", people: [{}], moments: [] } as never,
      pass,
    );
    await expect(
      unlockVault(JSON.stringify(result.envelope), pass),
    ).rejects.toThrow("could not be read");
  });
});
