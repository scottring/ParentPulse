"use client";
import ConfirmDelete from "./ConfirmDelete";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import type { Book, Person } from "@/lib/relish/model";
import { bookPages } from "@/lib/relish/pages";
import { cardPeople, manualOf, type ManualCard } from "@/lib/relish/manual";
import { livingOf, pendingPractice } from "@/lib/relish/living";
import {
  DAY_TOOL,
  dayStatus,
  dueCheckBacks,
  openCheckBacks,
  toolById,
  runningByTool,
  runsStatus,
  toolsOf,
  type CheckBackAnswer,
} from "@/lib/relish/tools";
import CheckBackCard from "./CheckBack";
import type { Tone } from "@/lib/relish/catalog";
import type { JournalDraft, JournalEntry } from "@/lib/relish/journal";
import { icons, personTones } from "./Home";
import { audienceOf, canUseOnline } from "@/lib/relish/profiles";
import { KidCoverMark } from "./KidHome";
import { BookSpread } from "./ui";
import type { FamilyPage } from "@/lib/relish/family-pages";
import type { Incoming } from "@/lib/relish/partner-share";
import type { PhotoLoader } from "@/lib/relish/photos";
import { journalStream } from "@/lib/relish/journal-stream";
import {
  filterTimeline,
  journalTimeline,
  type TimelineFilter,
  type TimelineItem,
} from "@/lib/relish/journal-timeline";
import { sameName } from "@/lib/relish/mentions";
import { StreamSide, TimelineList, type StreamActions } from "./JournalStream";
import {
  FamilyReader,
  GameBanners,
  InviteSheet,
  MembersLink,
  familyPagesOf,
  type FamilyMember,
  type Shown,
} from "./Family";
import type { FamilyAccess } from "./useFamilyBook";

/** "all", "me", "family", or a person's id. */
export type Who = string;
type Learned = {
  id: string;
  /** Chips this shows under: a person's id, or for a suggestion the people it is about, then "me" or "family". */
  who: string[];
  tone: Tone;
  text: string;
  tryThis?: string;
  /** A note from a game can be removed here. */
  note?: { personId: string; noteId: string };
};
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
/** Our family journal, as the one Journal page draws it (2026-11-22). */
export type FamilyParts = {
  access: FamilyAccess;
  members: FamilyMember[];
  /** Opens photos on shared pages, wherever each is kept. */
  photos?: PhotoLoader;
  /** Add to our family journal: a page written for everyone. */
  onWrite?: () => void;
  onInvite?: () => void;
  onAddChild?: () => void;
  onPlay: () => void;
  onResumeGame: () => void;
  onCloseFinished: (again: boolean) => void;
  onRemoved?: (error?: string) => void;
  /** Deletes this journal's copy of a page (see Shown.deleteId). */
  onDelete?: (pageId: string) => Promise<boolean>;
  /** Opens with Who's in our family showing (from the avatar menu). */
  initialMembers?: boolean;
};

