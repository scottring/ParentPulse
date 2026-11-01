// @vitest-environment happy-dom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { Window } from "happy-dom";
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});
import { useLocalBook } from "../useLocalBook";
import { VAULT_KEY } from "@/lib/relish/vault";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
// Model one origin-wide exclusive lock shared by the two simulated tabs.
let browserWrites = Promise.resolve();
Object.defineProperty(navigator, "locks", {
  configurable: true,
  value: {
    request: (
      _name: string,
      _options: unknown,
      operation: () => Promise<unknown>,
    ) => {
      const next = browserWrites.catch(() => {}).then(operation);
      browserWrites = next.then(
        () => {},
        () => {},
      );
      return next;
    },
  },
});
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("local book lifecycle", () => {
  it("keeps sample edits out of storage and creates a genuinely empty private book", async () => {
    const { result } = renderHook(useLocalBook);
    expect(result.current.mode).toBe("sample");
    await act(async () => {
      await result.current.save({ ...result.current.book, owner: "Demo edit" });
    });
    expect(localStorage.length).toBe(0);
    await act(async () => {
      await result.current.open("test-only long passphrase", "Private Owner");
    });
    expect(result.current.mode).toBe("open");
    expect(result.current.book.people).toEqual([]);
    expect(localStorage.getItem(VAULT_KEY)).not.toContain("Private Owner");
  });
  it("restores encrypted writes, rejects wrong passwords, and clears decrypted state on lock", async () => {
    const first = renderHook(useLocalBook);
    await act(async () => {
      await first.result.current.open(
        "test-only long passphrase",
        "Private Owner",
      );
    });
    await act(async () => {
      await first.result.current.save({
        ...first.result.current.book,
        owner: "Updated Owner",
      });
    });
    act(() => first.result.current.lock());
    expect(first.result.current.book.owner).toBe("");
    expect(first.result.current.mode).toBe("locked");
    await act(async () => {
      await first.result.current.open("wrong password");
    });
    expect(first.result.current.mode).toBe("locked");
    expect(first.result.current.error).toContain("didn’t unlock");
    await act(async () => {
      await first.result.current.open("test-only long passphrase");
    });
    expect(first.result.current.book.owner).toBe("Updated Owner");
    first.unmount();
    const second = renderHook(useLocalBook);
    expect(second.result.current.mode).toBe("locked");
    expect(second.result.current.book.owner).not.toBe("Updated Owner");
  });
  it("locks after inactivity and when another tab changes the vault", async () => {
    const { result } = renderHook(useLocalBook);
    await act(async () => {
      await result.current.open("test-only long passphrase", "Alex");
    });
    act(() =>
      window.dispatchEvent(new StorageEvent("storage", { key: VAULT_KEY })),
    );
    expect(result.current.mode).toBe("locked");
    vi.useFakeTimers();
    await act(async () => {
      await result.current.open("test-only long passphrase");
    });
    act(() => vi.advanceTimersByTime(600001));
    expect(result.current.mode).toBe("locked");
    expect(result.current.book.people).toEqual([]);
  });
});

describe("serialized encrypted updates", () => {
  it("keeps both changes when saves overlap", async () => {
    const { result } = renderHook(useLocalBook);
    await act(async () => {
      await result.current.open("test-only long passphrase", "Alex");
    });
    await act(async () => {
      await Promise.all([
        result.current.save((b) => ({ ...b, owner: "New Owner" })),
        result.current.save((b) => ({
          ...b,
          people: [
            {
              id: "p",
              name: "A person",
              role: "Friend",
              color: "sage",
              note: "",
              lessons: [],
            },
          ],
        })),
      ]);
    });
    act(() => result.current.lock());
    await act(async () => {
      await result.current.open("test-only long passphrase");
    });
    expect(result.current.book.owner).toBe("New Owner");
    expect(result.current.book.people[0].name).toBe("A person");
  });
  it("does not claim a saved change after storage fails, and allows retry", async () => {
    const { result } = renderHook(useLocalBook);
    await act(async () => {
      await result.current.open("test-only long passphrase", "Alex");
    });
    const write = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("Storage is full");
    });
    await act(async () => {
      await expect(
        result.current.save((b) => ({ ...b, owner: "Unsaved" })),
      ).rejects.toThrow();
    });
    expect(result.current.book.owner).toBe("Alex");
    write.mockRestore();
    await act(async () => {
      await result.current.save((b) => ({ ...b, owner: "Retry saved" }));
    });
    expect(result.current.book.owner).toBe("Retry saved");
  });
  it("clears decrypted data when all browser storage is cleared", async () => {
    const { result } = renderHook(useLocalBook);
    await act(async () => {
      await result.current.open("test-only long passphrase", "Alex");
    });
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
    expect(result.current.mode).toBe("locked");
    expect(result.current.book.owner).toBe("");
  });
});

