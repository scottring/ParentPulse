import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { authorizeAI, reserveAI } from "@/lib/relish/hosted-ai";
vi.mock("@/lib/relish/hosted-ai", async (original) => ({
  ...(await original<typeof import("@/lib/relish/hosted-ai")>()),
  authorizeAI: vi.fn(),
  reserveAI: vi.fn(),
}));
const origin = "https://app.relish.my",
  source = {
    id: "journal:1",
    title: "A moment",
    text: "Fictional family walked together.",
  };
function request(
  payload: unknown = {
    scope: "personal",
    audience: "adult",
    sources: [source],
  },
  headers: Record<string, string> = {},
) {
  return new NextRequest(`${origin}/api/relish/manual/`, {
    method: "POST",
    headers: {
      host: "app.relish.my",
      origin,
      "Content-Type": "application/json",
      Authorization: "Bearer adult",
      "x-relish-consent": "automatic-manual-suggestions",
      "x-relish-edition": "adult",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("RELISH_AI_ORIGINS", origin);
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("RELISH_FIREBASE_ADMIN_JSON", "test");
  vi.stubEnv("RELISH_MANUAL_ZDR_VERIFIED", "true");
  vi.mocked(authorizeAI).mockResolvedValue("adult");
  vi.mocked(reserveAI).mockResolvedValue();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ideas: [
                    {
                      title: "A little space",
                      observation: "A walk might have helped in this moment.",
                      tryThis: "Consider another small walk.",
                      sourceIds: [source.id],
                    },
                  ],
                }),
              },
            },
          ],
        }),
      ),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("manual reflection endpoint", () => {
  it("does not send family data to AI before its retention setup is verified", async () => {
    vi.stubEnv("RELISH_MANUAL_ZDR_VERIFIED", "");
    expect(
      (await GET(new NextRequest(`${origin}/api/relish/manual/`))).status,
    ).toBe(200);
    expect((await POST(request())).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects family requests containing private-source ids and invalid citations from AI", async () => {
    expect(
      (
        await POST(
          request({ scope: "family", audience: "adult", sources: [source] }),
        )
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ideas: [
                  {
                    title: "Unknown",
                    observation: "Unknown",
                    tryThis: "",
                    sourceIds: ["invented"],
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
    expect((await POST(request())).status).toBe(502);
  });
  it("uses an authenticated, quota-limited no-store request and returns only validated ideas", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(authorizeAI).toHaveBeenCalledWith("Bearer adult");
    expect(reserveAI).toHaveBeenCalledWith("adult");
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.store).toBe(false);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content).toContain(
      "require at least two separate pages",
    );
  });
  it("rejects missing consent, foreign origins, unknown editions and oversized inputs", async () => {
    expect(
      (await POST(request(undefined, { "x-relish-consent": "" }))).status,
    ).toBe(403);
    expect(
      (await POST(request(undefined, { origin: "https://other.invalid" })))
        .status,
    ).toBe(403);
    expect(
      (await POST(request(undefined, { "x-relish-edition": "child" }))).status,
    ).toBe(403);
    expect((await POST(request({ text: "x".repeat(56000) }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
});
