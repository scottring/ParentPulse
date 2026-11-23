"use client";
import ConfirmDelete from "./ConfirmDelete";
import { deletable, deletePage } from "@/lib/relish/delete";
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Share2,
  ArrowUpRight,
  Check,
  Feather,
  Heart,
  Leaf,
  Ellipsis,
  FileText,
  X,
  Image as ImageIcon,
  Lock,
  Mic,
  Pencil,
  Users,
  Plus,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { bookPages } from "@/lib/relish/pages";
import { libraryOnly, noteFamily } from "@/lib/relish/catalog";
import type { PhotoAccess } from "@/lib/relish/photos";
import { PhotoGallery, PhotoPicker } from "./Photos";
import PassagePicker from "./PassagePicker";
import ReadingBook from "./ReadingBook";
import { PageSoundToggle } from "./PageSound";
import VoiceWriter from "./VoiceWriter";
import type { Book } from "@/lib/relish/model";
import {
  audienceOfEntry,
  journalStyles,
  newJournalDraft,
  writeJournalPage,
  renameJournalPage,
  JOURNAL_TEXT_LIMIT,
  JOURNAL_TITLE_LIMIT,
  type JournalDraft,
  type JournalEntry,
  type JournalStyle,
} from "@/lib/relish/journal";
import { useSensory } from "./Sensory";
import { TypingSoundToggle, useTypingSound } from "./TypingSound";
import Illustration from "./Illustration";
import Sprig from "./Sprig";
import ShareSheet, { type SendLine } from "./ShareSheet";
import MentionText from "./MentionText";
import {
  insertMention,
  mentionAt,
  mentionChoices,
  resolveMentions,
  sameName,
} from "@/lib/relish/mentions";
import type { Recipient } from "@/lib/relish/partner-share";
import type { Space } from "./TopBar";
import type { FamilyPage } from "@/lib/relish/family-pages";
import { SubHead } from "./ui";
import "./journal.css";

