"use client";
import { useState, type ReactNode, type RefObject } from "react";
import { Check } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import { bookPages } from "@/lib/relish/pages";
import {
  nudgeStart,
  nudgeStatus,
  nudgesFor,
  takenToday,
  type Nudge,
  type NudgeAction,
  type NudgeStatus,
} from "@/lib/relish/nudges";
import { underWay, type UnderWay } from "@/lib/relish/catalog";
import { livingOf } from "@/lib/relish/living";
import type { JournalEntry } from "@/lib/relish/journal";
import { pageKind, type DoFilter, type Tone } from "@/lib/relish/catalog";
import PhotoPick from "./PhotoPick";
import { audienceOf } from "@/lib/relish/profiles";
import { JOURNAL_TEXT_LIMIT } from "@/lib/relish/journal";
import Illustration from "./Illustration";
import KidHome from "./KidHome";
import CheckBackCard from "./CheckBack";
import { dueCheckBacks, type CheckBackAnswer } from "@/lib/relish/tools";

export type FamilyPerson = {
  id: string;
  name: string;
  onOpen: () => void;
  /** A short line under the name on Family, e.g. "Book in your account". */
  note?: string;
  /** Their own book in this account: shown as a cover on Family. */
  hasBook?: boolean;
  /** An older copy that still needs its original passphrase. */
  locked?: boolean;
};
export const personTones: Tone[] = ["clay", "sky", "sage", "lilac", "sun"];
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function greetingTime(date = new Date()) {
  const day = date.toLocaleDateString(undefined, { weekday: "long" });
  const h = date.getHours();
  return `${day} ${h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"}`;
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    aria-hidden="true"
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
export const icons = {
  write: (
    <Icon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  ),
  exercise: (
    <Icon>
      <rect x="4" y="5" width="11" height="14" rx="2" />
      <path d="M9 3h9a2 2 0 0 1 2 2v12" />
      <path d="M7.5 10h4M7.5 13.5h4" />
    </Icon>
  ),
  game: (
    <Icon>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.2-6 5-6s5 2.7 5 6" />
      <path d="M14 20c0-2.6 1.3-5 3-5s3.5 2.4 3.5 5" />
    </Icon>
  ),
  think: (
    <Icon>
      <path d="M4 15c2-4 5-6 8-6s6 2 8 6" />
      <path d="M12 9V4M8 5l1.5 2.5M16 5l-1.5 2.5" />
      <path d="M3 19h18" />
    </Icon>
  ),
};

export default function Home({
  book,
  names,
  people,
  busy,
  headingRef,
  onNudge,
  onFilter,
  onInvite,
  onFamily,
  onBook,
  onPage,
  onQuickSave,
  onQuickWrite,
  onQuickPhoto,
  onCheckBack,
  onResume,
  onSaveDraft,
}: {
  book: Book;
  names: string[];
  people: FamilyPerson[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Opens a suggestion; with its id, Home remembers it was taken today. */
  onNudge: (action: NudgeAction, nudgeId?: string) => void;
  /** Reopens something under way, from "Lately in your book". */
  onResume?: (item: UnderWay) => void;
  /** Keeps the suggestion's draft as it stands. */
  onSaveDraft?: (entry: JournalEntry) => void;
  onFilter: (filter: DoFilter) => void;
  onInvite?: () => void;
  onFamily: () => void;
  onBook: () => void;
  onPage: (id: string) => void;
  /** Keeps a page straight from Home; resolves to the new page's id. */
  onQuickSave?: (text: string) => Promise<string>;
  /** Opens the full editor, carrying anything already typed. */
  onQuickWrite?: (text: string, voice: boolean) => void;
  /** Opens a new page with the photo picker showing, carrying any words typed. */
  onQuickPhoto?: (text: string, file: File) => void;
  /** Answers a kept plan that it's time to ask about. */
  onCheckBack?: (id: string, answer: CheckBackAnswer) => void;
}) {
  const list = nudgesFor(book, names);
  // A suggestion taken today stays on the card, so its draft or result shows.
  const [i, setI] = useState(() => {
    const taken = takenToday(book);
    const at = taken ? list.findIndex((n) => n.id === taken.id) : -1;
    return at >= 0 ? at : nudgeStart(list.length);
  });
  const nudge = list[i % Math.max(list.length, 1)];
  const child = audienceOf(book) !== "adult";
  // What's under way comes first, then the newest kept pages.
  // A game at its reveal is already in the book as played; Activities still offers it.
  const revealed = ["reveal", "kept"].includes(livingOf(book).game?.stage ?? "");
  const going = child
    ? []
    : underWay(book, 3)
        .filter((g) => !(g.kind === "game" && revealed))
        .slice(0, 2);
  const latest = bookPages(book).toReversed().slice(0, 5 - going.length);
  const due = dueCheckBacks(book)[0];
  if (child)
    return (
      <KidHome
        book={book}
        list={list}
        start={i}
        busy={busy}
        headingRef={headingRef}
        onNudge={onNudge}
        onFilter={onFilter}
        onBook={onBook}
        onWrite={onQuickWrite && (() => onQuickWrite("", false))}
        onRecord={onQuickWrite && (() => onQuickWrite("", true))}
        onPhoto={onQuickPhoto && ((file) => onQuickPhoto("", file))}
      />
    );
  const tiles: {
    filter: DoFilter;
    tone: Tone;
    kicker: string;
    title: string;
    text: string;
    icon: ReactNode;
  }[] = [
    {
      filter: "1",
      tone: "sun",
      kicker: "1 minute",
      title: "Jot something down",
      text: "Type it, say it, or snap a photo.",
      icon: icons.write,
    },
    {
      filter: "5",
      tone: "sage",
      kicker: "5 minutes",
      title: "Try an exercise",
      text: "Card sorts and little checklists.",
      icon: icons.exercise,
    },
    {
      filter: "kids",
      tone: "clay",
      kicker: child ? "Together · 10 min" : "With the kids · 10 min",
      title: "Play a game",
      text: "Everyone takes a turn. Passing is fine.",
      icon: icons.game,
    },
    {
      filter: "hard",
      tone: "sky",
      kicker: "Something’s hard",
      title: "Think it through",
      text: "Write down what happened. A plan is optional.",
      icon: icons.think,
    },
  ];
  return (
    <main className="rp-place rp-home" aria-labelledby="rp-home-title">
      <section className="rp-greeting">
        <div>
          <p className="rp-eyebrow">{greetingTime()}</p>
          <h1 id="rp-home-title" ref={headingRef} tabIndex={-1}>
            Hi {book.owner}. Here’s one small thing.
          </h1>
        </div>
        <Illustration name="home" size={128} eager className="rp-sun" />
      </section>
      {onQuickSave && onQuickWrite && (
        <QuickJot
          busy={busy}
          onSave={onQuickSave}
          onWrite={onQuickWrite}
          onPhoto={onQuickPhoto}
          onPage={onPage}
        />
      )}
      {/* A plan that's due takes today's one invitation; the suggestion returns once it's answered. */}
      {onCheckBack && due ? (
        <CheckBackCard
          key={due.id}
          book={book}
          item={due}
          busy={busy}
          onAnswer={(answer) => onCheckBack(due.id, answer)}
        />
      ) : nudge && (
        <SuggestionCard
          nudge={nudge}
          status={nudgeStatus(book, nudge)}
          busy={busy}
          more={list.length > 1}
          onOpen={() => onNudge(nudge.action, nudge.id)}
          onPage={onPage}
          onSaveDraft={onSaveDraft}
          onAnother={() => setI((n) => n + 1)}
        />
      )}
      <section className="rp-stack">
        <h2>Or pick by how much time you have</h2>
        <div className="rp-tiles">
          {tiles.map((t) => (
            <button
              key={t.filter}
              className={`rp-tile rp-tone-${t.tone}`}
              disabled={busy}
              onClick={() => onFilter(t.filter)}
            >
              {t.icon}
              <span className="rp-tile-words">
                <span className="rp-tile-kicker">{t.kicker}</span>
                <span className="rp-tile-title">{t.title}</span>
                <span>{t.text}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <div className="rp-pair">
        <section className="rp-panel rp-people-panel">
          <div className="rp-panel-head">
            <h2>Your people</h2>
            <button className="rp-link" disabled={busy} onClick={onFamily}>
              See family
            </button>
          </div>
          <div className="rp-avatars">
            {people.map((p, n) => (
              <button
                key={p.id}
                className="rp-avatar"
                disabled={busy}
                onClick={p.onOpen}
              >
                <span
                  className={`rp-avatar-dot rp-tone-${personTones[n % personTones.length]}`}
                  aria-hidden="true"
                >
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
                <span>{p.name}</span>
              </button>
            ))}
            {onInvite && (
              <button
                className="rp-avatar rp-avatar-add"
                disabled={busy}
                onClick={onInvite}
              >
                <span className="rp-avatar-dot" aria-hidden="true">
                  +
                </span>
                <span>Invite a partner</span>
              </button>
            )}
            {!people.length && !onInvite && (
              <p className="rp-quiet">
                The people in your family show up here.
              </p>
            )}
          </div>
        </section>
        <section className="rp-panel rp-lately">
          <div className="rp-panel-head">
            <h2>Lately in your book</h2>
            <button className="rp-link" disabled={busy} onClick={onBook}>
              Open your book
            </button>
          </div>
          {going.map((g) => (
            <button
              key={`${g.kind}:${g.key}`}
              className="rp-row rp-row-going"
              disabled={busy || !onResume}
              onClick={() => onResume?.(g)}
            >
              <span className="rp-pill rp-pill-going">
                {g.kind === "draft" ? "Draft" : "In progress"}
              </span>
              <span className="rp-row-title">
                {g.title}
                {g.detail && <span className="rp-row-detail"> · {g.detail}</span>}
              </span>
              <span className="rp-row-action">{g.label}</span>
            </button>
          ))}
          {latest.length || going.length ? (
            latest.map((page) => {
              const kind = pageKind(page);
              return (
                <button
                  key={page.id}
                  className="rp-row"
                  disabled={busy}
                  onClick={() => onPage(page.id)}
                >
                  <span className={`rp-pill rp-tone-${kind.tone}`}>
                    {kind.label}
                  </span>
                  <span className="rp-row-title">{page.title}</span>
                  <span className="rp-row-date">{shortDate(page.date)}</span>
                </button>
              );
            })
          ) : (
            <p className="rp-quiet">
              Nothing kept yet. Your first page will show up here.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

const savedAt = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const firstWords = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 160 ? `${t.slice(0, 157).trimEnd()}…` : t;
};

/**
 * Today's suggestion, and what came of it (Scott, 2026-11-20): untouched, a
 * draft with its first words, under way, or done today with what was kept.
 */
function SuggestionCard({
  nudge,
  status,
  busy,
  more,
  onOpen,
  onPage,
  onSaveDraft,
  onAnother,
}: {
  nudge: Nudge;
  status: NudgeStatus;
  busy: boolean;
  more: boolean;
  onOpen: () => void;
  onPage: (id: string) => void;
  onSaveDraft?: (entry: JournalEntry) => void;
  onAnother: () => void;
}) {
  const another = more && (
    <button className="rp-btn rp-btn-ghost" onClick={onAnother}>
      Show me another
    </button>
  );
  if (status.state === "start")
    return (
      <section className="rp-nudge" aria-label="Today’s suggestion">
        <div className="rp-nudge-text">
          <p className="rp-nudge-kicker">
            <span>Try this today</span>
            <span aria-hidden="true">·</span>
            <span>{nudge.time}</span>
          </p>
          <p className="rp-nudge-main" aria-live="polite">
            {nudge.text}
          </p>
          <p className="rp-nudge-why">{nudge.why}</p>
        </div>
        <div className="rp-nudge-actions">
          <button className="rp-btn rp-btn-sun" disabled={busy} onClick={onOpen}>
            {nudge.cta}
          </button>
          {another}
        </div>
      </section>
    );
  const done = status.state === "done";
  const words =
    status.state === "draft" || (done && status.entry) ? status.entry!.text : "";
  const kicker =
    status.state === "draft"
      ? `You started this · Draft saved ${savedAt(status.entry.updatedAt)}`
      : status.state === "going"
        ? `You started this${status.detail ? ` · ${status.detail}` : ""}`
        : status.played
          ? "Done today · Played together"
          : "Done today · Saved in your book";
  return (
    <section className="rp-nudge rp-nudge-taken" aria-label="Today’s suggestion">
      <div className="rp-nudge-text">
        <p className="rp-nudge-kicker">
          {done && <Check size={16} aria-hidden="true" />}
          <span>{kicker}</span>
        </p>
        <p className="rp-nudge-asked">{nudge.text}</p>
        {words.trim() && (
          <blockquote className="rp-nudge-words">“{firstWords(words)}”</blockquote>
        )}
      </div>
      <div className="rp-nudge-actions">
        {done ? (
          <>
            {status.pageId && (
              <button
                className="rp-btn rp-btn-sun"
                disabled={busy}
                onClick={() => onPage(status.pageId!)}
              >
                {status.played ? "See it in your book" : "Read it"}
              </button>
            )}
            {another}
          </>
        ) : (
          <>
            <button className="rp-btn rp-btn-sun" disabled={busy} onClick={onOpen}>
              {status.state === "draft" ? "Keep writing" : "Keep going"}
            </button>
            {status.state === "draft" && onSaveDraft && (
              <button
                className="rp-btn rp-btn-ghost"
                disabled={busy}
                onClick={() => onSaveDraft(status.entry)}
              >
                Save it as is
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Type a line, press Save, and it is a kept page. Nothing else to choose. */
function QuickJot({
  busy,
  onSave,
  onWrite,
  onPhoto,
  onPage,
}: {
  busy: boolean;
  onSave: (text: string) => Promise<string>;
  onWrite: (text: string, voice: boolean) => void;
  onPhoto?: (text: string, file: File) => void;
  onPage: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ready = !!text.trim() && !saving && !busy;
  async function save() {
    if (!ready) return;
    setSaving(true);
    setError("");
    try {
      const id = await onSave(text.trim());
      setText("");
      setSaved(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This page could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="rp-jot" aria-label="Jot something down">
      <form
        className="rp-jot-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="rj-sr-only" htmlFor="rp-jot-input">
          Jot something down
        </label>
        <textarea
          id="rp-jot-input"
          rows={1}
          value={text}
          maxLength={JOURNAL_TEXT_LIMIT}
          disabled={saving}
          placeholder="Jot something down…"
          onChange={(e) => {
            setText(e.target.value);
            setSaved(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void save();
            }
          }}
        />
        <button
          type="button"
          className="rp-jot-mic"
          aria-label="Say it out loud"
          disabled={saving || busy}
          onClick={() => onWrite(text, true)}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        {onPhoto && (
          <PhotoPick
            className="rp-jot-mic"
            label="Add a photo"
            disabled={saving || busy}
            onFile={(file) => onPhoto(text, file)}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </PhotoPick>
        )}
        <button className="rp-jot-save" disabled={!ready}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
      <div className="rp-jot-foot" role="status" aria-live="polite">
        {error ? (
          <span className="lb-error">{error}</span>
        ) : saved ? (
          <>
            <span>Kept in your book.</span>
            <button type="button" className="lb-text" onClick={() => onPage(saved)}>
              Open it to add a title
            </button>
          </>
        ) : (
          <button
            type="button"
            className="lb-text"
            disabled={saving || busy}
            onClick={() => onWrite(text, false)}
          >
            Write more: title, photos, people
          </button>
        )}
      </div>
    </section>
  );
}
