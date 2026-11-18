"use client";
import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { Keyboard } from "lucide-react";
import { createKeyboardEngine, strokeFor } from "@/lib/relish/keyboard-sound";

// On unless turned off. Separate from the quiet interaction sounds.
const KEY = "relish.typing-sounds.v1";
const EVENT = "relish-typing-sound-change";
const VOLUME = 0.55;
let fallback: boolean | undefined;
let engine: ReturnType<typeof createKeyboardEngine> | null = null;
const getEngine = () => (engine ??= createKeyboardEngine());

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
export function setTypingSound(on: boolean) {
  fallback = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
    fallback = undefined;
  } catch {
    /* Session-only preference. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export const useTypingSoundEnabled = () =>
  useSyncExternalStore(subscribe, read, () => false);

/** Spread onto any text field: a clack on each key down, a tick on release. */
export function useTypingSound() {
  const enabled = useTypingSoundEnabled();
  const down = useRef(new Set<string>());
  return {
    onFocus: () => {
      if (enabled) getEngine().warm();
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (!enabled || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const stroke = strokeFor(e.key);
      if (!stroke) return;
      down.current.add(e.code || e.key);
      getEngine().strike(stroke, VOLUME);
    },
    onKeyUp: (e: KeyboardEvent) => {
      const id = e.code || e.key;
      if (!down.current.delete(id) || !enabled) return;
      getEngine().strike("up", VOLUME);
    },
  };
}

export function TypingSoundToggle() {
  const enabled = useTypingSoundEnabled();
  return (
    <button
      type="button"
      className="rj-typing-toggle"
      data-sound="off"
      aria-pressed={enabled}
      onClick={() => {
        setTypingSound(!enabled);
        if (!enabled) getEngine().warm();
      }}
    >
      <Keyboard size={16} /> Keyboard sound {enabled ? "on" : "off"}
    </button>
  );
}

export function TypingSoundSetting() {
  return (
    <div className="r-setting-row">
      <Keyboard size={24} />
      <div>
        <h3>Keyboard sound</h3>
        <p>
          A mechanical-keyboard click as you type in your journal, timed to each
          key. Separate from the other sounds.
        </p>
        <div className="r-sound-options">
          <TypingSoundToggle />
        </div>
      </div>
    </div>
  );
}
