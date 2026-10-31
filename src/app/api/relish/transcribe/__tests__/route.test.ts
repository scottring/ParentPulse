import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { AIError, authorizeAI, reserveVoice } from "@/lib/relish/hosted-ai";
import { VOICE_BYTES } from "@/lib/relish/transcription";
vi.mock("@/lib/relish/hosted-ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/relish/hosted-ai")>()),
  authorizeAI: vi.fn(),
  reserveVoice: vi.fn(),
}));
const origin = "https://app.relish.my";
const wav = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69, 1, 2]);
const request = (headers: Record<string, string> = {}, body: BodyInit = wav) =>
  new NextRequest(`${origin}/api/relish/transcribe/`, {
    method: "POST",
    headers: {
      host: "app.relish.my",
      origin,
      "content-type": "audio/wav",
      authorization: "Bearer test",
      "x-relish-consent": "this-recording",
      "x-relish-edition": "adult",
      ...headers,
    },
    body,
  });
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("RELISH_AI_ORIGINS", origin);
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("RELISH_FIREBASE_ADMIN_JSON", "configured");
  vi.stubEnv("RELISH_VOICE_CHILDREN_ZDR_VERIFIED", "");
  vi.mocked(authorizeAI).mockResolvedValue("adult");
  vi.mocked(reserveVoice).mockResolvedValue();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ text: "A tiny adventure." })),
  );
});
describe("hosted transcription boundary", () => {
  it("advertises children as unavailable until the privacy configuration is verified", async () => {
    const res = await GET(new NextRequest(`${origin}/api/relish/transcribe/`));
    expect(await res.json()).toMatchObject({ enabled: true, children: false });
    expect(
      (await POST(request({ "x-relish-edition": "parent-assisted-child" })))
        .status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires explicit consent, an allowed origin, an adult session and a supported edition", async () => {
    for (const h of [
      { origin: "https://other.invalid" },
      { "x-relish-consent": "" },
      { "x-relish-edition": "child" },
    ])
      expect((await POST(request(Object.fromEntries(Object.entries(h).filter(([,v]) => typeof v === "string")) as Record<string,string>))).status).toBe(
        403,
      );
    vi.mocked(authorizeAI).mockRejectedValue(new AIError("Sign in", 401));
    expect((await POST(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects oversized, empty and disguised payloads before consuming quota or calling the provider", async () => {
    expect(
      (await POST(request({}, new Uint8Array(VOICE_BYTES + 1)))).status,
    ).toBe(413);
    expect((await POST(request({}, new Uint8Array()))).status).toBe(400);
    expect((await POST(request({}, "not an audio recording"))).status).toBe(
      400,
    );
    expect((await POST(request({ "content-type": "text/plain" }))).status).toBe(
      415,
    );
    expect(reserveVoice).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("sends only the chosen clip to the transcription endpoint and returns no-store words", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "A tiny adventure." });
    expect(res.headers.get("cache-control")).toBe("no-store");
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    const form = options!.body as FormData;
    expect([...form.keys()]).toEqual(["model", "file"]);
    expect(form.get("model")).toBe("gpt-transcribe");
    expect(await (form.get("file") as File).arrayBuffer()).toEqual(wav.buffer);
  });
  it("applies account limits and handles provider failures without returning provider diagnostics", async () => {
    vi.mocked(reserveVoice).mockRejectedValueOnce(new AIError("Wait", 429, 60));
    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ secret: "internal" }, { status: 500 }),
    );
    const failed = await POST(request());
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain("internal");
  });
  it("accepts parent-assisted recordings only after the server privacy gate is enabled", async () => {
    vi.stubEnv("RELISH_VOICE_CHILDREN_ZDR_VERIFIED", "true");
    expect(
      (await POST(request({ "x-relish-edition": "parent-assisted-child" })))
        .status,
    ).toBe(200);
    expect(authorizeAI).toHaveBeenCalledWith("Bearer test");
  });
});
