"use client";
import type { ReactNode, RefObject } from "react";
import type { Book } from "@/lib/relish/model";
import { bookPages, type BookPage } from "@/lib/relish/pages";
import {
  nudgeStart,
  nudgeStatus,
  nudgesFor,
  takenToday,
  type NudgeAction,
} from "@/lib/relish/nudges";
import { gameNames, type DoFilter, type Tone, type UnderWay } from "@/lib/relish/catalog";
import type { JournalEntry } from "@/lib/relish/journal";
import { audienceOf } from "@/lib/relish/profiles";
import {
  dueCheckBacks,
  exerciseRunFor,
  toolById,
  tools,
  type CheckBackAnswer,
} from "@/lib/relish/tools";
import {
  featuredFor,
  homeUnderWay,
  idleLine,
  leavingLine,
  missedDay,
  reminderDue,
  STALE_DAYS,
  type HomeItem,
} from "@/lib/relish/activities";
import {
  dayOf,
  goals,
  momentOf,
  places,
  todaysAnswer,
  wantedLine,
  type FamilyPlan,
} from "@/lib/relish/family-plan";
import type { FamilyPage } from "@/lib/relish/family-pages";
import Illustration from "./Illustration";
import KidHome from "./KidHome";
import CheckBackCard from "./CheckBack";
import ConfirmDelete from "./ConfirmDelete";
import Sprig from "./Sprig";
import { HabitNudge } from "./HabitNudge";
import { familyPagesOf } from "./Family";
import {
  exerciseIllustration,
  gameIllustration,
  type IllustrationName,
} from "./illustrations";
import "./home-acts.css";

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
/** Line icons the kids' Home and Your book still use. */
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

const DAY = 86_400_000;
const longDate = (d = new Date()) =>
  d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const pageDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
/** "today", "yesterday", "Wednesday" within the week, else "Nov 3". */
export function when(iso: string, now = new Date()) {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      DAY,
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return shortDate(iso);
}
const savedWhen = (iso: string) => {
  const w = when(iso);
  if (w !== "today") return w === "yesterday" ? "yesterday" : `on ${w}`;
  const h = new Date(iso).getHours();
  return h < 12 ? "this morning" : h < 17 ? "this afternoon" : "this evening";
};
const firstWords = (text: string, max = 150) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
const numberWords = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const count = (n: number) => numberWords[n] ?? String(n);

/** The painting beside something under way or kept. */
export function underWayArt(g: UnderWay): IllustrationName {
  if (g.kind === "draft") return "jot";
  if (g.kind === "visit") return "think-it-through";
  if (g.kind === "game") return gameIllustration[g.key.slice(5)] ?? "do-something";
  return exerciseIllustration[g.toolId] ?? "do-something";
}
function pageArt(page: BookPage): IllustrationName {
  if (page.record) {
    const kind = (Object.keys(gameNames) as (keyof typeof gameNames)[]).find((k) =>
      page.title.startsWith(gameNames[k]),
    );
    return (kind && gameIllustration[kind]) || "do-something";
  }
  const tool = tools.find(
    (t) => page.exercise === t.title || page.title === t.title || page.title.startsWith(`${t.title} · `),
  );
  if (tool) return exerciseIllustration[tool.id] ?? "do-something";
  if (page.kind === "Journal entry") return "jot";
  return "think-it-through";
}

/** One painted choice under "What would you like to do?". */
function Choice({
  art,
  title,
  line,
  busy,
  onOpen,
  extra,
}: {
  art: IllustrationName;
  title: string;
  line?: string;
  busy: boolean;
  onOpen: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="ha-choice">
      <Illustration name={art} size={104} className="ha-choice-art" />
      <span className="ha-choice-words">
        <button type="button" className="ha-choice-main" disabled={busy} onClick={onOpen}>
          {title}
        </button>
        {line && <span className="ha-choice-line">{line}</span>}
        {extra}
      </span>
    </div>
  );
}

