import { NextRequest, NextResponse } from "next/server";
import { AIError, authorizeAI, reserveVoice } from "@/lib/relish/hosted-ai";
import { connection } from "@/lib/relish/request-origin";
import {
  audioExtension,
  audioMatches,
  VOICE_BYTES,
  VOICE_SECONDS,
  VOICE_TEXT_LIMIT,
} from "@/lib/relish/transcription";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
function configured(request: NextRequest) {
  const { local, hosted } = connection(request);
  return !!(
    (local || hosted) &&
    process.env.OPENAI_API_KEY &&
    process.env.RELISH_FIREBASE_ADMIN_JSON
  );
}
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      enabled: configured(request),
      children:
        configured(request) &&
        process.env.RELISH_VOICE_CHILDREN_ZDR_VERIFIED === "true",
      maxSeconds: VOICE_SECONDS,
      provider: "OpenAI",
    },
    { headers },
  );
}
export async function POST(request: NextRequest) {
  const fail = (error: string, status: number, retryAfter?: number) =>
    NextResponse.json(
      { error },
      {
        status,
        headers: {
          ...headers,
          ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
        },
      },
    );
  try {
    const { local, hosted, origin } = connection(request);
    if (
      (!local && !hosted) ||
      request.headers.get("origin") !== origin ||
      request.headers.get("x-relish-consent") !== "this-recording"
    )
      throw new AIError(
        "Open Relish and choose the recording you want to turn into words.",
        403,
      );
    const edition = request.headers.get("x-relish-edition");
    if (edition !== "adult" && edition !== "parent-assisted-child")
      throw new AIError("An adult needs to connect voice writing first.", 403);
    if (
      edition === "parent-assisted-child" &&
      process.env.RELISH_VOICE_CHILDREN_ZDR_VERIFIED !== "true"
    )
      throw new AIError(
        "Children’s online voice writing is waiting for its privacy setup. You can still write and add photos.",
        403,
      );
    if (!configured(request))
      throw new AIError(
        "Voice writing is being connected. Please try again later.",
        503,
      );
    // All environments require a verified adult account; local hosts have no auth bypass.
    const uid = await authorizeAI(request.headers.get("authorization"));
    const type = request.headers.get("content-type") || "";
    const ext = audioExtension(type);
    if (!ext)
      throw new AIError(
        "This recording format is not supported. Try recording again.",
        415,
      );
    if (Number(request.headers.get("content-length")) > VOICE_BYTES)
      throw new AIError("This recording is too large. Try a shorter one.", 413);
    const reader = request.body?.getReader();
    if (!reader) throw new AIError("Record a few words first.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > VOICE_BYTES) {
          await reader.cancel();
          throw new AIError(
            "This recording is too large. Try a shorter one.",
            413,
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks);
    if (!audioMatches(bytes, type))
      throw new AIError(
        "This audio couldn’t be read. Please record it again.",
        400,
      );
    await reserveVoice(uid);
    const body = new FormData();
    body.append(
      "model",
      process.env.RELISH_TRANSCRIPTION_MODEL || "gpt-transcribe",
    );
    body.append(
      "file",
      new Blob([bytes], { type: type.split(";")[0] }),
      `recording.${ext}`,
    );
    // Only this clip is sent. No book text, photos, names, or private tags become prompts.
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
      },
    );
    if (!response.ok)
      throw new AIError(
        "The voice service couldn’t finish. Your recording is still here; try again.",
        502,
      );
    const data = await response.json();
    if (typeof data.text !== "string" || !data.text.trim())
      throw new AIError(
        "No words came through clearly. Try again a little closer to the microphone.",
        422,
      );
    if (data.text.length > VOICE_TEXT_LIMIT)
      throw new AIError(
        "That recording contains too many words for one take. Try a shorter recording.",
        422,
      );
    return NextResponse.json({ text: data.text.trim() }, { headers });
  } catch (error) {
    if (error instanceof AIError)
      return fail(error.message, error.status, error.retryAfter);
    return fail(
      "The voice connection was interrupted. Your recording is still here; try again.",
      503,
    );
  }
}
