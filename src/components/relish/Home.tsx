"use client";
import { useState, type ReactNode, type RefObject } from "react";
import type { Book } from "@/lib/relish/model";
import { bookPages } from "@/lib/relish/pages";
import { nudgeStart, nudgesFor, type NudgeAction } from "@/lib/relish/nudges";
import { pageKind, type DoFilter, type Tone } from "@/lib/relish/catalog";
import { audienceOf } from "@/lib/relish/profiles";
import { JOURNAL_TEXT_LIMIT } from "@/lib/relish/journal";
import Illustration from "./Illustration";
import KidHome from "./KidHome";

export type FamilyPerson = {
  id: string;
  name: string;
  onOpen: () => void;
  /** A short line under the name on Family, e.g. "Book in your account". */
  note?: string;
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
}: {
  book: Book;
  names: string[];
  people: FamilyPerson[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onNudge: (action: NudgeAction) => void;
  onFilter: (filter: DoFilter) => void;
  onInvite?: () => void;
  onFamily: () => void;
  onBook: () => void;
  onPage: (id: string) => void;
  /** Keeps a page straight from Home; resolves to the new page's id. */
  onQuickSave?: (text: string) => Promise<string>;
  /** Opens the full editor, carrying anything already typed. */
  onQuickWrite?: (text: string, voice: boolean) => void;
  /** Opens a new page with the photo picker showing. */
  onQuickPhoto?: () => void;
}) {
  const list = nudgesFor(book, names);
  const [i, setI] = useState(() => nudgeStart(list.length));
  const nudge = list[i % Math.max(list.length, 1)];
  const child = audienceOf(book) !== "adult";
  const latest = bookPages(book).toReversed().slice(0, 3);
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
        onPhoto={onQuickPhoto}
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
        <QuickJot busy={busy} onSave={onQuickSave} onWrite={onQuickWrite} onPage={onPage} />
      )}
      {nudge && (
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
            <button
              className="rp-btn rp-btn-sun"
              disabled={busy}
              onClick={() => onNudge(nudge.action)}
            >
              {nudge.cta}
            </button>
            {list.length > 1 && (
              <button
                className="rp-btn rp-btn-ghost"
                onClick={() => setI((n) => n + 1)}
              >
                Show me another
              </button>
            )}
          </div>
        </section>
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
          {latest.length ? (
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

/** Type a line, press Save, and it is a kept page. Nothing else to choose. */
function QuickJot({
  busy,
  onSave,
  onWrite,
  onPage,
}: {
  busy: boolean;
  onSave: (text: string) => Promise<string>;
  onWrite: (text: string, voice: boolean) => void;
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
        <button className="rp-jot-save" disabled={!ready}>
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
      <div className="rp-jot-foot" role="status" aria-live="polite">
        {error ? (
          <span className="lb-error">{error}</span>
        ) : saved ? (
          <>
            <span>Saved to your book.</span>
            <button type="button" className="lb-text" onClick={() => onPage(saved)}>
              Add a title
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
