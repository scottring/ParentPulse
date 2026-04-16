// Pure handler extracted for testability. Wired into onCall in index.js.

const admin = require("firebase-admin");
const {HttpsError} = require("firebase-functions/v2/https");
const {getOpenAI} = require("./openaiClient.js");
const {toFile} = require("openai");

const MAX_DAILY_SECONDS = 30 * 60;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRICE_PER_MINUTE_CENTS = 0.6;

async function transcribeAudioHandler(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const uid = request.auth.uid;
  const {audioBase64, mimeType, durationSec} = request.data || {};

  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new HttpsError("invalid-argument", "audioBase64 is required");
  }
  if (!mimeType || typeof mimeType !== "string") {
    throw new HttpsError("invalid-argument", "mimeType is required");
  }
  const dur = Number(durationSec) || 0;
  if (dur < 0 || dur > 95) {
    throw new HttpsError("invalid-argument", "durationSec out of range");
  }

  const db = admin.firestore();
  const rateRef = db.collection("rate_limits").doc(uid);
  const rateSnap = await rateRef.get();
  const now = Date.now();
  let windowStartMs = now;
  let secondsUsed = 0;
  if (rateSnap.exists) {
    const data = rateSnap.data();
    if (now - data.windowStartMs < ROLLING_WINDOW_MS) {
      windowStartMs = data.windowStartMs;
      secondsUsed = data.secondsUsed || 0;
    }
  }
  if (secondsUsed + dur > MAX_DAILY_SECONDS) {
    throw new HttpsError(
        "resource-exhausted",
        "Too many recordings. Try again in a minute.",
    );
  }

  const buffer = Buffer.from(audioBase64, "base64");
  const ext = mimeType.includes("mp4") ? "mp4" :
              mimeType.includes("wav") ? "wav" :
              mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3" :
              "webm";
  const file = await toFile(buffer, `audio.${ext}`, {type: mimeType});

  const openai = getOpenAI();
  const text = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "text",
    language: "en",
  });

  const serverTimestamp =
    admin.firestore.FieldValue
      ? admin.firestore.FieldValue.serverTimestamp()
      : null;

  await rateRef.set({
    windowStartMs,
    secondsUsed: secondsUsed + dur,
    updatedAt: serverTimestamp,
  });

  await db.collection("transcription_logs").add({
    uid,
    durationSec: dur,
    costCents: (dur / 60) * PRICE_PER_MINUTE_CENTS,
    timestamp: serverTimestamp,
  });

  return {text: typeof text === "string" ? text : (text?.text || "")};
}

module.exports = {transcribeAudioHandler};
