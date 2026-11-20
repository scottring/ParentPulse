"use client";
import { readBinding } from "@/lib/relish/book-sync";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  Lock,
  Users,
} from "lucide-react";
import type { Book, Person } from "@/lib/relish/model";
import {
  advanceGame,
  beginNewMoment,
  beginVisit,
  changeLiving,
  chooseThread,
  completeVisit,
  finishGame as finishRound,
  keepGame,
  lastEntry,
  livingOf,
  markTried,
  letGoPractice,
  nextKind,
  pauseVisit,
  pendingPractice,
  recordRound,
  startGame,
  updateDraft,
  type Draft,
  type Game,
  type GameAction,
  type Player,
  type SessionKind,
} from "@/lib/relish/living";
import type { useLocalBook } from "./useLocalBook";
import { Dialog, EditPerson, PersonForm, VaultForm } from "./BookForms";
import { SoundSettings, useSensory } from "./Sensory";
import VisitEditor from "./VisitEditor";
import Journal from "./Journal";
import {
  newJournalDraft,
  writeJournalPage,
  type JournalDraft,
  type JournalEntry,
} from "@/lib/relish/journal";
import "./duo.css";
import "./places.css";
import FamilyHome from "./FamilyHome";
import Illustration, { Emblem } from "./Illustration";
import { BookSpread, SubHead } from "./ui";
import { gameIllustration, topicIllustration } from "./illustrations";
import Manual, { useManualGuide } from "./Manual";
import { reviewManualIdea } from "@/lib/relish/manual";
import {
  answerCheckBack,
  clearExerciseRun,
  saveExerciseRun,
  type CheckBackAnswer,
  type ExerciseRun,
} from "@/lib/relish/tools";
import GroupPlay from "./GroupPlay";
import Tools from "./Tools";
import ConnectedEditions from "./ConnectedEditions";
import EditionSetup from "./EditionSetup";
import { guidanceFor } from "@/lib/relish/guidance";
import { TypingSoundSetting } from "./TypingSound";
import TopBar, { type MenuItem, type Place, type Space } from "./TopBar";
import { inviteFriend, inviteNotice } from "@/lib/relish/invite";
import { keepNotes } from "@/lib/relish/game-notes";
import { deletePage, deletePersonNote, discardUnderWay } from "@/lib/relish/delete";
import Home, { type FamilyPerson } from "./Home";
import DoSomething from "./DoSomething";
import YourBook from "./YourBook";
import OurFamily, { type FamilyMember } from "./Family";
import { localFamily, type FamilyAccess } from "./useFamilyBook";
import { newFamilyPage, type FamilyPage } from "@/lib/relish/family-pages";
import { sendToPartners } from "@/lib/relish/partner-share";
import { takeSuggestion, takenToday, type NudgeAction } from "@/lib/relish/nudges";
import { isChild, isFamily, underWay, type DoFilter, type UnderWay } from "@/lib/relish/catalog";
import { canUseOnline, ageLabels, audienceOf } from "@/lib/relish/profiles";

// Four places, plus the sub-screens that open inside them.
type View =
  | Place
  | "bookmark"
  | "manual"
  | "session"
  | "words"
  | "play"
  | "tools";
const placeOf: Record<View, Place> = {
  home: "home",
  do: "do",
  tools: "do",
  session: "do",
  bookmark: "do",
  play: "do",
  book: "book",
  words: "book",
  manual: "book",
  journal: "journal",
};
/** Just me / Our family, remembered per book on this device. */
const spaceKey = (edition: string) => `relish.space.v1:${edition}`;
function readSpace(edition: string): Space | null {
  try {
    const v = localStorage.getItem(spaceKey(edition));
    return v === "me" || v === "family" ? v : null;
  } catch {
    return null;
  }
}
function writeSpace(edition: string, space: Space) {
  try {
    localStorage.setItem(spaceKey(edition), space);
  } catch {
    /* Without storage the switch still works for this visit. */
  }
}
type Modal =
  "settings" | "create" | "person" | "guide" | "connections" | "profile" | null;
type Vault = Omit<
  ReturnType<typeof useLocalBook>,
  "syncSnapshot" | "openSynced" | "receiveSynced" | "accountSnapshot" | "autoLocked"
