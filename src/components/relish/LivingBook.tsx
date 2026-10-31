"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Download,
  Feather,
  Lock,
  Plus,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import type { Book, Person } from "@/lib/relish/model";
import {
  advanceGame,
  beginVisit,
  changeLiving,
  chooseThread,
  completeVisit,
  gameText,
  keepGame,
  livingOf,
  markTried,
  newGame,
  nextKind,
  outcomes,
  pauseVisit,
  pendingPractice,
  updateDraft,
  type Draft,
  type Game,
  type GameAction,
  type Player,
  type SessionKind,
} from "@/lib/relish/living";
import type { useLocalBook } from "./useLocalBook";
import { Dialog, EditPerson, PersonForm, VaultForm } from "./BookForms";
import { SoundControl, SoundSettings, useSensory } from "./Sensory";
import VisitEditor from "./VisitEditor";
import GroupPlay from "./GroupPlay";
import ConnectedEditions from "./ConnectedEditions";
import EditionSetup from "./EditionSetup";
import { guidanceFor } from "@/lib/relish/guidance";
import { canUseOnline, ageLabels, audienceOf } from "@/lib/relish/profiles";

type View =
  | "bookmark"
  | "session"
  | "words"
  | "people"
  | "practice"
  | "family"
  | "play";
type Modal =
  | "settings"
  | "create"
  | "person"
  | "guide"
  | "connections"
  | "profile"
  | null;
