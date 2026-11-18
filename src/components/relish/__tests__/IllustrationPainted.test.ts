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

it("shows a painting only once it is listed", () => {
  const { container } = render(createElement(Illustration, { name: "welcome" }));
  const img = container.querySelector("img")!;
  expect(img.getAttribute("src")).toBe("/illustrations/relish/welcome.webp");
  expect(img.getAttribute("alt")).toBe("");
  expect(img.getAttribute("aria-hidden")).toBe("true");
});

it("draws the sketch for a name whose file has not arrived", () => {
  const { container } = render(createElement(Illustration, { name: "saved" }));
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("[data-sketch]")).toBeTruthy();
});