it("rejects a stale tab instead of letting two tabs overwrite each other", async () => {
  const first = renderHook(useLocalBook);
  await act(async () => {
    await first.result.current.open("test-only long passphrase", "Initial");
  });
  const second = renderHook(useLocalBook);
  await act(async () => {
    await second.result.current.open("test-only long passphrase");
  });
  let results: PromiseSettledResult<void>[] = [];
  await act(async () => {
    results = await Promise.allSettled([
      first.result.current.save((b) => ({ ...b, owner: "First writer" })),
      second.result.current.save((b) => ({ ...b, owner: "Stale writer" })),
    ]);
  });
  expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
  expect(second.result.current.mode).toBe("locked");
  await act(async () => {
    await second.result.current.open("test-only long passphrase");
  });
  expect(second.result.current.book.owner).toBe("First writer");
});

it("keeps editions separately locked and never lets a switch save into the next book", async () => {
  const { result } = renderHook(useLocalBook);
  await act(async () => {
    await result.current.open("first edition secret", "Fictional First");
  });
  const first = result.current.editionId;
  act(() => result.current.select());
  expect(result.current.book.owner).toBe("");
  expect(result.current.mode).toBe("new");
  await act(async () => {
    await result.current.open("second edition secret", "Fictional Second");
  });
  const second = result.current.editionId;
  expect(first).not.toBe(second);
  expect(result.current.editions).toHaveLength(2);
  act(() => result.current.select(first));
  await act(async () => {
    await result.current.open("second edition secret");
  });
  expect(result.current.mode).toBe("locked");
  await act(async () => {
    await result.current.open("first edition secret");
  });
  expect(result.current.book.owner).toBe("Fictional First");
  let pending: Promise<void>;
  act(() => {
    pending = result.current.save((b) => ({
      ...b,
      owner: "Should never overwrite",
    }));
    result.current.select(second);
  });
  await act(async () => {
    await expect(pending!).rejects.toThrow();
  });
  await act(async () => {
    await result.current.open("second edition secret");
  });
  expect(result.current.book.owner).toBe("Fictional Second");
});

it("removes only the unlocked edition after an exact confirmation", async () => {
  const { result } = renderHook(useLocalBook);
  await act(async () => {
    await result.current.open("first test passphrase", "First");
  });
  const original = localStorage.getItem(VAULT_KEY);
  act(() => result.current.select());
  await act(async () => {
    await result.current.open("second test passphrase", "Second");
  });
  await act(async () => {
    await expect(result.current.remove("First")).rejects.toThrow("exactly");
  });
  expect(result.current.editions).toHaveLength(2);
  await act(async () => {
    await result.current.remove("Second");
  });
  expect(result.current.mode).toBe("shelf");
  expect(result.current.book.owner).toBe("");
  expect(result.current.editions).toHaveLength(1);
  expect(localStorage.getItem(VAULT_KEY)).toBe(original);
});

it("opens a child's synced edition on a fresh device and preserves offline edits on reopen", async () => {
  const { createVault, seal } = await import("@/lib/relish/vault");
  const { emptyBook } = await import("@/lib/relish/model");
  const { hashSync, readBinding } = await import("@/lib/relish/book-sync");
  const book = {
    ...emptyBook("Fictional child"),
    profile: {
      kind: "child" as const,
      ageBand: "9-12" as const,
      parentLock: { salt: "a".repeat(32), verifier: "b".repeat(64) },
    },
  };
  const encrypted = await createVault(book, "fictional child passphrase");
  const head = {
    id: crypto.randomUUID(),
    label: book.owner,
    revision: crypto.randomUUID(),
    updatedAt: Date.now(),
    manifest: {
      envelope: {
        version: 1 as const,
        salt: encrypted.envelope.salt,
        iv: encrypted.envelope.iv,
        iterations: 600000,
        parts: [],
      },
      photos: [],
      fingerprint: await hashSync(encrypted.envelope),
    },
  };
  const { result } = renderHook(useLocalBook);
  await act(async () => {
    await result.current.openSynced(
      JSON.stringify(encrypted.envelope),
      "fictional child passphrase",
      head,
      "parent-account",
    );
  });
  expect(result.current.book.profile).toEqual(book.profile);
  expect(readBinding(result.current.editionId)?.uid).toBe("parent-account");
  const id = result.current.editionId;
  await act(async () => {
    await result.current.save((b) => ({
      ...b,
      owner: "Offline device edit",
    }));
  });
  act(() => result.current.lock());
  const remote = await seal(
    { ...book, owner: "Another device edit" },
    encrypted.key,
    encrypted.envelope.salt,
  );
  const remoteHead = {
    ...head,
    revision: crypto.randomUUID(),
    manifest: { ...head.manifest, fingerprint: await hashSync(remote) },
  };
  await act(async () => {
    await result.current.openSynced(
      JSON.stringify(remote),
      "fictional child passphrase",
      remoteHead,
      "parent-account",
    );
  });
  expect(result.current.editionId).toBe(id);
  expect(result.current.book.owner).toBe("Offline device edit");
  expect(readBinding(id)?.revision).toBe(head.revision);
});

