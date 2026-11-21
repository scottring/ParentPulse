"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { FamilyAdd } from "./Journal";
import "./family.css";

const list = (names: string[]) =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

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

/** Share with our family: a passage or the whole page, into Our family journal. */
export default function ShareSheet({
  title,
  text,
  selected,
  owner,
  others,
  caption: initialCaption,
  onAdd,
  onClose,
}: {
  title: string;
  text: string;
  selected: string;
  owner: string;
  /** Everyone else in the family, by name. */
  others: string[];
  caption: string;
  onAdd: FamilyAdd;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<"passage" | "page">("passage");
  const [passage, setPassage] = useState(() => defaultPassage(text, selected));
  const [choosing, setChoosing] = useState(false);
  const [caption, setCaption] = useState(initialCaption);
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
  const words = kind === "passage" ? passage.trim() : text.trim();
  async function add() {
    setBusy(true);
    setError("");
    try {
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
          <h2 id={titleId}>Share with our family</h2>
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
        <p className="rp-share-who">
          {others.length
            ? `${list(others)} will see this in Our family journal.`
            : "It will be kept in Our family journal."}
        </p>
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
            <span className="rp-share-by">Shared by {owner}</span>
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
        {error && (
          <p className="rp-fb-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="rp-share-add"
          disabled={busy || !words}
          onClick={() => void add()}
        >
          {busy
            ? "Adding…"
            : kind === "passage"
              ? "Add passage to family journal"
              : "Add page to family journal"}
        </button>
        <p className="rp-share-fine">
          {kind === "passage"
            ? "The rest of your entry stays private."
            : "Your tags and photos stay private."}
        </p>
      </div>
    </div>
  );
}
