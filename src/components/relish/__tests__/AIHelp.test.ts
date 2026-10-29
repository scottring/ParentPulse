// @vitest-environment happy-dom
import { createElement } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const session = vi.hoisted(() => ({
  user: null as null | {
    email: string;
    emailVerified: boolean;
    getIdToken: () => Promise<string>;
  },
  disconnect: vi.fn(),
}));
vi.mock("@/lib/relish/ai-auth", () => ({
  currentAIUser: () => session.user,
  disconnectAI: session.disconnect,
}));
import { AIHelp } from "../AIHelp";
beforeEach(() => {
  session.user = null;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            local: false,
            hosted: true,
            cloud: true,
            dailyLimit: 20,
          }),
        ),
      ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("hosted AI invitation", () => {
  it("does not send writing or initialize sign-in merely by opening the invitation", async () => {
    render(
      createElement(AIHelp, {
        observation: "PRIVATE FICTIONAL MOMENT",
        onUse: vi.fn(),
      }),
    );
    await screen.findByText("Sign in for AI");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
    expect(JSON.stringify(vi.mocked(fetch).mock.calls)).not.toContain(
      "PRIVATE FICTIONAL MOMENT",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Send this excerpt to OpenAI",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.queryByText("On this computer")).toBeNull();
  });
  it("requires verified email and never falls back to local AI on a hosted page", async () => {
    session.user = {
      email: "qa@example.invalid",
      emailVerified: false,
      getIdToken: vi.fn(),
    };
    render(
      createElement(AIHelp, {
        observation: "A fictional moment.",
        onUse: vi.fn(),
      }),
    );
    await screen.findByText("I’ve verified my email");
    expect(
      (
        screen.getByRole("button", {
          name: "Send this excerpt to OpenAI",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(session.user.getIdToken).not.toHaveBeenCalled();
  });
  it("sends an authenticated request only after the user chooses it and applies only on request", async () => {
    session.user = {
      email: "qa@example.invalid",
      emailVerified: true,
      getIdToken: vi.fn().mockResolvedValue("memory-token"),
    };
    const use = vi.fn();
    render(
      createElement(AIHelp, {
        observation: "Fictional observation.",
        onUse: use,
      }),
    );
    const send = await screen.findByRole("button", {
      name: "Send this excerpt to OpenAI",
    });
    await waitFor(() =>
      expect((send as HTMLButtonElement).disabled).toBe(false),
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ text: "A tentative idea." })),
    );
    fireEvent.click(send);
    await screen.findByText("A tentative idea.");
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer memory-token",
        "x-relish-consent": "selected-excerpt",
      },
    });
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).excerpt,
    ).toBe("Fictional observation.");
    expect(use).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Use this as a starting point" }),
    );
    expect(use).toHaveBeenCalledWith("A tentative idea.");
  });
});
