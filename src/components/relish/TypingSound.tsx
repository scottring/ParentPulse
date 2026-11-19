"use client";
import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { Keyboard, Pencil, VolumeX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  createKeyboardEngine,
  KEYBOARD,
  PENCIL,
  strokeFor,
} from "@/lib/relish/keyboard-sound";

// The sound of writing in the journal: a keyboard (the default), a pencil on
// paper, or nothing. Separate from the quiet interaction sounds. Stored as
// "on" (keyboard, as before the pencil existed), "pencil" or "off".
export type TypingVoice = "keyboard" | "pencil" | "off";
const KEY = "relish.typing-sounds.v1";
const EVENT = "relish-typing-sound-change";
const VOLUME: Record<Exclude<TypingVoice, "off">, number> = {
  keyboard: 0.55,
  pencil: 0.5,
};
const VOICES: { voice: TypingVoice; label: string; icon: LucideIcon }[] = [
  { voice: "keyboard", label: "Keyboard", icon: Keyboard },
  { voice: "pencil", label: "Pencil", icon: Pencil },
  { voice: "off", label: "Off", icon: VolumeX },
];
let fallback: TypingVoice | undefined;
const engines: Partial<
  Record<Exclude<TypingVoice, "off">, ReturnType<typeof createKeyboardEngine>>
> = {};
const getEngine = (voice: Exclude<TypingVoice, "off">) =>
  (engines[voice] ??= createKeyboardEngine(
    voice === "pencil" ? PENCIL : KEYBOARD,
  ));

export function parseVoice(stored: string | null): TypingVoice {
  return stored === "off" ? "off" : stored === "pencil" ? "pencil" : "keyboard";
}
function read(): TypingVoice {
  try {
    return fallback ?? parseVoice(localStorage.getItem(KEY));
  } catch {
    return fallback ?? "keyboard";
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
export function setTypingVoice(voice: TypingVoice) {
  fallback = voice;
  try {
    localStorage.setItem(KEY, voice === "keyboard" ? "on" : voice);
    fallback = undefined;
  } catch {
    /* Session-only preference. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export const useTypingVoice = () =>
  useSyncExternalStore(subscribe, read, () => "off" as TypingVoice);

/**
 * Spread onto any text field. Keyboard: a clack on each key down, a tick on
 * release. Pencil: a short scratch for each letter and line, and quiet for
 * spaces and deletions, the way a pencil lifts between words.
 */
export function useTypingSound() {
  const voice = useTypingVoice();
  const down = useRef(new Set<string>());
  return {
    onFocus: () => {
      if (voice !== "off") getEngine(voice).warm();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (voice === "off" || e.repeat || e.metaKey || e.ctrlKey || e.altKey)
        return;
      const stroke = strokeFor(e.key);
      if (!stroke) return;
      if (voice === "pencil" && (stroke === "space" || stroke === "delete"))
        return;
      down.current.add(e.code || e.key);
      getEngine(voice).strike(stroke, VOLUME[voice]);
    },
    onKeyUp: (e: KeyboardEvent) => {
      const id = e.code || e.key;
      if (!down.current.delete(id) || voice !== "keyboard") return;
      getEngine(voice).strike("up", VOLUME[voice]);
    },
  };
}

function VoiceChoices() {
  const current = useTypingVoice();
  return (
    <>
      {VOICES.map(({ voice, label, icon: Icon }) => (
        <button
          key={voice}
          type="button"
          className="rj-typing-toggle"
          data-sound="off"
          aria-pressed={current === voice}
          onClick={() => {
            setTypingVoice(voice);
            if (voice !== "off") getEngine(voice).warm();
          }}
        >
          <Icon size={16} /> {label}
        </button>
      ))}
    </>
  );
}

/** The choice in the journal's page options. */
export function TypingSoundToggle() {
  return (
    <fieldset className="rj-typing-voices">
      <legend>Typing sound</legend>
      <div>
        <VoiceChoices />
      </div>
    </fieldset>
  );
}

export function TypingSoundSetting() {
  return (
    <div className="r-setting-row">
      <Keyboard size={24} />
      <div>
        <h3>Typing sound</h3>
        <p>
          A sound as you write in your journal, timed to each key: a
          mechanical keyboard, or a pencil on paper. Separate from the other
          sounds.
        </p>
        <div className="r-sound-options rj-typing-voices">
          <VoiceChoices />
        </div>
      </div>
    </div>
  );
}
