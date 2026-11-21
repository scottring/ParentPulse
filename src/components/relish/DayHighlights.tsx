"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock, Mic } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import type { Player } from "@/lib/relish/living";
import { dayQuickPicks } from "@/lib/relish/play-content";
import { SOURCE_NAME_LIMIT } from "@/lib/relish/journal";
import {
  answerDay,
  cleanName,
  DAY_ANSWER_LIMIT,
  dayStep,
  dayText,
  dayTotal,
  discardDay,
  keepDay,
  moveDay,
  recentTrip,
  startDay,
  toolsOf,
  tripDay,
  type DayRun,
  type HighlightsTool,
} from "@/lib/relish/tools";
import Illustration from "./Illustration";
import VoiceWriter from "./VoiceWriter";
import { SubHead } from "./ui";
import { exerciseIllustration } from "./illustrations";

type Commit = (update: (b: Book) => Book, after?: () => void, message?: string) => void;
/** What Tools shows once the day is kept. */
export type DayKept = { title: string; pageId?: string; note?: string };

/**
 * Day's highlights: one person holds the phone and asks everyone in the car
 * three questions, out loud. Every tap is saved in the book as it happens.
 */
export default function DayHighlights({
  tool,
  book,
  busy,
  sample,
  roster,
  backLabel,
  onBack,
  onCommit,
  onKept,
}: {
  tool: HighlightsTool;
  book: Book;
  busy: boolean;
  sample: boolean;
  /** Family to pick from; the book's owner comes first. */
  roster: Player[];
  backLabel: string;
  onBack: () => void;
  onCommit: Commit;
  onKept: (kept: DayKept) => void;
}) {
  const run = toolsOf(book).day;
  return (
    <main className="rt-screen rt-day" aria-labelledby="rt-title">
      <SubHead
        back={{ label: backLabel, onClick: onBack, disabled: busy }}
        note={run ? "Each answer saves as you go" : "Your private pages"}
      />
      {!run ? (
        <DayStart tool={tool} book={book} busy={busy} roster={roster} onCommit={onCommit} />
      ) : run.at < dayTotal(run) ? (
        <DayQuestion
          key={`${run.id}:${run.at}`}
          tool={tool}
          book={book}
          run={run}
          busy={busy}
          sample={sample}
          onCommit={onCommit}
        />
      ) : (
        <DayReadBack
          key={run.id}
          tool={tool}
          book={book}
          run={run}
          busy={busy}
          onCommit={onCommit}
          onKept={onKept}
          onBack={onBack}
        />
      )}
    </main>
  );
}

function DayStart({
  tool,
  book,
  busy,
  roster,
  onCommit,
}: {
  tool: HighlightsTool;
  book: Book;
  busy: boolean;
  roster: Player[];
  onCommit: Commit;
}) {
  const [out, setOut] = useState<string[]>([]);
  const [guests, setGuests] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const everyone = [...roster, ...guests];
  const people = everyone.filter((p) => !out.includes(p.id));
  function addGuest() {
    const value = name.trim().slice(0, 60);
    if (!value || everyone.some((p) => p.name.toLowerCase() === value.toLowerCase()) || everyone.length >= 12)
      return;
    setGuests([...guests, { id: crypto.randomUUID(), name: value }]);
    setName("");
    setAdding(false);
  }
  return (
    <section className="rt-start-card ui-card ui-torn">
      <div className="rt-start-text">
        <p className="rt-start-time">
          <Clock size={18} aria-hidden="true" /> {tool.short} · {tool.time.toLowerCase()}
        </p>
        <h2 id="rt-title">{tool.title}</h2>
        <p className="rt-start-blurb">
          End of a driving day? Everyone gets three quick questions, out loud.
        </p>
        <ol className="rt-day-asks">
          {tool.questions.map((q) => (
            <li key={q.id}>{q.ask.charAt(0).toUpperCase() + q.ask.slice(1)}</li>
          ))}
        </ol>
        <fieldset className="rt-who rt-day-who">
          <legend>Who’s in the car? Tap to leave someone out.</legend>
          <div className="rt-chips">
            {everyone.map((p) => {
              const on = !out.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setOut(on ? [...out, p.id] : out.filter((x) => x !== p.id))}
                >
                  {on && <Check size={14} />} {p.name}
                </button>
              );
            })}
            {!adding && everyone.length < 12 && (
              <button type="button" onClick={() => setAdding(true)}>
                + Someone else
              </button>
            )}
          </div>
        </fieldset>
        {adding && (
          <form
            className="rt-add rt-day-guest"
            onSubmit={(e) => {
              e.preventDefault();
              addGuest();
            }}
          >
            <label className="rt-field">
              Their name
              <input
                autoFocus
                value={name}
                maxLength={60}
                placeholder="A cousin or a friend"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="lb-secondary" disabled={!name.trim()}>
              Add
            </button>
          </form>
        )}
        <p className="rt-start-note">
          One person reads the questions and taps or types the answers. Anyone
          can skip. Each answer saves as you go; the day is kept in{" "}
          {book.owner}’s journal when you choose.
        </p>
        <button
          className="rp-btn rp-btn-olive rt-start-go"
          disabled={busy || !people.length}
          onClick={() =>
            onCommit((b) =>
              startDay(
                b,
                people.map((p) => ({ id: p.id, name: p.name, audience: p.audience })),
              ),
            )
          }
        >
          {people.length ? `Start with ${people[0].name}` : "Choose someone first"}{" "}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="rt-start-art" aria-hidden="true">
        <Illustration name={exerciseIllustration[tool.id] ?? "home"} size="100%" />
      </div>
    </section>
  );
}

