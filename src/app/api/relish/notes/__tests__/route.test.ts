import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { authorizeAI, reserveAI } from "@/lib/relish/hosted-ai";
vi.mock("@/lib/relish/hosted-ai", async (original) => ({
  ...(await original<typeof import("@/lib/relish/hosted-ai")>()),
  authorizeAI: vi.fn(),
  reserveAI: vi.fn(),
}));
const origin = "https://app.relish.my";
const round = {
  players: [
    { name: "Scott", child: false },
    { name: "Kaleb", child: true },
  ],
  answers: ["What’s your favorite dinner? Kaleb: “tacos”"],
  transcript: "Kaleb: I like when Dad does the silly voices.",
};
function request(payload: unknown = round, headers: Record<string, string> = {}) {
  return new NextRequest(`${origin}/api/relish/notes/`, {
    method: "POST",
    headers: {
      host: "app.relish.my",
      origin,
      "Content-Type": "application/json",
      Authorization: "Bearer adult",
      "x-relish-consent": "game-notes",
      "x-relish-edition": "adult",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}
const reply = (notes: unknown) =>
  Response.json({ choices: [{ message: { content: JSON.stringify({ notes }) } }] });
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
    vi.fn().mockResolvedValue(
      reply([{ person: "Kaleb", kind: "appreciates", about: "Scott", text: "Kaleb loves Dad’s silly voices." }]),
    ),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("notes from a game", () => {
  it("says whether children's rounds can use it", async () => {
    expect(await (await GET(new NextRequest(`${origin}/api/relish/notes/`, { headers: { host: "app.relish.my" } }))).json()).toEqual({ enabled: true, children: true });
    vi.stubEnv("RELISH_MANUAL_ZDR_VERIFIED", "");
    expect((await (await GET(new NextRequest(`${origin}/api/relish/notes/`, { headers: { host: "app.relish.my" } }))).json()).children).toBe(false);
  });
  it("returns checked notes, sending only names, answers and what was said, with storage off", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      notes: [{ person: "Kaleb", kind: "appreciates", about: "Scott", text: "Kaleb loves Dad’s silly voices.", from: "said" }],
    });
    const sent = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(sent.store).toBe(false);
    expect(JSON.parse(sent.messages[1].content)).toEqual({
      players: ["Scott", "Kaleb"],
      answers: round.answers,
      transcript: round.transcript,
    });
    expect(reserveAI).toHaveBeenCalledWith("adult");
  });
  it("keeps rounds with a child closed until provider Zero Data Retention is verified", async () => {
    vi.stubEnv("RELISH_MANUAL_ZDR_VERIFIED", "");
    expect((await POST(request())).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    const adults = { ...round, players: [{ name: "Scott", child: false }, { name: "Iris", child: false }] };
    vi.mocked(fetch).mockResolvedValueOnce(reply([]));
    expect((await POST(request(adults))).status).toBe(200);
  });
  it("needs the game's consent, an adult book and a well-formed round", async () => {
    expect((await POST(request(round, { "x-relish-consent": "this-recording" }))).status).toBe(403);
    expect((await POST(request(round, { "x-relish-edition": "parent-assisted-child" }))).status).toBe(403);
    expect((await POST(request({ ...round, players: [] }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("refuses notes about someone who wasn't playing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply([{ person: "Iris", kind: "likes", text: "Iris likes tea." }]));
    expect((await POST(request())).status).toBe(502);
  });
});
