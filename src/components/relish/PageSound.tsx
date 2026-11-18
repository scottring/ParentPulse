"use client";
import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

// The page-turn sound: real paper page flips (CC0, see
// public/sounds/page/README.md), loaded from this app's own origin and played
// when a page in the reading book turns. On unless turned off, like the
// keyboard sound, and separate from the quiet interaction sounds.
const KEY = "relish.page-sound.v1";
const EVENT = "relish-page-sound-change";
const FILES = [1, 2, 3, 4].map((n) => `/sounds/page/flip-${n}.mp3`);
const VOLUME = 0.5;
let fallback: boolean | undefined;

function read() {
  try {
    return fallback ?? localStorage.getItem(KEY) !== "off";
  } catch {
    return fallback ?? true;
  }
}
function subscribe(onChange: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", storage);
  };
}
export function setPageSound(on: boolean) {
  fallback = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
    fallback = undefined;
  } catch {
    /* Session-only preference. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export const usePageSoundEnabled = () =>
  useSyncExternalStore(subscribe, read, () => false);

let context: AudioContext | null = null;
let buffers: Promise<AudioBuffer[]> | null = null;
let last = -1;

function audio() {
  if (typeof window === "undefined") return null;
  const Audio =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Audio) return null;
  try {
    context ??= new Audio({ latencyHint: "interactive" });
  } catch {
    return null;
  }
  return context;
}

/** Fetches and decodes the flips once; quietly gives up if they can't load. */
export function warmPageSound() {
  const ctx = audio();
  if (!ctx || buffers || !read()) return;
  buffers = Promise.all(
    FILES.map((url) =>
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(url))))
        .then((data) => ctx.decodeAudioData(data)),
    ),
  ).catch(() => {
    buffers = null;
    return [];
  });
}

/** One page turn: a different flip from last time, slightly varied. */
export function playPageTurn() {
  if (typeof document === "undefined" || document.hidden || !read()) return;
  const ctx = audio();
  if (!ctx) return;
  warmPageSound();
  void (async () => {
    try {
      if (ctx.state !== "running") await ctx.resume();
      const list = await buffers;
      if (!list?.length) return;
      let i = Math.floor(Math.random() * list.length);
      if (list.length > 1 && i === last) i = (i + 1) % list.length;
      last = i;
      const source = ctx.createBufferSource();
      source.buffer = list[i];
      source.playbackRate.value = 0.94 + Math.random() * 0.12;
      const gain = ctx.createGain();
      gain.gain.value = VOLUME;
      source.connect(gain).connect(ctx.destination);
      source.start();
    } catch {
      /* Sound is a nicety; reading carries on without it. */
    }
  })();
}

export function PageSoundToggle() {
  const enabled = usePageSoundEnabled();
  return (
    <button
      type="button"
      className="lb-text"
      aria-pressed={enabled}
      onClick={() => {
        setPageSound(!enabled);
        if (!enabled) warmPageSound();
      }}
    >
      {enabled ? <Volume2 size={15} /> : <VolumeX size={15} />} Page sound{" "}
      {enabled ? "on" : "off"}
    </button>
  );
}
