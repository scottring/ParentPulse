// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { webcrypto } from "node:crypto";
import EditionSetup from "../EditionSetup";
import { emptyBook, type Book } from "@/lib/relish/model";
import { makeParentLock } from "@/lib/relish/profiles";
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
afterEach(cleanup);
describe("parent edition setup", () => {
  it("requires an explicit range and parent confirmation, and keeps setup open after a failed encrypted save", async () => {
    let book = emptyBook("Fictional child"),
      fail = true;
    const done = vi.fn();
    const save = vi.fn(async (change: (b: Book) => Book) => {
      if (fail) throw new Error("Storage is full");
      book = change(book);
    });
    render(
      createElement(EditionSetup, {
        book,
        save,
        onDone: done,
        onCancel: vi.fn(),
      }),
    );
    const submit = screen.getByRole("button", {
      name: "Open this edition",
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /A child or teen/ }));
    fireEvent.change(screen.getByLabelText("Age range"), {
      target: { value: "6-8" },
    });
    fireEvent.change(screen.getByLabelText("Choose a parent passphrase"), {
      target: { value: "A parent test passphrase" },
    });
    fireEvent.change(screen.getByLabelText("Repeat parent passphrase"), {
      target: { value: "A parent test passphrase" },
    });
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(submit);
    await screen.findByText("Storage is full");
    expect(done).not.toHaveBeenCalled();
    expect(book.profile).toBeUndefined();
    fail = false;
    fireEvent.click(submit);
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(book.profile).toMatchObject({ kind: "child", ageBand: "6-8" });
    expect(JSON.stringify(book.profile)).not.toContain(
      "A parent test passphrase",
    );
  });
  it("does not save a child-to-adult change with the wrong parent passphrase", async () => {
    const book: Book = {
      ...emptyBook("Child"),
      profile: {
        kind: "child",
        ageBand: "13-17",
        parentLock: await makeParentLock("Correct parent passphrase"),
      },
    };
    const save = vi.fn(),
      done = vi.fn();
    render(
      createElement(EditionSetup, {
        book,
        save,
        onDone: done,
        onCancel: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /An adult/ }));
    fireEvent.change(screen.getByLabelText("Parent passphrase"), {
      target: { value: "Incorrect parent passphrase" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Save edition settings" }),
    );
    await screen.findByText(/did not match/);
    expect(save).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  });
});
