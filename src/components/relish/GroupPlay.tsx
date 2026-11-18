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
  joyResult,
  joySummary,
  livingOf,
  samePageResult,
  samePageSummary,
  samePageTrend,
  pickAgreement,
  REFLECTION_LIMIT,
  storyLines,
  storyTitles,
  TITLE_LIMIT,
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
  /** Whose turn it is to add a line about the round, once it's revealed. */
  const [reflecting, setReflecting] = useState<number | null>(null);
  const g = game,
    plan = turnPlan(g),
    total = plan.length,
    title = titles[g.kind],
    text = gameText(g),
    finished = ["reveal", "kept", "finished"].includes(g.stage),
    living = livingOf(book);
  const next = gamePlayer(g);
  const many = (plan[0]?.asks.length || 1) > 1;
  /** A joy round where everyone picks, then everyone guesses. */
  const everyone = g.kind === "joy" && remembers(g);
  const guessing = everyone && g.turn >= g.players.length;
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
            {everyone
              ? "First, everyone picks a small joy in private. Then each person guesses everyone else’s. See who knows whom best."
              : g.kind === "joy"
              ? "One person chooses a joy in private. Pass the device so everyone else can guess. All choices are revealed together."
              : g.kind === "match"
                ? many
                  ? `${plan[0].asks.length} quick questions. On your turn, answer all of them in private, then pass the device. Then see where you match.`
                  : "Everyone answers the same question in private. Pass the device between turns. All answers are revealed together."
                : remembers(g)
                  ? "Pass the device around. Each person picks what happens next in the same story; anyone can pass. At the end, read it back and give it a title together."
                  : "Pass the device around. Each person adds to the same story. Anyone can pass."}
          </p>
          <div className="lb-boundary">
            <strong>
              {g.kind === "match"
                ? many
                  ? "About 5–10 minutes"
                  : "About 3–5 minutes"
                : g.kind === "joy" && !everyone
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
                  : g.kind === "joy"
                    ? " so you can look back at what lights each of you up"
                    : " so you can read it again later"}
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
            {everyone
              ? "Who goes first?"
              : g.kind === "joy"
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
              : guessing
                ? `Now guess what ${plan[g.turn].asks.length === 1 ? "the other person" : "the others"} picked. Pass any you like. The answers so far stay hidden.`
                : everyone
                  ? "Pick your own small joy in private, or pass. The answers so far stay hidden."
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
          noun={guessing ? "guess" : "question"}
        />
      ) : reflecting !== null && g.stage !== "finished" ? (
        <ReflectStep
          key={g.players[reflecting].id}
          game={g}
          index={reflecting}
          busy={busy}
          onSave={(text) => {
            const player = g.players[reflecting];
            const had = g.reflections?.find((r) => r.playerId === player.id)?.text || "";
            if (text.trim() !== had)
              onAction({ type: "reflect", playerId: player.id, text });
            setReflecting(reflecting + 1 < g.players.length ? reflecting + 1 : null);
          }}
          onSkip={() =>
            setReflecting(reflecting + 1 < g.players.length ? reflecting + 1 : null)
          }
          onDone={() => setReflecting(null)}
        />
      ) : (
        <>
          {g.kind === "match" ? (
            <SamePageReveal game={g} trend={samePageTrend(living, g, true)} />
          ) : everyone ? (
            <JoyReveal game={g} />
          ) : g.kind === "story" ? (
            <StoryReveal game={g} busy={busy} onAction={onAction} />
          ) : (
            <>
              <p className="lb-kicker">The reveal</p>
              <h2>{text ? "Here’s what everyone chose" : "Everyone passed"}</h2>
              {text ? (
                <JoyRevealV1 game={g} />
              ) : (
                <p>No answers to show this time. That’s fine too.</p>
              )}
            </>
          )}
          <RoundNotes
            game={g}
            owner={book.owner}
            busy={busy}
            onStart={() => setReflecting(0)}
          />
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
  noun = "question",
}: {
  turn: Turn;
  busy: boolean;
  onAction: (action: GameAction) => void;
  storySoFar: string;
  noun?: string;
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
        {many ? ` · ${noun} ${step + 1} of ${turn.asks.length}` : ""}
      </p>
      <h2 ref={heading} tabIndex={-1}>
        {ask.prompt}
      </h2>
      {ask.hint && <p className="lb-fine">{ask.hint}</p>}
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
            Back to {noun} {step}
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

/** "Anything to remember about this round?": an offer, never a step you must take. */
function RoundNotes({
  game: g,
  owner,
  busy,
  onStart,
}: {
  game: Game;
  owner: string;
  busy: boolean;
  onStart: () => void;
}) {
  const lines = g.players.flatMap((p) => {
    const text = g.reflections?.find((r) => r.playerId === p.id)?.text;
    return text ? [{ player: p, text }] : [];
  });
  return (
    <section className="lb-notes" aria-labelledby="lb-notes-title">
      <h3 id="lb-notes-title">Anything to remember about this round?</h3>
      {lines.length ? (
        <ul>
          {lines.map((l) => (
            <li key={l.player.id}>
              <strong>{l.player.name}:</strong> {l.text}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          Each player can add a line, or skip. Lines are kept with this round
          in {owner}’s book, under each name, for everyone who played.
        </p>
      )}
      <button className="lb-secondary" disabled={busy} onClick={onStart}>
        {lines.length ? "Add or change a line" : "Add a line each"}
      </button>
    </section>
  );
}

/** One player at a time writes their own line, or skips. */
function ReflectStep({
  game: g,
  index,
  busy,
  onSave,
  onSkip,
  onDone,
}: {
  game: Game;
  index: number;
  busy: boolean;
  onSave: (text: string) => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  const player = g.players[index];
  const [text, setText] = useState(
    g.reflections?.find((r) => r.playerId === player.id)?.text || "",
  );
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <div className="lb-reflect">
      <p className="lb-kicker">
        Anything to remember? · {index + 1} of {g.players.length}
      </p>
      <h2 ref={heading} tabIndex={-1}>
        {player.name}, anything to remember about this round?
      </h2>
      <p>One line, in your own words. Skipping is fine.</p>
      <label>
        {player.name}’s line
        <textarea
          rows={3}
          maxLength={REFLECTION_LIMIT}
          value={text}
          placeholder="Who knew I’d pick the beach?"
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="lb-actions">
        <button
          className="lb-primary"
          disabled={busy || !text.trim()}
          onClick={() => onSave(text)}
        >
          Save my line <Check size={16} />
        </button>
        <button className="lb-secondary" disabled={busy} onClick={onSkip}>
          Skip
        </button>
        <button className="lb-text" disabled={busy} onClick={onDone}>
          Back to the round
        </button>
      </div>
    </div>
  );
}

/** The whole story read back, line by line, and a title picked together. */
function StoryReveal({
  game: g,
  busy,
  onAction,
}: {
  game: Game;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const lines = storyLines(g);
  const titles = storyTitles(g);
  const [own, setOwn] = useState("");
  if (!lines.length)
    return (
      <>
        <p className="lb-kicker">Your shared story</p>
        <h2>Everyone passed</h2>
        <p>No story to read back this time. That’s fine too.</p>
      </>
    );
  return (
    <>
      <p className="lb-kicker">Your shared story · read it aloud</p>
      <h2>{g.title || "Your story"}</h2>
      <div className="lb-story-read">
        {lines.map((l, i) => (
          <p key={i}>
            {l.text} <span className="lb-story-by">{l.player.name}</span>
          </p>
        ))}
      </div>
      {remembers(g) && (
        <fieldset className="lb-title-pick">
          <legend>
            {g.title ? "Your title. Change it if you like." : "Give it a title together"}
          </legend>
          <div className="lb-title-choices">
            {titles.map((t) => (
              <button
                key={t}
                type="button"
                className="ui-chip"
                disabled={busy}
                aria-pressed={g.title === t}
                onClick={() => onAction({ type: "title", title: t })}
              >
                {t}
              </button>
            ))}
          </div>
          <form
            className="lb-title-own"
            onSubmit={(e) => {
              e.preventDefault();
              if (!own.trim()) return;
              onAction({ type: "title", title: own });
              setOwn("");
            }}
          >
            <label>
              Or write your own
              <input
                value={own}
                maxLength={TITLE_LIMIT}
                placeholder="The day the moon came to tea"
                onChange={(e) => setOwn(e.target.value)}
              />
            </label>
            <button className="lb-secondary" disabled={busy || !own.trim()}>
              Use this title
            </button>
          </form>
        </fieldset>
      )}
    </>
  );
}

/** Everyone's small joy, who guessed it, and a tally of right guesses. */
function JoyReveal({ game: g }: { game: Game }) {
  const { lines, tally } = joyResult(g);
  if (!lines.length)
    return (
      <>
        <p className="lb-kicker">The reveal</p>
        <h2>Everyone passed</h2>
        <p>No answers to show this time. That’s fine too.</p>
      </>
    );
  return (
    <>
      <p className="lb-kicker">The reveal</p>
      <h2>{joySummary(g)}</h2>
      <div className="lb-reveal lb-joys">
        {lines.map((l) => (
          <div key={l.player.id}>
            <span className="lb-kicker">{l.player.name}’s small joy</span>
            <p>{l.pick}</p>
            <ul className="lb-sp-picks">
              {l.guesses.map((x) => (
                <li key={x.player.id} className={x.right ? "is-right" : ""}>
                  <span>{x.player.name}</span>{" "}
                  {x.guess === null ? (
                    <em>passed</em>
                  ) : x.right ? (
                    <strong>guessed it ✓</strong>
                  ) : (
                    <>guessed {x.guess.toLowerCase()}</>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {tally.length > 1 && (
        <p className="lb-tally">
          Right guesses:{" "}
          {tally.map((t) => `${t.player.name} ${t.right} of ${t.of}`).join(" · ")}
        </p>
      )}
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
