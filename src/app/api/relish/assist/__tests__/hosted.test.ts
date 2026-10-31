import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/relish/hosted-ai", async (original) => ({
  ...(await original<typeof import("@/lib/relish/hosted-ai")>()),
  authorizeAI: vi.fn(),
  reserveAI: vi.fn(),
}));
import { AIError, authorizeAI, reserveAI } from "@/lib/relish/hosted-ai";
import { GET, POST } from "../route";
const origin = "https://relish-preview.example";
const excerpt = "Fictional: I felt unheard when a plan changed.";
function request(
  body: unknown = { provider: "cloud", excerpt },
  headers: Record<string, string> = {},
) {
  return new NextRequest(`${origin}/api/relish/assist/`, {
    method: "POST",
    headers: {
      origin,
      host: "relish-preview.example",
      "content-type": "application/json",
      "x-relish-consent": "selected-excerpt",
      "x-relish-edition": "adult",
      authorization: "Bearer verified-token",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_URL", "relish-preview.example");
  vi.stubEnv("RELISH_AI_ORIGINS", "");
  vi.stubEnv("OPENAI_API_KEY", "server-only-test-key");
  vi.stubEnv("RELISH_FIREBASE_ADMIN_JSON", "configured");
  vi.mocked(authorizeAI).mockResolvedValue("verified-user");
  vi.mocked(reserveAI).mockResolvedValue();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "A gentle possibility." } }],
        }),
      ),
    ),
  );
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("hosted AI", () => {
  it("advertises cloud availability without local AI or credentials", async () => {
    const res = await GET(new NextRequest(`${origin}/api/relish/assist/`));
    expect(await res.json()).toEqual({
      local: false,
      cloud: true,
      hosted: true,
      dailyLimit: 20,
    });
  });
  it("authenticates and reserves quota before forwarding only the reviewed excerpt", async () => {
    const res = await POST(
      request({
        provider: "cloud",
        excerpt,
        book: "NEVER FORWARD",
        model: "ignore-client-model",
      }),
    );
    expect(res.status).toBe(200);
    expect(authorizeAI).toHaveBeenCalledWith("Bearer verified-token");
    expect(reserveAI).toHaveBeenCalledWith("verified-user");
    const sent = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(sent.messages[1]).toEqual({ role: "user", content: excerpt });
    expect(sent.store).toBe(false);
    expect(sent.model).toBe("gpt-4o-mini");
    expect(JSON.stringify(sent)).not.toMatch(
      /NEVER FORWARD|verified-token|ignore-client-model/,
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it.each([401, 403])(
    "never contacts AI after account rejection %s",
    async (status) => {
      vi.mocked(authorizeAI).mockRejectedValue(
        new AIError("Sign in or verify email.", status),
      );
      expect((await POST(request())).status).toBe(status);
      expect(reserveAI).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("fails closed when quota storage is unavailable", async () => {
    vi.mocked(reserveAI).mockRejectedValue(new Error("database unavailable"));
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("database");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("returns a retry window without consuming an AI request at the limit", async () => {
    vi.mocked(reserveAI).mockRejectedValue(new AIError("Try later.", 429, 60));
    const res = await POST(request());
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(fetch).not.toHaveBeenCalled();
  });
  const rejectedHeaders: Record<string, string>[] = [
    { origin: "https://evil.example" },
    { host: "evil.example", origin: "https://evil.example" },
    { "x-relish-consent": "" },
    { host: "localhost:3210", origin: "http://localhost:3210" },
  ];
  it.each(rejectedHeaders)(
    "rejects origin/consent/host bypass before auth",
    async (headers) => {
      expect((await POST(request(undefined, headers))).status).toBe(403);
      expect(authorizeAI).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("does not allow the hosted server to use its own loopback as a user's local model", async () => {
    expect(
      (await POST(request({ provider: "local", excerpt, model: "test" })))
        .status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["{broken", "null", "[]"])(
    "rejects malformed bodies before auth",
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(authorizeAI).not.toHaveBeenCalled();
    },
  );
  it("bounds actual body bytes even without Content-Length", async () => {
    expect(
      (
        await POST(
          request({ provider: "cloud", excerpt, padding: "a".repeat(30001) }),
        )
      ).status,
    ).toBe(413);
    expect(authorizeAI).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
