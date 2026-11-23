"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  cameraName,
  cameraOptions,
  cameraProblem,
  captureFrame,
  chooseCamera,
  hasIPhoneCamera,
  isMac,
  rememberCamera,
  rememberedCamera,
  type CameraOption,
  type CameraProblem,
} from "@/lib/relish/camera";
import "./family.css";
import "./camera.css";

const focusable = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => !el.hasAttribute("disabled"));

const problems: Record<CameraProblem, string> = {
  denied:
    "Relish isn’t allowed to use the camera. Allow the camera for this site in your browser’s settings, or choose a file instead.",
  none: "No camera was found on this computer. You can choose a file instead.",
  "in-use":
    "The camera is being used by another app. Close that app and try again, or choose a file instead.",
  other: "The camera couldn’t start. Try again, or choose a file instead.",
};

const IPHONE_HINT =
  "Your iPhone can be the camera: keep it nearby, locked, on the same Apple ID.";

type Phase = "starting" | "live" | "shot" | "problem";

/**
 * Take a photo on a computer (2026-11-23): a live camera preview, then Use
 * this photo or Retake. The photo goes to `onPhoto` like a chosen file, so
 * it is prepared and encrypted the same way. The camera is switched off when
 * the photo is taken, when the sheet closes, and when it goes away.
 */