it("keeps a complete separate device copy before resolving two divergent versions", async () => {
  const { seal, unlockVault } = await import("@/lib/relish/vault");
  const { hashSync, writeBinding } = await import("@/lib/relish/book-sync");
  const { editionKey, listEditions } = await import("@/lib/relish/editions");
  const { result } = renderHook(useLocalBook);
  await act(async () => {
    await result.current.open(
      "fictional conflict passphrase",
      "Fictional adult",
    );
  });
  const initial = await result.current.syncSnapshot();
  const binding = {
    uid: "adult-account",
    remoteId: crypto.randomUUID(),
    revision: crypto.randomUUID(),
    fingerprint: await hashSync(initial.envelope),
  };
  writeBinding(result.current.editionId, binding);
  const unlocked = await unlockVault(
    JSON.stringify(initial.envelope),
    "fictional conflict passphrase",
  );
  const remote = await seal(
    { ...unlocked.book, owner: "Remote kept words" },
    unlocked.key,
    initial.envelope.salt,
  );
  const head = {
    id: binding.remoteId,
    label: "Fictional adult",
    revision: crypto.randomUUID(),
    updatedAt: Date.now(),
    manifest: {
      envelope: {
        version: 1 as const,
        salt: remote.salt,
        iv: remote.iv,
        iterations: 600000,
        parts: [],
      },
      photos: [],
      fingerprint: await hashSync(remote),
    },
  };
  await act(async () => {
    await result.current.save((b) => ({
      ...b,
      owner: "Device kept words",
    }));
  });
  const local = await result.current.syncSnapshot(),
    expected = await hashSync(local.envelope);
  await expect(
    result.current.receiveSynced(
      JSON.stringify(remote),
      head,
      binding.uid,
      expected,
    ),
  ).rejects.toThrow("Keep both");
  await expect(
    result.current.receiveSynced(
      JSON.stringify(remote),
      head,
      binding.uid,
      expected,
      true,
      undefined,
      () => false,
    ),
  ).rejects.toThrow("Finish this activity");
  expect(result.current.book.owner).toBe("Device kept words");
  await act(async () => {
    await result.current.receiveSynced(
      JSON.stringify(remote),
      head,
      binding.uid,
      expected,
      true,
    );
  });
  expect(result.current.book.owner).toBe("Remote kept words");
  const copy = listEditions().find((e) => e.id !== result.current.editionId)!;
  expect(copy.label).toContain("device copy");
  expect(
    (
      await unlockVault(
        localStorage.getItem(editionKey(copy.id))!,
        "fictional conflict passphrase",
      )
    ).book.owner,
  ).toBe("Device kept words");
  act(() => result.current.lock());
  await expect(result.current.syncSnapshot()).rejects.toThrow("Unlock");
});

it("does not open downloaded private writing after a sync operation is cancelled", async () => {
  const { createVault } = await import("@/lib/relish/vault");
  const { emptyBook } = await import("@/lib/relish/model");
  const { hashSync } = await import("@/lib/relish/book-sync");
  const encrypted = await createVault(
    emptyBook("Cancelled download"),
    "fictional cancelled passphrase",
  );
  const head = {
    id: crypto.randomUUID(),
    label: "Cancelled",
    revision: crypto.randomUUID(),
    updatedAt: Date.now(),
    manifest: {
      envelope: {
        version: 1 as const,
        salt: encrypted.envelope.salt,
        iv: encrypted.envelope.iv,
        iterations: 600000,
        parts: [],
      },
      photos: [],
      fingerprint: await hashSync(encrypted.envelope),
    },
  };
  const { result } = renderHook(useLocalBook);
  const controller = new AbortController();
  let task: Promise<void>;
  await act(async () => {
    task = result.current.openSynced(
      JSON.stringify(encrypted.envelope),
      "fictional cancelled passphrase",
      head,
      "adult",
      controller.signal,
    );
    controller.abort();
    await expect(task).rejects.toThrow();
  });
  expect(result.current.mode).toBe("sample");
  expect(localStorage.length).toBe(0);
});

