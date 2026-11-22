"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { spotResult, SPOT_ALL, type Game, type GameAction } from "@/lib/relish/living";
import { tableNoteText, tableTurns, type TableTonight } from "@/lib/relish/table-mode";
import { playNoteText } from "@/lib/relish/play-notes";
import { spotBadges } from "./SpotIt";
import "./table-mode.css";

/**
 * Table mode (2026-11-22, mockups TableStart, TableQuestion, TableSpotIt and
 * TableDone): the phone stands up on the table with its outer screen toward
 * the family, about 852 × 393 in landscape. One big card at a time, readable
 * from across the table. Tap anywhere for the next card; nobody types.
 */
export type TableOpen = { kind: "tonight"; tonight: TableTonight } | { kind: "spot" };

const faces = ["tm-f1", "tm-f2", "tm-f3", "tm-f4"];
const art = {
  dinner: "/illustrations/relish/home-dinner-bowls.webp",
  done: "/illustrations/relish/family.webp",
};

export default function TableMode({
  open,
  names,
  owner,
  game,
  busy,
  canNote,
  posture,
  onAction,
  onKeepNote,
  onFinishSpot,
  onLeave,
}: {
  open: TableOpen;
  /** Everyone at the table, the writer first: one turn each. */
  names: string[];
  owner: string;
  /** Spot it!: the round being played. */
  game?: Game;
  busy: boolean;
  /** An adult's journal can add the note to Our family journal; a child's can't. */
  canNote: boolean;
  /** The phone itself stood up (the app saw the hinge): picking it up leaves. */
  posture: boolean;
  onAction: (action: GameAction) => void;
  /** Tonight: keep the one note. Resolves when it's kept. */
  onKeepNote: (names: string[]) => Promise<void>;
  /** Spot it!: finish the card, with or without the note. */
  onFinishSpot: (keepNote: boolean) => void;
  onLeave: () => void;
}) {
  const leave = (
    <button
      type="button"
      className="tm-leave"
      onClick={(e) => {
        e.stopPropagation();
        onLeave();
      }}
    >
      {posture ? "Pick up the phone to leave" : "Leave the table"}
    </button>
  );
  return (
    <div className="tm" role="dialog" aria-modal="true" aria-label="Table mode">
      {open.kind === "tonight" ? (
        <Tonight
          tonight={open.tonight}
          names={names}
          canNote={canNote}
          busy={busy}
          leave={leave}
          onKeepNote={onKeepNote}
          onDone={onLeave}
        />
      ) : game && game.kind === "spot" && game.spot ? (
        <Spot
          game={game}
          owner={owner}
          busy={busy}
          canNote={canNote}
          leave={leave}
          onAction={onAction}
          onFinish={onFinishSpot}
        />
      ) : (
        <div className="tm-card">
          {leave}
          <div className="tm-words">
            <p className="tm-serif tm-title">Starting Spot it!…</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** A card that moves on with a tap anywhere, or Space, Enter or → on a keyboard. */
function TapCard({
  className = "",
  label,
  onNext,
  children,
}: {
  className?: string;
  label: string;
  onNext: () => void;
  children: ReactNode;
}) {
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, [label]);
  return (
    <div
      className={`tm-card tm-tap ${className}`}
      onClick={onNext}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onNext();
        }
      }}
    >
      {children}
      <button
        ref={next}
        type="button"
        className="tm-next"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        {label}
      </button>
    </div>
  );
}

function Dots({ total, at }: { total: number; at: number }) {
  return (
    <span className="tm-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i <= at ? "is-on" : ""} />
      ))}
    </span>
  );
}

