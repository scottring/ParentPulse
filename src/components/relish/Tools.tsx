"use client";
import { useState } from "react";
import { ArrowRight, Check, Clock } from "lucide-react";
import type { Book } from "@/lib/relish/model";
import { audienceOf } from "@/lib/relish/profiles";
import {
  activeTrackers,
  builderComplete,
  builderPage,
  finishTracker,
  hasBingo,
  keepToolPage,
  sortPage,
  startTracker,
  stopTracker,
  todayKey,
  toggleMark,
  toolById,
  toolGroups,
  toolsFor,
  trackerProgress,
  type BuilderTool,
  type SortTool,
  type Tool,
  type ToolPage,
  type TrackerTool,
} from "@/lib/relish/tools";
import Illustration from "./Illustration";
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
  onActivities,
  initialId,
  onBack,
}: {
  book: Book;
  busy: boolean;
  onCommit: Commit;
  onPages: () => void;
  onActivities: () => void;
  /** Opens straight into one exercise (from Do something or Home). */
  initialId?: string;
  /** Where "All exercises" goes when opened straight into one. */
  onBack?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(initialId ?? null);
  const [kept, setKept] = useState<string | null>(null);
  const audience = audienceOf(book);
  const available = toolsFor(audience);
  const running = activeTrackers(book);
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
            <p className="lb-kicker">Exercise complete</p>
            <h2 id="rt-title">Page kept</h2>
            <p className="rt-intro">
              “{kept}” is in Your pages. Come back to it, or share it if you
              want to.
            </p>
            <div className="rt-actions">
              <button className="lb-primary" disabled={busy} onClick={onPages}>
                Read your pages <ArrowRight size={16} />
              </button>
              <button
                className="lb-secondary"
                disabled={busy}
                onClick={() => {
                  if (onBack) return onBack();
                  setKept(null);
                  setOpenId(null);
                }}
              >
                Choose another exercise
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
        <p className="lb-kicker">The {book.owner} edition · Exercises</p>
        <h2 id="rt-title">Try an exercise</h2>
        <p className="rt-intro">
          Short, hands-on exercises for something that’s hard right now. Each
          one ends with a page you can keep. Nothing is saved until you keep it.
        </p>
        {!!running.length && (
          <section className="rt-group" aria-label="In progress">
            <h3>In progress</h3>
            <div className="rt-list">
              {running.map((run) => {
                const t = toolById(run.toolId)!;
                const p = trackerProgress(run);
                const person = book.people.find((x) => x.id === run.personId);
                return (
                  <button
                    key={run.id}
                    className="rt-card rt-running"
                    disabled={busy}
                    onClick={() => setOpenId(t.id)}
                  >
                    <span className="lb-kicker">
                      {p.done} of {p.total}
                      {t.kind === "tracker" && t.mode === "days"
                        ? " days"
                        : " marked"}
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
                    <span className="lb-kicker">{t.time}</span>
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
  backLabel,
  onBack,
}: {
  tool: Tool;
  book: Book;
  busy: boolean;
  onCommit: Commit;
  onKept: (title: string) => void;
  backLabel: string;
  onBack: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [who, setWho] = useState("");
  const running =
    tool.kind === "tracker" &&
    activeTrackers(book).some((t) => t.toolId === tool.id);
  const keep: KeepPage = (page) =>
    onCommit(
      (b) => keepToolPage(b, page),
      () => onKept(page.title),
      "Page kept in Your pages.",
    );
  if (!started && !running)
    return (
      <ExerciseStart
        tool={tool}
        book={book}
        busy={busy}
        who={who}
        onWho={setWho}
        backLabel={backLabel}
        onBack={onBack}
        onStart={() =>
          tool.kind === "tracker"
            ? onCommit(
                (b) => startTracker(b, tool.id, who || undefined),
                undefined,
                "Exercise started. Come back each day.",
              )
            : setStarted(true)
        }
      />
    );
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
          <Clock size={18} aria-hidden="true" /> {tool.time} ·{" "}
          {toolGroups.find((g) => g.kind === tool.kind)?.title}
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
        ) : (
          <TrackerRunner
            tool={tool}
            book={book}
            busy={busy}
            onCommit={onCommit}
            onKept={onKept}
            onStopped={onBack}
          />
        )}
      </section>
    </main>
  );
}

function ExerciseStart({
  tool,
  book,
  busy,
  who,
  onWho,
  backLabel,
  onBack,
  onStart,
}: {
  tool: Tool;
  book: Book;
  busy: boolean;
  who: string;
  onWho: (id: string) => void;
  backLabel: string;
  onBack: () => void;
  onStart: () => void;
}) {
  const required = !!tool.aboutPerson?.required;
  const options = [
    ...(required ? [] : [{ id: "", name: "No one in particular" }]),
    ...book.people.map((p) => ({ id: p.id, name: p.name })),
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
            <Clock size={18} aria-hidden="true" /> {tool.time}
          </p>
          <h2 id="rt-title">{tool.title}</h2>
          <p className="rt-start-blurb">{tool.blurb}</p>
          <p className="rt-start-note">
            Keep a page in your book whenever you’re ready.
          </p>
          {required && !book.people.length ? (
            <p className="lb-fine rt-note">
              Add someone to your book first, then come back to this exercise.
            </p>
          ) : (
            book.people.length > 0 && (
              <fieldset className="rt-who">
                <legend>
                  {tool.aboutPerson?.label || "Who is this with?"}
                </legend>
                <div>
                  {options.map((o) => (
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
            disabled={busy || (required && !who)}
            onClick={onStart}
          >
            {tool.kind === "tracker" && tool.mode === "squares"
              ? "Start bingo"
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
  const cards = [...tool.cards(audienceOf(book)), ...extra];
  const sorted = Object.keys(placed).length;
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
      <ul className="rt-sort">
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
        It is saved privately in Your pages. Sharing is a separate choice.
      </p>
    </div>
  );
}

function TrackerRunner({
  tool,
  book,
  busy,
  onCommit,
  onKept,
  onStopped,
}: {
  tool: TrackerTool;
  book: Book;
  busy: boolean;
  onCommit: Commit;
  onKept: (title: string) => void;
  onStopped: () => void;
}) {
  const run = activeTrackers(book).find((t) => t.toolId === tool.id);
  const [note, setNote] = useState("");
  const [confirmStop, setConfirmStop] = useState(false);
  // Started from the exercise's start screen; nothing to show once it stops.
  if (!run) return null;
  const progress = trackerProgress(run);
  const person = book.people.find((p) => p.id === run.personId);
  const today = todayKey();
  const markedToday = run.marks.some((m) => m.key === today);
  return (
    <div className="rt-runner">
      <p className="rt-instruction">
        {person ? `With ${person.name}. ` : ""}
        {tool.instruction}
      </p>
      <p className="rt-progress" aria-live="polite">
        {progress.done} of {progress.total}
        {tool.mode === "days" ? " days" : " marked"}
        {progress.complete
          ? tool.mode === "days"
            ? " · You made it."
            : " · Bingo: a full line."
          : ""}
      </p>
      {tool.mode === "days" ? (
        <>
          <ol className="rt-days" aria-label="Days">
            {Array.from({ length: tool.target }, (_, i) => (
              <li key={i} data-done={i < run.marks.length} />
            ))}
          </ol>
          {!markedToday && tool.notePrompt && (
            <label className="rt-field">
              {tool.notePrompt} <small>· optional</small>
              <input
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          )}
          <button
            className={markedToday ? "lb-secondary" : "lb-primary"}
            aria-pressed={markedToday}
            disabled={busy}
            onClick={() =>
              onCommit(
                (b) => toggleMark(b, run.id, today, note),
                () => setNote(""),
                markedToday ? "Today unmarked." : "Today is marked.",
              )
            }
          >
            {markedToday ? (
              <>
                Done today <Check size={16} />
              </>
            ) : (
              "I did it today"
            )}
          </button>
          {markedToday && (
            <p className="lb-fine">Marked by mistake? Tap again to undo.</p>
          )}
        </>
      ) : (
        <div className="rt-bingo" role="group" aria-label={tool.title}>
          {tool.squares.map((sq, i) => {
            const on = run.marks.some((m) => m.key === String(i));
            return (
              <button
                key={sq}
                aria-pressed={on}
                disabled={busy}
                onClick={() =>
                  onCommit((b) => toggleMark(b, run.id, String(i)))
                }
              >
                {on && <Check size={14} />} {sq}
              </button>
            );
          })}
        </div>
      )}
      {tool.mode === "squares" && hasBingo(run) && (
        <p className="rt-celebrate">Bingo. Those moves work for you.</p>
      )}
      <div className="rt-actions">
        <button
          className={progress.complete ? "lb-primary" : "lb-secondary"}
          disabled={busy || !run.marks.length}
          onClick={() =>
            onCommit(
              (b) => finishTracker(b, run.id),
              () =>
                onKept(person ? `${tool.title} · ${person.name}` : tool.title),
              "Page kept in Your pages.",
            )
          }
        >
          Finish and keep a page
        </button>
        {confirmStop ? (
          <span className="rt-confirm">
            Stop and discard this progress?{" "}
            <button
              className="lb-text"
              disabled={busy}
              onClick={() =>
                onCommit(
                  (b) => stopTracker(b, run.id),
                  onStopped,
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
      </div>
    </div>
  );
}
