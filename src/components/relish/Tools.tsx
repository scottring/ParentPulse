"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Clock } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import { audienceOf } from "@/lib/relish/profiles";
import { libraryOnly, noteFamily } from "@/lib/relish/catalog";
import {
  activeFor,
  builderComplete,
  builderPage,
  checkBackDays,
  finishTracker,
  keepToolPage,
  namesList,
  runningByTool,
  runsStatus,
  cleanTrackerSquare,
  setMark,
  sortPage,
  squaresOf,
  TRACKER_SQUARE_LIMIT,
  writeTrackerSquare,
  startTracker,
  stopTracker,
  todayKey,
  toggleMark,
  toolById,
  toolGroups,
  toolsFor,
  trackerProgress,
  type BuilderTool,
  type TrackerRun,
  type SortTool,
  type Tool,
  type ToolPage,
  type TrackerTool,
} from "@/lib/relish/tools";
import type { Player } from "@/lib/relish/living";
import Illustration from "./Illustration";
import DayHighlights from "./DayHighlights";
import { SubHead } from "./ui";
import { exerciseIllustration } from "./illustrations";
import "./journal.css";
import "./tools.css";

type Commit = (
  update: (b: Book) => Book,
  after?: () => void,
  message?: string,
) => void;

export default function Tools({
  book,
  busy,
  onCommit,
  onPages,
  onOpenPage,
  onActivities,
  initialId,
  onBack,
  roster = [],
  sample = false,
  family = [],
}: {
  book: Book;
  busy: boolean;
  /** Family to pick from for activities done together (Day’s highlights). */
  roster?: Player[];
  sample?: boolean;
  onCommit: Commit;
  /** Family members with their own books in the library (e.g. the children). */
  family?: { name: string }[];
  onPages: () => void;
  /** Opens one kept page by its Your book id (e.g. "journal:<id>"). */
  onOpenPage?: (id: string) => void;
  onActivities: () => void;
  /** Opens straight into one exercise (from Do something or Home). */
  initialId?: string;
  /** Where "All exercises" goes when opened straight into one. */
  onBack?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(initialId ?? null);
  const [kept, setKept] = useState<Kept | null>(null);
  const audience = audienceOf(book);
  const available = toolsFor(audience);
  const running = runningByTool(book);
  const tool = openId ? toolById(openId) : undefined;

  if (kept)
    return (
      <main className="rt-screen" aria-labelledby="rt-title">
        <SubHead
          back={{
            label: "Back to Do something",
            onClick: onActivities,
            disabled: busy,
          }}
          note="Your private pages"
        />
        <section className="rt-book rt-kept ui-card">
          <Illustration name="saved" size={150} eager className="rt-kept-art" />
          <div>
            <p className="lb-kicker">{kept.title}</p>
            <h2 id="rt-title">Kept in your book</h2>
            <p className="rt-intro">That’s a good place to stop.</p>
            {kept.note && <p className="rt-intro">{kept.note}</p>}
            {kept.checkBack && (
              <p className="rt-intro">
                In {kept.checkBack === 3 ? "a few" : "a couple of"} days,
                Relish will ask how it went, in your own words. It shows on
                Home, and in Your book under Still going.
              </p>
            )}
            <div className="rt-actions">
              {kept.pageId && onOpenPage ? (
                <button
                  className="lb-primary"
                  disabled={busy}
                  onClick={() => onOpenPage(kept.pageId!)}
                >
                  Open this page <ArrowRight size={16} />
                </button>
              ) : (
                <button className="lb-primary" disabled={busy} onClick={onPages}>
                  Open Your book <ArrowRight size={16} />
                </button>
              )}
              <button
                className="lb-secondary"
                disabled={busy}
                onClick={() => {
                  if (onBack) return onBack();
                  setKept(null);
                  setOpenId(null);
                }}
              >
                {onBack ? "Find something else to do" : "Choose another exercise"}
              </button>
            </div>
          </div>
        </section>
      </main>
    );

  if (tool && tool.audiences.includes(audience))
    return (
      <OpenExercise
        key={tool.id}
        tool={tool}
        book={book}
        busy={busy}
        onCommit={onCommit}
        onKept={setKept}
        onOpenPage={onOpenPage}
        roster={roster}
        sample={sample}
        family={family}
        backLabel={onBack ? "Back to Do something" : "All exercises"}
        onBack={() => (onBack ? onBack() : setOpenId(null))}
      />
    );

  return (
    <main className="rt-screen" aria-labelledby="rt-title">
      <SubHead
        back={{
          label: "Back to Do something",
          onClick: onActivities,
          disabled: busy,
        }}
        note="Your private pages"
      />
      <section className="rt-book ui-card">
        <h2 id="rt-title">Try an exercise</h2>
        <p className="rt-intro">
          Sorts and fill-in-the-blanks end with a page you choose to keep.
          Habits save each mark as you go.
        </p>
        {!!running.length && (
          <section className="rt-group" aria-label="In progress">
            <h3>In progress</h3>
            <div className="rt-list">
              {running.map(({ toolId, runs }) => {
                const t = toolById(toolId)!;
                const one = runs.length === 1;
                const person = one && book.people.find((x) => x.id === runs[0].personId);
                return (
                  <button
                    key={toolId}
                    className="rt-card rt-running"
                    disabled={busy}
                    onClick={() => setOpenId(t.id)}
                  >
                    <span className="lb-kicker">
                      {runsStatus(book, runs)}
                      {one
                        ? t.kind === "tracker" && t.mode === "days"
                          ? " days"
                          : " marked"
                        : ""}
                    </span>
                    <strong>
                      {t.title}
                      {person ? ` · ${person.name}` : ""}
                    </strong>
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {toolGroups.map((group) => {
          const list = available.filter((t) => t.kind === group.kind);
          if (!list.length) return null;
          return (
            <section
              key={group.kind}
              className="rt-group"
              aria-label={group.title}
            >
              <h3>{group.title}</h3>
              <p className="lb-fine">{group.note}</p>
              <div className="rt-list">
                {list.map((t) => (
                  <button
                    key={t.id}
                    className="rt-card"
                    disabled={busy}
                    onClick={() => setOpenId(t.id)}
                  >
                    <span className="lb-kicker">
                      {t.kind === "tracker" ? `${t.time} · ${t.span}` : t.time}
                    </span>
                    <strong>{t.title}</strong>
                    <span>{t.blurb}</span>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}

/**
 * One exercise: a start screen that asks who it is with, then the exercise.
 * A habit already under way opens straight onto its progress.
 */
function OpenExercise({
  tool,
  book,
  busy,
  onCommit,
  onKept,
  onOpenPage,
  family,
  backLabel,
  onBack,
  roster,
  sample,
}: {
  tool: Tool;
  book: Book;
  busy: boolean;
  onCommit: Commit;
  onKept: (kept: Kept) => void;
  onOpenPage?: (id: string) => void;
  family: { name: string }[];
  backLabel: string;
  onBack: () => void;
  roster: Player[];
  sample: boolean;
}) {
  const [started, setStarted] = useState(false);
  const [who, setWho] = useState("");
  // A habit about someone can be done with several people at once.
  const [picked, setPicked] = useState<string[]>([]);
  if (tool.kind === "highlights")
    return (
      <DayHighlights
        tool={tool}
        book={book}
        busy={busy}
        sample={sample}
        roster={roster}
        backLabel={backLabel}
        onBack={onBack}
        onCommit={onCommit}
        onKept={onKept}
      />
    );
  // Family with their own books who aren't noted in this one yet. Choosing one
  // notes them in this book when the exercise starts, so it can be about them.
  const extra = libraryOnly(book.people, family);
  const choices = [
    ...book.people.map((p) => ({ id: p.id, name: p.name })),
    ...extra.map((name, i) => ({ id: `family:${i}`, name })),
  ];
  /** The chosen person, noted in the book first when they come from the library. */
  const resolve = (b: Book, id: string): [Book, string] =>
    id.startsWith("family:") ? noteFamily(b, extra[Number(id.slice(7))]) : [b, id];
  const withWho = (b: Book) => resolve(b, who);
  /** Starts the habit with one more person (or no one, for the first run). */
  const startWith = (b: Book, id: string) => {
    if (tool.kind !== "tracker") return b;
    const [next, personId] = resolve(b, id);
    return startTracker(next, tool.id, personId || undefined);
  };
  const multi = tool.kind === "tracker" && !!tool.aboutPerson;
  const running = tool.kind === "tracker" && activeFor(book, tool.id).length > 0;
  const keep: KeepPage = (page) => {
    let pageId: string | undefined;
    onCommit(
      (b) => {
        const next = keepToolPage(b, page);
        pageId = newJournalId(b, next);
        return next;
      },
      () =>
        onKept({
          title: page.title,
          pageId,
          ...(page.plan && page.toolId && checkBackDays[page.toolId]
            ? { checkBack: checkBackDays[page.toolId] }
            : {}),
        }),
      "Kept in your book.",
    );
  };
  if (!started && !running)
    return (
      <ExerciseStart
        tool={tool}
        book={book}
        busy={busy}
        who={who}
        choices={choices}
        onWho={setWho}
        picked={multi ? picked : undefined}
        onPick={setPicked}
        backLabel={backLabel}
        onBack={onBack}
        onStart={() => {
          // Marks save as they're made; the habit screen shows them, so no notice.
          if (tool.kind === "tracker")
            return onCommit((b) =>
              multi
                ? picked.length
                  ? choices
                      .map((c) => c.id)
                      .filter((id) => picked.includes(id))
                      .reduce(startWith, b)
                  : startWith(b, "")
                : startWith(b, who),
            );
          if (!who.startsWith("family:")) return setStarted(true);
          let id = "";
          onCommit(
            (b) => {
              const [next, chosen] = withWho(b);
              id = chosen;
              return next;
            },
            () => {
              setWho(id);
              setStarted(true);
            },
          );
        }}
      />
    );
  if (tool.kind === "tracker") {
    const active = new Set(activeFor(book, tool.id).map((r) => r.personId));
    return (
      <HabitScreen
        tool={tool}
        book={book}
        busy={busy}
        onCommit={onCommit}
        onKept={onKept}
        onOpenPage={onOpenPage}
        backLabel={backLabel}
        onBack={onBack}
        addable={
          multi
            ? choices.filter(
                (c) => c.id.startsWith("family:") || !active.has(c.id),
              )
            : []
        }
        onAdd={(id) => onCommit((b) => startWith(b, id))}
      />
    );
  }
  // Exercises about someone use the choice as that person; others only tag the page.
  const personId = tool.aboutPerson ? who : "";
  const people = !tool.aboutPerson && who ? [who] : [];
  return (
    <main className="rt-screen" aria-labelledby="rt-title">
      <SubHead
        back={{ label: backLabel, onClick: onBack, disabled: busy }}
        note="Your private pages"
      />
      <section className="rt-book ui-card">
        <p className="rt-start-time">
          <Clock size={18} aria-hidden="true" /> {tool.time}
        </p>
        <h2 id="rt-title">{tool.title}</h2>
        <p className="rt-intro">{tool.blurb}</p>
        <p className="rt-end">
          <strong>Finished when:</strong> {tool.end}
        </p>
        {tool.kind === "sort" ? (
          <SortRunner
            tool={tool}
            book={book}
            busy={busy}
            personId={personId}
            people={people}
            onKeep={keep}
          />
        ) : tool.kind === "builder" ? (
          <BuilderRunner
            tool={tool}
            book={book}
            busy={busy}
            personId={personId}
            people={people}
            onKeep={keep}
          />
        ) : null}
      </section>
    </main>
  );
}

function ExerciseStart({
  tool,
  book,
  busy,
  who,
  choices,
  onWho,
  picked,
  onPick,
  backLabel,
  onBack,
  onStart,
}: {
  tool: Tool;
  book: Book;
  busy: boolean;
  who: string;
  /** Everyone this could be with: people in the book, then family with their own books. */
  choices: { id: string; name: string }[];
  onWho: (id: string) => void;
  /** Set for habits about someone: tick one or more people. */
  picked?: string[];
  onPick: (ids: string[]) => void;
  backLabel: string;
  onBack: () => void;
  onStart: () => void;
}) {
  const required = !!tool.aboutPerson?.required;
  const several = !!picked;
  const chosen = several ? picked.length > 0 : !!who;
  const options = [
    ...(required ? [] : [{ id: "", name: "No one in particular" }]),
    ...choices,
  ];
  return (
    <main className="rt-start" aria-labelledby="rt-title">
      <SubHead
        back={{ label: backLabel, onClick: onBack, disabled: busy }}
        note="Your private pages"
      />
      <section className="rt-start-card ui-card ui-torn">
        <div className="rt-start-text">
          <p className="rt-start-time">
            <Clock size={18} aria-hidden="true" />{" "}
            {tool.kind === "tracker"
              ? `${tool.mode === "days" ? "Each day" : "Each time"}: ${tool.time.toLowerCase()}`
              : tool.time}
          </p>
          {tool.kind === "tracker" && (
            <p className="rt-start-time rt-start-span">
              Keeps going: {tool.span.toLowerCase()}
            </p>
          )}
          <h2 id="rt-title">{tool.title}</h2>
          <p className="rt-start-blurb">{tool.blurb}</p>
          {audienceOf(book) === "under-6" && (
            <p className="lb-age-cue">
              Grown-up: read each part aloud and let your child choose.
            </p>
          )}
          <p className="rt-start-note">
            {tool.kind === "tracker"
              ? "Each mark saves as you go. Keep a page when you’re done, or stop any time."
              : "Nothing is saved until you choose Keep this page at the end."}
          </p>
          {required && !choices.length ? (
            <p className="lb-fine rt-note">
              Add someone to your book first, then come back to this exercise.
            </p>
          ) : (
            choices.length > 0 && (
              <fieldset className="rt-who">
                <legend>
                  {tool.aboutPerson?.label || "Who is this with?"}
                  {several && (
                    <small>
                      {" "}
                      {required ? "Choose one or more" : "Optional · one or more"}
                    </small>
                  )}
                </legend>
                <div>
                  {several
                    ? choices.map((o) => (
                        <label key={o.id}>
                          <input
                            type="checkbox"
                            checked={picked.includes(o.id)}
                            onChange={(e) =>
                              onPick(
                                e.target.checked
                                  ? [...picked, o.id]
                                  : picked.filter((id) => id !== o.id),
                              )
                            }
                          />
                          {o.name}
                        </label>
                      ))
                    : options.map((o) => (
                        <label key={o.id || "none"}>
                          <input
                            type="radio"
                            name={`rt-who-${tool.id}`}
                            checked={who === o.id}
                            onChange={() => onWho(o.id)}
                          />
                          {o.name}
                        </label>
                      ))}
                </div>
              </fieldset>
            )
          )}
          <button
            className="rp-btn rp-btn-olive rt-start-go"
            disabled={busy || (required && !chosen)}
            onClick={onStart}
          >
            {tool.kind === "tracker" && tool.mode === "squares"
              ? "Start bingo"
              : tool.kind === "tracker"
                ? "Start today"
                : "Start this exercise"}{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
        <ExerciseArt tool={tool} />
      </section>
    </main>
  );
}

/** The exercise's picture: its watercolor, or a sketch until it arrives. */
function ExerciseArt({ tool }: { tool: Tool }) {
  return (
    <div className="rt-start-art" aria-hidden="true">
      <Illustration
        name={exerciseIllustration[tool.id] ?? "think-it-through"}
        size="100%"
      />
    </div>
  );
}

type KeepPage = (page: ToolPage) => void;
/** What was just kept: its title and, once saved, its Your book page id. */
type Kept = {
  title: string;
  pageId?: string;
  /** Days until Relish asks about the plan, for exercises that check back. */
  checkBack?: number;
  /** One more line about what was kept (a trip's day number). */
  note?: string;
};
/** The journal page a change added, as a Your book page id. */
function newJournalId(before: Book, after: Book) {
  const had = new Set((before.journal || []).map((e) => e.id));
  const added = (after.journal || []).find((e) => !had.has(e.id));
  return added ? `journal:${added.id}` : undefined;
}
const titled = (tool: Tool, book: Book, personId: string) => {
  const name = book.people.find((p) => p.id === personId)?.name;
  return name ? `${tool.title} · ${name}` : tool.title;
};

function SortRunner({
  tool,
  book,
  busy,
  personId,
  people,
  onKeep,
}: {
  tool: SortTool;
  book: Book;
  busy: boolean;
  /** Who the exercise is about, chosen on the start screen. */
  personId: string;
  /** Who it was with, for exercises not about anyone in particular. */
  people: string[];
  onKeep: KeepPage;
}) {
  const [subject, setSubject] = useState("");
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const cards = [...tool.cards(audienceOf(book)), ...extra];
  const sorted = Object.keys(placed).length;
  // One card at a time up top; every card stays changeable in the list below.
  const current = cards.find((c) => !placed[c] && !skipped.includes(c));
  const ready =
    sorted > 0 &&
    (!tool.subject || !!subject.trim()) &&
    (!tool.aboutPerson?.required || !!personId);
  const about = book.people.find((p) => p.id === personId)?.name;
  function place(card: string, pile: string) {
    setPlaced({ ...placed, [card]: pile });
    // A pick must stay in its pile; clear it when its card moves elsewhere.
    setPicks(
      Object.fromEntries(
        Object.entries(picks).filter(([p, c]) => c !== card || p === pile),
      ),
    );
  }
  function addCard() {
    const value = draft.trim().slice(0, 80);
    if (!value || cards.some((c) => c.toLowerCase() === value.toLowerCase()))
      return;
    setExtra([...extra, value]);
    setDraft("");
  }
  return (
    <div className="rt-runner">
      {tool.subject && (
        <label className="rt-field">
          {tool.subject.label}
          <input
            value={subject}
            maxLength={200}
            placeholder={tool.subject.placeholder}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
      )}
      <p className="rt-progress" aria-live="polite">
        {sorted} of {cards.length} sorted · skip any that don’t fit
      </p>
      {current ? (
        <div className="rt-current">
          <p className="rt-current-card">{current}</p>
          <div role="group" aria-label={`Sort this card: ${current}`} className="rt-current-piles">
            {tool.piles.map((pile) => (
              <button key={pile.id} type="button" onClick={() => place(current, pile.id)}>
                {pile.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ui-link"
            onClick={() => setSkipped([...skipped, current])}
          >
            Skip this one
          </button>
        </div>
      ) : (
        <p className="rt-current-done">
          Every card has a place. Change any of them below.
        </p>
      )}
      <ul className="rt-sort" aria-label="Your sorting so far">
        {cards.map((card) => (
          <li key={card}>
            <span>{card}</span>
            <div role="group" aria-label={card}>
              {tool.piles.map((pile) => (
                <button
                  key={pile.id}
                  aria-pressed={placed[card] === pile.id}
                  onClick={() => place(card, pile.id)}
                >
                  {pile.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <form
        className="rt-add"
        onSubmit={(e) => {
          e.preventDefault();
          addCard();
        }}
      >
        <label className="rt-field">
          Add your own card
          <input
            value={draft}
            maxLength={80}
            placeholder="Something that isn’t listed"
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <button className="lb-secondary" disabled={!draft.trim()}>
          Add card
        </button>
      </form>
      {tool.picks.map((pick) => {
        const options = cards.filter((c) => placed[c] === pick.pile);
        if (!options.length) return null;
        return (
          <fieldset key={pick.pile} className="rt-pick">
            <legend>{pick.label}</legend>
            <div className="rt-chips">
              {options.map((c) => (
                <button
                  key={c}
                  aria-pressed={picks[pick.pile] === c}
                  onClick={() =>
                    setPicks({
                      ...picks,
                      [pick.pile]: picks[pick.pile] === c ? "" : c,
                    })
                  }
                >
                  {picks[pick.pile] === c && <Check size={14} />} {c}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
      {ready && (
        <Preview
          text={sortPage(tool, { subject, placed, picks }, about)}
          busy={busy}
          onKeep={(text) =>
            onKeep({
              title: titled(tool, book, personId),
              text,
              toolId: tool.id,
              personId: personId || undefined,
              people,
              plan: checkBackDays[tool.id] ? picks[tool.picks[0]?.pile] : undefined,
            })
          }
        />
      )}
    </div>
  );
}

function BuilderRunner({
  tool,
  book,
  busy,
  personId,
  people,
  onKeep,
}: {
  tool: BuilderTool;
  book: Book;
  busy: boolean;
  /** Who the exercise is about, chosen on the start screen. */
  personId: string;
  /** Who it was with, for exercises not about anyone in particular. */
  people: string[];
  onKeep: KeepPage;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const complete =
    builderComplete(tool, values) &&
    (!tool.aboutPerson?.required || !!personId);
  const about = book.people.find((p) => p.id === personId)?.name;
  const checks = tool.checks?.(values);
  return (
    <div className="rt-runner">
      {tool.fields.map((f) => (
        <label key={f.id} className="rt-field">
          {f.label}
          {f.optional ? <small> · optional</small> : null}
          {f.multiline ? (
            <textarea
              rows={3}
              maxLength={1000}
              value={values[f.id] || ""}
              placeholder={f.placeholder}
              onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
            />
          ) : (
            <input
              maxLength={300}
              value={values[f.id] || ""}
              placeholder={f.placeholder}
              onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
            />
          )}
        </label>
      ))}
      {tool.verdict && (
        <fieldset className="rt-pick">
          <legend>{tool.verdict.label}</legend>
          <div className="rt-chips">
            {tool.verdict.choices.map((c) => (
              <button
                key={c}
                aria-pressed={values.verdict === c}
                onClick={() => setValues({ ...values, verdict: c })}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {checks && (
        <ul className="rt-checks" aria-label="Checks">
          {checks.map((c) => (
            <li key={c.text} data-ok={c.ok}>
              {c.ok ? <Check size={14} /> : <span aria-hidden="true">○</span>}{" "}
              {c.text}
            </li>
          ))}
        </ul>
      )}
      {complete && (
        <>
          <div className="rt-composed">
            <p className="lb-kicker">{tool.composeLabel}</p>
            <p>{tool.compose(values)}</p>
          </div>
          <Preview
            text={builderPage(tool, values, about)}
            busy={busy}
            onKeep={(text) =>
              onKeep({
                title: titled(tool, book, personId),
                text,
                toolId: tool.id,
                personId: personId || undefined,
                people,
                plan: checkBackDays[tool.id] ? tool.compose(values) : undefined,
              })
            }
          />
        </>
      )}
    </div>
  );
}

function Preview({
  text,
  busy,
  onKeep,
}: {
  text: string;
  busy: boolean;
  onKeep: (text: string) => void;
}) {
  return (
    <div className="rt-preview">
      <p className="lb-kicker">Your page will read</p>
      <blockquote>{text}</blockquote>
      <button
        className="lb-primary"
        disabled={busy}
        onClick={() => onKeep(text)}
      >
        Keep this page <Check size={16} />
      </button>
      <p className="lb-fine">
        It is saved privately in Your book. Sharing is a separate choice.
      </p>
    </div>
  );
}

/**
 * A habit under way (Scott's mockup, 2026-11-18): the title, who it is with,
 * today's effort and the one instruction beside its picture, then progress and
 * today's action. With several people, one compact row each, in the order
 * they were started; each person marks and finishes on their own.
 */
function HabitScreen({
  tool,
  book,
  busy,
  onCommit,
  onKept,
  onOpenPage,
  backLabel,
  onBack,
  addable,
  onAdd,
}: {
  tool: TrackerTool;
  book: Book;
  busy: boolean;
  onCommit: Commit;
  onKept: (kept: Kept) => void;
  onOpenPage?: (id: string) => void;
  backLabel: string;
  onBack: () => void;
  /** People who could join this habit now ("Add someone"). */
  addable: { id: string; name: string }[];
  onAdd: (id: string) => void;
}) {
  const runs = activeFor(book, tool.id);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [memories, setMemories] = useState<Record<string, string>>({});
  const [options, setOptions] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [adding, setAdding] = useState(false);
  /** Bingo: changing a square to the family's own words. */
  const [changing, setChanging] = useState(false);
  const [keptNote, setKeptNote] = useState<{ name: string; pageId?: string } | null>(null);
  const moreId = useId();
  // Started from the exercise's start screen; nothing to show once it stops.
  if (!runs.length) return null;
  const nameOf = (run: TrackerRun) =>
    book.people.find((p) => p.id === run.personId)?.name;
  const names = runs.map(nameOf).filter((n): n is string => !!n);
  const solo = runs.length === 1;
  const days = tool.mode === "days";
  const today = todayKey();
  const titleFor = (run: TrackerRun) => {
    const name = nameOf(run);
    return name ? `${tool.title} · ${name}` : tool.title;
  };
  const doneText = (run: TrackerRun) => {
    if (!days) return "Bingo: a full line.";
    const name = nameOf(run);
    const line = tool.doneLine ?? `All ${tool.target} days`;
    return name ? `${line} with ${name}.` : `${line}.`;
  };
  const withMarks = runs.filter((r) => r.marks.length);

  // Each mark saves as it's made; the row itself shows that it did.
  const mark = (run: TrackerRun, on: boolean) =>
    onCommit(
      (b) => setMark(b, run.id, today, on, on ? notes[run.id] : undefined),
      () => on && setNotes((n) => ({ ...n, [run.id]: "" })),
    );
  const toggleSquare = (run: TrackerRun, i: number) =>
    onCommit((b) => toggleMark(b, run.id, String(i)));
  /** Keeps one person's page; the others carry on. */
  function keep(run: TrackerRun) {
    const others = runs.length > 1;
    const name = nameOf(run);
    let pageId: string | undefined;
    onCommit(
      (b) => {
        const next = finishTracker(b, run.id, days ? memories[run.id] : undefined);
        pageId = newJournalId(b, next);
        return next;
      },
      () =>
        others
          ? setKeptNote({ name: name || tool.title, pageId })
          : onKept({ title: titleFor(run), pageId }),
      others ? undefined : "Kept in your book.",
    );
  }
  /** Finishing early: a page for everyone with something marked. */
  function finishAll() {
    let pageId: string | undefined;
    onCommit(
      (b) => {
        let next = b;
        for (const run of runs)
          next = run.marks.length
            ? finishTracker(next, run.id, days ? memories[run.id] : undefined)
            : stopTracker(next, run.id);
        pageId = newJournalId(b, next);
        return next;
      },
      () =>
        onKept(
          withMarks.length === 1
            ? { title: titleFor(withMarks[0]), pageId }
            : {
                title: tool.title,
                note: `One page each for ${namesList(withMarks.map((r) => nameOf(r) || "no one in particular"))}.`,
              },
        ),
      "Kept in your book.",
    );
  }

  const marksOf = (run: TrackerRun) =>
    days ? (
      <ol className="rt-days" aria-hidden="true">
        {Array.from({ length: tool.target }, (_, i) => (
          <li key={i} data-done={i < run.marks.length} />
        ))}
      </ol>
    ) : (
      <div className="rt-bingo" role="group" aria-label={nameOf(run) && !solo ? `${tool.title} with ${nameOf(run)}` : tool.title}>
        {squaresOf(run).map((sq, i) => {
          const on = run.marks.some((m) => m.key === String(i));
          return (
            <button
              key={i}
              data-own={!!run.own?.[i] || undefined}
              aria-pressed={on}
              disabled={busy}
              onClick={() => toggleSquare(run, i)}
            >
              {on && <Check size={14} />} {sq}
            </button>
          );
        })}
      </div>
    );
  const noteField = (run: TrackerRun) =>
    days && tool.notePrompt ? (
      <label className="rt-field rt-habit-field">
        <span>
          {tool.notePrompt} <small>· optional</small>
        </span>
        <input
          value={notes[run.id] || ""}
          maxLength={500}
          onChange={(e) => setNotes({ ...notes, [run.id]: e.target.value })}
        />
      </label>
    ) : null;
  const memoryField = (run: TrackerRun) =>
    days ? (
      <label className="rt-field rt-habit-field">
        <span>
          Anything you want to remember? <small>· optional</small>
        </span>
        <input
          value={memories[run.id] || ""}
          maxLength={500}
          onChange={(e) => setMemories({ ...memories, [run.id]: e.target.value })}
        />
      </label>
    ) : null;
  const undo = (run: TrackerRun) => (
    <button
      type="button"
      className="rt-habit-undo"
      disabled={busy}
      aria-label={solo || !nameOf(run) ? "Undo today" : `Undo today for ${nameOf(run)}`}
      onClick={() => mark(run, false)}
    >
      Undo
    </button>
  );

  const run = runs[0];
  const p = trackerProgress(run);
  const markedToday = days && run.marks.some((m) => m.key === today);
  const count = (r: TrackerRun) => {
    const q = trackerProgress(r);
    return `${q.done} of ${q.total} ${days ? "days" : "marked"}`;
  };

  return (
    <main className="rt-screen" aria-labelledby="rt-title">
      <SubHead
        back={{ label: backLabel, onClick: onBack, disabled: busy }}
        note="Your private pages"
      />
      <section className="rt-book ui-card rt-habit">
        <div className="rt-habit-head">
          <h2 id="rt-title">{tool.title}</h2>
          {names.length > 0 && (
            <p className="rt-habit-with">With {namesList(names)}</p>
          )}
          <p className="rt-habit-time">
            {days ? `${tool.time} a day, at your own pace` : tool.time}
          </p>
          <p className="rt-habit-do">{tool.instruction}</p>
          <div className="rt-habit-art" aria-hidden="true">
            <Illustration
              name={exerciseIllustration[tool.id] ?? "think-it-through"}
              size="100%"
            />
          </div>
        </div>
        <div className="rt-habit-body">
          {keptNote && (
            <p className="rt-habit-kept" role="status">
              {keptNote.name}’s page is kept in your book.
              {keptNote.pageId && onOpenPage && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="ui-link"
                    disabled={busy}
                    onClick={() => onOpenPage(keptNote.pageId!)}
                  >
                    Open it
                  </button>
                </>
              )}
            </p>
          )}
          {solo ? (
            <>
              {p.complete && <p className="rt-habit-done">{doneText(run)}</p>}
              <div className="rt-habit-status">
                <p className="rt-habit-count" aria-live="polite">
                  {count(run)}
                  {markedToday && " · Today marked"}
                </p>
                {markedToday && undo(run)}
              </div>
              {marksOf(run)}
              {p.complete ? memoryField(run) : !markedToday && noteField(run)}
            </>
          ) : (
            <ul className="rt-habit-rows" aria-label="Each person">
              {runs.map((r) => {
                const q = trackerProgress(r);
                const name = nameOf(r) || "No one in particular";
                const today_ = days && r.marks.some((m) => m.key === today);
                return (
                  <li key={r.id} className="rt-habit-row" data-complete={q.complete}>
                    <div className="rt-habit-who">
                      <strong>{name}</strong>
                      <span>{count(r)}</span>
                    </div>
                    <div className="rt-habit-act" aria-live="polite">
                      {today_ ? (
                        <>
                          <span className="rt-habit-marked">
                            Marked today <Check size={15} aria-hidden="true" />
                          </span>
                          {undo(r)}
                        </>
                      ) : (
                        days &&
                        !q.complete && (
                          <button
                            className="lb-primary rt-habit-mark"
                            disabled={busy}
                            aria-label={`Mark today for ${name}`}
                            onClick={() => mark(r, true)}
                          >
                            Mark today
                          </button>
                        )
                      )}
                    </div>
                    <div className="rt-habit-marks">{marksOf(r)}</div>
                    {q.complete ? (
                      <div className="rt-habit-keep">
                        <p className="rt-habit-done">{doneText(r)}</p>
                        {memoryField(r)}
                        <button
                          className="lb-primary rt-habit-mark"
                          disabled={busy}
                          onClick={() => keep(r)}
                        >
                          Keep {name === "No one in particular" ? "this" : `${name}’s`} page
                        </button>
                      </div>
                    ) : (
                      !today_ &&
                      noteField(r) && <div className="rt-habit-keep">{noteField(r)}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="rt-habit-foot">
            {solo &&
              (p.complete ? (
                <button
                  className="lb-primary rt-habit-mark"
                  disabled={busy}
                  onClick={() => keep(run)}
                >
                  Finish and keep a page
                </button>
              ) : (
                days &&
                !markedToday && (
                  <button
                    className="lb-primary rt-habit-mark"
                    disabled={busy}
                    onClick={() => mark(run, true)}
                  >
                    Mark today
                  </button>
                )
              ))}
            <button
              type="button"
              className="rt-habit-options"
              aria-expanded={options}
              aria-controls={moreId}
              onClick={() => setOptions(!options)}
            >
              Activity options <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
          {options && (
            <div className="rt-habit-more" id={moreId}>
              {withMarks.length > 0 && !(solo && p.complete) && (
                <div>
                  <button className="lb-secondary" disabled={busy} onClick={finishAll}>
                    {withMarks.length === 1 ? "Finish and keep a page" : "Finish and keep pages"}
                  </button>
                  {withMarks.length < runs.length && (
                    <p className="lb-fine">
                      Nothing marked yet for{" "}
                      {namesList(runs.filter((r) => !r.marks.length).map((r) => nameOf(r) || "no one in particular"))}
                      , so no page for them.
                    </p>
                  )}
                </div>
              )}
              {confirmStop ? (
                <span className="rt-confirm">
                  {solo ? "Stop and discard this progress?" : "Stop and discard everyone’s progress?"}{" "}
                  <button
                    className="lb-text"
                    disabled={busy}
                    onClick={() =>
                      onCommit(
                        (b) => runs.reduce((x, r) => stopTracker(x, r.id), b),
                        onBack,
                        "Exercise stopped.",
                      )
                    }
                  >
                    Yes, stop
                  </button>
                  <button className="lb-text" onClick={() => setConfirmStop(false)}>
                    Keep going
                  </button>
                </span>
              ) : (
                <button
                  className="lb-text"
                  disabled={busy}
                  onClick={() => setConfirmStop(true)}
                >
                  Stop without keeping
                </button>
              )}
              {!days &&
                (changing ? (
                  <SquareChanger
                    runs={runs}
                    busy={busy}
                    onCommit={onCommit}
                    onDone={() => setChanging(false)}
                  />
                ) : (
                  <button className="lb-text" disabled={busy} onClick={() => setChanging(true)}>
                    Change a square
                  </button>
                ))}
              {addable.length > 0 &&
                (adding ? (
                  <fieldset className="rt-pick">
                    <legend>Add someone</legend>
                    <div className="rt-chips">
                      {addable.map((c) => (
                        <button
                          key={c.id}
                          disabled={busy}
                          onClick={() => {
                            setAdding(false);
                            setOptions(false);
                            onAdd(c.id);
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <button className="lb-text" disabled={busy} onClick={() => setAdding(true)}>
                    Add someone
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/**
 * Bingo in your own words: pick a square, then say what goes there instead.
 * It changes for everyone doing this habit; a mark on it clears, since it's
 * something new to try.
 */
function SquareChanger({
  runs,
  busy,
  onCommit,
  onDone,
}: {
  runs: TrackerRun[];
  busy: boolean;
  onCommit: Commit;
  onDone: () => void;
}) {
  const [square, setSquare] = useState<number | null>(null);
  const [text, setText] = useState("");
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (square !== null) field.current?.focus();
  }, [square]);
  const squares = squaresOf(runs[0]);
  const own = square !== null && runs.some((r) => !!r.own?.[square]);
  const clean = cleanTrackerSquare(text);
  const taken =
    square !== null &&
    !!clean &&
    runs.some((r) =>
      squaresOf(r).some(
        (sq, i) => i !== square && sq.toLocaleLowerCase() === clean.toLocaleLowerCase(),
      ),
    );
  const marked =
    square !== null && runs.some((r) => r.marks.some((m) => m.key === String(square)));
  const save = (value: string) =>
    onCommit(
      (b) => writeTrackerSquare(b, runs.map((r) => r.id), square!, value),
      onDone,
      value ? "Square changed." : "The card’s square is back.",
    );
  return (
    <fieldset className="rt-pick rt-square-change">
      <legend>Change a square</legend>
      {square === null ? (
        <>
          <p className="lb-fine">Which one? Put your own in its place.</p>
          <div className="rt-chips">
            {squares.map((sq, i) => (
              <button
                key={i}
                disabled={busy}
                onClick={() => {
                  setSquare(i);
                  setText(runs[0].own?.[i] || "");
                }}
              >
                {sq}
              </button>
            ))}
          </div>
          <button className="lb-text" disabled={busy} onClick={onDone}>
            Never mind
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (clean && !taken && !busy) save(clean);
          }}
        >
          <label className="rt-field">
            Instead of “{squares[square]}”
            <input
              ref={field}
              value={text}
              maxLength={TRACKER_SQUARE_LIMIT}
              autoComplete="off"
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="lb-fine" aria-live="polite">
            {taken
              ? "That one is already on the card."
              : marked
                ? "It’s something new, so its mark clears."
                : "A few words, in your own way."}
            {runs.length > 1 ? " It changes for everyone doing this." : ""}
          </p>
          <div className="rt-actions">
            <button className="lb-primary" disabled={busy || !clean || taken}>
              Use this
            </button>
            {own && (
              <button type="button" className="lb-text" disabled={busy} onClick={() => save("")}>
                Put the card’s square back
              </button>
            )}
            <button type="button" className="lb-text" disabled={busy} onClick={() => setSquare(null)}>
              Back
            </button>
          </div>
        </form>
      )}
    </fieldset>
  );
}
