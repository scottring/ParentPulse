// @vitest-environment happy-dom
import { createElement } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";

// Node's own localStorage stub shadows happy-dom's; use a real one.
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});

const engines = vi.hoisted(() => new Map<string, { warm: ReturnType<typeof vi.fn>; strike: ReturnType<typeof vi.fn> }>());
vi.mock("@/lib/relish/keyboard-sound", async (original) => {
  const real = await original<typeof import("@/lib/relish/keyboard-sound")>();
  return {
    ...real,
    createKeyboardEngine: (set: { base: string }) => {
      const e = { warm: vi.fn(), strike: vi.fn(), dispose: vi.fn() };
      engines.set(set.base, e);
      return e;
    },
  };
});
import {
  parseVoice,
  setTypingVoice,
  TypingSoundToggle,
  useTypingSound,
} from "../TypingSound";

function Field() {
  return createElement("textarea", { "aria-label": "Entry", ...useTypingSound() });
}
const keyboard = () => engines.get("/sounds/keyboard/");
const pencil = () => engines.get("/sounds/pencil/");

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("typing sound choice", () => {
  it("keeps older settings: 'on' is the keyboard, 'off' is off", () => {
    expect(parseVoice(null)).toBe("keyboard");
    expect(parseVoice("on")).toBe("keyboard");
    expect(parseVoice("off")).toBe("off");
    expect(parseVoice("pencil")).toBe("pencil");
  });

  it("offers keyboard, pencil and off, and remembers the pick", () => {
    render(createElement(TypingSoundToggle));
    expect(screen.getByRole("button", { name: /Keyboard/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /Pencil/ }));
    expect(localStorage.getItem("relish.typing-sounds.v1")).toBe("pencil");
    expect(screen.getByRole("button", { name: /Pencil/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Keyboard/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Keyboard/ }));
    expect(localStorage.getItem("relish.typing-sounds.v1")).toBe("on");
  });

  it("pencil scratches for letters and new lines, lifts for spaces and deletions, never ticks on release", () => {
    setTypingVoice("pencil");
    render(createElement(Field));
    const box = screen.getByLabelText("Entry");
    fireEvent.focus(box);
    expect(pencil()!.warm).toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "a", code: "KeyA" });
    fireEvent.keyUp(box, { key: "a", code: "KeyA" });
    fireEvent.keyDown(box, { key: " ", code: "Space" });
    fireEvent.keyDown(box, { key: "Backspace", code: "Backspace" });
    fireEvent.keyDown(box, { key: "Enter", code: "Enter" });
    expect(pencil()!.strike.mock.calls.map((c) => c[0])).toEqual(["key", "enter"]);
    expect(keyboard()?.strike ?? vi.fn()).not.toHaveBeenCalled();
  });

  it("the keyboard still clacks on every key and ticks on release", () => {
    setTypingVoice("keyboard");
    render(createElement(Field));
    const box = screen.getByLabelText("Entry");
    fireEvent.keyDown(box, { key: " ", code: "Space" });
    fireEvent.keyUp(box, { key: " ", code: "Space" });
    expect(keyboard()!.strike.mock.calls.map((c) => c[0])).toEqual(["space", "up"]);
  });

  it("off is silent", () => {
    setTypingVoice("off");
    render(createElement(Field));
    const box = screen.getByLabelText("Entry");
    for (const e of engines.values()) e.strike.mockClear();
    fireEvent.keyDown(box, { key: "a", code: "KeyA" });
    for (const e of engines.values()) expect(e.strike).not.toHaveBeenCalled();
  });
});
