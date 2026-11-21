"use client";
import type { Book } from "@/lib/relish/model";
import type { TrackerRun } from "@/lib/relish/tools";
import { markedDays, type DaysTracker } from "@/lib/relish/activities";
import Illustration from "./Illustration";
import ConfirmDelete from "./ConfirmDelete";
import { exerciseIllustration } from "./illustrations";

/** "I did today’s hello": the habit's own word for one day. */
const dayWord: Record<string, string> = {
  hellos: "today’s hello",
  "thanks-week": "today’s thanks",
};
/** "Make one hello or goodbye a day last long enough to land." */
const small = (blurb: string) =>
  blurb
    .replace(/,? for (ten days|a week|\d+ days)\.$/, ".")
    .replace(" a day ", " ");

/**
 * A day-by-day habit that slipped (Scott's "Missed a day" board): no streak
 * lost, just today offered back. Marking today, a reminder later this
 * evening (shown on Home, in the app only) or stopping are the three choices.
 */
export function HabitNudge({
  book,
  run,
  tool,
  reminded = false,
  busy,
  compact = false,
  onMark,
  onRemind,
  onStop,
}: {
  book: Book;
  run: TrackerRun;
  tool: DaysTracker;
  /** It's the evening reminder they asked for, not a missed day. */
  reminded?: boolean;
  busy: boolean;
  /** On Home: a smaller painting beside the words. */
  compact?: boolean;
  onMark: () => void;
  onRemind: () => void;
  onStop: () => void;
}) {
  const person = book.people.find((p) => p.id === run.personId)?.name;
  const days = markedDays(run, tool);
  const next = run.marks.length;
  return (
    <section
      className={`ha-habit ${compact ? "is-compact" : ""}`}
      aria-label={`${tool.title}${person ? ` with ${person}` : ""}`}
    >
      <Illustration
        name={exerciseIllustration[tool.id] ?? "do-something"}
        size={compact ? 120 : 180}
        className="ha-habit-art"
      />
      <div className="ha-habit-words">
        <p className="ha-quiet">
          {tool.title}
          {person && ` · ${person}`} · {run.marks.length} of {tool.target}
        </p>
        <h2 className="ha-habit-title">
          {reminded ? "You asked to be reminded tonight." : "Yesterday slipped by. Today’s still yours."}
        </h2>
        <ol className="ha-habit-days" aria-label={`${run.marks.length} of ${tool.target} days marked`}>
          {days.map((on, i) => (
            <li
              key={i}
              className={on ? "is-on" : i === next ? "is-today" : ""}
              aria-label={on ? `Day ${i + 1}, marked` : i === next ? `Day ${i + 1}, today` : `Day ${i + 1}`}
            >
              {i + 1}
            </li>
          ))}
        </ol>
        <p className="ha-habit-line">
          {small(tool.blurb)} A missed day doesn’t reset anything.
        </p>
        <div className="ha-habit-actions">
          <button type="button" className="ha-btn" disabled={busy} onClick={onMark}>
            I did {dayWord[tool.id] ?? "it today"}
          </button>
          <div className="ha-habit-more">
            {!reminded && (
              <button type="button" className="ha-ghost" disabled={busy} onClick={onRemind}>
                Remind me tonight
              </button>
            )}
            <ConfirmDelete
              label="Stop this one"
              icon={false}
              ariaLabel={`Stop ${tool.title}`}
              question="Stop this one?"
              detail="Its marks are let go. This can’t be undone."
              yes="Yes, stop it"
              busy={busy}
              className="ha-ghost"
              onConfirm={onStop}
            />
          </div>
        </div>
        {!reminded && (
          <p className="ha-quiet ha-habit-fine">
            “Remind me tonight” shows this on Home this evening. Nothing is sent to anyone.
          </p>
        )}
      </div>
    </section>
  );
}