function Tonight({
  tonight,
  names,
  canNote,
  busy,
  leave,
  onKeepNote,
  onDone,
}: {
  tonight: TableTonight;
  names: string[];
  canNote: boolean;
  busy: boolean;
  leave: ReactNode;
  onKeepNote: (names: string[]) => Promise<void>;
  onDone: () => void;
}) {
  const turns = tableTurns(names);
  // -1 is the start card; turns.length is the finish card.
  const [at, setAt] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dinner = tonight.at === "at dinner";
  if (at < 0)
    return (
      <TapCard
        className={dinner ? "tm-has-art" : ""}
        label="Tap anywhere to start"
        onNext={() => setAt(turns.length ? 0 : turns.length)}
      >
        {dinner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="tm-art tm-art-soft" src={art.dinner} alt="" aria-hidden="true" />
        )}
        {leave}
        <div className="tm-words">
          <p className="tm-quiet">{tonight.when}</p>
          <h1 className="tm-serif tm-title">{tonight.title}</h1>
          <p className="tm-prompt">{tonight.prompt}</p>
          <p className="tm-serif tm-go" aria-hidden="true">
            <span className="tm-play">▶</span>Tap anywhere to start
          </p>
        </div>
      </TapCard>
    );
  if (at < turns.length) {
    const turn = turns[at];
    const next = turns[at + 1];
    return (
      <TapCard
        className="tm-question"
        label={next ? `Tap for ${next.who}’s question` : "Tap to finish"}
        onNext={() => setAt(at + 1)}
      >
        {leave}
        <p className="tm-turn">
          <span className={`tm-face ${faces[at % faces.length]}`} aria-hidden="true">
            {turn.who.charAt(0).toUpperCase()}
          </span>
          <span className="tm-serif">{turn.who}’s turn to tell</span>
        </p>
        <h1 className="tm-serif tm-ask" aria-live="polite">
          {turn.question}
        </h1>
        <p className="tm-rule">{tonight.prompt}</p>
        <div className="tm-foot">
          <Dots total={turns.length} at={at} />
          <span className="tm-foot-next" aria-hidden="true">
            {next ? `Tap for ${next.who}’s question →` : "Tap to finish →"}
          </span>
        </div>
      </TapCard>
    );
  }
  const told = turns.map((t) => t.who);
  return (
    <div className="tm-card tm-has-art">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="tm-art tm-art-done" src={art.done} alt="" aria-hidden="true" />
      <div className="tm-words">
        <p className="tm-quiet">{tonight.title}</p>
        <h1 className="tm-serif tm-title">That’s everyone. Nicely done.</h1>
        {canNote && told.length > 0 ? (
          <>
            <p className="tm-prompt">
              A note goes in Our family journal: “{tableNoteText(told, tonight.at)}” Nobody’s
              answers are saved.
            </p>
            {error && (
              <p className="tm-error" role="alert">
                {error}
              </p>
            )}
            <div className="tm-actions">
              <button
                type="button"
                className="tm-btn"
                disabled={busy || saving}
                onClick={() => {
                  setSaving(true);
                  setError("");
                  onKeepNote(told)
                    .then(onDone)
                    .catch((e) => {
                      setError(e instanceof Error ? e.message : "The note couldn’t be kept. Try again.");
                      setSaving(false);
                    });
                }}
              >
                {saving ? "Keeping…" : "Keep the note"}
              </button>
              <button type="button" className="tm-btn-quiet" disabled={saving} onClick={onDone}>
                Skip it
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="tm-prompt">Nobody’s answers are saved.</p>
            <div className="tm-actions">
              <button type="button" className="tm-btn" onClick={onDone}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Spot({
  game: g,
  owner,
  busy,
  canNote,
  leave,
  onAction,
  onFinish,
}: {
  game: Game;
  owner: string;
  busy: boolean;
  canNote: boolean;
  leave: ReactNode;
  onAction: (action: GameAction) => void;
  onFinish: (keepNote: boolean) => void;
}) {
  const [square, setSquare] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const started = useRef(false);
  // Table mode skips the card's setup: the phone is already standing up.
  useEffect(() => {
    if (g.stage === "ready" && !started.current && !busy) {
      started.current = true;
      onAction({ type: "start" });
    }
  }, [g.stage, busy, onAction]);
  const { squares, spotted, tally } = spotResult(g.players, g.spot!);
  const badges = spotBadges(g.players);
  if (finishing)
    return (
      <div className="tm-card tm-has-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="tm-art tm-art-done" src={art.done} alt="" aria-hidden="true" />
        <div className="tm-words">
          <p className="tm-quiet">
            Spot it! · {spotted} of {squares.length} spotted
          </p>
          <h1 className="tm-serif tm-title">That’s the card. Nicely spotted.</h1>
          {canNote ? (
            <>
              <p className="tm-prompt">
                A note goes in Our family journal: “{playNoteText(g, owner)}” The card stays in
                your journal.
              </p>
              <div className="tm-actions">
                <button type="button" className="tm-btn" disabled={busy} onClick={() => onFinish(true)}>
                  Keep the note
                </button>
                <button type="button" className="tm-btn-quiet" disabled={busy} onClick={() => onFinish(false)}>
                  Skip it
                </button>
              </div>
            </>
          ) : (
            <div className="tm-actions">
              <button type="button" className="tm-btn" disabled={busy} onClick={() => onFinish(false)}>
                Done
              </button>
            </div>
          )}
          <button type="button" className="tm-link" onClick={() => setFinishing(false)}>
            Back to the card
          </button>
        </div>
      </div>
    );
  const chosen = square === null ? null : squares[square];
  return (
    <div className="tm-card tm-spot">
      {leave}
      <ol className="tm-board" aria-label="Spot it! card">
        {squares.map((sq, i) => {
          const by = sq.by;
          const face = by === null ? "" : by === SPOT_ALL ? "tm-f-all" : faces[by % faces.length];
          return (
            <li key={sq.id}>
              <button
                type="button"
                className={`tm-square ${by !== null ? `is-spotted ${face}` : ""} ${square === i ? "is-chosen" : ""}`}
                aria-pressed={square === i}
                aria-label={by === null ? sq.text : `${sq.text}, called by ${sq.who}`}
                disabled={busy || g.stage !== "choose"}
                onClick={() => setSquare(square === i ? null : i)}
              >
                <span className={by !== null ? "tm-struck" : ""}>{sq.text}</span>
                {by !== null && <span className="tm-by">{by === SPOT_ALL ? "Everyone" : sq.who}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="tm-side">
        <h1 className="tm-serif tm-spot-title">Spot it!</h1>
        <p className="tm-side-help" aria-live="polite">
          {chosen ? `Who called ${chosen.text.charAt(0).toLowerCase()}${chosen.text.slice(1)}?` : "Tap a square, then tap who called it first."}
        </p>
        <div className="tm-players" role="group" aria-label="Who called it">
          {g.players.map((p, i) => {
            const count = tally.find((t) => t.player.id === p.id)?.count ?? 0;
            return (
              <button
                key={p.id}
                type="button"
                className="tm-player"
                disabled={busy || square === null}
                aria-pressed={!!chosen && chosen.by === i}
                onClick={() => {
                  if (square === null) return;
                  onAction({ type: "spot", square, by: chosen?.by === i ? null : i });
                  setSquare(null);
                }}
              >
                <span className={`tm-face tm-face-sm ${faces[i % faces.length]}`} aria-hidden="true">
                  {badges[i]}
                </span>
                <span className="tm-serif">{p.name}</span>
                <b>{count}</b>
              </button>
            );
          })}
        </div>
        <button type="button" className="tm-link" disabled={busy} onClick={() => setFinishing(true)}>
          Done spotting
        </button>
      </div>
    </div>
  );
}
