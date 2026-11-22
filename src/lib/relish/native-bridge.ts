/**
 * The narrow bridge between this page and the Relish iPhone app (2026-11-22).
 *
 * The page tells the app only what its widgets and Table mode need: tonight's
 * activity, a line from Our family journal when a grown-up has turned that on,
 * and whether Table mode is open. The app tells the page where to go (a new
 * entry, Table mode, Spot it!, the games), hands over words or a photo shared
 * to Relish from another app, and says when the phone is standing up.
 *
 * Every message carries `v: 1` and is checked on both sides; anything else is
 * ignored. The app only accepts messages from the main frame of its trusted
 * origin. In a browser there is no app, and nothing is posted.
 */
import type { FamilyPage } from "./family-pages";
import type { TableTonight } from "./table-mode";

export const BRIDGE_VERSION = 1;
/** Limits the app enforces too (ios/Relish/RelishBridge.swift). */
export const WIDGET_LIMITS = { when: 80, title: 120, prompt: 300, line: 280, who: 120 } as const;
export const SHARE_TEXT_LIMIT = 8000;
/** A shared photo arrives as a JPEG data URL of at most this many characters (about 6 MB). */
export const SHARE_IMAGE_LIMIT = 8_000_000;

export type WidgetTonight = Pick<TableTonight, "when" | "title" | "prompt">;
export type WidgetFamilyLine = { text: string; who: string };
/** Page → app. */
export type PageMessage =
  | { v: 1; type: "ready" }
  | { v: 1; type: "widgets"; tonight: WidgetTonight | null; familyLine: WidgetFamilyLine | null }
  | { v: 1; type: "table"; open: boolean }
  | { v: 1; type: "share-received"; id: string };

/** Where the app can send the page. */
export const nativePlaces = ["new-entry", "table", "spot", "play", "family"] as const;
export type NativePlace = (typeof nativePlaces)[number];
/** App → page. */
export type NativeMessage =
  | { v: 1; type: "open"; place: NativePlace }
  | { v: 1; type: "share"; id: string; text: string; image?: string }
  | { v: 1; type: "posture"; tent: boolean };

const clip = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
/** What the widgets may show. A null family line clears the one the app stored. */
export function widgetMessage(
  tonight: WidgetTonight | null,
  familyLine: WidgetFamilyLine | null,
): PageMessage {
  return {
    v: 1,
    type: "widgets",
    tonight: tonight && {
      when: clip(tonight.when, WIDGET_LIMITS.when),
      title: clip(tonight.title, WIDGET_LIMITS.title),
      prompt: clip(tonight.prompt, WIDGET_LIMITS.prompt),
    },
    familyLine:
      familyLine && familyLine.text.trim()
        ? { text: clip(familyLine.text, WIDGET_LIMITS.line), who: clip(familyLine.who, WIDGET_LIMITS.who) }
        : null,
  };
}
/**
 * The family-line widget's words: the newest passage someone shared to Our
 * family journal, with its caption ("Leo, at bedtime"). Only passages, never a
 * whole page or a game note, and never anything private.
 */
export function familyLineFor(pages: Pick<FamilyPage, "kind" | "text" | "caption" | "byName" | "createdAt">[]): WidgetFamilyLine | null {
  const passage = pages
    .filter((p) => p.kind === "passage" && p.text.trim())
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!passage) return null;
  const date = new Date(passage.createdAt);
  const day = Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const who = passage.caption?.trim() || passage.byName;
  return { text: passage.text, who: day ? `${who} · ${day}` : who };
}

const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const onlyKeys = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).every((k) => keys.includes(k));
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
/** Checks a message from the app; anything unexpected is null and ignored. */
export function parseNativeMessage(value: unknown): NativeMessage | null {
  if (!obj(value) || value.v !== BRIDGE_VERSION) return null;
  if (value.type === "open" && onlyKeys(value, ["v", "type", "place"]))
    return nativePlaces.includes(value.place as NativePlace)
      ? { v: 1, type: "open", place: value.place as NativePlace }
      : null;
  if (value.type === "posture" && onlyKeys(value, ["v", "type", "tent"]))
    return typeof value.tent === "boolean" ? { v: 1, type: "posture", tent: value.tent } : null;
  if (value.type === "share" && onlyKeys(value, ["v", "type", "id", "text", "image"])) {
    if (!text(value.id, 100) || !/^[A-Za-z0-9-]+$/.test(value.id)) return null;
    if (!text(value.text, SHARE_TEXT_LIMIT)) return null;
    const image = value.image;
    if (
      image !== undefined &&
      !(text(image, SHARE_IMAGE_LIMIT) && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image))
    )
      return null;
    if (!value.text.trim() && !image) return null;
    return { v: 1, type: "share", id: value.id, text: value.text, ...(image ? { image } : {}) };
  }
  return null;
}

type Handler = { postMessage: (message: unknown) => void };
type NativeWindow = Window & {
  webkit?: { messageHandlers?: { relish?: Handler } };
  relishNative?: { receive: (message: unknown) => boolean };
};
const nativeHandler = () =>
  typeof window === "undefined" ? undefined : (window as NativeWindow).webkit?.messageHandlers?.relish;
/** Whether this page is running inside the Relish iPhone app. */
export const inNativeApp = () => !!nativeHandler();
/** Sends a message to the app; does nothing in a browser. */
export function postToNative(message: PageMessage) {
  try {
    nativeHandler()?.postMessage(message);
  } catch {
    // The app went away mid-message (a reload); the next change sends again.
  }
}
/**
 * Listens for the app. The app calls `window.relishNative.receive(message)`;
 * it returns whether the page took it. Returns the function that stops
 * listening. Only the newest listener receives.
 */
export function listenToNative(onMessage: (message: NativeMessage) => boolean) {
  if (typeof window === "undefined") return () => {};
  const w = window as NativeWindow;
  const receiver = {
    receive(raw: unknown) {
      const message = parseNativeMessage(raw);
      return message ? onMessage(message) : false;
    },
  };
  w.relishNative = receiver;
  return () => {
    if (w.relishNative === receiver) delete w.relishNative;
  };
}

/**
 * The family-line widget, per journal on this device. Off until a grown-up
 * turns it on in Settings.
 */
const familyLineKey = (edition: string) => `relish.widget.familyLine.v1:${edition}`;
export function readFamilyLineWidget(edition: string) {
  try {
    return localStorage.getItem(familyLineKey(edition)) === "on";
  } catch {
    return false;
  }
}
export function writeFamilyLineWidget(edition: string, on: boolean) {
  try {
    if (on) localStorage.setItem(familyLineKey(edition), "on");
    else localStorage.removeItem(familyLineKey(edition));
  } catch {
    /* Without storage the widget stays off. */
  }
}
/** A shared photo as a file the journal's photo path can take. */
export async function sharedImageFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], "shared-photo.jpg", { type: "image/jpeg" });
}
