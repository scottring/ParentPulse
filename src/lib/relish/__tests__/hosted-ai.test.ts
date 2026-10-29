import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  rows: new Map<string, Record<string, number>>(),
  writes: vi.fn(),
}));
vi.mock("firebase-admin/app", () => ({
  cert: vi.fn(),
  getApps: () => [{ name: "relish-hosted-ai" }],
  initializeApp: vi.fn(),
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: mocks.verify }),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    doc: (path: string) => path,
    runTransaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        getAll: async (...paths: string[]) =>
          paths.map((path) => ({ data: () => mocks.rows.get(path) })),
        set: (path: string, data: Record<string, number>) => {
          mocks.rows.set(path, data);
          mocks.writes(path, data);
        },
      }),
  }),
}));
import { authorizeAI, reserveAI } from "../hosted-ai";
beforeEach(() => {
  mocks.rows.clear();
  mocks.verify.mockResolvedValue({
    uid: "user",
    email_verified: true,
    firebase: { sign_in_provider: "password" },
  });
});
afterEach(() => vi.clearAllMocks());
describe("hosted account and durable quota policy", () => {
  it("requires a bearer token and checks account revocation", async () => {
    await expect(authorizeAI(null)).rejects.toMatchObject({ status: 401 });
    await expect(authorizeAI("Bearer valid")).resolves.toBe("user");
    expect(mocks.verify).toHaveBeenCalledWith("valid", true);
  });
  it.each([
    { email_verified: false },
    { email_verified: true, firebase: { sign_in_provider: "anonymous" } },
  ])("rejects unverified and anonymous accounts", async (token) => {
    mocks.verify.mockResolvedValue({ uid: "user", ...token });
    await expect(authorizeAI("Bearer test")).rejects.toMatchObject({
      status: 403,
    });
  });
  it("rejects expired and revoked tokens", async () => {
    mocks.verify.mockRejectedValue(new Error("revoked"));
    await expect(authorizeAI("Bearer test")).rejects.toMatchObject({
      status: 401,
    });
  });
  it("enforces a minute limit and resets its window", async () => {
    for (let i = 0; i < 3; i++) await reserveAI("user", 100000);
    await expect(reserveAI("user", 100001)).rejects.toMatchObject({
      status: 429,
      retryAfter: 60,
    });
    expect(mocks.rows.get("relish_ai_usage/global")?.count).toBe(3);
    await expect(reserveAI("user", 160000)).resolves.toBeUndefined();
  });
  it("limits each user to 20 per UTC day and resets tomorrow", async () => {
    for (let i = 0; i < 20; i++) await reserveAI("user", 100000 + i * 60000);
    await expect(reserveAI("user", 2000000)).rejects.toMatchObject({
      status: 429,
    });
    await expect(reserveAI("user", 86400000 + 100000)).resolves.toBeUndefined();
  });
  it("caps global preview usage across accounts", async () => {
    mocks.rows.set("relish_ai_usage/global", { day: 0, count: 200 });
    await expect(reserveAI("new-user", 100000)).rejects.toMatchObject({
      status: 429,
    });
    expect(mocks.writes).not.toHaveBeenCalled();
  });
  it("stores only opaque account IDs and counters", async () => {
    await reserveAI("private-user-id", 100000);
    const data = JSON.stringify(mocks.writes.mock.calls);
    expect(data).not.toContain("private-user-id");
    expect(mocks.writes.mock.calls[1][1]).toEqual({
      day: 0,
      count: 1,
      minute: 1,
      minuteCount: 1,
    });
  });
});
