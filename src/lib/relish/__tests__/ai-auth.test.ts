import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ init: vi.fn(), signin: vi.fn(), create: vi.fn(), signout: vi.fn(), verify: vi.fn(), session: { currentUser: null }, memory: {} }));
vi.mock("firebase/app", () => ({ getApps: () => [], initializeApp: vi.fn(() => ({})) }));
vi.mock("firebase/auth", () => ({ initializeAuth: mock.init, inMemoryPersistence: mock.memory, signInWithEmailAndPassword: mock.signin, createUserWithEmailAndPassword: mock.create, signOut: mock.signout, sendEmailVerification: mock.verify }));
beforeEach(() => { vi.resetModules(); vi.stubGlobal("window", new EventTarget()); mock.init.mockReturnValue(mock.session); mock.signout.mockResolvedValue(undefined); mock.verify.mockResolvedValue(undefined); });
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
describe("memory-only AI account", () => {
 it("initializes only on demand and signs out when the book locks", async () => {
  const auth = await import("../ai-auth"); expect(auth.currentAIUser()).toBeNull(); expect(mock.init).not.toHaveBeenCalled();
  auth.getAIAuth(); expect(mock.init).toHaveBeenCalledWith({}, { persistence: mock.memory });
  window.dispatchEvent(new Event("relish:locked")); expect(mock.signout).toHaveBeenCalledWith(mock.session);
 });
 it("cannot reconnect an account when a pending sign-in outlives a book lock", async () => {
  let resolve!: (value: unknown) => void; mock.signin.mockReturnValue(new Promise(r => { resolve = r; }));
  const auth = await import("../ai-auth"); const pending = auth.connectAI("qa@example.invalid", "fake password", false);
  window.dispatchEvent(new Event("relish:locked")); resolve({user:{}});
  await expect(pending).rejects.toThrow("book locked"); expect(mock.signout).toHaveBeenCalledTimes(2);
 });
 it("requires a verification email for a newly requested account", async () => {
  const user = {emailVerified:false}; mock.create.mockResolvedValue({user});
  const auth = await import("../ai-auth"); await auth.connectAI("qa@example.invalid", "fake password", true);
  expect(mock.verify).toHaveBeenCalledWith(user);
 });
});