type Vault = ReturnType<typeof useLocalBook>;
const chapters = [
  { id: "words", label: "In my own words" },
  { id: "people", label: "Between us" },
  { id: "practice", label: "The way we practice" },
] as const;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
export default function LivingBook({ vault }: { vault: Vault }) {
  const [removeName, setRemoveName] = useState("");
  const [removeError, setRemoveError] = useState("");
  const { threads, plans, intro, cue } = guidanceFor(vault.book);
  const online = canUseOnline(vault.book);
  const { book, mode } = vault,
    sample = mode === "sample",
    l = livingOf(book),
    v = l.visit,
    theme = l.thread ? threads[l.thread] : undefined;
  const [view, setView] = useState<View>("bookmark"),
    [closed, setClosed] = useState(false),
    [modal, setModal] = useState<Modal>(null),
    [editing, setEditing] = useState<Person | null>(null),
    [shared, setShared] = useState(false),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pageKey, setPageKey] = useState(0);
  const operation = useRef(false),
    alive = useRef(true),
    heading = useRef<HTMLHeadingElement>(null),
    firstPage = useRef(true);
  const sensory = useSensory(),
    busy = working || vault.busy;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
  }, [view, pageKey]);
  function navigate(next: View) {
    setModal(null);
    setEditing(null);
    setView(next);
    setClosed(false);
    setPageKey((n) => n + 1);
    sensory.play("touch");
  }
  async function commit(
    update: (b: Book) => Book,
    after?: () => void,
    message = "",
  ) {
    if (operation.current) return;
    operation.current = true;
    setWorking(true);
    setError("");
    try {
      await vault.save(update);
      if (!alive.current) return;
      after?.();
      if (message) {
        setNotice(sample ? "Kept in the sample for this visit." : message);
        sensory.play("place");
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "This change could not be saved. Your page is still here.",
        );
    } finally {
      operation.current = false;
      if (alive.current) setWorking(false);
    }
  }
  function start(kind?: SessionKind) {
    void commit(
      (b) => beginVisit(b, kind),
      () => navigate("session"),
    );
  }
  function pause(draft: Draft) {
    if (!v) return;
    void commit(
      (b) => pauseVisit(updateDraft(b, v.id, draft)),
      () => navigate("bookmark"),
      "Your place is kept.",
    );
  }
  function finish(draft: Draft) {
    if (!v) return;
    void commit(
      (b) => completeVisit(b, v.id, draft),
      () => navigate("bookmark"),
      "This visit is complete.",
    );
  }
  function openPlay() {
    setShared(true);
    navigate("play");
    window.dispatchEvent(new Event("relish:locked"));
  }
  function leaveShared() {
    if (sample) {
      setShared(false);
      navigate("bookmark");
    } else vault.lock();
  }
  function gameAction(action: GameAction) {
    const gameId = l.game?.id;
    void commit(
      (b) =>
        changeLiving(b, (x) => {
          if (!x.game || x.game.id !== gameId)
            throw new Error("This game changed. Reopen its latest turn.");
          return { ...x, game: advanceGame(x.game, action) };
        }),
      undefined,
      action.type === "approve" ? "Approval updated." : "",
    );
  }
  function createGame(kind: Game["kind"], players: Player[]) {
    void commit(
      (b) =>
        changeLiving(b, (x) => ({
          ...x,
          game: newGame(
            kind,
            players,
            b.profile?.kind === "child" ? b.profile.ageBand : undefined,
          ),
        })),
      () => navigate("play"),
    );
  }
  function finishGame() {
    void commit(
      (b) =>
        changeLiving(b, (x) => {
          if (!x.game) throw new Error("No game is open.");
          return { ...x, game: advanceGame(x.game, { type: "finish" }) };
        }),
      () => navigate("family"),
      "A good place to stop.",
    );
  }
  const sessionOpen = view === "session" && v && v.status !== "complete";
  const chapterIndex = chapters.findIndex((c) => c.id === view);
  const activeGame = l.game && l.game.stage !== "finished" ? l.game : undefined;
  const sharedView = shared || view === "play" || view === "family";
  const personalTitle = `The ${book.owner} edition`;
  const headingText = closed
    ? sharedView
      ? "Our Family pages"
      : personalTitle
    : view === "play"
      ? "Together at the table"
      : sharedView
        ? "Our Family pages"
        : view === "bookmark"
          ? "My bookmark"
          : sessionOpen
            ? "This small visit"
            : chapters.find((c) => c.id === view)?.label || "Your book";
  let right: ReactNode, left: ReactNode;
  left = (
    <>
      <p className="lb-kicker">Your thread in this chapter</p>
      <h2>{theme?.title || "A little more understanding."}</h2>
      <p>
        {online
          ? "Ordinary moments become pages. Pages become a little more understanding of yourself and the people you love."
          : "One little moment at a time. You can explore how you feel, try something small, and come back when you want."}
      </p>
      <div className="lb-thread">
        <span className="lb-kicker">Across several visits</span>
        <p>Notice. Try. Return.</p>
        <span className="lb-fine">A chapter can unfold at its own pace.</span>
      </div>
      <p className="lb-fine">
        Your private edition belongs to you. Family pages hold only the game
        passages everyone chose to approve.
      </p>
    </>
  );
  if (sessionOpen) {
    right = (
      <VisitEditor
        key={v.id}
        book={book}
        visit={v}
        save={vault.save}
        busy={busy}
        onThread={(id) => void commit((b) => chooseThread(b, id))}
        onPause={pause}
        onFinish={finish}
        onTried={(draft) => {
          const practice = pendingPractice(book);
          if (practice)
            void commit(
              (b) => markTried(updateDraft(b, v.id, draft), practice.id),
              undefined,
              "Your practice is marked as tried.",
            );
        }}
      />
    );
  } else if (view === "bookmark" || view === "session") {
    if (v?.status === "complete")
      right = (
        <>
          <p className="lb-kicker">This visit is complete</p>
          <h2>
            A good place
            <br />
            to stop.
          </h2>
          <div className="lb-kept">
            <BookmarkCheck size={20} />
            <p>{v.summary}</p>
          </div>
          <p>
            Let this be enough for now. The rest of your chapter can unfold over
            time.
          </p>
          <div className="lb-later">
            <p className="lb-kicker">For another day</p>
            <p>{plans[v.kind].next}</p>
          </div>
          <button
            className="lb-primary"
            onClick={() => {
              setClosed(true);
              sensory.play("touch");
            }}
          >
            Close the book for now <BookOpen size={16} />
          </button>
          <div className="lb-actions">
            <button className="lb-text" disabled={busy} onClick={() => start()}>
              I’d like another small session
            </button>
            <button className="lb-text" onClick={() => navigate("words")}>
              Just browse
            </button>
            <button
              className="lb-text"
              disabled={busy}
              onClick={() => start("begin")}
            >
              Choose a new thread
            </button>
          </div>
        </>
      );
    else if (v)
      right = (
        <>
          <p className="lb-kicker">
            {v.status === "paused" ? "A place to pause" : "Your current visit"}
          </p>
          <h2>{plans[v.kind].title}</h2>
          <p>
            Your place is held. Your unfinished words are kept with the rest of
            your book.
          </p>
          <div className="lb-boundary">
            <strong>Enough for this visit</strong>
            <p>{plans[v.kind].end}</p>
          </div>
          <button
            className="lb-primary"
            disabled={busy}
            onClick={() => start()}
          >
            Continue where I paused <ArrowUpRight size={16} />
          </button>
          <div className="lb-actions">
            <button className="lb-text" onClick={() => setClosed(true)}>
              Close the book for now
            </button>
          </div>
          <p className="lb-fine">There is no catching up to do.</p>
        </>
      );
    else {
      const kind = nextKind(book),
        plan = plans[kind];
      right = (
        <>
          <p className="lb-kicker">{plan.time}</p>
          <h2>{plan.title}</h2>
          <p>
            {kind === "begin"
              ? intro
              : kind === "reflect"
                ? "Return after life has given you a chance to try."
                : theme?.notice}
          </p>
          <div className="lb-boundary">
            <strong>Our stopping point</strong>
            <p>{plan.end}</p>
          </div>
          {cue && <p className="lb-age-cue">{cue}</p>}
          <button
            className="lb-primary"
            disabled={busy}
            onClick={() => start()}
          >
            Begin this small session <ArrowUpRight size={16} />
          </button>
          <div className="lb-actions">
            <button className="lb-text" onClick={() => navigate("words")}>
              Browse at my own pace
            </button>
          </div>
        </>
      );
    }
  } else if (view === "words") {
    const entries = l.entries.filter((e) => e.kind !== "practice").toReversed();
    right = (
      <>
        <p className="lb-kicker">Words you have kept</p>
        <h2>In my own words.</h2>
        <button
          className="lb-text"
          disabled={busy}
          onClick={() => start("notice")}
        >
          <Feather size={16} /> Notice one moment
        </button>
        {entries.length === 0 && book.moments.length === 0 ? (
          <div className="lb-empty">
            <p>A sentence is enough to begin.</p>
            <p className="lb-fine">Your first moment will have a place here.</p>
          </div>
        ) : (
          <div className="lb-entries">
            {entries.map((e) => (
              <article key={e.id}>
                <p className="lb-kicker">
                  {shortDate(e.createdAt)} ·{" "}
                  {e.kind === "reflection"
                    ? "A lesson kept"
                    : "A moment noticed"}
                </p>
                <blockquote>
                  {e.text || (e.outcome ? outcomes[e.outcome] : "")}
                </blockquote>
                {e.perspective && (
                  <details>
                    <summary>A perspective I chose to keep</summary>
                    <p>{e.perspective}</p>
                  </details>
                )}
                {e.outcome && e.text && (
                  <p className="lb-fine">{outcomes[e.outcome]}</p>
                )}
              </article>
            ))}
            {book.moments.toReversed().map((m) => (
              <article key={m.id}>
                <p className="lb-kicker">
                  {shortDate(m.createdAt)} ·{" "}
                  {book.people.find((p) => p.id === m.personId)?.name ||
                    "An earlier moment"}
                </p>
                <blockquote>{m.observation}</blockquote>
                {m.reflection && <p>{m.reflection}</p>}
                {m.move && (
                  <p className="lb-fine">A small practice: {m.move}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </>
    );
    if (book.connections?.received.length)
      right = (
        <>
          {right}
          <section className="lb-entries">
            <p className="lb-kicker">Words you chose to welcome</p>
            {book.connections.received.toReversed().map((p) => (
              <article key={p.id}>
                <p className="lb-fine">
                  From {p.fromName} · kept {shortDate(p.acceptedAt)}
                </p>
                <h3>{p.title}</h3>
                <blockquote>{p.text}</blockquote>
              </article>
            ))}
          </section>
        </>
      );
  } else if (view === "people") {
    left = (
      <>
        <p className="lb-kicker">Other lives, held with care</p>
        <h2>
          Let me
          <br />
          understand you.
        </h2>
        <p>
          Your own notes about the people you love. Their private books are
          theirs to open.
        </p>
        <div className="lb-thread">
          <p>
            A little curiosity
            <br />
            can change a conversation.
          </p>
        </div>
      </>
    );
    right = (
      <>
        <p className="lb-kicker">The people in your life</p>
        <h2>Between us.</h2>
        <button className="lb-text" onClick={() => setModal("person")}>
          <Plus size={16} /> Add someone
        </button>
        <div className="lb-people">
          {book.people.map((p) => (
            <article key={p.id}>
              <span className="lb-kicker">{p.role}</span>
              <h3>{p.name}</h3>
              <p>
                {p.note || "Room for what you are learning about each other."}
              </p>
              {p.lessons.length > 0 && (
                <ul>
                  {p.lessons.map((lesson, i) => (
                    <li key={i}>{lesson}</li>
                  ))}
                </ul>
              )}
              <button className="lb-text" onClick={() => setEditing(p)}>
                Edit my understanding <ArrowUpRight size={14} />
              </button>
            </article>
          ))}
        </div>
        {book.people.length === 0 && (
          <p className="lb-fine">
            Add a person to make room for what you are learning. This creates a
            chapter in your book, not an account for them.
          </p>
        )}
      </>
    );
  } else if (view === "practice") {
    const pending = pendingPractice(book);
    left = (
      <>
        <p className="lb-kicker">A rhythm, not a score</p>
        <h2>
          Small things.
          <br />
          Done with care.
        </h2>
        <p>This book comes alive in the space between reading and trying.</p>
        <div className="lb-cadence">
          <p>
            <span>Notice something</span>
            <small>A moment, when you can</small>
          </p>
          <p>
            <span>Try a little differently</span>
            <small>An ordinary opportunity</small>
          </p>
          <p>
            <span>Return to these pages</span>
            <small>After you have tried</small>
          </p>
        </div>
      </>
    );
    right = (
      <>
        <p className="lb-kicker">The next ordinary opportunity</p>
        <h2>{theme?.practice || "Begin with one small intention."}</h2>
        <p>
          {theme?.instruction ||
            "Your intention gives your next small practice somewhere to begin."}
        </p>
        {pending && (
          <div className="lb-margin">
            <p>Your opportunity: {pending.text}.</p>
            <p className="lb-fine">
              {pending.triedAt
                ? "You marked this as tried. There is room to notice what happened."
                : "A plan, still waiting for its moment. Nothing is overdue."}
            </p>
          </div>
        )}
        <div className="lb-stones" aria-hidden="true">
          <i />
          <i />
          {pending?.triedAt && <i />}
        </div>
        <button
          className="lb-primary"
          disabled={busy}
          onClick={() =>
            start(pending ? "reflect" : theme ? "practice" : "begin")
          }
        >
          {pending
            ? "Return to this practice"
            : theme
              ? "Choose a moment to try"
              : "Choose my thread"}{" "}
          <ArrowUpRight size={16} />
        </button>
        {l.entries.some((e) => e.kind === "reflection") && (
          <div className="lb-margin">
            <p className="lb-kicker">Something learned</p>
            {l.entries
              .filter((e) => e.kind === "reflection")
              .slice(-3)
              .map((e) => (
                <p key={e.id}>
                  {e.text || (e.outcome ? outcomes[e.outcome] : "")}
                </p>
              ))}
          </div>
        )}
      </>
    );
  } else if (view === "family") {
    left = (
      <>
        <p className="lb-kicker">Many voices, room for each one</p>
        <h2>
          The things
          <br />
          we learn together.
        </h2>
        <p>
          Only the words everyone playing chose to approve belong on these
          pages.
        </p>
        <div className="lb-thread">
          <p>
            Shared moments.
            <br />A growing story.
          </p>
        </div>
        <p className="lb-fine">
          These Family pages are kept locally in {book.owner}’s encrypted book.
          They are not automatically sent to anyone.
        </p>
      </>
    );
    if (l.game?.stage === "finished")
      right = (
        <>
          <p className="lb-kicker">This visit is complete</p>
          <h2>
            A good place
            <br />
            to stop.
          </h2>
          <div className="lb-kept">
            <BookmarkCheck size={20} />
            <p>
              {l.game.savedPageId
                ? "You finished a round and kept a page everyone approved."
                : gameText(l.game)
                  ? "You finished one round together. No shared page was saved."
                  : "You made room to pass. No shared page was saved."}
            </p>
          </div>
          <p>You have spent this time together. You can leave it here.</p>
          <div className="lb-later">
            <p className="lb-kicker">For another day</p>
            <p>
              When you feel like playing again, someone else can start. One
              round is enough each time.
            </p>
          </div>
          <button
            className="lb-primary"
            onClick={() => {
              setClosed(true);
              sensory.play("touch");
            }}
          >
            Close the book for now <BookOpen size={16} />
          </button>
          <div className="lb-actions">
            <button
              className="lb-text"
              disabled={busy}
              onClick={() =>
                void commit(
                  (b) => changeLiving(b, (x) => ({ ...x, game: undefined })),
                  () => navigate("family"),
                )
              }
            >
              Read our Family pages
            </button>
            <button
              className="lb-text"
              disabled={busy}
              onClick={() =>
                void commit(
                  (b) => changeLiving(b, (x) => ({ ...x, game: undefined })),
                  () => navigate("play"),
                )
              }
            >
              Choose another small game
            </button>
          </div>
        </>
      );
    else
      right = (
        <>
          <p className="lb-kicker">Our chosen, shared pages</p>
          <h2>A book made together.</h2>
          {activeGame && (
            <div className="lb-boundary">
              <strong>Our game is waiting here</strong>
              <p>You can continue the same round, at the same turn.</p>
              <button className="lb-primary" onClick={() => navigate("play")}>
                Resume our round <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          {l.sharedPages.length ? (
            <div className="lb-entries">
              {l.sharedPages.toReversed().map((p) => (
                <article key={p.id}>
                  <p className="lb-kicker">
                    {shortDate(p.createdAt)} · Made together
                  </p>
                  <h3>{p.title}</h3>
                  <blockquote>{p.text}</blockquote>
                  <p className="lb-fine">
                    {p.players.map((x) => x.name).join(" + ")} · everyone
                    approved these words
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="lb-empty">
              <p>A place for something you make together.</p>
              <p className="lb-fine">
                A game can be enough on its own. Keeping a page is always
                optional.
              </p>
            </div>
          )}
          <button className="lb-text" onClick={() => navigate("play")}>
            <Users size={16} />{" "}
            {activeGame ? "Return to our game" : "Play one round together"}
          </button>
        </>
      );
  }
  return (
    <div className="r-app lb-app">
      {sample && (
        <div className="lb-sample">
          <span>
            Sample book · fictional people · changes last until reload
          </span>
          <button
            disabled={busy || !!sessionOpen}
            onClick={() => setModal("create")}
          >
            Create my private book <ArrowUpRight size={13} />
          </button>
        </div>
      )}
      <div className="lb-desk">
        <header className="lb-header">
          <div>
            <span className="lb-wordmark">relish</span>
            <span className="lb-tagline">
              The operating manual for relationships
            </span>
          </div>
          <nav aria-label="Your book">
            {!sharedView ? (
              <button
                disabled={busy || !!sessionOpen}
                onClick={() => navigate("bookmark")}
                aria-current={view === "bookmark" ? "page" : undefined}
              >
                <Bookmark size={16} /> My bookmark
              </button>
            ) : (
              <button disabled={busy} onClick={() => navigate("family")}>
                <Bookmark size={16} /> Family pages
              </button>
            )}
            <button disabled={busy || !!sessionOpen} onClick={openPlay}>
              <Users size={16} /> Play together
            </button>
            <button onClick={() => setModal("guide")}>
              <Sparkles size={16} /> Guide
            </button>
            {!sample && !sharedView && (
              <button disabled={busy || !!sessionOpen} onClick={vault.shelf}>
                <BookOpen size={16} /> Editions
              </button>
            )}
            {!sample && !sharedView && online && (
              <button
                disabled={busy || !!sessionOpen}
                onClick={() => setModal("connections")}
              >
                <Users size={16} /> Connect editions
              </button>
            )}
            <SoundControl />
            {!sharedView && (
              <button
                disabled={busy || !!sessionOpen}
                onClick={() => setModal("settings")}
                aria-label="Privacy and settings"
              >
                <Settings2 size={17} />
              </button>
            )}
            {sharedView ? (
              <button disabled={busy} onClick={leaveShared}>
                <Lock size={15} />{" "}
                {sample ? "My sample edition" : "Unlock my edition"}
              </button>
            ) : (
              !sample && (
                <button disabled={busy || !!sessionOpen} onClick={vault.lock}>
                  <Lock size={15} /> Lock
                </button>
              )
            )}
          </nav>
        </header>
        <div className="lb-horizon" aria-hidden="true">
          A little closer, every day.
        </div>
        <div className="lb-identity">
          <h1 ref={heading} tabIndex={-1}>
            {headingText}
          </h1>
          <span>
            {sharedView ? <Users size={14} /> : <Lock size={14} />}{" "}
            {sharedView
              ? "Only shared pages"
              : sample
                ? "Fictional sample"
                : book.profile?.kind === "child"
                  ? `${ageLabels[book.profile.ageBand]} · local book`
                  : "Your private pages"}
          </span>
        </div>
        {error || vault.error ? (
          <p className="lb-error lb-save-error" role="alert">
            {error || vault.error}
          </p>
        ) : null}
        {closed ? (
          <div className="lb-cover-wrap">
            <div className="lb-cover">
              <span className="lb-kicker">Relish · the operating manual</span>
              <div className="lb-cover-picture" />
              <h2>{sharedView ? "Our Family pages" : personalTitle}</h2>
              <span className="lb-kicker">Forever a work in becoming</span>
            </div>
            <button
              className="lb-primary"
              onClick={() => {
                setClosed(false);
                sensory.play("touch");
              }}
            >
              Open where you left off <BookOpen size={16} />
            </button>
            {!sample && (
              <button className="lb-text" onClick={vault.lock}>
                Lock and put away <Lock size={15} />
              </button>
            )}
          </div>
        ) : view === "play" ? (
          <div className="lb-play-layout">
            <aside>
              <p className="lb-kicker">Together at the table</p>
              <h2>
                Room for
                <br />
                every voice.
              </h2>
              <p>
                A few minutes, a little curiosity, and a place to stop together.
              </p>
              <div className="lb-landscape-inset" />
              <p className="lb-fine">
                Private pages are put away. Anyone may pass. Returning to your
                private edition requires unlocking it.
              </p>
            </aside>
            <main className="lb-play-main" key={l.game?.id || "setup"}>
              <GroupPlay
                book={book}
                game={activeGame}
                busy={busy}
                onCreate={createGame}
                onAction={gameAction}
                onKeep={() =>
                  void commit(
                    keepGame,
                    undefined,
                    "Everyone approved. A shared page is kept.",
                  )
                }
                onPause={() => navigate("family")}
                onFinish={finishGame}
                onCancel={() =>
                  void commit((b) =>
                    changeLiving(b, (x) => ({ ...x, game: undefined })),
                  )
                }
              />
            </main>
          </div>
        ) : (
          <>
            {!sharedView && view !== "bookmark" && view !== "session" && (
              <nav className="lb-chapters" aria-label="Chapters">
                {chapters.map((c, i) => (
                  <button
                    key={c.id}
                    aria-current={view === c.id ? "page" : undefined}
                    onClick={() => navigate(c.id)}
                  >
                    <span>0{i + 1}</span>
                    {c.label}
                  </button>
                ))}
              </nav>
            )}
            <main
              className={`lb-book ${sessionOpen ? "lb-session-book" : ""}`}
              key={pageKey}
            >
              <aside className="lb-page lb-left">
                <div className="lb-running">
                  <span>Your place in the story</span>
                  <span>
                    {sharedView ? "Family pages" : `${book.owner} edition`}
                  </span>
                </div>
                {left}
                <span className="lb-folio">01</span>
              </aside>
              <article className="lb-page lb-right">
                <div className="lb-running">
                  <span>
                    {view === "bookmark"
                      ? "Your place in the story"
                      : headingText}
                  </span>
                  <span>
                    {sharedView ? "Family pages" : `${book.owner} edition`}
                  </span>
                </div>
                {right}
                <span className="lb-folio">02</span>
              </article>
            </main>
            {chapterIndex >= 0 && !sharedView && (
              <footer className="lb-book-footer">
                <span>You don’t have to finish yourself.</span>
                <div>
                  <button
                    aria-label="Previous chapter"
                    disabled={chapterIndex === 0}
                    onClick={() => navigate(chapters[chapterIndex - 1].id)}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span>0{chapterIndex + 1} / 03</span>
                  <button
                    aria-label="Next chapter"
                    disabled={chapterIndex === 2}
                    onClick={() => navigate(chapters[chapterIndex + 1].id)}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </footer>
            )}
          </>
        )}
        <p className="lb-announcement" role="status" aria-live="polite">
          {notice}
        </p>
      </div>
      {modal === "connections" && !sample && !sharedView && online && (
        <ConnectedEditions
          book={book}
          save={vault.save}
          backup={vault.backup}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "profile" && !sample && !sharedView && (
        <Dialog
          title="Edition & parent settings"
          onClose={() => setModal(null)}
        >
          <EditionSetup
            book={book}
            save={vault.save}
            onDone={() => {
              setModal(null);
              setNotice("Edition settings saved.");
            }}
            onCancel={() => setModal("settings")}
          />
        </Dialog>
      )}
      {modal === "settings" && (
        <Dialog title="Privacy and settings" onClose={() => setModal(null)}>
          <p className="lb-kicker">Your words belong to you</p>
          <h2>
            A private place
            <br />
            to keep them.
          </h2>
          <p>
            Your book, drafts, session progress and games are{" "}
            {sample
              ? "examples in memory only"
              : "encrypted in this browser on this device"}
            .{" "}
            {online
              ? "AI receives only an excerpt you review and explicitly choose to send."
              : "AI and online connections are off for this edition."}
          </p>
          {!sample && (
            <div className="lb-boundary">
              <h3>
                {book.profile?.kind === "child"
                  ? "A book for their age"
                  : "Your adult edition"}
              </h3>
              <p>{ageLabels[audienceOf(book)]}</p>
              <p className="lb-fine">
                {online
                  ? "Optional AI and family connections are available when you choose them."
                  : "Written guidance for this age. No AI, online sign-in or online sharing. A parent passphrase protects changes."}
              </p>
              <button
                className="lb-secondary"
                onClick={() => setModal("profile")}
              >
                Edition & parent settings
              </button>
            </div>
          )}
          <div className="lb-boundary">
            <h3>Keep a copy you control.</h3>
            <p>
              Browser data can be cleared. Export encrypted backups regularly
              and keep your passphrase separately.
            </p>
            <button
              className="lb-primary"
              disabled={sample}
              onClick={vault.backup}
            >
              <Download size={16} /> Export encrypted backup
            </button>
          </div>
          {!sample && online && (
            <button
              className="lb-secondary"
              onClick={() => setModal("connections")}
            >
              <Users size={16} /> Connect with family editions
            </button>
          )}
          <p className="lb-fine">
            <a href="/privacy/" target="_blank" rel="noreferrer">
              Read how Relish handles your data
            </a>
          </p>
          {!sample && (
            <details className="lb-boundary">
              <summary>Remove this edition from this device</summary>
              <p>
                Export a backup first if you want to keep this book. This
                permanently removes its local copy. Online connections, other
                editions and backups are separate.
              </p>
              <label>
                Type {book.owner} to confirm
                <input
                  value={removeName}
                  onChange={(e) => setRemoveName(e.target.value)}
                  autoComplete="off"
                />
              </label>
              {removeError && (
                <p role="alert" className="lb-error">
                  {removeError}
                </p>
              )}
              <button
                className="lb-secondary"
                disabled={busy || removeName !== book.owner}
                onClick={() =>
                  void vault
                    .remove(removeName)
                    .catch((e) =>
                      setRemoveError(
                        e instanceof Error
                          ? e.message
                          : "The edition could not be removed.",
                      ),
                    )
                }
              >
                Remove this local edition
              </button>
            </details>
          )}
          <SoundSettings />
          {sample ? (
            <button className="lb-text" onClick={() => setModal("create")}>
              Create my private book
            </button>
          ) : (
            <button className="lb-text" onClick={vault.lock}>
              <Lock size={16} /> Lock my book
            </button>
          )}
        </Dialog>
      )}
      {modal === "create" && (
        <Dialog
          title="Create a private book"
          onClose={() => !busy && setModal(null)}
        >
          <VaultForm
            locked={false}
            busy={vault.busy}
            error={vault.error}
            onSubmit={vault.open}
            onCancel={() => setModal(null)}
          />
        </Dialog>
      )}
      {modal === "person" && (
        <Dialog
          title="Add someone to your book"
          onClose={() => !busy && setModal(null)}
        >
          <PersonForm
            busy={busy}
            onSave={async (person) => {
              await vault.save((b) => ({
                ...b,
                people: [...b.people, person],
              }));
              setModal(null);
              sensory.play("place");
            }}
          />
        </Dialog>
      )}
      {editing && (
        <Dialog
          title={`Your understanding of ${editing.name}`}
          onClose={() => !busy && setEditing(null)}
        >
          <EditPerson
            person={editing}
            busy={busy}
            onSave={async (person) => {
              await vault.save((b) => ({
                ...b,
                people: b.people.map((p) => (p.id === person.id ? person : p)),
              }));
              setEditing(null);
              sensory.play("place");
            }}
          />
        </Dialog>
      )}
      {modal === "guide" && (
        <Dialog title="Your guide" onClose={() => setModal(null)}>
          <p className="lb-kicker">A little guidance for this moment</p>
          <h2>
            {sharedView
              ? "One round is enough."
              : v?.status === "complete"
                ? "Enough for now."
                : "A small visit, with an ending."}
          </h2>
          <p>
            {sharedView
              ? "Each player gets a turn or may pass. Reveal together, then finish for now. Keeping a page requires everyone’s approval; it is always optional."
              : v?.status === "complete"
                ? plans[v.kind].next
                : plans[v?.kind || nextKind(book)].end}
          </p>
          <div className="lb-boundary">
            <strong>
              {online ? "AI, when you invite it" : "Your guide, right here"}
            </strong>
            <p>
              {!online
                ? "These are written prompts chosen for your age, not an AI conversation. Your words stay here. You can pause, pass, or ask a trusted grown-up for help."
                : sharedView
                  ? "Shared play works without AI. Private writing is never included in a game."
                  : "While writing a moment, you can invite AI to help consider another perspective. Review the exact excerpt first. You choose whether to keep its response."}
            </p>
          </div>
          <button className="lb-primary" onClick={() => setModal(null)}>
            Back to this moment
          </button>
        </Dialog>
      )}
    </div>
  );
}
