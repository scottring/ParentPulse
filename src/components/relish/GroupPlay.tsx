"use client";
import { useEffect, useRef, useState } from "react";
import { Hand, Check, ArrowRight } from "lucide-react";
import { ageLabels } from "@/lib/relish/profiles";
import type { Book } from "@/lib/relish/model";
import {
  type Game,
  type GameAction,
  type Turn,
  gamePlayer,
  gameText,
  livingOf,
  samePageResult,
  samePageSummary,
  samePageTrend,
  pickAgreement,
  turnPlan,
} from "@/lib/relish/living";

const titles: Record<Game["kind"], string> = {
  joy: "Guess my small joy",
  match: "Same page?",
  story: "One story, many voices",
};
const list = (items: string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
/** Rounds from contentVersion 2 keep their answers in the book. */
const remembers = (g: Game) => g.contentVersion === 2;

export default function GroupPlay({
  book,
  game,
  busy,
  onAction,
  onKeep,
  onPause,
  onFinish,
  onCancel,
}: {
  book: Book;
  /** Players and the game are chosen in Do something's game sheet. */
  game: Game;
  busy: boolean;
  onAction: (action: GameAction) => void;
  onKeep: () => void;
  onPause: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const [firstPlayer, setFirstPlayer] = useState(game.players[0].id);
  const g = game,
    plan = turnPlan(g),
    total = plan.length,
    title = titles[g.kind],
    text = gameText(g),
    finished = ["reveal", "kept", "finished"].includes(g.stage),
    living = livingOf(book);
  const next = gamePlayer(g);
  const many = (plan[0]?.asks.length || 1) > 1;
  return (
    <section className="lb-game" aria-label="Our game">
      {!finished && (
        <div className="lb-session-line">
          <div>
            <p className="lb-kicker">One round</p>
            <p>{`Turn ${Math.min(g.turn + 1, total)} of ${total} · then reveal together`}</p>
          </div>
          <button className="lb-text" disabled={busy} onClick={onPause}>
            Pause here
          </button>
        </div>
      )}
      {g.audience && (
        <p className="lb-fine">
          {ageLabels[g.audience]} · chosen for this round
        </p>
      )}
      {g.stage === "ready" ? (
        <>
          <h2>{title}</h2>
          <p>
            {g.kind === "joy"
              ? "One person chooses a joy in private. Pass the device so everyone else can guess. All choices are revealed together."
              : g.kind === "match"
                ? many
                  ? `${plan[0].asks.length} quick questions. On your turn, answer all of them in private, then pass the device. Then see where you match.`
                  : "Everyone answers the same question in private. Pass the device between turns. All answers are revealed together."
                : "Pass the device around. Each person adds to the same story. Anyone can pass."}
          </p>
          <div className="lb-boundary">
            <strong>
              {g.kind === "match"
                ? many
                  ? "About 5–10 minutes"
                  : "About 3–5 minutes"
                : g.kind === "joy"
                  ? "About 5 minutes"
                  : "About 5–10 minutes"}
            </strong>
            <p>
              {total} turns, then everyone sees the answers together. Passing
              is always fine.
            </p>
            {remembers(g) && (
              <p>
                Relish remembers this round’s answers in {book.owner}’s book
                {g.kind === "match"
                  ? " so you can see how you match over time"
                  : ""}
                . They’re never sent to AI.
              </p>
            )}
          </div>
          {g.kind === "match" && samePageTrend(living, g) && (
            <p className="lb-trend">{samePageTrend(living, g)}</p>
          )}
          <ol className="lb-turns">
            {g.players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ol>
          <label>
            {g.kind === "joy"
              ? "Who chooses a joy this round?"
              : g.kind === "match"
                ? "Who answers first?"
                : "Who starts the story?"}
            <select
              value={firstPlayer || g.players[0].id}
              onChange={(e) => setFirstPlayer(e.target.value)}
            >
              {g.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="lb-actions">
            <button
              className="lb-primary"
              disabled={busy}
              onClick={() =>
                onAction({
                  type: "start",
                  firstId: firstPlayer || g.players[0].id,
                })
              }
            >
              Let’s play <ArrowRight size={16} />
            </button>
            <button className="lb-text" disabled={busy} onClick={onCancel}>
              Change group or game
            </button>
          </div>
        </>
      ) : g.stage === "handoff" ? (
        <div className="lb-handoff">
          <Hand size={30} />
          <p className="lb-kicker">Pass the device</p>
          <h2>Over to {next.name}.</h2>
          <p>
            {g.kind === "story"
              ? "Add the next part of the story, or pass."
              : g.kind === "joy"
                ? `Guess what ${g.players[0].name} picked, or pass. The answers so far stay hidden.`
                : many
                  ? `Answer all ${plan[g.turn].asks.length} without looking at anyone else’s. Pass any you like. The answers so far stay hidden.`
                  : "Answer without looking at anyone else’s, or pass. The answers so far stay hidden."}
          </p>
          <button
            className="lb-primary"
            disabled={busy}
            onClick={() => onAction({ type: "ready" })}
          >
            I’m {next.name} · ready
          </button>
        </div>
      ) : g.stage === "choose" && plan[g.turn] ? (
        <TurnPanel
          key={`${g.id}:${g.turn}`}
          turn={plan[g.turn]}
          busy={busy}
          onAction={onAction}
          storySoFar={g.kind === "story" ? text : ""}
        />
      ) : (
        <>
          {g.kind === "match" ? (
            <SamePageReveal game={g} trend={samePageTrend(living, g, true)} />
          ) : (
            <>
              <p className="lb-kicker">
                {g.kind === "story" ? "Your shared story" : "The reveal"}
              </p>
              <h2>
                {text
                  ? g.kind === "story"
                    ? "Your story"
                    : "Here’s what everyone chose"
                  : "Everyone passed"}
              </h2>
              {g.kind === "joy" && text ? (
                <JoyRevealV1 game={g} />
              ) : text ? (
                <blockquote>{text}</blockquote>
              ) : (
                <p>No answers to show this time. That’s fine too.</p>
              )}
            </>
          )}
          <div className="lb-boundary">
            <p>
              That’s the round. Finish for now ends it here.{" "}
              {remembers(g)
                ? `Its answers stay with this round in ${book.owner}’s book.`
                : "Your book notes that you played, without anyone’s answers."}
            </p>
            <button className="lb-primary" disabled={busy} onClick={onFinish}>
              Finish for now <Check size={16} />
            </button>
          </div>
          {g.savedPageId ? (
            <p className="lb-fine">A page was kept with everyone’s approval.</p>
          ) : (
            text && (
              <details className="lb-sharing">
                <summary>Also keep these words as a shared page · optional</summary>
                <p>
                  Each player approves these exact words. They’ll be kept as a
                  shared page in {book.owner}’s book. Anyone can say no.
                </p>
                <blockquote>{text}</blockquote>
                <div className="lb-players">
                  {g.players.map((p, i) => (
                    <button
                      key={p.id}
                      disabled={busy}
                      aria-pressed={g.approvals[i]}
                      onClick={() =>
                        onAction({ type: "approve", playerId: p.id })
                      }
                    >
                      {p.name} {g.approvals[i] ? "approved ✓" : "approves"}
                    </button>
                  ))}
                </div>
                <p className="lb-fine">
                  {g.approvals.filter(Boolean).length} of {g.players.length}{" "}
                  approved.
                </p>
                <button
                  className="lb-secondary"
                  disabled={busy || !g.approvals.every(Boolean)}
                  onClick={onKeep}
                >
                  Keep in our Family pages
                </button>
              </details>
            )
          )}
        </>
      )}
    </section>
  );
}

/**
 * One player's turn. A turn with several questions shows them one at a time;
 * the answers are sent together at the end, so nothing is saved half-done.
 */
function TurnPanel({
  turn,
  busy,
  onAction,
  storySoFar,
}: {
  turn: Turn;
  busy: boolean;
  onAction: (action: GameAction) => void;
  storySoFar: string;
}) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const many = turn.asks.length > 1;
  const ask = turn.asks[step];
  useEffect(() => {
    if (step > 0) heading.current?.focus();
  }, [step]);
  function answer(choice: number | null) {
    const answers = [...picked.slice(0, step), choice];
    if (step + 1 < turn.asks.length) {
      setPicked(answers);
      setStep(step + 1);
      return;
    }
    onAction(
      many ? { type: "answer", answers } : { type: "choice", choice },
    );
  }
  return (
    <>
      <p className="lb-kicker">
        {turn.player.name}’s turn
        {many ? ` · question ${step + 1} of ${turn.asks.length}` : ""}
      </p>
      <h2 ref={heading} tabIndex={-1}>
        {ask.prompt}
      </h2>
      {storySoFar && <p className="lb-story-so-far">So far: {storySoFar}</p>}
      <div className="lb-choices">
        {ask.choices.map((choice, index) => (
          <button
            key={choice}
            disabled={busy}
            aria-pressed={picked[step] === index}
            onClick={() => answer(index)}
          >
            {choice}
          </button>
        ))}
      </div>
      <div className="lb-turn-foot">
        {many && step > 0 && (
          <button
            className="lb-text"
            disabled={busy}
            onClick={() => setStep(step - 1)}
          >
            Back to question {step}
          </button>
        )}
        <button
          className="lb-text"
          disabled={busy}
          onClick={() => answer(null)}
        >
          {many ? "Pass this one" : "Pass my turn"}
        </button>
      </div>
    </>
  );
}

function SamePageReveal({ game: g, trend }: { game: Game; trend: string }) {
  const r = samePageResult(g);
  if (r.lines.length === 1) {
    const [line] = r.lines;
    return (
      <>
        <p className="lb-kicker">The reveal</p>
        <h2>{line.answered ? "Here’s what everyone chose" : "Everyone passed"}</h2>
        <p className="lb-story-so-far">{line.question.prompt}</p>
        <div className="lb-reveal">
          {g.players.map((p, i) => (
            <div key={p.id}>
              <span className="lb-kicker">
                {p.name} {line.picks[i] === null ? "passed" : "chose"}
              </span>
              <p>
                {line.picks[i] === null
                  ? "No answer"
                  : line.question.choices[line.picks[i]!]}
              </p>
            </div>
          ))}
        </div>
        {pickAgreement(line.question.choices, line.picks) && (
          <p className="lb-same-page">
            {pickAgreement(line.question.choices, line.picks)}
          </p>
        )}
      </>
    );
  }
  return (
    <>
      <p className="lb-kicker">The reveal</p>
      <h2>{samePageSummary(g) || "Not enough answers to compare"}</h2>
      {r.differ.length > 0 && (
        <p className="lb-same-page">Different on {list(r.differ)}.</p>
      )}
      {trend && <p className="lb-trend">{trend}</p>}
      <ol className="lb-sp-list">
        {r.lines.map((line) => (
          <li
            key={line.question.id}
            className={line.answered < 2 ? "" : line.same ? "is-same" : "is-different"}
          >
            <span className="lb-sp-mark">
              {line.answered < 2
                ? "Too few answers"
                : line.same
                  ? "Same page ✓"
                  : "Different"}
            </span>
            <p className="lb-sp-prompt">{line.question.prompt}</p>
            <ul className="lb-sp-picks">
              {g.players.map((p, i) => (
                <li key={p.id}>
                  <span>{p.name}</span>{" "}
                  {line.picks[i] === null ? (
                    <em>passed</em>
                  ) : (
                    <strong>{line.question.choices[line.picks[i]!]}</strong>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Older one-chooser rounds: the chooser's pick and everyone's guess. */
function JoyRevealV1({ game: g }: { game: Game }) {
  const plan = turnPlan(g);
  const options = plan[0].asks[0].choices;
  return (
    <div className="lb-reveal">
      {g.players.map((p, i) => (
        <div key={p.id}>
          <span className="lb-kicker">
            {p.name}{" "}
            {i === 0 ? "chose" : g.choices[i] === null ? "passed" : "guessed"}
          </span>
          <p>
            {g.choices[i] === null || g.choices[i] === undefined
              ? "No guess needed"
              : options[g.choices[i]!]}
          </p>
        </div>
      ))}
    </div>
  );
}
