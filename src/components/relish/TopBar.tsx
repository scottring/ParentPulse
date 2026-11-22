"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { SoundControl } from "./Sensory";
import Illustration from "./Illustration";

/**
 * Three places (Scott, 2026-11-21): Home · Journal · Activities. Journal is
 * one page (2026-11-22): Our family journal down the spine, your own entries
 * branching off it. With children's journals, Journal is a menu that lists them.
 */
export type Place = "home" | "journal" | "do";
export const places: { id: Place; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "journal", label: "Journal" },
  { id: "do", label: "Activities" },
];
/** Who a page is written for: only me, or the whole family (a draft's audience). */
export type Space = "me" | "family";

export type MenuItem =
  | {
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      divider?: boolean;
    }
  | "sound";

/** A child's journal the parent can open from the Journal menu. */
export type KidJournal = { id: string; name: string; locked?: boolean; onOpen: () => void };

/** Phones (and a closed Duo) skip the menu: Journal opens straight onto the journal. */
export const PHONE_QUERY = "(max-width: 720px)";
const isPhone = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(PHONE_QUERY).matches;

export const kidJournalName = (name: string) => `${name.trim()}’s journal`;

/** The one top bar: wordmark, the three places, and the avatar menu. */
export default function TopBar({
  current,
  initial,
  disabled,
  onPlace,
  items,
  status,
  journal,
  kids = [],
  onJournal,
}: {
  current: Place;
  initial: string;
  disabled: boolean;
  onPlace: (place: Place) => void;
  items: MenuItem[];
  status?: string;
  /** The journal is open. */
  journal?: boolean;
  /** Children's journals in this account, listed under Kids' journals. */
  kids?: KidJournal[];
  /** Opens the journal from the menu. Without it, Journal is a plain tab. */
  onJournal?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const menuId = useId();
  const journalId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const journalWrap = useRef<HTMLDivElement>(null);
  const journalButton = useRef<HTMLButtonElement>(null);
  const journalMenu = useRef<HTMLDivElement>(null);
  const focusFirst = useRef<"first" | "last" | null>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: globalThis.KeyboardEvent) => {
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
  useEffect(() => {
    if (!journalOpen) return;
    const outside = (e: PointerEvent) => {
      if (!journalWrap.current?.contains(e.target as Node)) setJournalOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    const items = journalMenu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (items?.length && focusFirst.current)
      items[focusFirst.current === "first" ? 0 : items.length - 1].focus();
    focusFirst.current = null;
    return () => document.removeEventListener("pointerdown", outside);
  }, [journalOpen]);
  function closeJournal(refocus = true) {
    setJournalOpen(false);
    if (refocus) journalButton.current?.focus();
  }
  function pick(action: () => void) {
    setJournalOpen(false);
    action();
  }
  function menuKeys(e: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      journalMenu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeJournal();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      items[e.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (e.key === "Tab") closeJournal(false);
  }
  const placeButton = (p: { id: Place; label: string }) => {
    if (p.id !== "journal" || !onJournal)
      return (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          aria-current={current === p.id ? "page" : undefined}
          onClick={() => onPlace(p.id)}
        >
          {p.label}
        </button>
      );
    return (
      <div key={p.id} className="rp-journal-wrap" ref={journalWrap}>
        <button
          ref={journalButton}
          type="button"
          className="rp-journal-tab"
          disabled={disabled}
          aria-current={current === "journal" ? "page" : undefined}
          aria-haspopup="menu"
          aria-expanded={journalOpen}
          aria-controls={journalOpen ? journalId : undefined}
          onClick={() => {
            // A phone opens the journal page itself, with kids' journals below.
            if (isPhone()) {
              setJournalOpen(false);
              return onPlace("journal");
            }
            setJournalOpen(!journalOpen);
          }}
          onKeyDown={(e) => {
            if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isPhone()) {
              e.preventDefault();
              focusFirst.current = e.key === "ArrowDown" ? "first" : "last";
              setJournalOpen(true);
            } else if (e.key === "Escape" && journalOpen) closeJournal();
          }}
        >
          {p.label}
          <svg
            aria-hidden="true"
            className="rp-journal-caret"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d={journalOpen ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
        {journalOpen && (
          <div
            ref={journalMenu}
            id={journalId}
            className="rp-journal-menu"
            role="menu"
            aria-label="Journals"
            onKeyDown={menuKeys}
          >
            <button
              type="button"
              role="menuitem"
              className={`rp-jm-item ${journal ? "is-on" : ""}`}
              aria-current={journal ? "page" : undefined}
              onClick={() => pick(onJournal)}
            >
              <Illustration name="your-book" size={46} className="rp-jm-art" />
              <span className="rp-jm-words">
                <span className="rp-jm-title">Our family journal</span>
                <span className="rp-jm-note">The family’s pages, and yours</span>
              </span>
            </button>
            {[
              { id: "kids", label: "Kids’ journals", list: kids.filter((k) => !k.locked) },
              { id: "older", label: "Earlier copies", list: kids.filter((k) => k.locked) },
            ].map(
              (group) =>
                group.list.length > 0 && (
                  <div key={group.id} role="group" aria-labelledby={`${journalId}-${group.id}`}>
                    <p className="rp-jm-group" id={`${journalId}-${group.id}`}>
                      {group.label}
                    </p>
                    {group.list.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        role="menuitem"
                        className="rp-jm-item rp-jm-kid"
                        onClick={() => pick(k.onOpen)}
                      >
                        <Illustration name="emblem-leaf" size={30} className="rp-jm-art" />
                        <span className="rp-jm-words">
                          <span className="rp-jm-kid-name">{kidJournalName(k.name)}</span>
                          {k.locked && (
                            <span className="rp-jm-note">Needs its original passphrase</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                ),
            )}
          </div>
        )}
      </div>
    );
  };
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
          {places.map(placeButton)}
        </nav>
        <div className="rp-menu-wrap" ref={wrap}>
          <button
            ref={toggle}
            type="button"
            className="rp-initial"
            aria-label="Menu: family, account, settings, sound, help"
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
