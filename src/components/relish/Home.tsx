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
  type HomeItem,
} from "@/lib/relish/activities";
import {
  dayOf,
  momentOf,
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
  /** Their own journal in this account: shown as a cover on Family. */
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
/** Line icons the kids' Home and Your journal still use. */
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
  names: string[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Our family journal's pages, and which book is this one (to tell yours apart). */
  familyPages?: FamilyPage[];
  myBookId?: string;
  plan?: FamilyPlan;
  /** Opens a suggestion; with its id, Home remembers it was taken today. */
  onNudge: (action: NudgeAction, nudgeId?: string) => void;
  onResume?: (item: UnderWay) => void;
  onDiscard?: (item: UnderWay) => void;
  onCheckBack?: (id: string, answer: CheckBackAnswer) => void;
  /** Writes in My journal (Only me). */
  onWrite: () => void;
  /** Writes in Our family journal. */
  onWriteFamily?: () => void;
  onActivities: () => void;
  /** Opens My journal. */
  onBook: () => void;
  /** Opens Our family journal. */
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
 * Home, one page for both journals (Scott, 2026-11-21): a welcome with its
 * painting, then two sides. On the left, "Lately" mixes My journal and Our
 * family journal, each item labelled "Only me" or "Family journal", with a
 * way back to each; on the right, "What would you like to do?" with four
 * painted choices. One check-back at a time leads the left side. Layout
 * follows width in CSS only, so opening or closing a Duo keeps everything in
 * place.
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
  return <OneHome {...props} />;
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

/** "Only me" or "Family journal", on everything Lately lists. */
function Whose({ family, extra }: { family: boolean; extra?: string }) {
  return (
    <span className={`ha-whose ${family ? "is-family" : "is-mine"}`}>
      {!family && <LockIcon />}
      {family ? "Family journal" : "Only me"}
      {extra && ` · ${extra}`}
    </span>
  );
}

type Lately =
  | { kind: "going"; at: string; item: HomeItem }
  | { kind: "page"; at: string; page: BookPage }
  | { kind: "family"; at: string; page: ReturnType<typeof familyPagesOf>[number] };

function OneHome({
  book,
  names,
  busy,
  headingRef,
  familyPages = [],
  myBookId = "",
  plan,
  onNudge,
  onResume,
  onDiscard,
  onCheckBack,
  onWrite,
  onWriteFamily,
  onActivities,
  onBook,
  onFamily,
  onPage,
  onMarkToday,
  onRemindTonight,
  onStopHabit,
}: HomeProps) {
  const now = new Date();
  const going = homeUnderWay(book, now, 4);
  const draft = going.find((g): g is HomeItem & { kind: "draft"; draft: JournalEntry } => g.kind === "draft");
  const others = going.filter((g) => g.kind !== "draft").slice(0, 2);
  const shown = familyPagesOf(book, familyPages, { name: book.owner, bookId: myBookId });
  const passage = shown.find((p) => p.kind === "passage");
  const familyIds = new Set(
    (book.journal || []).filter((e) => e.audience === "family").map((e) => `journal:${e.id}`),
  );
  const familyDays = new Set(shown.filter((p) => p.kind === "game").map((p) => p.date));
  // Kept pages always show, however old: only unfinished things go stale. A
  // page written for the family journal, or a round with its note there,
  // shows once, from the family journal.
  const pages = bookPages(book)
    .toReversed()
    .filter((p) => !familyIds.has(p.id) && !(p.record && familyDays.has(p.date)));
  // One check-back at a time leads: a plan to ask about, a reminder asked
  // for tonight, the family plan's "How did it go?", then a habit that
  // slipped a day.
  const due = onCheckBack ? dueCheckBacks(book, now)[0] : undefined;
  const reminder = !due ? reminderDue(book, now) : undefined;
  const moment = plan ? momentOf(plan, now) : "first";
  const asking = !due && !reminder && !!plan && (moment === "lookback" || !todaysAnswer(plan, now));
  const missed = !due && !reminder && !asking ? missedDay(book, now) : undefined;
  const habit = reminder ?? missed;
  // The habit asking for today isn't listed twice.
  const rows = habit ? others.filter((g) => !(g.kind === "habit" && g.toolId === habit.tool.id)) : others;
  // Lately: what's still going first, then the newest kept pages from both
  // journals, newest first, four rows at most beside the family's newest
  // passage. Each journal keeps at least one row when it has something.
  const room = Math.max(0, 4 - (draft ? 1 : 0) - rows.length);
  const mine = pages.map((p) => ({ kind: "page" as const, at: p.date, page: p }));
  const ours = shown
    .filter((p) => p !== passage)
    .map((p) => ({ kind: "family" as const, at: p.date, page: p }));
  const half = Math.ceil(room / 2);
  const mineCount = Math.min(mine.length, Math.max(room - ours.length, half));
  const kept: Lately[] = [
    ...mine.slice(0, mineCount),
    ...ours.slice(0, room - mineCount),
  ].toSorted((a, b) => b.at.localeCompare(a.at));
  const lately: Lately[] = [
    ...rows.map((g) => ({ kind: "going" as const, at: g.at, item: g })),
    ...kept,
  ];
  // At most one line under Write: a writing suggestion, rotating daily.
  const writing = nudgesFor(book, names).filter((n) => n.action.kind === "journal");
  const taken = takenToday(book);
  const suggestion =
    writing.find((n) => n.id === taken?.id) ?? writing[nudgeStart(writing.length)];
  const status = suggestion && nudgeStatus(book, suggestion);
  const featured = featuredFor("adult", going, now);
  const fresh = shown.filter((p) => now.getTime() - Date.parse(p.date) < 7 * DAY && !p.mine).length;
  const about = draft?.draft.people
    ?.map((id) => book.people.find((p) => p.id === id)?.name)
    .find(Boolean);
  const waiting = draft
    ? about
      ? `your page about ${about} is waiting where you left it`
      : "a page of yours is waiting where you left it"
    : "";
  const newLine = fresh
    ? `${count(fresh)} new ${fresh === 1 ? "entry" : "entries"} in the family journal`
    : "";
  const line = due
    ? "Something you planned is ready to check on."
    : newLine && waiting
      ? `${newLine}, and ${waiting}.`
      : newLine
        ? `${newLine} this week.`
        : waiting
          ? `${waiting.charAt(0).toUpperCase()}${waiting.slice(1)}.`
          : pages.length || shown.length
            ? "Here’s what’s been kept lately, and a few things to do next."
            : "Your journal is ready for its first entry.";
  return (
    <main className="rp-place ha-home" aria-labelledby="ha-title">
      <Welcome
        owner={book.owner}
        first={!pages.length && !going.length && !shown.length}
        line={line}
        art="welcome"
        kicker={longDate(now)}
        headingRef={headingRef}
      />
      {(due || habit || asking) && (
        <div className={`ha-lead ${asking ? "is-asking" : ""}`}>
          {due && onCheckBack ? (
            <CheckBackCard
              key={due.id}
              book={book}
              item={due}
              busy={busy}
              onAnswer={(answer) => onCheckBack(due.id, answer)}
            />
          ) : reminder && onMarkToday && onRemindTonight && onStopHabit ? (
            <HabitNudge
              key={reminder.run.id}
              book={book}
              run={reminder.run}
              tool={reminder.tool}
              reminded
              busy={busy}
              compact
              onMark={() => onMarkToday(reminder.run.id)}
              onRemind={() => onRemindTonight(reminder.run.id)}
              onStop={() => onStopHabit(reminder.run.id)}
            />
          ) : asking && plan ? (
            <section className="ha-plan-ask" aria-label="How is it going?">
              <p className="ha-quiet">
                <Whose family />{" "}
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
          ) : missed && onMarkToday && onRemindTonight && onStopHabit ? (
            <HabitNudge
              key={missed.run.id}
              book={book}
              run={missed.run}
              tool={missed.tool}
              reminded={false}
              busy={busy}
              compact
              onMark={() => onMarkToday(missed.run.id)}
              onRemind={() => onRemindTonight(missed.run.id)}
              onStop={() => onStopHabit(missed.run.id)}
            />
          ) : null}
        </div>
      )}
      <section className="ha-lately" aria-labelledby="ha-lately-title">
        <h2 id="ha-lately-title" className="ha-lately-title">
          Lately
        </h2>
        {passage && <PassageCard passage={passage} />}
        {draft && onResume && (
          <div className="ha-row">
            <Illustration name="jot" size={76} className="ha-row-art" />
            <span className="ha-row-words">
              <Whose
                family={false}
                extra={draft.draft.audience === "family" ? "draft for the family journal" : "draft"}
              />
              <span className="ha-row-title ha-row-quote">
                {draft.draft.title.trim() ||
                  (draft.draft.text.trim() ? `“${firstWords(draft.draft.text, 60)}”` : "Your unfinished page")}
              </span>
              <span className="ha-row-detail">
                Saved {savedWhen(draft.draft.updatedAt)}
                {idleLine(draft) && ` · ${idleLine(draft)}`}
                {leavingLine(draft) && ` · ${leavingLine(draft)}`}
              </span>
            </span>
            <span className="ha-row-actions">
              <button type="button" className="ha-link" disabled={busy} onClick={() => onResume(draft)}>
                <span className="ui-sr-only">{draft.draft.title.trim() || "Your draft"}: </span>
                Keep writing
              </button>
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
            </span>
          </div>
        )}
        {lately.map((x) =>
          x.kind === "going" ? (
            onResume && (
              <GoingRow
                key={`${x.item.kind}:${x.item.key}`}
                book={book}
                item={x.item}
                busy={busy}
                onResume={onResume}
                onDiscard={onDiscard}
              />
            )
          ) : x.kind === "page" ? (
            <div key={x.page.id} className="ha-row">
              <Illustration name={pageArt(x.page)} size={76} className="ha-row-art" />
              <span className="ha-row-words">
                <Whose family={false} extra={`${x.page.record ? "played" : "kept"} ${when(x.page.date)}`} />
                <span className="ha-row-title">{x.page.title}</span>
                {x.page.record && x.page.text && (
                  <span className="ha-row-detail">{firstWords(x.page.text, 70)}</span>
                )}
              </span>
              <span className="ha-row-actions">
                <button type="button" className="ha-link" disabled={busy} onClick={() => onPage(x.page.id)}>
                  <span className="ui-sr-only">{x.page.title}: </span>
                  {x.page.record ? "See it" : "Read it"}
                </button>
              </span>
            </div>
          ) : (
            <div key={x.page.id} className="ha-row">
              <Illustration name={x.page.art ?? "your-book"} size={76} className="ha-row-art" />
              <span className="ha-row-words">
                <Whose family />
                <span className="ha-row-title">
                  {x.page.kind === "game" ? firstWords(x.page.text, 70).replace(/\.$/, "") : x.page.title || x.page.label}
                </span>
                <span className="ha-row-detail">
                  {x.page.kind === "game" ? "" : `${x.page.mine ? "You" : x.page.byName} · `}
                  {when(x.page.date) === "today" ? "Today" : shortDate(x.page.date)}
                </span>
              </span>
              <span className="ha-row-actions">
                <button type="button" className="ha-link" disabled={busy} onClick={onFamily}>
                  <span className="ui-sr-only">{x.page.title || x.page.label}: </span>
                  See it
                </button>
              </span>
            </div>
          ),
        )}
        {!draft && !lately.length && !passage && (
          <p className="ha-quiet ha-empty">
            Nothing kept yet. Your first entry will show up here.
          </p>
        )}
        <p className="ha-open">
          <button type="button" className="ha-link" disabled={busy} onClick={onBook}>
            Open my journal
          </button>
          <span aria-hidden="true"> · </span>
          <button type="button" className="ha-link" disabled={busy} onClick={onFamily}>
            Open family journal
          </button>
        </p>
      </section>
      <section className="ha-todo" aria-labelledby="ha-todo-title">
        <h2 id="ha-todo-title">What would you like to do?</h2>
        <Choice
          art="jot"
          title="Write in my journal"
          line="Only you see it"
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
        {onWriteFamily && (
          <Choice
            art="your-book"
            title="Write in our family journal"
            line="Everyone in the family can read it"
            busy={busy}
            onOpen={onWriteFamily}
          />
        )}
        <Choice
          art="same-page"
          title="Do an activity"
          line={
            asking && plan
              ? `This week together: ${plan.goalLabel}`
              : featured
                ? `On your own or together · this week: ${featured.title}`
                : "On your own or together"
          }
          busy={busy}
          onOpen={onActivities}
        />
        <Choice
          art="home"
          title="Read about our family"
          line="The family journal, newest first"
          busy={busy}
          onOpen={onFamily}
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

function PassageCard({
  passage,
}: {
  passage: { text: string; caption?: string; byName: string; date: string };
}) {
  return (
    <figure className="ha-passage">
      <Whose family />
      <blockquote>“{passage.text.trim()}”</blockquote>
      <figcaption>
        {passage.caption || passage.byName} · {shortDate(passage.date)}
        {passage.caption && <span className="ha-passage-from"> · shared by {passage.byName}</span>}
      </figcaption>
      <Sprig className="ha-passage-sprig" berries />
    </figure>
  );
}
