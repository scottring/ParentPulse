"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Feather,
  Heart,
  Leaf,
  Lock,
  Plus,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import type { Book } from "@/lib/relish/model";
import {
  journalStyles,
  newJournalDraft,
  writeJournalPage,
  JOURNAL_TEXT_LIMIT,
  JOURNAL_TITLE_LIMIT,
  type JournalDraft,
  type JournalEntry,
  type JournalStyle,
} from "@/lib/relish/journal";
import { useSensory } from "./Sensory";
import "./journal.css";

type Save = (change: (book: Book) => Book) => Promise<void>;
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const pageTitle = (entry: JournalDraft) =>
  entry.title.trim() || "A little untitled something";
const signature = (entry: JournalDraft) =>
  JSON.stringify([entry.title, entry.text, entry.style]);
const styleIcons = { sky: Sun, moss: Leaf, blush: Heart };

export default function Journal({
  book,
  save,
  sample,
  onEditingChange,
  onDone,
}: {
  book: Book;
  save: Save;
  sample: boolean;
  onEditingChange: (editing: boolean) => void;
  onDone: () => void;
}) {
  const [editor, setEditor] = useState<JournalDraft | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [query, setQuery] = useState("");
  const sensory = useSensory();
  const top = useRef<HTMLHeadingElement>(null);
  const entries = (book.journal || []).toSorted((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const page = entries.find((e) => e.id === reading);
  const editingEntry = entries.find((e) => e.id === editor?.id);
  useEffect(() => {
    top.current?.focus({ preventScroll: true });
  }, [reading, editor?.id]);
  function edit(draft: JournalDraft) {
    onEditingChange(true);
    setCelebrate(false);
    setEditor(draft);
    sensory.play("touch");
  }
  function leaveEditor() {
    onEditingChange(false);
    setEditor(null);
    setReading(null);
  }
  if (editor)
    return (
      <main className="rj-workspace">
        <JournalEditor
          key={editor.id}
          initial={editor}
          initialEntry={editingEntry}
          save={save}
          sample={sample}
          onPause={leaveEditor}
          onKeep={(entry) => {
            onEditingChange(false);
            setEditor(null);
            setReading(entry.id);
            setCelebrate(true);
            sensory.play("place");
          }}
        />
      </main>
    );
  if (page)
    return (
      <main className={`rj-workspace rj-read rj-${page.style}`}>
        <div className="rj-reading-top">
          <button
            className="lb-text"
            onClick={() => {
              setReading(null);
              setCelebrate(false);
            }}
          >
            <ArrowLeft size={17} /> My pages
          </button>
          <span className="rj-private">
            <Lock size={14} />{" "}
            {sample ? "Fictional sample" : "Only in your edition"}
          </span>
        </div>
        {celebrate && (
          <div className="rj-celebration" role="status">
            <span className="rj-celebration-mark" aria-hidden="true">
              <Sparkles size={34} />
            </span>
            <div>
              <strong>That one’s a keeper.</strong>
              <p>You kept a page. That can be enough for today.</p>
            </div>
          </div>
        )}
        <article className="rj-paper">
          <div className="rj-paper-date">
            <span>{dateLabel(page.createdAt)}</span>
            <StyleMark style={page.style} />
          </div>
          <h2 ref={top} tabIndex={-1}>
            {pageTitle(page)}
          </h2>
          <div className="rj-prose">{page.text}</div>
          <div className="rj-paper-footer">
            <span>{journalStyles[page.style].note}</span>
            <button className="lb-text" onClick={() => edit(page)}>
              <Feather size={16} /> Edit this page
            </button>
          </div>
        </article>
        <div className="rj-finish-actions">
          <button className="lb-primary" onClick={onDone}>
            Done for now <Check size={17} />
          </button>
          <button className="lb-text" onClick={() => edit(newJournalDraft())}>
            One more page <Plus size={16} />
          </button>
        </div>
      </main>
    );
  const matching = entries.filter((e) =>
    `${e.title}\n${e.text}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <main className="rj-workspace">
      <header className="rj-welcome">
        <div>
          <p className="lb-kicker">Your journal · entirely your own</p>
          <h2 ref={top} tabIndex={-1}>
            Oh, the things
            <br />
            <em>you could write.</em>
          </h2>
          <p>
            Big feelings. Tiny triumphs. A completely made-up story.
            <br className="rj-desktop-break" /> There’s room for all of it here.
          </p>
          <button
            className="rj-new-page"
            onClick={() => edit(newJournalDraft())}
          >
            A fresh page <Plus size={23} />
          </button>
          <p className="rj-private">
            <Lock size={14} />{" "}
            {sample
              ? "Sample pages disappear when you reload."
              : "Encrypted in your book, on this device."}
          </p>
        </div>
        <div className="rj-paper-stack" aria-hidden="true">
          <span className="rj-stack-back" />
          <span className="rj-stack-middle" />
          <div className="rj-stack-front">
            <Sun size={42} />
            <span>
              Dear
              <br />
              <em>anything,</em>
            </span>
            <div className="rj-doodle-line" />
            <Heart size={28} />
          </div>
        </div>
      </header>
      {entries.length > 0 ? (
        <section className="rj-saved-pages" aria-label="Your journal pages">
          <div className="rj-list-heading">
            <h3>
              Your pages <span>{entries.length}</span>
            </h3>
            <label className="rj-search">
              <Search size={17} />
              <input
                aria-label="Find a journal page"
                placeholder="Find a page…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="rj-page-grid">
            {matching.map((entry) => (
              <button
                className={`rj-page-card rj-${entry.style}`}
                key={entry.id}
                onClick={() => {
                  if (entry.status === "draft") edit(entry);
                  else {
                    setReading(entry.id);
                    setCelebrate(false);
                    sensory.play("touch");
                  }
                }}
              >
                <span className="rj-card-meta">
                  <span>
                    {entry.status === "draft"
                      ? "A page in progress"
                      : dateLabel(entry.createdAt)}
                  </span>
                  <StyleMark style={entry.style} />
                </span>
                <strong>{pageTitle(entry)}</strong>
                <span className="rj-card-excerpt">
                  {entry.text || "A beginning, waiting for you."}
                </span>
                <span className="rj-card-open">
                  {entry.status === "draft" ? "Keep writing" : "Open this page"}
                  <ArrowUpRight size={18} />
                </span>
              </button>
            ))}
          </div>
          {matching.length === 0 && (
            <p className="rj-no-results">
              No pages match that yet. Try another word.
            </p>
          )}
        </section>
      ) : (
        <div className="rj-first-page">
          <Feather size={24} />
          <p>
            Your first page can be one word or a whole adventure.
            <br />
            <strong>You get to decide.</strong>
          </p>
        </div>
      )}
    </main>
  );
}
function StyleMark({ style }: { style: JournalStyle }) {
  const Icon = styleIcons[style];
  return <Icon size={24} aria-hidden="true" />;
}

export function JournalEditor({
  initial,
  initialEntry,
  save,
  sample,
  onPause,
  onKeep,
}: {
  initial: JournalDraft;
  initialEntry?: JournalEntry;
  save: Save;
  sample: boolean;
  onPause: () => void;
  onKeep: (entry: JournalEntry) => void;
}) {
  const [draft, setDraft] = useState<JournalDraft>(initial);
  const [saved, setSaved] = useState(signature(initial));
  const [pending, setPending] = useState(0);
  const [hasSaved, setHasSaved] = useState(!!initialEntry);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const current = useRef(initial),
    revision = useRef(initialEntry?.revision || 0),
    status = useRef(initialEntry?.status || "draft");
  const saveRef = useRef(save),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    alive = useRef(true),
    finalizing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = signature(draft) !== saved;
  const sensory = useSensory();
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  function change(update: Partial<JournalDraft>) {
    const next = { ...current.current, ...update };
    current.current = next;
    setDraft(next);
  }
  function persist(
    snapshot: JournalDraft,
    keep = false,
  ): Promise<JournalEntry> {
    setPending((n) => n + 1);
    const job = queue.current
      .catch(() => {})
      .then(async () => {
        if (!alive.current) throw new Error("This writer has closed.");
        let written: JournalEntry | undefined;
        await saveRef.current((book) => {
          const next = writeJournalPage(
            book,
            snapshot,
            revision.current,
            keep ? "kept" : status.current,
          );
          written = next.journal!.find((e) => e.id === snapshot.id)!;
          return next;
        });
        if (!written) throw new Error("This page was not saved.");
        revision.current = written.revision;
        status.current = written.status;
        if (alive.current) {
          setSaved(signature(snapshot));
          setHasSaved(true);
          setError("");
        }
        return written;
      });
    queue.current = job;
    return job
      .catch((e) => {
        if (alive.current)
          setError(
            "This page hasn’t saved. Your words are still here. Try saving again before leaving.",
          );
        throw e;
      })
      .finally(() => {
        if (alive.current) setPending((n) => n - 1);
      });
  }
  // The editor owns one queue; later keystrokes cannot be overwritten by an earlier save.
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });
  useEffect(() => {
    if (!dirty || finalizing.current || error) return;
    timer.current = setTimeout(() => {
      void persistRef.current(draft).catch(() => {});
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, dirty, saved, error]);
  useEffect(() => {
    if (!dirty && pending === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);
  async function finish(keep: boolean) {
    if (finalizing.current) return;
    finalizing.current = true;
    setFinishing(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      if (!keep && revision.current === 0 && pending === 0 && !dirty) {
        onPause();
        return;
      }
      const entry = await persist(current.current, keep);
      if (!alive.current) return;
      if (keep) onKeep(entry);
      else onPause();
    } catch {
      /* Keep the writer open with the last words and a retry action. */
    } finally {
      finalizing.current = false;
      if (alive.current) setFinishing(false);
    }
  }
  return (
    <div className={`rj-writing rj-${draft.style}`}>
      <div className="rj-writing-intro">
        <div>
          <p className="lb-kicker">A little room to be you</p>
          <h2>
            Your page.
            <br />
            <em>Your rules.</em>
          </h2>
        </div>
        <p>
          A list, a ramble, a story, a single sentence.
          <br />
          Start anywhere. Stop when it feels like enough.
        </p>
      </div>
      <section className="rj-paper" aria-label="Journal editor">
        <div className="rj-paper-date">
          <span>{dateLabel(draft.createdAt)}</span>
          <StyleMark style={draft.style} />
        </div>
        <fieldset className="rj-style-picker" disabled={finishing}>
          <legend>Pick a little atmosphere</legend>
          <div>
            {(Object.keys(journalStyles) as JournalStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                className={`rj-style rj-${style}`}
                aria-pressed={draft.style === style}
                onClick={() => {
                  change({ style });
                  sensory.play("touch");
                }}
              >
                <StyleMark style={style} /> {journalStyles[style].label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="rj-title-label">
          Title <span>if you feel like it</span>
          <input
            aria-label="Page title (optional)"
            maxLength={JOURNAL_TITLE_LIMIT}
            value={draft.title}
            disabled={finishing}
            onChange={(e) => change({ title: e.target.value })}
            placeholder="A little untitled something…"
          />
        </label>
        <label className="rj-writing-label">
          <span className="rj-sr-only">Your journal entry</span>
          <textarea
            aria-label="Your journal entry"
            autoFocus
            value={draft.text}
            maxLength={JOURNAL_TEXT_LIMIT}
            disabled={finishing}
            onChange={(e) => change({ text: e.target.value })}
            placeholder="Start anywhere…"
            rows={9}
          />
        </label>
        <div className="rj-save-state" role="status" aria-live="polite">
          {pending > 0
            ? "Keeping your words…"
            : error
              ? "Not saved yet"
              : dirty
                ? "A few words in motion…"
                : hasSaved
                  ? sample
                    ? "Kept in this sample for this visit."
                    : "Saved in your encrypted book."
                  : "Just you and a fresh page."}
        </div>
        {draft.text.length >= JOURNAL_TEXT_LIMIT - 500 && (
          <p className="lb-fine">
            {JOURNAL_TEXT_LIMIT - draft.text.length} characters left on this
            page. You can start another.
          </p>
        )}
        {error && (
          <div className="rj-save-error" role="alert">
            <p>{error}</p>
            <button
              className="lb-secondary"
              disabled={finishing || pending > 0}
              onClick={() => void persist(current.current).catch(() => {})}
            >
              Try saving again
            </button>
          </div>
        )}
        <div className="rj-writing-actions">
          <button
            className="rj-keep"
            disabled={finishing || !draft.text.trim()}
            onClick={() => void finish(true)}
          >
            {finishing ? "Keeping…" : "Keep this page"}
            <Check size={20} />
          </button>
          <button
            className="lb-text"
            disabled={finishing}
            onClick={() => void finish(false)}
          >
            Save for later
          </button>
        </div>
        <p className="rj-private">
          <Lock size={14} />
          {sample
            ? "Fictional sample · changes last until reload"
            : "Private to this edition. Saved on this device."}
        </p>
      </section>
    </div>
  );
}
