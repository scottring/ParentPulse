import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const AI_DAILY_LIMIT = 20;
export class AIError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function services() {
  const name = "relish-hosted-ai";
  let app = getApps().find((app) => app.name === name);
  if (!app) {
    const raw = process.env.RELISH_FIREBASE_ADMIN_JSON;
    if (!raw)
      throw new AIError(
        "Cloud AI is being connected. Please try again later.",
        503,
      );
    const credentials = JSON.parse(raw);
    if (credentials.project_id !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
      throw new AIError(
        "Cloud AI is being connected. Please try again later.",
        503,
      );
    app = initializeApp({ credential: cert(credentials) }, name);
  }
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function authorizeAI(
  authorization: string | null,
): Promise<string> {
  if (!authorization?.startsWith("Bearer ") || authorization.length > 8192)
    throw new AIError(
      "Sign in to use cloud AI. Your book stays on this computer.",
      401,
    );
  const { auth } = services();
  let token;
  try {
    token = await auth.verifyIdToken(authorization.slice(7), true);
  } catch {
    throw new AIError(
      "Your AI session has expired. Please sign in again.",
      401,
    );
  }
  if (!token.email_verified || token.firebase?.sign_in_provider === "anonymous")
    throw new AIError("Verify your email before using cloud AI.", 403);
  return token.uid;
}

// One transaction protects quotas across concurrent requests and server instances.
// Fixed document IDs are reused; no writing, email address, or AI response is stored.
export async function reserveAI(uid: string, now = Date.now()): Promise<void> {
  const { db } = services();
  const day = Math.floor(now / 86_400_000);
  const minute = Math.floor(now / 60_000);
  const retryDay = Math.ceil(((day + 1) * 86_400_000 - now) / 1000);
  const key = createHash("sha256").update(uid).digest("hex");
  const globalRef = db.doc("relish_ai_usage/global");
  const userRef = db.doc(`relish_ai_usage/user-${key}`);
  await db.runTransaction(async (tx) => {
    const [globalSnap, userSnap] = await tx.getAll(globalRef, userRef);
    const global = globalSnap.data();
    const user = userSnap.data();
    const globalCount = global?.day === day ? global.count : 0;
    const userCount = user?.day === day ? user.count : 0;
    const minuteCount = user?.minute === minute ? user.minuteCount : 0;
    if (userCount >= AI_DAILY_LIMIT)
      throw new AIError(
        "You’ve used today’s 20 AI reflections. Your book is still here; come back tomorrow for another perspective.",
        429,
        retryDay,
      );
    if (globalCount >= 200)
      throw new AIError(
        "Cloud AI has reached its daily preview capacity. Please try tomorrow.",
        429,
        retryDay,
      );
    if (minuteCount >= 3)
      throw new AIError(
        "A little breathing room. Please try again in a minute.",
        429,
        60,
      );
    tx.set(globalRef, { day, count: globalCount + 1 });
    tx.set(userRef, {
      day,
      count: userCount + 1,
      minute,
      minuteCount: minuteCount + 1,
    });
  });
}