export default function CameraSheet({
  onPhoto,
  onChooseFile,
  onClose,
}: {
  onPhoto: (file: File) => void;
  /** Opens the ordinary file picker instead. */
  onChooseFile: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [problem, setProblem] = useState<CameraProblem>("other");
  const [message, setMessage] = useState("");
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  // Only shown after a tap, so never rendered on the server.
  const [aspect, setAspect] = useState("4 / 3");
  const [mac] = useState(() => isMac(navigator.userAgent || ""));
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const run = useRef(0);
  const alive = useRef(true);
  const shotUrl = useRef("");
  const sheet = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  async function listCameras() {
    try {
      return cameraOptions((await navigator.mediaDevices.enumerateDevices?.()) ?? []);
    } catch {
      return [];
    }
  }
  /** Back to a fresh preview: Retake, Try again, or another camera. */
  function restart(wanted?: string) {
    stop();
    if (shotUrl.current) URL.revokeObjectURL(shotUrl.current);
    shotUrl.current = "";
    setShot(null);
    setReady(false);
    setMessage("");
    setPhase("starting");
    void start(wanted);
  }
  async function start(wanted?: string) {
    const id = ++run.current;
    const current = () => alive.current && id === run.current;
    stop();
    const ask = (device?: string) =>
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(device ? { deviceId: { exact: device } } : {}),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    // A camera that's gone or busy shouldn't stop the others from starting.
    const open = async (device?: string) => {
      try {
        return await ask(device);
      } catch (e) {
        if (!device || cameraProblem(e) === "denied") throw e;
        return ask();
      }
    };
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== "function")
        throw Object.assign(new Error("No camera"), { name: "NotFoundError" });
      // Before the camera is allowed, cameras have no names to choose by.
      const known = await listCameras();
      let media = await open(
        wanted ?? (known.some((c) => c.label) ? chooseCamera(known, rememberedCamera()) : undefined),
      );
      if (!current()) return media.getTracks().forEach((t) => t.stop());
      let list = await listCameras();
      const active = () => media.getVideoTracks()[0]?.getSettings?.().deviceId ?? "";
      const best = wanted ?? chooseCamera(list, rememberedCamera());
      if (!wanted && best && active() && best !== active()) {
        // Just allowed: now the names show, start the preferred one (an iPhone).
        media.getTracks().forEach((t) => t.stop());
        media = await open(best);
        if (!current()) return media.getTracks().forEach((t) => t.stop());
        list = await listCameras();
      }
      stream.current = media;
      setCameras(list);
      setDeviceId(active() || best || "");
      if (video.current) {
        video.current.srcObject = media;
        video.current.play?.()?.catch?.(() => {});
      }
      setPhase("live");
    } catch (e) {
      if (!current()) return;
      setProblem(cameraProblem(e));
      setPhase("problem");
    }
  }

  useEffect(() => {
    alive.current = true;
    void start();
    const devices = navigator.mediaDevices;
    // An iPhone brought nearby appears as a new camera while the sheet is open.
    const changed = () => {
      void listCameras().then((list) => alive.current && setCameras(list));
    };
    devices?.addEventListener?.("devicechange", changed);
    return () => {
      alive.current = false;
      devices?.removeEventListener?.("devicechange", changed);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      if (shotUrl.current) URL.revokeObjectURL(shotUrl.current);
    };
    // Starts once, when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    returnTo.current = document.activeElement;
    const root = sheet.current;
    (root && focusable(root)[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (!root) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable(root);
      if (!items.length) return;
      const first = items[0],
        last = items.at(-1)!;
      if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  async function take() {
    if (!video.current || !ready) return;
    try {
      const file = await captureFrame(video.current);
      if (!alive.current) return;
      stop();
      setReady(false);
      run.current++;
      const url = URL.createObjectURL(file);
      shotUrl.current = url;
      setShot({ file, url });
      setPhase("shot");
    } catch (e) {
      if (alive.current)
        setMessage(e instanceof Error ? e.message : "That photo didn’t come through. Try again.");
    }
  }
  function choose(id: string) {
    rememberCamera(id);
    setDeviceId(id);
    restart(id);
  }
  function chooseFile() {
    stop();
    onChooseFile();
    onClose();
  }

  // A Mac without an iPhone camera yet: it can be one (Continuity Camera).
  const showHint =
    mac &&
    !hasIPhoneCamera(cameras) &&
    (phase === "starting" || phase === "live" || (phase === "problem" && problem === "none"));
  return (
    <div className="rp-share-backdrop" onClick={onClose}>
      <div
        ref={sheet}
        className="rp-share rc-cam"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rp-fb-grab" aria-hidden="true" />
        <div className="rp-share-head">
          <h2 id={titleId}>{phase === "shot" ? "Keep this photo?" : "Take a photo"}</h2>
          <button type="button" className="rp-fb-x" aria-label="Close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        <div className="rc-cam-frame" hidden={phase === "problem"} style={{ aspectRatio: aspect }}>
          <video
            ref={video}
            aria-label="Camera preview"
            autoPlay
            muted
            playsInline
            hidden={phase !== "live"}
            onLoadedData={(e) => {
              const { videoWidth: w, videoHeight: h } = e.currentTarget;
              if (w && h) setAspect(`${w} / ${h}`);
              setReady(true);
            }}
          />
          {shot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="The photo you just took" />
          )}
          {(phase === "starting" || (phase === "live" && !ready)) && (
            <p className="rc-cam-status" role="status">
              Starting the camera…
            </p>
          )}
        </div>
        {phase === "problem" && (
          <p className="rp-fb-error" role="alert">
            {problems[problem]}
          </p>
        )}
        {message && (
          <p className="rp-fb-error" role="alert">
            {message}
          </p>
        )}
        {phase === "live" && cameras.length > 1 && (
          <label className="rc-cam-choose">
            <span>Camera</span>
            <select value={deviceId} onChange={(e) => choose(e.target.value)}>
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {cameraName(c, i)}
                </option>
              ))}
            </select>
          </label>
        )}
        {showHint && <p className="rc-cam-hint">{IPHONE_HINT}</p>}
        {phase === "shot" ? (
          <div className="rc-cam-row">
            <button type="button" className="lb-secondary" onClick={() => restart(deviceId || undefined)}>
              Retake
            </button>
            <button
              type="button"
              className="rp-share-add"
              onClick={() => {
                if (!shot) return;
                onPhoto(shot.file);
                onClose();
              }}
            >
              Use this photo
            </button>
          </div>
        ) : phase === "problem" ? (
          <div className="rc-cam-row">
            <button type="button" className="lb-secondary" onClick={() => restart()}>
              Try again
            </button>
            <button type="button" className="rp-share-add" onClick={chooseFile}>
              Choose a file instead
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="rp-share-add"
              disabled={phase !== "live" || !ready}
              onClick={() => void take()}
            >
              Take photo
            </button>
            <button type="button" className="rp-share-link rc-cam-file" onClick={chooseFile}>
              Choose a file instead
            </button>
          </>
        )}
      </div>
    </div>
  );
}
