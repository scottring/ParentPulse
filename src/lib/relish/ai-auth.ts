// Online services share an in-memory adult account. Book keys never enter Firebase.
import { getApps, initializeApp } from "firebase/app";
import {
  initializeAuth,
  onAuthStateChanged,
  inMemoryPersistence,
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
    auth = initializeAuth(app, { persistence: inMemoryPersistence });
    onAuthStateChanged(auth, () =>
      window.dispatchEvent(new Event("relish:account")),
    );
    window.addEventListener("relish:locked", () => {
      generation++;
      if (auth) void signOut(auth);
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
  return result.user;
}
export async function disconnectAI() {
  generation++;
  if (auth) await signOut(auth);
}