function DayQuestion({
  tool,
  book,
  run,
  busy,
  sample,
  onCommit,
}: {
  tool: HighlightsTool;
  book: Book;
  run: DayRun;
  busy: boolean;
  sample: boolean;
  onCommit: Commit;
}) {
  const step = dayStep(run)!;
  const [text, setText] = useState(step.answer);
  const [voice, setVoice] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (run.at > 0) heading.current?.focus();
  }, [run.at]);
  const answer = (value: string) => onCommit((b) => answerDay(b, run.id, run.at, value));
  const picks = dayQuickPicks(step.question.id, step.person.audience);
  return (
    <section className="rt-book ui-card rt-day-card">
      <div className="rt-day-line">
        <p className="lb-kicker">
          {tool.title} · {step.person.name} · {step.index + 1} of {tool.questions.length}
        </p>
        <ol className="rt-day-dots" aria-label={`Question ${run.at + 1} of ${dayTotal(run)}`}>
          {Array.from({ length: dayTotal(run) }, (_, i) => (
            <li key={i} data-done={i < run.at} data-now={i === run.at} />
          ))}
        </ol>
      </div>
      <h2 id="rt-title" ref={heading} tabIndex={-1}>
        {step.person.name}, {step.question.ask}
      </h2>
      <div className="rt-day-picks" role="group" aria-label="Quick picks">
        {picks.map((pick) => (
          <button
            key={pick}
            type="button"
            disabled={busy}
            aria-pressed={step.answer === pick}
            onClick={() => answer(pick)}
          >
            {pick}
          </button>
        ))}
      </div>
      <form
        className="rt-day-own"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) answer(text);
        }}
      >
        <label className="rt-field">
          Or in their words
          <textarea
            rows={2}
            maxLength={DAY_ANSWER_LIMIT}
            value={text}
            placeholder="Type it, or tap Say it"
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="rt-actions">
          <button className="lb-primary" disabled={busy || !text.trim()}>
            Save and next <ArrowRight size={16} />
          </button>
          <button type="button" className="lb-secondary" disabled={busy} onClick={() => setVoice(true)}>
            <Mic size={16} /> Say it
          </button>
        </div>
      </form>
      <VoiceWriter
        book={book}
        sample={sample}
        open={voice}
        onClose={() => setVoice(false)}
        remaining={DAY_ANSWER_LIMIT - text.length}
        onInsert={(said) => {
          setText((t) => `${t}${t.trim() ? " " : ""}${said}`.slice(0, DAY_ANSWER_LIMIT));
          setVoice(false);
        }}
      />
      <div className="rt-day-foot">
        <button className="lb-text" disabled={busy} onClick={() => answer("")}>
          Skip this one
        </button>
        {run.at > 0 && (
          <button
            className="lb-text"
            disabled={busy}
            onClick={() => onCommit((b) => moveDay(b, run.id, run.at - 1))}
          >
            Back
          </button>
        )}
      </div>
    </section>
  );
}

