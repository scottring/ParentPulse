"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ageLabels } from "@/lib/relish/profiles";
import type { Book } from "@/lib/relish/model";
import {
  cleanSquare,
  PLACE_LIMIT,
  SPOT_ALL,
  SQUARE_LIMIT,
  spotLines,
  spotResult,
  spotSummary,
  type Game,
  type GameAction,
  type Player,
} from "@/lib/relish/living";

// Spot it!: one passenger holds the phone, reads the card aloud and taps.
// Everyone else calls things out. Each tap is saved in the book straight
// away, so a locked phone or a reload mid-drive loses nothing.

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const list = (items: string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** A short mark for each player: an initial, or more letters when two share one. */
export function spotBadges(players: Pick<Player, "name">[]) {
  const letters = (name: string, n: number) =>
    name.trim().slice(0, n).toLocaleUpperCase();
  return players.map((p) => {
    for (let n = 1; n < 4; n++) {
      const mark = letters(p.name, n);
      if (players.filter((q) => letters(q.name, n) === mark).length === 1)
        return n === 1 ? mark : mark.charAt(0) + mark.slice(1).toLocaleLowerCase();
    }
    return p.name.trim();
  });
}

/** "Where are you headed?" A few words; optional. */
function PlaceInput({
  value,
  busy,
  onChange,
}: {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>
        Where are you headed? <small>· optional</small>
      </span>
      <input
        value={value}
        maxLength={PLACE_LIMIT}
        placeholder="Grandma’s"
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * One square in your own words: "A purple car". The card's other squares
 * can't go on twice; an empty field is not a square.
 */
function SquareEditor({
  game: g,
  square,
  label,
  busy,
  onAction,
  onClose,
}: {
  game: Game;
  square: number;
  label: string;
  busy: boolean;
  onAction: (action: GameAction) => void;
  onClose: () => void;
}) {
  const squares = spotResult(g.players, g.spot!).squares;
  const sq = squares[square];
  const [text, setText] = useState(sq.own ? sq.text : "");
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    field.current?.focus();
  }, []);
  const clean = cleanSquare(text);
  const taken =
    !!clean &&
    squares.some(
      (x, i) => i !== square && x.text.toLocaleLowerCase() === clean.toLocaleLowerCase(),
    );
  return (
    <form
      className="lb-spot-edit"
      onSubmit={(e) => {
        e.preventDefault();
        if (!clean || taken || busy) return;
        if (clean !== (sq.own ? sq.text : "")) onAction({ type: "write", square, text: clean });
        onClose();
      }}
    >
      <label>
        <span>{label}</span>
        <input
          ref={field}
          value={text}
          maxLength={SQUARE_LIMIT}
          placeholder={sq.own ? "" : sq.text}
          autoComplete="off"
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className="lb-fine" aria-live="polite">
        {taken
          ? "That one is already on the card."
          : g.stage === "choose" && sq.by !== null
            ? sq.by === SPOT_ALL
              ? "Something new to spot, so nobody has spotted it yet."
              : `Something new to spot, so ${sq.who} hasn’t spotted it yet.`
            : "Anything you might see on the way, in a few words."}
      </p>
      <div className="lb-turn-foot">
        <button className="lb-primary" disabled={busy || !clean || taken}>
          Use this
        </button>
        {sq.own && (
          <button
            type="button"
            className="lb-text"
            disabled={busy}
            onClick={() => {
              onAction({ type: "write", square, text: "" });
              onClose();
            }}
          >
            Put the card’s square back
          </button>
        )}
        <button type="button" className="lb-text" disabled={busy} onClick={onClose}>
          Never mind
        </button>
      </div>
    </form>
  );
}

/** The card before anyone starts: swap any square, say where you're headed. */
export function SpotSetup({
  game: g,
  book,
  busy,
  onAction,
  onCancel,
}: {
  game: Game;
  book: Book;
  busy: boolean;
  onAction: (action: GameAction) => void;
  onCancel: () => void;
}) {
  const { squares } = spotResult(g.players, g.spot!);
  const [place, setPlace] = useState(g.place || "");
  /** The square being changed to the family's own words. */
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <>
      <h2>Spot it!</h2>
      <p className="lb-spot-rule">
        Call it out when you see one. Whoever spots it first gets the square.
      </p>
      <ol className="lb-spot-card is-setup" aria-label="Your card">
        {squares.map((sq, i) => (
          <li key={sq.id} className={[sq.own ? "is-own" : "", editing === i ? "is-editing" : ""].join(" ").trim() || undefined}>
            <span className="lb-spot-text">{sq.text}</span>
            <span className="lb-spot-tools">
              <button
                type="button"
                className="lb-spot-swap"
                disabled={busy}
                aria-label={`Swap this one: ${sq.text}`}
                onClick={() => {
                  setEditing(null);
                  onAction({ type: "swap", square: i });
                }}
              >
                Swap
              </button>
              <button
                type="button"
                className="lb-spot-swap"
                disabled={busy}
                aria-label={`Change this square: ${sq.text}`}
                aria-expanded={editing === i}
                onClick={() => setEditing(editing === i ? null : i)}
              >
                Change
              </button>
            </span>
          </li>
        ))}
      </ol>
      {editing !== null && (
        <SquareEditor
          key={editing}
          game={g}
          square={editing}
          label={`Instead of “${squares[editing].text}”`}
          busy={busy}
          onAction={onAction}
          onClose={() => setEditing(null)}
        />
      )}
      <div className="lb-spot-place">
        <PlaceInput value={place} busy={busy} onChange={setPlace} />
      </div>
      <div className="lb-actions">
        <button
          className="lb-primary"
          disabled={busy}
          onClick={() => onAction({ type: "start", place })}
        >
          Start spotting <ArrowRight size={16} />
        </button>
        <button className="lb-text" disabled={busy} onClick={onCancel}>
          Change who’s in the car
        </button>
      </div>
      <p className="lb-fine lb-setup-note">
        Whoever holds the phone reads the card aloud and taps. Every tap is
        saved, and the card stays with this round in {book.owner}’s book (never
        sent to AI).
        {g.audience
          ? ` Squares picked for ${g.audience === "under-6" ? "under-6s" : g.audience === "adult" ? "grown-ups" : ageLabels[g.audience].toLowerCase()}.`
          : ""}
      </p>
    </>
  );
}

