// @vitest-environment happy-dom
import { createElement } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import VoiceWriter from "../VoiceWriter";
import { emptyBook } from "@/lib/relish/model";
import { verifyParent } from "@/lib/relish/profiles";
vi.mock("@/lib/relish/profiles", async (original) => ({
  ...(await original<typeof import("@/lib/relish/profiles")>()),
  verifyParent: vi.fn(),
}));
const account = {
  emailVerified: true,
  reload: vi.fn().mockResolvedValue(undefined),
  getIdToken: vi.fn().mockResolvedValue("adult-token"),
};
vi.mock("@/lib/relish/ai-auth", () => ({
  currentAIUser: () => account,
  connectAI: vi.fn().mockResolvedValue(account),
}));
const stopTrack = vi.fn();
let instance: FakeRecorder;
class FakeRecorder {
  static isTypeSupported() {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    instance = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(
        [new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4, 5, 6, 7, 8])],
        { type: this.mimeType },
      ),
    });
    this.onstop?.();
  }
}
let media: ReturnType<typeof vi.fn>, network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  media = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: media },
    configurable: true,
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  network = vi
    .fn()
    .mockImplementation((_url, options) =>
      Promise.resolve(
        Response.json(
          options?.method === "POST"
            ? { text: "A dragon in the clouds." }
            : { enabled: true, children: true },
        ),
      ),
    );
  vi.stubGlobal("fetch", network);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-audio");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.mocked(verifyParent).mockResolvedValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function show(child = false, sample = false) {
  const onInsert = vi.fn(),
    onClose = vi.fn();
  const book = {
    ...emptyBook("Fictional"),
    profile: child
      ? {
          kind: "child" as const,
          ageBand: "9-12" as const,
          parentLock: { salt: "0".repeat(32), verifier: "0".repeat(64) },
        }
      : { kind: "adult" as const },
  };
  return {
    ...render(
      createElement(VoiceWriter, {
        book,
        sample,
        open: true,
        remaining: 5000,
        onClose,
        onInsert,
      }),
    ),
    onInsert,
    onClose,
  };
}
async function connect() {
  await screen.findByRole("checkbox");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: "Connect voice writing" }),
  );
  await screen.findByRole("button", { name: "Start talking" });
}
describe("voice writing consent and lifecycle", () => {
  it("never opens the microphone or contacts a service from the sample", () => {
    show(false, true);
    expect(network).not.toHaveBeenCalled();
    expect(media).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Start talking" })).toBeNull();
  });
  it("keeps child dictation unavailable when the server privacy gate is off", async () => {
    network.mockResolvedValue(
      Response.json({ enabled: true, children: false }),
    );
    show(true);
    await screen.findByText(/waiting for its privacy setup/);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(media).not.toHaveBeenCalled();
  });
  it("checks the parent passphrase before a child can start recording", async () => {
    show(true);
    await screen.findByRole("checkbox");
    vi.mocked(verifyParent).mockResolvedValueOnce(false);
    fireEvent.change(screen.getByLabelText("Parent passphrase"), {
      target: { value: "incorrect" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Connect voice writing" }),
    );
    await screen.findByText(/passphrase didn’t match/);
    expect(media).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Start talking" })).toBeNull();
  });
  it("records locally, releases the microphone, sends only after review and inserts only chosen words", async () => {
    const view = show();
    await connect();
    fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
    await screen.findByRole("button", { name: "I’m done talking" });
    expect(
      network.mock.calls.filter((c) => c[1]?.method === "POST"),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "I’m done talking" }));
    await screen.findByRole("button", {
      name: "Turn this recording into words",
    });
    expect(stopTrack).toHaveBeenCalled();
    expect(view.onInsert).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Turn this recording into words" }),
    );
    const words = await screen.findByLabelText("Your spoken words");
    expect(view.onInsert).not.toHaveBeenCalled();
    fireEvent.change(words, {
      target: { value: "A sleepy dragon in the clouds." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add these words/ }));
    expect(view.onInsert).toHaveBeenCalledWith(
      "A sleepy dragon in the clouds.",
    );
    const post = network.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(post[1].body).toBeInstanceOf(Blob);
    expect(post[1].headers["x-relish-consent"]).toBe("this-recording");
  });
  it("stops recording and aborts pending upload when the edition closes", async () => {
    const view = show();
    await connect();
    fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
    await screen.findByRole("button", { name: "I’m done talking" });
    view.unmount();
    expect(instance.state).toBe("inactive");
    expect(stopTrack).toHaveBeenCalled();
    expect(network.mock.calls[0][1].signal.aborted).toBe(true);
    expect(view.onInsert).not.toHaveBeenCalled();
  });
  it("releases a microphone permission result that arrives after the writer closed", async () => {
    let resolve!: (value: unknown) => void;
    media.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const view = show();
    await connect();
    fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
    await waitFor(() => expect(media).toHaveBeenCalled());
    view.unmount();
    await act(async () => {
      resolve({ getTracks: () => [{ stop: stopTrack }] });
    });
    expect(stopTrack).toHaveBeenCalled();
  });
});

it("does not start a microphone result that arrives while the page is hidden", async () => {
  let resolve!: (value: unknown) => void;
  media.mockReturnValue(new Promise((r) => { resolve = r; }));
  show();
  await connect();
  fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
  await waitFor(() => expect(media).toHaveBeenCalled());
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  await act(async () => { resolve({ getTracks: () => [{stop: stopTrack}] }); });
  expect(stopTrack).toHaveBeenCalled();
  expect(screen.queryByRole("button", {name:"I’m done talking"})).toBeNull();
});
