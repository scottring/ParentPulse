// @vitest-environment happy-dom
import { createElement } from "react";
import {
  render,
  fireEvent,
  cleanup,
  screen,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Window } from "happy-dom";
const sound = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(true),
  stop: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("@/lib/relish/sound", () => ({ createSoundEngine: () => sound }));
import { SensoryProvider, SoundControl } from "../Sensory";
Object.defineProperty(globalThis, "localStorage", {
  value: new Window({ url: "http://localhost" }).localStorage,
  configurable: true,
});
function mount() {
  return render(
    createElement(
      SensoryProvider,
      null,
      createElement(SoundControl),
      createElement("button", null, "Keep something"),
    ),
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("sound is always an invitation", () => {
  it("starts silent, plays only after enabling, and stops immediately on mute", async () => {
    mount();
    fireEvent.click(screen.getByText("Keep something"));
    expect(sound.play).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent.click(screen.getByLabelText("Turn quiet sounds on")),
    );
    expect(sound.play).toHaveBeenCalledWith("place");
    await act(async () => fireEvent.click(screen.getByText("Keep something")));
    expect(sound.play).toHaveBeenLastCalledWith("touch");
    sound.play.mockClear();
    await act(async () =>
      fireEvent.click(screen.getByLabelText("Turn quiet sounds off")),
    );
    fireEvent.click(screen.getByText("Keep something"));
    expect(sound.play).not.toHaveBeenCalled();
    expect(sound.stop).toHaveBeenCalled();
  });
  it("remembers the preference without playing automatically on mount", () => {
    localStorage.setItem("relish.quiet-sounds.v1", "on");
    mount();
    expect(screen.getByLabelText("Turn quiet sounds off")).toBeTruthy();
    expect(sound.play).not.toHaveBeenCalled();
  });
  it("honors a mute from another tab and suspends feedback when hidden", async () => {
    localStorage.setItem("relish.quiet-sounds.v1", "on");
    mount();
    await act(async () => {
      localStorage.setItem("relish.quiet-sounds.v1", "off");
      window.dispatchEvent(
        new StorageEvent("storage", { key: "relish.quiet-sounds.v1" }),
      );
    });
    expect(screen.getByLabelText("Turn quiet sounds on")).toBeTruthy();
    fireEvent.click(screen.getByText("Keep something"));
    expect(sound.play).not.toHaveBeenCalled();
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(sound.stop).toHaveBeenCalled();
  });
});