/** The card while you drive: tap a square, then tap who spotted it. */
export function SpotBoard({
  game: g,
  busy,
  onAction,
  onPause,
}: {
  game: Game;
  busy: boolean;
  onAction: (action: GameAction) => void;
  onPause: () => void;
}) {
  const card = g.spot!;
  const [picking, setPicking] = useState<number | null>(null);
  /** Changing the open square to the family's own words. */
  const [changing, setChanging] = useState(false);
  const returnTo = useRef<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const squareRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { squares, spotted } = spotResult(g.players, card);
  const badges = spotBadges(g.players);
  const lines = spotLines(card);
  useEffect(() => {
    if (picking !== null) heading.current?.focus();
    else if (returnTo.current !== null) {
      squareRefs.current[returnTo.current]?.focus();
      returnTo.current = null;
    }
  }, [picking]);
  function close(square: number) {
    returnTo.current = square;
    setChanging(false);
    setPicking(null);
  }
  if (picking !== null) {
    const sq = squares[picking];
    const pick = (by: number | null) => {
      if (by !== sq.by) onAction({ type: "spot", square: picking, by });
      close(picking);
    };
    if (changing)
      return (
        <div className="lb-spot-who">
          <p className="lb-kicker">Spot it! · {sq.text}</p>
          <h2>Change this square</h2>
          <SquareEditor
            game={g}
            square={picking}
            label="Your own square"
            busy={busy}
            onAction={onAction}
            onClose={() => close(picking)}
          />
        </div>
      );
    return (
      <div className="lb-spot-who">
        <p className="lb-kicker">Spot it! · {sq.text}</p>
        <h2 ref={heading} tabIndex={-1}>
          Who spotted {sq.own ? sq.text : lower(sq.text)}?
        </h2>
        <div className="lb-spot-names" role="group" aria-label="Who spotted it">
          {g.players.map((p, i) => (
            <button
              key={p.id}
              disabled={busy}
              aria-pressed={sq.by === i}
              onClick={() => pick(i)}
            >
              {p.name}
            </button>
          ))}
          <button
            disabled={busy}
            aria-pressed={sq.by === SPOT_ALL}
            onClick={() => pick(SPOT_ALL)}
          >
            We all did
          </button>
        </div>
        <div className="lb-turn-foot">
          {sq.by !== null && (
            <button className="lb-text" disabled={busy} onClick={() => pick(null)}>
              Not spotted yet
            </button>
          )}
          <button className="lb-text" disabled={busy} onClick={() => setChanging(true)}>
            Change this square
          </button>
          <button className="lb-text" disabled={busy} onClick={() => close(picking)}>
            Back to the card
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="lb-session-line">
        <div>
          <p className="lb-kicker">
            Spot it!{g.place ? ` · on the way to ${g.place}` : ""}
          </p>
          <p>
            {spotted} of {squares.length} spotted
          </p>
        </div>
        <button className="lb-text" disabled={busy} onClick={onPause}>
          Pause here
        </button>
      </div>
      <h2 className="ui-sr-only">Your card</h2>
      <ol className="lb-spot-card is-playing" aria-label="Your card">
        {squares.map((sq, i) => (
          <li key={sq.id}>
            <button
              ref={(el) => {
                squareRefs.current[i] = el;
              }}
              disabled={busy}
              aria-pressed={sq.by !== null}
              aria-label={
                sq.by === null ? sq.text : `${sq.text}, spotted by ${sq.who}`
              }
              onClick={() => setPicking(i)}
            >
              <span className="lb-spot-text">{sq.text}</span>
              {sq.by !== null && (
                <span className="lb-spot-badge" aria-hidden="true">
                  {sq.by === SPOT_ALL ? "All" : badges[sq.by]}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <p className="lb-spot-cheer" aria-live="polite">
        {spotted === squares.length
          ? "The whole card. Well spotted!"
          : lines === 1
            ? "A full line!"
            : lines > 1
              ? `${lines} full lines!`
              : ""}
      </p>
      <div className="lb-spot-foot">
        <button
          className="lb-secondary"
          disabled={busy}
          onClick={() => onAction({ type: "done" })}
        >
          Done spotting
        </button>
        <p className="lb-fine">
          Tap a square when someone calls it out. Stop whenever you like.
        </p>
      </div>
    </>
  );
}

/** The kept card: what was spotted and by whom, then who spotted the most. */
export function SpotReveal({
  game: g,
  busy,
  onAction,
}: {
  game: Game;
  busy: boolean;
  onAction: (action: GameAction) => void;
}) {
  const card = g.spot!;
  const { squares, spotted, together } = spotResult(g.players, card);
  const found = squares.filter((x) => x.by !== null);
  const missed = squares.filter((x) => x.by === null);
  const [place, setPlace] = useState("");
  return (
    <>
      <p className="lb-kicker">
        Spot it!{g.place ? ` · on the way to ${g.place}` : ""}
      </p>
      <h2>Your road-trip card</h2>
      {found.length ? (
        <ol className="lb-spot-card is-reveal" aria-label="What you spotted">
          {found.map((sq) => (
            <li key={sq.id}>
              <span className="lb-spot-text">{sq.text}</span>
              <span className="lb-spot-by">{sq.who}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p>Nothing spotted this time. Keep the card for the drive home.</p>
      )}
      {found.length > 0 && (
        <p className="lb-tally">
          {spotSummary(g.players, card)}
          <span className="lb-tally-all">
            {spotted} of {squares.length} spotted
            {together ? ` · ${together} together` : ""}
            {missed.length && missed.length <= 4
              ? ` · still out there: ${list(missed.map((x) => (x.own ? x.text : lower(x.text))))}`
              : ""}
          </span>
        </p>
      )}
      {!g.place && g.stage === "reveal" && (
        <form
          className="lb-spot-place"
          onSubmit={(e) => {
            e.preventDefault();
            if (place.trim()) onAction({ type: "place", place });
          }}
        >
          <PlaceInput value={place} busy={busy} onChange={setPlace} />
          <button className="lb-secondary" disabled={busy || !place.trim()}>
            Add to the card
          </button>
        </form>
      )}
    </>
  );
}
