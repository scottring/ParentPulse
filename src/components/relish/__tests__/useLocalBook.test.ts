// @vitest-environment happy-dom
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
