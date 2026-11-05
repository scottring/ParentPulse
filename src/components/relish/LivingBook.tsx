"use client";
import { readBinding } from "@/lib/relish/book-sync";
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
  Compass,
  Cloud,
  CircleHelp,
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
import Journal from "./Journal";
import Activities from "./Activities";
import { newJournalDraft, type JournalDraft } from "@/lib/relish/journal";
import "./duo.css";
import Manual, { ManualCardView, useManualGuide } from "./Manual";
import { manualOf } from "@/lib/relish/manual";
import { PhotoGallery } from "./Photos";
import GroupPlay from "./GroupPlay";
import Tools from "./Tools";
import ConnectedEditions from "./ConnectedEditions";
import EditionSetup from "./EditionSetup";
import { guidanceFor } from "@/lib/relish/guidance";
import { canUseOnline, ageLabels, audienceOf } from "@/lib/relish/profiles";

type View =
  | "activities"
  | "bookmark"
  | "manual"
  | "session"
  | "words"
  | "people"
  | "practice"
  | "family"
  | "play"
  | "tools";
type Modal =
  "settings" | "create" | "person" | "guide" | "connections" | "profile" | null;
type Vault = Omit<
  ReturnType<typeof useLocalBook>,
  "syncSnapshot" | "openSynced" | "receiveSynced" | "accountSnapshot"
