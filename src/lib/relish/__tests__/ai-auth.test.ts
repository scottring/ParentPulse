import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  init: vi.fn(),
  signin: vi.fn(),
  create: vi.fn(),
  signout: vi.fn(),
  verify: vi.fn(),
  session: { currentUser: null },
  memory: {},
}));
vi.mock("firebase/app", () => ({
  getApps: () => [],
  initializeApp: vi.fn(() => ({})),
}));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  initializeAuth: mock.init,
  browserLocalPersistence: mock.memory,
  signInWithEmailAndPassword: mock.signin,
  createUserWithEmailAndPassword: mock.create,
  signOut: mock.signout,
  sendEmailVerification: mock.verify,
}));
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", {
    removeItem: vi.fn(),
    setItem: vi.fn(),
    getItem: vi.fn(),
  });
  mock.init.mockReturnValue(mock.session);
  mock.signout.mockResolvedValue(undefined);
  mock.verify.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe("persistent family account", () => {
  it("initializes on demand and keeps the account when a view locks", async () => {
    const auth = await import("../ai-auth");
    expect(auth.currentAIUser()).toBeNull();
    expect(mock.init).not.toHaveBeenCalled();
    auth.getAIAuth();
    expect(mock.init).toHaveBeenCalledWith({}, { persistence: mock.memory });
    window.dispatchEvent(new Event("relish:locked"));
    expect(mock.signout).not.toHaveBeenCalled();
  });
  it("cannot reconnect an account when a pending sign-in outlives a book lock", async () => {
    let resolve!: (value: unknown) => void;
    mock.signin.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const auth = await import("../ai-auth");
    const pending = auth.connectAI(
      "qa@example.invalid",
      "fake password",
      false,
    );
    window.dispatchEvent(new Event("relish:locked"));
    resolve({ user: {} });
    await expect(pending).rejects.toThrow("book locked");
    expect(mock.signout).toHaveBeenCalledTimes(1);
  });
  it("explicit sign-out ends the persistent account", async () => {
    const auth = await import("../ai-auth");
    auth.getAIAuth();
    await auth.disconnectAI();
    expect(mock.signout).toHaveBeenCalledWith(mock.session);
  });
  it("requires a verification email for a newly requested account", async () => {
    const user = { emailVerified: false };
    mock.create.mockResolvedValue({ user });
    const auth = await import("../ai-auth");
    await auth.connectAI("qa@example.invalid", "fake password", true);
    expect(mock.verify).toHaveBeenCalledWith(user);
  });
});