>;
export default function LivingBook({
  vault,
  onAccount,
  accountLabel = "Sign in",
  syncStatus,
  onInteraction,
  family,
  onAddChild,
  startView,
  familyBook,
}: {
  vault: Vault;
  onAccount?: () => void;
  accountLabel?: string;
  syncStatus?: string;
  onInteraction?: (paused: boolean) => void;
  /** Other books in this account (children), shown as covers on Family. */
  family?: FamilyPerson[];
  /** Opens the add-a-child form. */
  onAddChild?: () => void;
  /** Where the book opens, e.g. Our family after switching back from a child's book. */
  startView?: "family";
  /**
   * The account's Our family book. Without it (no account, or the sample),
   * family pages are kept inside this book.
   */
  familyBook?: FamilyAccess;
}) {
  const [offered, setOffered] = useState<
    { title: string; text: string } | undefined
  >(undefined);
  const accountManaged = !!readBinding(vault.editionId)?.accountManaged;
  const [removeName, setRemoveName] = useState("");
  const [removeError, setRemoveError] = useState("");
  const { threads, plans, outcomes, words } = guidanceFor(vault.book);
  const online = canUseOnline(vault.book);
  const { book, mode } = vault,
    sample = mode === "sample",
    l = livingOf(book),
    v = l.visit,
    theme = l.thread ? threads[l.thread] : undefined;
  const [capture, setCapture] = useState<{
    draft: JournalDraft;
    voice: boolean;
    photo?: boolean;
  } | null>(null);
  const [view, setView] = useState<View>(startView ? "book" : "home"),
    [closed, setClosed] = useState(false),
    [modal, setModal] = useState<Modal>(null),
    [editing, setEditing] = useState<Person | null>(null),
    [journalEditing, setJournalEditing] = useState(false),
    [working, setWorking] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pageKey, setPageKey] = useState(0),
    [reading, setReading] = useState<string | undefined>(),
    [exercise, setExercise] = useState<string | undefined>(),
    [doFilter, setDoFilter] = useState<DoFilter>("all"),
    [gameOffer, setGameOffer] = useState<Game["kind"] | undefined>(),
    [bookWho, setBookWho] = useState<string | undefined>(),
    [bookQuery, setBookQuery] = useState(""),
    [kept, setKept] = useState(false);
  const [space, setSpaceState] = useState<Space>(() =>
    startView === "family" ? "family" : (readSpace(vault.editionId) ?? "me"),
  );
  function setSpace(next: Space) {
    setSpaceState(next);
    writeSpace(vault.editionId, next);
  }
  useEffect(() => {
    if (startView === "family") writeSpace(vault.editionId, "family");
    // Only where the book first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  // Where the writer was in Your book when they opened a page, so Back can
  // put them there again. Choosing the Your book tab starts a fresh browse.
  const browse = useRef<{ who: string; query: string; scroll: number; page?: string } | null>(null);
  const restoring = useRef(false);
  // The Do something filter in use when an activity was opened from it.
  const doReturn = useRef<DoFilter>("all");
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    if (restoring.current && browse.current) {
      restoring.current = false;
      const { scroll, page } = browse.current;
      window.scrollTo({ top: scroll, left: 0, behavior: "instant" });
      const row = page
        ? document.querySelector<HTMLElement>(`[data-page-id="${CSS.escape(page)}"]`)
        : null;
      (row || heading.current)?.focus({ preventScroll: true });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [view, pageKey]);
  /** Back to Your book exactly as it was left: filter, search, scroll, row. */
  function backToBook() {
    const saved = browse.current;
    openMyBook();
    if (saved) {
      restoring.current = true;
      setBookWho(saved.who);
      setBookQuery(saved.query);
    }
  }
  /** Back to Activities with the chip that was chosen. */
  function backToDo() {
    const filter = doReturn.current;
    navigate("do");
    setDoFilter(filter);
  }
  function navigate(next: View) {
    setJournalEditing(false);
    setCapture(null);
    setModal(null);
    setEditing(null);
    setReading(undefined);
    setExercise(undefined);
    setDoFilter("all");
    setGameOffer(undefined);
    setBookWho(undefined);
    setBookQuery("");
    setKept(false);
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
  /** Journal: the draft in progress, or a new page. */
  function openJournal(draft?: JournalDraft, voice = false, photo = false) {
    const latest = (book.journal || [])
      .filter((e) => e.status === "draft")
      .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    navigate("journal");
    setCapture({ draft: draft ?? latest ?? newJournalDraft(), voice, photo });
    setJournalEditing(true);
  }
  function quickEntry(voice = false, draft = newJournalDraft(), photo = false) {
    openJournal(draft, voice, photo);
  }
  /** Book · Just me: this writer's own pages. */
  function openMyBook() {
    setSpace("me");
    navigate("book");
  }
  /** Book · Our family. */
  function openFamily() {
    setSpace("family");
    navigate("book");
  }
  function openPage(id: string) {
    navigate("words");
    setReading(id);
  }
  function openExercise(id: string) {
    doReturn.current = view === "do" ? doFilter : "all";
    navigate("tools");
    setExercise(id);
  }
  function openInvite() {
    setOffered(undefined);
    setModal("connections");
  }
  function onNudge(action: NudgeAction, nudgeId?: string): void {
    doReturn.current = view === "do" ? doFilter : "all";
    if (nudgeId) return openSuggestion(action, nudgeId);
    if (action.kind === "journal") quickEntry();
    else if (action.kind === "exercise") openExercise(action.id);
    else if (action.kind === "reflect") start();
    else {
      navigate("do");
      setGameOffer(action.game);
    }
  }
  /**
   * Home's suggestion: noted as taken today so the card can show what came of
   * it. A writing suggestion reopens the page it started, never a blank one.
   */
  function openSuggestion(action: NudgeAction, id: string): void {
    const taken = takenToday(book);
    if (action.kind !== "journal") {
      if (taken?.id !== id) quietSave((b) => takeSuggestion(b, id));
      return onNudge(action);
    }
    const entry =
      taken?.id === id && taken.journalId
        ? (book.journal || []).find((e) => e.id === taken.journalId)
        : undefined;
    if (entry?.status === "kept") return openPage(`journal:${entry.id}`);
    if (entry) return quickEntry(false, entry);
    const draft = newJournalDraft();
    quietSave((b) => takeSuggestion(b, id, draft.id));
    quickEntry(false, draft);
  }
  /** Saves something small without a notice or a busy state (progress, bookkeeping). */
  function quietSave(update: (b: Book) => Book) {
    void Promise.resolve(vault.save(update)).catch(() => {
      // Not worth interrupting anyone: the next change saves again.
    });
  }
  /** Saves a sort or fill-in partway; null sets it aside. */
  function saveProgress(toolId: string, run: ExerciseRun | null) {
    quietSave((b) => (run ? saveExerciseRun(b, run) : clearExerciseRun(b, toolId)));
  }
  /** Reopens something under way: a game, a reflection, a draft or an exercise. */
  function resume(g: UnderWay) {
    doReturn.current = "all";
    if (g.kind === "game") navigate("play");
    else if (g.kind === "visit") start();
    else if (g.kind === "draft") quickEntry(false, g.draft);
    else openExercise(g.toolId);
  }
  /** Keeps a suggestion's draft just as it stands. */
  function keepDraft(entry: JournalEntry) {
    void commit(
      (b) => {
        const current = (b.journal || []).find((e) => e.id === entry.id);
        if (!current) throw new Error("This draft is no longer here.");
        if (current.status === "kept") return b;
        return writeJournalPage(b, current, current.revision, "kept");
      },
      undefined,
      "Kept in your book.",
    );
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
      () => navigate("do"),
      "Saved. Pick it up from Think it through.",
    );
  }
  function newMoment(draft: Draft) {
    if (!v) return;
    void commit(
      (b) => beginNewMoment(updateDraft(b, v.id, draft)),
      () => navigate("session"),
    );
  }
  function finish(draft: Draft) {
    if (!v) return;
    void commit(
      (b) => completeVisit(b, v.id, draft),
      () => navigate("bookmark"),
      "Saved in your book.",
    );
  }
  // Leaving a game never locks the book; the round stays saved to resume.
  function endGame() {
    navigate("do");
    if (activeGame) setNotice("Your round is saved. Pick it up from Activities.");
  }
  function gameAction(action: GameAction) {
    const gameId = l.game?.id;
    void commit(
      (b) =>
        changeLiving(b, (x) => {
          if (!x.game || x.game.id !== gameId)
            throw new Error("This game changed. Reopen its latest turn.");
          // A round that reaches its reveal is in the book straight away, even
          // if nobody taps Finish round (Scott, 2026-11-20).
          return recordRound({ ...x, game: advanceGame(x.game, action) });
        }),
      undefined,
      action.type === "approve" ? "Approval updated." : "",
    );
  }
  // A plan kept from an exercise, asked about a few days later.
  function answerPlan(id: string, answer: CheckBackAnswer) {
    void commit(
      (b) => answerCheckBack(b, id, answer),
      undefined,
      answer.kind === "later"
        ? "We’ll ask again in two days."
        : answer.kind === "let-go"
          ? "Set aside. The page stays in Your book."
          : "Saved with your plan.",
    );
  }
  function createGame(kind: Game["kind"], players: Player[]) {
    void commit(
      (b) =>
        // A round left at its reveal is still noted before it is replaced.
        changeLiving(b, (x) =>
          startGame(
            x,
            kind,
            players,
            b.profile?.kind === "child" ? b.profile.ageBand : undefined,
          ),
        ),
      () => navigate("play"),
    );
  }
  /** Deletes a page from this book; reports how it went. */
  async function deleteFromBook(pageId: string) {
    setError("");
    try {
      await vault.save((b) => deletePage(b, pageId));
      setNotice("Deleted from your book.");
      sensory.play("place");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "This couldn’t be deleted. Please try again.");
      return false;
    }
  }
  function finishGame() {
    void commit(
      finishRound,
      () => openFamily(),
      "A good place to stop.",
    );
  }
  const sessionOpen = view === "session" && v && v.status !== "complete";
  const privateEditorOpen = !!sessionOpen || journalEditing;
  // Journal navigation queues behind autosave; guided visits still use their pause action.
  const headerBusy =
    working || !!sessionOpen || (!journalEditing && vault.busy);
  const activeGame = l.game && l.game.stage !== "finished" ? l.game : undefined;
  // A game in progress gets the whole screen: no top bar, just End game.
  const sharedView = view === "play";
  const place = placeOf[view];
  // Places draw their own big heading; sub-screens keep the small running head.
  const placeScreen = view === place && view !== "journal" && !closed;
  // Exercises and the journal draw their own back link and privacy note.
  const ownHead =
    !closed && (view === "tools" || view === "words" || view === "journal");
  const canInvite = !sample && online;
  const roster: Player[] = [
    { id: "owner", name: book.owner, audience: audienceOf(book) },
    ...(family || []).map((p) => ({ id: `book:${p.id}`, name: p.name })),
    ...book.people.filter(isFamily).map((p) => ({ id: p.id, name: p.name })),
  ]
    .filter(
      (p, i, all) =>
        all.findIndex(
          (q) => q.name.trim().toLowerCase() === p.name.trim().toLowerCase(),
        ) === i,
    )
    .slice(0, 12);
  const familyNames = [
    ...(family || []).map((p) => p.name),
    ...book.people.filter(isChild).map((p) => p.name),
  ].filter((n, i, all) => all.indexOf(n) === i);
  // Account books open directly; without them, family members noted in this
  // book link to what you've written about them.
  const homePeople: FamilyPerson[] = family?.length
    ? family.map((p) => ({ ...p, hasBook: true }))
    : book.people.filter(isFamily).map((p) => ({
        id: p.id,
        name: p.name,
        note: `${p.role} · notes in your book`,
        onOpen: () => {
          openMyBook();
          setBookWho(p.id);
        },
      }));
  // Our family book: the account's, or kept inside this book without one.
  const familyAccess = familyBook ?? localFamily(book, vault.save);
  const myBookId = sample
    ? "sample"
    : (readBinding(vault.editionId)?.remoteId ?? vault.editionId);
  const sameName = (a: string, b: string) =>
    a.trim().toLowerCase() === b.trim().toLowerCase();
  const members: FamilyMember[] = [
    ...(family || []).map((p) => ({
      id: p.id,
      name: p.name,
      onOpen: p.onOpen,
      locked: p.locked,
    })),
    ...book.people.filter(isFamily).map((p) => ({ id: p.id, name: p.name })),
    ...(book.connections?.received || []).map((p) => ({
      id: `from:${p.from}`,
      name: p.fromName,
    })),
  ].filter(
    (m, i, all) =>
      !sameName(m.name, book.owner) &&
      all.findIndex((x) => sameName(x.name, m.name)) === i,
  );
  /** Adds a page to Our family book, and sends it on to a connected partner. */
  async function addToFamily(data: Pick<FamilyPage, "kind" | "text"> &
    Partial<Pick<FamilyPage, "title" | "caption" | "activity">>) {
    const page = newFamilyPage({ ...data, byName: book.owner, byBookId: myBookId });
    await familyAccess.add(page);
    if (!alive.current) return page.id;
    setNotice(sample ? "Kept in the sample for this visit." : "Added to Our family book.");
    sensory.play("place");
    if (sample || !online || !book.connections?.identity) return page.id;
    const owner = book.owner;
    void import("@/lib/relish/ai-auth")
      .then((auth) =>
        sendToPartners(auth.currentAIUser(), book, vault.save, {
          id: page.id,
          title: page.title || `From ${owner}’s family book`,
          text: page.caption ? `${page.text}\n\n— ${page.caption}` : page.text,
        }),
      )
      .then((sent) => {
        if (sent && alive.current)
          setNotice("Added to Our family book and sent to your partner’s book.");
      })
      .catch(() => {
        if (alive.current)
          setNotice(
            "Added to Our family book. It couldn’t reach your partner’s book yet; you can send it from Connected books.",
          );
      });
    return page.id;
  }
  const help =
    view === "play"
      ? {
          title: "Play one round",
          text: "Each player takes a turn or passes. Reveal together, then finish. A line from each player and a shared page are both optional; a page needs everyone’s approval. End game any time; the round is saved.",
        }
      : place === "home"
        ? {
            title: "Start here",
            text: "Try today’s suggestion, ask for another, or pick by how much time you have. What you keep goes into your book.",
          }
        : place === "do"
          ? view === "session" || view === "bookmark"
            ? {
                title: "Think it through",
                text: words.about,
              }
            : {
                title: "Activities",
                text: "Use the chips to filter by time or mood. Each card has a clear place to stop. Exercises are saved only when you keep the page; day-by-day checklists save each mark and wait for you. In Our family, things to do together come first.",
              }
          : place === "journal"
            ? {
                title: "Journal",
                text: "Write a page. Drafts save as you write, even if you switch places or lock Relish. In Just me the page is only yours. In Our family, saving also adds the whole page to Our family book. Share a passage adds just the words you choose.",
              }
            : space === "family"
              ? {
                  title: "Our family book",
                  text: "The pages your family has chosen to share. Everyone in the family sees the same pages; whoever added a page can take it out. Family members opens your children’s books and invites a partner.",
                }
              : {
                  title: "Your book",
                  text: "What you’ve learned, what’s still going, and every page you’ve kept. Tap a person to see only their pages.",
                };
  const menuItems: MenuItem[] = [
    {
      label: "Settings",
      onSelect: () => void headerAction(() => setModal("settings")),
    },
    "sound",
    { label: "Help", onSelect: () => setModal("guide") },
    // Friends start their own accounts; offered in every book (Scott, 2026-11-19).
    {
      label: "Invite a friend",
      onSelect: () =>
        void inviteFriend().then((r) => {
          if (inviteNotice[r]) setNotice(inviteNotice[r]);
        }),
    },
    ...(onAccount
      ? [
          {
            // In a child's book this asks for the parent password first.
            label:
              book.profile?.kind === "child" && !sample && accountLabel === "Sign in"
                ? "Parent account"
                : accountLabel,
            onSelect: () => void headerAction(onAccount),
          },
        ]
      : []),
    ...(!sample && accountLabel === "Sign in"
      ? [
          {
            label: "Books on this device",
            onSelect: () => void headerAction(vault.shelf),
          },
        ]
      : []),
    sample
      ? {
          label: "Create my private book",
          divider: true,
          onSelect: () => void headerAction(() => setModal("create")),
        }
      : {
          // An account book: locking also signs out, so say so.
          label: accountManaged ? "Sign out" : "Lock Relish",
          divider: true,
          onSelect: () => void headerAction(vault.lock),
        },
  ];
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
  const personalTitle = `${book.owner}’s book`;
  const headingText = closed
    ? sharedView
      ? "Our Family pages"
      : personalTitle
    : view === "home"
      ? "Home"
      : view === "do"
        ? "Activities"
        : view === "book"
          ? space === "family"
            ? "Our family book"
            : "Your book"
          : view === "journal"
            ? "Journal"
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
              : view === "bookmark" || view === "session"
                ? "Think it through"
                : "Your book";
  let right: ReactNode = null;
  const left = (
    <>
      <Illustration
        name={(l.thread && topicIllustration[l.thread]) || "think-it-through"}
        size={150}
        eager
        className="lb-guided-art"
      />
      <p className="lb-kicker">Think it through</p>
      <h2>{theme?.title || words.welcome}</h2>
      <p>{words.about}</p>
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
              "Marked as tried.",
            );
        }}
        onNewMoment={v.kind === "reflect" ? newMoment : undefined}
        onLetGo={
          v.kind === "reflect"
            ? () =>
                void commit(
                  (b) => letGoPractice(b),
                  () => navigate("do"),
                  "Plan set aside.",
                )
            : undefined
        }
      />
    );
  } else if (view === "bookmark" || view === "session") {
    const entry = lastEntry(book);
    if (v?.status === "complete") {
      const kept =
        v.kind === "practice"
          ? words.planKept
          : v.kind === "reflect"
            ? entry?.outcome
              ? outcomes[entry.outcome]
              : words.howWent
            : words.momentKept;
      right = (
        <>
          <p className="lb-kicker">
            {v.kind === "practice" ? "Plan kept" : "Kept in your book"}
          </p>
          <h2>{kept}</h2>
          {entry?.text && (
            <blockquote className="lb-kept-words">
              {entry.text.length > 280
                ? entry.text.slice(0, 279).trimEnd() + "…"
                : entry.text}
            </blockquote>
          )}
          <p>{v.kind === "practice" ? words.planLater : words.stop}</p>
          <div className="lb-actions">
            <button
              className="lb-primary"
              disabled={busy}
              onClick={() => navigate("home")}
            >
              Done for now <Check size={16} />
            </button>
            {entry && v.kind !== "practice" && (
              <button
                className="lb-text"
                disabled={busy}
                onClick={() => {
                  browse.current = null;
                  openPage(`moment:${entry.id}`);
                }}
              >
                Open it in Your book
              </button>
            )}
          </div>
          {(v.kind === "begin" || v.kind === "notice") && theme && (
            <div className="lb-later">
              <p className="lb-kicker">If you want a next step · about 1 minute</p>
              <p>{theme.practice}</p>
              <button
                className="lb-secondary"
                disabled={busy}
                onClick={() => start("practice")}
              >
                {words.makePlan} <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          {v.kind === "reflect" && (
            <div className="lb-later">
              <p className="lb-kicker">Whenever another one comes up</p>
              <button
                className="lb-secondary"
                disabled={busy}
                onClick={() => start("begin")}
              >
                Write about another moment
              </button>
            </div>
          )}
        </>
      );
    } else if (v)
      right = (
        <>
          <p className="lb-kicker">Paused · {plans[v.kind].time}</p>
          <h2>{plans[v.kind].title}</h2>
          <p>Your words are saved. Pick up on the same page.</p>
          <button
            className="lb-primary"
            disabled={busy}
            onClick={() => start()}
          >
            Pick up where I left off <ArrowUpRight size={16} />
          </button>
          <div className="lb-actions">
            <button className="lb-text" onClick={() => backToDo()}>
              Back to Activities
            </button>
          </div>
        </>
      );
    else {
      const kind = nextKind(book),
        plan = plans[kind],
        pending = pendingPractice(book);
      right = (
        <>
          <p className="lb-kicker">{plan.time}</p>
          <h2>{kind === "reflect" ? words.askTried : plan.title}</h2>
          {kind === "reflect" && pending ? (
            <p className="lb-recall-plan">“{pending.text}”</p>
          ) : (
            <p>{plan.end}</p>
          )}
          <button
            className="lb-primary"
            disabled={busy}
            onClick={() => start()}
          >
            {kind === "reflect" ? "Say how it went" : "Start"}{" "}
            <ArrowUpRight size={16} />
          </button>
        </>
      );
    }
  }
  return (
    <div
      className={`r-app lb-app rp-shell ${journalEditing ? "lb-capturing" : ""} rp-at-${view}`}
    >
      {sample && (
        <div className="lb-sample">
          <span>
            Fictional sample · changes last until reload
          </span>
          <button
            disabled={headerBusy}
            onClick={() => void headerAction(() => setModal("create"))}
          >
            Create my private book <ArrowUpRight size={13} />
          </button>
        </div>
      )}
      {sharedView ? (
        <header className="rp-topbar rp-topbar-focused">
          <div className="rp-topbar-inner">
            <span className="rp-wordmark">relish</span>
            <button className="rp-end" disabled={busy} onClick={endGame}>
              End game
            </button>
          </div>
        </header>
      ) : (
        <TopBar
          current={place}
          initial={book.owner}
          disabled={headerBusy}
          status={!sample && onAccount ? syncStatus : undefined}
          onPlace={(next) =>
            void headerAction(() =>
              next === "journal" ? openJournal() : navigate(next),
            )
          }
          items={menuItems}
          space={space}
          onSpace={(next) =>
            void headerAction(() => {
              setSpace(next);
              // Book shows the other book and Activities re-sorts. An open
              // journal page or exercise stays where it is.
              if (view === "book" || view === "words" || view === "manual")
                navigate("book");
              else if (view === "do") navigate("do");
            })
          }
        />
      )}
      <div className="lb-desk">
        {!placeScreen && (
          <div className={`lb-subhead ${ownHead ? "lb-subhead-own" : ""}`}>
            <h1 ref={heading} tabIndex={-1} className="ui-sr-only">
              {headingText}
            </h1>
            {/* Exercises and the journal draw this row themselves. */}
            {!ownHead && (
              <SubHead
                back={
                  sharedView
                    ? undefined
                    : {
                        label: place === "book" ? "Back to your book" : "Back to Activities",
                        disabled: headerBusy,
                        onClick: () =>
                          void headerAction(() =>
                            place === "do" ? backToDo() : navigate(place),
                          ),
                      }
                }
                noteIcon={sharedView ? <Users size={15} aria-hidden="true" /> : undefined}
                note={
                  sharedView
                    ? "Only shared pages"
                    : sample
                      ? "Fictional sample"
                      : book.profile?.kind === "child"
                        ? `${ageLabels[book.profile.ageBand]} · private book`
                        : "Your private pages"
                }
              />
            )}
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
              <svg className="lb-cover-picture" viewBox="0 0 200 200" aria-hidden="true">
                <Emblem kind="leaf" />
              </svg>
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
        ) : view === "home" && !sharedView && space === "family" && audienceOf(book) === "adult" ? (
          <FamilyHome
            plan={book.familyPlan}
            owner={book.owner}
            names={[book.owner, ...members.map((m) => m.name)]}
            busy={busy}
            headingRef={heading}
            latestShared={familyAccess.pages
              .filter((p) => p.kind === "passage")
              .map((p) => ({ text: p.text, caption: p.caption }))
              .at(0)}
            onPlan={(update) =>
              vault.save((b) => {
                const { familyPlan, ...rest } = b;
                const next = update(familyPlan);
                return next ? { ...rest, familyPlan: next } : rest;
              })
            }
            onKeep={({ text, caption }) => addToFamily({ kind: "passage", text, caption })}
            onReflect={async (page) => {
              await addToFamily({ kind: "page", ...page });
            }}
            onFamilyBook={openFamily}
            onWrite={() => quickEntry()}
            onPlay={() => {
              navigate("do");
              setDoFilter("kids");
            }}
            going={underWay(book, 1)[0]}
            onResume={resume}
          />
        ) : view === "home" && !sharedView ? (
          <Home
            book={book}
            names={familyNames}
            people={homePeople}
            busy={busy}
            headingRef={heading}
            onNudge={onNudge}
            onResume={resume}
            onSaveDraft={keepDraft}
            onCheckBack={answerPlan}
            onFilter={(f) => {
              navigate("do");
              setDoFilter(f);
            }}
            onInvite={canInvite ? () => openInvite() : undefined}
            onFamily={openFamily}
            onBook={openMyBook}
            onPage={(id) => {
              browse.current = null;
              openPage(id);
            }}
            onQuickSave={async (text) => {
              const draft = { ...newJournalDraft(), text };
              await vault.save((b) => writeJournalPage(b, draft, 0, "kept"));
              sensory.play("place");
              return `journal:${draft.id}`;
            }}
            onQuickWrite={(text, voice) =>
              quickEntry(voice, { ...newJournalDraft(), text })
            }
            onQuickPhoto={(text, file) => {
              const photos = vault.photos;
              if (!photos) {
                quickEntry(false, { ...newJournalDraft(), text }, true);
                return;
              }
              setWorking(true);
              setError("");
              Promise.resolve()
                .then(() => photos.add(file))
                .then((photo) => {
                  if (!alive.current) return;
                  if (!photo)
                    throw new Error("That photo couldn’t be added. Try another.");
                  quickEntry(false, {
                    ...newJournalDraft(),
                    text,
                    photos: [photo],
                  });
                })
                .catch((e) => {
                  if (!alive.current) return;
                  setError(
                    e instanceof Error
                      ? e.message
                      : "That photo couldn’t be added. Try another.",
                  );
                  quickEntry(false, { ...newJournalDraft(), text }, true);
                })
                .finally(() => {
                  if (alive.current) setWorking(false);
                });
            }}
          />
        ) : view === "do" && !sharedView ? (
          <DoSomething
            key={pageKey}
            book={book}
            filter={doFilter}
            busy={busy}
            roster={roster}
            headingRef={heading}
            initialGame={gameOffer}
            together={space === "family"}
            onFilter={setDoFilter}
            onOpen={onNudge}
            onDraft={(draft) => quickEntry(false, draft)}
            onResumeGame={() => navigate("play")}
            onStartGame={createGame}
            onDiscard={(g) =>
              void commit(
                (b) => discardUnderWay(b, g),
                undefined,
                g.kind === "game" ? "Round ended. Nothing was kept." : "Removed.",
              )
            }
          />
        ) : view === "tools" && !sharedView ? (
          <Tools
            key={pageKey}
            book={book}
            busy={busy}
            roster={roster}
            sample={sample}
            family={family}
            onCommit={(update, after, message) =>
              void commit(update, after, message)
            }
            onPages={openMyBook}
            onOpenPage={(id) => {
              browse.current = null;
              openPage(id);
            }}
            onActivities={backToDo}
            onProgress={saveProgress}
            initialId={exercise}
            onBack={exercise ? backToDo : undefined}
          />
        ) : view === "manual" && !sharedView ? (
          <Manual
            book={book}
            save={vault.save}
            guide={guide}
            sample={sample}
            onPages={openMyBook}
          />
        ) : view === "book" && !sharedView && space === "family" ? (
          <OurFamily
            key={pageKey}
            book={book}
            access={familyAccess}
            me={{ name: book.owner, bookId: myBookId }}
            members={members}
            busy={busy}
            headingRef={heading}
            photos={vault.photos}
            onOpenMine={openMyBook}
            onInvite={canInvite ? openInvite : undefined}
            onAddChild={!sample && online ? onAddChild : undefined}
            onPlay={() => {
              navigate("do");
              if (audienceOf(book) === "adult") setDoFilter("kids");
            }}
            onResumeGame={() => navigate("play")}
            onCloseFinished={(again) =>
              void commit(
                (b) =>
                  changeLiving(b, (x) => ({ ...recordRound(x), game: undefined })),
                again
                  ? () => {
                      navigate("do");
                      if (audienceOf(book) === "adult") setDoFilter("kids");
                    }
                  : undefined,
              )
            }
            onRemoved={(problem) =>
              problem ? setError(problem) : setNotice("Taken out of Our family book.")
            }
            onDelete={sample ? undefined : deleteFromBook}
          />
        ) : view === "book" && !sharedView ? (
          <YourBook
            key={pageKey}
            book={book}
            busy={busy}
            headingRef={heading}
            initialWho={bookWho}
            initialQuery={bookQuery}
            onBrowse={(who, query) => {
              // Keep the saved scroll and row until Back has used them.
              browse.current = { scroll: 0, ...browse.current, who, query };
            }}
            onAddPage={() => quickEntry()}
            onIdea={() => navigate("do")}
            onOpenPage={(id) => {
              browse.current = {
                who: browse.current?.who ?? "all",
                query: browse.current?.query ?? "",
                scroll: window.scrollY,
                page: id,
              };
              openPage(id);
            }}
            onReview={(card, status) =>
              void commit(
                (b) => reviewManualIdea(b, card.id, status),
                undefined,
                status === "kept" ? "Kept in what you’ve learned." : "",
              )
            }
            onManual={() => navigate("manual")}
            onDraft={(draft) => quickEntry(false, draft)}
            onPractice={() => start("reflect")}
            onResumeVisit={() => start()}
            onExercise={openExercise}
            onAddPerson={() => setModal("person")}
            onEditPerson={setEditing}
            onCheckBack={answerPlan}
            onDeleteNote={(personId, noteId) =>
              void commit((b) => deletePersonNote(b, personId, noteId), undefined, "Note removed.")
            }
          />
        ) : (view === "words" || view === "journal") && !sharedView ? (
          <Journal
            key={pageKey}
            family={family}
            space={space}
            familyNames={members.map((m) => m.name)}
            onFamilyAdd={addToFamily}
            initialCelebrate={kept}
            onKept={(id, problem) => {
              // The saved page opens in Book with "Entry saved".
              navigate("words");
              setReading(`journal:${id}`);
              setKept(true);
              if (problem)
                setError(
                  `Saved in your book, but it wasn’t added to Our family book. ${problem}`,
                );
            }}
            navigation={journalNavigation}
            initialDraft={capture?.draft}
            initialVoice={capture?.voice}
            initialPhoto={capture?.photo}
            initialReading={reading}
            book={book}
            photos={vault.photos}
            onBack={backToBook}
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
            onActivities={() => navigate("do")}
            onDone={() => navigate("home")}
          />
        ) : view === "play" && !activeGame ? (
          <main className="rp-place">
            <p className="rp-lede">This round is over.</p>
            <button className="rp-btn rp-btn-olive" onClick={() => navigate("do")}>
              Choose something to do
            </button>
          </main>
        ) : view === "play" && activeGame ? (
          <div className={`lb-play-layout ${activeGame.stage === "ready" ? "" : "is-solo"}`}>
            {activeGame.stage === "ready" && (
              <aside>
                {activeGame.kind === "spot" ? (
                  <>
                    <p className="lb-kicker">In the car</p>
                    <h2>One phone, read aloud</h2>
                    <p>Everyone else watches the road and calls out.</p>
                  </>
                ) : (
                  <>
                    <p className="lb-kicker">Play together</p>
                    <h2>Pass it around</h2>
                    <p>One round, on this device.</p>
                  </>
                )}
                <Illustration
                  name={gameIllustration[activeGame.kind] ?? "do-something"}
                  size={180}
                  className="lb-play-art"
                />
                <p className="lb-fine">
                  Private pages stay out of the game. End game any time; the
                  {activeGame.kind === "spot" ? " card" : " round"} waits for you.
                </p>
              </aside>
            )}
            <main className="lb-play-main" key={activeGame.id}>
              <GroupPlay
                book={book}
                game={activeGame}
                busy={busy}
                onAction={gameAction}
                onKeep={() =>
                  void commit(
                    (b) => changeLiving(keepGame(b), recordRound),
                    undefined,
                    "Everyone approved. A shared page is kept.",
                  )
                }
                onPause={endGame}
                onFinish={finishGame}
                onKeepNotes={
                  book.profile?.kind === "child"
                    ? undefined
                    : async (notes) => {
                        try {
                          await vault.save((b) => keepNotes(b, notes));
                          sensory.play("place");
                          return true;
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "The notes couldn’t be kept. Please try again.",
                          );
                          return false;
                        }
                      }
                }
                onCancel={() =>
                  void commit(
                    (b) => changeLiving(b, (x) => ({ ...x, game: undefined })),
                    () => navigate("do"),
                  )
                }
              />
            </main>
          </div>
        ) : (
          <BookSpread
            as="main"
            key={pageKey}
            className={`lb-guided ${sessionOpen ? "lb-session-book" : ""}`}
            left={<div className="lb-guided-left">{left}</div>}
            right={<div className="lb-guided-right">{right}</div>}
          />
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
          title="Who this book is for"
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
              setNotice("Saved.");
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
            This book’s pages, drafts, plans and games are{" "}
            {sample
              ? "examples in memory only"
              : accountManaged
                ? "encrypted and saved automatically to your account, including its parent-managed child books"
                : "encrypted in this browser on this device"}
            .{" "}
            {online
              ? "AI only sees words you review and choose to send. Suggestions in Your book have their own opt-in. Photos and people tags are never sent to AI. Saving to your account doesn’t give AI access to your book."
              : "AI chat and online passage sharing are off in this book. Voice writing and Relish suggestions, where offered, need a parent’s permission through a parent’s account."}
          </p>
          {!sample && (
            <div className="lb-boundary">
              <h3>Who this book is for</h3>
              <p>{ageLabels[audienceOf(book)]}</p>
              <p className="lb-fine">
                {online
                  ? "An adult’s book. AI help and family connections are available when you choose them."
                  : accountManaged
                    ? "This child’s book belongs to the parent account and saves automatically online. The parent account password protects age changes and switching to other books. Voice writing needs a parent’s separate permission."
                    : "Prompts are written for this age. A separate parent passphrase protects these settings. Children have no account of their own and no online passage sharing."}
              </p>
              <button
                className="lb-secondary"
                onClick={() => setModal("profile")}
              >
                Change who this book is for
              </button>
            </div>
          )}
          <div className="lb-boundary">
            <h3>Back up your book</h3>
            <p>
              {sample
                ? "The sample can’t be backed up. Create your own book to keep pages."
                : accountManaged
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
              <Users size={16} /> Connected books and your account
            </button>
          )}
          <p className="lb-fine">
            <a href="/privacy/" target="_blank" rel="noreferrer">
              Read how Relish handles your data
            </a>
          </p>
          {!sample && (
            <details className="lb-boundary">
              <summary>Remove {book.owner}’s book from this device</summary>
              <p>
                This permanently deletes the copy of {book.owner}’s book on this
                device. Export a backup first if you want to keep it. Online
                connections, other books and backups are separate.
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
                          : "This book couldn’t be removed. It is still here.",
                      ),
                    )
                }
              >
                Remove from this device
              </button>
            </details>
          )}
          <SoundSettings />
          <TypingSoundSetting />
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
          <p className="lb-kicker">How Relish is laid out</p>
          <h2>{help.title}</h2>
          <p>{help.text}</p>
          <div className="lb-boundary">
            <strong>Four places</strong>
            <p>
              Home suggests one small thing a day. Book holds what you’ve
              learned and every page you’ve kept; switch to Our family for the
              pages your family shares. Journal is where you write. Activities
              has every activity, filtered by time or mood. Just me and Our
              family, at the top, choose whose pages you see.
            </p>
          </div>
          <div className="lb-boundary">
            <strong>
              {online ? "Privacy and optional AI" : "Age-based prompts"}
            </strong>
            <p>
              {!online
                ? "These are written prompts chosen for your age, not an AI conversation. Your words stay here. You can pause, pass, or ask a trusted grown-up for help."
                : "Your pages stay private. Only passages and pages you choose go to Our family book or a partner’s book. Games never include private writing. AI help is optional, and you review the exact excerpt first."}
            </p>
          </div>
          <button className="lb-primary" onClick={() => setModal(null)}>
            Close help
          </button>
        </Dialog>
      )}
    </div>
  );
}
