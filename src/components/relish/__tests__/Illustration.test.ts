// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import Illustration from "../Illustration";
import {
  emblemFor,
  illustrationNames,
  paintedIllustrations,
} from "../illustrations";
afterEach(cleanup);

it("shows Scott's painting: decorative, sized, lazy unless above the fold", () => {
  const { container } = render(createElement(Illustration, { name: "jot", size: 120 }));
  const img = container.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("/illustrations/relish/jot.webp");
  expect(img.getAttribute("alt")).toBe("");
  expect(img.getAttribute("aria-hidden")).toBe("true");
  expect(img.getAttribute("width")).toBe("120");
  expect(img.getAttribute("height")).toBe("120");
  expect(img.getAttribute("loading")).toBe("lazy");
  cleanup();
  const eager = render(createElement(Illustration, { name: "home", eager: true }));
  expect(eager.container.querySelector("img")!.getAttribute("loading")).toBe("eager");
});

it("falls back to a decorative sketch when the painting fails to load", () => {
  const { container } = render(createElement(Illustration, { name: "jot" }));
  fireEvent.error(container.querySelector("img")!);
  const art = container.querySelector("[data-illustration='jot']")!;
  expect(art.getAttribute("aria-hidden")).toBe("true");
  expect(art.hasAttribute("data-sketch")).toBe(true);
  expect(container.querySelector("img")).toBeNull();
  expect(art.querySelector("svg")?.children.length).toBeGreaterThan(0);
});

it("has a sketch for every name on Scott's list, and a file for every painted name", async () => {
  for (const name of illustrationNames) {
    const { container, unmount } = render(createElement(Illustration, { name }));
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("svg")?.innerHTML.length).toBeGreaterThan(40);
    unmount();
  }
  const { existsSync } = await import("node:fs");
  const path = await import("node:path");
  for (const name of paintedIllustrations)
    expect(existsSync(path.resolve(__dirname, `../../../../public/illustrations/relish/${name}.webp`))).toBe(true);
  expect(paintedIllustrations.every((n) => illustrationNames.includes(n))).toBe(true);
});

it("gives a child's cover the same emblem every time, from the first letter", () => {
  expect(emblemFor("Kaleb")).toBe("beetle");
  expect(emblemFor("Ella")).toBe("star");
  expect(emblemFor("  zoe ")).toBe(emblemFor("Zoe"));
});