/** Progress for something under way: dots for a sort, marked days for a habit. */
export function Progress({ book, item }: { book: Book; item: UnderWay }) {
  if (item.kind === "exercise") {
    const tool = toolById(item.toolId);
    const run = exerciseRunFor(book, item.toolId);
    if (tool?.kind === "sort" && run?.sort) {
      const total = tool.cards(audienceOf(book)).length + run.sort.extra.length;
      const done = Object.keys(run.sort.placed).length;
      if (total <= 14)
        return (
          <span className="ha-dots" role="img" aria-label={`${done} of ${total} sorted`}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={i < done ? "is-on" : ""} />
            ))}
          </span>
        );
    }
  }
  if (item.kind === "habit") {
    const tool = toolById(item.toolId);
    if (tool?.kind === "tracker" && tool.mode === "days" && /^\d+ of \d+$/.test(item.detail || "")) {
      const done = Number(item.detail!.split(" ")[0]);
      const marked = Array.from({ length: tool.target }, (_, i) => i + 1).filter((n) => n <= done);
      return (
        <span
          className="ha-days"
          role="img"
          aria-label={`${done} of ${tool.target} days marked`}
        >
          {Array.from({ length: tool.target }, (_, i) => (
            <span key={i} className={marked.includes(i + 1) ? "is-on" : ""} aria-hidden="true">
              {i + 1}
            </span>
          ))}
        </span>
      );
    }
  }
  return item.detail ? <span className="ha-row-detail">{item.detail}</span> : null;
}

/** A row for something still going: painting, where it stands, Keep going and Let it go. */
function GoingRow({
  book,
  item,
  busy,
  onResume,
  onDiscard,
}: {
  book: Book;
  item: HomeItem;
  busy: boolean;
  onResume: (g: UnderWay) => void;
  onDiscard?: (g: UnderWay) => void;
}) {
  const idle = idleLine(item);
  const leaving = leavingLine(item);
  return (
    <div className={`ha-row ${leaving ? "is-fading" : ""}`}>
      <Illustration name={underWayArt(item)} size={76} className="ha-row-art" />
      <span className="ha-row-words">
        <span className="ha-row-kicker">
          {item.kind === "draft" ? "Draft" : "In progress"}
          {idle && ` · ${idle}`}
          {leaving && ` · ${leaving}`}
        </span>
        <span className="ha-row-title">{item.title}</span>
        <Progress book={book} item={item} />
      </span>
      <span className="ha-row-actions">
        <button type="button" className="ha-link" disabled={busy} onClick={() => onResume(item)}>
          <span className="ui-sr-only">
            {item.title}
            {item.detail ? ` · ${item.detail}` : ""}:{" "}
          </span>
          {item.kind === "habit" && item.label === "Mark today" ? "Mark today" : "Keep going"}
        </button>
        {idle && onDiscard && (
          <ConfirmDelete
            label="Let it go"
            icon={false}
            ariaLabel={`Let ${item.title} go`}
            question={
              item.kind === "draft" ? "Let this draft go?" : "Let this go without keeping it?"
            }
            detail="It’s removed for good. This can’t be undone."
            yes="Yes, let it go"
            busy={busy}
            className="ha-link ha-link-quiet"
            onConfirm={() => onDiscard(item)}
          />
        )}
      </span>
    </div>
  );
}

