// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { emptyBook, type Book } from "@/lib/relish/model";
import { nudgesFor } from "@/lib/relish/nudges";
import { openBook } from "./bookHarness";
import { coverFor } from "../covers";
vi.mock("../Sensory", () => ({
  useSensory: () => ({ play: vi.fn() }),
  SoundControl: () => null,
  SoundSettings: () => null,
}));
afterEach(cleanup);

const kid = (ageBand: "6-8" | "9-12" = "9-12"): Book => ({
  ...emptyBook("Kaleb"),
  profile: { kind: "child", ageBand, parentLock: { accountUid: "parent-uid" } },
});

it("greets a child with their own book and three ways to add a page", () => {
  openBook(kid());
  expect(screen.getByRole("heading", { name: "Hi, Kaleb.", level: 1 })).toBeTruthy();
  expect(screen.getByText("What did you notice today?")).toBeTruthy();
  const add = screen.getByRole("group", { name: "Add a page" });
  for (const name of ["Write", "Record", "Add a photo"])
    expect(within(add).getByRole("button", { name })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Open my book" })).toBeTruthy();
  const cover = document.querySelector(".rk-cover")!;
  expect(cover.textContent).toContain("Kaleb’s");
  expect(cover.getAttribute("data-emblem")).toBe("beetle");
  expect(cover.getAttribute("aria-hidden")).toBe("true");
  // One book everywhere: the same rust cloth as Kaleb's cover on the shelf.
  expect(cover.getAttribute("data-cloth")).toBe(coverFor("Kaleb").cloth);
  expect((cover as HTMLElement).style.getPropertyValue("--cloth")).toBe(
    coverFor("Kaleb").color,
  );
  // The adult Home's pieces are not on a child's Home.
  expect(screen.queryByText("Or pick by how much time you have")).toBeNull();
  expect(screen.queryByText("Your people")).toBeNull();
});

it("shows one kid suggestion from their age band, and another on request", () => {
  openBook(kid("9-12"));
  const titles = nudgesFor(kid("9-12")).map((n) => n.title);
  expect(titles).toContain("Kindness spotting");
  const banner = screen.getByRole("region", { name: "Something to try" });
  const first = within(banner).getByRole("heading").textContent;
  expect(titles).toContain(first);
  fireEvent.click(within(banner).getByRole("button", { name: "Show me another" }));
  expect(within(banner).getByRole("heading").textContent).not.toBe(first);
});

it("offers Kindness spotting to 6–8s with Scott's wording", () => {
  const spot = nudgesFor(kid("6-8")).find((n) => n.title === "Kindness spotting")!;
  expect(spot.text).toBe("See someone do something kind? Save it here.");
  expect(spot.cta).toBe("Start spotting");
  expect(spot.action).toEqual({ kind: "exercise", id: "kindness-bingo" });
});

it("Add a photo opens the device's photo picker, then a new page with the photo", async () => {
  openBook(kid());
  const button = screen.getByRole("button", { name: "Add a photo" });
  const input = button.parentElement!.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  let opened = false;
  input.click = () => {
    opened = true;
  };
  fireEvent.click(button);
  expect(opened).toBe(true);
  fireEvent.change(input, {
    target: { files: [new File(["x"], "fictional.png", { type: "image/png" })] },
  });
  expect(
    await screen.findByRole("region", { name: "Journal editor" }),
  ).toBeTruthy();
});

it("More to try opens Activities, with the games a child can play", () => {
  openBook(kid());
  const more = screen.getByRole("region", { name: "More to try" });
  fireEvent.click(within(more).getByRole("button", { name: /Play a game/ }));
  expect(screen.getByRole("main", { name: "Activities" })).toBeTruthy();
  const games = screen.getAllByRole("button", { name: /: Play / });
  expect(games.length).toBeGreaterThan(0);
  // Only what fits a child's age: no adult-only exercises.
  expect(screen.queryByRole("button", { name: /Plan a repair/ })).toBeNull();
});

it("fits the Home invitation to the age band, with a read-aloud cue for the youngest", () => {
  const book = (ageBand: "under-6" | "13-17"): Book => ({
    ...emptyBook("Ella"),
    profile: { kind: "child", ageBand, parentLock: { accountUid: "parent-uid" } },
  });
  openBook(book("under-6"));
  expect(screen.getByText("What did you play today?")).toBeTruthy();
  expect(screen.getByText(/Grown-up: read this aloud/)).toBeTruthy();
  cleanup();
  openBook(book("13-17"));
  expect(screen.getByText("Anything from today worth keeping?")).toBeTruthy();
  expect(screen.queryByText(/Grown-up: read this aloud/)).toBeNull();
});
