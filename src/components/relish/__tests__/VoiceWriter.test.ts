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
import { connectAI } from "@/lib/relish/ai-auth";
import { sendEmailVerification } from "firebase/auth";
vi.mock("@/lib/relish/profiles", async (original) => ({
  ...(await original<typeof import("@/lib/relish/profiles")>()),
  verifyParent: vi.fn(),
}));
const account = {
  uid: "fictional-adult",
  email: "fictional@example.invalid",
  emailVerified: true,
  reload: vi.fn().mockResolvedValue(undefined),
  getIdToken: vi.fn().mockResolvedValue("adult-token"),
};
const session: { user: typeof account | null } = { user: account };
vi.mock("@/lib/relish/ai-auth", () => ({
  currentAIUser: () => session.user,
  connectAI: vi.fn(async () => {
    session.user = account;
    window.dispatchEvent(new Event("relish:account"));
    return account;
  }),
}));
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));
const stopTrack = vi.fn();
class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static isTypeSupported() {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeRecorder.instances.push(this);
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
  session.user = account;
  account.emailVerified = true;
  account.reload.mockResolvedValue(undefined);
  account.getIdToken.mockResolvedValue("adult-token");
  FakeRecorder.instances.length = 0;
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
    screen.getByRole("button", { name: "Continue to recording" }),
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
  it("keeps dictation unavailable when the server disables child voice", async () => {
    network.mockResolvedValue(
      Response.json({ enabled: true, children: false }),
    );
    show(true);
    await screen.findByText(/Voice writing is being connected/);
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
      screen.getByRole("button", { name: "Continue to recording" }),
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
    expect(FakeRecorder.instances.at(-1)?.state).toBe("inactive");
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
  media.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  show();
  await connect();
  fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
  await waitFor(() => expect(media).toHaveBeenCalled());
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  await act(async () => {
    resolve({ getTracks: () => [{ stop: stopTrack }] });
  });
  expect(stopTrack).toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "I’m done talking" })).toBeNull();
});

describe("voice account handoff", () => {
  it("reuses the signed-in account and requires separate consent before recording", async () => {
    show();
    await screen.findByText(/You’re signed in as fictional/);
    expect(screen.queryByLabelText("Account password")).toBeNull();
    const next = screen.getByRole("button", { name: "Continue to recording" });
    expect(next.hasAttribute("disabled")).toBe(true);
    expect(media).not.toHaveBeenCalled();
    await connect();
    expect(connectAI).not.toHaveBeenCalled();
    expect(account.getIdToken).toHaveBeenCalledWith(true);
    expect(media).not.toHaveBeenCalled();
  });
  it("signs in once, then moves to a distinct consent step without opening the microphone", async () => {
    session.user = null;
    show();
    await screen.findByLabelText("Account email");
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.change(screen.getByLabelText("Account email"), {
      target: { value: "fictional@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Account password"), {
      target: { value: "fictional password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Sign in and continue" }),
    );
    await screen.findByRole("checkbox");
    expect(connectAI).toHaveBeenCalledExactlyOnceWith(
      "fictional@example.invalid",
      "fictional password",
      false,
    );
    expect(screen.queryByLabelText("Account password")).toBeNull();
    expect(media).not.toHaveBeenCalled();
    await connect();
    expect(connectAI).toHaveBeenCalledTimes(1);
  });
  it("refreshes newly verified credentials before allowing voice entry", async () => {
    account.emailVerified = false;
    show();
    await screen.findByRole("button", { name: "I’ve verified my email" });
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "I’ve verified my email" }),
    );
    await screen.findByText(/Your email is not verified yet/);
    expect(media).not.toHaveBeenCalled();
    account.reload.mockImplementationOnce(async () => {
      account.emailVerified = true;
    });
    fireEvent.click(
      screen.getByRole("button", { name: "I’ve verified my email" }),
    );
    await screen.findByRole("checkbox");
    expect(account.getIdToken).toHaveBeenCalledWith(true);
    expect(connectAI).not.toHaveBeenCalled();
    expect(media).not.toHaveBeenCalled();
  });
  it("resends verification only on request and keeps the draft in the writer", async () => {
    account.emailVerified = false;
    const view = show();
    await screen.findByRole("button", { name: "Resend verification email" });
    expect(sendEmailVerification).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Resend verification email" }),
    );
    await screen.findByText(/Verification email sent/);
    expect(sendEmailVerification).toHaveBeenCalledExactlyOnceWith(account);
    expect(view.onClose).not.toHaveBeenCalled();
    expect(view.onInsert).not.toHaveBeenCalled();
  });
  it("observes an account sign-in while the writer is open", async () => {
    session.user = null;
    show();
    await screen.findByLabelText("Account email");
    await act(async () => {
      session.user = account;
      window.dispatchEvent(new Event("relish:account"));
    });
    await screen.findByRole("checkbox");
    expect(screen.queryByLabelText("Account password")).toBeNull();
    expect(media).not.toHaveBeenCalled();
  });
  it("stops a recording and clears consent when the account signs out", async () => {
    show();
    await connect();
    fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
    await screen.findByRole("button", { name: "I’m done talking" });
    await act(async () => {
      session.user = null;
      window.dispatchEvent(new Event("relish:account"));
    });
    await screen.findByLabelText("Account email");
    expect(stopTrack).toHaveBeenCalled();
    expect(
      network.mock.calls.filter((c) => c[1]?.method === "POST"),
    ).toHaveLength(0);
    await act(async () => {
      session.user = account;
      window.dispatchEvent(new Event("relish:account"));
    });
    const next = await screen.findByRole("button", {
      name: "Continue to recording",
    });
    expect(next.hasAttribute("disabled")).toBe(true);
  });
  it("rejects late microphone access after an account lock", async () => {
    let resolve!: (value: unknown) => void;
    media.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    show();
    await connect();
    fireEvent.click(screen.getByRole("button", { name: "Start talking" }));
    await waitFor(() => expect(media).toHaveBeenCalled());
    await act(async () => {
      window.dispatchEvent(new Event("relish:locked"));
      resolve({ getTracks: () => [{ stop: stopTrack }] });
    });
    expect(stopTrack).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "I’m done talking" }),
    ).toBeNull();
  });
});
