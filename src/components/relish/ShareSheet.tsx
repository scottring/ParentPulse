"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { FamilyAdd } from "./Journal";
import type { Recipient } from "@/lib/relish/partner-share";
import { sameName } from "@/lib/relish/mentions";
import Illustration from "./Illustration";
import "./family.css";
import "./journal-stream.css";

const list = (names: string[]) =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** What Send a line hands on: the words, and a note for the people chosen. */
export type SendWords = { title: string; text: string; caption: string; note: string };
/** Sends words to chosen people's journals (Sent to me). */
export type SendLine = (to: Recipient[], words: SendWords) => Promise<void>;

/**
 * The words to suggest: what's selected in the editor, else the first quoted
 * sentence, else the first paragraph.
 */
export function defaultPassage(text: string, selected = "") {
  if (selected.trim()) return selected.trim();
  const quoted = text.match(/[“"]([^”"]{8,600})[”"]/);
  if (quoted) return quoted[1].trim();
  return text.trim().split(/\n\s*\n/)[0]?.trim() ?? "";
}

const focusable = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLElement>(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => !el.hasAttribute("disabled"));

/**
 * Share with our family: a passage or the whole page, into Our family journal.
 * When the journal is connected to other grown-ups' journals it becomes Send
 * a line (2026-11-22): the same words can go to chosen people instead, into
 * their My journal under Sent to me. Children's journals can't get lines of
 * their own; they see Our family journal. Nobody is ever pinged.
 */
export default function ShareSheet({
  title,
  text,
  selected,
  owner,
  others,
  caption: initialCaption,
  onAdd,
  onClose,
  recipients = [],
  onSend,
  onConnect,
  mentioned = [],
  replyTo,
}: {
  title: string;
  text: string;
  selected: string;
  owner: string;
  /** Everyone else in the family, by name. */
  others: string[];
  caption: string;
  /** Adds to Our family journal. Absent when writing back to one person. */
  onAdd?: FamilyAdd;
  onClose: () => void;
  /** Connected grown-ups a line can be sent to on its own. */
  recipients?: Recipient[];
  onSend?: SendLine;
  /** Not connected: a quiet way to connect a partner's journal. */
  onConnect?: () => void;
  /** People the entry @-mentions or tags, by name. */
  mentioned?: string[];
  /** Write back: a few words of your own, to the person who sent you a line. */
  replyTo?: Recipient;
}) {
  const direct = !!onSend && recipients.length > 0;
  const compose = !!replyTo && direct;
  const [kind, setKind] = useState<"passage" | "page">("passage");
  const [passage, setPassage] = useState(() => (compose ? "" : defaultPassage(text, selected)));
  const [choosing, setChoosing] = useState(false);
  const [caption, setCaption] = useState(initialCaption);
  const [note, setNote] = useState("");
  // Who gets it: the person written back to, else someone the entry mentions,
  // else Our family journal, as before.
  const [chosen, setChosen] = useState<string[]>(() => {
    if (replyTo) return [replyTo.uid];
    const named = recipients.find((r) => mentioned.some((m) => sameName(m, r.name)));
    return named ? [named.uid] : [];
  });
  const [toFamily, setToFamily] = useState(() => !compose && !!onAdd && chosen.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sheet = useRef<HTMLDivElement>(null);
  const returnTo = useRef<Element | null>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
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
      } else if (!e.shiftKey && document.activeElement === last) {
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
  const words = compose || kind === "passage" ? passage.trim() : text.trim();
  const people = recipients.filter((r) => chosen.includes(r.uid));
  const names = people.map((r) => r.name);
  async function add() {
    setBusy(true);
    setError("");
    try {
      if (direct && !toFamily) {
        if (!people.length) throw new Error("Choose who gets it.");
        await onSend!(people, {
          title: compose ? `A line from ${owner}` : title,
          text: words,
          caption: compose ? "" : caption.trim(),
          note: note.trim(),
        });
        return;
      }
      if (!onAdd) throw new Error("Choose who gets it.");
      await onAdd(
        kind === "passage"
          ? { kind: "passage", text: passage.trim(), caption: caption.trim() }
          : { kind: "page", title, text: text.trim(), caption: caption.trim() },
      );
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "This couldn’t be added. Your page is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rp-share-backdrop" onClick={() => !busy && onClose()}>
      <div
        ref={sheet}
        className="rp-share"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rp-fb-grab" aria-hidden="true" />
        <div className="rp-share-head">
          <h2 id={titleId}>
            {compose
              ? `Write back to ${replyTo!.name}`
              : direct
                ? kind === "page"
                  ? "Send this entry"
                  : "Send a line"
                : "Share with our family"}
          </h2>
          <button
            type="button"
            className="rp-fb-x"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {!direct && (
          <p className="rp-share-who">
            {others.length
              ? `${list(others)} will see this in Our family journal.`
              : "It will be kept in Our family journal."}
          </p>
        )}
        {compose ? (
          <label className="rp-share-choose rs-compose">
            <span>What you’d like to say</span>
            <textarea
              aria-label="What you’d like to say"
              rows={4}
              value={passage}
              maxLength={8000}
              disabled={busy}
              onChange={(e) => setPassage(e.target.value)}
            />
          </label>
        ) : (
        <>
        <div className="rp-share-kind" role="group" aria-label="What to share">
          <button
            type="button"
            aria-pressed={kind === "passage"}
            disabled={busy}
            onClick={() => setKind("passage")}
          >
            Passage
          </button>
          <button
            type="button"
            aria-pressed={kind === "page"}
            disabled={busy}
            onClick={() => {
              setKind("page");
              setChoosing(false);
            }}
          >
            Whole page
          </button>
        </div>
        <div className="rp-share-card">
          {kind === "passage" && choosing ? (
            <label className="rp-share-choose">
              <span>Only these words</span>
              <textarea
                aria-label="Only these words"
                rows={5}
                value={passage}
                maxLength={8000}
                disabled={busy}
                onChange={(e) => setPassage(e.target.value)}
              />
              <span className="rp-share-hint">
                Trim it to the words you want, or start again from the whole entry.{" "}
                <button
                  type="button"
                  className="rp-share-link"
                  disabled={busy}
                  onClick={() => setPassage(text.trim().slice(0, 8000))}
                >
                  Use the whole entry
                </button>
              </span>
            </label>
          ) : (
            <blockquote className={kind === "page" ? "rp-share-page" : undefined}>
              {kind === "page" && <strong>{title}</strong>}
              {words}
            </blockquote>
          )}
          <div className="rp-share-foot">
            <label className="rp-share-caption">
              <span className="ui-sr-only">Caption</span>
              <input
                value={caption}
                maxLength={200}
                disabled={busy}
                placeholder="Add a caption"
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <span className="rp-share-by">
              {direct && !toFamily ? `from ${owner}’s journal` : `Shared by ${owner}`}
            </span>
          </div>
        </div>
        {kind === "passage" && (
          <button
            type="button"
            className="rp-share-link rp-share-change"
            disabled={busy}
            aria-expanded={choosing}
            onClick={() => setChoosing(!choosing)}
          >
            {choosing ? "Done choosing" : "Change passage"}
          </button>
        )}
        </>
        )}
        {direct && (
          <>
            {!toFamily && !compose && (
              <label className="rs-share-note">
                <span className="ui-sr-only">Add a note</span>
                <textarea
                  aria-label="Add a note"
                  rows={2}
                  maxLength={1000}
                  value={note}
                  disabled={busy}
                  placeholder="Add a note (optional)"
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            )}
            <fieldset className="rs-who" disabled={busy}>
              <legend>Who gets it</legend>
              {recipients.map((r) => {
                const on = !toFamily && chosen.includes(r.uid);
                return (
                  <label key={r.uid} className={on ? "is-on" : undefined}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        setToFamily(false);
                        setChosen((c) =>
                          e.target.checked ? [...c.filter((u) => u !== r.uid), r.uid] : c.filter((u) => u !== r.uid),
                        );
                      }}
                    />
                    <span className="rs-box" aria-hidden="true">
                      {on && <Check size={14} strokeWidth={3.2} />}
                    </span>
                    <span className="rs-face" aria-hidden="true">
                      {r.name.trim().charAt(0).toLocaleUpperCase()}
                    </span>
                    {r.name}
                    {mentioned.some((m) => sameName(m, r.name)) && (
                      <span className="rs-who-hint">mentioned</span>
                    )}
                  </label>
                );
              })}
              {onAdd && !compose && (
                <label className={toFamily ? "is-on" : undefined}>
                  <input
                    type="checkbox"
                    checked={toFamily}
                    onChange={(e) => {
                      setToFamily(e.target.checked);
                      if (e.target.checked) setChosen([]);
                    }}
                  />
                  <span className="rs-box" aria-hidden="true">
                    {toFamily && <Check size={14} strokeWidth={3.2} />}
                  </span>
                  <Illustration name="your-book" size={30} className="rs-who-art" />
                  Everyone · Our family journal
                </label>
              )}
            </fieldset>
            {others.some((n) => !recipients.some((r) => sameName(r.name, n))) && !compose && (
              <p className="rs-fine">
                Only connected grown-ups can get a line of their own. Everyone
                else sees what’s added to Our family journal.
              </p>
            )}
          </>
        )}
        {error && (
          <p className="rp-fb-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="rp-share-add"
          disabled={busy || !words || (direct && !toFamily && !people.length)}
          onClick={() => void add()}
        >
          {direct && !toFamily
            ? busy
              ? "Sending…"
              : people.length
                ? `Send to ${list(names)}`
                : "Choose who gets it"
            : busy
              ? "Adding…"
              : kind === "passage"
                ? "Add passage to family journal"
                : "Add page to family journal"}
        </button>
        <p className="rp-share-fine">
          {direct && !toFamily && people.length
            ? `It shows up in ${list(names.map((n) => `${n}’s`))} journal under “Sent to me.” ${
                compose ? "Relish doesn’t ping anyone about it." : "The rest of your entry stays private."
              }`
            : kind === "passage"
              ? "The rest of your entry stays private."
              : "Your tags and photos stay private."}
        </p>
        {!direct && onConnect && (
          <button type="button" className="rp-share-link rs-share-connect" disabled={busy} onClick={onConnect}>
            Send it to just one person? Connect your partner’s journal
          </button>
        )}
      </div>
    </div>
  );
}