it("copies a child book to its parent account without changing the local original", async () => {
  const { unlockVault } = await import("@/lib/relish/vault");
  const { result } = renderHook(useLocalBook);
  await act(async () => {
    await result.current.open("original local book password", "Robin");
  });
  await act(async () => {
    await result.current.save((b) => ({
      ...b,
      profile: {
        kind: "child",
        ageBand: "9-12",
        parentLock: { salt: "a".repeat(32), verifier: "b".repeat(64) },
      },
    }));
  });
  const before = localStorage.getItem(VAULT_KEY);
  const snapshot = await result.current.accountSnapshot(
    "a".repeat(64),
    "parent-one",
  );
  const account = await unlockVault(
    JSON.stringify(snapshot.envelope),
    "a".repeat(64),
  );
  expect(account.book.profile).toEqual({
    kind: "child",
    ageBand: "9-12",
    parentLock: { accountUid: "parent-one" },
  });
  expect(account.book.owner).toBe("Robin");
  expect(localStorage.getItem(VAULT_KEY)).toBe(before);
  const original = await unlockVault(before!, "original local book password");
  expect(original.book.profile).not.toEqual(account.book.profile);
});

it("re-encrypts photos with an account copy and leaves the original photo readable", async () => {
  const { encryptPhoto, decryptPhoto, putPhoto, getPhoto } =
    await import("@/lib/relish/photos");
  const { unlockVault } = await import("@/lib/relish/vault");
  const { newJournalDraft, writeJournalPage } =
    await import("@/lib/relish/journal");
  const { result } = renderHook(useLocalBook);
  await act(async () => {
    await result.current.open("original photo book password", "River");
  });
  const original = await unlockVault(
    localStorage.getItem(VAULT_KEY)!,
    "original photo book password",
  );
  const id = crypto.randomUUID(),
    blob = new Blob([new Uint8Array([255, 216, 255, 224, 1, 2, 3])], {
      type: "image/jpeg",
    });
  await putPhoto(
    result.current.editionId,
    await encryptPhoto(id, blob, original.key),
  );
  await act(async () => {
    await result.current.save((b) =>
      writeJournalPage(
        b,
        {
          ...newJournalDraft(),
          text: "My fictional photo",
          photos: [{ id, width: 1, height: 1, caption: "A keepsake" }],
        },
        0,
        "kept",
      ),
    );
  });
  const snapshot = await result.current.accountSnapshot(
    "c".repeat(64),
    "parent-one",
  );
  const next = await unlockVault(
    JSON.stringify(snapshot.envelope),
    "c".repeat(64),
  );
  expect(snapshot.media).toHaveLength(1);
  expect(
    new Uint8Array(
      await (await decryptPhoto(snapshot.media[0], next.key)).arrayBuffer(),
    ),
  ).toEqual(new Uint8Array(await blob.arrayBuffer()));
  await expect(decryptPhoto(snapshot.media[0], original.key)).rejects.toThrow();
  expect(
    (
      await decryptPhoto(
        await getPhoto(result.current.editionId, id),
        original.key,
      )
    ).size,
  ).toBe(blob.size);
});

it("exports an account child book with an independent portable passphrase", async () => {
  const { unlockVault } = await import("@/lib/relish/vault");
  const { writeBinding } = await import("@/lib/relish/book-sync");
  const { verifyParent } = await import("@/lib/relish/profiles");
  const { result } = renderHook(useLocalBook);
  await act(async () => {
    await result.current.open("fictional account secret", "Robin");
  });
  await act(async () => {
    await result.current.save((b) => ({
      ...b,
      profile: {
        kind: "child",
        ageBand: "9-12",
        parentLock: { accountUid: "parent-one" },
      },
    }));
  });
  writeBinding(result.current.editionId, {
    uid: "parent-one",
    remoteId: crypto.randomUUID(),
    revision: null,
    fingerprint: null,
    accountManaged: true,
  });
  const createUrl = vi
    .spyOn(URL, "createObjectURL")
    .mockReturnValue("blob:fictional-backup");
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  try {
    await act(async () => {
      await result.current.backup("portable backup passphrase");
    });
    expect(result.current.error).toBe("");
    expect(click).toHaveBeenCalled();
    const payload = await (createUrl.mock.calls[0][0] as Blob).text();
    const restored = await unlockVault(payload, "portable backup passphrase");
    expect(restored.book.owner).toBe("Robin");
    expect(restored.book.profile?.kind).toBe("child");
    if (restored.book.profile?.kind !== "child")
      throw new Error("Expected child profile");
    expect("accountUid" in restored.book.profile.parentLock).toBe(false);
    expect(
      await verifyParent(
        restored.book.profile.parentLock,
        "portable backup passphrase",
      ),
    ).toBe(true);
    await expect(
      unlockVault(payload, "fictional account secret"),
    ).rejects.toThrow();
  } finally {
    createUrl.mockRestore();
    click.mockRestore();
  }
});
