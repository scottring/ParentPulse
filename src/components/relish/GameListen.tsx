"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { currentAIUser } from "@/lib/relish/ai-auth";
import { VOICE_BYTES, VOICE_TEXT_LIMIT } from "@/lib/relish/transcription";
import type { Game } from "@/lib/relish/living";

// Listen (Scott, 2026-11-19): records what's said at the table during a game,
// in pieces under the voice service's two-minute limit, and turns each into
// text as it goes. The text stays in this tab's memory for the round, is read
// once for notes at the end, and is never saved. Recordings aren't kept.
const PIECE_MS = 100_000;
const transcripts = new Map<string, string[]>();
export const transcriptOf = (gameId: string) => (transcripts.get(gameId) || []).join("\n");
export const forgetTranscript = (gameId: string) => void transcripts.delete(gameId);

/** A player counts as a child unless they're the book's owner or set as an adult. */
export const isChildPlayer = (p: Game["players"][number]) =>
  p.id !== "owner" && p.audience !== "adult";

type State = "off" | "starting" | "on" | "stopping";

export function useListen(game: Game) {
  const [state, setState] = useState<State>("off");
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState(0);
  const [heard, setHeard] = useState(() => (transcripts.get(game.id) || []).length);
  const [error, setError] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const listening = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  const child = game.players.some(isChildPlayer);
  const gameId = game.id;

  const release = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const send = useCallback(
    async (clip: Blob) => {
      const user = currentAIUser();
      if (!user || !clip.size || clip.size > VOICE_BYTES) return;
      setPending((n) => n + 1);
      try {
        const response = await fetch("/api/relish/transcribe/", {
          method: "POST",
          headers: {
            "Content-Type": clip.type,
            Authorization: `Bearer ${await user.getIdToken()}`,
            "x-relish-consent": "this-game",
            "x-relish-edition": child ? "parent-assisted-child" : "adult",
          },
          body: clip,
          signal: AbortSignal.timeout(55_000),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Part of what was said couldn’t be written down.");
        if (typeof result.text === "string" && result.text.trim() && result.text.length <= VOICE_TEXT_LIMIT) {
          const lines = transcripts.get(gameId) || [];
          transcripts.set(gameId, [...lines, result.text.trim()]);
          if (alive.current) setHeard(lines.length + 1);
        }
        if (response.status === 429) listening.current = false;
      } catch (e) {
        if (alive.current)
          setError(
            e instanceof Error && e.name !== "TimeoutError"
              ? e.message
              : "Part of what was said took too long to write down.",
          );
      } finally {
        if (alive.current) setPending((n) => n - 1);
      }
    },
    [child, gameId],
  );

  const stop = useCallback(() => {
    listening.current = false;
    if (recorder.current?.state === "recording") {
      setState("stopping");
      recorder.current.stop();
    } else {
      release();
      setState("off");
    }
  }, [release]);

  const start = useCallback(async () => {
    setError("");
    const user = currentAIUser();
    if (!user?.emailVerified) {
      setError("Sign in to your Relish account to use Listen.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser can’t record here. Try a recent Safari, Chrome or Edge.");
      return;
    }
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) =>
      MediaRecorder.isTypeSupported(t),
    );
    if (!mimeType) {
      setError("This browser’s audio format isn’t supported. Try Safari, Chrome or Edge.");
      return;
    }
    // Each piece is its own recording, so every one is a whole file the
    // voice service can read; the next starts as soon as one stops.
    const piece = (media: MediaStream, mimeType: string) => {
      const rec = new MediaRecorder(media, { mimeType, audioBitsPerSecond: 64_000 });
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        void send(new Blob(chunks, { type: rec.mimeType }));
        if (listening.current && stream.current === media) piece(media, mimeType);
        else {
          release();
          if (alive.current) setState("off");
        }
      };
      rec.onerror = () => {
        listening.current = false;
        if (alive.current) setError("The microphone was interrupted. Tap Listen to start again.");
      };
      rec.start(1000);
      timers.current.push(setTimeout(() => rec.state === "recording" && rec.stop(), PIECE_MS));
    };
    setState("starting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (!alive.current || document.hidden) {
        media.getTracks().forEach((t) => t.stop());
        setState("off");
        return;
      }
      stream.current = media;
      listening.current = true;
      setSeconds(0);
      setState("on");
      const tick = () => {
        if (!listening.current) return;
        setSeconds((n) => n + 1);
        timers.current.push(setTimeout(tick, 1000));
      };
      timers.current.push(setTimeout(tick, 1000));
      piece(media, mimeType);
    } catch (e) {
      release();
      setState("off");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Microphone access is off. Allow it in your browser’s site settings, then tap Listen."
          : "The microphone couldn’t start. Typed answers still make notes.",
      );
    }
  }, [release, send]);

  // Stop when the screen goes away (a locked phone can't keep listening) and
  // when the game closes.
  useEffect(() => {
    alive.current = true;
    const hidden = () => {
      if (document.hidden && listening.current) {
        stop();
        setError("Listen stopped when the screen went away. Tap Listen to start again.");
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      listening.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      else release();
      alive.current = false;
    };
  }, [release, stop]);

  return { state, seconds, pending, heard, error, start, stop };
}

export type Listen = ReturnType<typeof useListen>;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The Listen switch, with a plain consent step the first time in a round. */
export function ListenBar({ listen, busy }: { listen: Listen; busy: boolean }) {
  const [asking, setAsking] = useState(false);
  const on = listen.state === "on" || listen.state === "starting";
  return (
    <div className="lb-listen" role="group" aria-label="Listen">
      {asking && !on ? (
        <div className="lb-listen-ask">
          <p>
            <b>Listen while you play?</b> Relish records what’s said at the table in short
            pieces and turns it into text. At the end it pulls out notes about each player for
            you to review. Recordings aren’t kept, and the text is used once for the notes,
            then let go. Make sure everyone playing knows it’s on.
          </p>
          <div className="lb-actions">
            <button
              type="button"
              className="lb-primary"
              disabled={busy}
              onClick={() => {
                setAsking(false);
                void listen.start();
              }}
            >
              <Mic size={16} /> Start listening
            </button>
            <button type="button" className="lb-text" onClick={() => setAsking(false)}>
              Not now
            </button>
          </div>
        </div>
      ) : on ? (
        <button type="button" className="lb-listen-toggle is-on" aria-pressed="true" onClick={listen.stop}>
          <span className="lb-listen-dot" aria-hidden="true" />
          Listening · {clock(listen.seconds)}
          <Square size={14} aria-hidden="true" /> <span className="lb-listen-stop">Stop</span>
        </button>
      ) : (
        <button
          type="button"
          className="lb-listen-toggle"
          aria-pressed="false"
          disabled={busy || listen.state === "stopping"}
          onClick={() => setAsking(true)}
        >
          <Mic size={16} aria-hidden="true" /> Listen
        </button>
      )}
      {(listen.pending > 0 || listen.heard > 0) && !asking && (
        <span className="lb-listen-status" role="status">
          {listen.pending > 0 ? "Writing down what was said…" : `${listen.heard} ${listen.heard === 1 ? "piece" : "pieces"} written down`}
        </span>
      )}
      {listen.error && (
        <p className="lb-listen-error" role="alert">
          {listen.error}
        </p>
      )}
    </div>
  );
}
