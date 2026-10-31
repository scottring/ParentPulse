// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
const body = {
  provider: "local",
  model: "local-model",
  excerpt: "A short example moment.",
};
function request(
  extra: Record<string, string> = {},
  payload = body,
  url = "http://localhost:3210/api/relish/assist",
) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      origin: "http://localhost:3210",
      "Content-Type": "application/json",
      "x-relish-consent": "selected-excerpt",
      "x-relish-edition": "adult",
      ...extra,
    },
    body: JSON.stringify(payload),
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("explicit AI boundaries", () => {
  it("uses the actual HTTP host when Next normalizes loopback URLs", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("local model offline"));
    vi.stubGlobal("fetch", fetch);
    const res = await POST(
      request({ host: "127.0.0.1:3210", origin: "http://127.0.0.1:3210" }),
    );
    expect(res.status).toBe(503);
    expect(fetch).toHaveBeenCalledOnce();
    fetch.mockClear();
    expect(
      (
        await POST(
          request({ host: "127.0.0.1:3210", origin: "http://localhost:3210" }),
        )
      ).status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests without contacting an AI service", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (await POST(request({ origin: "https://other.example" }))).status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects absent consent and hosted endpoints", async () => {
    expect((await POST(request({ "x-relish-consent": "" }))).status).toBe(403);
    expect(
      (
        await POST(
          request(
            { origin: "https://relish.example" },
            body,
            "https://relish.example/api/relish/assist",
          ),
        )
      ).status,
    ).toBe(403);
  });
  it("sends only the selected excerpt, not a book or unrelated records", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ model_info: { "general.architecture": "llama" } }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: { content: "A tentative perspective." } }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      model: body.model,
    });
    const sent = JSON.parse(fetch.mock.calls[1][1].body);
    expect(sent.messages[1]).toEqual({ role: "user", content: body.excerpt });
    expect(fetch.mock.calls[1][0]).toBe("http://127.0.0.1:11434/api/chat");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it.each([{ remote_model: "remote", remote_host: "https://ollama.com" }, {}])(
    "rejects remote aliases and unverified metadata without sending the excerpt",
    async (metadata) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(metadata), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetch);
      expect((await POST(request())).status).toBe(400);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][1].body).not.toContain(body.excerpt);
    },
  );
  it("disables AI in production unless explicitly enabled for a local installation", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RELISH_LOCAL_AI_ENABLED", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request())).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects cloud-tagged models in the local option", async () => {
    expect(
      (await POST(request({}, { ...body, model: "model:cloud" }))).status,
    ).toBe(400);
  });
  it("returns an actionable error when local AI is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("Your writing is still here");
  });
  it("does not send an excerpt if cloud AI is unconfigured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (await POST(request({}, { ...body, provider: "cloud" }))).status,
    ).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
});

it.each(["", "child", "13-17"])(
  "rejects non-adult edition %s before contacting any AI provider",
  async (edition) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request({ "x-relish-edition": edition }))).status).toBe(
      403,
    );
    expect(fetch).not.toHaveBeenCalled();
  },
);
