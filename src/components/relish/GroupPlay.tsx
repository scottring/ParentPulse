"use client";
import { useState } from "react";
import { Hand, Check, Users, ArrowRight } from "lucide-react";
import {
  ageBands,
  ageLabels,
  audienceOf,
  youngestAudience,
  type Audience,
} from "@/lib/relish/profiles";
import type { Book } from "@/lib/relish/model";
import {
  type Game,
  type GameAction,
  type Player,
  gamePlayer,
  gameText,
  joyOptions,
  storyRounds,
  turnCount,
} from "@/lib/relish/living";

export default function GroupPlay({
  book,
  game,
  busy,
  onCreate,
  onAction,
  onKeep,
  onPause,
  onFinish,
  onCancel,
}: {
  book: Book;
  game?: Game;
  busy: boolean;
  onCreate: (kind: Game["kind"], players: Player[]) => void;
  onAction: (action: GameAction) => void;
  onKeep: () => void;
  onPause: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const people: Player[] = [
    { id: "owner", name: book.owner, audience: audienceOf(book) },
    ...book.people.map((p) => ({ id: p.id, name: p.name })),
  ];
  const family = people.filter(
    (p) =>
      p.id === "owner" ||
      book.people.some(
        (person) =>
          person.id === p.id &&
          [
            "partner",
            "child",
            "parent",
            "sibling",
            "son",
            "daughter",
            "mother",
            "father",
          ].includes(person.role.toLowerCase()),
      ),
  );
  const [guests, setGuests] = useState<Player[]>([]),
    [selected, setSelected] = useState(family.map((p) => p.id)),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const [firstPlayer, setFirstPlayer] = useState(game?.players[0].id || "");
  const [ages, setAges] = useState<Record<string, Audience | "">>({});
  const roster = [...people, ...guests].map((p) => ({
      ...p,
      audience: p.id === "owner" ? p.audience : ages[p.id] || undefined,
    })),
    players = roster.filter((p) => selected.includes(p.id));
  const audience = youngestAudience([
    ...players,
    ...(book.profile?.kind === "child"
      ? [{ audience: book.profile.ageBand }]
      : []),
  ]);
  function addGuest() {
    const value = name.trim();
    if (
      !value ||
      roster.some((p) => p.name.toLowerCase() === value.toLowerCase())
    ) {
      setError("Choose a distinct name so each turn is clear.");
      return;
    }
    if (roster.length >= 12) {
      setError("This game supports up to 12 players.");
      return;
    }
    const guest = { id: crypto.randomUUID(), name: value };
    setGuests([...guests, guest]);
    setSelected([...selected, guest.id]);
    setName("");
    setError("");
  }
  if (!game)
    return (
      <section className="lb-play-setup">
        <p className="lb-kicker">Pass & play · one device</p>
        <h2>Room for every voice.</h2>
        <p>
          Choose the whole group or just a few people. One round together is
          enough.
        </p>
        <fieldset>
          <legend>Who’s playing?</legend>
          <div className="lb-actions">
            <button
              className="lb-text"
              onClick={() => setSelected(family.map((p) => p.id))}
            >
              Whole family · {family.length}
            </button>
            <span className="lb-fine">{selected.length} selected</span>
          </div>
          <div className="lb-players">
            {roster.map((p) => (
              <button
                key={p.id}
                aria-pressed={selected.includes(p.id)}
                onClick={() =>
                  setSelected(
                    selected.includes(p.id)
                      ? selected.filter((id) => id !== p.id)
                      : [...selected, p.id],
                  )
                }
              >
                {selected.includes(p.id) ? (
                  <Check size={15} />
                ) : (
                  <Users size={15} />
                )}{" "}
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>
        <form
          className="lb-guest"
          onSubmit={(e) => {
            e.preventDefault();
            addGuest();
          }}
        >
          <label>
            Someone else is joining
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Name for this game"
            />
          </label>
          <button className="lb-secondary" disabled={!name.trim()}>
            Add player
          </button>
        </form>
        <fieldset>
          <legend>Make this round fit everyone</legend>
          <div className="lb-player-ages">
            {players.map((p) => (
              <label key={p.id}>
                {p.name} · age range
                <select
                  aria-label={`Age range for ${p.name}`}
                  value={p.audience || ""}
                  disabled={p.id === "owner"}
                  onChange={(e) =>
                    setAges({
                      ...ages,
                      [p.id]: e.target.value as Audience | "",
                    })
                  }
                >
                  <option value="">Not specified · simplest prompts</option>
                  {[...ageBands, "adult" as const].map((a) => (
                    <option key={a} value={a}>
                      {ageLabels[a]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="lb-age-cue">
            {ageLabels[audience]} · This round uses the youngest selected range.
            An unspecified age uses our simplest prompts. For little ones, a
            grown-up reads and helps them choose; anyone can pass.
          </p>
        </fieldset>
        {error && (
          <p className="lb-error" role="alert">
            {error}
          </p>
        )}
        <div className="lb-game-options">
          <button
            disabled={busy || players.length < 2 || players.length > 12}
            onClick={() => onCreate("joy", players)}
          >
            <span className="lb-kicker">About 5 minutes</span>
            <h3>Guess my small joy</h3>
            <p>One person chooses; everyone else guesses. Reveal together.</p>
            <ArrowRight size={18} />
          </button>
          <button
            disabled={busy || players.length < 2 || players.length > 12}
            onClick={() => onCreate("story", players)}
          >
            <span className="lb-kicker">About 5–10 minutes</span>
            <h3>One story, many voices</h3>
            <p>
              Build an unlikely adventure. Everyone gets a turn to shape it.
            </p>
            <ArrowRight size={18} />
          </button>
        </div>
        {players.length < 2 && (
          <p className="lb-fine">
            Choose at least two people to begin. Add a player above if someone
            is visiting.
          </p>
        )}
        <p className="lb-fine">
          Adding a player does not create an account or open their private
          pages.
        </p>
      </section>
    );
  const g = game,
    total = turnCount(g),
    rounds = storyRounds(g.players.length, g.audience),
    joyChoices = joyOptions(g),
    text = gameText(g),
    finished = ["reveal", "kept", "finished"].includes(g.stage);
  const next = gamePlayer(g);
  return (
    <section className="lb-game" aria-label="Our game">
      <div className="lb-session-line">
        <div>
          <p className="lb-kicker">
            {finished
              ? "Your stopping point is here"
              : "This visit · one round together"}
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
          <h2>
            {g.kind === "joy" ? "Guess my small joy" : "One story, many voices"}
          </h2>
          <p>
            {g.kind === "joy"
              ? "One person chooses a joy in private. Pass the device so everyone else can guess. All choices are revealed together."
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
            {g.kind === "joy"
              ? "The choices so far are hidden. Hand the device over before continuing."
              : "It is your turn to add to the story. Passing is welcome too."}
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
            {g.kind === "joy"
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
            {(g.kind === "joy" ? joyChoices : rounds[g.turn].choices).map(
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
            {g.kind === "joy" ? "The reveal" : "Made around the circle"}
          </p>
          <h2>
            {text
              ? g.kind === "joy"
                ? "Something to know about each other."
                : "Our unlikely adventure."
              : "There is room to pass."}
          </h2>
          {g.kind === "joy" && text ? (
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
              Choosing to pass is a complete choice. Nothing else is needed.
            </p>
          )}
          <div className="lb-boundary">
            <strong>A good place to stop</strong>
            <p>
              Enjoy this moment together. One round is enough for this visit.
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
