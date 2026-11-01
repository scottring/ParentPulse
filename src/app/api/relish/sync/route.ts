import { NextRequest, NextResponse } from "next/server";
import { AIError, services } from "@/lib/relish/hosted-ai";
import { syncAction } from "@/lib/relish/book-sync-server";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const host = (
      request.headers.get("host") || request.nextUrl.host
    ).toLowerCase();
    const local =
      !process.env.VERCEL &&
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(request.nextUrl.hostname);
    const origin = `${local ? "http" : "https"}://${host}`;
    const allowed = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
      .filter(Boolean)
      .map((h) => `https://${h}`);
    for (const value of (process.env.RELISH_AI_ORIGINS || "").split(",")) {
      try {
        const u = new URL(value.trim());
        if (u.protocol === "https:") allowed.push(u.origin);
      } catch {}
    }
    if (
      (!local && !allowed.includes(origin)) ||
      request.headers.get("origin") !== origin ||
      request.headers.get("x-relish-consent") !== "encrypted-library"
    )
      throw new AIError("Open Relish to access your encrypted library.", 403);
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ") || authorization.length > 8192)
      throw new AIError("Sign in to your adult account to sync books.", 401);
    const { auth } = services();
    let token;
    try {
      token = await auth.verifyIdToken(authorization.slice(7), true);
    } catch {
      throw new AIError(
        "Your account session expired. Please sign in again.",
        401,
      );
    }
    if (
      !token.email_verified ||
      token.firebase?.sign_in_provider === "anonymous"
    )
      throw new AIError("Verify your email before syncing books.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new AIError("Send a JSON request.", 415);
    const reader = request.body?.getReader();
    if (!reader) throw new AIError("Choose a sync action.", 400);
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 600000) {
          await reader.cancel();
          throw new AIError("This sync request is too large.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    let data;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AIError("This request could not be read.", 400);
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new AIError("Choose a sync action.", 400);
    return NextResponse.json(await syncAction(token.uid, data), { headers });
  } catch (e) {
    const known = e instanceof AIError;
    return NextResponse.json(
      {
        error: known
          ? e.message
          : "Sync is unavailable. Your saved book remains on this device; try again later.",
      },
      {
        status: known ? e.status : 503,
        headers: {
          ...headers,
          ...(known && e.retryAfter
            ? { "Retry-After": String(e.retryAfter) }
            : {}),
        },
      },
    );
  }
}
