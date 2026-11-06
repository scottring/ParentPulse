import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../route";
import { isNewerBuild } from "@/lib/relish/version";
afterEach(() => vi.unstubAllEnvs());
it("reports the live build without caching", async () => {
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc1234");
  const res = GET();
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  expect(await res.json()).toEqual({ build: "abc1234" });
});
it("only flags a real, different build", () => {
  expect(isNewerBuild("abc1234", "def5678")).toBe(true);
  expect(isNewerBuild("abc1234", "abc1234")).toBe(false);
  expect(isNewerBuild("", "def5678")).toBe(false);
  expect(isNewerBuild("abc1234", "")).toBe(false);
  expect(isNewerBuild("abc1234", "<html>")).toBe(false);
  expect(isNewerBuild("abc1234", undefined)).toBe(false);
});
