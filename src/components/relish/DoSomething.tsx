"use client";
import ConfirmDelete from "./ConfirmDelete";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Book } from "@/lib/relish/model";
import {
  doItems,
  gameNames,
  underWay,
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
import { livingOf, gameKinds, type Game, type GameKind, type Player } from "@/lib/relish/living";
import type { NudgeAction } from "@/lib/relish/nudges";
import {
  actionLabel,
  featuredFor,
  featuredWords,
  isPlanCard,
  resumeLabel,
  shelvesFor,
  whoLine,
  type PlanCard,
} from "@/lib/relish/activities";
import type { FamilyPlan, GoalId, PlaceId } from "@/lib/relish/family-plan";
import { toolById } from "@/lib/relish/tools";
import Illustration from "./Illustration";
import FamilyPlanFeature, { type SharedLine } from "./FamilyHome";
import { Progress, underWayArt, when } from "./Home";
import {
  exerciseIllustration,
  gameIllustration,
  type IllustrationName,
} from "./illustrations";
import "./home-acts.css";

/** The picture on a catalog card. */
function itemArt(action: NudgeAction): IllustrationName {
  if (action.kind === "exercise") return exerciseIllustration[action.id] ?? "do-something";
  if (action.kind === "game") return gameIllustration[action.game] ?? "do-something";
  if (action.kind === "reflect") return "think-it-through";
  return "jot";
}
const planArt: Partial<Record<Exclude<GoalId, "own">, IllustrationName>> = {
  laughing: "family",
  disagree: "guided-listen",
  hearing: "same-page",
  mornings: "home",
  oneonone: "guided-joy",
};

type GameItem = DoItem & { action: { kind: "game"; game: Game["kind"] } };
export type PlanFeatureProps = {
  plan: FamilyPlan | undefined;
  owner: string;
  names: string[];
  latestShared?: SharedLine;
  onPlan: (update: (plan: FamilyPlan | undefined) => FamilyPlan | undefined) => Promise<void>;
  onKeep: (line: { text: string; caption: string }) => Promise<string>;
  onReflect: (page: { title: string; text: string }) => Promise<void>;
  onFamilyBook: () => void;
};

/**
 * Activities (Scott, 2026-11-21): one featured thing for this space, what's
 * under way, then the collection on shelves by situation. Every card says
 * what you'll do, with whom, roughly how long, and its action names what
 * happens next ("Play Spot it!", "Keep sorting"). Just me / Our family
 * decides solo or together; a child's book shows only what fits their age.
 */
export default function DoSomething({
  book,
  busy,
  roster,
  headingRef,
  onOpen,
  onResume,
  onStartGame,
  onDiscard,
  onOfflinePlay,
  initialGame,
  together = false,
  planFeature,
}: {
  book: Book;
  /** Opens the game sheet straight away (from a Home suggestion). */
  initialGame?: Game["kind"];
  busy: boolean;
  /** Family players to pre-fill a game with; the book's owner comes first. */
  roster: Player[];
  headingRef: RefObject<HTMLHeadingElement | null>;
  onOpen: (action: NudgeAction) => void;
  /** Reopens something under way. */
  onResume: (item: UnderWay) => void;
  onStartGame: (kind: Game["kind"], players: Player[]) => void;
  /** Ends something under way without keeping it. */
  onDiscard?: (item: UnderWay) => void;
  /** "We did this": a game played without the app. */
  onOfflinePlay?: (kind: GameKind, players: Player[]) => Promise<void>;
  /** Our family: things you do together. */
  together?: boolean;
  /** Our family, an adult's book: the family plan is the featured activity. */
  planFeature?: PlanFeatureProps;
}) {
  const audience = audienceOf(book);
  const [sheet, setSheet] = useState<GameItem | null>(
    () =>
      (doItems(audience).find(
        (i) => i.action.kind === "game" && i.action.game === initialGame,
      ) as GameItem | undefined) ?? null,
  );
  const [shift, setShift] = useState(0);
  const [preview, setPreview] = useState<{ goal: Exclude<GoalId, "own">; place: PlaceId } | undefined>();
  const featureRef = useRef<HTMLDivElement>(null);
  const living = livingOf(book);
  const game =
    living.game && living.game.stage !== "finished" ? living.game : undefined;
  // Under way: in Our family, the games and the car's questions; in Just me,
  // everything of yours. Drafts live in Journal and on Home.
  const going = underWay(book, 8).filter((g) =>
    g.kind === "draft" ? false : together ? g.kind === "game" || g.kind === "day" : true,
  );
  const all = underWay(book, 12);
  const featured =
    together && planFeature ? undefined : featuredFor(audience, all, new Date(), shift);
  // A card that would only reopen something in Pick up stays off the shelves;
  // a game can always start a fresh round.
  const reopens = going.filter((g) => g.kind !== "game").map((g) => g.key);
  const shelves = shelvesFor(audience, together, [...(featured ? [featured.key] : []), ...reopens]);
  function open(item: DoItem) {
    if (item.action.kind !== "game") return onOpen(item.action);
    setSheet(item as GameItem);
  }
  function tryPlan(card: PlanCard) {
    setPreview({ goal: card.goal, place: card.place });
    featureRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 0);
  }
  const words = featured ? featuredWords(featured) : null;
  return (
    <main className="rp-place ha-acts" aria-label="Activities">
      <div ref={featureRef}>
        {together && planFeature ? (
          <FamilyPlanFeature
            {...planFeature}
            busy={busy}
            headingRef={headingRef}
            preview={preview}
            onClearPreview={() => setPreview(undefined)}
          />
        ) : featured && words ? (
          <section className="ha-feature" aria-labelledby="ha-feat">
            <div className="ha-feature-words">
              <p className="ha-quiet">
                Featured this week · {together ? "for the whole family" : "just for you"}
              </p>
              <h1 id="ha-feat" ref={headingRef} tabIndex={-1}>
                {featured.title}
              </h1>
              <p className="ha-feature-lead">{words.lead}</p>
              <p className="ha-feature-small">
                {words.rest && `${words.rest} `}
                {featuredTime(featured, together)}
              </p>
              <div className="ha-feature-actions">
                <button type="button" className="ha-btn" disabled={busy} onClick={() => open(featured)}>
                  <span className="ui-sr-only">{featured.title}: </span>
                  {actionLabel(featured)}
                </button>
                <button type="button" className="ha-link" onClick={() => setShift((n) => n + 1)}>
                  Show me another
                </button>
              </div>
            </div>
            <Illustration
              name={itemArt(featured.action)}
              size={470}
              eager
              className="ha-feature-art"
            />
          </section>
        ) : (
          <h1 id="ha-feat" ref={headingRef} tabIndex={-1} className="ha-quiet-title">
            Activities
          </h1>
        )}
      </div>
      {!!going.length && (
        <section className="ha-section" aria-labelledby="ha-pick">
          <h2 id="ha-pick" className="ha-quiet-head">
            Pick up where you left off
          </h2>
          <ul className="ha-picks">
            {going.map((g) => (
              <li key={`${g.kind}:${g.key}`}>
                <div className="ha-row">
                  <Illustration name={underWayArt(g)} size={72} className="ha-row-art" />
                  <span className="ha-row-words">
                    <span className="ha-row-title">{g.title}</span>
                    <Progress book={book} item={g} />
                  </span>
                  <span className="ha-row-actions">
                    <button
                      type="button"
                      className="ha-link"
                      disabled={busy}
                      onClick={() => onResume(g)}
                    >
                      <span className="ui-sr-only">
                        {g.title}
                        {g.detail ? ` · ${g.detail}` : ""}:{" "}
                      </span>
                      {resumeLabel(g)}
                    </button>
                    {onDiscard && (
                      <ConfirmDelete
                        label="Let it go"
                        icon={false}
                        ariaLabel={`Let ${g.title} go`}
                        question={
                          g.kind === "game"
                            ? "End this round without keeping it?"
                            : g.kind === "habit"
                              ? "Stop and discard this progress?"
                              : "Set this aside without keeping it?"
                        }
                        detail={
                          g.kind === "game"
                            ? "Its answers are let go. This can’t be undone."
                            : "This can’t be undone."
                        }
                        yes={g.kind === "game" ? "Yes, end it" : "Yes, let it go"}
                        busy={busy}
                        className="ha-link ha-link-quiet"
                        onConfirm={() => onDiscard(g)}
                      />
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {shelves.map((shelf) => (
        <section key={shelf.id} className="ha-section" aria-labelledby={`ha-shelf-${shelf.id}`}>
          <h2 id={`ha-shelf-${shelf.id}`}>{shelf.title}</h2>
          <ul className="ha-shelf" aria-label={shelf.title}>
            {shelf.cards.map((card) =>
              isPlanCard(card) ? (
                <li key={card.key}>
                  <Card
                    art={planArt[card.goal] ?? "family"}
                    title={card.title}
                    line={card.line}
                    who={card.who}
                    action={card.action}
                    busy={busy}
                    onGo={() => tryPlan(card)}
                  />
                </li>
              ) : (
                <li key={card.key}>
                  <Card
                    art={itemArt(card.action)}
                    title={card.title}
                    line={card.line}
                    who={`${whoLine(card, together)}${doneLine(book, card)}`}
                    action={continuing(card, all) ?? actionLabel(card)}
                    busy={busy}
                    onGo={() => {
                      const g = all.find((x) => x.key === card.key && x.kind !== "draft");
                      if (g && g.kind !== "game") return onResume(g);
                      open(card);
                    }}
                  />
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
      {onOfflinePlay && (
        <OfflinePlay roster={roster} busy={busy} onSave={onOfflinePlay} />
      )}
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

/** "You'll leave with … About 2 minutes, only you see it." */
function featuredTime(item: DoItem, together: boolean) {
  const tool = item.action.kind === "exercise" ? toolById(item.action.id) : undefined;
  const time = tool ? tool.time : item.time.charAt(0).toUpperCase() + item.time.slice(1);
  if (item.action.kind === "game") return `${time}, together.`;
  return `${time}${together ? "." : ", only you see it."}`;
}
/** "Keep sorting" on a card for something already under way. */
function continuing(card: DoItem, all: UnderWay[]) {
  const g = all.find((x) => x.key === card.key && x.kind !== "draft" && x.kind !== "game");
  return g ? resumeLabel(g) : undefined;
}
/** " · done Monday", for an exercise kept in the last week. */
function doneLine(book: Book, card: DoItem) {
  if (card.action.kind !== "exercise") return "";
  const id = card.action.id;
  const kept = (book.journal || [])
    .filter((e) => e.status === "kept" && e.source?.kind === "exercise" && e.source.toolId === id)
    .at(-1);
  if (!kept || Date.now() - Date.parse(kept.createdAt) > 6 * 86_400_000) return "";
  return ` · done ${when(kept.createdAt)}`;
}

function Card({
  art,
  title,
  line,
  who,
  action,
  busy,
  onGo,
}: {
  art: IllustrationName;
  title: string;
  line: string;
  who: string;
  action: string;
  busy: boolean;
  onGo: () => void;
}) {
  return (
    <article className="ha-card">
      <Illustration name={art} size="100%" className="ha-card-art" />
      <div className="ha-card-body">
        <h3 className="ha-card-title">{title}</h3>
        <p className="ha-card-line">{line}</p>
        <span className="ha-card-who">{who}</span>
        <button type="button" className="ha-card-go" disabled={busy} onClick={onGo}>
          <span className="ui-sr-only">{title}: </span>
          {action}
        </button>
      </div>
    </article>
  );
}

/** "Did something without the app?": a game played out loud counts too. */
function OfflinePlay({
  roster,
  busy,
  onSave,
}: {
  roster: Player[];
  busy: boolean;
  onSave: (kind: GameKind, players: Player[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GameKind | "">("");
  const [out, setOut] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const players = roster.filter((p) => !out.includes(p.id));
  return (
    <section className="ha-offline" aria-labelledby="ha-offline-title">
      <h2 id="ha-offline-title" className="ha-quiet">
        Did something without the app?
      </h2>
      <div className="ha-row">
        <Illustration name="same-page" size={72} className="ha-row-art" />
        <span className="ha-row-words">
          <span className="ha-row-title">Played a game together</span>
          <span className="ha-row-detail">Out loud, in the car, at dinner</span>
        </span>
        <span className="ha-row-actions">
          <button
            type="button"
            className="ha-link"
            aria-expanded={open}
            aria-controls="ha-offline-form"
            onClick={() => {
              setOpen((o) => !o);
              setDone("");
            }}
          >
            We did this
          </button>
        </span>
      </div>
      {done && (
        <p className="ha-quiet" role="status">
          {done}
        </p>
      )}
      {open && (
        <form
          id="ha-offline-form"
          className="ha-offline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!kind || players.length < 2 || saving) return;
            setSaving(true);
            setError("");
            onSave(kind, players)
              .then(() => {
                setDone(`Noted: played ${gameNames[kind]} today.`);
                setOpen(false);
                setKind("");
                setOut([]);
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : "That couldn’t be noted. Try again."),
              )
              .finally(() => setSaving(false));
          }}
        >
          <fieldset>
            <legend>Which game?</legend>
            {gameKinds.map((k) => (
              <button
                key={k}
                type="button"
                className="ui-chip"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {gameNames[k]}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend>Who played? Tap to leave someone out.</legend>
            {roster.map((p) => {
              const on = !out.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="ui-chip"
                  aria-pressed={on}
                  onClick={() => setOut(on ? [...out, p.id] : out.filter((x) => x !== p.id))}
                >
                  {p.name}
                </button>
              );
            })}
          </fieldset>
          {error && (
            <p className="lb-error" role="alert">
              {error}
            </p>
          )}
          <div className="ha-row-actions-inline">
            <button
              type="submit"
              className="ha-btn"
              disabled={busy || saving || !kind || players.length < 2}
            >
              {saving ? "Saving…" : "Note it as played today"}
            </button>
            {players.length < 2 && <span className="ha-quiet">Choose at least two people.</span>}
          </div>
        </form>
      )}
    </section>
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
            <span className="rp-eyebrow">{whoLine(item)}</span>
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
