// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  familyLineFor,
  inNativeApp,
  listenToNative,
  parseNativeMessage,
  postToNative,
  readFamilyLineWidget,
  widgetMessage,
  writeFamilyLineWidget,
} from "../native-bridge";

type W = Window & { webkit?: unknown; relishNative?: { receive: (m: unknown) => boolean } };
afterEach(() => {
  delete (window as W).webkit;
  localStorage.clear();
});

describe("messages from the app", () => {
  it("accepts the versioned places, postures and shares", () => {
    expect(parseNativeMessage({ v: 1, type: "open", place: "new-entry" })).toEqual({
      v: 1,
      type: "open",
      place: "new-entry",
    });
    expect(parseNativeMessage({ v: 1, type: "posture", tent: true })).toEqual({
      v: 1,
      type: "posture",
      tent: true,
    });
    expect(parseNativeMessage({ v: 1, type: "share", id: "abc-1", text: "From Safari" })).toEqual({
      v: 1,
      type: "share",
      id: "abc-1",
      text: "From Safari",
    });
    expect(
      parseNativeMessage({ v: 1, type: "share", id: "a", text: "", image: "data:image/jpeg;base64,AAAA" }),
    ).toMatchObject({ image: "data:image/jpeg;base64,AAAA" });
  });
  it("ignores anything else", () => {
    for (const bad of [
      null,
      "open",
      { v: 2, type: "open", place: "new-entry" },
      { v: 1, type: "open", place: "https://outsider.invalid/" },
      { v: 1, type: "open", place: "new-entry", url: "https://outsider.invalid/" },
      { v: 1, type: "posture", tent: "yes" },
      { v: 1, type: "share", id: "../x", text: "hi" },
      { v: 1, type: "share", id: "a", text: "" },
      { v: 1, type: "share", id: "a", text: "x".repeat(8001) },
      { v: 1, type: "share", id: "a", text: "hi", image: "data:text/html;base64,AAAA" },
      { v: 1, type: "share", id: "a", text: "hi", image: "https://outsider.invalid/a.jpg" },
      { v: 1, type: "eval", code: "alert(1)" },
    ])
      expect(parseNativeMessage(bad)).toBeNull();
  });
  it("hands checked messages to the newest listener only", () => {
    const first = vi.fn(() => true);
    const second = vi.fn(() => true);
    const stopFirst = listenToNative(first);
    const stopSecond = listenToNative(second);
    const w = window as W;
    expect(w.relishNative!.receive({ v: 1, type: "open", place: "table" })).toBe(true);
    expect(w.relishNative!.receive({ v: 1, type: "open", place: "elsewhere" })).toBe(false);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    stopFirst();
    expect(w.relishNative).toBeDefined();
    stopSecond();
    expect(w.relishNative).toBeUndefined();
  });
});

describe("messages to the app", () => {
  it("posts only inside the app", () => {
    expect(inNativeApp()).toBe(false);
    expect(() => postToNative({ v: 1, type: "ready" })).not.toThrow();
    const postMessage = vi.fn();
    (window as W).webkit = { messageHandlers: { relish: { postMessage } } };
    expect(inNativeApp()).toBe(true);
    postToNative({ v: 1, type: "table", open: true });
    expect(postMessage).toHaveBeenCalledWith({ v: 1, type: "table", open: true });
  });
  it("clips widget words and clears the family line with null", () => {
    const m = widgetMessage(
      { when: "Tonight at dinner", title: "Hearing each other out", prompt: "x ".repeat(400) },
      { text: "  ", who: "Leo" },
    );
    expect(m).toMatchObject({ v: 1, type: "widgets", familyLine: null });
    if (m.type !== "widgets" || !m.tonight) throw new Error("expected widgets");
    expect(m.tonight.prompt.length).toBeLessThanOrEqual(300);
    expect(widgetMessage(null, null)).toEqual({ v: 1, type: "widgets", tonight: null, familyLine: null });
  });
});

describe("the family-line widget", () => {
  it("is off until turned on, per journal", () => {
    expect(readFamilyLineWidget("j1")).toBe(false);
    writeFamilyLineWidget("j1", true);
    expect(readFamilyLineWidget("j1")).toBe(true);
    expect(readFamilyLineWidget("j2")).toBe(false);
    writeFamilyLineWidget("j1", false);
    expect(readFamilyLineWidget("j1")).toBe(false);
  });
  it("shows only the newest shared passage", () => {
    const page = (kind: "passage" | "page" | "game", text: string, createdAt: string, caption?: string) => ({
      kind,
      text,
      caption,
      byName: "Alex",
      createdAt,
    });
    expect(familyLineFor([page("game", "Played Spot it!", "2026-11-20T10:00:00Z")])).toBeNull();
    expect(
      familyLineFor([
        page("passage", "Older words", "2026-11-01T10:00:00Z", "June, on the porch"),
        page("page", "A whole page", "2026-11-21T10:00:00Z"),
        page("passage", "Newer words", "2026-11-19T12:00:00Z", "Leo, at bedtime"),
      ]),
    ).toEqual({ text: "Newer words", who: "Leo, at bedtime · Nov 19" });
  });
});