function DayReadBack({
  tool,
  book,
  run,
  busy,
  onCommit,
  onKept,
  onBack,
}: {
  tool: HighlightsTool;
  book: Book;
  run: DayRun;
  busy: boolean;
  onCommit: Commit;
  onKept: (kept: DayKept) => void;
  onBack: () => void;
}) {
  const [trip, setTrip] = useState(() => recentTrip(book));
  const [place, setPlace] = useState("");
  const [confirm, setConfirm] = useState(false);
  const text = dayText(run);
  const name = cleanName(trip);
  const day = name ? tripDay(book, name) : 0;
  const answered = run.people.flatMap((person, i) => {
    const lines = tool.questions.flatMap((q, j) =>
      run.answers[i][j].trim() ? [{ label: q.label, text: run.answers[i][j].trim() }] : [],
    );
    return lines.length ? [{ person, lines }] : [];
  });
  const skipped = run.people.filter((p) => !answered.some((a) => a.person.id === p.id));
  function keep() {
    let pageId: string | undefined;
    let title = "";
    onCommit(
      (b) => {
        const before = new Set((b.journal || []).map((e) => e.id));
        const next = keepDay(b, run.id, { trip, place });
        const added = (next.journal || []).find((e) => !before.has(e.id));
        pageId = added ? `journal:${added.id}` : undefined;
        title = added?.title || tool.title;
        return next;
      },
      () =>
        onKept({
          title,
          pageId,
          note: name
            ? `Day ${day} of ${name}. Use the same trip name tomorrow and it becomes Day ${day + 1}.`
            : undefined,
        }),
      "Kept in your journal.",
    );
  }
  return (
    <section className="rt-book ui-card rt-day-card">
      <p className="lb-kicker">{tool.title} · read it back</p>
      <h2 id="rt-title">{text ? "Today, in the car" : "Nobody answered today"}</h2>
      {answered.length ? (
        <div className="rt-day-read">
          {answered.map(({ person, lines }) => (
            <section key={person.id} aria-label={person.name}>
              <h3>{person.name}</h3>
              <dl>
                {lines.map((l) => (
                  <div key={l.label}>
                    <dt>{l.label}</dt>
                    <dd>{l.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <p className="rt-intro">That’s fine. Try again tomorrow, or go back and answer one.</p>
      )}
      {answered.length > 0 && skipped.length > 0 && (
        <p className="lb-fine">
          {skipped.map((p) => p.name).join(", ")} skipped today.
        </p>
      )}
      {text && (
        <div className="rt-day-keep">
          <div className="rt-day-names">
            <label className="rt-field">
              <span className="rt-label">
                Trip name <small>· optional</small>
              </span>
              <input
                value={trip}
                maxLength={SOURCE_NAME_LIMIT}
                placeholder="Summer in Maine"
                onChange={(e) => setTrip(e.target.value)}
              />
            </label>
            <label className="rt-field">
              <span className="rt-label">
                Where are you tonight? <small>· optional</small>
              </span>
              <input
                value={place}
                maxLength={SOURCE_NAME_LIMIT}
                placeholder="Bar Harbor"
                onChange={(e) => setPlace(e.target.value)}
              />
            </label>
          </div>
          <p className="lb-fine">
            {name
              ? `This will be Day ${day} of ${name}.`
              : "Give the trip a name and later days number on: Day 1, Day 2…"}
          </p>
          <button className="lb-primary" disabled={busy} onClick={keep}>
            Keep as a trip page <Check size={16} />
          </button>
          <p className="lb-fine">Kept privately in {book.owner}’s journal, with today’s date.</p>
        </div>
      )}
      <div className="rt-day-foot">
        <button
          className="lb-text"
          disabled={busy}
          onClick={() => onCommit((b) => moveDay(b, run.id, dayTotal(run) - 1))}
        >
          Change an answer
        </button>
        {confirm ? (
          <span className="rt-confirm">
            Set this day aside without keeping it?{" "}
            <button
              className="lb-text"
              disabled={busy}
              onClick={() => onCommit((b) => discardDay(b, run.id), onBack, "Set aside.")}
            >
              Yes, set it aside
            </button>
            <button className="lb-text" onClick={() => setConfirm(false)}>
              Keep it
            </button>
          </span>
        ) : (
          <button className="lb-text" disabled={busy} onClick={() => setConfirm(true)}>
            {text ? "Don’t keep this day" : "Finish without keeping"}
          </button>
        )}
      </div>
    </section>
  );
}
