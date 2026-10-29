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
      title: "Begin with someone.",
      detail:
        "One person. One relationship you’d like to understand a little better.",
      button: "Add your first person",
      time: "ABOUT A MINUTE",
    },
    notice: {
      title: book.moments.length
        ? "What stayed with you today?"
        : "Start with one real moment.",
      detail:
        "A kind exchange, a difficult minute, or something you’re still wondering about.",
      button: "Keep a moment",
      time: "2 MINUTES",
    },
    reflect: {
      title: `Pick up the thread${who ? ` with ${who}` : ""}.`,
      detail:
        "You had something small to try. If you’ve had a chance, come back to what happened.",
      button: "How did it go?",
      time: "2 MINUTES",
    },
    review: {
      title: "A little time to look back.",
      detail:
        "Gather this week’s moments. Keep one thing you want to carry forward.",
      button: "Begin your weekly reflection",
      time: "5 MINUTES",
    },
    enough: {
      title: "A little attention, already given.",
      detail:
        "You’ve met your intention for the week. Let what you’re learning find its way into life.",
      button: rhythm.review ? "Keep another moment" : "Look back on your week",
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
          A LITTLE,
          <br />
          OFTEN.
        </span>
      </div>
      <div className="r-strip-copy">
        <p className="r-eyebrow">
          YOUR NEXT LITTLE STEP <span>· {step.time}</span>
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
        <span className="r-eyebrow">YOUR GENTLE RHYTHM</span>
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
          Find your rhythm <ArrowUpRight size={13} />
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
          <p className="r-eyebrow">THE ART OF PAYING ATTENTION</p>
          <h1>
            Small rituals.
            <br />
            <em>A little closer.</em>
          </h1>
          <p>
            A few minutes to notice. A little courage to try.
            <br />A quiet return to what you’re learning.
          </p>
        </div>
        <div className="r-rhythm-still-life">
          <Pebbles animate />
          <span>
            ONE SMALL THING
            <br />
            ON TOP OF ANOTHER.
          </span>
        </div>
      </div>
      <section className="r-next-invitation">
        <div>
          <span className="r-eyebrow">A GOOD PLACE TO BEGIN · {step.time}</span>
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
          <p className="r-eyebrow">A PRACTICE THAT FITS A LIFE</p>
          <h2>Here’s how your book grows.</h2>
        </div>
        <span className="r-small">Each part has its own pace.</span>
      </div>
      <div className="r-practice-track">
        <article>
          <div className="r-practice-number">
            <span>01</span>
            <Feather size={20} />
          </div>
          <p className="r-eyebrow">NOTICE</p>
          <h3>Keep a little of life.</h3>
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
            Keep a moment <ArrowRight size={14} />
          </button>
        </article>
        <article>
          <div className="r-practice-number">
            <span>02</span>
            <Footprints size={21} />
          </div>
          <p className="r-eyebrow">TRY & RETURN</p>
          <h3>Let life answer.</h3>
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
            {awaiting ? "Return to a moment" : "Begin with a moment"}{" "}
            <ArrowRight size={14} />
          </button>
        </article>
        <article>
          <div className="r-practice-number">
            <span>03</span>
            <Sun size={21} />
          </div>
          <p className="r-eyebrow">LOOK BACK</p>
          <h3>Gather what matters.</h3>
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
          <p className="r-eyebrow">YOUR LIFE SETS THE PACE</p>
          <h2>
            Find your <br />
            <em>kind of often.</em>
          </h2>
          <p>
            These are gentle intentions. A missed day creates no backlog, and a
            single honest sentence counts.
          </p>
          <div className="r-review-date">
            <CalendarDays size={17} />
            <span>
              {step.review ? "Next weekly pause" : "Your weekly pause"}
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
          <h3>Just enough to remember.</h3>
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
            <h2>The weeks you’ve gathered.</h2>
            <span className="r-eyebrow">A SMALL HISTORY OF UNDERSTANDING</span>
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
                      <span className="r-eyebrow">CARRYING FORWARD</span>
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
          setError("Your rhythm could not be saved. Please try again.");
        }
      }}
    >
      <fieldset className="r-pace-choices">
        <legend>A comfortable pace</legend>
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
        A day to look back
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
        {busy ? "Keeping your rhythm…" : "Keep this rhythm"} <Check size={16} />
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
        <p className="r-eyebrow">YOUR WEEKLY PAUSE · ABOUT 5 MINUTES</p>
        <Pebbles small />
      </div>
      <h2>
        A week of little things.
        <br />
        <em>What will you keep?</em>
      </h2>
      <p className="r-form-intro">
        Week of{" "}
        {state.start.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
        })}
        . Read a little. Notice what connects. One useful thought is enough.
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
            A quiet week is welcome here, too. Reflect on a conversation or
            something you noticed outside the book.
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
          ? "Gathering your week…"
          : state.review
            ? "Update this week’s reflection"
            : "Keep this week’s reflection"}{" "}
        <Check size={16} />
      </button>
    </form>
  );
}
