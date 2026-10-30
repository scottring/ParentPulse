// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, useState } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
const mock = vi.hoisted(() => ({
  user: {
    uid: "adult-a",
    email: "fictional@example.invalid",
    emailVerified: true,
    getIdToken: async () => "test-token",
  },
}));
vi.mock("@/lib/relish/ai-auth", () => ({
  getAIAuth: () => ({}),
  disconnectAI: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, callback: (u: unknown) => void) => {
    callback(mock.user);
    return () => {};
  },
}));
import ConnectedEditions from "../ConnectedEditions";
import { emptyBook, type Book } from "@/lib/relish/model";
import { makeIdentity, keyFingerprint } from "@/lib/relish/sharing";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function setup(mismatch?: "account" | "key") {
  const a = await makeIdentity("adult-a"),
    b = await makeIdentity("adult-b");
  let current: Book = {
    ...emptyBook("Fictional A"),
    connections: {
      identity:
        mismatch === "account"
          ? { ...a, uid: "another-account" }
          : mismatch === "key"
            ? { ...b, uid: a.uid }
            : a,
      received: [],
    },
  };
  const member = async (identity: typeof a, name: string) => ({
    uid: identity.uid,
    publicKey: identity.publicKey,
    keyId: await keyFingerprint(identity.publicKey),
    name,
  });
  const profile = await member(a, "Fictional A"),
    other = await member(b, "Fictional B");
  const snapshot = {
    profile,
    circle: {
      id: "family-test",
      name: "Test family",
      ownerId: a.uid,
      members: [profile, other],
    },
    deliveries: [],
  };
  const sent: any[] = [];
  let offline = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.action === "send") {
        sent.push(body);
        if (offline)
          return new Response(
            JSON.stringify({ error: "Connection interrupted" }),
            { status: 503 },
          );
      }
      return new Response(
        JSON.stringify(body.action === "list" ? snapshot : { ok: true }),
        { status: 200 },
      );
    }),
  );
  const close = vi.fn();
  function Harness() {
    const [book, setBook] = useState(current);
    return createElement(ConnectedEditions, {
      book,
      backup: () => {},
      onClose: close,
      save: async (change) => {
        current = change(current);
        setBook(current);
      },
    });
  }
  render(createElement(Harness));
  await screen.findByText("Connect the Fictional A edition");
  fireEvent.click(screen.getByRole("checkbox", { name: /18 or older/ }));
  fireEvent.click(screen.getByRole("button", { name: "Connect this edition" }));
  if (mismatch)
    await screen.findByText(
      mismatch === "account"
        ? /This edition belongs to a different online account/
        : /This account already has an edition/,
    );
  else {
    await screen.findByText("Test family");
    fireEvent.click(screen.getByText("Offer a passage from my edition"));
  }
  return {
    sent,
    online: () => {
      offline = false;
    },
    current: () => current,
    close,
  };
}
describe("sharing recovery", () => {
  it("keeps a mismatched key disconnected after reading the account profile", async () => {
    await setup("key");
    expect(screen.queryByText("Test family")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Connect this edition" }),
    ).toBeTruthy();
  });
  it("never removes another edition’s identity when deleting the signed-in account", async () => {
    const state = await setup("account");
    const identity = state.current().connections!.identity;
    fireEvent.click(screen.getByText("Delete my online account"));
    fireEvent.change(
      screen.getByRole("textbox", { name: /Type DELETE ONLINE ACCOUNT/ }),
      { target: { value: "DELETE ONLINE ACCOUNT" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete online account",
      }),
    );
    await screen.findByText(/Your online account was removed/);
    expect(state.current().connections!.identity).toEqual(identity);
  });
  it("retries the saved invitation without clearing another draft", async () => {
    const state = await setup();
    fireEvent.change(
      screen.getByRole("textbox", { name: "The exact passage" }),
      { target: { value: "A fictional passage to offer." } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Fictional B" }));
    fireEvent.click(screen.getByRole("button", { name: /Encrypt and offer/ }));
    await screen.findByText("Connection interrupted");
    expect(
      (
        screen.getByRole("textbox", {
          name: "The exact passage",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    expect(state.current().connections?.outgoing).toHaveLength(1);
    fireEvent.change(
      screen.getByRole("textbox", { name: "The exact passage" }),
      { target: { value: "A different unfinished thought." } },
    );
    state.online();
    fireEvent.click(screen.getByRole("button", { name: "Try sending again" }));
    await screen.findByText(/Your passage was offered/);
    expect(state.sent).toHaveLength(2);
    expect(state.sent[0]).toEqual(state.sent[1]);
    expect(
      (
        screen.getByRole("textbox", {
          name: "The exact passage",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("A different unfinished thought.");
  });
  it("keeps unfinished words locally before closing the dialog", async () => {
    const state = await setup();
    fireEvent.change(
      screen.getByRole("textbox", { name: "The exact passage" }),
      { target: { value: "Fictional unfinished draft." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() => expect(state.close).toHaveBeenCalledOnce());
    expect(state.current().connections?.draft?.text).toBe(
      "Fictional unfinished draft.",
    );
    expect(state.sent).toHaveLength(0);
  });
});