export default function YourBook({
  book,
  busy,
  headingRef,
  initialWho = "all",
  initialQuery = "",
  initialFilter = "all",
  familyPages,
  family,
  myBookId,
  incoming,
  onKeepOffer,
  onSetAside,
  canWriteBack,
  onWriteBack,
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
  onCheckBack,
  onDeleteNote,
  onDiscardDraft,
  onShareEntry,
  phoneTop,
  phoneFoot,
}: {
  book: Book;
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  initialWho?: Who;
  initialQuery?: string;
  initialFilter?: TimelineFilter;
  /** Our family journal's pages, when there's no `family` to read them from. */
  familyPages?: FamilyPage[];
  /** Our family journal: the spine of this page, and what can be done with it. */
  family?: FamilyParts;
  /** The id this journal's family pages carry (so your own aren't "mentions"). */
  myBookId?: string;
  /** Lines sent to you that are waiting to be kept. */
  incoming?: Incoming[];
  onKeepOffer?: StreamActions["onKeep"];
  onSetAside?: StreamActions["onSetAside"];
  canWriteBack?: StreamActions["canWriteBack"];
  onWriteBack?: StreamActions["onWriteBack"];
  /** Reports the filters and search so Back from a page can restore them. */
  onBrowse?: (who: Who, query: string, filter: TimelineFilter) => void;
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
  /** Answers a plan kept from an exercise (Plan a repair, and others). */
  onCheckBack?: (id: string, answer: CheckBackAnswer) => void;
  /** Removes a note kept from a game. */
  onDeleteNote?: (personId: string, noteId: string) => void;
  /** Lets an unfinished draft go. */
  onDiscardDraft?: (draft: JournalEntry) => void;
  /** Share a page you wrote (its journal id). Grown-ups' journals only. */
  onShareEntry?: (journalId: string) => void;
  /** Phones: kids' journals, drawn above and below. */
  phoneTop?: ReactNode;
  phoneFoot?: ReactNode;
}) {
  const [asking, setAsking] = useState<string | null>(null);
  // "all", a person's id, or anyone in the family by name ("name:June").
  const [who, setWho] = useState<Who>(
    book.people.some((p) => p.id === initialWho) || initialWho.startsWith("name:")
      ? initialWho
      : "all",
  );
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<TimelineFilter>(initialFilter);
  const [reading, setReading] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(!!family?.initialMembers);
  const [inviting, setInviting] = useState(false);
  useEffect(() => {
    onBrowse?.(who, query, filter);
  }, [who, query, filter, onBrowse]);
  const refresh = family?.access.refresh;
  useEffect(() => {
    refresh?.();
  }, [refresh]);
  // The spine: Our family journal, the same pages for everyone.
  const me = { name: book.owner, bookId: myBookId ?? "" };
  const pagesOfFamily = family?.access.pages ?? familyPages ?? [];
  const spine = familyPagesOf(book, pagesOfFamily, me);
  const opened = spine.find((p) => p.id === reading);
  const reader = opened && family && (
    <FamilyReader
      page={opened}
      access={family.access}
      busy={busy}
      photos={family.photos}
      onClose={() => setReading(null)}
      onRemoved={family.onRemoved}
      onDelete={family.onDelete}
    />
  );
  const openSpine = (p: Shown) => setReading(p.id);
  // A game just finished, or one still going: said here, where it's kept.
  const banners = family && (
    <GameBanners
      book={book}
      busy={busy}
      onResumeGame={family.onResumeGame}
      onCloseFinished={family.onCloseFinished}
    />
  );
  const tone = (id: string) =>
    personTones[
      Math.max(0, book.people.findIndex((p) => p.id === id)) % personTones.length
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
    // What came out of games about each person, kept by a parent.
    ...book.people.flatMap((p) =>
      (p.notes || []).map((n) => ({
        id: `${p.id}:note:${n.id}`,
        who: [p.id],
        tone: tone(p.id),
        text: n.text,
        note: { personId: p.id, noteId: n.id },
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
  // One line per habit, however many people it's with.
  const running = runningByTool(book);
  const day = toolsOf(book).day;
  const plans = onCheckBack ? openCheckBacks(book) : [];
  const going =
    drafts.length +
    (practice ? 1 : 0) +
    (visit ? 1 : 0) +
    running.length +
    plans.length +
    (day ? 1 : 0);
  const askingPlan = plans.find((c) => c.id === asking);
  const dueIds = new Set(dueCheckBacks(book).map((c) => c.id));
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
        top={phoneTop}
        // Drafts already lead their spread and Still going.
        timeline={journalTimeline(book, journalStream(book, { familyPages: pagesOfFamily, myBookId }), spine).filter(
          (t) => !t.item?.draft,
        )}
        onOpenSpine={openSpine}
        reader={reader}
        banners={banners}
        onWriteFamily={family?.onWrite}
        photos={family?.photos}
        loading={!!family?.access.loading}
      />
    );
  const allPages = bookPages(book);
  const stream = journalStream(book, { familyPages: pagesOfFamily, myBookId, incoming });
  const timeline = journalTimeline(book, stream, spine);
  const shownItems = filterTimeline(book, timeline, filter, who, query);
  const filtered = who !== "all" || filter !== "all" || !!query.trim();
  const fresh = stream.filter((i) => i.offer).length;
  // Lines others chose to send or share about you, for the side column.
  const sayings = stream.filter((i) => i.kind === "sent" || i.kind === "mention");
  const first = timeline.at(-1);
  const showSuggestion = !!suggestion && canUseOnline(book);
  const others = going - drafts.length;
  // One journal: the whole of it, the family's spine, or only my branches;
  // then the stream's kinds.
  const scopes: { id: TimelineFilter; label: string }[] = [
    { id: "family", label: "Family" },
    { id: "mine", label: "Just me" },
  ];
  const kinds: { id: TimelineFilter; label: string }[] = [
    { id: "sent", label: "Sent to me" },
    { id: "mentions", label: "Mentions me" },
    { id: "played", label: "We played" },
  ];
  const everything = filter === "all" && who === "all";
  // Someone in the family who isn't one of this journal's people (Who's in our family).
  const named = who.startsWith("name:") ? who.slice("name:".length) : "";
  return (
    <main className="rp-place rp-book rp-mine" aria-labelledby="rp-book-title">
      {phoneTop}
      <section className="rp-mine-head rs-head-mine rt-head">
        <div>
          <h1 id="rp-book-title" ref={headingRef} tabIndex={-1}>
            Our family journal
          </h1>
          <p className="rp-quiet rs-subtitle">
            What the family shares runs down the middle. What’s only yours, or just
            between you and someone, branches off it and says who can see it.
          </p>
          <p className="rp-quiet rp-mine-count">
            {timeline.length
              ? `${timeline.length} ${timeline.length === 1 ? "entry" : "entries"}`
              : "No entries yet"}
            {first && (
              <span className="rp-mine-since">
                {" "}
                since {new Date(first.date).toLocaleDateString(undefined, { month: "long" })}
              </span>
            )}
          </p>
        </div>
        <div className="rp-head-actions">
          <button className="rp-btn rp-btn-olive" disabled={busy} onClick={onAddPage}>
            Write today’s entry
          </button>
          {family?.onWrite && (
            <button className="rs-ghost rt-add-family" disabled={busy} onClick={family.onWrite}>
              Add to our family journal
            </button>
          )}
          {onIdea && (
            <button className="ui-link" disabled={busy} onClick={onIdea}>
              Give me an idea
            </button>
          )}
        </div>
      </section>
      {banners}
      <div className="rp-mine-bar rs-bar">
        <div className="rs-chip-row">
        <div className="rp-chips rs-chips" role="group" aria-label="Show">
          <button
            aria-pressed={everything}
            onClick={() => {
              setFilter("all");
              setWho("all");
            }}
          >
            Everything
          </button>
          {scopes.map((k) => (
            <button
              key={k.id}
              aria-pressed={filter === k.id}
              onClick={() => setFilter(filter === k.id ? "all" : k.id)}
            >
              {k.label}
            </button>
          ))}
          <span className="rt-chip-rule" aria-hidden="true" />
          {kinds.map((k) => (
            <button
              key={k.id}
              aria-pressed={filter === k.id}
              onClick={() => setFilter(filter === k.id ? "all" : k.id)}
            >
              {k.label}
              {k.id === "sent" && fresh > 0 && <span className="rs-n">{fresh} new</span>}
            </button>
          ))}
        </div>
        <div className="rp-chips rs-chips rs-people" role="group" aria-label="Show entries about">
          {book.people.length > 0 && <span className="rs-with">With:</span>}
          {book.people.map((p) => (
            <button
              key={p.id}
              aria-pressed={who === p.id}
              onClick={() => setWho(who === p.id ? "all" : p.id)}
            >
              {p.name}
            </button>
          ))}
          <button className="rp-chip-add" disabled={busy} onClick={onAddPerson}>
            + Add someone
          </button>
        </div>
        </div>
        <label className="rp-search">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="rp-sr">Find an entry</span>
          <input
            type="search"
            placeholder="Find an entry"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
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
      {filter === "said" && (
        <p className="rp-quiet rs-showing">
          What your family sent you or wrote about you.{" "}
          <button className="ui-link" onClick={() => setFilter("all")}>
            Show everything
          </button>
        </p>
      )}
      {named && (
        <p className="rp-quiet rs-showing">
          What {named} shared, and what mentions them.{" "}
          <button className="ui-link" onClick={() => setWho("all")}>
            Show everyone
          </button>
        </p>
      )}
      {family?.access.error && (
        <p className="rp-fb-error" role="alert">
          {family.access.error}{" "}
          <button className="rp-link" onClick={family.access.refresh}>
            Try again
          </button>
        </p>
      )}

      <div className="rs-layout">
        {shownItems.length > 0 ? (
          <section className="rs-stream" aria-label="Entries in the journal">
            <TimelineList
              book={book}
              items={shownItems}
              onOpenSpine={openSpine}
              busy={busy}
              onOpenPage={onOpenPage}
              onDraft={onDraft}
              onDiscardDraft={onDiscardDraft}
              onKeep={onKeepOffer}
              onSetAside={onSetAside}
              canWriteBack={canWriteBack}
              onWriteBack={onWriteBack}
              onOpenFamily={setReading}
              onShare={onShareEntry}
              photos={family?.photos}
            />
          </section>
        ) : (
          <div className="rp-quiet rp-empty-filter rs-stream">
            <p>
              {query
                ? "No entries match that yet. Try another word."
                : filtered
                  ? "Nothing here for this filter yet."
                  : family?.access.loading
                    ? "Opening Our family journal…"
                    : "Nothing kept yet. Your first entry can be a few words, a photo or your voice."}
            </p>
            {query && (
              <button className="ui-link" onClick={() => setQuery("")}>
                Clear search
              </button>
            )}
            {(who !== "all" || filter !== "all") && (
              <button
                className="ui-link"
                onClick={() => {
                  setWho("all");
                  setFilter("all");
                }}
              >
                Clear filter
              </button>
            )}
          </div>
        )}
        <StreamSide
          book={book}
          busy={busy}
          suggestion={showSuggestion ? suggestion : undefined}
          about={
            suggestion && cardWho(suggestion).length > 1
              ? namesOf(cardWho(suggestion))
              : suggestion?.scope === "family"
                ? "your family"
                : "you"
          }
          sayings={sayings}
          onReview={onReview}
          onSeeAll={() => {
            setWho("all");
            setFilter("said");
          }}
        />
      </div>

      {family && (
        <footer className="rp-fb-foot rt-foot">
          <p className="rp-quiet">
            Whoever added an entry to the family journal can take it out.
            {family.access.kind === "local" && !spine.length && (
              <>
                {" "}
                This journal isn’t in an account, so family entries are kept on
                this device. Sign in to share one family journal with everyone in
                your family.
              </>
            )}
          </p>
          <MembersLink
            open={membersOpen}
            onToggle={setMembersOpen}
            me={me}
            members={family.members}
            busy={busy}
            onOpenMine={() => {
              setWho("all");
              setFilter("mine");
            }}
            onSee={(name) => {
              const person = book.people.find((p) => sameName(p.name, name));
              setWho(person ? person.id : `name:${name}`);
              setFilter("all");
              setMembersOpen(false);
            }}
            onAddChild={family.onAddChild}
            onInvite={family.onInvite ? () => setInviting(true) : undefined}
          />
          <button className="rp-link" disabled={busy} onClick={family.onPlay}>
            Play a game
          </button>
        </footer>
      )}
      {reader}
      {inviting && family?.onInvite && (
        <InviteSheet
          onClose={() => setInviting(false)}
          onStart={() => {
            setInviting(false);
            family.onInvite!();
          }}
        />
      )}

      {others > 0 && (
      <section className="rp-stack" aria-labelledby="rp-going">
        <h2 id="rp-going">Still going</h2>
          <div className="rp-going">
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
            {plans.map((c) => {
              const t = toolById(c.toolId);
              const due = dueIds.has(c.id);
              return (
                <button
                  key={c.id}
                  className="rp-going-item"
                  disabled={busy}
                  aria-expanded={asking === c.id}
                  onClick={() => setAsking(asking === c.id ? null : c.id)}
                >
                  <Clock />
                  <span>
                    <span className="rp-going-kicker">
                      Your plan · {t?.title}
                      {c.personId ? ` · ${nameOf(c.personId)}` : ""}
                    </span>
                    <span className="rp-going-title">
                      “{c.plan.length > 70 ? `${c.plan.slice(0, 68)}…` : c.plan}” ·{" "}
                      {due
                        ? "How did it go?"
                        : `Relish asks ${new Date(c.dueAt).toLocaleDateString(undefined, { weekday: "long" })}`}
                    </span>
                  </span>
                </button>
              );
            })}
            {day && (
              <button
                className="rp-going-item"
                disabled={busy}
                onClick={() => onExercise(DAY_TOOL)}
              >
                <Clock />
                <span>
                  <span className="rp-going-kicker">Day’s highlights · {dayStatus(day)}</span>
                  <span className="rp-going-title">
                    {day.people.map((p) => p.name).join(", ")} · pick up where you left off
                  </span>
                </span>
              </button>
            )}
            {running.map(({ toolId, runs }) => {
              const t = toolById(toolId);
              const one = runs.length === 1 ? runs[0] : undefined;
              return (
                <button
                  key={toolId}
                  className="rp-going-item"
                  disabled={busy}
                  onClick={() => onExercise(toolId)}
                >
                  <Clock />
                  <span>
                    <span className="rp-going-kicker">
                      Habit · {runsStatus(book, runs)}
                    </span>
                    <span className="rp-going-title">
                      {t?.title}
                      {one?.personId ? ` · ${nameOf(one.personId)}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        {askingPlan && onCheckBack && (
          <CheckBackCard
            key={askingPlan.id}
            className="rp-going-open"
            book={book}
            item={askingPlan}
            busy={busy}
            onAnswer={(answer) => {
              onCheckBack(askingPlan.id, answer);
              setAsking(null);
            }}
          />
        )}
      </section>
      )}

      {(learned.length > 0 || showSuggestion || allPages.length > 0) && (
      <section className="rp-stack" aria-labelledby="rp-learned">
        <div className="rp-panel-head">
          <h2 id="rp-learned">What you’ve learned</h2>
          <button className="rp-link" disabled={busy} onClick={onManual}>
            {suggestion ? "All suggestions" : "Suggestions from Relish"}
          </button>
        </div>
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
                {c.note && onDeleteNote && (
                  <ConfirmDelete
                    label="Remove"
                    ariaLabel={`Remove the note “${c.text}”`}
                    question="Remove this note?"
                    yes="Yes, remove"
                    busy={busy}
                    className="rp-learned-remove"
                    onConfirm={() => onDeleteNote(c.note!.personId, c.note!.noteId)}
                  />
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rp-quiet">
            {person
              ? `Nothing noted about ${person.name} yet. Edit what you know about them, or keep an entry tagged with their name.`
              : "Nothing here yet. What you learn shows up as you keep entries and save suggestions."}
          </p>
        )}
      </section>
      )}
      {phoneFoot}
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
 * A child's Your journal: their own cover on the left leaf; on the right, the
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
  top,
  timeline,
  onOpenSpine,
  reader,
  banners,
  onWriteFamily,
  loading,
  photos,
}: {
  /** Opens photos on shared pages. */
  photos?: PhotoLoader;
  /** Add to our family journal: a page written for everyone. */
  onWriteFamily?: () => void;
  /** A game just finished, or one still going. */
  banners?: ReactNode;
  /** Our family journal is still being read. */
  loading?: boolean;
  top?: ReactNode;
  /** The family's spine and this child's own pages, in one line. */
  timeline: TimelineItem<Shown>[];
  onOpenSpine: (page: Shown) => void;
  /** A page of Our family journal, open to read. */
  reader?: ReactNode;
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
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const shown = filterTimeline(book, timeline, filter, "all", query);
  const addFamily = onWriteFamily && (
    <button className="rs-ghost rt-add-family" disabled={busy} onClick={onWriteFamily}>
      Add to our family journal
    </button>
  );
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
      {top}
      <BookSpread
        className="rp-child-spread"
        left={
          <div className="rp-child-cover">
            <KidCoverMark name={name} />
            <h1 id="rp-book-title" ref={headingRef} tabIndex={-1}>
              {name}’s journal
            </h1>
          </div>
        }
        right={<div className="rp-child-leaf">{right}</div>}
      />
      {banners}
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
      {!timeline.length && !loading && (
        <section className="rp-stack" aria-labelledby="rp-every">
          <h2 id="rp-every">Our family journal</h2>
          <p className="rp-quiet">
            Nothing in Our family journal yet. When someone in the family shares a
            page, it shows up here.
          </p>
          {addFamily}
        </section>
      )}
      {timeline.length > 0 && (
        <section className="rp-stack" aria-labelledby="rp-every">
          <div className="rp-panel-head rp-every-head">
            <h2 id="rp-every">Our family journal</h2>
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
          <p className="rp-quiet rs-subtitle">
            The family’s pages run down the middle. Your own pages branch off it.
          </p>
          {addFamily}
          <div className="rp-chips rs-chips rt-kid-chips" role="group" aria-label="Show">
            {(
              [
                { id: "all", label: "Everything" },
                { id: "family", label: "Family" },
                { id: "mine", label: "Just me" },
              ] as const
            ).map((c) => (
              <button key={c.id} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          {shown.length ? (
            <section className="rs-stream" aria-label="Entries in the journal">
              <TimelineList
                book={book}
                items={shown}
                busy={busy}
                onOpenSpine={onOpenSpine}
                ownLabel="Your page"
                onOpenPage={onOpenPage}
                onDraft={onDraft}
                photos={photos}
              />
            </section>
          ) : (
            <div className="rp-quiet rp-empty-filter">
              <p>No pages match that yet. Try another word.</p>
              <button
                className="ui-link"
                onClick={() => {
                  onQuery("");
                  setFilter("all");
                }}
              >
                Show everything
              </button>
            </div>
          )}
        </section>
      )}
      {reader}
    </main>
  );
}
