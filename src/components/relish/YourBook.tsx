"use client";
import { useEffect, useState, type RefObject } from "react";
import type { Book, Person } from "@/lib/relish/model";
import { bookPages, PLAY_RECORD, type BookPage } from "@/lib/relish/pages";
import { cardPeople, manualOf, type ManualCard } from "@/lib/relish/manual";
import { livingOf, pendingPractice } from "@/lib/relish/living";
import { activeTrackers, toolById, trackerProgress } from "@/lib/relish/tools";
import { pageKind, type Tone } from "@/lib/relish/catalog";
import type { JournalDraft } from "@/lib/relish/journal";
import { icons, personTones } from "./Home";
import { audienceOf, canUseOnline } from "@/lib/relish/profiles";
import { KidCoverMark } from "./KidHome";
import { BookSpread } from "./ui";
import Illustration from "./Illustration";

/** "all", "me", "family", or a person's id. */
export type Who = string;
type Learned = {
  id: string;
  /** Chips this shows under: a person's id, or for a suggestion the people it is about, then "me" or "family". */
  who: string[];
  tone: Tone;
  text: string;
  tryThis?: string;
};
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const shared = (p: BookPage) =>
  p.kind === "Made together" ||
  p.kind === PLAY_RECORD ||
  p.kind === "Received passage";

export function pagesFor(book: Book, who: Who, query = "") {
  const q = query.trim().toLocaleLowerCase();
  return bookPages(book)
    .filter((p) =>
      who === "all"
        ? true
        : who === "me"
          ? !shared(p)
          : who === "family"
            ? shared(p)
            : p.people.includes(who),
    )
    .filter(
      (p) =>
        !q ||
        `${p.title}\n${p.text}\n${p.people
          .map((id) => book.people.find((x) => x.id === id)?.name || "")
          .join(" ")}`
          .toLocaleLowerCase()
          .includes(q),
    )
    .toReversed();
}

