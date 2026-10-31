"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Check, RotateCcw } from "lucide-react";
import type { User } from "firebase/auth";
import type { Book } from "@/lib/relish/model";
import { verifyParent } from "@/lib/relish/profiles";
import {
  VOICE_BYTES,
  VOICE_SECONDS,
  VOICE_TEXT_LIMIT,
} from "@/lib/relish/transcription";
import { Dialog } from "./BookForms";

type Props = {
  book: Book;
  sample: boolean;
  open: boolean;
  onClose: () => void;
  remaining: number;
  onInsert: (text: string) => void;
};
export default function VoiceWriter(props: Props) {
  return props.open ? <VoiceSession {...props} /> : null;
}
function VoiceSession({ book, sample, onClose, remaining, onInsert }: Props) {
  const child = book.profile?.kind === "child";
  const [config, setConfig] = useState<{
    enabled: boolean;
    children: boolean;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null),
    [approved, setApproved] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [parentPass, setParentPass] = useState("");
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0),
    [clip, setClip] = useState<Blob | null>(null),
    [audioUrl, setAudioUrl] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    alive = useRef(true),
    operation = useRef(false),
    abort = useRef(new AbortController());
  const elapsed = useRef<ReturnType<typeof setInterval> | null>(null),
    deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  function releaseMicrophone() {
    if (elapsed.current) clearInterval(elapsed.current);
    if (deadline.current) clearTimeout(deadline.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    releaseMicrophone();
  }
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    abort.current = controller;
    if (!sample) {
      fetch("/api/relish/transcribe/", {
        signal: controller.signal,
        cache: "no-store",
      })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((c) => {
          if (alive.current) setConfig(c);
        })
        .catch(() => {
          if (alive.current)
            setError(
              "Voice writing couldn’t connect. Please reopen it to try again.",
            );
        });
      import("@/lib/relish/ai-auth")
        .then((a) => {
          if (alive.current) setUser(a.currentAIUser());
        })
        .catch(() => {});
    }
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      alive.current = false;
      controller.abort();
      if (recorder.current) {
        recorder.current.ondataavailable = null;
        recorder.current.onstop = null;
        recorder.current.onerror = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      releaseMicrophone();
      document.removeEventListener("visibilitychange", hidden);
    };
    // The session is deliberately destroyed on close or edition lock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!clip) return;
    const url = URL.createObjectURL(clip);
    setAudioUrl(url); // eslint-disable-line react-hooks/set-state-in-effect
    return () => URL.revokeObjectURL(url);
  }, [clip]);
  async function allow() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      if (
        child &&
        !(await verifyParent(
          book.profile!.kind === "child"
            ? book.profile!.parentLock
            : { salt: "", verifier: "" },
          parentPass,
        ))
      )
        throw new Error("That parent passphrase didn’t match.");
      if (!alive.current) return;
      const auth = await import("@/lib/relish/ai-auth");
      if (!alive.current) return;
      const account = user || (await auth.connectAI(email, password, false));
      await account.reload();
      if (!account.emailVerified)
        throw new Error(
          "Verify the adult account’s email before using voice writing.",
        );
      if (!alive.current) return;
      setUser(account);
      setPassword("");
      setParentPass("");
      setApproved(true);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error && /passphrase|Verify/.test(e.message)
            ? e.message
            : "That sign-in didn’t work. Use a verified adult Relish account.",
        );
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function start() {
    if (operation.current || !approved) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "This browser cannot record here. Try a recent Safari, Chrome or Edge browser.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (!alive.current || document.hidden) {
        media.getTracks().forEach((t) => t.stop());
        if (alive.current) setError("Return to this page and start again when you’re ready.");
        return;
      }
      stream.current = media;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType)
        throw new Error(
          "This browser’s audio format isn’t supported. Try Safari, Chrome or Edge.",
        );
      const rec = new MediaRecorder(media, {
        mimeType,
        audioBitsPerSecond: 64_000,
      });
      recorder.current = rec;
      const chunks: Blob[] = [];
      let size = 0,
        tooLarge = false;
      rec.ondataavailable = (e) => {
        if (!alive.current || !e.data.size) return;
        size += e.data.size;
        if (size > VOICE_BYTES) {
          tooLarge = true;
          stop();
        } else chunks.push(e.data);
      };
      rec.onstop = () => {
        releaseMicrophone();
        if (!alive.current) return;
        setRecording(false);
        if (tooLarge) {
          setError("That recording was too large. Try a shorter take.");
          return;
        }
        const blob = new Blob(chunks, { type: rec.mimeType });
        if (blob.size) setClip(blob);
        else setError("No recording came through. Please try again.");
      };
      rec.onerror = () => {
        stop();
        if (alive.current) {
          setError("The microphone was interrupted. You can try another take.");
          setRecording(false);
        }
      };
      setClip(null);
      setAudioUrl("");
      setTranscript(null);
      setSeconds(0);
      setRecording(true);
      rec.start(1000);
      elapsed.current = setInterval(
        () => setSeconds((n) => Math.min(n + 1, VOICE_SECONDS)),
        1000,
      );
      deadline.current = setTimeout(stop, VOICE_SECONDS * 1000);
    } catch (e) {
      releaseMicrophone();
      if (alive.current)
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Microphone access is off. Allow it in your browser’s site settings, then try again."
            : e instanceof Error
              ? e.message
              : "The microphone couldn’t start.",
        );
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function transcribe() {
    if (!clip || !user || operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      const token = await user.getIdToken();
      if (!alive.current) return;
      const response = await fetch("/api/relish/transcribe/", {
        method: "POST",
        headers: {
          "Content-Type": clip.type,
          Authorization: `Bearer ${token}`,
          "x-relish-consent": "this-recording",
          "x-relish-edition": child ? "parent-assisted-child" : "adult",
        },
        body: clip,
        signal: AbortSignal.any([
          abort.current.signal,
          AbortSignal.timeout(55_000),
        ]),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ||
            "The recording couldn’t be transcribed. Please try again.",
        );
      if (
        typeof result.text !== "string" ||
        result.text.length > VOICE_TEXT_LIMIT
      )
        throw new Error(
          "The voice service returned an unreadable result. Please try again.",
        );
      if (alive.current) setTranscript(result.text);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error && e.name !== "TimeoutError"
            ? e.message
            : "The connection took too long. Your recording is still here; try again.",
        );
    } finally {
      operation.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const ready =
    config?.enabled && (!child || config.children) && !!book.profile;
  return (
    <Dialog title="Tell your story" onClose={onClose}>
      <div className="rj-voice-title">
        <Mic size={32} />
        <p className="lb-kicker">A page starts with your voice</p>
        <h2>
          Go on.
          <br />
          <em>We’re listening.</em>
        </h2>
      </div>
      {sample ? (
        <p>
          Voice writing is available in your private book. This sample never
          opens the microphone or sends a recording.
        </p>
      ) : !book.profile ? (
        <p>
          Choose an adult or child edition in parent settings before connecting
          voice writing.
        </p>
      ) : !config ? (
        <p>Connecting voice writing…</p>
      ) : !ready ? (
        <p>
          {child
            ? "Children’s online voice writing is waiting for its privacy setup. You can still type and add photos."
            : "Voice writing is being connected. Please try again later."}
        </p>
      ) : !approved ? (
        <form
          className="rj-voice-setup"
          onSubmit={(e) => {
            e.preventDefault();
            void allow();
          }}
        >
          <p>
            {child
              ? "A grown-up connects this short voice session. Your child doesn’t need an online account."
              : "Connect with your verified adult Relish account."}
          </p>
          {!user && (
            <>
              <label className="rj-field">
                Adult account email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="rj-field">
                Account password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </>
          )}
          {user && (
            <p className="lb-fine">Using the signed-in adult account.</p>
          )}
          {child && (
            <label className="rj-field">
              Parent passphrase
              <input
                type="password"
                autoComplete="off"
                required
                value={parentPass}
                disabled={busy}
                onChange={(e) => setParentPass(e.target.value)}
              />
            </label>
          )}
          <label className="rj-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              {child
                ? "I’m the parent or guardian and allow this voice session. "
                : "I’m 18 or older. "}
              I understand that only the recording I choose will be sent to
              OpenAI to turn into words.
            </span>
          </label>
          <p className="lb-fine">
            Relish does not save the recording. OpenAI documents no retention of
            audio or transcripts for this transcription endpoint. You’ll review
            the words before adding them to your private book.
          </p>
          <button className="lb-primary" disabled={busy || !consent}>
            {busy ? "Connecting…" : "Connect voice writing"}
          </button>
          {!user && (
            <p className="lb-fine">
              Need an account? Set up an adult account through Connect editions
              first.
            </p>
          )}
        </form>
      ) : transcript !== null ? (
        <>
          <p className="lb-kicker">Does this sound like you?</p>
          <label className="rj-field">
            Your spoken words
            <textarea
              className="rj-transcript"
              rows={7}
              value={transcript}
              maxLength={VOICE_TEXT_LIMIT}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </label>
          <p>
            Fix any names or words it missed. Nothing joins your page until you
            choose it.
          </p>
          {transcript.length + 2 > remaining && (
            <p className="lb-error">
              This page needs a little more room. Shorten this take before
              inserting it.
            </p>
          )}
          <button
            className="lb-primary"
            disabled={!transcript.trim() || transcript.length + 2 > remaining}
            onClick={() => onInsert(transcript.trim())}
          >
            Add these words to my page <Check size={18} />
          </button>
        </>
      ) : (
        <>
          <p>
            Talk about anything. One little story, up to two minutes. You can
            add another take after this one.
          </p>
          {recording ? (
            <div className="rj-recording" role="status">
              <span className="rj-voice-pulse" aria-hidden="true" />
              <strong>
                {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </strong>
              <p>Listening. Take your time.</p>
              <button className="lb-primary" onClick={stop}>
                <Square size={18} /> I’m done talking
              </button>
            </div>
          ) : clip ? (
            <>
              <audio
                src={audioUrl || undefined}
                controls
                aria-label="Review your recording"
              />
              <p className="lb-fine">
                This recording is still on your device. The next button sends
                this clip to OpenAI.
              </p>
              <div className="rj-capture-actions">
                <button
                  className="lb-primary"
                  disabled={busy}
                  onClick={() => void transcribe()}
                >
                  {busy
                    ? "Finding your words…"
                    : "Turn this recording into words"}
                </button>
                <button
                  className="lb-text"
                  disabled={busy}
                  onClick={() => void start()}
                >
                  <RotateCcw size={17} /> Try another take
                </button>
              </div>
            </>
          ) : (
            <button
              className="rj-record-button"
              disabled={busy}
              onClick={() => void start()}
            >
              <Mic size={30} />
              {busy ? "Opening microphone…" : "Start talking"}
            </button>
          )}
        </>
      )}
      {error && (
        <p className="lb-error" role="alert">
          {error}
        </p>
      )}
      <button className="lb-text rj-voice-close" onClick={onClose}>
        {clip || recording || transcript !== null
          ? "Discard this take and go back"
          : "Back to my page"}
      </button>
    </Dialog>
  );
}
