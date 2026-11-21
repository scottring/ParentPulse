"use client";
import { useState, type RefObject } from "react";
import {
  answerLabels,
  answerSummary,
  answers,
  againPlan,
  checkIn,
  dayOf,
  defaultIntention,
  differsLine,
  featuredLine,
  goalChoices,
  goals,
  invitationsFor,
  isPlaced,
  keepLine,
  lengthLabels,
  lengthWords,
  lengths,
  lookBackPage,
  momentOf,
  movePlace,
  nextLabels,
  nextSteps,
  placeIds,
  places,
  spanLine,
  startPlan,
  todaysAnswer,
  wantedLine,
  type Answer,
  type FamilyPlan,
  type GoalId,
  type NextStep,
  type PlaceId,
  type PlanLength,
} from "@/lib/relish/family-plan";
import "./family-home.css";

type PlanUpdate = (plan: FamilyPlan | undefined) => FamilyPlan | undefined;
export type SharedLine = { text: string; caption?: string };

/**
 * The family plan, featured on Activities in Our family (Scott, 2026-11-21;
 * it led Our family Home before). The three moments in RELISH-DESIGN.md
 * still apply: the small thing to try, the question on return, and their own
 * words on the look-back. Layout changes with width in CSS only, so opening
 * or closing a Duo keeps the moment, the answer and anything half written.
 */
export default function FamilyPlanFeature({
  plan,
  owner,
  names,
  busy,
  headingRef,
  latestShared,
  onPlan,
  onKeep,
  onReflect,
  onFamilyBook,
  preview,
  onClearPreview,
}: {
  plan: FamilyPlan | undefined;
  owner: string;
  /** Who might have said a kept line: the writer first, then the family. */
  names: string[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** The newest passage in Our family journal, for a return visit with nothing kept yet. */
  latestShared?: SharedLine;
  onPlan: (update: PlanUpdate) => Promise<void>;
  /** Adds a passage to Our family journal; resolves to its id. */
  onKeep: (line: { text: string; caption: string }) => Promise<string>;
  /** Adds the look-back to Our family journal as a page. */
  onReflect: (page: { title: string; text: string }) => Promise<void>;
  onFamilyBook: () => void;
  /** A plan card chosen on a shelf: shown here to try, nothing started yet. */
  preview?: { goal: Exclude<GoalId, "own">; place: PlaceId };
  onClearPreview?: () => void;
}) {
  const moment = momentOf(plan);
  return (
    <div className="ha-feature-plan fh">
      {preview || moment === "first" || !plan ? (
        <FirstVisit
          key={preview ? `${preview.goal}:${preview.place}` : "first"}
          busy={busy}
          headingRef={headingRef}
          initialGoal={preview?.goal}
          initialPlace={preview?.place}
          replacing={preview && plan ? plan.goalLabel : undefined}
          onKeepCurrent={onClearPreview}
          onStart={async (next) => {
            await onPlan(() => next);
            onClearPreview?.();
          }}
        />
      ) : moment === "back" ? (
        <ComingBack
          key={plan.id}
          plan={plan}
          names={names}
          busy={busy}
          headingRef={headingRef}
          latestShared={latestShared}
          onPlan={onPlan}
          onKeep={onKeep}
          onFamilyBook={onFamilyBook}
        />
      ) : (
        <LookingBack
          key={plan.id}
          plan={plan}
          owner={owner}
          busy={busy}
          headingRef={headingRef}
          onPlan={onPlan}
          onReflect={onReflect}
          onFinished={() => {}}
        />
      )}
    </div>
  );
}

const art = {
  first: { src: "/illustrations/relish/home-dinner-bowls.webp", w: 850, h: 660 },
  back: { src: "/illustrations/relish/home-dinner-spoons.webp", w: 760, h: 448 },
  lookback: { src: "/illustrations/relish/home-striped-bowl.webp", w: 640, h: 381 },
};
/** Dinner gets its painting; another place or goal stands on its words alone. */
const dinnerArt = (goal: GoalId, place: PlaceId) => isPlaced(goal) && place === "dinner";
function Painting({ which, className }: { which: keyof typeof art; className: string }) {
  const a = art[which];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={a.src} width={a.w} height={a.h} alt="" aria-hidden="true" />
  );
}
function Problem({ text }: { text: string }) {
  return text ? (
    <p className="fh-error" role="alert">
      {text}
    </p>
  ) : null;
}
const message = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

