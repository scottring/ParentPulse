import { describe, expect, it } from "vitest";
import { keySamples, splitStrokes, strokeFor } from "../keyboard-sound";

describe("mechanical keyboard sound", () => {
  it("makes short, finite, normalized strokes", () => {
    for (const kind of ["key", "space", "enter", "delete", "up"] as const) {
      const s = keySamples(48000, kind, 3);
      expect(s.length).toBeGreaterThan(48000 * 0.03);
      expect(s.length).toBeLessThan(48000 * 0.12);
      let peak = 0;
      for (const v of s) {
        expect(Number.isFinite(v)).toBe(true);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak).toBeLessThanOrEqual(0.91);
      expect(peak).toBeGreaterThan(0.2);
    }
  });
  it("starts the click immediately so it lands with the key", () => {
    const s = keySamples(48000, "key", 0);
    const first = s.findIndex((v) => Math.abs(v) > 0.05);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first / 48000).toBeLessThan(0.002);
  });
  it("varies between presses but repeats exactly for the same variant", () => {
    expect(keySamples(48000, "key", 1)).toEqual(keySamples(48000, "key", 1));
    expect(keySamples(48000, "key", 1)).not.toEqual(keySamples(48000, "key", 2));
  });
  it("clacks for typing keys only", () => {
    expect(strokeFor("a")).toBe("key");
    expect(strokeFor(" ")).toBe("space");
    expect(strokeFor("Enter")).toBe("enter");
    expect(strokeFor("Backspace")).toBe("delete");
    expect(strokeFor("Shift")).toBeNull();
    expect(strokeFor("ArrowLeft")).toBeNull();
    expect(strokeFor("Meta")).toBeNull();
  });
});

describe("recorded strokes", () => {
  it("splits a file of strokes on the silent gaps", () => {
    const rate = 48000;
    const data = new Float32Array(rate);
    const put = (at: number, ms: number) => {
      for (let i = 0; i < (rate * ms) / 1000; i++)
        data[at + i] = Math.sin(i / 3) * 0.5 * Math.exp(-i / 800);
    };
    put(2880, 80);
    put(2880 + 3840 + 2880, 80);
    put(20000, 60);
    const strokes = splitStrokes(data, rate);
    expect(strokes).toHaveLength(3);
    expect(strokes[0][0]).toBeLessThanOrEqual(2880);
    expect(strokes[0][0]).toBeGreaterThan(2800);
  });
});

describe("sound sets", () => {
  it("the pencil has strokes only, and no synthesized keyboard stand-in", async () => {
    const { PENCIL, KEYBOARD } = await import("../keyboard-sound");
    expect(PENCIL).toEqual({ base: "/sounds/pencil/", files: { key: "strokes" }, synth: false });
    expect(KEYBOARD.synth).toBe(true);
    expect(KEYBOARD.files).toEqual({ key: "keys", up: "up" });
  });
});
