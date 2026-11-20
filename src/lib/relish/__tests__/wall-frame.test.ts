import { describe, expect, it } from "vitest";
import { frameAncestors, WALL_ORIGIN } from "@/proxy";

describe("frame-ancestors for the kitchen wall", () => {
  it("lets only the wall (and Relish itself) frame the app", () => {
    expect(frameAncestors("/relish/", false)).toBe(`'self' ${WALL_ORIGIN}`);
    expect(frameAncestors("/relish/privacy/", false)).not.toContain("localhost");
  });
  it("keeps every other page unframeable", () => {
    expect(frameAncestors("/", false)).toBe("'none'");
    expect(frameAncestors("/privacy/", false)).toBe("'none'");
  });
  it("allows a local wall in development", () => {
    expect(frameAncestors("/relish/", true)).toContain("http://localhost:*");
  });
});