>;
const chapters = [
  { id: "words", label: "Your pages" },
  { id: "people", label: "Between us" },
  { id: "practice", label: "The way we practice" },
] as const;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
export default function LivingBook({
  vault,
  onAccount,
  accountLabel = "Sign in",
  syncStatus,
  onInteraction,
}: {
  vault: Vault;
  onAccount?: () => void;
  accountLabel?: string;
  syncStatus?: string;
  onInteraction?: (paused: boolean) => void;
}) {
  const [offered, setOffered] = useState<
    { title: string; text: string } | undefined
  >(undefined);
  const accountManaged = !!readBinding(vault.editionId)?.accountManaged;
  const [removeName, setRemoveName] = useState("");
  const [removeError, setRemoveError] = useState("");
  const { threads, plans, intro, cue } = guidanceFor(vault.book);
  const online = canUseOnline(vault.book);
  const { book, mode } = vault,
    sample = mode === "sample",
    l = livingOf(book),
    v = l.visit,
    theme = l.thread ? threads[l.thread] : undefined;
  const [capture, setCapture] = useState<{
    draft: JournalDraft;
    voice: boolean;
  } | null>(null);
  const [view, setView] = useState<View>("activities"),
    [closed, setClosed] = useState(false),
    [modal, setModal] = useState<Modal>(null),
    [editing, setEditing] = useState<Person | null>(null),
    [shared, setShared] = useState(false),
    [journalEditing, setJournalEditing] = useState(false),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pageKey, setPageKey] = useState(0);
  const journalNavigation = useRef<(() => Promise<boolean>) | null>(null);
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
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [view, pageKey]);
  function navigate(next: View) {
    setJournalEditing(false);
    setCapture(null);
    setModal(null);
    setEditing(null);
    setView(next);
    setClosed(false);
    setPageKey((n) => n + 1);
    sensory.play("touch");
  }
  async function headerAction(action: () => void) {
    if (operation.current) return;
    if (!journalEditing) {
      action();
      return;
    }
    operation.current = true;
    setWorking(true);
    try {
      if (await journalNavigation.current?.()) {
        if (alive.current) action();
      }
    } finally {
      operation.current = false;
      if (alive.current) setWorking(false);
    }
  }
  function quickEntry(voice = false, draft = newJournalDraft()) {
    navigate("words");
    setCapture({ draft, voice });
    setJournalEditing(true);
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
      () => navigate("activities"),
      "Progress saved.",
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
      navigate("activities");
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
  const privateEditorOpen = !!sessionOpen || journalEditing;
  // Journal navigation queues behind autosave; guided visits still use their pause action.
  const headerBusy =
    working || !!sessionOpen || (!journalEditing && vault.busy);
  const chapterIndex = chapters.findIndex((c) => c.id === view);
  const activeGame = l.game && l.game.stage !== "finished" ? l.game : undefined;
  const sharedView = shared || view === "play" || view === "family";
  useEffect(() => {
    onInteraction?.(privateEditorOpen || sharedView || modal !== null);
  }, [privateEditorOpen, sharedView, modal, onInteraction]);
  const guide = useManualGuide(
    book,
    vault.save,
    view === "manual",
    !!privateEditorOpen || sharedView,
    sample,
  );
  const manualCards = manualOf(book).cards;
  const personalTitle = `The ${book.owner} edition`;
  const headingText = closed
    ? sharedView
      ? "Our Family pages"
      : personalTitle
    : view === "activities"
      ? "Activities"
      : view === "tools"
        ? "Exercises"
        : view === "manual"
        ? "Your living manual"
        : view === "words"
          ? "Your pages"
          : view === "play"
            ? "Play together"
            : sharedView
              ? "Our Family pages"
              : view === "bookmark"
                ? "Guided activities"
                : sessionOpen
                  ? "Guided reflection"
                  : chapters.find((c) => c.id === view)?.label || "Your book";
  let right: ReactNode = null,
    left: ReactNode;
  left = (
    <>
      <p className="lb-kicker">Guided reflection</p>
      <h2>{theme?.title || "Choose a topic"}</h2>
      <p>
        {online
          ? "Choose a topic, describe an experience, then decide whether to try a related action."
          : "Choose a topic and describe what happened or how you felt. You can skip questions or stop at any time."}
      </p>
      <div className="lb-thread">
        <span className="lb-kicker">How it works</span>
        <p>Write a reflection. Make a plan. Review what happened.</p>
        <span className="lb-fine">Each step is a separate session. Your progress is saved.</span>
      </div>
      <p className="lb-fine">
        Your private edition belongs to you. Family pages hold only chosen album
        passages and game passages everyone approved.
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
          <p className="lb-kicker">Progress saved</p>
          <h2>Session complete</h2>
          <div className="lb-kept">
            <BookmarkCheck size={20} />
            <p>{v.summary}</p>
          </div>
          <p>
            Your response is saved. Close this session or choose another activity.
          </p>
          <div className="lb-later">
            <p className="lb-kicker">Next session</p>
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
            <button
              className="lb-text"
              disabled={busy}
              onClick={() => navigate("activities")}
            >
              Choose another activity
            </button>
            <button className="lb-text" onClick={() => navigate("words")}>
              Read saved entries
            </button>
            <button
              className="lb-text"
              disabled={busy}
              onClick={() => start("begin")}
            >
              Choose another topic
            </button>
          </div>
        </>
      );
    else if (v)
      right = (
        <>
          <p className="lb-kicker">
            {v.status === "paused" ? "Paused session" : "Current session"}
          </p>
          <h2>{plans[v.kind].title}</h2>
          <p>
            Your unfinished response is saved. Continue from the same step.
          </p>
          <div className="lb-boundary">
            <strong>To complete this session</strong>
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
          <p className="lb-fine">Continue whenever you’re ready.</p>
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
                ? "After you try your plan, record what happened."
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
            Start session <ArrowUpRight size={16} />
          </button>
          <div className="lb-actions">
            <button className="lb-text" onClick={() => navigate("words")}>
              Read saved entries
            </button>
          </div>
        </>
      );
    }
  } else if (view === "people") {
    left = (
      <>
        <p className="lb-kicker">People</p>
        <h2>Notes about people</h2>
        <p>
          Keep your notes about people here. These notes do not create accounts or grant access to anyone’s book.
        </p>
      </>
    );
    right = (
      <>
        <p className="lb-kicker">The people in your life</p>
        <h2>People in your book</h2>
        <button className="lb-text" onClick={() => setModal("person")}>
          <Plus size={16} /> Add someone
        </button>
        <div className="lb-people">
          {book.people.map((p) => (
            <article key={p.id}>
              <span className="lb-kicker">{p.role}</span>
              <h3>{p.name}</h3>
              <p>
                {p.note || "No notes added yet."}
              </p>
              {p.lessons.length > 0 && (
                <ul>
                  {p.lessons.map((lesson, i) => (
                    <li key={i}>{lesson}</li>
                  ))}
                </ul>
              )}
              <button className="lb-text" onClick={() => setEditing(p)}>
                Edit notes <ArrowUpRight size={14} />
              </button>
            </article>
          ))}
        </div>
        {book.people.length === 0 && (
          <p className="lb-fine">
            Add a person to record notes about them. To create a child’s book, use Family library instead.
          </p>
        )}
      </>
    );
  } else if (view === "practice") {
    const pending = pendingPractice(book);
    left = (
      <>
        <p className="lb-kicker">Practice plans</p>
        <h2>Try a practice plan</h2>
        <p>Choose an action to try, then record what happened.</p>
        <div className="lb-cadence">
          <p>
            <span>Write a reflection</span>
            <small>Describe an experience</small>
          </p>
          <p>
            <span>Make a plan</span>
            <small>Choose when to try it</small>
          </p>
          <p>
            <span>Review the result</span>
            <small>After you have tried</small>
          </p>
        </div>
      </>
    );
    right = (
      <>
        <p className="lb-kicker">Your next plan</p>
        <h2>{theme?.practice || "Choose a practice plan"}</h2>
        <p>
          {theme?.instruction ||
            "Choose a topic to see a suggested action."}
        </p>
        {pending && (
          <div className="lb-margin">
            <p>Your opportunity: {pending.text}.</p>
            <p className="lb-fine">
              {pending.triedAt
                ? "You marked this plan as tried. Record the result next."
                : "This plan has not been marked as tried."}
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
              : "Choose a topic"}{" "}
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
        <p className="lb-kicker">Family album</p>
        <h2>Shared entries and game results</h2>
        <p>
          View selected journal passages and game results approved by every player.
        </p>
        <p className="lb-fine">
          These shared entries are part of {book.owner}’s book. Account books sync to the parent account; local books stay on this device. Other accounts receive only passages you explicitly send.
        </p>
      </>
    );
    if (l.game?.stage === "finished")
      right = (
        <>
          <p className="lb-kicker">Progress saved</p>
          <h2>Session complete</h2>
          <div className="lb-kept">
            <BookmarkCheck size={20} />
            <p>
              {l.game.savedPageId
                ? "You finished a round and kept a page everyone approved."
                : gameText(l.game)
                  ? "You finished one round together. No shared page was saved."
                  : "Everyone passed. No shared page was saved."}
            </p>
          </div>
          <p>The game is finished. Close it or choose another activity.</p>
          <div className="lb-later">
            <p className="lb-kicker">Next session</p>
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
              Choose another game
            </button>
          </div>
        </>
      );
    else
      right = (
        <>
          <p className="lb-kicker">Saved family content</p>
          <h2>Family album</h2>
          {activeGame && (
            <div className="lb-boundary">
              <strong>Unfinished game</strong>
              <p>You can continue the same round, at the same turn.</p>
              <button className="lb-primary" onClick={() => navigate("play")}>
                Resume our round <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          {manualCards
            .filter((c) => c.scope === "family" && c.status === "kept")
            .map((card) => (
              <ManualCardView key={card.id} card={card} />
            ))}
          {!!book.album?.length && (
            <div className="lb-entries">
              {book.album.toReversed().map((p) => (
                <article key={p.id}>
                  <p className="lb-kicker">
                    {shortDate(p.createdAt)} · Chosen by {p.fromName}
                  </p>
                  <h3>{p.title}</h3>
                  <blockquote>{p.text}</blockquote>
                  <PhotoGallery photos={p.photos || []} access={vault.photos} />
                  <p className="lb-fine">
                    A chosen passage from {shortDate(p.sourceDate)}. The
                    original page stays private.
                  </p>
                </article>
              ))}
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
          ) : !book.album?.length ? (
            <div className="lb-empty">
              <p>No shared entries yet.</p>
              <p className="lb-fine">
                A game can be enough on its own. Keeping a page is always
                optional.
              </p>
            </div>
          ) : null}
          <button className="lb-text" onClick={() => navigate("play")}>
            <Users size={16} />{" "}
            {activeGame ? "Return to our game" : "Play one round together"}
          </button>
        </>
      );
  }
  return (
    <div
      className={`r-app lb-app ${journalEditing ? "lb-capturing" : ""} ${view === "activities" && !closed ? "lb-activities" : ""}`}
    >
      {sample && (
        <div className="lb-sample">
          <span>
            Sample book · fictional people · changes last until reload
          </span>
          <button
            disabled={headerBusy}
            onClick={() => void headerAction(() => setModal("create"))}
          >
            Create my private book <ArrowUpRight size={13} />
          </button>
        </div>
      )}
      <div className="lb-desk">
        <header className="lb-header">
          <div className="lb-brand">
            <span className="lb-wordmark">relish</span>
            <span className="lb-tagline">
              The operating manual for relationships
            </span>
          </div>
          <nav className="lb-main-nav" aria-label="Your book">
            {!sharedView ? (
              <button
                disabled={headerBusy}
                onClick={() => void headerAction(() => navigate("activities"))}
                aria-current={
                  view === "activities" && !closed ? "page" : undefined
                }
              >
                <Compass size={16} /> Activities
              </button>
            ) : (
              <button disabled={busy} onClick={() => navigate("family")}>
                <Bookmark size={16} /> Family pages
              </button>
            )}
            {!sharedView && (
              <button
                disabled={headerBusy}
                onClick={() => void headerAction(() => navigate("words"))}
                aria-current={view === "words" ? "page" : undefined}
              >
                <Feather size={16} /> Your pages
              </button>
            )}
            <button
              disabled={headerBusy}
              onClick={() => void headerAction(openPlay)}
            >
              <Users size={16} /> Play together
            </button>
            <button onClick={() => setModal("guide")}>
              <CircleHelp size={16} /> Help
            </button>
          </nav>
          <div className="lb-tools" role="group" aria-label="Edition tools">
            {!sharedView && onAccount && (
              <button
                className={
                  sample
                    ? "lb-account-trigger lb-account-sample"
                    : "lb-account-trigger"
                }
                disabled={headerBusy}
                onClick={() => void headerAction(onAccount)}
              >
                <Cloud size={16} />
                {book.profile?.kind === "child" && !sample
                  ? "Parent account"
                  : accountLabel}
              </button>
            )}
            {!sample && !sharedView && (
              <button
                disabled={headerBusy}
                onClick={() => void headerAction(vault.shelf)}
                aria-label="Editions"
                title="Editions"
              >
                <BookOpen size={16} />{" "}
                <span className="lb-tool-label">Editions</span>
              </button>
            )}
            {!sample && !sharedView && online && (
              <button
                disabled={headerBusy}
                onClick={() =>
                  void headerAction(() => {
                    setOffered(undefined);
                    setModal("connections");
                  })
                }
                aria-label="Connect editions"
                title="Connect editions"
              >
                <Users size={16} />{" "}
                <span className="lb-connection-label">Connect editions</span>
              </button>
            )}
            <SoundControl />
            {!sharedView && (
              <button
                disabled={headerBusy}
                onClick={() => void headerAction(() => setModal("settings"))}
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
                <button
                  disabled={headerBusy}
                  onClick={() => void headerAction(vault.lock)}
                  aria-label="Lock"
                  title="Lock"
                >
                  <Lock size={15} /> <span className="lb-tool-label">Lock</span>
                </button>
              )
            )}
          </div>
        </header>
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
                  ? `${ageLabels[book.profile.ageBand]} · private book`
                  : "Your private pages"}
          </span>
        </div>
        {!sample && !sharedView && onAccount && syncStatus && (
          <div className="lb-sync-status">
            <span>{syncStatus}</span>
            <button
              disabled={headerBusy}
              onClick={() => void headerAction(onAccount)}
            >
              <Cloud size={14} />{" "}
              {book.profile?.kind === "child"
                ? "Parent account"
                : accountLabel === "Sign in"
                  ? "Sign in"
                  : "Family library"}
            </button>
          </div>
        )}
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
              <span className="lb-kicker">Journal, reflections and practice plans</span>
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
        ) : view === "activities" && !sharedView ? (
          <Activities
            book={book}
            busy={busy}
            onWrite={quickEntry}
            onGuided={() => start()}
            onPlay={openPlay}
            onPages={() => navigate("words")}
            onManual={() => navigate("manual")}
            onTools={() => navigate("tools")}
            pendingInsights={
              manualCards.filter((c) => c.status === "suggested").length
            }
          />
        ) : view === "tools" && !sharedView ? (
          <Tools
            book={book}
            busy={busy}
            onCommit={(update, after, message) =>
              void commit(update, after, message)
            }
            onPages={() => navigate("words")}
            onActivities={() => navigate("activities")}
          />
        ) : view === "manual" && !sharedView ? (
          <Manual
            book={book}
            save={vault.save}
            guide={guide}
            sample={sample}
            onPages={() => navigate("words")}
          />
        ) : view === "words" && !sharedView ? (
          <Journal
            key={pageKey}
            navigation={journalNavigation}
            initialDraft={capture?.draft}
            initialVoice={capture?.voice}
            book={book}
            photos={vault.photos}
            onNotice={() => start("notice")}
            onChapter={navigate}
            onManual={() => navigate("manual")}
            pendingInsights={
              manualCards.filter((c) => c.status === "suggested").length
            }
            onAlbum={() => {
              setShared(true);
              navigate("family");
              window.dispatchEvent(new Event("relish:locked"));
            }}
            onOffer={
              !sample && online
                ? (passage) => {
                    setOffered(passage);
                    setModal("connections");
                  }
                : undefined
            }
            save={vault.save}
            sample={sample}
            onEditingChange={setJournalEditing}
            onActivities={() => navigate("activities")}
            onDone={() => {
              navigate("activities");
              setClosed(true);
            }}
          />
        ) : view === "play" ? (
          <div className="lb-play-layout">
            <aside>
              <p className="lb-kicker">Play together</p>
              <h2>Play together</h2>
              <p>
                Select players, choose a game, and play one round on this device.
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
                  <span>Guided activities</span>
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
                      ? "Guided activities"
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
                <span>Your progress is saved after each step.</span>
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
        {!sharedView && !privateEditorOpen && view === "bookmark" && (
          <div className="rm-bookmark-link">
            <button className="lb-text" onClick={() => navigate("manual")}>
              <Sparkles size={17} />
              {manualCards.some((c) => c.status === "suggested")
                ? "New AI suggestions are ready for review"
                : "Review manual suggestions"}
            </button>
          </div>
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
          initialPassage={offered}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "profile" && !sample && !sharedView && (
        <Dialog
          title="Edition & parent settings"
          onClose={() => setModal(null)}
        >
          <EditionSetup
            accountUid={
              readBinding(vault.editionId)?.accountManaged
                ? readBinding(vault.editionId)?.uid
                : undefined
            }
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
          <p className="lb-kicker">Privacy and storage</p>
          <h2>Privacy and settings</h2>
          <p>
            Your book, drafts, session progress and games are{" "}
            {sample
              ? "examples in memory only"
              : accountManaged
                ? "encrypted and saved automatically to your account, including its parent-managed child books"
                : "encrypted in this browser on this device"}
            .{" "}
            {online
              ? "On-demand AI uses a reviewed excerpt. Automatic manual suggestions have a separate opt-in; photos and private people tags are excluded from AI requests. Saving online does not give AI access to your book."
              : "General AI chat and online passage sharing are off. Voice writing and manual suggestions, when available, need a parent’s permission and adult account."}
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
                  : accountManaged
                    ? "This child’s book belongs to the parent account and saves automatically online. The parent account password protects age changes and access to the family library. Voice writing needs a parent’s separate permission."
                    : "Written guidance for this age. A separate parent passphrase protects this local edition’s settings. Children have no independent account or online passage sharing."}
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
            <h3>Back up your book</h3>
            <p>
              {accountManaged
                ? "Your saved book is available whenever you sign in. For an extra portable copy, export a backup with a passphrase you choose and keep separately."
                : "Browser data can be cleared. Export encrypted backups regularly and keep your passphrase separately."}
            </p>
            <button
              className="lb-primary"
              disabled={sample}
              onClick={() => void vault.backup()}
            >
              <Download size={16} /> Export encrypted backup
            </button>
          </div>
          {!sample && online && (
            <button
              className="lb-secondary"
              onClick={() => {
                setOffered(undefined);
                setModal("connections");
              }}
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
        <Dialog title="Help" onClose={() => setModal(null)}>
          <p className="lb-kicker">How to use this screen</p>
          <h2>
            {view === "activities"
              ? "Choose an activity"
              : view === "tools"
                ? "Use an exercise"
              : view === "words"
                ? "Write and save an entry"
                : sharedView
                  ? "Complete one round"
                  : v?.status === "complete"
                    ? "Session complete"
                    : "Complete the current step"}
          </h2>
          <p>
            {view === "activities"
              ? "Write a personal journal entry for open space, choose a guided reflection for prompts, or play a game together. Each activity has its own stopping point. Unfinished pages and reflections will wait for you here."
              : view === "tools"
                ? "Choose an exercise, then follow its steps. Sorts and fill-in-the-blank exercises are saved only when you keep the page. Day-by-day checklists save each mark and wait for you between visits."
              : view === "words"
                ? "Write anything you like. Your draft saves as you go, including when you switch activities or lock your book. Select Save entry when you’re finished. You can return and edit either one."
                : sharedView
                  ? "Each player gets a turn or may pass. Reveal together, then finish for now. Keeping a page requires everyone’s approval; it is always optional."
                  : v?.status === "complete"
                    ? plans[v.kind].next
                    : plans[v?.kind || nextKind(book)].end}
          </p>
          <div className="lb-boundary">
            <strong>
              {view === "words"
                ? "Saving and sharing"
                : online
                  ? "Optional AI assistance"
                  : "Age-based prompts"}
            </strong>
            <p>
              {view === "words"
                ? "Your pages stay private. Only passages you choose enter the Family album or are offered to connected editions. Voice writing sends only a recording you review. Your encrypted backup includes your pages and photos."
                : !online
                  ? "These are written prompts chosen for your age, not an AI conversation. Your words stay here. You can pause, pass, or ask a trusted grown-up for help."
                  : sharedView
                    ? "Shared play works without AI. Private writing is never included in a game."
                    : "While writing a moment, you can invite AI to help consider another perspective. Review the exact excerpt first. You choose whether to keep its response."}
            </p>
          </div>
          <button className="lb-primary" onClick={() => setModal(null)}>
            Back to activity
          </button>
        </Dialog>
      )}
    </div>
  );
}
