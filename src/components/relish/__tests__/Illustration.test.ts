// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Illustration from "../Illustration";
import {
  emblemFor,
  illustrationNames,
  paintedIllustrations,
} from "../illustrations";
afterEach(cleanup);

it("draws a decorative sketch while the painting has not arrived", () => {
  const { container } = render(createElement(Illustration, { name: "jot" }));
  const art = container.querySelector("[data-illustration='jot']")!;
  expect(art.getAttribute("aria-hidden")).toBe("true");
  expect(art.hasAttribute("data-sketch")).toBe(true);
  expect(container.querySelector("img")).toBeNull();
  expect(art.querySelector("svg")?.children.length).toBeGreaterThan(0);
});

it("has a sketch for every name on Scott's list", () => {
  for (const name of illustrationNames) {
    const { container, unmount } = render(createElement(Illustration, { name }));
    expect(container.querySelector("svg")?.innerHTML.length).toBeGreaterThan(40);
    unmount();
  }
  expect(paintedIllustrations.every((n) => illustrationNames.includes(n))).toBe(true);
});

it("gives a child's cover the same emblem every time, from the first letter", () => {
  expect(emblemFor("Kaleb")).toBe("beetle");
  expect(emblemFor("Ella")).toBe("star");
  expect(emblemFor("  zoe ")).toBe(emblemFor("Zoe"));
});
