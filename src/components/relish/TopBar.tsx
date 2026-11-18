"use client";
import { useEffect, useId, useRef, useState } from "react";
import { SoundControl } from "./Sensory";

export type Place = "home" | "do" | "book" | "family";
export const places: { id: Place; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "do", label: "Do something" },
  { id: "book", label: "Your book" },
  { id: "family", label: "Family" },
];

export type MenuItem =
  | {
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      divider?: boolean;
    }
  | "sound";

/** The one top bar: wordmark, the four places, and a small menu. */
export default function TopBar({
  current,
  initial,
  disabled,
  onPlace,
  items,
  status,
}: {
  current: Place;
  initial: string;
  disabled: boolean;
  onPlace: (place: Place) => void;
  items: MenuItem[];
  status?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <header className="rp-topbar">
      <div className="rp-topbar-inner">
        <button
          type="button"
          className="rp-wordmark"
          disabled={disabled}
          onClick={() => onPlace("home")}
          aria-label="relish, go to Home"
        >
          relish
        </button>
        <nav aria-label="Main" className="rp-places">
          {places.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              aria-current={current === p.id ? "page" : undefined}
              onClick={() => onPlace(p.id)}
            >
              {p.label}
            </button>
          ))}
        </nav>
        <div className="rp-menu-wrap" ref={wrap}>
          <button
            ref={toggle}
            type="button"
            className="rp-initial"
            aria-label="Menu: settings, sound, help, lock"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen(!open)}
          >
            {initial.trim().charAt(0).toUpperCase() || "R"}
          </button>
          {open && (
            <div className="rp-menu" id={menuId}>
              {status && <p className="rp-menu-status">{status}</p>}
              {items.map((item) =>
                item === "sound" ? (
                  <div key="sound" className="rp-menu-sound">
                    <SoundControl />
                  </div>
                ) : (
                  <div key={item.label}>
                    {item.divider && <hr />}
                    <button
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpen(false);
                        item.onSelect();
                      }}
                    >
                      {item.label}
                    </button>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