type Save = (change: (book: Book) => Book) => Promise<void>;
export type FamilyAdd = (
  page: Pick<FamilyPage, "kind" | "text"> &
    Partial<Pick<FamilyPage, "title" | "caption" | "activity" | "mentions" | "sourceId">>,
) => Promise<unknown>;
/** Someone who can be @-mentioned: a person in this journal (with an id) or another family member. */
export type Mentionable = { name: string; id?: string; role?: string };
/** Send a line from the editor; `sourceId` is the entry it came from. */
export type SendFromEntry = (
  to: Recipient[],
  words: Parameters<SendLine>[1] & { sourceId?: string },
) => Promise<void>;
const MENTION_NOTE = "relish.mention-note.v1";
function mentionNoteSeen() {
  try {
    return localStorage.getItem(MENTION_NOTE) === "seen";
  } catch {
    return false;
  }
}
export type JournalNavigation = RefObject<(() => Promise<boolean>) | null>;
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const pageTitle = (entry: JournalDraft) =>
  entry.title.trim() || "Untitled entry";
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
  onActivities,
  photos,
  onOffer,
  onNotice,
  onChapter,
  onManual,
  pendingInsights = 0,
  onAlbum,
  initialDraft,
  initialVoice = false,
  initialPhoto = false,
  initialReading,
  onBack,
  navigation,
  family,
  familyNames = [],
  onFamilyAdd,
  initialCelebrate = false,
  initialPassage = false,
  onKept,
  mentionable,
  recipients,
  onSend,
  onConnect,
}: {
  book: Book;
  /** People who can be @-mentioned while writing. */
  mentionable?: Mentionable[];
  /** Connected grown-ups a line can be sent to (Send a line). */
  recipients?: Recipient[];
  onSend?: SendFromEntry;
  /** Not connected: connect a partner's journal from the share sheet. */
  onConnect?: () => void;
  /** The rest of the family, named in Share with our family. */
  familyNames?: string[];
  /** Adds a page or passage to Our family journal. */
  onFamilyAdd?: FamilyAdd;
  /** Opens on a just-saved page with "Entry saved". */
  initialCelebrate?: boolean;
  /** Opens the reading page with "Choose a passage" already showing. */
  initialPassage?: boolean;
  /** After Save privately: show the page in the journal instead of here. */
  onKept?: (journalId: string, problem?: string) => void;
  /** Family with their own books in the library, so they can be tagged too. */
  family?: { name: string }[];
  save: Save;
  sample: boolean;
  onEditingChange: (editing: boolean) => void;
  onDone: () => void;
  onActivities?: () => void;
  photos?: PhotoAccess;
  onOffer?: (passage: { title: string; text: string }) => void;
  onNotice?: () => void;
  onChapter?: (chapter: "people" | "practice") => void;
  onManual?: () => void;
  pendingInsights?: number;
  onAlbum?: () => void;
  initialDraft?: JournalDraft;
  initialVoice?: boolean;
  /** Opens the new page with the photo picker showing. */
  initialPhoto?: boolean;
  /** Opens straight onto one kept page (a BookPage id). */
  initialReading?: string;
  /** When set, "My pages" returns here instead of the page list. */
  onBack?: () => void;
  navigation?: JournalNavigation;
}) {
  const [editor, setEditor] = useState<JournalDraft | null>(
    initialDraft || null,
  );
  const [reading, setReading] = useState<string | null>(
    initialReading ?? null,
  );
  const [celebrate, setCelebrate] = useState(initialCelebrate);
  const [query, setQuery] = useState("");
  const [excerpt, setExcerpt] = useState<string | null>(initialPassage ? "" : null);
  const [problem, setProblem] = useState("");
  const prose = useRef<HTMLElement>(null);
  const sensory = useSensory();
  const top = useRef<HTMLHeadingElement>(null);
  const entries = bookPages(book);
  const drafts = (book.journal || []).filter((e) => e.status === "draft");
  const page = entries.find((e) => e.id === reading);
  const pageIndex = entries.findIndex((e) => e.id === reading);
  const nextPage = entries[pageIndex + 1];
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
  /** Save draft and close: back to the journal it was written in. */
  function leaveEditor() {
    onEditingChange(false);
    setEditor(null);
    setReading(null);
    if (onBack) onBack();
    else onActivities?.();
  }
  if (editor)
    return (
      <main className="rj-workspace">
        <JournalEditor
          key={editor.id}
          initial={editor}
          navigation={navigation}
          initialVoice={initialVoice && editor.id === initialDraft?.id}
          initialPhoto={initialPhoto && editor.id === initialDraft?.id}
          initialEntry={editingEntry}
          save={save}
          sample={sample}
          book={book}
          family={family}
          photos={photos}
          familyNames={familyNames}
          onFamilyAdd={onFamilyAdd}
          mentionable={mentionable}
          recipients={recipients}
          onSend={onSend}
          onConnect={onConnect}
          onPause={leaveEditor}
          onKeep={(entry, problem) => {
            if (onKept) {
              onEditingChange(false);
              onKept(entry.id, problem);
              return;
            }
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
        <SubHead
          className="rj-reading-top"
          back={{
            label: onBack ? "Back to the journal" : "Back to my entries",
            onClick: () => {
              if (onBack) return onBack();
              setReading(null);
              setCelebrate(false);
            },
          }}
          note={sample ? "Fictional sample" : "Only you"}
        />
        {celebrate && (
          <div className="rj-celebration" role="status">
            <Illustration name="saved" size={72} eager className="rj-celebration-mark" />
            <div>
              <strong>Entry saved</strong>
              <p>It’s in your journal. That’s a good place to stop.</p>
            </div>
          </div>
        )}
        <ReadingBook
          key={page.id}
          flowRef={prose}
          className={`rj-sequence-paper rj-${page.style}`}
          entryLabel={`Entry ${pageIndex + 1} of ${entries.length}`}
          onPreviousEntry={
            pageIndex > 0
              ? () => {
                  setReading(entries[pageIndex - 1].id);
                  setCelebrate(false);
                  sensory.play("touch");
                }
              : undefined
          }
          onNextEntry={
            nextPage
              ? () => {
                  setReading(nextPage.id);
                  setCelebrate(false);
                  sensory.play("touch");
                }
              : undefined
          }
          onNewEntry={() => edit(newJournalDraft())}
        >
          <header className="rd-head">
            <p className="rd-date">
              {dateLabel(page.date)}
              <StyleMark style={page.style} />
            </p>
            <PageTitle
              book={book}
              journalId={page.journalId}
              title={page.title}
              save={save}
              headingRef={top}
              compact
            />
            {(page.kind !== "Journal entry" || page.exercise || page.from) && (
              <p className="lb-kicker">
                {page.kind}
                {page.exercise ? ` · ${page.exercise}` : ""}
                {page.from ? ` · From ${page.from}` : ""}
              </p>
            )}
          </header>
          <div className="rj-prose">
            <MentionText text={page.text} />
          </div>
          <PhotoGallery photos={page.photos} access={photos} />
          {page.sections.map((section, i) => (
            <section className="rj-page-section" key={`${i}:${section.label}`}>
              <p className="lb-kicker">{section.label}</p>
              <p>{section.text}</p>
            </section>
          ))}
          {page.people.length > 0 && !page.from && !page.record && (
            <p className="rj-private">
              Thinking of{" "}
              {page.people
                .map((id) => book.people.find((p) => p.id === id)?.name)
                .filter(Boolean)
                .join(", ")}{" "}
              · private tags
            </p>
          )}
        </ReadingBook>
        <div className="rd-tools">
          {page.journalId && (
            <button
              className="lb-text"
              onClick={() =>
                edit(book.journal!.find((e) => e.id === page.journalId)!)
              }
            >
              <Feather size={15} /> Edit this page
            </button>
          )}
          {problem && (
            <p className="lb-error" role="alert">
              {problem}
            </p>
          )}
          {!sample && deletable(page.id) && (
            <ConfirmDelete
              label="Delete this page"
              question="Delete this page?"
              detail={`It’s removed from this journal on every device${page.kind === "Received passage" ? "; the sender’s copy stays with them" : ""}. This can’t be undone.`}
              onConfirm={async () => {
                try {
                  await save((b) => deletePage(b, page.id));
                  sensory.play("place");
                  if (onBack) onBack();
                  else setReading(null);
                } catch {
                  setProblem("This page couldn’t be deleted. It’s still here; please try again.");
                }
              }}
            />
          )}
          {!page.record && (
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
              <Share2 size={15} /> Choose a passage
            </button>
          )}
          {onActivities && (
            <button className="lb-text" onClick={onActivities}>
              Choose another activity
            </button>
          )}
          <button className="lb-text" onClick={onDone}>
            Done for now <Check size={15} />
          </button>
          <PageSoundToggle />
        </div>
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
      </main>
    );
  const matching = entries.filter((e) =>
    `${e.title}\n${e.text}\n${e.people.map((id) => book.people.find((p) => p.id === id)?.name || "").join(" ")}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <main className="rj-workspace">
      {onBack && (
        <SubHead
          back={{ label: "Back to the journal", onClick: onBack }}
          note={sample ? "Fictional sample" : "Only you"}
        />
      )}
      <header className="rj-welcome">
        <div>
          <p className="lb-kicker">Journal, reflections and shared passages</p>
          <h2 ref={top} tabIndex={-1}>Your pages</h2>
          <p>
            Read your entries in date order.
            <br className="rj-desktop-break" /> Write a new entry or continue a draft.
          </p>
          <button
            className="rj-new-page"
            onClick={() => edit(newJournalDraft())}
          >
            New journal entry <Plus size={23} />
          </button>
          <p className="rj-private">
            <Lock size={14} />{" "}
            {sample
              ? "Sample pages disappear when you reload."
              : "Encrypted in your private journal."}
          </p>
        </div>
        <Illustration name="your-book" size={260} eager className="rj-welcome-art" />
      </header>
      <div className="rj-capture-actions rj-browse-links">
        {onManual && (
          <button className="lb-text" onClick={onManual}>
            <Sparkles size={16} /> My manual
            {pendingInsights ? ` · ${pendingInsights} to consider` : ""}
          </button>
        )}
        {onAlbum && (
          <button className="lb-text" onClick={onAlbum}>
            Family album
          </button>
        )}
        {onNotice && (
          <button className="lb-text" onClick={onNotice}>
            Guided reflection <Feather size={16} />
          </button>
        )}
        {onChapter && (
          <>
            <button className="lb-text" onClick={() => onChapter("people")}>
              The people in my life
            </button>
            <button className="lb-text" onClick={() => onChapter("practice")}>
              Practice plans
            </button>
          </>
        )}
      </div>
      {drafts.length > 0 && (
        <section className="rj-drafts" aria-label="Pages in progress">
          <p className="lb-kicker">Saved drafts</p>
          {problem && (
            <p className="lb-error" role="alert">
              {problem}
            </p>
          )}
          {drafts.map((draft) => (
            <div className="rj-draft-row" key={draft.id}>
              <button className="lb-secondary" onClick={() => edit(draft)}>
                Keep writing: {pageTitle(draft)} <Feather size={16} />
              </button>
              <ConfirmDelete
                label="Discard"
                ariaLabel={`Discard ${pageTitle(draft)}`}
                question="Discard this draft?"
                yes="Yes, discard"
                onConfirm={() =>
                  save((b) => deletePage(b, `journal:${draft.id}`)).catch(() =>
                    setProblem("This draft couldn’t be discarded. Please try again."),
                  )
                }
              />
            </div>
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
                  {entry.text || "Photo entry"}
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
          <Illustration name="empty-pages" size={120} />
          <p>
            No entries yet.
            <br />
            <strong>Select New journal entry to start writing or add a photo.</strong>
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
  initialVoice = false,
  initialPhoto = false,
  navigation,
  family,
  familyNames = [],
  onFamilyAdd,
  mentionable = [],
  recipients = [],
  onSend,
  onConnect,
}: {
  family?: { name: string }[];
  familyNames?: string[];
  onFamilyAdd?: FamilyAdd;
  mentionable?: Mentionable[];
  recipients?: Recipient[];
  onSend?: SendFromEntry;
  onConnect?: () => void;
  initial: JournalDraft;
  initialVoice?: boolean;
  initialPhoto?: boolean;
  navigation?: JournalNavigation;
  initialEntry?: JournalEntry;
  save: Save;
  sample: boolean;
  onPause: () => void;
  onKeep: (entry: JournalEntry, problem?: string) => void;
  book?: Book;
  photos?: PhotoAccess;
}) {
  const [draft, setDraft] = useState<JournalDraft>(initial);
  // Family from the library who aren't in this journal yet; tagging one notes them.
  const extra = book ? libraryOnly(book.people, family) : [];
  const canTag = !!book?.people.length || extra.length > 0;
  const editorTyping = useTypingSound();
  const [panel, setPanel] = useState<"photo" | "people" | "options" | null>(
    initialPhoto ? "photo" : null,
  );
  const [mediaBusy, setMediaBusy] = useState(false);
  const [navigationNotice, setNavigationNotice] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(initialVoice);
  const [saved, setSaved] = useState(signature(initial));
  const [pending, setPending] = useState(0);
  const [hasSaved, setHasSaved] = useState(!!initialEntry);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const [showPrevious, setShowPrevious] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  // @-mentions: what's being typed after an @, and which choice is lit.
  const [pick, setPick] = useState<{ start: number; query: string; index: number } | null>(null);
  const [noteSeen, setNoteSeen] = useState(mentionNoteSeen);
  const body = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const [pickAt, setPickAt] = useState<{ top: number; left: number } | null>(null);
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
    const wasKept = status.current === "kept";
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
      if (!keep) return onPause();
      // Written for Our family journal: the whole page also goes there, once.
      let problem: string | undefined;
      if (forFamily && onFamilyAdd && !wasKept) {
        const page = current.current;
        if (!page.text.trim())
          problem = "An entry needs words to go in Our family journal.";
        else
          try {
            await onFamilyAdd({ kind: "page", title: pageTitle(page), text: page.text });
          } catch (e) {
            problem =
              e instanceof Error ? e.message : "Our family journal couldn’t be reached.";
          }
      }
      if (alive.current) onKeep(entry, problem);
    } catch {
      /* Keep the writer open with the last words and a retry action. */
    } finally {
      finalizing.current = false;
      if (alive.current) setFinishing(false);
    }
  }
  // Header actions wait for this editor's queue before they can replace or lock it.
  // Keep the callback registered while account/settings dialogs cover the writer.
  useImperativeHandle(navigation, () => async () => {
    if (finalizing.current) return false;
    if (mediaBusy || voiceOpen) {
      setNavigationNotice(
        mediaBusy
          ? "Your photo is still being added. Give it a moment, then try again."
          : "Finish or close voice writing before moving to another activity.",
      );
      return false;
    }
    setNavigationNotice("");
    finalizing.current = true;
    setFinishing(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      if (dirty || pending > 0) await persist(current.current);
      return alive.current;
    } catch {
      return false;
    } finally {
      finalizing.current = false;
      if (alive.current) setFinishing(false);
    }
  });
  const previous = book
    ? bookPages(book)
        .filter((p) => p.journalId !== draft.id)
        .at(-1)
    : undefined;
  const kept = initialEntry?.status === "kept";
  const tagged = draft.people?.length || 0;
  const saveLabel =
    pending > 0
      ? "Saving…"
      : error
        ? "Not saved yet"
        : dirty
          ? "Unsaved changes…"
          : hasSaved
            ? kept
              ? "Saved"
              : "Draft saved"
            : "";
  const hasContent =
    !!draft.text.trim() || !!draft.title.trim() || !!draft.photos?.length;
  const toggle = (next: "photo" | "people" | "options") =>
    setPanel((open) => (open === next ? null : next));
  // The journal comes from the draft itself, never from where you navigated:
  // a private draft can't become a family entry by switching journals.
  const forFamily = audienceOfEntry(draft) === "family";
  const space: Space = forFamily ? "family" : "me";
  // The page grows with the words instead of scrolling inside itself.
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [draft.text]);
  // Who can be @-mentioned: the family as LivingBook knows it, else this journal's people.
  const people: Mentionable[] = (
    mentionable.length
      ? mentionable
      : [
          ...(book?.people || []).map((p) => ({ name: p.name, id: p.id, role: p.role })),
          ...extra.map((name) => ({ name })),
        ]
  ).filter((m) => !book || !sameName(m.name, book.owner));
  const choices = pick ? mentionChoices(people, pick.query) : [];
  const mentionedNames = resolveMentions(draft.text, people.map((m) => m.name));
  // The mirror behind the textarea draws mentions in green; it copies the
  // textarea's type and spacing so the two line up, and finds the caret for
  // the list of people.
  useLayoutEffect(() => {
    const el = body.current,
      m = mirror.current;
    if (!el || !m) return;
    const cs = getComputedStyle(el);
    for (const k of [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "lineHeight",
      "letterSpacing",
      "wordSpacing",
      "textIndent",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "boxSizing",
    ] as const)
      m.style[k] = cs[k];
    m.style.borderStyle = "solid";
    m.style.borderColor = "transparent";
    const mark = marker.current;
    if (!pick || !mark) return;
    const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5 || 28;
    setPickAt({
      top: mark.offsetTop + line,
      left: Math.max(0, Math.min(mark.offsetLeft, m.clientWidth - 230)),
    });
  }, [draft.text, pick]);
  function updatePick(el: HTMLTextAreaElement) {
    const at = el.selectionStart === el.selectionEnd ? mentionAt(el.value, el.selectionStart) : null;
    setPick((old) =>
      at && people.length
        ? { ...at, index: old && old.start === at.start ? old.index : 0 }
        : null,
    );
  }
  /** Writes "@Name" and files the entry under them. Mentioning shares nothing. */
  function chooseMention(m: Mentionable) {
    if (!pick) return;
    const el = body.current;
    const next = insertMention(current.current.text, pick, m.name);
    const id = m.id ?? book?.people.find((p) => sameName(p.name, m.name))?.id;
    const tags = current.current.people || [];
    change({
      text: next.text.slice(0, JOURNAL_TEXT_LIMIT),
      ...(id && !tags.includes(id) ? { people: [...tags, id] } : {}),
    });
    setPick(null);
    // Family from the library who aren't in this journal yet are noted, then tagged.
    if (!id && extra.some((n) => sameName(n, m.name))) {
      let noted = "";
      void save((b) => {
        const [after, chosen] = noteFamily(b, m.name);
        noted = chosen;
        return after;
      })
        .then(() => {
          if (noted && !(current.current.people || []).includes(noted))
            change({ people: [...(current.current.people || []), noted] });
        })
        .catch(() => setError("Could not tag. Please try again."));
    }
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  }
  const taggedPeople = (draft.people || [])
    .map((id) => book?.people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const canSend = !!onSend && recipients.length > 0;
  const canShare = (!!onFamilyAdd || canSend) && !!draft.text.trim();
  function openShare() {
    const el = body.current;
    const picked =
      el && el.selectionEnd > el.selectionStart
        ? el.value.slice(el.selectionStart, el.selectionEnd)
        : "";
    setSharing(picked);
  }
  const busyNow = finishing || mediaBusy || voiceOpen;
  return (
    <div className={`rj-writing rj-${draft.style} rj-${space}`}>
      <div className="rj-writing-intro rj-book-head rj-one-head">
        <h2 className="ui-sr-only">{kept ? "Edit entry" : "New entry"}</h2>
        {hasContent && (
          <button
            type="button"
            className="rj-previous-link rj-close-link"
            disabled={busyNow}
            onClick={() => void finish(false)}
          >
            Save draft and close
          </button>
        )}
        <button
          type="button"
          className="rj-previous-link"
          aria-expanded={showPrevious}
          onClick={() => setShowPrevious(!showPrevious)}
        >
          {showPrevious ? "Hide previous entry" : "Previous entry"}
        </button>
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
      <div
        className={`rd-writing-spread rj-book ${showPrevious ? "rj-with-previous" : "rj-one-page"}`}
      >
        {showPrevious && (
          <aside
            className="rj-paper rd-writing-context"
            aria-label="Previous entry"
          >
            <Sprig className="rj-sprig rj-sprig-bottom" />
            <p className="lb-kicker">
              {book?.owner ? `${book.owner}’s previous entry` : "Previous entry"}
            </p>
            {previous ? (
              <>
                <p className="rd-context-date">{dateLabel(previous.date)}</p>
                <PageTitle
                  book={book!}
                  journalId={previous.journalId}
                  title={previous.title}
                  save={save}
                  compact
                />
                <div className="rj-prose rd-context-prose">{previous.text}</div>
                <PhotoGallery photos={previous.photos} access={photos} />
              </>
            ) : (
              <>
                <Illustration name="empty-pages" size={132} className="rd-end-art" />
                <h2>No previous entries</h2>
                <p>Your first page goes on the right.</p>
              </>
            )}
          </aside>
        )}
        <section
          className="rj-paper rd-editor-page"
          aria-label="Journal editor"
        >
          <Sprig className="rj-sprig rj-sprig-top" />
          <div className="rj-page-meta">
            <p className="rd-context-date">{dateLabel(draft.createdAt)}</p>
            <span className="rj-meta-rule" aria-hidden="true" />
            <span className={`rj-audience ${forFamily ? "rj-audience-family" : ""}`}>
              {forFamily ? (
                <>
                  <Users size={15} aria-hidden="true" /> Our family journal
                </>
              ) : (
                <>
                  <Lock size={14} aria-hidden="true" /> Only you
                </>
              )}
            </span>
          </div>
          {forFamily && (
            <p className="rj-audience-note">
              Adding keeps a private copy for you and puts the whole entry in
              Our family journal, where everyone in the family can read it.
            </p>
          )}
          <label className="rj-title-label rj-title-first">
            <span className="rj-sr-only">Title</span>
            <input
              aria-label="Title"
              maxLength={JOURNAL_TITLE_LIMIT}
              value={draft.title}
              disabled={finishing}
              onChange={(e) => change({ title: e.target.value })}
              {...editorTyping}
              placeholder="Give this page a title"
            />
          </label>
          <div className="rj-writing-label rj-mention-field">
            <span className="rj-sr-only">Your journal entry</span>
            <div className="rj-mention-mirror" ref={mirror} aria-hidden="true">
              {pick ? (
                <>
                  <MentionText text={draft.text.slice(0, pick.start)} />
                  <span ref={marker} />
                  <MentionText text={draft.text.slice(pick.start)} />
                </>
              ) : (
                <MentionText text={draft.text} />
              )}
              {"\n"}
            </div>
            <textarea
              ref={body}
              aria-label="Your journal entry"
              aria-autocomplete="list"
              aria-controls={choices.length ? "rj-mention-pick" : undefined}
              aria-activedescendant={
                pick && choices.length ? `rj-mention-${pick.index}` : undefined
              }
              value={draft.text}
              maxLength={JOURNAL_TEXT_LIMIT}
              disabled={finishing}
              onChange={(e) => {
                change({ text: e.target.value });
                updatePick(e.target);
              }}
              onSelect={(e) => updatePick(e.currentTarget)}
              onBlur={() => setPick(null)}
              onFocus={editorTyping.onFocus}
              onKeyUp={editorTyping.onKeyUp}
              onKeyDown={(e) => {
                if (pick && choices.length) {
                  const n = choices.length;
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setPick({ ...pick, index: (pick.index + (e.key === "ArrowDown" ? 1 : n - 1)) % n });
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    chooseMention(choices[Math.min(pick.index, n - 1)]);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setPick(null);
                    return;
                  }
                }
                editorTyping.onKeyDown(e);
              }}
              placeholder="Start writing…"
              rows={5}
            />
            {pick && choices.length > 0 && (
              <ul
                id="rj-mention-pick"
                className="rj-mention-pick"
                role="listbox"
                aria-label="Mention someone"
                style={pickAt ? { top: pickAt.top, left: pickAt.left } : undefined}
              >
                {choices.map((m, i) => (
                  <li
                    key={`${m.id ?? ""}:${m.name}`}
                    id={`rj-mention-${i}`}
                    role="option"
                    aria-selected={i === pick.index}
                    // Keep the textarea's focus and caret while choosing.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => chooseMention(m)}
                  >
                    <span className="rs-face" aria-hidden="true">
                      {m.name.trim().charAt(0).toLocaleUpperCase()}
                    </span>
                    {m.name}
                    {m.role && <span className="rj-mention-role">{m.role}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {mentionedNames.length > 0 && !noteSeen && (
            <p className="rj-mention-note" role="note">
              <span className="rj-mention">@</span>
              <span>
                <strong>Mentioning someone doesn’t share anything.</strong> It
                files this entry under{" "}
                {mentionedNames.length < 3
                  ? mentionedNames.join(" and ")
                  : "them"}{" "}
                in your journal. To let them read it, send it.
              </span>
              <button
                type="button"
                onClick={() => {
                  setNoteSeen(true);
                  try {
                    localStorage.setItem(MENTION_NOTE, "seen");
                  } catch {
                    /* It shows again next time; nothing else depends on it. */
                  }
                }}
              >
                Got it
              </button>
            </p>
          )}
          {navigationNotice && (mediaBusy || voiceOpen) && (
            <p className="lb-fine" role="status">
              {navigationNotice}
            </p>
          )}
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
          {photos && (panel === "photo" || !!draft.photos?.length) && (
            <PhotoPicker
              photos={draft.photos || []}
              access={photos}
              disabled={finishing}
              onBusy={setMediaBusy}
              onChange={(photos) => change({ photos })}
            />
          )}
          {panel === "people" && book && canTag && (
            <div className="rj-popover rj-popover-people">
            <button
              type="button"
              className="rj-popover-close"
              aria-label="Close tag people"
              onClick={() => setPanel(null)}
            >
              <X size={18} />
            </button>
            <fieldset
              className="rj-people-tags"
              disabled={finishing || mediaBusy}
            >
              <legend>
                Tag people
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
                {extra.map((name) => (
                  <label key={`family:${name}`}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(e) => {
                        if (!e.target.checked) return;
                        let id = "";
                        void save((b) => {
                          const [next, chosen] = noteFamily(b, name);
                          id = chosen;
                          return next;
                        })
                          .then(() => {
                            if (id && !(current.current.people || []).includes(id))
                              change({
                                people: [...(current.current.people || []), id],
                              });
                          })
                          .catch(() => setError("Could not tag. Please try again."));
                      }}
                    />
                    {name}
                  </label>
                ))}
              </div>
            </fieldset>
            </div>
          )}
          {panel === "options" && (
            <div className="rj-popover rj-page-options">
              <button
                type="button"
                className="rj-popover-close"
                aria-label="Close page options"
                onClick={() => setPanel(null)}
              >
                <X size={18} />
              </button>
              <p className="rj-popover-title">Page options</p>
              <fieldset className="rj-style-picker" disabled={finishing}>
                <legend>Page color</legend>
                <div>
                  {(Object.keys(journalStyles) as JournalStyle[]).map(
                    (style) => (
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
                        <StyleMark style={style} />{" "}
                        {journalStyles[style].label}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
              <TypingSoundToggle />
            </div>
          )}
          <div className="rj-toolbar" role="group" aria-label="Page tools">
            {book && (
              <button
                type="button"
                aria-label="Voice: record your voice"
                disabled={finishing || mediaBusy}
                onClick={() => setVoiceOpen(true)}
              >
                <Mic size={19} aria-hidden="true" /> Voice
              </button>
            )}
            {photos && (
              <button
                type="button"
                aria-pressed={panel === "photo"}
                disabled={finishing}
                onClick={() => toggle("photo")}
              >
                <ImageIcon size={19} /> Photo
                {draft.photos?.length ? ` · ${draft.photos.length}` : ""}
              </button>
            )}
            {canTag && (
              <button
                type="button"
                aria-pressed={panel === "people"}
                disabled={finishing}
                onClick={() => toggle("people")}
              >
                <Users size={19} /> Tag people{tagged ? ` · ${tagged}` : ""}
              </button>
            )}
            <button
              type="button"
              className="rj-toolbar-quiet"
              aria-pressed={panel === "options"}
              disabled={finishing}
              onClick={() => toggle("options")}
            >
              <Ellipsis size={19} aria-hidden="true" />{" "}
              <span className="rj-toolbar-word">Page options</span>
            </button>
          </div>
          {taggedPeople.length > 0 && (
            <div className="rj-tag-chips">
              {taggedPeople.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="rj-tag-chip"
                  aria-label={`Untag ${p.name}`}
                  disabled={finishing}
                  onClick={() =>
                    change({
                      people: (current.current.people || []).filter((id) => id !== p.id),
                    })
                  }
                >
                  {p.name} <X size={13} aria-hidden="true" />
                </button>
              ))}
              <span className="rj-tag-note">Tags are private</span>
            </div>
          )}
          <div className="rj-save-row">
            <span className="rj-save-state" role="status" aria-live="polite">
              <FileText size={18} aria-hidden="true" />
              {saveLabel || (hasContent ? "Draft" : "Empty draft")}
            </span>
            {(onFamilyAdd || canSend) && (
              <button
                type="button"
                className="rj-share"
                disabled={busyNow || !canShare}
                onClick={openShare}
              >
                Share a passage
              </button>
            )}
            <button
              className="rj-keep"
              disabled={
                busyNow || (!draft.text.trim() && !draft.photos?.length)
              }
              onClick={() => void finish(true)}
            >
              {finishing
                ? "Saving…"
                : forFamily
                    ? "Add to our family journal"
                  : "Save privately"}
            </button>
          </div>
        </section>
      </div>
      {sharing !== null && (onFamilyAdd || canSend) && (
        <ShareSheet
          title={pageTitle(draft)}
          text={draft.text}
          selected={sharing}
          owner={book?.owner || ""}
          others={familyNames}
          caption={
            taggedPeople[0]?.name ??
            familyNames.find((n) =>
              new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(draft.text),
            ) ??
            ""
          }
          onClose={() => setSharing(null)}
          recipients={canSend ? recipients : []}
          mentioned={[...mentionedNames, ...taggedPeople.map((p) => p.name)]}
          onConnect={
            onConnect
              ? () => {
                  setSharing(null);
                  onConnect();
                }
              : undefined
          }
          onSend={
            canSend
              ? async (to, words) => {
                  if (timer.current) clearTimeout(timer.current);
                  if (dirty || revision.current === 0) await persist(current.current);
                  await onSend!(to, { ...words, sourceId: current.current.id });
                  if (alive.current) setSharing(null);
                }
              : undefined
          }
          onAdd={
            onFamilyAdd
              ? async (page) => {
                  if (timer.current) clearTimeout(timer.current);
                  // An unsaved draft is saved to your journal first.
                  if (dirty || revision.current === 0) await persist(current.current);
                  const mentions = resolveMentions(
                    `${page.title || ""}\n${page.text}`,
                    people.map((m) => m.name),
                  );
                  await onFamilyAdd({
                    ...page,
                    ...(mentions.length ? { mentions } : {}),
                    sourceId: current.current.id,
                  });
                  if (alive.current) setSharing(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

/** A page title with Rename / Add a title for journal pages. */
function PageTitle({
  book,
  journalId,
  title,
  save,
  headingRef,
  compact = false,
}: {
  book: Book;
  journalId?: string;
  title: string;
  save: Save;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  /** Icon-only rename, for the quiet facing page. */
  compact?: boolean;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const typing = useTypingSound();
  const sensory = useSensory();
  const entry = journalId
    ? book.journal?.find((e) => e.id === journalId)
    : undefined;
  if (entry && value !== null)
    return (
      <form
        className="rj-rename"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          save((b) => renameJournalPage(b, entry.id, value))
            .then(() => {
              setValue(null);
              sensory.play("place");
            })
            .catch((err) =>
              setError(
                err instanceof Error ? err.message : "The title could not be saved.",
              ),
            )
            .finally(() => setBusy(false));
        }}
      >
        <label className="rj-title-label">
          <span className="rj-sr-only">Title</span>
          <input
            aria-label="Title"
            autoFocus
            maxLength={JOURNAL_TITLE_LIMIT}
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            onFocus={typing.onFocus}
            onKeyUp={typing.onKeyUp}
            onKeyDown={(e) => {
              typing.onKeyDown(e);
              if (e.key === "Escape") setValue(null);
            }}
            placeholder="Give this page a title"
          />
        </label>
        <div className="rj-rename-actions">
          <button className="lb-primary" disabled={busy}>
            <Check size={16} /> {busy ? "Saving…" : "Save title"}
          </button>
          <button
            type="button"
            className="lb-text"
            disabled={busy}
            onClick={() => setValue(null)}
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="lb-error" role="alert">
            {error}
          </p>
        )}
      </form>
    );
  return (
    <div className="rj-title-row">
      <h2 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
        {title}
      </h2>
      {entry && (
        <button
          type="button"
          className={compact ? "rj-rename-icon" : "rj-rename-button"}
          aria-label={
            compact
              ? entry.title.trim()
                ? "Rename"
                : "Add a title"
              : undefined
          }
          title={compact ? (entry.title.trim() ? "Rename" : "Add a title") : undefined}
          onClick={() => {
            setError("");
            setValue(entry.title);
          }}
        >
          <Pencil size={compact ? 20 : 16} />
          {!compact && (entry.title.trim() ? "Rename" : "Add a title")}
        </button>
      )}
    </div>
  );
}
