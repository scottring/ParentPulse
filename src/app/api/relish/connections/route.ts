import { NextRequest, NextResponse } from "next/server";
import { AIError, authorizeAI, services } from "@/lib/relish/hosted-ai";
import { deleteOnlineAccount } from "@/lib/relish/delete-account";
import { connectionAction } from "@/lib/relish/connections-server";
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
      request.headers.get("x-relish-consent") !== "chosen-connection"
    )
      throw new AIError("Open Relish to manage your family connections.", 403);
    const uid = await authorizeAI(request.headers.get("authorization"));
    if (request.headers.get("x-relish-edition") !== "adult")
      throw new AIError(
        "Online connections are available only from a configured adult edition.",
        403,
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new AIError("Send a JSON request.", 415);
    const reader = request.body?.getReader();
    if (!reader) throw new AIError("Choose an action.", 400);
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 600000) {
          await reader.cancel();
          throw new AIError("This passage is too large.", 413);
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
      throw new AIError("Choose an action.", 400);
    if (data.action === "deleteAccount") {
      if (data.confirmation !== "DELETE ONLINE ACCOUNT")
        throw new AIError("Confirm account removal first.", 400);
      const token = await services().auth.verifyIdToken(
        request.headers.get("authorization")!.slice(7),
        true,
      );
      if (Date.now() / 1000 - token.auth_time > 900)
        throw new AIError(
          "Sign out and sign in again before deleting your online account.",
          401,
        );
      return NextResponse.json(await deleteOnlineAccount(uid), { headers });
    }
    return NextResponse.json(await connectionAction(uid, data), { headers });
  } catch (e) {
    const known = e instanceof AIError;
    return NextResponse.json(
      {
        error: known
          ? e.message
          : "The connection is unavailable. Your private book is safe here; try again later.",
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