export default function YourBook({
  book,
  busy,
  headingRef,
  initialWho = "all",
  initialQuery = "",
  onBrowse,
  onAddPage,
  onIdea,
  onOpenPage,
  onReview,
  onManual,
  onDraft,
  onPractice,
  onResumeVisit,
  onExercise,
  onAddPerson,
  onEditPerson,
}: {
  book: Book;
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  initialWho?: Who;
  initialQuery?: string;
  /** Reports the filter and search so Back from a page can restore them. */
  onBrowse?: (who: Who, query: string) => void;
  /** Opens the journal composer straight away. */
  onAddPage: () => void;
  /** A separate trip to the age-fitted catalog. */
  onIdea?: () => void;
  onOpenPage: (id: string) => void;
  onReview: (card: ManualCard, status: "kept" | "dismissed") => void;
  onManual: () => void;
  onDraft: (draft: JournalDraft) => void;
  onPractice: () => void;
  onResumeVisit: () => void;
  onExercise: (id: string) => void;
  onAddPerson: () => void;
  onEditPerson: (person: Person) => void;
}) {
  const [who, setWho] = useState<Who>(
    initialWho === "all" ||
      initialWho === "me" ||
      initialWho === "family" ||
      book.people.some((p) => p.id === initialWho)
      ? initialWho
      : "all",
  );
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => {
    onBrowse?.(who, query);
  }, [who, query, onBrowse]);
  const tone = (id: string) =>
    personTones[
      Math.max(0, book.people.findIndex((p) => p.id === id)) % personTones.length
    ];
  const chips = [
    { id: "all", label: "Everyone" },
    { id: "me", label: "Me" },
    ...book.people.map((p) => ({ id: p.id, label: p.name })),
    { id: "family", label: "Our family" },
  ];
  const manual = manualOf(book).cards;
  const about = cardPeople(book, manual);
  // A suggestion shows under "Me" or "Our family" by its scope, and under each
  // person most of its source pages are tagged with.
  const cardWho = (c: ManualCard) => [
    ...(about[c.id] || []),
    c.scope === "family" ? "family" : "me",
  ];
  const learned: Learned[] = [
    ...book.people.flatMap((p) =>
      p.lessons.map((text, i) => ({
        id: `${p.id}:${i}`,
        who: [p.id],
        tone: tone(p.id),
        text,
      })),
    ),
    ...manual
      .filter((c) => c.status === "kept")
      .map((c) => {
        const whom = cardWho(c);
        return {
          id: c.id,
          who: whom,
          tone: (whom.length > 1
            ? tone(whom[0])
            : c.scope === "family"
              ? "sage"
              : "sun") as Tone,
          text: c.title,
          tryThis: c.tryThis,
        };
      }),
  ].filter((c) => who === "all" || c.who.includes(who));
  const suggestion = manual.find(
    (c) => c.status === "suggested" && (who === "all" || cardWho(c).includes(who)),
  );
  const nameOf = (id: string) =>
    id === "me"
      ? "Me"
      : id === "family"
        ? "Our family"
        : book.people.find((p) => p.id === id)?.name || "";
  /** The people a card is about, by name, or Me / Our family. */
  const namesOf = (ids: string[]) =>
    ids.length > 1
      ? ids
          .slice(0, -1)
          .map(nameOf)
          .join(" & ")
      : nameOf(ids[0]);
  const person = book.people.find((p) => p.id === who);
  const living = livingOf(book);
  const visit = living.visit && living.visit.status !== "complete" ? living.visit : undefined;
  const practice = pendingPractice(book);
  const drafts = (book.journal || [])
    .filter((e) => e.status === "draft")
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const running = activeTrackers(book);
  const pages = pagesFor(book, who, query);
  const going = drafts.length + (practice ? 1 : 0) + (visit ? 1 : 0) + running.length;
  const child = audienceOf(book) !== "adult";
  if (child)
    return (
      <ChildBook
        book={book}
        busy={busy}
        headingRef={headingRef}
        query={query}
        onQuery={setQuery}
        drafts={drafts}
        onAddPage={onAddPage}
        onIdea={onIdea}
        onOpenPage={onOpenPage}
        onDraft={onDraft}
      />
    );
  const allPages = bookPages(book);
  const filtered = who !== "all" || !!query.trim();
  // A genuinely empty adult book gets one invitation, not three empty sections.
  if (!filtered && !learned.length && !going && !allPages.length && !suggestion)
    return (
      <main className="rp-place rp-book" aria-labelledby="rp-book-title">
        <section className="rp-book-empty ui-card">
          <Illustration name="empty-pages" size={170} eager />
          <div>
            <h1 id="rp-book-title" ref={headingRef} tabIndex={-1}>
              Your book
            </h1>
            <p className="rp-lede">
              Nothing kept yet. Your first page can be a few words, a photo or
              your voice.
            </p>
            <div className="rp-book-empty-actions">
              <button className="ui-btn" disabled={busy} onClick={onAddPage}>
                + Add a page
              </button>
              {onIdea && (
                <button className="ui-link" disabled={busy} onClick={onIdea}>
                  Give me an idea
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  const showSuggestion = !!suggestion && canUseOnline(book);
  return (
    <main className="rp-place rp-book" aria-labelledby="rp-book-title">
      <section className="rp-stack">
        <div className="rp-head-row">
          <div className="rp-stack-tight">
            <h1 id="rp-book-title" ref={headingRef} tabIndex={-1}>
              Your book
            </h1>
            <p className="rp-lede">
              What you’ve learned about your people, and every page you’ve kept.
            </p>
          </div>
          <div className="rp-head-actions">
            <button className="rp-btn rp-btn-olive" disabled={busy} onClick={onAddPage}>
              + Add a page
            </button>
            {onIdea && (
              <button className="ui-link" disabled={busy} onClick={onIdea}>
                Give me an idea
              </button>
            )}
          </div>
        </div>
        <div className="rp-chips" role="group" aria-label="Show pages about">
          {chips.map((c) => (
            <button
              key={c.id}
              aria-pressed={who === c.id}
              onClick={() => setWho(c.id)}
            >
              {c.label}
            </button>
          ))}
          <button className="rp-chip-add" disabled={busy} onClick={onAddPerson}>
            + Add someone
          </button>
        </div>
        {person && (
          <div className="rp-about">
            <p>
              <strong>{person.role || "About"}.</strong>{" "}
              {person.note || `No notes about ${person.name} yet.`}
            </p>
            <button
              className="rp-link"
              disabled={busy}
              onClick={() => onEditPerson(person)}
            >
              Edit what you know about {person.name}
            </button>
          </div>
        )}
      </section>

      <section className="rp-stack" aria-labelledby="rp-learned">
        <div className="rp-panel-head">
          <h2 id="rp-learned">What you’ve learned</h2>
          <button className="rp-link" disabled={busy} onClick={onManual}>
            {suggestion ? "All suggestions" : "Suggestions from Relish"}
          </button>
        </div>
        {showSuggestion && suggestion && (
          <div className="rp-suggestion">
            <div className="rp-suggestion-text">
              <span className="rp-nudge-kicker">
                Relish noticed something ·{" "}
                {cardWho(suggestion).length > 1
                  ? namesOf(cardWho(suggestion))
                  : suggestion.scope === "family"
                    ? "Our family"
                    : "You"}
              </span>
              <span className="rp-suggestion-main">{suggestion.title}</span>
              <span className="rp-nudge-why">{suggestion.observation}</span>
              <span className="rp-nudge-why">
                From {suggestion.sources.length}{" "}
                {suggestion.sources.length === 1 ? "page" : "pages"} you kept. Is
                that right?
              </span>
            </div>
            <div className="rp-suggestion-actions">
              <button
                className="rp-btn rp-btn-sun"
                disabled={busy}
                onClick={() => onReview(suggestion, "kept")}
              >
                Yes, keep it
              </button>
              <button
                className="rp-btn rp-btn-ghost"
                disabled={busy}
                onClick={() => onReview(suggestion, "dismissed")}
              >
                Not quite
              </button>
            </div>
          </div>
        )}
        {learned.length ? (
          <div className="rp-learned-grid">
            {learned.map((c) => (
              <article key={c.id} className={`rp-learned rp-shadow-${c.tone}`}>
                <span className="rp-learned-who">
                  <span className={`rp-dot rp-tone-${c.tone}`} aria-hidden="true">
                    {c.who[0] === "family" ? "★" : nameOf(c.who[0]).charAt(0)}
                  </span>
                  <span>{namesOf(c.who)}</span>
                </span>
                <span className="rp-learned-text">{c.text}</span>
                {c.tryThis && <span className="rp-learned-try">Try: {c.tryThis}</span>}
              </article>
            ))}
          </div>
        ) : (
          <p className="rp-quiet">
            {person
              ? `Nothing noted about ${person.name} yet. Edit what you know about them, or keep a page tagged with their name.`
              : "Nothing here yet. What you learn shows up as you keep pages and save suggestions."}
          </p>
        )}
      </section>

      <section className="rp-stack" aria-labelledby="rp-going">
        <h2 id="rp-going">Still going</h2>
        {going ? (
          <div className="rp-going">
            {drafts.map((d) => (
              <button key={d.id} className="rp-going-item" disabled={busy} onClick={() => onDraft(d)}>
                {icons.write}
                <span>
                  <span className="rp-going-kicker">Draft</span>
                  <span className="rp-going-title">
                    Keep writing: {d.title.trim() || d.text.trim().split("\n")[0].slice(0, 60) || "an unfinished page"}
                  </span>
                </span>
              </button>
            ))}
            {visit && (
              <button className="rp-going-item" disabled={busy} onClick={onResumeVisit}>
                {icons.think}
                <span>
                  <span className="rp-going-kicker">Think it through · paused</span>
                  <span className="rp-going-title">Pick up where you left off</span>
                </span>
              </button>
            )}
            {practice && !visit && (
              <button className="rp-going-item" disabled={busy} onClick={onPractice}>
                <Clock />
                <span>
                  <span className="rp-going-kicker">
                    Your plan · {practice.triedAt ? "tried" : "not tried yet"}
                  </span>
                  <span className="rp-going-title">
                    {practice.text ? `“${practice.text}” · ` : ""}How did it go?
                  </span>
                </span>
              </button>
            )}
            {running.map((run) => {
              const t = toolById(run.toolId);
              const p = trackerProgress(run);
              return (
                <button
                  key={run.id}
                  className="rp-going-item"
                  disabled={busy}
                  onClick={() => onExercise(run.toolId)}
                >
                  <Clock />
                  <span>
                    <span className="rp-going-kicker">
                      Habit · {p.done} of {p.total}
                    </span>
                    <span className="rp-going-title">
                      {t?.title}
                      {run.personId ? ` · ${nameOf(run.personId)}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rp-quiet">Nothing half-finished. Start something new any time.</p>
        )}
      </section>

      <section className="rp-stack" aria-labelledby="rp-every">
        <div className="rp-panel-head rp-every-head">
          <h2 id="rp-every">Every page</h2>
          <label className="rp-search">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="rp-sr">Find a page</span>
            <input
              type="search"
              placeholder="Find a page…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {pages.length ? (
          <div className="rp-pages">
            {pages.map((page) => {
              const kind = pageKind(page);
              return (
                <button
                  key={page.id}
                  className={`rp-page rp-edge-${kind.tone}`}
                  data-page-id={page.id}
                  disabled={busy}
                  onClick={() => onOpenPage(page.id)}
                >
                  <span className="rp-page-meta">
                    <strong>
                      {kind.label}
                      {page.exercise && !page.title.includes(page.exercise)
                        ? ` · ${page.exercise}`
                        : ""}
                    </strong>
                    <span>{shortDate(page.date)}</span>
                  </span>
                  <span className="rp-page-title">{page.title}</span>
                  <span className="rp-page-excerpt">
                    {page.text.split("\n")[0] || "Photo entry"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rp-quiet rp-empty-filter">
            <p>
              {query
                ? "No pages match that yet. Try another word."
                : filtered
                  ? "No pages here for this filter yet."
                  : "No pages here yet. Add one when you’re ready."}
            </p>
            {query && (
              <button className="ui-link" onClick={() => setQuery("")}>
                Clear search
              </button>
            )}
            {who !== "all" && (
              <button className="ui-link" onClick={() => setWho("all")}>
                Clear filter
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function Clock() {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/**
 * A child's Your book: their own cover on the left leaf; on the right, the
 * first-page invitation, the draft to keep going, or their latest kept page.
 * No AI suggestions or adult sharing controls appear here.
 */
function ChildBook({
  book,
  busy,
  headingRef,
  query,
  onQuery,
  drafts,
  onAddPage,
  onIdea,
  onOpenPage,
  onDraft,
}: {
  book: Book;
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  query: string;
  onQuery: (q: string) => void;
  drafts: JournalDraft[];
  onAddPage: () => void;
  onIdea?: () => void;
  onOpenPage: (id: string) => void;
  onDraft: (draft: JournalDraft) => void;
}) {
  const name = book.owner.trim() || "My";
  const all = bookPages(book).toReversed();
  const latest = all[0];
  const draft = drafts[0];
  const pages = pagesFor(book, "all", query);
  const right = draft ? (
    <>
      <p className="lb-kicker">A page in progress</p>
      <h2>{draft.title.trim() || "Your unfinished page"}</h2>
      {draft.text.trim() && <p className="rp-child-excerpt">{draft.text.split("\n")[0]}</p>}
      <div className="rp-child-actions">
        <button className="ui-btn" disabled={busy} onClick={() => onDraft(draft)}>
          Keep going
        </button>
        <button className="ui-link" disabled={busy} onClick={onAddPage}>
          Make a new page
        </button>
      </div>
    </>
  ) : latest ? (
    <>
      <p className="lb-kicker">Your latest page · {shortDate(latest.date)}</p>
      <h2>{latest.title}</h2>
      <p className="rp-child-excerpt">{latest.text.split("\n")[0] || "Photo entry"}</p>
      <div className="rp-child-actions">
        <button
          className="ui-btn-quiet"
          disabled={busy}
          data-page-id={latest.id}
          onClick={() => onOpenPage(latest.id)}
        >
          Open this page
        </button>
        <button className="ui-btn" disabled={busy} onClick={onAddPage}>
          + Make a page
        </button>
      </div>
    </>
  ) : (
    <>
      <p className="lb-kicker">Your first page</p>
      <h2>What would you like to keep?</h2>
      <p className="rp-child-excerpt">A few words, a photo, or your voice.</p>
      <div className="rp-child-actions">
        <button className="ui-btn" disabled={busy} onClick={onAddPage}>
          + Make a page
        </button>
        {onIdea && (
          <button className="ui-link" disabled={busy} onClick={onIdea}>
            Give me an idea
          </button>
        )}
      </div>
    </>
  );
  return (
    <main className="rp-place rp-book rp-child-book" aria-labelledby="rp-book-title">
      <BookSpread
        className="rp-child-spread"
        left={
          <div className="rp-child-cover">
            <KidCoverMark name={name} />
            <h1 id="rp-book-title" ref={headingRef} tabIndex={-1}>
              {name}’s book
            </h1>
          </div>
        }
        right={<div className="rp-child-leaf">{right}</div>}
      />
      {drafts.length > 1 && (
        <section className="rp-stack" aria-labelledby="rp-going">
          <h2 id="rp-going">Still going</h2>
          <div className="rp-going">
            {drafts.slice(1).map((d) => (
              <button key={d.id} className="rp-going-item" disabled={busy} onClick={() => onDraft(d)}>
                {icons.write}
                <span>
                  <span className="rp-going-kicker">Draft</span>
                  <span className="rp-going-title">
                    Keep going: {d.title.trim() || "an unfinished page"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {all.length > 0 && (
        <section className="rp-stack" aria-labelledby="rp-every">
          <div className="rp-panel-head rp-every-head">
            <h2 id="rp-every">Every page</h2>
            <label className="rp-search">
              <span className="rp-sr">Find a page</span>
              <input
                type="search"
                placeholder="Find a page…"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
              />
            </label>
          </div>
          {pages.length ? (
            <div className="rp-pages">
              {pages.map((page) => {
                const kind = pageKind(page);
                return (
                  <button
                    key={page.id}
                    className={`rp-page rp-edge-${kind.tone}`}
                    data-page-id={page.id}
                    disabled={busy}
                    onClick={() => onOpenPage(page.id)}
                  >
                    <span className="rp-page-meta">
                      <strong>{kind.label}</strong>
                      <span>{shortDate(page.date)}</span>
                    </span>
                    <span className="rp-page-title">{page.title}</span>
                    <span className="rp-page-excerpt">
                      {page.text.split("\n")[0] || "Photo entry"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rp-quiet rp-empty-filter">
              <p>No pages match that yet. Try another word.</p>
              <button className="ui-link" onClick={() => onQuery("")}>
                Clear search
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
