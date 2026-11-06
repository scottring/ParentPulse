// @vitest-environment happy-dom
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import UpdateBar from "../UpdateBar";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function serve(build: string) {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ build })));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
it("stays hidden while the running build is current", async () => {
  const fetch = serve("abc1234");
  render(createElement(UpdateBar, { build: "abc1234" }));
  await act(async () => {});
  expect(fetch).toHaveBeenCalledWith("/api/relish/version/", { cache: "no-store" });
  expect(screen.queryByRole("status")).toBeNull();
});
it("offers a reload once a newer build is live", async () => {
  serve("def5678");
  render(createElement(UpdateBar, { build: "abc1234" }));
  expect(await screen.findByText("A new version of Relish is available.")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Reload/ })).toBeTruthy();
});
it("never checks in local dev, where there is no build ID", async () => {
  const fetch = serve("def5678");
  render(createElement(UpdateBar, { build: "" }));
  await act(async () => {});
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).toBeNull();
});
