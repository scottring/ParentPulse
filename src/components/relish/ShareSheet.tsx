"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { FamilyAdd, SendFromEntry } from "./Journal";
import type { Recipient } from "@/lib/relish/partner-share";
import type { Book } from "@/lib/relish/model";
import type { Photo, PhotoLoader } from "@/lib/relish/photos";
import { PhotoThumbs } from "./Photos";
import { resolveMentions, sameName } from "@/lib/relish/mentions";
import Illustration from "./Illustration";
import "./family.css";
import "./journal-stream.css";

const list = (names: string[]) =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/**
 * What Send a line hands on: the words, a note for the people chosen, and
 * the entry's photos when they go too (a whole entry, Include photos on).
 */
export type SendWords = { title: string; text: string; caption: string; note: string; photos?: Photo[] };
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

/** How much of an entry can be shared, whole or in part. */
export const SHARE_TEXT_LIMIT = 8000;

/**
 * Share with our family: the whole page or a passage, into Our family journal.
 * When the journal is connected to other grown-ups' journals it becomes Send
 * a line (2026-11-22): the same words can go to chosen people instead, into
 * their My journal under Sent to me. Children's journals can't get lines of
 * their own; they see Our family journal. Nobody is ever pinged.
 *
 * Share opens on the whole page (2026-11-23, Scott: "need to be able to
 * easily share entire entries"); Just a passage is the second choice.
 *
 * A whole page can take its photos along (2026-11-23, Scott: "go on all"):
 * Include photos is on when the entry has photos, showing them. Copies go,
 * encrypted for where they're going; a passage carries words only.
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
  initialKind = "page",
  photos = [],
  photoAccess,
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
  /** What it opens on: the whole page, unless a passage was asked for. */
  initialKind?: "passage" | "page";
  /** The entry's photos: they can go with the whole page. */
  photos?: Photo[];
  /** Opens them, for the thumbnails. Without it they stay in the private page. */
  photoAccess?: PhotoLoader;
}) {
  const direct = !!onSend && recipients.length > 0;
  const compose = !!replyTo && direct;
  const [kind, setKind] = useState<"passage" | "page">(initialKind);
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
  const [includePhotos, setIncludePhotos] = useState(true);
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
  const whole = text.trim();
  const long = whole.length > SHARE_TEXT_LIMIT;
  const words = compose || kind === "passage" ? passage.trim() : whole.slice(0, SHARE_TEXT_LIMIT);
  // Photos can go with the whole page; a passage, and a line written back, are words only.
  const canPhotos = kind === "page" && !compose && photos.length > 0 && !!photoAccess;
  const withPhotos = canPhotos && includePhotos;
  const going = withPhotos ? photos : [];
  // The photos note already says where they stay.
  const pageFine = withPhotos
    ? "Your tags stay private."
    : photos.length > 0
      ? "Your tags stay private too."
      : "Your tags and photos stay private.";
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
          ...(going.length ? { photos: going } : {}),
        });
        return;
      }
      if (!onAdd) throw new Error("Choose who gets it.");
      await onAdd(
        kind === "passage"
          ? { kind: "passage", text: passage.trim(), caption: caption.trim() }
          : {
              kind: "page",
              title,
              text: words,
              caption: caption.trim(),
              ...(going.length ? { photos: going } : {}),
            },
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
            aria-pressed={kind === "page"}
            disabled={busy}
            onClick={() => {
              setKind("page");
              setChoosing(false);
            }}
          >
            Whole page
          </button>
          <button
            type="button"
            aria-pressed={kind === "passage"}
            disabled={busy}
            onClick={() => setKind("passage")}
          >
            Just a passage
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
          {canPhotos && (
            <div className={`rp-share-photos${includePhotos ? " is-on" : ""}`}>
              <label>
                <input
                  type="checkbox"
                  checked={includePhotos}
                  disabled={busy}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                />
                <span className="rs-box" aria-hidden="true">
                  {includePhotos && <Check size={14} strokeWidth={3.2} />}
                </span>
                Include photos
                <span className="rp-share-photos-count">
                  {photos.length === 1 ? "1 photo" : `${photos.length} photos`}
                </span>
              </label>
              <PhotoThumbs photos={photos} access={photoAccess} label="This entry’s photos" />
            </div>
          )}
          {kind === "page" && ((photos.length > 0 && !withPhotos) || long) && (
            <p className="rp-share-hint rp-share-stays">
              {[
                photos.length > 0 && !withPhotos ? "Photos stay in your private page." : "",
                long ? `It’s long, so the first ${SHARE_TEXT_LIMIT.toLocaleString("en-US")} characters are shared.` : "",
              ]
                .filter(Boolean)
                .join(" ")}
            </p>
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
                ? kind === "page" && !compose
                  ? `Send the whole entry to ${list(names)}`
                  : `Send to ${list(names)}`
                : "Choose who gets it"
            : busy
              ? "Adding…"
              : kind === "passage"
                ? "Add passage to family journal"
                : "Add the whole entry to our family journal"}
        </button>
        <p className="rp-share-fine">
          {direct && !toFamily && people.length
            ? `It shows up in ${list(names.map((n) => `${n}’s`))} journal under “Sent to me.” ${
                compose
                  ? "Relish doesn’t ping anyone about it."
                  : kind === "passage"
                    ? "The rest of your entry stays private."
                    : pageFine
              }`
            : kind === "passage"
              ? "The rest of your entry stays private."
              : pageFine}
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

/**
 * Share a page you've already saved, from the journal's timeline or while
 * reading it: the same sheet, on the whole page, with what came from it
 * remembered (`sourceId`) so the page can say where it went. Nothing leaves
 * until the button in the sheet is pressed.
 */
export function ShareEntrySheet({
  book,
  journalId,
  others,
  mentionable,
  recipients = [],
  onAdd,
  onSend,
  onConnect,
  onClose,
  photoAccess,
}: {
  book: Book;
  /** The private entry being shared (a JournalEntry id). */
  journalId: string;
  /** Opens the entry's photos (the journal's own), so they can go too. */
  photoAccess?: PhotoLoader;
  /** Everyone else in the family, by name. */
  others: string[];
  /** Who the words can @-mention, by name. */
  mentionable: string[];
  recipients?: Recipient[];
  onAdd?: FamilyAdd;
  onSend?: SendFromEntry;
  onConnect?: () => void;
  onClose: () => void;
}) {
  const entry = (book.journal || []).find((e) => e.id === journalId);
  if (!entry) return null;
  const title = (entry.title.trim() || "Untitled entry").slice(0, 120);
  const tagged = (entry.people || [])
    .map((id) => book.people.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  const mentioned = resolveMentions(entry.text, mentionable);
  const caption =
    tagged[0] ??
    others.find((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(entry.text)) ??
    "";
  return (
    <ShareSheet
      title={title}
      text={entry.text}
      selected=""
      owner={book.owner}
      others={others}
      caption={caption}
      photos={entry.photos || []}
      photoAccess={photoAccess}
      mentioned={[...mentioned, ...tagged]}
      recipients={onSend ? recipients : []}
      onConnect={onConnect}
      onClose={onClose}
      onSend={
        onSend
          ? async (to, words) => {
              await onSend(to, { ...words, sourceId: entry.id });
              onClose();
            }
          : undefined
      }
      onAdd={
        onAdd
          ? async (page) => {
              const mentions = resolveMentions(`${page.title || ""}\n${page.text}`, mentionable);
              await onAdd({ ...page, ...(mentions.length ? { mentions } : {}), sourceId: entry.id });
              onClose();
            }
          : undefined
      }
    />
  );
}