function FirstVisit({
  busy,
  headingRef,
  onStart,
  initialGoal = "hearing",
  initialPlace = "dinner",
  replacing,
  onKeepCurrent,
}: {
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStart: (plan: FamilyPlan) => Promise<void>;
  initialGoal?: GoalId;
  initialPlace?: PlaceId;
  /** What the family is trying now, when this would replace it. */
  replacing?: string;
  onKeepCurrent?: () => void;
}) {
  // Opens on a suggestion already previewed, so a family sees what they'd
  // try before choosing anything (Scott, 2026-11-20). Try this tonight commits.
  const [goal, setGoal] = useState<GoalId>(initialGoal);
  const [pick, setPick] = useState(0);
  const [place, setPlace] = useState<PlaceId>(initialPlace);
  const [days, setDays] = useState<PlanLength>(14);
  const [ownGoal, setOwnGoal] = useState("");
  const [ownThing, setOwnThing] = useState("");
  const [intention, setIntention] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const own = goal === "own";
  const placed = isPlaced(goal);
  const options = own ? [] : invitationsFor(goal, place);
  const invitation = own ? ownThing.trim() : options[pick % options.length];
  const label = own ? ownGoal.trim() : goals[goal].label;
  const words = intention ?? defaultIntention(goal, place);
  const tonight = placed && place !== "car" ? "tonight" : "today";
  const ready = !!label && !!invitation && !saving && !busy;
  async function start() {
    if (!ready) return;
    setSaving(true);
    setError("");
    try {
      await onStart(
        startPlan({ goal, goalLabel: label, invitation, place, days, intention: words }),
      );
    } catch (e) {
      setError(message(e, "This couldn’t be saved. Try again in a moment."));
      setSaving(false);
    }
  }
  return (
    <section className={`fh-first ha-feature ${dinnerArt(goal, place) ? "fh-has-art" : "ha-no-art"}`}>
      <div className="fh-first-words ha-feature-words">
        <p className="ha-quiet">Featured this week · together</p>
        <h1 id="fh-title" ref={headingRef} tabIndex={-1}>
          {own ? "Something to try together, in your own words" : goals[goal].label}
        </h1>
        {own ? (
          <div className="fh-own">
            <label>
              In your words
              <input
                value={ownGoal}
                maxLength={120}
                placeholder="Slower Sunday mornings"
                onChange={(e) => setOwnGoal(e.target.value)}
              />
            </label>
            <label>
              One small thing to try
              <textarea
                id="fh-title-own"
                rows={2}
                maxLength={300}
                value={ownThing}
                placeholder="Pancakes together before anyone looks at a screen."
                onChange={(e) => setOwnThing(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <p className="fh-invite ha-feature-lead" aria-live="polite">
            {invitation}
          </p>
        )}
        <p className="fh-commit ha-feature-small">
          {tonight === "tonight" ? "Try it tonight." : "Start today."} Look back together in{" "}
          {lengthWords(days)}.
        </p>
        {replacing && (
          <p className="ha-quiet">
            You’re trying “{replacing}” now. Starting this one replaces it.{" "}
            {onKeepCurrent && (
              <button type="button" className="ha-link" onClick={onKeepCurrent}>
                Keep what we’re trying
              </button>
            )}
          </p>
        )}
        <div className="fh-actions ha-feature-actions">
          <button type="button" className="ha-btn" disabled={!ready} onClick={() => void start()}>
            {saving ? "Saving…" : tonight === "tonight" ? "Try this tonight" : "Start today"}
          </button>
          <button
            type="button"
            className="ha-link"
            aria-expanded={adjusting}
            aria-controls="fh-adjust"
            onClick={() => setAdjusting((a) => !a)}
          >
            Adjust the plan
          </button>
        </div>
        <Problem text={error} />
        {adjusting && (
          <div className="fh-adjust" id="fh-adjust">
            <label className="fh-field" htmlFor="fh-goal">
              What would you like a little more of in your family?
            </label>
            <select
              id="fh-goal"
              className="fh-select"
              value={goal}
              disabled={saving}
              onChange={(e) => {
                setGoal(e.target.value as GoalId);
                setPick(0);
                setIntention(null);
              }}
            >
              {goalChoices.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
            {placed && (
              <fieldset className="fh-row">
                <legend>Where</legend>
                {placeIds.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="ui-chip"
                    aria-pressed={place === p}
                    onClick={() => {
                      setPlace(p);
                      if (intention === defaultIntention(goal, place)) setIntention(null);
                    }}
                  >
                    {places[p].label}
                  </button>
                ))}
              </fieldset>
            )}
            <fieldset className="fh-row">
              <legend>Look back in</legend>
              {lengths.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="ui-chip"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                >
                  {lengthLabels[d]}
                </button>
              ))}
            </fieldset>
            <label className="fh-field">
              In your words · we’ll show you this when you look back
              <textarea
                rows={2}
                maxLength={300}
                value={words}
                placeholder="We’d like…"
                onChange={(e) => setIntention(e.target.value)}
              />
            </label>
            {options.length > 1 && (
              <button type="button" className="fh-link" onClick={() => setPick((n) => n + 1)}>
                Show me a different small thing
              </button>
            )}
          </div>
        )}
      </div>
      {dinnerArt(goal, place) && <Painting which="first" className="fh-art fh-art-first ha-bowls" />}
    </section>
  );
}

