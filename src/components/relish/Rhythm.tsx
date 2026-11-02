"use client";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Feather,
  Footprints,
  Sun,
  CalendarDays,
  Clock3,
  BookOpen,
} from "lucide-react";
import type { Book, RhythmSettings, WeeklyReview } from "@/lib/relish/model";
import { DAYS, PACES, getRhythm, DEFAULT_RHYTHM } from "@/lib/relish/rhythm";
import { Pebbles } from "./Sensory";

type Actions = {
  onNotice: () => void;
  onReflect: (id: string) => void;
  onReview: () => void;
  onPerson: () => void;
};
function nextStep(book: Book, now: Date) {
  const rhythm = getRhythm(book, now);
  const who = book.people.find(
    (p) => p.id === rhythm.waiting[0]?.personId,
  )?.name;
  const copy = {
    person: {
      title: "Add a person",
      detail:
        "Add someone to write reflections and notes about your relationship.",
      button: "Add your first person",
      time: "ABOUT A MINUTE",
    },
    notice: {
      title: book.moments.length
        ? "What stayed with you today?"
        : "Write a reflection",
      detail:
        "A kind exchange, a difficult minute, or something you’re still wondering about.",
      button: "Save a reflection",
      time: "2 MINUTES",
    },
    reflect: {
      title: `Review your practice${who ? ` with ${who}` : ""}`,
      detail:
        "You had something small to try. If you’ve had a chance, come back to what happened.",
      button: "How did it go?",
      time: "2 MINUTES",
    },
    review: {
      title: "Review this week",
      detail:
        "Read this week’s reflections and choose a next step.",
      button: "Begin your weekly reflection",
      time: "5 MINUTES",
    },
    enough: {
      title: "Weekly target reached",
      detail:
        "You’ve saved your target number of reflections this week.",
      button: rhythm.review ? "Write another reflection" : "Look back on your week",
      time: "AT YOUR PACE",
    },
  }[rhythm.next];
  return { ...rhythm, ...copy };
}
function takeNext(book: Book, now: Date, actions: Actions) {
  const state = getRhythm(book, now);
  if (state.next === "person") actions.onPerson();
  else if (state.next === "reflect") actions.onReflect(state.waiting[0].id);
  else if (
    state.next === "review" ||
    (state.next === "enough" && !state.review)
  )
    actions.onReview();
  else actions.onNotice();
}
export function RhythmStrip({
  book,
  now,
  onOpen,
  ...actions
}: { book: Book; now: Date; onOpen: () => void } & Actions) {
  const step = nextStep(book, now);
  return (
    <section className="r-rhythm-strip" aria-label="Your next step">
      <div className="r-strip-symbol">
        <Pebbles small />
        <span>
          WEEKLY PLAN
        </span>
      </div>
      <div className="r-strip-copy">
        <p className="r-eyebrow">
          SUGGESTED NEXT STEP <span>· {step.time}</span>
        </p>
        <h2>{step.title}</h2>
        <p>{step.detail}</p>
        <button
          className="r-text-button"
          onClick={() => takeNext(book, now, actions)}
        >
          {step.button} <ArrowRight size={15} />
        </button>
      </div>
      <button className="r-week-glance" onClick={onOpen}>
        <span className="r-eyebrow">WEEKLY TARGET</span>
        <span className="r-progress-pebbles" aria-hidden="true">
          {Array.from({ length: step.settings.target }, (_, i) => (
            <i
              key={i}
              className={i < step.current.length ? "r-pebble-filled" : ""}
            />
          ))}
        </span>
        <span>
          {step.current.length} of {step.settings.target} moments this week
        </span>
        <small>
          Set weekly target <ArrowUpRight size={13} />
        </small>
      </button>
    </section>
  );
}
export function RhythmPage({
  book,
  now,
  busy,
  onSettings,
  ...actions
}: {
  book: Book;
  now: Date;
  busy: boolean;
  onSettings: (settings: RhythmSettings) => Promise<void>;
} & Actions) {
  const step = nextStep(book, now);
  const reviewLabel = step.reviewDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const awaiting = step.waiting[0];
  return (
    <div className="r-rhythm-page">
      <div className="r-rhythm-heading">
        <div>
          <p className="r-eyebrow">REFLECTION SCHEDULE</p>
          <h1>Your reflection schedule</h1>
          <p>
            Write about an experience, try an action, and review the result.
            <br />Choose how often you want to reflect.
          </p>
        </div>
        <div className="r-rhythm-still-life">
          <Pebbles animate />
          <span>
            YOUR PROGRESS
          </span>
        </div>
      </div>
      <section className="r-next-invitation">
        <div>
          <span className="r-eyebrow">SUGGESTED NEXT STEP · {step.time}</span>
          <h2>{step.title}</h2>
          <p>{step.detail}</p>
        </div>
        <button
          className="r-primary"
          onClick={() => takeNext(book, now, actions)}
        >
          {step.button} <ArrowUpRight size={16} />
        </button>
      </section>
      <div className="r-section-title r-rhythm-section-title">
        <div>
          <p className="r-eyebrow">HOW IT WORKS</p>
          <h2>Three steps</h2>
        </div>
        <span className="r-small">Complete each step in a separate session.</span>
      </div>
      <div className="r-practice-track">
        <article>
          <div className="r-practice-number">
            <span>01</span>
            <Feather size={20} />
          </div>
          <p className="r-eyebrow">NOTICE</p>
          <h3>Write about an experience</h3>
          <p>
            Write one thing that happened with someone. A sentence or two is
            enough. Add a possible perspective and a next move if they come to
            you.
          </p>
          <div className="r-practice-cadence">
            <Clock3 size={13} /> 2 minutes · {step.settings.target}{" "}
            {step.settings.target === 1 ? "time" : "times"} a week
          </div>
          <button className="r-text-button" onClick={actions.onNotice}>
            Save a reflection <ArrowRight size={14} />
          </button>
        </article>
        <article>
          <div className="r-practice-number">
            <span>02</span>
            <Footprints size={21} />
          </div>
          <p className="r-eyebrow">TRY & RETURN</p>
          <h3>Try your plan and record the result</h3>
          <p>
            Try the small move you chose. After a day or two, return to the
            moment and describe what you noticed. Keep a useful insight in their
            manual.
          </p>
          <div className="r-practice-cadence">
            <Clock3 size={13} /> 2 minutes · after you’ve tried it
          </div>
          <button
            className="r-text-button"
            onClick={() =>
              awaiting ? actions.onReflect(awaiting.id) : actions.onNotice()
            }
          >
            {awaiting ? "Review your plan" : "Write a reflection"}{" "}
            <ArrowRight size={14} />
          </button>
        </article>
        <article>
          <div className="r-practice-number">
            <span>03</span>
            <Sun size={21} />
          </div>
          <p className="r-eyebrow">LOOK BACK</p>
          <h3>Review the week</h3>
          <p>
            Once a week, read your moments together. What helped? What keeps
            showing up? Choose one thing to carry into the week ahead.
          </p>
          <div className="r-practice-cadence">
            <CalendarDays size={13} /> 5 minutes ·{" "}
            {DAYS[step.settings.reviewDay]}s
          </div>
          <button className="r-text-button" onClick={actions.onReview}>
            {step.review
              ? "Revisit this week’s reflection"
              : "Open your weekly reflection"}{" "}
            <ArrowRight size={14} />
          </button>
        </article>
      </div>
      <section className="r-rhythm-custom">
        <div>
          <p className="r-eyebrow">SCHEDULE SETTINGS</p>
          <h2>Set your schedule</h2>
          <p>
            Set a weekly reflection target and a review day. Missed days do not add extra tasks.
          </p>
          <div className="r-review-date">
            <CalendarDays size={17} />
            <span>
              {step.review ? "Next weekly review" : "Weekly review"}
              <strong>{reviewLabel}</strong>
            </span>
            {step.review && <Check size={17} />}
          </div>
          <p className="r-timing-note">
            Guidance appears here when you open your book. No background
            reminders are sent.
          </p>
        </div>
        <RhythmPreferences
          key={`${book.rhythm?.target}-${book.rhythm?.reviewDay}`}
          settings={book.rhythm ?? DEFAULT_RHYTHM}
          busy={busy}
          onSave={onSettings}
        />
      </section>
      <section className="r-entry-guide">
        <BookOpen size={22} />
        <div>
          <p className="r-eyebrow">WHAT DO I NEED TO WRITE?</p>
          <h3>Required and optional fields</h3>
          <p>
            A moment needs a person and a few words about what happened. Your
            interpretation and next move are optional. When you return, one
            honest observation is enough. The manual grows from the insights you
            choose to keep.
          </p>
        </div>
      </section>
      {!!book.reviews?.length && (
        <section className="r-review-archive">
          <div className="r-section-title">
            <h2>Previous weekly reviews</h2>
            <span className="r-eyebrow">SAVED REVIEWS</span>
          </div>
          {[...book.reviews]
            .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
            .map((review) => (
              <details key={review.id}>
                <summary>
                  <span>
                    Week of{" "}
                    {new Date(
                      `${review.weekStart}T12:00:00`,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span>
                    Open reflection <ArrowUpRight size={14} />
                  </span>
                </summary>
                <div>
                  <p>{review.reflection}</p>
                  {review.next && (
                    <>
                      <span className="r-eyebrow">NEXT WEEK’S PLAN</span>
                      <p>{review.next}</p>
                    </>
                  )}
                </div>
              </details>
            ))}
        </section>
      )}
    </div>
  );
}
function RhythmPreferences({
  settings,
  busy,
  onSave,
}: {
  settings: RhythmSettings;
  busy: boolean;
  onSave: (settings: RhythmSettings) => Promise<void>;
}) {
  const [target, setTarget] = useState(settings.target),
    [day, setDay] = useState(settings.reviewDay),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave({ target, reviewDay: day });
          setError("");
        } catch {
          setError("Your schedule could not be saved. Please try again.");
        }
      }}
    >
      <fieldset className="r-pace-choices">
        <legend>Reflections per week</legend>
        {PACES.map((pace) => (
          <label
            key={pace.target}
            className={target === pace.target ? "r-pace-selected" : ""}
          >
            <input
              type="radio"
              name="pace"
              value={pace.target}
              checked={target === pace.target}
              onChange={() => setTarget(pace.target)}
            />
            <span className="r-pace-stones" aria-hidden="true">
              {Array.from({ length: pace.target }, (_, i) => (
                <i key={i} />
              ))}
            </span>
            <span>
              <strong>{pace.name}</strong>
              <small>{pace.description}</small>
            </span>
            <Check size={16} />
          </label>
        ))}
      </fieldset>
      <label className="r-review-day">
        Weekly review day
        <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {DAYS.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="r-error">
          {error}
        </p>
      )}
      <button
        className="r-primary"
        disabled={
          busy || (target === settings.target && day === settings.reviewDay)
        }
      >
        {busy ? "Saving schedule…" : "Save schedule"} <Check size={16} />
      </button>
    </form>
  );
}
export function WeeklyReflection({
  book,
  now,
  busy,
  onSave,
}: {
  book: Book;
  now: Date;
  busy: boolean;
  onSave: (review: WeeklyReview) => Promise<void>;
}) {
  const state = getRhythm(book, now);
  const [reflection, setReflection] = useState(state.review?.reflection ?? ""),
    [next, setNext] = useState(state.review?.next ?? ""),
    [error, setError] = useState("");
  return (
    <form
      className="r-form r-weekly-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave({
            id: state.review?.id ?? crypto.randomUUID(),
            weekStart: state.key,
            reflection: reflection.trim(),
            next: next.trim(),
            createdAt: new Date().toISOString(),
          });
        } catch {
          setError(
            "Your reflection could not be saved. Your writing is still here.",
          );
        }
      }}
    >
      <div className="r-weekly-top">
        <p className="r-eyebrow">WEEKLY REVIEW · ABOUT 5 MINUTES</p>
        <Pebbles small />
      </div>
      <h2>Weekly review</h2>
      <p className="r-form-intro">
        Week of{" "}
        {state.start.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })}
        . Review the entries below, then write what you learned and one next step.
      </p>
      <div className="r-week-recap">
        <span className="r-eyebrow">
          {state.current.length}{" "}
          {state.current.length === 1 ? "MOMENT" : "MOMENTS"} KEPT THIS WEEK
        </span>
        {state.current.length ? (
          state.current.map((moment) => (
            <details key={moment.id}>
              <summary>
                {book.people.find((p) => p.id === moment.personId)?.name ??
                  "A relationship"}
                <span>
                  {moment.completedAt ? "Reflected" : "Kept"}{" "}
                  <ArrowUpRight size={13} />
                </span>
              </summary>
              <p>{moment.observation}</p>
              {moment.reflection && (
                <p className="r-recap-reflection">
                  What you noticed: {moment.reflection}
                </p>
              )}
            </details>
          ))
        ) : (
          <p>
            No reflections saved this week. You can still write about a conversation or experience below.
          </p>
        )}
      </div>
      <label>
        What are you coming to understand?
        <textarea
          required
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          maxLength={8000}
          rows={4}
          placeholder="What helped us connect? What would I like to understand better?"
        />
      </label>
      <label>
        One thing to carry into next week <span>optional</span>
        <textarea
          value={next}
          onChange={(e) => setNext(e.target.value)}
          maxLength={3000}
          rows={2}
          placeholder="A question to ask. A small practice to keep."
        />
      </label>
      {error && (
        <p className="r-error" role="alert">
          {error}
        </p>
      )}
      <button className="r-primary" disabled={busy || !reflection.trim()}>
        {busy
          ? "Saving review…"
          : state.review
            ? "Update this week’s reflection"
            : "Save weekly review"}{" "}
        <Check size={16} />
      </button>
    </form>
  );
}
