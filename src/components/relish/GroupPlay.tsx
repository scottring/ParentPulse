"use client";
import { useState } from "react";
import { Hand, Check, ArrowRight } from "lucide-react";
import { ageLabels } from "@/lib/relish/profiles";
import type { Book } from "@/lib/relish/model";
import {
  type Game,
  type GameAction,
  gamePlayer,
  gameText,
  joyOptions,
  samePageAgreement,
  samePageRound,
  storyRounds,
  turnCount,
} from "@/lib/relish/living";

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
    total = turnCount(g),
    rounds = storyRounds(g.players.length, g.audience),
    joyChoices = joyOptions(g),
    match = g.kind === "match" ? samePageRound(g) : undefined,
    title =
      g.kind === "joy"
        ? "Guess my small joy"
        : g.kind === "match"
          ? "Same page?"
          : "One story, many voices",
    text = gameText(g),
    finished = ["reveal", "kept", "finished"].includes(g.stage);
  const next = gamePlayer(g);
  return (
    <section className="lb-game" aria-label="Our game">
      <div className="lb-session-line">
        <div>
          <p className="lb-kicker">
            {finished
              ? "Round complete"
              : "One round"}
          </p>
          <p>
            {finished
              ? "One round complete"
              : `Turn ${g.turn + 1} of ${total} · then reveal together`}
          </p>
        </div>
        {!finished && (
          <button className="lb-text" disabled={busy} onClick={onPause}>
            Pause here
          </button>
        )}
      </div>
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
                ? "Everyone answers the same question in private. Pass the device between turns. All answers are revealed together."
                : "Pass the device around. Each person adds to the same story. Anyone can pass."}
          </p>
          <div className="lb-boundary">
            <strong>Our stopping point · about 5–10 minutes</strong>
            <p>
              {total} turns, then a reveal together. A pass counts as a turn. No
              need to save a page or play again.
            </p>
          </div>
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
              ? "It is your turn to add to the story. Passing is welcome too."
              : "The answers so far are hidden. Hand the device over before continuing."}
          </p>
          <button
            className="lb-primary"
            disabled={busy}
            onClick={() => onAction({ type: "ready" })}
          >
            I’m {next.name} · ready
          </button>
        </div>
      ) : g.stage === "choose" ? (
        <>
          <p className="lb-kicker">{next.name}’s turn</p>
          <h2>
            {match
              ? match.prompt
              : g.kind === "joy"
              ? g.turn === 0
                ? g.audience === "under-6" || g.audience === "6-8"
                  ? "What would you like to do?"
                  : "What would brighten an ordinary afternoon for you?"
                : g.audience === "under-6" || g.audience === "6-8"
                  ? `What do you think ${g.players[0].name} would like?`
                  : `What would brighten ${g.players[0].name}’s ordinary afternoon?`
              : rounds[g.turn].prompt}
          </h2>
          {g.kind === "story" && text && (
            <p className="lb-story-so-far">So far: {text}</p>
          )}
          <div className="lb-choices">
            {(match
              ? match.choices
              : g.kind === "joy"
                ? joyChoices
                : rounds[g.turn].choices
            ).map(
              (choice, index) => (
                <button
                  key={choice}
                  disabled={busy}
                  onClick={() => onAction({ type: "choice", choice: index })}
                >
                  {choice}
                </button>
              ),
            )}
          </div>
          <button
            className="lb-text"
            disabled={busy}
            onClick={() => onAction({ type: "choice", choice: null })}
          >
            Pass my turn
          </button>
        </>
      ) : (
        <>
          <p className="lb-kicker">
            {g.kind === "story" ? "Your shared story" : "The reveal"}
          </p>
          <h2>
            {text
              ? g.kind === "story"
                ? "Your story"
                : "Results"
              : "Round ended"}
          </h2>
          {match && text ? (
            <>
              <p className="lb-story-so-far">{match.prompt}</p>
              <div className="lb-reveal">
                {g.players.map((p, i) => (
                  <div key={p.id}>
                    <span className="lb-kicker">
                      {p.name} {g.choices[i] === null ? "passed" : "chose"}
                    </span>
                    <p>
                      {g.choices[i] === null
                        ? "No answer"
                        : match.choices[g.choices[i]!]}
                    </p>
                  </div>
                ))}
              </div>
              {samePageAgreement(g) && (
                <p className="lb-same-page">{samePageAgreement(g)}</p>
              )}
            </>
          ) : g.kind === "joy" && text ? (
            <div className="lb-reveal">
              {g.players.map((p, i) => (
                <div key={p.id}>
                  <span className="lb-kicker">
                    {p.name}{" "}
                    {i === 0
                      ? "chose"
                      : g.choices[i] === null
                        ? "passed"
                        : "guessed"}
                  </span>
                  <p>
                    {g.choices[i] === null
                      ? "No guess needed"
                      : joyChoices[g.choices[i]!]}
                  </p>
                </div>
              ))}
            </div>
          ) : text ? (
            <blockquote>{text}</blockquote>
          ) : (
            <p>
              Everyone passed. No answers were saved.
            </p>
          )}
          <div className="lb-boundary">
            <strong>Round complete</strong>
            <p>
              The round is finished. You can close the game or save a shared page below.
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
                <summary>Keep a shared page · optional</summary>
                <p>
                  Approve these exact words, one person at a time. They will be
                  kept in the Family pages of {book.owner}’s book on this
                  device.
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
                  approved. Anyone can choose not to share.
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
