"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import { createSoundEngine, type SoundKind } from "@/lib/relish/sound";

const SOUND_KEY = "relish.quiet-sounds.v1";
const EVENT = "relish-sound-change";
let fallback: boolean | undefined;
function readSound() {
  try {
    return fallback ?? localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return fallback ?? false;
  }
}
function subscribe(onChange: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === SOUND_KEY || e.key === null) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", storage);
  };
}
const Sensory = createContext({
  enabled: false,
  unavailable: false,
  toggle: () => {},
  play: (_kind: SoundKind) => {},
});
export function SensoryProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readSound, () => false);
  const engine = useMemo(createSoundEngine, []);
  const [unavailable, setUnavailable] = useState(false);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) engine.stop();
  }, [enabled, engine]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) engine.stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      engine.dispose();
    };
  }, [engine]);
  function play(kind: SoundKind) {
    if (!enabledRef.current || document.hidden) return;
    void engine.play(kind).then((ok) => {
      if (!ok && enabledRef.current && !document.hidden) setUnavailable(true);
    });
  }
  function toggle() {
    const next = !enabled;
    fallback = next;
    enabledRef.current = next;
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      fallback = undefined;
    } catch {
      /* Session-only preference remains available. */
    }
    window.dispatchEvent(new Event(EVENT));
    if (next) {
      setUnavailable(false);
      play("place");
    } else engine.stop();
  }
  return (
    <Sensory.Provider value={{ enabled, unavailable, toggle, play }}>
      <div
        className="r-sensory-root"
        onClickCapture={(e) => {
          const button = (e.target as HTMLElement).closest?.("button");
          if (button && !button.disabled && button.dataset.sound !== "off")
            play("touch");
        }}
      >
        {children}
      </div>
    </Sensory.Provider>
  );
}
export const useSensory = () => useContext(Sensory);
export function SoundControl() {
  const { enabled, toggle } = useSensory();
  return (
    <button
      type="button"
      className={`r-sound-toggle ${enabled ? "r-sound-on" : ""}`}
      onClick={toggle}
      data-sound="off"
      aria-pressed={enabled}
      aria-label={enabled ? "Turn quiet sounds off" : "Turn quiet sounds on"}
      title={enabled ? "Quiet sounds on" : "Quiet sounds off — tap to listen"}
    >
      {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      <span>Sound {enabled ? "on" : "off"}</span>
    </button>
  );
}
export function SoundSettings() {
  const { enabled, unavailable, toggle, play } = useSensory();
  return (
    <div className="r-setting-row">
      <Volume2 size={24} />
      <div>
        <h3>A quieter kind of feedback</h3>
        <p>
          Soft, stone-like taps as you move. A little settling sound when you
          keep something. Sound is optional; movement follows your device’s
          reduced-motion setting.
        </p>
        <div className="r-sound-options">
          <button
            type="button"
            className="r-secondary"
            data-sound="off"
            aria-pressed={enabled}
            onClick={toggle}
          >
            {enabled ? "Turn sounds off" : "Turn quiet sounds on"}
          </button>
          {enabled && (
            <button
              type="button"
              className="r-text-button"
              data-sound="off"
              onClick={() => play("place")}
            >
              Listen to a stone settle <Volume2 size={14} />
            </button>
          )}
        </div>
        {unavailable && (
          <p role="status">
            Sound isn’t available in this browser. Every action still has visual
            feedback.
          </p>
        )}
      </div>
    </div>
  );
}
export function Pebbles({
  small = false,
  animate = false,
}: {
  small?: boolean;
  animate?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`r-pebbles ${small ? "r-pebbles-small" : ""} ${animate ? "r-pebbles-settle" : ""}`}
    >
      <i />
      <i />
      <i />
      <span className="r-pebble-shadow" />
    </span>
  );
}
export function KeptToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="r-kept-toast" role="status">
      <Pebbles small animate />
      <div>
        <span className="r-eyebrow">A SMALL THING, KEPT.</span>
        <p>{message}</p>
      </div>
      <button
        type="button"
        className="r-icon"
        onClick={onDismiss}
        aria-label="Dismiss confirmation"
      >
        <X size={15} />
      </button>
    </div>
  );
}
