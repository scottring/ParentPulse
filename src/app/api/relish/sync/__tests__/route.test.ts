import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), action: vi.fn() }));
vi.mock("@/lib/relish/hosted-ai", () => ({
  services: () => ({ auth: { verifyIdToken: mocks.verify } }),
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
vi.mock("@/lib/relish/book-sync-server", () => ({ syncAction: mocks.action }));
import { POST } from "../route";
const request = (
  body = '{"action":"list"}',
  headers: Record<string, string> = {},
) =>
  new NextRequest("https://preview.example/api/relish/sync/", {
    method: "POST",
    headers: {
      origin: "https://preview.example",
      "content-type": "application/json",
      "x-relish-consent": "encrypted-library",
      authorization: "Bearer verified-token",
      ...headers,
    },
    body,
  });
beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_URL", "preview.example");
  vi.stubEnv("RELISH_AI_ORIGINS", "");
  mocks.verify.mockResolvedValue({
    uid: "real-account",
    email_verified: true,
    firebase: { sign_in_provider: "password" },
  });
  mocks.action.mockResolvedValue({ books: [] });
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
describe("encrypted library access", () => {
  it("uses only the verified account UID, even when a caller supplies another UID", async () => {
    const response = await POST(request('{"action":"list","uid":"victim"}'));
    expect(response.status).toBe(200);
    expect(mocks.action).toHaveBeenCalledWith("real-account", {
      action: "list",
      uid: "victim",
    });
    expect(mocks.verify).toHaveBeenCalledWith("verified-token", true);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each<Record<string, string>>([
    { origin: "https://other.example" },
    { "x-relish-consent": "" },
    { host: "other.example" },
  ])("rejects cross-origin or non-consenting requests", async (headers) => {
    expect((await POST(request(undefined, headers))).status).toBe(403);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("rejects missing, revoked, unverified and anonymous credentials", async () => {
    expect((await POST(request(undefined, { authorization: "" }))).status).toBe(
      401,
    );
    mocks.verify.mockRejectedValueOnce(new Error("revoked"));
    expect((await POST(request())).status).toBe(401);
    mocks.verify.mockResolvedValueOnce({ uid: "a", email_verified: false });
    expect((await POST(request())).status).toBe(403);
    mocks.verify.mockResolvedValueOnce({
      uid: "a",
      email_verified: true,
      firebase: { sign_in_provider: "anonymous" },
    });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.action).not.toHaveBeenCalled();
  });
  it("bounds actual streamed request bytes, rejects malformed input, and hides server internals", async () => {
    expect(
      (await POST(request("x".repeat(600001), { "content-length": "1" })))
        .status,
    ).toBe(413);
    expect((await POST(request("[]"))).status).toBe(400);
    mocks.action.mockRejectedValueOnce(new Error("private internal token"));
    const r = await POST(request());
    expect(r.status).toBe(503);
    expect(JSON.stringify(await r.json())).not.toContain(
      "private internal token",
    );
  });
});
