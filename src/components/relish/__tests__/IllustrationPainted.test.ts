// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
vi.mock("../illustrations", async (original) => ({
  ...(await original<typeof import("../illustrations")>()),
  isPainted: (name: string) => name === "welcome",
}));
import Illustration from "../Illustration";
afterEach(cleanup);

it("shows the painting once it is listed, still hidden from screen readers", () => {
  const { container } = render(createElement(Illustration, { name: "welcome" }));
  const img = container.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("/illustrations/relish/welcome.png");
  expect(img.getAttribute("alt")).toBe("");
  expect(img.getAttribute("aria-hidden")).toBe("true");
});

it("falls back to the sketch for names not yet painted", () => {
  const { container } = render(createElement(Illustration, { name: "saved" }));
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("[data-sketch]")).toBeTruthy();
});
