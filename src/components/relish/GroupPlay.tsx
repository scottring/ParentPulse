"use client";
import ConfirmDelete from "./ConfirmDelete";
import type { NoteDraft } from "@/lib/relish/game-notes";
import { ListenBar, useListen } from "./GameListen";
import GameNotes, { canListen, useNotesConfig } from "./GameNotes";
import { useEffect, useRef, useState } from "react";
import { Hand, Check, ArrowRight } from "lucide-react";
import { ageLabels } from "@/lib/relish/profiles";
import type { Book } from "@/lib/relish/model";
import {
  type Game,
  type GameAction,
  type SaidMark,
  type Turn,
  gamePlayer,
  guessWords,
  ownWords,
  saidMarks,
  saidResult,
  saidRoundLine,
  saidTally,
  SAID_LIMIT,
  samePageQuestions,
  sharerOf,
  gameText,
  joyJudgePending,
  joyJudging,
  joyResult,
  joySummary,
  joyTally,
  livingOf,
  pickGroups,
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
import { SpotBoard, SpotReveal, SpotSetup } from "./SpotIt";

const titles: Record<Game["kind"], string> = {
  joy: "Guess my small joy",
  match: "Same page?",
  story: "One story, many voices",
  spot: "Spot it!",
};
const list = (items: string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
const words = ["", "one", "two", "three", "four", "five", "six"];
/** Rounds from contentVersion 2 keep their answers in the book. */
const remembers = (g: Game) => (g.contentVersion ?? 1) >= 2;
const markLabels: Record<SaidMark, string> = {
  got: "Got it",
  close: "Close",
  not: "Not quite",
};
/** Where an own-words round stands: the question being played and who answers it. */
function wordsAt(g: Game) {
  const said = g.said || [],
    last = said.at(-1);
  const guessing =
    g.stage === "judge" ||
    (!!last && last.answer !== null && last.guesses.length < g.players.length - 1);
  const q = guessing ? said.length - 1 : said.length;
  return { q, sharer: sharerOf(g.players, q), total: samePageQuestions(g).length };
}

export default function GroupPlay({
  book,
  game,
  busy,
  onAction,
  onKeep,
  onPause,
  onFinish,
  onCancel,
  onKeepNotes,
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
  /** A parent's book keeps notes about the players; children's books don't. */
  onKeepNotes?: (notes: NoteDraft[]) => Promise<boolean>;
}) {
  const [firstPlayer, setFirstPlayer] = useState(game.players[0].id);
  /** Whose turn it is to add a line about the round, once it's revealed. */
  const [reflecting, setReflecting] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const g = game,
    plan = turnPlan(g),
    total = plan.length,
    title = titles[g.kind],
    text = gameText(g),
    finished = ["reveal", "kept", "finished"].includes(g.stage),
    living = livingOf(book);
  const notesOn = !!onKeepNotes;
  const notesConfig = useNotesConfig(!notesOn);
  const listen = useListen(g);
  const listenable = notesOn && canListen(g, notesConfig);
  const aiNote = listenable ? "sent to AI only if you turn on Listen" : "never sent to AI";
  const next = gamePlayer(g);
  const many = (plan[0]?.asks.length || 1) > 1;
  /** A joy round where everyone picks, then everyone guesses. */
  const everyone = g.kind === "joy" && remembers(g);
  const guessing = everyone && g.turn >= g.players.length;
  const spot = g.kind === "spot" && !!g.spot;
  /** Same page? answered in your own words (contentVersion 3). */
  const inWords = ownWords(g);
  const at = inWords ? wordsAt(g) : null;
  /** The question before this one, when its answer was passed. */
  const passedBefore =
    inWords && g.stage === "handoff" && g.said?.at(-1)?.answer === null
      ? sharerOf(g.players, g.said.length - 1)
      : null;
  return (
    <section className="lb-game" aria-label="Our game">
      {listenable && g.stage !== "finished" && <ListenBar listen={listen} busy={busy} />}
      {!finished && g.stage !== "ready" && !spot && (
        <div className="lb-session-line">
          <div>
            <p className="lb-kicker">One round</p>
            <p>
              {at
                ? `Question ${Math.min(at.q + 1, at.total)} of ${at.total} · ${at.sharer.name} answers`
                : g.stage === "judge"
                  ? "Every turn is in · how close did they get?"
                  : `Turn ${Math.min(g.turn + 1, total)} of ${total} · then reveal together`}
            </p>
          </div>
          <span className="lb-session-actions">
            <button className="lb-text" disabled={busy} onClick={onPause}>
              Pause here
            </button>
            <ConfirmDelete
              label="End without keeping"
              question="End this round without keeping it?"
              detail="Its answers are let go. This can’t be undone."
              yes="Yes, end it"
              no="Keep playing"
              busy={busy}
              onConfirm={onCancel}
            />
          </span>
        </div>
      )}
      {g.stage === "ready" && spot ? (
        <SpotSetup
          game={g}
          book={book}
          busy={busy}
          onAction={onAction}
          onCancel={onCancel}
        />
      ) : g.stage === "choose" && spot ? (
        <SpotBoard game={g} busy={busy} onAction={onAction} onPause={onPause} />
      ) : g.stage === "ready" ? (
        <>
          <h2>{title}</h2>
          <p>
            {inWords
              ? "Take turns answering in your own words. Everyone else guesses what you said."
              : everyone
              ? "Everyone picks a small joy in private, from the list or in their own words, then guesses everyone else’s."
              : g.kind === "joy"
                ? `One person picks a small joy, then everyone else guesses it.`
                : g.kind === "match"
                  ? many
                    ? `Answer ${words[plan[0].asks.length] ?? plan[0].asks.length} questions each, then pass the device and compare.`
                    : "Everyone answers one question in private, then you compare."
                  : remembers(g)
                    ? "Take turns adding to one story, from the list or in your own words, then read it back and give it a title."
                    : "Take turns adding to one story. Anyone can pass."}
          </p>
          {g.kind === "match" && samePageTrend(living, g) && (
            <p className="lb-trend">{samePageTrend(living, g)}</p>
          )}
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
          <p className="lb-fine lb-setup-note">
            {inWords
              ? `Each answer stays hidden until everyone has guessed. The answers and guesses stay with this round in ${book.owner}’s book (${aiNote})`
              : "Answers stay hidden until the reveal"}
            {remembers(g) && !inWords
              ? `, then stay with this round in ${book.owner}’s book (${aiNote})`
              : ""}
            . Passing is always fine.
            {g.audience
              ? ` Questions picked for ${g.audience === "under-6" ? "under-6s" : g.audience === "adult" ? "adults" : ageLabels[g.audience].toLowerCase()}.`
              : ""}
          </p>
        </>
      ) : g.stage === "handoff" ? (
        <div className="lb-handoff">
          <Hand size={30} />
          <p className="lb-kicker">Pass the device</p>
          <h2>Over to {next.name}.</h2>
          {passedBefore && (
            <p className="lb-fine">
              {passedBefore.name} passed, so there was nothing to guess.
            </p>
          )}
          <p>
            {inWords && at
              ? at.sharer.id === next.id
                ? "Answer in your own words, or pass. Everyone else will guess what you said."
                : `Guess what ${at.sharer.name} said, or pass. The other guesses stay hidden.`
              : g.kind === "story"
              ? remembers(g)
                ? "Add the next part of the story: pick a line or write your own. Passing is fine."
                : "Add the next part of the story, or pass."
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
      ) : inWords && at && g.stage === "choose" && plan[g.turn] ? (
        <SayTurn
          key={`${g.id}:${g.turn}`}
          turn={plan[g.turn]}
          game={g}
          question={at.q}
          total={at.total}
          busy={busy}
          onAction={onAction}
        />
      ) : inWords && g.stage === "judge" ? (
        <JudgeStep game={g} busy={busy} onAction={onAction} />
      ) : everyone && g.stage === "judge" ? (
        <JoyJudge game={g} busy={busy} onAction={onAction} />
      ) : g.stage === "choose" && plan[g.turn] ? (
        <TurnPanel
          key={`${g.id}:${g.turn}`}
          turn={plan[g.turn]}
          kind={g.kind}
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
            const had =
              g.reflections?.find((r) => r.playerId === player.id)?.text || "";
            if (text.trim() !== had)
              onAction({ type: "reflect", playerId: player.id, text });
            setReflecting(
              reflecting + 1 < g.players.length ? reflecting + 1 : null,
            );
          }}
          onSkip={() =>
            setReflecting(
              reflecting + 1 < g.players.length ? reflecting + 1 : null,
            )
          }
          onDone={() => setReflecting(null)}
        />
      ) : (
        <>
          {spot ? (
            <SpotReveal game={g} busy={busy} onAction={onAction} />
          ) : inWords ? (
            <OwnWordsReveal game={g} trend={samePageTrend(living, g, true)} />
          ) : g.kind === "match" ? (
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
          <RoundNotes game={g} />
          {onKeepNotes && (
            <GameNotes
              game={g}
              owner={book.owner}
              config={notesConfig}
              listen={listenable ? listen : null}
              busy={busy}
              onKeep={onKeepNotes}
            />
          )}
          <div className="lb-round-end">
            <p className="lb-fine">
              {spot
                ? `This card is kept in ${book.owner}’s book.`
                : remembers(g)
                  ? `This round is kept in ${book.owner}’s book.`
                  : "Your book notes that you played, without anyone’s answers."}
              {g.savedPageId
                ? " A shared page was kept with everyone’s approval."
                : ""}
            </p>
            <button className="lb-primary" disabled={busy} onClick={onFinish}>
              Finish round <Check size={16} />
            </button>
            <div className="lb-round-more">
              <button
                className="lb-text"
                disabled={busy}
                onClick={() => setReflecting(0)}
              >
                {g.reflections?.length
                  ? "Add or change a memory"
                  : "Add a memory"}
              </button>
              {text && !g.savedPageId && (
                <button
                  className="lb-text"
                  disabled={busy}
                  aria-expanded={sharing}
                  onClick={() => setSharing(!sharing)}
                >
                  Create a shared page
                </button>
              )}
            </div>
          </div>
          {sharing && text && !g.savedPageId && (
            <section className="lb-sharing" aria-label="Create a shared page">
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
            </section>
          )}
        </>
      )}
    </section>
  );
}

/**
 * One player's turn. A turn with several questions shows them one at a time;
 * the answers are sent together at the end, so nothing is saved half-done.
 * A question that takes your own words ends its list with "Something else…";
 * a guess at a joy someone wrote is answered in words, with the list as ideas.
 */
function TurnPanel({
  turn,
  kind,
  busy,
  onAction,
  storySoFar,
  noun = "question",
}: {
  turn: Turn;
  kind: Game["kind"];
  busy: boolean;
  onAction: (action: GameAction) => void;
  storySoFar: string;
  noun?: string;
}) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [texts, setTexts] = useState<(string | null)[]>([]);
  /** The "Something else…" field is open on this question. */
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const many = turn.asks.length > 1;
  const ask = turn.asks[step];
  const only = ask.write === "only";
  const youngPlayer =
    turn.player.audience === "under-6" || turn.player.audience === "6-8";
  const story = kind === "story";
  useEffect(() => {
    if (step > 0) heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (writing) field.current?.focus();
  }, [writing]);
  function go(next: number, written: (string | null)[]) {
    setStep(next);
    setDraft(written[next] ?? "");
    setWriting(written[next] != null);
  }
  function answer(choice: number | null, text: string | null = null) {
    const answers = [...picked.slice(0, step), choice];
    const written = [...texts.slice(0, step), text];
    if (step + 1 < turn.asks.length) {
      setPicked(answers);
      setTexts(written);
      go(step + 1, written);
      return;
    }
    if (many)
      onAction({
        type: "answer",
        answers,
        ...(written.some((t) => t !== null) ? { texts: written } : {}),
      });
    else onAction({ type: "choice", choice, ...(text !== null ? { text } : {}) });
  }
  function submitWords(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    if (draft.trim() && !busy) answer(null, draft);
  }
  const last = step + 1 >= turn.asks.length;
  const ownField = (
    <>
      <label>
        {only
          ? "Your guess"
          : story
            ? "Your own line"
            : "Your own small joy"}
        <textarea
          ref={field}
          rows={2}
          value={draft}
          maxLength={SAID_LIMIT}
          autoComplete="off"
          autoCapitalize={story ? "none" : "sentences"}
          placeholder={
            only ? "" : story ? "a goose in a tiny scarf" : "Pancakes in our pajamas"
          }
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // A few words, not a page: Enter is done.
            if (e.key !== "Enter" || e.shiftKey) return;
            submitWords(e);
          }}
        />
      </label>
      {youngPlayer && (
        <p className="lb-fine">Say it out loud and a grown-up can type it.</p>
      )}
    </>
  );
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
      {only ? (
        <form key={step} className="lb-say" onSubmit={submitWords}>
          {ownField}
          <div className="lb-say-ideas" role="group" aria-label="Ideas to tap">
            {ask.choices.map((c) => (
              <button
                key={c}
                type="button"
                className="ui-chip"
                disabled={busy}
                aria-pressed={draft === c}
                onClick={() => setDraft(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="lb-turn-foot">
            <button className="lb-primary" disabled={busy || !draft.trim()}>
              {last ? "That’s my guess" : "Use this guess"} <Check size={16} />
            </button>
            {many && step > 0 && (
              <button
                type="button"
                className="lb-text"
                disabled={busy}
                onClick={() => go(step - 1, texts)}
              >
                Back to {noun} {step}
              </button>
            )}
            <button
              type="button"
              className="lb-text"
              disabled={busy}
              onClick={() => answer(null)}
            >
              {many ? "Pass this one" : "Pass my turn"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="lb-choices">
            {ask.choices.map((choice, index) => (
              <button
                key={choice}
                disabled={busy}
                aria-pressed={picked[step] === index && texts[step] == null}
                onClick={() => answer(index)}
              >
                {choice}
              </button>
            ))}
            {ask.write === "also" && !writing && (
              <button
                className="lb-choice-more"
                disabled={busy}
                aria-pressed={texts[step] != null}
                onClick={() => setWriting(true)}
              >
                {story ? "Write your own…" : "Something else…"}
              </button>
            )}
          </div>
          {ask.write === "also" && writing && (
            <form className="lb-choice-own" onSubmit={submitWords}>
              {ownField}
              <div className="lb-turn-foot">
                <button className="lb-primary" disabled={busy || !draft.trim()}>
                  Use this <Check size={16} />
                </button>
                <button
                  type="button"
                  className="lb-text"
                  disabled={busy}
                  onClick={() => setWriting(false)}
                >
                  Back to the list
                </button>
              </div>
            </form>
          )}
          <div className="lb-turn-foot">
            {many && step > 0 && (
              <button
                className="lb-text"
                disabled={busy}
                onClick={() => go(step - 1, texts)}
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
      )}
    </>
  );
}

/**
 * Same page? in your own words: the one answering writes their answer; each
 * other player writes a guess. Young players can tap an idea to fill the field.
 */
function SayTurn({
  turn,
  game: g,
  question,
  total,
  busy,
  onAction,
}: {
  turn: Turn;
  game: Game;
  question: number;
  total: number;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const [text, setText] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const ask = turn.asks[0];
  const sharer = ask.about ? g.players.find((p) => p.id === ask.about) : undefined;
  const ideas =
    turn.player.audience === "under-6" || turn.player.audience === "6-8";
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <form
      className="lb-say"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onAction({ type: "say", text });
      }}
    >
      <p className="lb-kicker">
        {turn.player.name}’s turn ·{" "}
        {sharer ? "your guess" : `question ${question + 1} of ${total}`}
      </p>
      <h2 ref={heading} tabIndex={-1}>
        {sharer ? `What did ${sharer.name} say?` : ask.prompt}
      </h2>
      {sharer && <p className="lb-story-so-far">{ask.prompt}</p>}
      <label>
        {sharer ? "Your guess" : "Your answer, in your own words"}
        <textarea
          rows={2}
          value={text}
          maxLength={SAID_LIMIT}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // A few words, not a page: Enter is done.
            if (e.key !== "Enter" || e.shiftKey) return;
            e.preventDefault();
            if (text.trim() && !busy) onAction({ type: "say", text });
          }}
        />
      </label>
      {ideas && (
        <>
          <div className="lb-say-ideas" role="group" aria-label="Ideas to tap">
            {ask.choices.map((c) => (
              <button
                key={c}
                type="button"
                className="ui-chip"
                disabled={busy}
                aria-pressed={text === c}
                onClick={() => setText(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="lb-fine">Say it out loud and a grown-up can type it.</p>
        </>
      )}
      <div className="lb-turn-foot">
        <button className="lb-primary" disabled={busy || !text.trim()}>
          {sharer ? "That’s my guess" : "That’s my answer"} <Check size={16} />
        </button>
        <button
          type="button"
          className="lb-text"
          disabled={busy}
          onClick={() => onAction({ type: "say", text: null })}
        >
          Pass this one
        </button>
      </div>
    </form>
  );
}

/** Everyone looks: one answer, each guess, and the one who answered judges them. */
function JudgeStep({
  game: g,
  busy,
  onAction,
}: {
  game: Game;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const lines = saidResult(g),
    line = lines.at(-1);
  const total = samePageQuestions(g).length;
  useEffect(() => {
    heading.current?.focus();
  }, []);
  if (!line) return null;
  const pending = line.guesses.some((x) => x.text !== null && !x.mark);
  const last = lines.length >= total;
  return (
    <div className="lb-judge">
      <p className="lb-kicker">
        Everyone look · question {lines.length} of {total}
      </p>
      <p className="lb-story-so-far">{line.question.prompt}</p>
      <h2 ref={heading} tabIndex={-1} className="lb-said">
        <span className="lb-kicker">{line.sharer.name} said</span>
        {line.answer}
      </h2>
      {line.guesses.some((x) => x.text !== null) ? (
        <p>{line.sharer.name}, how close did each guess come?</p>
      ) : (
        <p>Everyone passed on this one.</p>
      )}
      <ul className="lb-judge-list">
        {line.guesses.map((x) => (
          <li key={x.player.id}>
            <p className="lb-judge-guess">
              <span className="lb-kicker">
                {x.player.name} {x.text === null ? "passed" : "guessed"}
              </span>
              {x.text !== null && <strong>{x.text}</strong>}
            </p>
            {x.text !== null && (
              <div
                className="lb-judge-marks"
                role="group"
                aria-label={`How close was ${x.player.name}?`}
              >
                {saidMarks.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={busy}
                    aria-pressed={x.mark === m}
                    onClick={() =>
                      onAction({
                        type: "judge",
                        playerId: x.player.id,
                        mark: x.mark === m ? null : m,
                      })
                    }
                  >
                    {markLabels[m]}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="lb-turn-foot">
        <button
          className="lb-primary"
          disabled={busy || pending}
          onClick={() => onAction({ type: "next" })}
        >
          {last ? "See how you did" : "Next question"} <ArrowRight size={16} />
        </button>
        {pending && (
          <button
            className="lb-text"
            disabled={busy}
            onClick={() => onAction({ type: "next", skip: true })}
          >
            Skip judging
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A small joy round where someone wrote their own: before the reveal,
 * everyone looks at each written joy and its guesses, and whoever wrote it
 * says how close each guess came.
 */
function JoyJudge({
  game: g,
  busy,
  onAction,
}: {
  game: Game;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const judging = joyJudging(g),
    pending = joyJudgePending(g);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const one = judging.length === 1;
  return (
    <div className="lb-judge">
      <p className="lb-kicker">Everyone look · before the reveal</p>
      {!one && (
        <h2 ref={heading} tabIndex={-1}>
          Some of you wrote your own
        </h2>
      )}
      {judging.map((t) => {
        const Said = one ? "h2" : "h3";
        return (
          <section key={t.player.id} className="lb-joy-judge" aria-label={`${t.player.name}’s small joy`}>
            <Said ref={one ? heading : undefined} tabIndex={one ? -1 : undefined} className="lb-said">
              <span className="lb-kicker">{t.player.name} wrote</span>
              {t.pick}
            </Said>
            {t.guesses.some((x) => x.text !== null) ? (
              <p>{t.player.name}, how close did each guess come?</p>
            ) : (
              <p>Everyone passed on this one.</p>
            )}
            <ul className="lb-judge-list">
              {t.guesses.map((x) => (
                <li key={x.player.id}>
                  <p className="lb-judge-guess">
                    <span className="lb-kicker">
                      {x.player.name} {x.text === null ? "passed" : "guessed"}
                    </span>
                    {x.text !== null && <strong>{x.text}</strong>}
                  </p>
                  {x.text !== null && (
                    <div
                      className="lb-judge-marks"
                      role="group"
                      aria-label={`How close was ${x.player.name}?`}
                    >
                      {saidMarks.map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={busy}
                          aria-pressed={x.mark === m}
                          onClick={() =>
                            onAction({
                              type: "judge",
                              playerId: x.player.id,
                              about: t.player.id,
                              mark: x.mark === m ? null : m,
                            })
                          }
                        >
                          {markLabels[m]}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <div className="lb-turn-foot">
        <button
          className="lb-primary"
          disabled={busy || pending}
          onClick={() => onAction({ type: "next" })}
        >
          See everyone’s joys <ArrowRight size={16} />
        </button>
        {pending && (
          <button
            className="lb-text"
            disabled={busy}
            onClick={() => onAction({ type: "next", skip: true })}
          >
            Skip judging
          </button>
        )}
      </div>
    </div>
  );
}

/** The whole round: each answer, who got it or came close, and who knew whom best. */
function OwnWordsReveal({ game: g, trend }: { game: Game; trend: string }) {
  const lines = saidResult(g);
  if (!lines.some((l) => l.answer !== null))
    return (
      <>
        <p className="lb-kicker">The reveal</p>
        <h2>Everyone passed</h2>
        <p>No answers to show this time. That’s fine too.</p>
      </>
    );
  const round = saidRoundLine(lines),
    tally = saidTally(lines, g.players);
  return (
    <>
      <p className="lb-kicker">The reveal</p>
      <h2>What you learned about each other</h2>
      <ol className="lb-sp-list lb-said-list">
        {lines.map((l) => (
          <li
            key={l.question.id}
            className={l.guesses.some((x) => x.mark === "got") ? "is-same" : ""}
          >
            <p className="lb-sp-prompt">{l.question.prompt}</p>
            {l.answer === null ? (
              <p className="lb-said-answer">
                <span>{l.sharer.name}</span> <em>passed</em>
              </p>
            ) : (
              <>
                <p className="lb-said-answer">
                  <span>{l.sharer.name}</span> <strong>{l.answer}</strong>
                </p>
                <ul className="lb-sp-picks">
                  {l.guesses.map((x) => (
                    <li key={x.player.id} className={x.mark ? `is-${x.mark}` : ""}>
                      {x.text === null ? (
                        <>
                          <span>{x.player.name}</span> <em>passed</em>
                        </>
                      ) : x.mark === "got" ? (
                        <strong>{x.player.name} got it ✓</strong>
                      ) : (
                        guessWords(x)
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ol>
      {(round || tally) && (
        <p className="lb-tally">
          {round}
          {tally && <span className="lb-tally-all">{tally}</span>}
        </p>
      )}
      {trend && <p className="lb-trend">{trend}</p>}
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
        <h2>
          {line.answered ? "Here’s what everyone chose" : "Everyone passed"}
        </h2>
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
  const summary = samePageSummary(g);
  return (
    <>
      <p className="lb-kicker">The reveal</p>
      <h2>What each of you said</h2>
      <ol className="lb-sp-list">
        {r.lines.map((line) => {
          const { groups, passed } = pickGroups(line, g.players);
          return (
            <li
              key={line.question.id}
              className={
                line.answered < 2 ? "" : line.same ? "is-same" : "is-different"
              }
            >
              <p className="lb-sp-prompt">{line.question.prompt}</p>
              <ul className="lb-sp-picks">
                {groups.map((x) => (
                  <li key={x.choice}>
                    <span>
                      {line.same &&
                      groups.length === 1 &&
                      x.names.length === g.players.length
                        ? "Everyone"
                        : list(x.names)}
                    </span>{" "}
                    <strong>{x.choice}</strong>
                  </li>
                ))}
                {passed.length > 0 && (
                  <li>
                    <span>{list(passed)}</span> <em>passed</em>
                  </li>
                )}
              </ul>
              {line.answered >= 2 && line.same && (
                <span className="lb-sp-mark">Same page ✓</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="lb-tally">
        {summary || "Not enough answers to compare this time."}
        {r.differ.length > 0 && ` Different on ${list(r.differ)}.`}
      </p>
      {trend && <p className="lb-trend">{trend}</p>}
    </>
  );
}

/** The lines players wrote about the round, under each name. Nothing when none. */
function RoundNotes({ game: g }: { game: Game }) {
  const lines = g.players.flatMap((p) => {
    const text = g.reflections?.find((r) => r.playerId === p.id)?.text;
    return text ? [{ player: p, text }] : [];
  });
  if (!lines.length) return null;
  return (
    <section className="lb-notes" aria-labelledby="lb-notes-title">
      <h3 id="lb-notes-title">What you remember</h3>
      <ul>
        {lines.map((l) => (
          <li key={l.player.id}>
            <strong>{l.player.name}:</strong> {l.text}
          </li>
        ))}
      </ul>
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
          placeholder={
            g.kind === "spot"
              ? "Leo saw the cow before anyone."
              : "Who knew I’d pick the beach?"
          }
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
            {g.title
              ? "Your title. Change it if you like."
              : "Give it a title together"}
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
      <h2>What lights each of you up</h2>
      <div className="lb-reveal lb-joys">
        {lines.map((l) => (
          <div key={l.player.id}>
            <span className="lb-kicker">{l.player.name}’s small joy</span>
            <p>{l.pick}</p>
            <ul className="lb-sp-picks">
              {l.guesses.map((x) => (
                <li
                  key={x.player.id}
                  className={x.right ? "is-right" : x.result === "close" ? "is-close" : ""}
                >
                  <span>{x.player.name}</span>{" "}
                  {x.guess === null ? (
                    <em>passed</em>
                  ) : x.right ? (
                    <strong>guessed it ✓</strong>
                  ) : x.result === "close" ? (
                    <>was close with “{x.guess}”</>
                  ) : (
                    <>guessed {l.own ? `“${x.guess}”` : x.guess.toLowerCase()}</>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="lb-tally">
        {joySummary(g)}
        {tally.length > 1 && tally.some((t) => t.right > 0 || t.close > 0) && (
          <span className="lb-tally-all">{joyTally(g)}</span>
        )}
      </p>
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
