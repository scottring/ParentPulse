"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Share2,
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
import { bookPages } from "@/lib/relish/pages";
import type { PhotoAccess } from "@/lib/relish/photos";
import { PhotoGallery, PhotoPicker } from "./Photos";
import PassagePicker from "./PassagePicker";
import VoiceWriter from "./VoiceWriter";
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
  JSON.stringify([
    entry.title,
    entry.text,
    entry.style,
    entry.photos,
    entry.people,
  ]);
const styleIcons = { sky: Sun, moss: Leaf, blush: Heart };

export default function Journal({
  book,
  save,
  sample,
  onEditingChange,
  onDone,
  photos,
  onOffer,
  onNotice,
  onChapter,
  onManual,
  pendingInsights = 0,
  onAlbum,
}: {
  book: Book;
  save: Save;
  sample: boolean;
  onEditingChange: (editing: boolean) => void;
  onDone: () => void;
  photos?: PhotoAccess;
  onOffer?: (passage: { title: string; text: string }) => void;
  onNotice?: () => void;
  onChapter?: (chapter: "people" | "practice") => void;
  onManual?: () => void;
  pendingInsights?: number;
  onAlbum?: () => void;
}) {
  const [editor, setEditor] = useState<JournalDraft | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [query, setQuery] = useState("");
  const [excerpt, setExcerpt] = useState<string | null>(null);
  const prose = useRef<HTMLElement>(null);
  const sensory = useSensory();
  const top = useRef<HTMLHeadingElement>(null);
  const entries = bookPages(book);
  const drafts = (book.journal || []).filter((e) => e.status === "draft");
  const page = entries.find((e) => e.id === reading);
  const pageIndex = entries.findIndex((e) => e.id === reading);
  const editingEntry = book.journal?.find((e) => e.id === editor?.id);
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
          book={book}
          photos={photos}
          onPause={leaveEditor}
          onKeep={(entry) => {
            onEditingChange(false);
            setEditor(null);
            setReading(`journal:${entry.id}`);
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
        <article
          className="rj-paper rj-sequence-paper"
          ref={prose}
          key={page.id}
        >
          <div className="rj-paper-date">
            <span>{dateLabel(page.date)}</span>
            <StyleMark style={page.style} />
          </div>
          <h2 ref={top} tabIndex={-1}>
            {page.title}
          </h2>
          <p className="lb-kicker">
            {page.kind}
            {page.from ? ` · From ${page.from}` : ""}
          </p>
          <div className="rj-prose">{page.text}</div>
          <PhotoGallery photos={page.photos} access={photos} />
          {page.sections.map((section) => (
            <section className="rj-page-section" key={section.label}>
              <p className="lb-kicker">{section.label}</p>
              <p>{section.text}</p>
            </section>
          ))}
          {page.people.length > 0 && (
            <p className="rj-private">
              Thinking of{" "}
              {page.people
                .map((id) => book.people.find((p) => p.id === id)?.name)
                .filter(Boolean)
                .join(", ")}{" "}
              · private tags
            </p>
          )}
          <div className="rj-paper-footer">
            <span>{journalStyles[page.style].note}</span>
            <div className="rj-capture-actions">
              {page.journalId && (
                <button
                  className="lb-text"
                  onClick={() =>
                    edit(book.journal!.find((e) => e.id === page.journalId)!)
                  }
                >
                  <Feather size={16} /> Edit this page
                </button>
              )}
              <button
                className="lb-text"
                onClick={() => {
                  const selection = window.getSelection();
                  const within =
                    !!selection?.anchorNode &&
                    !!selection.focusNode &&
                    prose.current?.contains(selection.anchorNode) &&
                    prose.current?.contains(selection.focusNode);
                  setExcerpt(within ? selection!.toString() : "");
                }}
              >
                <Share2 size={16} /> Choose a passage
              </button>
            </div>
          </div>
        </article>
        <nav className="rj-sequence" aria-label="Pages in order">
          <button
            className="lb-secondary"
            disabled={pageIndex === 0}
            onClick={() => {
              setReading(entries[pageIndex - 1].id);
              setCelebrate(false);
              sensory.play("touch");
            }}
          >
            <ArrowLeft size={18} /> Previous page
          </button>
          <span>
            Page {pageIndex + 1} of {entries.length}
          </span>
          <button
            className="lb-secondary"
            disabled={pageIndex === entries.length - 1}
            onClick={() => {
              setReading(entries[pageIndex + 1].id);
              setCelebrate(false);
              sensory.play("touch");
            }}
          >
            Next page <ArrowRight size={18} />
          </button>
        </nav>
        {excerpt !== null && (
          <PassagePicker
            page={page}
            selected={excerpt}
            save={save}
            photos={photos}
            onOffer={
              onOffer
                ? (passage) => {
                    setExcerpt(null);
                    onOffer(passage);
                  }
                : undefined
            }
            onClose={() => setExcerpt(null)}
          />
        )}
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
    `${e.title}\n${e.text}\n${e.people.map((id) => book.people.find((p) => p.id === id)?.name || "").join(" ")}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <main className="rj-workspace">
      <header className="rj-welcome">
        <div>
          <p className="lb-kicker">One book · your unfolding story</p>
          <h2 ref={top} tabIndex={-1}>
            Oh, the things
            <br />
            <em>you could write.</em>
          </h2>
          <p>
            Big feelings. Tiny triumphs. The moments you noticed.
            <br className="rj-desktop-break" /> All finding their place in the
            same story.
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
      <div className="rj-capture-actions rj-browse-links">
        {onManual && (
          <button className="lb-text" onClick={onManual}>
            <Sparkles size={16} /> My living manual
            {pendingInsights ? ` · ${pendingInsights} to consider` : ""}
          </button>
        )}
        {onAlbum && (
          <button className="lb-text" onClick={onAlbum}>
            Our Family album
          </button>
        )}
        {onNotice && (
          <button className="lb-text" onClick={onNotice}>
            Notice a moment <Feather size={16} />
          </button>
        )}
        {onChapter && (
          <>
            <button className="lb-text" onClick={() => onChapter("people")}>
              The people in my life
            </button>
            <button className="lb-text" onClick={() => onChapter("practice")}>
              My little practices
            </button>
          </>
        )}
      </div>
      {drafts.length > 0 && (
        <section className="rj-drafts" aria-label="Pages in progress">
          <p className="lb-kicker">A few beginnings, waiting for you</p>
          {drafts.map((draft) => (
            <button
              className="lb-secondary"
              key={draft.id}
              onClick={() => edit(draft)}
            >
              Keep writing: {pageTitle(draft)} <Feather size={16} />
            </button>
          ))}
        </section>
      )}
      {entries.length > 0 ? (
        <section className="rj-saved-pages" aria-label="Your pages in order">
          <div className="rj-list-heading">
            <h3>
              Your pages <span>{entries.length}</span>
            </h3>
            <label className="rj-search">
              <Search size={17} />
              <input
                aria-label="Find a page"
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
                  setReading(entry.id);
                  setCelebrate(false);
                  sensory.play("touch");
                }}
              >
                <span className="rj-card-meta">
                  <span>{dateLabel(entry.date)}</span>
                  <StyleMark style={entry.style} />
                </span>
                <strong>{entry.title}</strong>
                <span className="rj-card-excerpt">
                  {entry.text || "A moment, held in a photo."}
                </span>
                <span className="rj-card-open">
                  {entry.kind}
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
  book,
  photos,
}: {
  initial: JournalDraft;
  initialEntry?: JournalEntry;
  save: Save;
  sample: boolean;
  onPause: () => void;
  onKeep: (entry: JournalEntry) => void;
  book?: Book;
  photos?: PhotoAccess;
}) {
  const [draft, setDraft] = useState<JournalDraft>(initial);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
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
    if (!dirty && pending === 0 && !mediaBusy && !voiceOpen) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending, mediaBusy, voiceOpen]);
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
      {book && (
        <VoiceWriter
          book={book}
          sample={sample}
          open={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          remaining={JOURNAL_TEXT_LIMIT - draft.text.length}
          onInsert={(text) => {
            change({
              text: `${current.current.text}${current.current.text.trim() ? "\n\n" : ""}${text}`.slice(
                0,
                JOURNAL_TEXT_LIMIT,
              ),
            });
            setVoiceOpen(false);
          }}
        />
      )}
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
        {book && (
          <button
            className="rj-voice-launch"
            disabled={finishing || mediaBusy}
            onClick={() => setVoiceOpen(true)}
          >
            Tell your story <span>Speak it. Read it. Make it yours.</span>
          </button>
        )}
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
        {photos && (
          <PhotoPicker
            photos={draft.photos || []}
            access={photos}
            disabled={finishing}
            onBusy={setMediaBusy}
            onChange={(photos) => change({ photos })}
          />
        )}
        {!!book?.people.length && (
          <fieldset
            className="rj-people-tags"
            disabled={finishing || mediaBusy}
          >
            <legend>
              Who’s in this moment?{" "}
              <span>Private tags · nobody is notified</span>
            </legend>
            <div>
              {book.people.map((person) => (
                <label key={person.id}>
                  <input
                    type="checkbox"
                    checked={draft.people?.includes(person.id) || false}
                    onChange={(e) =>
                      change({
                        people: e.target.checked
                          ? [...(current.current.people || []), person.id]
                          : (current.current.people || []).filter(
                              (id) => id !== person.id,
                            ),
                      })
                    }
                  />
                  {person.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
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
            disabled={
              finishing ||
              mediaBusy ||
              voiceOpen ||
              (!draft.text.trim() && !draft.photos?.length)
            }
            onClick={() => void finish(true)}
          >
            {finishing ? "Keeping…" : "Keep this page"}
            <Check size={20} />
          </button>
          <button
            className="lb-text"
            disabled={finishing || mediaBusy || voiceOpen}
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
