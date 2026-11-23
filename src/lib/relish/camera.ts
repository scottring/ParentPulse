/**
 * Take a photo on a computer (2026-11-23). Phones and tablets open their own
 * camera from a file input with `capture`; desktop browsers ignore `capture`
 * and show a file picker instead, so on a computer Relish opens its own camera
 * sheet. On a Mac, a nearby iPhone appears as a camera of its own (Continuity
 * Camera), and the sheet picks it first.
 */

/** What decides between the phone's own camera and the in-app camera sheet. */
export type CameraEnv = {
  userAgent: string;
  maxTouchPoints: number;
  /** The main pointer is a finger, not a mouse or trackpad. */
  coarsePointer: boolean;
  /** Running inside the Relish iPhone app. */
  inApp: boolean;
  /** `navigator.mediaDevices.getUserMedia` exists. */
  canStream: boolean;
};

/** Phones, tablets and the iPhone app keep the native camera input. */
export function usesNativeCamera(env: CameraEnv): boolean {
  if (env.inApp || !env.canStream) return true;
  if (/android|iphone|ipad|ipod|mobile/i.test(env.userAgent)) return true;
  // iPadOS asks for desktop sites with a Mac user agent, but has touch.
  if (/macintosh/i.test(env.userAgent) && env.maxTouchPoints > 1) return true;
  return env.coarsePointer;
}

export function cameraEnv(): CameraEnv {
  const w = window as Window & {
    webkit?: { messageHandlers?: { relish?: unknown } };
  };
  let coarsePointer = false;
  try {
    coarsePointer = !!w.matchMedia?.("(pointer: coarse)").matches;
  } catch {}
  return {
    userAgent: navigator.userAgent || "",
    maxTouchPoints: navigator.maxTouchPoints || 0,
    coarsePointer,
    inApp: !!w.webkit?.messageHandlers?.relish,
    canStream: typeof navigator.mediaDevices?.getUserMedia === "function",
  };
}

export const isMac = (userAgent: string) => /macintosh|mac os x/i.test(userAgent);

export type CameraOption = { deviceId: string; label: string };
const iPhone = /iphone/i;

/** Cameras the browser has named (names appear once the camera is allowed). */
export function cameraOptions(
  devices: Pick<MediaDeviceInfo, "kind" | "deviceId" | "label">[],
): CameraOption[] {
  return devices
    .filter((d) => d.kind === "videoinput" && d.deviceId)
    .map((d) => ({ deviceId: d.deviceId, label: d.label }));
}

/**
 * The camera to start with: the one chosen last time if it's still here,
 * else an iPhone (Continuity Camera), else the first one.
 */
export function chooseCamera(
  cameras: CameraOption[],
  remembered?: string | null,
): string | undefined {
  if (remembered && cameras.some((c) => c.deviceId === remembered)) return remembered;
  return (cameras.find((c) => iPhone.test(c.label)) ?? cameras[0])?.deviceId;
}

export const hasIPhoneCamera = (cameras: CameraOption[]) =>
  cameras.some((c) => iPhone.test(c.label));

/** "FaceTime HD Camera (05ac:8514)" → "FaceTime HD Camera". */
export function cameraName(camera: CameraOption, index: number): string {
  const name = camera.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, "").trim();
  return name || `Camera ${index + 1}`;
}

export type CameraProblem = "denied" | "none" | "in-use" | "other";
/** What a getUserMedia failure means for the person. */
export function cameraProblem(error: unknown): CameraProblem {
  const name = (error as { name?: string } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError")
    return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError")
    return "none";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError")
    return "in-use";
  return "other";
}

/** Frames are kept at most this many pixels on the long side (photos end at 1600). */
export const FRAME_MAX = 2560;
export function frameSize(width: number, height: number, max = FRAME_MAX) {
  if (!(width > 0 && height > 0)) return null;
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The captured frame as a JPEG file, for the same path as an added photo. */
export function photoFile(blob: Blob, at = new Date()): File {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(
    at.getHours(),
  )}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  return new File([blob], `photo-${stamp}.jpg`, { type: "image/jpeg", lastModified: at.getTime() });
}

/** Draws the live video's current frame and encodes it as a JPEG file. */
export async function captureFrame(video: HTMLVideoElement): Promise<File> {
  const size = frameSize(video.videoWidth, video.videoHeight);
  if (!size) throw new Error("The camera isn’t showing a picture yet. Try again in a moment.");
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can’t take a photo here. Choose a file instead.");
  ctx.drawImage(video, 0, 0, size.width, size.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("That photo didn’t come through. Try again.");
  return photoFile(blob);
}

export const CAMERA_KEY = "relish:camera";
export function rememberedCamera(): string | null {
  try {
    return localStorage.getItem(CAMERA_KEY);
  } catch {
    return null;
  }
}
export function rememberCamera(deviceId: string) {
  try {
    localStorage.setItem(CAMERA_KEY, deviceId);
  } catch {}
}
