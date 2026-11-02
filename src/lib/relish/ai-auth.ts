// One persistent adult account owns the family library and online services.
import { getApps, initializeApp } from "firebase/app";
import {
  initializeAuth,
  onAuthStateChanged,
  browserLocalPersistence,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  type Auth,
} from "firebase/auth";
let auth: Auth | undefined;
let generation = 0;
export function getAIAuth() {
  if (!auth) {
    const name = "relish-ai-account";
    const app =
      getApps().find((app) => app.name === name) ||
      initializeApp(
        {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        },
        name,
      );
    auth = initializeAuth(app, { persistence: browserLocalPersistence });
    onAuthStateChanged(auth, () =>
      window.dispatchEvent(new Event("relish:account")),
    );
    window.addEventListener("relish:locked", () => {
      generation++;
      // Locking a view cancels pending consent/sign-in, not the account session.
    });
  }
  return auth;
}
export function currentAIUser() {
  return auth?.currentUser || null;
}
export async function connectAI(
  email: string,
  password: string,
  create: boolean,
) {
  const session = getAIAuth();
  const before = generation;
  const result = await (
    create ? createUserWithEmailAndPassword : signInWithEmailAndPassword
  )(session, email.trim(), password);
  if (before !== generation) {
    await signOut(session);
    throw new Error("The book locked. Please sign in again.");
  }
  if (create) await sendEmailVerification(result.user);
  setParentGate(null);
  return result.user;
}
export async function disconnectAI() {
  generation++;
  if (auth) await signOut(auth);
}

export async function verifyAccountPassword(uid: string, password: string) {
  const user = currentAIUser();
  if (!user?.email || !user.emailVerified || user.uid !== uid || !password)
    return false;
  try {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );
    return currentAIUser()?.uid === uid;
  } catch {
    return false;
  }
}
// A child view stays behind the parent gate even after a page reload. This is
// a shared-device UI safeguard; the signed-in adult account owns these books.
const gateKey = "relish.parent-gate.v1";
export function setParentGate(lock: import("./profiles").ParentLock | null) {
  if (lock) localStorage.setItem(gateKey, JSON.stringify(lock));
  else localStorage.removeItem(gateKey);
}
export function getParentGate(): import("./profiles").ParentLock | null {
  try {
    return JSON.parse(localStorage.getItem(gateKey) || "null");
  } catch {
    return null;
  }
}
