"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Book } from "@/lib/relish/model";
import {
  doFilters,
  doItems,
  doLabel,
  gameNames,
  matchesFilter,
  onlyReopens,
  underWay,
  type DoFilter,
  type DoItem,
  type UnderWay,
} from "@/lib/relish/catalog";
import {
  ageBands,
  ageLabels,
  audienceOf,
  youngestAudience,
  type Audience,
} from "@/lib/relish/profiles";
import { livingOf, type Game, type Player } from "@/lib/relish/living";
import type { JournalEntry } from "@/lib/relish/journal";
import type { NudgeAction } from "@/lib/relish/nudges";
import Illustration from "./Illustration";
import {
  exerciseIllustration,
  gameIllustration,
  type IllustrationName,
} from "./illustrations";

/** The picture on a catalog card. */
function itemArt(action: NudgeAction): IllustrationName {
  if (action.kind === "exercise") return exerciseIllustration[action.id] ?? "do-something";
  if (action.kind === "game") return gameIllustration[action.game] ?? "do-something";
  if (action.kind === "reflect") return "think-it-through";
  return "jot";
}

type GameItem = DoItem & { action: { kind: "game"; game: Game["kind"] } };

export default function DoSomething({
  book,
  filter,
  busy,
  roster,
  headingRef,
  onFilter,
  onOpen,
  onDraft,
  onResumeGame,
  onStartGame,
  initialGame,
}: {
  book: Book;
  filter: DoFilter;
  /** Opens the game sheet straight away (from a Home suggestion). */
  initialGame?: Game["kind"];
  busy: boolean;
  /** Family players to pre-fill a game with; the book's owner comes first. */
  roster: Player[];
  headingRef: RefObject<HTMLHeadingElement | null>;
  onFilter: (filter: DoFilter) => void;
  onOpen: (action: NudgeAction) => void;
  /** Reopens an unfinished journal page. */
  onDraft: (draft: JournalEntry) => void;
  onResumeGame: () => void;
  onStartGame: (kind: Game["kind"], players: Player[]) => void;
}) {
  const audience = audienceOf(book);
  const [sheet, setSheet] = useState<GameItem | null>(
    () =>
      (doItems(audience).find(
        (i) => i.action.kind === "game" && i.action.game === initialGame,
      ) as GameItem | undefined) ?? null,
  );
  const living = livingOf(book);
  const game =
    living.game && living.game.stage !== "finished" ? living.game : undefined;
  // Under way: not filtered, newest first. Cards that would only reopen one
  // of these stay out of the grid; a game or a journal page can start fresh.
  const going = underWay(book);
  const all = doItems(audience).filter((item) => !onlyReopens(item, going));
  const shown = all.filter((item) => matchesFilter(item, filter));
  function resume(g: UnderWay) {
    if (g.kind === "game") onResumeGame();
    else if (g.kind === "visit") onOpen({ kind: "reflect" });
    else if (g.kind === "draft") onDraft(g.draft);
    else onOpen({ kind: "exercise", id: g.toolId });
  }
  return (
    <main className="rp-place rp-do" aria-labelledby="rp-do-title">
      <div className="rp-place-head">
        <h1 id="rp-do-title" ref={headingRef} tabIndex={-1}>
          What feels right?
        </h1>
        <Illustration name="do-something" size={110} eager className="rp-place-art" />
      </div>
      {!!going.length && (
        <section className="rp-resume" aria-labelledby="rp-resume-title">
          <h2 id="rp-resume-title">Pick up where you left off</h2>
          <ul>
            {going.map((g) => (
              <li key={`${g.kind}:${g.key}`}>
                <button
                  className="rp-resume-item"
                  disabled={busy}
                  onClick={() => resume(g)}
                >
                  <span className="rp-resume-name">
                    {g.title}
                    {g.detail && <span className="rp-resume-detail"> · {g.detail}</span>}
                  </span>
                  <span className="rp-resume-action">
                    {g.label} <span aria-hidden="true">→</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section
        className="rp-stack rp-do-new"
        aria-labelledby={going.length ? "rp-do-new-title" : undefined}
      >
        {!!going.length && <h2 id="rp-do-new-title">New activities</h2>}
        <div
          className="rp-chips"
          role="group"
          aria-label="Filter by time or mood"
        >
          {doFilters
            .filter((f) => audience === "adult" || f.id !== "kids")
            .map((f) => (
              <button
                key={f.id}
                aria-pressed={filter === f.id}
                onClick={() => onFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
        </div>
        <p className="rp-quiet rp-do-count" aria-live="polite">
          {filter === "all"
            ? ""
            : `${shown.length} ${shown.length === 1 ? "activity fits" : "activities fit"}.`}
        </p>
        {!shown.length && (
          <div className="rp-quiet rp-empty-filter">
            <p>Nothing here for this filter yet.</p>
            <button className="ui-link" onClick={() => onFilter("all")}>
              Show all activities
            </button>
          </div>
        )}
        <ul className="rp-do-grid" aria-label="Activities">
          {shown.map((item) => (
            <li key={item.key}>
              <button
                className="rp-do-card"
                disabled={busy}
                onClick={() => {
                  if (item.action.kind !== "game") return onOpen(item.action);
                  setSheet(item as GameItem);
                }}
              >
                <span className="rp-do-art">
                  <Illustration name={itemArt(item.action)} size={88} />
                </span>
                <span className="rp-do-text">
                  <span className="rp-do-title">{item.title}</span>
                  <span className="rp-do-line">{item.line}</span>
                  <span className="rp-do-meta">
                    {doLabel(item)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {sheet && (
        <GameSheet
          item={sheet}
          book={book}
          roster={roster}
          busy={busy}
          replacing={game ? gameNames[game.kind] : undefined}
          onClose={() => setSheet(null)}
          onStart={(players) => onStartGame(sheet.action.game, players)}
        />
      )}
    </main>
  );
}

function GameSheet({
  item,
  book,
  roster,
  busy,
  replacing,
  onClose,
  onStart,
}: {
  item: GameItem;
  book: Book;
  roster: Player[];
  busy: boolean;
  replacing?: string;
  onClose: () => void;
  onStart: (players: Player[]) => void;
}) {
  const [guests, setGuests] = useState<Player[]>([]);
  const [out, setOut] = useState<string[]>([]);
  const [ages, setAges] = useState<Record<string, Audience | "">>({});
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  const everyone = [...roster, ...guests].map((p) => ({
    ...p,
    audience: p.audience || ages[p.id] || undefined,
  }));
  const players = everyone.filter((p) => !out.includes(p.id));
  const youngest = youngestAudience([
    ...players,
    ...(book.profile?.kind === "child" ? [{ audience: book.profile.ageBand }] : []),
  ]);
  function addGuest() {
    const value = name.trim();
    if (
      !value ||
      everyone.some((p) => p.name.toLowerCase() === value.toLowerCase())
    )
      return setError("Choose a different name so each turn is clear.");
    if (everyone.length >= 12)
      return setError("A game can have up to 12 players.");
    const id = crypto.randomUUID();
    setGuests([...guests, { id, name: value }]);
    setName("");
    setError("");
    setAdding(false);
  }
  return (
    <div className="rp-sheet-backdrop" onClick={onClose}>
      <div
        ref={dialog}
        className="rp-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rp-sheet-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rp-sheet-head">
          <Illustration
            name={itemArt(item.action)}
            size={96}
            eager
            className="rp-sheet-art"
          />
          <div>
            <span className="rp-eyebrow">{doLabel(item)}</span>
            <h2 id="rp-sheet-title">{item.title}</h2>
            <p>{item.blurb}</p>
          </div>
          <button className="rp-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <fieldset className="rp-players">
          <legend>
            {item.action.game === "spot" ? "Who’s in the car?" : "Who’s playing?"}{" "}
            Tap to leave someone out.{" "}
            <span className="rp-player-count" aria-live="polite">
              {players.length} playing · needs 2 to 12
            </span>
          </legend>
          <div className="rp-chips">
            {everyone.map((p) => {
              const on = !out.includes(p.id);
              return (
                <button
                  key={p.id}
                  aria-pressed={on}
                  onClick={() =>
                    setOut(on ? [...out, p.id] : out.filter((x) => x !== p.id))
                  }
                >
                  {on ? "✓ " : ""}
                  {p.name}
                </button>
              );
            })}
            {!adding && (
              <button className="rp-chip-add" onClick={() => setAdding(true)}>
                + Someone visiting
              </button>
            )}
          </div>
          {adding && (
            <form
              className="rp-guest"
              onSubmit={(e) => {
                e.preventDefault();
                addGuest();
              }}
            >
              <label>
                Their name for this game
                <input
                  autoFocus
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="rp-btn rp-btn-olive" disabled={!name.trim()}>
                Add
              </button>
            </form>
          )}
          {error && (
            <p className="lb-error" role="alert">
              {error}
            </p>
          )}
          <p className="rp-quiet">
            {item.action.game === "spot" ? "Squares" : "Prompts"} fit the youngest player
            {players.some((p) => !p.audience)
              ? "; without ages we use the simplest ones"
              : ` (${ageLabels[youngest]})`}
            . Anyone can pass.
          </p>
          {players.some((p) => !p.audience) && (
            <details className="rp-ages">
              <summary>Set ages for better prompts</summary>
              {players
                .filter((p) => p.id !== "owner")
                .map((p) => (
                  <label key={p.id}>
                    {p.name}
                    <select
                      aria-label={`Age range for ${p.name}`}
                      value={ages[p.id] || ""}
                      onChange={(e) =>
                        setAges({ ...ages, [p.id]: e.target.value as Audience })
                      }
                    >
                      <option value="">Not sure · simplest prompts</option>
                      {[...ageBands, "adult" as const].map((a) => (
                        <option key={a} value={a}>
                          {ageLabels[a]}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
            </details>
          )}
        </fieldset>
        {replacing && (
          <p className="rp-quiet">
            This ends your unfinished round of {replacing}.
          </p>
        )}
        <button
          className="rp-btn rp-btn-olive rp-sheet-start"
          disabled={busy || players.length < 2 || players.length > 12}
          onClick={() => onStart(players)}
        >
          {item.action.game === "spot"
            ? "Start · one phone, read aloud"
            : "Start game · pass the device around"}
        </button>
        {players.length < 2 && (
          <p className="rp-quiet">Choose at least two players.</p>
        )}
      </div>
    </div>
  );
}
