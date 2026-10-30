import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const stubs = vi.hoisted(() => ({
  authorize: vi.fn(),
  action: vi.fn(),
  verify: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/relish/hosted-ai", () => ({
  authorizeAI: stubs.authorize,
  services: () => ({ auth: { verifyIdToken: stubs.verify } }),
  AIError: class extends Error {
    constructor(
      message: string,
      public status: number,
      public retryAfter?: number,
    ) {
      super(message);
    }
  },
}));
vi.mock("@/lib/relish/connections-server", () => ({
  connectionAction: stubs.action,
}));
vi.mock("@/lib/relish/delete-account", () => ({
  deleteOnlineAccount: stubs.remove,
}));
import { POST } from "../route";
import { AIError } from "@/lib/relish/hosted-ai";
function request(
  body = '{"action":"list"}',
  extra: Record<string, string> = {},
  origin = "https://release.example",
) {
  return new NextRequest(`${origin}/api/relish/connections/`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-relish-consent": "chosen-connection",
      authorization: "Bearer test",
      ...extra,
    },
    body,
  });
}
beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_URL", "release.example");
  vi.stubEnv("VERCEL_BRANCH_URL", "");
  vi.stubEnv("RELISH_AI_ORIGINS", "");
  stubs.authorize.mockResolvedValue("verified-adult");
  stubs.action.mockResolvedValue({
    profile: null,
    circle: null,
    deliveries: [],
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("connection request boundary", () => {
  it("requires explicit deletion confirmation and a recent sign-in", async () => {
    expect((await POST(request('{"action":"deleteAccount"}'))).status).toBe(
      400,
    );
    stubs.verify.mockResolvedValue({ auth_time: Date.now() / 1000 - 1000 });
    expect(
      (
        await POST(
          request(
            '{"action":"deleteAccount","confirmation":"DELETE ONLINE ACCOUNT"}',
          ),
        )
      ).status,
    ).toBe(401);
    expect(stubs.remove).not.toHaveBeenCalled();
    stubs.verify.mockResolvedValue({ auth_time: Date.now() / 1000 });
    stubs.remove.mockResolvedValue({ ok: true });
    expect(
      (
        await POST(
          request(
            '{"action":"deleteAccount","confirmation":"DELETE ONLINE ACCOUNT"}',
          ),
        )
      ).status,
    ).toBe(200);
    expect(stubs.remove).toHaveBeenCalledWith("verified-adult");
  });
  it("requires the hosted origin and explicit consent before authenticating", async () => {
    for (const headers of [
      { origin: "https://foreign.example" },
      { "x-relish-consent": "" },
      { host: "foreign.example" },
    ] as Record<string, string>[])
      expect((await POST(request(undefined, headers))).status).toBe(403);
    expect(stubs.authorize).not.toHaveBeenCalled();
    expect(stubs.action).not.toHaveBeenCalled();
  });
  it("accepts only configured custom origins, not forwarded-host claims", async () => {
    expect(
      (
        await POST(
          request(
            undefined,
            { "x-forwarded-host": "release.example" },
            "https://custom.example",
          ),
        )
      ).status,
    ).toBe(403);
    vi.stubEnv("RELISH_AI_ORIGINS", "https://custom.example");
    expect(
      (await POST(request(undefined, {}, "https://custom.example"))).status,
    ).toBe(200);
  });
  it("fails closed on account errors and never caches private responses", async () => {
    stubs.authorize.mockRejectedValue(new AIError("Verify your email", 403));
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(stubs.action).not.toHaveBeenCalled();
  });
  it.each(["not JSON", "null", "[]", "42"])(
    "rejects malformed request %s",
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(stubs.action).not.toHaveBeenCalled();
    },
  );
  it("bounds streamed bytes regardless of a misleading length header", async () => {
    expect(
      (
        await POST(
          request(
            JSON.stringify({ action: "send", text: "x".repeat(600001) }),
            { "content-length": "2" },
          ),
        )
      ).status,
    ).toBe(413);
    expect(stubs.action).not.toHaveBeenCalled();
  });
  it("does not expose internal errors and preserves retry guidance", async () => {
    stubs.action.mockRejectedValueOnce(new Error("private provider details"));
    const unavailable = await POST(request());
    expect(unavailable.status).toBe(503);
    expect(JSON.stringify(await unavailable.json())).not.toContain(
      "private provider details",
    );
    stubs.action.mockRejectedValueOnce(new AIError("Try later", 429, 60));
    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
  });
});