const keepAsk: Record<Answer, string> = {
  helped: "Did anyone say something worth keeping?",
  mixed: "What worked, even a little? Keep a line if someone said one.",
  missed: "That happens. Want to keep anything from this week anyway?",
};

function ComingBack({
  plan,
  names,
  busy,
  headingRef,
  latestShared,
  onPlan,
  onKeep,
  onFamilyBook,
}: {
  plan: FamilyPlan;
  names: string[];
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  latestShared?: SharedLine;
  onPlan: (update: PlanUpdate) => Promise<void>;
  onKeep: (line: { text: string; caption: string }) => Promise<string>;
  onFamilyBook: () => void;
}) {
  const answer = todaysAnswer(plan);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [who, setWho] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [kept, setKept] = useState(false);
  const [stopping, setStopping] = useState(false);
  const day =Math.min(dayOf(plan), plan.days);
  const placed = isPlaced(plan.goal);
  const last = plan.kept.at(-1);
  const remark: SharedLine | undefined = last
    ? { text: last.text, caption: `${last.who} · ${last.at || "at home"}` }
    : latestShared;
  async function answerIt(a: Answer) {
    setError("");
    setOpen(true);
    setKept(false);
    try {
      await onPlan((p) => (p ? checkIn(p, a) : p));
    } catch (e) {
      setError(message(e, "That answer couldn’t be saved. Try again."));
    }
  }
  async function keep() {
    const line = text.trim().replace(/^["“]+|["”]+$/g, "").trim();
    if (!line || !who || saving) return;
    setSaving(true);
    setError("");
    const at = placed ? places[plan.place].at : "";
    try {
      const id = await onKeep({ text: line, caption: at ? `${who} · ${at}` : who });
      await onPlan((p) =>
        p ? keepLine(p, { id, text: line, who, at, date: new Date().toISOString() }) : p,
      );
      setText("");
      setWho("");
      setKept(true);
      setOpen(false);
    } catch (e) {
      setError(message(e, "That line couldn’t be kept. Try again."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className={`fh-back ${dinnerArt(plan.goal, plan.place) ? "fh-has-art" : ""}`}>
      <div className="fh-back-head">
        <div>
          <p className="fh-quiet">
            {plan.goalLabel} · Day {day} of {plan.days}
          </p>
          <h1 id="fh-title" ref={headingRef} tabIndex={-1} className="fh-question">
            {wantedLine(plan)} <em>How did it go?</em>
          </h1>
        </div>
        {dinnerArt(plan.goal, plan.place) && <Painting which="back" className="fh-art fh-art-back" />}
      </div>
      <div className="fh-answers" role="group" aria-label="How did it go?">
        {answers.map((a) => (
          <button
            key={a}
            type="button"
            className="fh-answer"
            aria-pressed={answer === a}
            disabled={busy || saving}
            onClick={() => void answerIt(a)}
          >
            {answerLabels[a]}
          </button>
        ))}
      </div>
      <Problem text={error} />
      {kept && (
        <p className="fh-quiet" role="status">
          Kept in Our family journal.{" "}
          <button type="button" className="fh-link" onClick={() => setOpen(true)}>
            Keep another line
          </button>
        </p>
      )}
      {answer && open && (
        <section className="fh-keep" aria-label="Keep a line">
          <h2>{keepAsk[answer]}</h2>
          <label className="rj-sr-only" htmlFor="fh-line">
            Their words
          </label>
          <textarea
            id="fh-line"
            className="fh-line"
            rows={2}
            maxLength={2000}
            value={text}
            placeholder="“Dad asked what happened next.”"
            onChange={(e) => setText(e.target.value)}
          />
          <fieldset className="fh-row">
            <legend>Who said it?</legend>
            {names.map((n) => (
              <button
                key={n}
                type="button"
                className="ui-chip"
                aria-pressed={who === n}
                onClick={() => setWho(n)}
              >
                {n}
              </button>
            ))}
          </fieldset>
          <div className="fh-actions">
            <button
              type="button"
              className="fh-primary"
              disabled={!text.trim() || !who || saving || busy}
              onClick={() => void keep()}
            >
              {saving ? "Keeping…" : "Keep this"}
            </button>
            <button type="button" className="fh-link" onClick={() => setOpen(false)}>
              Nothing to keep
            </button>
          </div>
          {answer !== "helped" && placed && (
            <p className="fh-quiet fh-elsewhere">
              Or try it somewhere else:{" "}
              {placeIds
                .filter((p) => p !== plan.place)
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="fh-link"
                    disabled={busy}
                    onClick={() => void onPlan((x) => (x ? movePlace(x, p) : x))}
                  >
                    {places[p].label.toLowerCase()}
                  </button>
                ))}
            </p>
          )}
        </section>
      )}
      {remark && (
        <figure className="fh-passage fh-passage-small">
          <blockquote>“{remark.text}”</blockquote>
          {remark.caption && <figcaption>{remark.caption}</figcaption>}
        </figure>
      )}
      <div className="fh-foot">
        <button type="button" className="fh-link" onClick={onFamilyBook}>
          Open family journal
        </button>
        {stopping ? (
          <p className="fh-quiet" role="group" aria-label="Stop trying this?">
            Stop trying this and choose something new? What you kept stays in Our family journal.{" "}
            <button
              type="button"
              className="fh-link"
              disabled={busy}
              onClick={() => void onPlan(() => undefined)}
            >
              Yes, choose something new
            </button>{" "}
            <button type="button" className="fh-link" onClick={() => setStopping(false)}>
              Keep going
            </button>
          </p>
        ) : (
          <p className="fh-quiet">
            You’re trying: {plan.invitation}{" "}
            <button type="button" className="fh-link" disabled={busy} onClick={() => setStopping(true)}>
              Change what we’re trying
            </button>
          </p>
        )}
      </div>
    </section>
  );
}

function LookingBack({
  plan,
  owner,
  busy,
  headingRef,
  onPlan,
  onReflect,
  onFinished,
}: {
  plan: FamilyPlan;
  owner: string;
  busy: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onPlan: (update: PlanUpdate) => Promise<void>;
  onReflect: (page: { title: string; text: string }) => Promise<void>;
  onFinished: () => void;
}) {
  const [helped, setHelped] = useState("");
  const [toBook, setToBook] = useState(true);
  const [saving, setSaving] = useState<NextStep | null>(null);
  const [error, setError] = useState("");
  const { featured, others } = featuredLine(plan, owner);
  const summary = answerSummary(plan);
  async function choose(step: NextStep) {
    if (saving) return;
    setSaving(step);
    setError("");
    try {
      if (toBook) await onReflect(lookBackPage(plan, step, helped));
      await onPlan((p) => (step === "keep" && p ? againPlan(p) : undefined));
      if (step === "finish") onFinished();
    } catch (e) {
      setError(message(e, "This couldn’t be saved. Try again in a moment."));
      setSaving(null);
    }
  }
  return (
    <section className="fh-look">
      <p className="fh-quiet">
        Looking back · {spanLine(plan)} · {lengthWords(plan.days)} of{" "}
        {plan.goalLabel.charAt(0).toLowerCase() + plan.goalLabel.slice(1)}
      </p>
      {plan.intention && <p className="fh-intention">{plan.intention}</p>}
      <h1 id="fh-title" ref={headingRef} tabIndex={-1}>
        {differsLine(plan)}
      </h1>
      {featured ? (
        <figure className={`fh-passage ${dinnerArt(plan.goal, plan.place) ? "fh-has-art" : ""}`}>
          {dinnerArt(plan.goal, plan.place) && <Painting which="lookback" className="fh-art-passage" />}
          <blockquote>“{featured.text}”</blockquote>
          <figcaption>
            {featured.who}
            {featured.at && ` · ${featured.at}`}
          </figcaption>
        </figure>
      ) : summary ? (
        <p className="fh-own-answer">You said {summary}.</p>
      ) : null}
      {others.length > 0 && (
        <ul className="fh-more" aria-label="More of what you kept">
          {others.map((k) => (
            <li key={k.id}>
              <blockquote>“{k.text}”</blockquote>
              <span>
                {k.who}
                {k.at && ` · ${k.at}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      <section className="fh-next" aria-labelledby="fh-next-title">
        <h2 id="fh-next-title">What would you like to do next?</h2>
        <label className="fh-field">
          What helped? · optional
          <textarea
            rows={2}
            maxLength={1000}
            value={helped}
            placeholder="Asking one question back. Doing it in the car on busy nights."
            onChange={(e) => setHelped(e.target.value)}
          />
        </label>
        <div className="fh-next-actions">
          {nextSteps.map((s, i) => (
            <button
              key={s}
              type="button"
              className={i === 0 ? "fh-primary" : "fh-secondary"}
              disabled={busy || !!saving}
              onClick={() => void choose(s)}
            >
              {saving === s ? "Saving…" : nextLabels[s]}
            </button>
          ))}
        </div>
        <label className="fh-check">
          <input type="checkbox" checked={toBook} onChange={(e) => setToBook(e.target.checked)} />
          Keep this look-back in Our family journal
        </label>
        <Problem text={error} />
      </section>
    </section>
  );
}
