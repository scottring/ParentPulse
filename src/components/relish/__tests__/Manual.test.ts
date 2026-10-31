// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useManualGuide } from "../Manual";
import { emptyBook, type Book } from "@/lib/relish/model";
import { manualOf } from "@/lib/relish/manual";
const auth = vi.hoisted(() => ({ current: null as null | typeof account, changed: null as null | ((user: unknown) => void) }));
const account = { uid: "fictional-adult", emailVerified: true, reload: vi.fn().mockResolvedValue(undefined), getIdToken: vi.fn().mockResolvedValue("token") };
vi.mock("@/lib/relish/ai-auth", () => ({ currentAIUser: () => auth.current, getAIAuth: () => ({}), connectAI: vi.fn(() => Promise.resolve(account)) }));
vi.mock("firebase/auth", () => ({ onAuthStateChanged: (_: unknown, callback: typeof auth.changed) => { auth.changed = callback; return () => { auth.changed = null; }; } }));
let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  auth.current = account;
  auth.changed = null;
  account.reload.mockResolvedValue(undefined);
  network = vi.fn((_url: string, init?: RequestInit) => Promise.resolve(Response.json(init?.method === "POST" ? { ideas: [] } : { enabled: true, privacyReady: true })));
  vi.stubGlobal("fetch", network);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function book(): Book {
  return { ...emptyBook("Fictional"), profile: { kind: "adult" },
    moments: [{ id: "private", personId: "person", observation: "A private thought", perspective: "", move: "", reflection: "", createdAt: "2026-10-30T12:00:00Z" }],
    album: [{ id: "approved", title: "Chosen together", text: "An approved family passage", fromName: "Fictional", sourceDate: "2026-10-30T12:00:00Z", createdAt: "2026-10-30T12:01:00Z" }],
    manual: { automatic: { personal: false, family: true }, fingerprints: {}, cards: [] } };
}
const posts = () => network.mock.calls.filter((c) => c[1]?.method === "POST");
it("waits for visit consent, then sends only approved family sources", async () => {
  const current = book(), save = vi.fn().mockResolvedValue(undefined);
  const view = renderHook(() => useManualGuide(current, save, true, false, false));
  await waitFor(() => expect(view.result.current.config?.enabled).toBe(true));
  expect(posts()).toHaveLength(0);
  await act(() => view.result.current.connect("", "", ""));
  await waitFor(() => expect(posts()).toHaveLength(1), { timeout: 4000 });
  const payload = JSON.parse(posts()[0][1]!.body as string);
  expect(payload.scope).toBe("family");
  expect(payload.sources.map((s: {id:string}) => s.id)).toEqual(["album:approved"]);
  expect(JSON.stringify(payload)).not.toContain("A private thought");
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
});
it("aborts an in-flight reflection on sign-out and ignores its late response", async () => {
  let resolve!: (value: Response) => void;
  network.mockImplementation((_url, init) => init?.method === "POST" ? new Promise<Response>((r) => { resolve = r; }) : Promise.resolve(Response.json({ enabled: true })));
  const save = vi.fn(), current = book();
  const view = renderHook(() => useManualGuide(current, save, true, false, false));
  await waitFor(() => expect(view.result.current.config?.enabled).toBe(true));
  await act(() => view.result.current.connect("", "", ""));
  await waitFor(() => expect(posts()).toHaveLength(1), { timeout: 4000 });
  act(() => { auth.current = null; auth.changed?.(null); });
  expect(posts()[0][1]!.signal!.aborted).toBe(true);
  expect(view.result.current.authorized).toBe(false);
  await act(async () => resolve(Response.json({ ideas: [] })));
  expect(save).not.toHaveBeenCalled();
});
it("pauses work in shared views and drops delayed authorization after closing", async () => {
  const current = book(), save = vi.fn();
  current.manual = { ...manualOf(current), automatic: { personal: true, family: true } };
  const view = renderHook(() => useManualGuide(current, save, true, true, false));
  await waitFor(() => expect(view.result.current.config?.enabled).toBe(true));
  let resolve!: () => void;
  account.reload.mockReturnValueOnce(new Promise<void>((r) => { resolve = r; }));
  const pending = view.result.current.connect("", "", "");
  await waitFor(() => expect(account.reload).toHaveBeenCalled());
  view.unmount();
  await act(async () => { resolve(); await pending; });
  expect(posts()).toHaveLength(0);
  expect(save).not.toHaveBeenCalled();
});