export type HomeProps = {
  book: Book;
  space: "me" | "family";
  names: string[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Our family book's pages, and which book is this one (for "From … book"). */
  familyPages?: FamilyPage[];
  myBookId?: string;
  plan?: FamilyPlan;
  /** Opens a suggestion; with its id, Home remembers it was taken today. */
  onNudge: (action: NudgeAction, nudgeId?: string) => void;
  onResume?: (item: UnderWay) => void;
  onDiscard?: (item: UnderWay) => void;
  onCheckBack?: (id: string, answer: CheckBackAnswer) => void;
  /** Journal in this space: a private page, or a page for Our family book. */
  onWrite: () => void;
  onActivities: () => void;
  onBook: () => void;
  onFamily: () => void;
  onPage: (id: string) => void;
  /** Today's mark on a habit, "Remind me tonight", and "Stop this one". */
  onMarkToday?: (runId: string) => void;
  onRemindTonight?: (runId: string) => void;
  onStopHabit?: (runId: string) => void;
  /** Kids' Home only. */
  onFilter: (filter: DoFilter) => void;
  onQuickWrite?: (text: string, voice: boolean) => void;
  onQuickPhoto?: (text: string, file: File) => void;
  onSaveDraft?: (entry: JournalEntry) => void;
};

/**
 * Home, in both spaces (Scott, 2026-11-21): a welcome with its painting, then
 * two sides. On the left, what's happened lately with a way back to each; on
 * the right, "What would you like to do?" with three painted choices. One
 * check-back at a time leads the left side. Layout follows width in CSS
 * only, so opening or closing a Duo keeps everything in place.
 */
export default function Home(props: HomeProps) {
  const { book, busy, headingRef, onNudge } = props;
  const child = audienceOf(book) !== "adult";
  const list = nudgesFor(book, props.names);
  if (child) {
    const taken = takenToday(book);
    const at = taken ? list.findIndex((n) => n.id === taken.id) : -1;
    return (
      <KidHome
        book={book}
        list={list}
        start={at >= 0 ? at : nudgeStart(list.length)}
        busy={busy}
        headingRef={headingRef}
        onNudge={onNudge}
        onFilter={props.onFilter}
        onBook={props.onBook}
        onWrite={props.onQuickWrite && (() => props.onQuickWrite!("", false))}
        onRecord={props.onQuickWrite && (() => props.onQuickWrite!("", true))}
        onPhoto={props.onQuickPhoto && ((file) => props.onQuickPhoto!("", file))}
      />
    );
  }
  return props.space === "family" ? <FamilySide {...props} /> : <MeSide {...props} />;
}

function Welcome({
  owner,
  first,
  line,
  art,
  kicker,
  headingRef,
}: {
  owner: string;
  first: boolean;
  line: string;
  art: IllustrationName;
  kicker: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section className="ha-welcome">
      <div className="ha-welcome-words">
        <p className="ha-quiet">{kicker}</p>
        <h1 id="ha-title" ref={headingRef} tabIndex={-1}>
          {first ? `Welcome, ${owner}.` : `Welcome back, ${owner}.`}
        </h1>
        {line && <p className="ha-welcome-line">{line}</p>}
      </div>
      <Illustration name={art} size={380} eager className="ha-welcome-art" />
    </section>
  );
}

function MeSide({
  book,
  names,
  busy,
  headingRef,
  onNudge,
  onResume,
  onDiscard,
  onCheckBack,
  onWrite,
  onActivities,
  onBook,
  onPage,
  onMarkToday,
  onRemindTonight,
  onStopHabit,
}: HomeProps) {
  const now = new Date();
  const going = homeUnderWay(book, now, 4);
  const draft = going.find((g): g is HomeItem & { kind: "draft"; draft: JournalEntry } => g.kind === "draft");
  const others = going.filter((g) => g.kind !== "draft").slice(0, 2);
  const pages = bookPages(book).toReversed();
  const recent = pages
    .filter((p) => now.getTime() - Date.parse(p.date) < STALE_DAYS * DAY)
    .slice(0, Math.max(0, 3 - others.length));
  // One check-back at a time leads: a plan to ask about, a reminder asked
  // for tonight, then a habit that slipped a day.
  const due = onCheckBack ? dueCheckBacks(book, now)[0] : undefined;
  const reminder = !due ? reminderDue(book, now) : undefined;
  const missed = !due && !reminder ? missedDay(book, now) : undefined;
  const habit = reminder ?? missed;
  // The habit asking for today isn't listed twice.
  const rows = habit ? others.filter((g) => !(g.kind === "habit" && g.toolId === habit.tool.id)) : others;
  // At most one line under Write: a writing suggestion, rotating daily.
  const writing = nudgesFor(book, names).filter((n) => n.action.kind === "journal");
  const taken = takenToday(book);
  const suggestion =
    writing.find((n) => n.id === taken?.id) ?? writing[nudgeStart(writing.length)];
  const status = suggestion && nudgeStatus(book, suggestion);
  const featured = featuredFor("adult", going, now);
  const family = names.slice(0, 3);
  const about = draft?.draft.people
    ?.map((id) => book.people.find((p) => p.id === id)?.name)
    .find(Boolean);
  const line = due
    ? "Something you planned is ready to check on."
    : draft
      ? about
        ? `Your page about ${about} is waiting where you left it.`
        : "Your page is waiting where you left it."
      : pages.length
        ? "Here’s what you’ve been keeping, and a few things to do next."
        : "Your book is ready for its first page.";
  return (
    <main className="rp-place ha-home" aria-labelledby="ha-title">
      <Welcome
        owner={book.owner}
        first={!pages.length && !going.length}
        line={line}
        art="welcome"
        kicker={longDate(now)}
        headingRef={headingRef}
      />
      {(due || habit) && (
        <div className="ha-lead">
          {due && onCheckBack ? (
            <CheckBackCard
              key={due.id}
              book={book}
              item={due}
              busy={busy}
              onAnswer={(answer) => onCheckBack(due.id, answer)}
            />
          ) : habit && onMarkToday && onRemindTonight && onStopHabit ? (
            <HabitNudge
              key={habit.run.id}
              book={book}
              run={habit.run}
              tool={habit.tool}
              reminded={!!reminder}
              busy={busy}
              compact
              onMark={() => onMarkToday(habit.run.id)}
              onRemind={() => onRemindTonight(habit.run.id)}
              onStop={() => onStopHabit(habit.run.id)}
            />
          ) : null}
        </div>
      )}
      <section className="ha-lately" aria-label="Lately in your book">
        {draft && onResume && (
          <article className="ha-journal">
            <Sprig className="ha-journal-sprig" />
            <p className="ha-journal-meta">
              <span className="ha-journal-date">{pageDate(draft.draft.updatedAt)}</span>
              <span className="ha-only">
                <LockIcon /> Only me
              </span>
            </p>
            <h2 className="ha-journal-title">{draft.draft.title.trim() || "Your unfinished page"}</h2>
            {draft.draft.text.trim() && (
              <p className="ha-journal-text">{firstWords(draft.draft.text, 160)}</p>
            )}
            <div className="ha-journal-foot">
              <span className="ha-quiet">
                Draft saved {savedWhen(draft.draft.updatedAt)}
                {idleLine(draft) && ` · ${idleLine(draft)}`}
                {leavingLine(draft) && ` · ${leavingLine(draft)}`}
              </span>
              <span className="ha-journal-actions">
                {idleLine(draft) && onDiscard && (
                  <ConfirmDelete
                    label="Let it go"
            icon={false}
                    ariaLabel="Let this draft go"
                    question="Let this draft go?"
                    detail="It’s removed for good. This can’t be undone."
                    yes="Yes, let it go"
                    busy={busy}
                    className="ha-link ha-link-quiet"
                    onConfirm={() => onDiscard(draft)}
                  />
                )}
                <button type="button" className="ha-ghost" disabled={busy} onClick={() => onResume(draft)}>
                  Keep writing
                </button>
              </span>
            </div>
          </article>
        )}
        {onResume &&
          rows.map((g) => (
            <GoingRow
              key={`${g.kind}:${g.key}`}
              book={book}
              item={g}
              busy={busy}
              onResume={onResume}
              onDiscard={onDiscard}
            />
          ))}
        {recent.map((p) => (
          <div key={p.id} className="ha-row">
            <Illustration name={pageArt(p)} size={76} className="ha-row-art" />
            <span className="ha-row-words">
              <span className="ha-row-kicker">
                {p.record ? "Played" : "Kept"} {when(p.date)}
              </span>
              <span className="ha-row-title">{p.title}</span>
              {p.record && p.text && <span className="ha-row-detail">{firstWords(p.text, 70)}</span>}
            </span>
            <span className="ha-row-actions">
              <button type="button" className="ha-link" disabled={busy} onClick={() => onPage(p.id)}>
                <span className="ui-sr-only">{p.title}: </span>
                {p.record ? "See it" : "Read it"}
              </button>
            </span>
          </div>
        ))}
        {!draft && !rows.length && !recent.length && (
          <p className="ha-quiet ha-empty">
            {pages.length
              ? "Nothing new in the last two weeks. Everything you’ve kept is in your book."
              : "Nothing kept yet. Your first page will show up here."}
          </p>
        )}
        <button type="button" className="ha-link ha-open" disabled={busy} onClick={onBook}>
          Open my book
        </button>
      </section>
      <section className="ha-todo" aria-labelledby="ha-todo-title">
        <h2 id="ha-todo-title">What would you like to do?</h2>
        <Choice
          art="jot"
          title="Write a journal entry"
          busy={busy}
          onOpen={onWrite}
          extra={
            suggestion && status && status.state !== "done" && status.state !== "going" ? (
              <button
                type="button"
                className="ha-choice-try"
                disabled={busy}
                onClick={() => onNudge(suggestion.action, suggestion.id)}
              >
                {status.state === "draft" ? "Keep writing: " : "Or try: "}
                {suggestion.text.replace(/^Write down /, "").replace(/\.$/, "")}
              </button>
            ) : undefined
          }
        />
        <Choice
          art="do-something"
          title="Do an activity"
          line={featured ? `This week: ${featured.title}, ${featured.time}` : undefined}
          busy={busy}
          onOpen={onActivities}
        />
        <Choice
          art="your-book"
          title="Read about my family"
          line={
            family.length
              ? `What you’ve kept about ${family.length < 2 ? family[0] : `${family.slice(0, -1).join(", ")} and ${family.at(-1)}`}`
              : "Every page you’ve kept"
          }
          busy={busy}
          onOpen={onBook}
        />
      </section>
    </main>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function FamilySide({
  book,
  busy,
  headingRef,
  familyPages = [],
  myBookId = "",
  plan,
  onWrite,
  onActivities,
  onFamily,
}: HomeProps) {
  const now = new Date();
  const shown = familyPagesOf(book, familyPages, { name: book.owner, bookId: myBookId });
  const passage = shown.find((p) => p.kind === "passage");
  const cards = shown.filter((p) => p !== passage).slice(0, 2);
  const fresh = shown.filter((p) => now.getTime() - Date.parse(p.date) < 7 * DAY).length;
  const since = shown.at(-1);
  const moment = plan ? momentOf(plan, now) : "first";
  const asking = !!plan && (moment === "lookback" || !todaysAnswer(plan, now));
  const goalLabel = plan?.goalLabel ?? goals.hearing.label;
  const where = plan ? places[plan.place].at : places.dinner.at;
  const line = fresh
    ? `${count(fresh)} new ${fresh === 1 ? "page" : "pages"} in the family book this week${plan ? "." : ", and something to try together tonight."}`
    : plan
      ? `Day ${Math.min(dayOf(plan, now), plan.days)} of trying ${goalLabel.charAt(0).toLowerCase()}${goalLabel.slice(1)}.`
      : "Something to try together tonight is waiting in Activities.";
  return (
    <main
      className={`rp-place ha-home ha-home-family ${asking ? "is-asking" : ""}`}
      aria-labelledby="ha-title"
    >
      <Welcome
        owner={book.owner}
        first={!shown.length && !plan}
        line={line}
        art="home"
        kicker={longDate(now)}
        headingRef={headingRef}
      />
      {(asking || passage) && (
        <div className={`ha-lead ${asking ? "is-asking" : ""}`}>
          {asking && plan ? (
            <section className="ha-plan-ask" aria-label="How is it going?">
              <p className="ha-quiet">
                {moment === "lookback"
                  ? `${plan.goalLabel} · time to look back`
                  : `${plan.goalLabel} · Day ${Math.min(dayOf(plan, now), plan.days)} of ${plan.days}`}
              </p>
              <p className="ha-plan-question">
                {moment === "lookback" ? "Your two weeks are up." : wantedLine(plan)}{" "}
                <em>{moment === "lookback" ? "Does it feel any different?" : "How did it go?"}</em>
              </p>
              <button type="button" className="ha-ghost" disabled={busy} onClick={onActivities}>
                {moment === "lookback" ? "Look back together" : "Say how it went"}
              </button>
            </section>
          ) : passage ? (
            <PassageCard passage={passage} />
          ) : null}
        </div>
      )}
      <button type="button" className="ha-cover" disabled={busy} onClick={onFamily}>
          <span className="ha-cover-words">
            <span className="ha-cover-title">Our family book</span>
            <span className="ha-cover-line">
              {shown.length ? `${shown.length} ${shown.length === 1 ? "page" : "pages"}` : "No pages yet"}
              {since && ` · since ${new Date(since.date).toLocaleDateString(undefined, { month: "long" })}`}
              {fresh > 0 && ` · ${fresh} new this week`}
            </span>
          </span>
          <Sprig className="ha-cover-leaf" tone="gold" />
      </button>
      <section className="ha-lately" aria-label="Lately in our family book">
        {asking && passage && <PassageCard passage={passage} />}
        {cards.length > 0 && (
          <div className="ha-pages">
            {cards.map((p) => (
              <button key={p.id} type="button" className="ha-page" disabled={busy} onClick={onFamily}>
                <span className="ha-page-meta">
                  <span>{p.label}</span>
                  <span>{when(p.date) === "today" ? "Today" : shortDate(p.date)}</span>
                </span>
                <span className="ha-page-title">{p.title || p.label}</span>
                <span className="ha-page-text">{firstWords(p.text, 110)}</span>
                <span className="ha-page-from">
                  {p.byName.includes(" + ") ? p.byName : `From ${p.byName}’s book`}
                </span>
              </button>
            ))}
          </div>
        )}
        {!shown.length && (
          <p className="ha-quiet ha-empty">
            Pages your family chooses to share show up here.
          </p>
        )}
        <button type="button" className="ha-link ha-open" disabled={busy} onClick={onFamily}>
          Open family book
        </button>
      </section>
      <section className="ha-todo" aria-labelledby="ha-todo-title">
        <h2 id="ha-todo-title">What would you like to do?</h2>
        <Choice
          art="jot"
          title="Write in our family book"
          line="Everyone in the family can read it."
          busy={busy}
          onOpen={onWrite}
        />
        <Choice
          art="same-page"
          title="Do an activity together"
          line={`This week: ${goalLabel}${plan && !goals[plan.goal as keyof typeof goals]?.placed ? "" : `, ${where}`}`}
          busy={busy}
          onOpen={onActivities}
        />
        <Choice
          art="your-book"
          title="Read about our family"
          line="Every page anyone has shared"
          busy={busy}
          onOpen={onFamily}
        />
      </section>
    </main>
  );
}

function PassageCard({ passage }: { passage: { text: string; caption?: string; byName: string; date: string } }) {
  return (
    <figure className="ha-passage">
      <blockquote>“{passage.text.trim()}”</blockquote>
      <figcaption>
        {passage.caption || passage.byName} · {shortDate(passage.date)}
        {passage.caption && <span className="ha-passage-from"> · From {passage.byName}’s book</span>}
      </figcaption>
      <Sprig className="ha-passage-sprig" berries />
    </figure>
  );
}
