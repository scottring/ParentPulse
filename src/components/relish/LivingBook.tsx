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
import { sampleIncoming, sampleRecipients, type Book, type Person } from "@/lib/relish/model";
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
  recordOfflinePlay,
  recordRound,
  startGame,
  updateDraft,
  type Draft,
  type Game,
  type GameAction,
  type Player,
  type PlayRecord,
  type SessionKind,
} from "@/lib/relish/living";
import type { useLocalBook } from "./useLocalBook";
import { Dialog, EditPerson, PersonForm, VaultForm } from "./BookForms";
import { SoundSettings, useSensory } from "./Sensory";
import VisitEditor from "./VisitEditor";
import Journal from "./Journal";
import {
  audienceOfEntry,
  newJournalDraft,
  writeJournalPage,
  type JournalDraft,
  type JournalEntry,
} from "@/lib/relish/journal";
import "./duo.css";
import "./places.css";
import Illustration, { Emblem } from "./Illustration";
import { BookSpread, SubHead } from "./ui";
import { gameIllustration, topicIllustration } from "./illustrations";
import Manual, { useManualGuide } from "./Manual";
import { reviewManualIdea } from "@/lib/relish/manual";
import {
  answerCheckBack,
  clearExerciseRun,
  remindTonight,
  saveExerciseRun,
  setMark,
  stopTracker,
  todayKey,
  type CheckBackAnswer,
  type ExerciseRun,
} from "@/lib/relish/tools";
import { playNotePage } from "@/lib/relish/play-notes";
import GroupPlay from "./GroupPlay";
import Tools from "./Tools";
import ConnectedEditions from "./ConnectedEditions";
import EditionSetup from "./EditionSetup";
import { guidanceFor } from "@/lib/relish/guidance";
import { TypingSoundSetting } from "./TypingSound";
import TopBar, {
  kidJournalName,
  type KidJournal,
  type MenuItem,
  type Place,
  type Space,
} from "./TopBar";
import { inviteFriend, inviteNotice } from "@/lib/relish/invite";
import { keepNotes } from "@/lib/relish/game-notes";
import { deletePage, deletePersonNote, discardUnderWay } from "@/lib/relish/delete";
import Home, { type FamilyPerson } from "./Home";
import DoSomething from "./DoSomething";
import YourBook from "./YourBook";
import type { FamilyMember } from "./Family";
import { localFamily, type FamilyAccess } from "./useFamilyBook";
import { newFamilyPage, type FamilyPage } from "@/lib/relish/family-pages";
import {
  keepIncoming,
  loadCircle,
  openIncomingPhoto,
  sendToPartners,
  setAsideIncoming,
  type Incoming,
  type Recipient,
} from "@/lib/relish/partner-share";
import { keepReceived } from "@/lib/relish/sharing";
import { copyPhotos, type PhotoLoader } from "@/lib/relish/photos";
import type { StreamItem } from "@/lib/relish/journal-stream";
import type { TimelineFilter } from "@/lib/relish/journal-timeline";
import { sameName as sameMention } from "@/lib/relish/mentions";
import { namesList } from "@/lib/relish/tools";
import ShareSheet, { ShareEntrySheet, type SendWords } from "./ShareSheet";
import type { Mentionable } from "./Journal";
import { takeSuggestion, takenToday, type NudgeAction } from "@/lib/relish/nudges";
import { isChild, isFamily, type DoFilter, type UnderWay } from "@/lib/relish/catalog";
import type { ActsFilter } from "@/lib/relish/activities";
import { canUseOnline, ageLabels, audienceOf } from "@/lib/relish/profiles";
import TableMode, { type TableOpen } from "./TableMode";
import { tableNotePage, tonightFor } from "@/lib/relish/table-mode";
import {
  familyLineFor,
  inNativeApp,
  listenToNative,
  postToNative,
  readFamilyLineWidget,
  sharedImageFile,
  widgetMessage,
  writeFamilyLineWidget,
  type NativeMessage,
} from "@/lib/relish/native-bridge";

// Three places, plus the sub-screens that open inside them. "book" is the
// Journal place's page: My journal or Our family journal, by `space`.
type View =
  | "book"
  | Place
  | "bookmark"
  | "manual"
  | "session"
  | "words"
  | "play"
  | "table"
  | "tools";
const placeOf: Record<View, Place> = {
  home: "home",
  do: "do",
  table: "do",
  tools: "do",
  session: "do",
  bookmark: "do",
  play: "do",
  book: "journal",
  words: "journal",
  manual: "journal",
  journal: "journal",
};
/**
 * Which journal was open last (My journal or Our family journal), remembered
 * per book on this device. Phones open Journal onto it. Home and Activities
 * don't depend on it; writing takes its audience from the draft.
 */
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
    /* Without storage the choice still works for this visit. */
  }
}
type Modal =
  "settings" | "create" | "person" | "guide" | "connections" | "profile" | null;
type Vault = Omit<
  ReturnType<typeof useLocalBook>,
  | "syncSnapshot"
  | "openSynced"
  | "receiveSynced"
  | "accountSnapshot"
  | "autoLocked"
  | "openSampleChild"
  | "closeSampleChild"
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
  onBackHome,
}: {
  vault: Vault;
  onAccount?: () => void;
  accountLabel?: string;
  syncStatus?: string;
  onInteraction?: (paused: boolean) => void;
  /** Other books in this account (children): Kids' journals in the Journal menu. */
  family?: FamilyPerson[];
  /** Opens the add-a-child form. */
  onAddChild?: () => void;
  /** Where the book opens, e.g. Our family journal after switching back from a child's book. */
  startView?: "family";
  /** From a child's journal: back to the parent's own (asks for the parent password). */
  onBackHome?: () => void;
  /**
   * The account's Our family journal. Without it (no account, or the sample),
   * family pages are kept inside this journal.
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
    [bookFilter, setBookFilter] = useState<TimelineFilter>("all"),
    [replyTo, setReplyTo] = useState<Recipient | null>(null),
    // Share, from a page you wrote: its journal id while the sheet is open.
    [sharingEntry, setSharingEntry] = useState<string | null>(null),
    [kept, setKept] = useState(false),
    [passage, setPassage] = useState(false),
    [showMembers, setShowMembers] = useState(false),
    [actsFilter, setActsFilter] = useState<ActsFilter>("all"),
    // Table mode: what's on the table, and whether the phone itself stood up.
    [table, setTable] = useState<TableOpen | null>(null),
    [tablePosture, setTablePosture] = useState(false),
    // The family-line widget, off until a grown-up turns it on (iPhone app only).
    [familyLineOn, setFamilyLineOn] = useState(() => readFamilyLineWidget(vault.editionId));
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
  // The circle, for My journal and Send a line: who a line can go to, and
  // what's waiting to be kept. Grown-ups' journals only. The sample has Anna.
  const [recipients, setRecipients] = useState<Recipient[]>(() =>
    sample ? sampleRecipients() : [],
  );
  const [incoming, setIncoming] = useState<Incoming[]>(() => (sample ? sampleIncoming() : []));
  // Photos of passages waiting to be kept, opened once each while this is open.
  const incomingPhotos = useRef(new Map<string, Promise<Blob>>());
  const grownUp = audienceOf(book) === "adult";
  const circle = grownUp ? recipients : [];
  const waiting = grownUp ? incoming : [];
  const identityUid = book.connections?.identity?.uid;
  const latestBook = useRef(book);
  useEffect(() => {
    latestBook.current = book;
  });
  // Read again each time My journal opens; nothing is ever pushed to anyone.
  const circleKey = view === "book" ? pageKey : -1;
  useEffect(() => {
    if (sample || !online || !identityUid) return;
    let live = true;
    let unsubscribe: undefined | (() => void);
    Promise.all([import("@/lib/relish/ai-auth"), import("firebase/auth")])
      .then(([a, f]) => {
        if (!live) return;
        unsubscribe = f.onAuthStateChanged(a.getAIAuth(), (user) => {
          loadCircle(user, latestBook.current)
            .then((c) => {
              if (!live) return;
              setRecipients(c?.recipients ?? []);
              setIncoming(c?.incoming ?? []);
            })
            .catch(() => {
              // My journal still opens; Connected journals has the details.
            });
        });
      })
      .catch(() => {});
    return () => {
      live = false;
      unsubscribe?.();
    };
  }, [sample, online, identityUid, circleKey]);
  // Where the writer was in My journal when they opened a page, so Back can
  // put them there again. Opening My journal from the menu starts a fresh browse.
  const browse = useRef<{
    who: string;
    query: string;
    filter?: TimelineFilter;
    scroll: number;
    page?: string;
  } | null>(null);
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
  /** Back to the journal exactly as it was left: filter, search, scroll, row. */
  function backToBook() {
    const saved = browse.current;
    navigate("book");
    if (saved) {
      restoring.current = true;
      setBookWho(saved.who);
      setBookQuery(saved.query);
      setBookFilter(saved.filter ?? "all");
    }
  }
  /** Back to Activities with the chip that was chosen (the filter is kept across visits). */
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
    setBookFilter("all");
    setReplyTo(null);
    setSharingEntry(null);
    setKept(false);
    setPassage(false);
    setShowMembers(false);
    setTable(null);
    setTablePosture(false);
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
  /**
   * Writes in a journal: that journal's draft in progress, or a new page. The
   * draft carries its journal, so a private draft is only ever resumed from
   * My journal and a family draft only from Our family journal.
   */
  function openJournal(
    draft?: JournalDraft,
    voice = false,
    photo = false,
    audience: Space = draft ? audienceOfEntry(draft) : "me",
  ) {
    const latest = (book.journal || [])
      .filter((e) => e.status === "draft" && audienceOfEntry(e) === audience)
      .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const chosen = draft ?? latest ?? newJournalDraft(audience);
    setSpace(audienceOfEntry(chosen));
    navigate("journal");
    setCapture({ draft: chosen, voice, photo });
    setJournalEditing(true);
  }
  function quickEntry(voice = false, draft = newJournalDraft(), photo = false) {
    openJournal(draft, voice, photo);
  }
  /**
   * The one Journal page (2026-11-22): Our family journal down the spine, this
   * writer's own branches off it. "My journal" opens all of it.
   */
  function openMyBook() {
    setSpace("me");
    navigate("book");
  }
  /** The same page, showing only the family's spine. */
  function openFamily() {
    setSpace("family");
    navigate("book");
    setBookFilter("family");
  }
  /** Who's in our family, from the avatar menu: Our family journal with the list open. */
  function openMembers() {
    openFamily();
    setShowMembers(true);
  }
  /** Reads a kept page; Back goes to the journal. */
  function openPage(id: string) {
    setSpace("me");
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
  /** Lets something under way go without keeping it. */
  function discard(g: UnderWay) {
    void commit(
      (b) => discardUnderWay(b, g),
      undefined,
      g.kind === "game" ? "Round ended. Nothing was kept." : "Let go.",
    );
  }
  /**
   * A played round leaves one short note in Our family journal (game, who, the
   * day); the answers stay here unless everyone approves a shared page. The
   * note's id comes from the play, so recording again never adds a second.
   * Only an adult's book notes plays; a child's book doesn't.
   */
  const noted = useRef(new Set<string>());
  async function notePlay(play: Pick<PlayRecord, "id" | "kind" | "players" | "playedAt">) {
    if (audienceOf(book) !== "adult" || noted.current.has(play.id)) return;
    noted.current.add(play.id);
    const page = playNotePage(play, { name: book.owner, bookId: myBookId });
    if (familyAccess.pages.some((p) => p.id === page.id)) return;
    try {
      await familyAccess.add(page);
    } catch {
      // The round is still in this journal; the note can go up next time it's recorded.
      noted.current.delete(play.id);
    }
  }
  /** After a change that may have reached the reveal: note the play once. */
  function notePlayOf(gameId: string | undefined, b: Book) {
    const play = gameId ? (livingOf(b).plays || []).find((r) => r.id === gameId) : undefined;
    if (play) void notePlay(play);
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
      "Kept in your journal.",
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
  /** Runs something that reaches past this journal (the circle), like commit. */
  async function act(task: () => Promise<void>, message = "") {
    if (operation.current) return;
    operation.current = true;
    setWorking(true);
    setError("");
    try {
      await task();
      if (alive.current && message) {
        setNotice(message);
        sensory.play("place");
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "That didn’t go through. Please try again.");
    } finally {
      operation.current = false;
      if (alive.current) setWorking(false);
    }
  }
  /** Keep it: a line someone sent is saved in My journal. */
  function keepOffer(item: StreamItem) {
    const offer = item.offer;
    if (!offer) return;
    void act(async () => {
      let lost = "";
      if (sample)
        await vault.save((b) => ({ ...b, connections: keepReceived(b.connections, offer) }));
      else {
        const auth = await import("@/lib/relish/ai-auth");
        const { missing } = await keepIncoming(auth.currentAIUser(), book, vault.save, offer, vault.photos.store);
        // Said plainly, not implied: the page shows "Photo unavailable" for it.
        if (missing)
          lost = missing === 1 ? " One photo didn’t come through." : ` ${missing} photos didn’t come through.`;
      }
      if (!alive.current) return;
      setIncoming((list) => list.filter((o) => o.id !== offer.id));
      setNotice((sample ? "Kept in the sample for this visit." : "Kept in your journal.") + lost);
      sensory.play("place");
    });
  }
  /** Set aside: not kept. The sender's copy says you passed; nobody is told anything else. */
  function setAside(item: StreamItem) {
    const offer = item.offer;
    if (!offer) return;
    void act(async () => {
      if (!sample) {
        const auth = await import("@/lib/relish/ai-auth");
        await setAsideIncoming(auth.currentAIUser(), book, offer.id);
      }
      if (alive.current) setIncoming((list) => list.filter((o) => o.id !== offer.id));
    }, "Set aside. It isn’t kept in your journal.");
  }
  /**
   * Send a line: the chosen words go to these people's journals, under Sent
   * to me, and nowhere else. Relish doesn't ping them.
   */
  async function sendLine(to: Recipient[], words: SendWords & { sourceId?: string }) {
    const names = to.map((r) => r.name);
    const title = words.title.trim().slice(0, 120) || `A line from ${book.owner}`;
    const extras = {
      ...(words.note.trim() ? { note: words.note.trim().slice(0, 1000) } : {}),
      ...(words.caption.trim() ? { caption: words.caption.trim().slice(0, 200) } : {}),
      ...(words.sourceId ? { sourceId: words.sourceId } : {}),
    };
    // A whole entry's photos: copies, kept in this journal as what you sent,
    // and encrypted on this device for the people chosen.
    const copies = await copyPhotos(words.photos, vault.photos);
    if (copies.length) await vault.photos.store!(copies);
    const photos = copies.map((c) => c.photo);
    if (sample) {
      const createdAt = new Date().toISOString();
      await vault.save((b) => ({
        ...b,
        connections: {
          ...b.connections,
          received: b.connections?.received || [],
          outgoing: [
            ...(b.connections?.outgoing || []),
            {
              id: crypto.randomUUID(),
              circleId: "sample",
              title,
              text: words.text.trim().slice(0, 8000),
              recipients: to.map((r) => r.uid),
              recipientNames: names,
              packets: {},
              createdAt,
              sent: true,
              audience: "direct",
              ...extras,
              ...(photos.length ? { photos } : {}),
            },
          ],
        },
      }));
    } else {
      const auth = await import("@/lib/relish/ai-auth");
      const sent = await sendToPartners(
        auth.currentAIUser(),
        book,
        vault.save,
        { id: crypto.randomUUID(), title, text: words.text },
        {
          recipients: to.map((r) => r.uid),
          audience: "direct",
          ...extras,
          ...(copies.length ? { photos: copies, keepPhotoCopies: true } : {}),
        },
      ).catch(async (e) => {
        // Copies nothing kept refers to (the send never started) are let go;
        // discard keeps any an unsent record still lists.
        if (copies.length) await vault.photos.discard?.(photos.map((p) => p.id)).catch(() => {});
        throw e;
      });
      if (!sent) {
        if (copies.length) await vault.photos.discard?.(photos.map((p) => p.id)).catch(() => {});
        throw new Error(
          "This journal isn’t connected right now. Open Connected journals, then try again.",
        );
      }
    }
    if (!alive.current) return;
    const whose = namesList(names.map((n) => `${n}’s`));
    setNotice(
      sample
        ? `Sent to ${namesList(names)} in the sample. In a real journal it shows up in ${whose} journal under “Sent to me.”`
        : `Sent to ${namesList(names)}. It shows up in ${whose} journal under “Sent to me.”`,
    );
    sensory.play("place");
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
      "Saved in your journal.",
    );
  }
  // Leaving a game never locks the book; the round stays saved to resume.
  function endGame() {
    navigate("do");
    if (activeGame) setNotice("Your round is saved. Pick it up from Activities.");
  }
  function gameAction(action: GameAction) {
    const gameId = l.game?.id;
    let after: Book | undefined;
    void commit(
      (b) => {
        after = changeLiving(b, (x) => {
          if (!x.game || x.game.id !== gameId)
            throw new Error("This game changed. Reopen its latest turn.");
          // A round that reaches its reveal is in the book straight away, even
          // if nobody taps Finish round (Scott, 2026-11-20).
          return recordRound({ ...x, game: advanceGame(x.game, action) });
        });
        return after;
      },
      () => after && notePlayOf(gameId, after),
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
          ? "Set aside. Only you can see it."
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
  /** Deletes a page from this journal; reports how it went. */
  async function deleteFromBook(pageId: string) {
    setError("");
    try {
      await vault.save((b) => deletePage(b, pageId));
      setNotice("Deleted from your journal.");
      sensory.play("place");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "This couldn’t be deleted. Please try again.");
      return false;
    }
  }
  function finishGame(again = false) {
    const gameId = l.game?.id;
    const kind = l.game?.kind;
    let after: Book | undefined;
    void commit(
      (b) => (after = finishRound(b)),
      () => {
        if (after) notePlayOf(gameId, after);
        if (again && kind) {
          navigate("do");
          setGameOffer(kind);
        } else openFamily();
      },
      again ? "" : "A good place to stop.",
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
  const placeScreen = (view === "book" || (view === place && view !== "journal")) && !closed;
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
  // Our family journal: the account's, or kept inside this journal without one.
  const familyAccess = familyBook ?? localFamily(book, vault.save, vault.photos);
  /**
   * Photos on shared pages, from wherever each is kept: Our family journal
   * (the account's family book), a passage still waiting to be kept (opened
   * from the relay with the key inside it), else this journal itself.
   */
  const sharedPhotos: PhotoLoader = {
    load: (id) => {
      if (familyAccess.photos && familyAccess.kind === "account" && familyAccess.pages.some((p) => p.photos?.some((x) => x.id === id)))
        return familyAccess.photos.load(id);
      const offer = waiting.find((o) => o.photos?.some((p) => p.id === id));
      if (offer && !sample) {
        const key = `${offer.id}:${id}`;
        const known = incomingPhotos.current.get(key);
        if (known) return known;
        const next = import("@/lib/relish/ai-auth").then(async (auth) => {
          const user = auth.currentAIUser();
          if (!user) throw new Error("Sign in to see this photo.");
          const blob = await openIncomingPhoto(user, offer, id);
          if (!blob) throw new Error("This photo is no longer available.");
          return blob;
        });
        next.catch(() => incomingPhotos.current.delete(key));
        incomingPhotos.current.set(key, next);
        return next;
      }
      return vault.photos.load(id);
    },
  };
  // The sample's child (Leo) has his own id, so his pages read as his.
  const myBookId = sample
    ? book.profile?.kind === "child"
      ? `sample-${book.owner.trim().toLowerCase()}`
      : "sample"
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
  // Who can be @-mentioned while writing: this journal's people, the family,
  // and whoever writes in Our family journal.
  const mentionable: Mentionable[] = [
    ...book.people.map((p) => ({ name: p.name, id: p.id, role: p.role })),
    ...members.map((m) => ({ name: m.name })),
    ...familyAccess.pages.map((p) => ({ name: p.byName })),
  ].filter(
    (m, i, all) =>
      !!m.name.trim() &&
      !sameMention(m.name, book.owner) &&
      !m.name.includes(" + ") &&
      all.findIndex((x) => sameMention(x.name, m.name)) === i,
  );
  /**
   * Adds a page to Our family journal, and sends it on to a connected
   * partner. A whole entry's photos go as copies: encrypted with the family
   * journal's key there, and for each partner on the way to them.
   */
  async function addToFamily(data: Pick<FamilyPage, "kind" | "text"> &
    Partial<Pick<FamilyPage, "title" | "caption" | "activity" | "mentions" | "sourceId" | "photos">>) {
    const copies = await copyPhotos(data.photos, vault.photos);
    const page = newFamilyPage({
      ...data,
      photos: copies.map((c) => c.photo),
      byName: book.owner,
      byBookId: myBookId,
    });
    await familyAccess.add(page, copies);
    if (!alive.current) return page.id;
    setNotice(sample ? "Kept in the sample for this visit." : "Added to Our family journal.");
    sensory.play("place");
    if (sample || !online || !book.connections?.identity) return page.id;
    const owner = book.owner;
    void import("@/lib/relish/ai-auth")
      .then((auth) =>
        sendToPartners(auth.currentAIUser(), book, vault.save, {
          id: page.id,
          title: page.title || `From ${owner}’s family journal`,
          text: page.caption ? `${page.text}\n\n— ${page.caption}` : page.text,
        }, { audience: "family", ...(copies.length ? { photos: copies } : {}) }),
      )
      .then((sent) => {
        if (sent && alive.current)
          setNotice("Added to Our family journal and sent to your partner’s journal.");
      })
      .catch(() => {
        if (alive.current)
          setNotice(
            "Added to Our family journal. It couldn’t reach your partner’s journal yet; you can send it from Connected journals.",
          );
      });
    return page.id;
  }
  /**
   * Share, from a saved page you wrote (the timeline or the page itself): the
   * whole entry, or a passage, to Our family journal or to chosen grown-ups.
   * Grown-ups' journals only; nothing goes anywhere until the sheet's button.
   */
  const entrySheet = grownUp && sharingEntry && (
    <ShareEntrySheet
      book={book}
      journalId={sharingEntry}
      others={members.map((m) => m.name)}
      mentionable={mentionable.map((m) => m.name)}
      recipients={circle}
      photoAccess={vault.photos}
      onAdd={addToFamily}
      onSend={sendLine}
      onConnect={
        canInvite && !circle.length
          ? () => {
              setSharingEntry(null);
              openInvite();
            }
          : undefined
      }
      onClose={() => setSharingEntry(null)}
    />
  );
  // ── Table mode ────────────────────────────────────────────────────────────
  const adultBook = audienceOf(book) === "adult";
  const tonight = tonightFor(adultBook ? book.familyPlan : undefined);
  const tableSitting = useRef("");
  const tableFrom = useRef<View>("do");
  /** Stands the phone up: one card at a time, tap for the next. */
  function openTable(open: TableOpen, posture = false) {
    if (view !== "table") tableFrom.current = view;
    navigate("table");
    tableSitting.current = crypto.randomUUID();
    setTable(open);
    setTablePosture(posture);
  }
  function leaveTable() {
    const from = tableFrom.current;
    navigate(from === "home" || from === "book" ? from : "do");
  }
  /** Spot it! in Table mode: the round under way, or a new one with everyone. */
  function startSpotTable(players: Player[] = roster) {
    if (activeGame?.kind === "spot") return openTable({ kind: "spot" });
    if (players.length < 2) {
      // Nobody else in this journal yet: choose who's in the car first.
      navigate("do");
      setGameOffer("spot");
      return;
    }
    void commit(
      (b) =>
        changeLiving(b, (x) =>
          startGame(
            x,
            "spot",
            players,
            b.profile?.kind === "child" ? b.profile.ageBand : undefined,
          ),
        ),
      () => openTable({ kind: "spot" }),
    );
  }
  /** Done spotting: the card stays in this journal; the note only if they keep it. */
  function finishSpotTable(keepNote: boolean) {
    const gameId = l.game?.id;
    let after: Book | undefined;
    void commit(
      (b) =>
        (after = finishRound(
          changeLiving(b, (x) =>
            x.game?.stage === "choose"
              ? { ...x, game: advanceGame(x.game, { type: "done" }) }
              : x,
          ),
        )),
      () => {
        if (keepNote && after) notePlayOf(gameId, after);
        navigate("do");
      },
      keepNote ? "Kept. A note is in Our family journal." : "Done. The card is in your journal.",
    );
  }
  /** Tonight's one note: who told their stories, never what they said. */
  async function keepTableNote(names: string[]) {
    if (table?.kind !== "tonight") return;
    const page = tableNotePage(tableSitting.current, names, table.tonight, {
      name: book.owner,
      bookId: myBookId,
    });
    if (!familyAccess.pages.some((p) => p.id === page.id)) await familyAccess.add(page);
    if (!alive.current) return;
    setNotice(sample ? "Kept in the sample for this visit." : "Added to Our family journal.");
    sensory.play("place");
  }
  /** A new private draft with a photo; the photo picker if it can't be added. */
  function quickPhoto(text: string, file: File) {
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
        if (!photo) throw new Error("That photo couldn’t be added. Try another.");
        quickEntry(false, { ...newJournalDraft(), text, photos: [photo] });
      })
      .catch((e) => {
        if (!alive.current) return;
        setError(e instanceof Error ? e.message : "That photo couldn’t be added. Try another.");
        quickEntry(false, { ...newJournalDraft(), text }, true);
      })
      .finally(() => {
        if (alive.current) setWorking(false);
      });
  }

  // ── The iPhone app (native-bridge.ts) ─────────────────────────────────────
  /** What the app asks for: a place to open, words shared to Relish, the phone standing up. */
  function fromNative(m: NativeMessage): boolean {
    if (m.type === "posture") {
      if (m.tent && view !== "table") {
        // Never over an editor, a guided visit or an open dialog.
        if (privateEditorOpen || modal !== null || busy) return false;
        openTable({ kind: "tonight", tonight }, true);
      } else if (m.tent) setTablePosture(true);
      else if (view === "table" && tablePosture) leaveTable();
      return true;
    }
    if (m.type === "share") {
      // Always a new page in this writer's private journal, never shared.
      void headerAction(() => {
        if (m.image)
          void sharedImageFile(m.image)
            .then((file) => quickPhoto(m.text, file))
            .catch(() => quickEntry(false, { ...newJournalDraft(), text: m.text }));
        else quickEntry(false, { ...newJournalDraft(), text: m.text });
        postToNative({ v: 1, type: "share-received", id: m.id });
      });
      return true;
    }
    void headerAction(() => {
      if (m.place === "new-entry") quickEntry();
      else if (m.place === "table") openTable({ kind: "tonight", tonight });
      else if (m.place === "spot") startSpotTable();
      else if (m.place === "family") openFamily();
      else {
        navigate("do");
        setActsFilter("together");
      }
    });
    return true;
  }
  const native = useRef(fromNative);
  useEffect(() => {
    native.current = fromNative;
  });
  useEffect(() => {
    const stop = listenToNative((m) => native.current(m));
    // Anything the app was holding (a shortcut, a share) can come now.
    postToNative({ v: 1, type: "ready" });
    return stop;
  }, []);
  // Widgets: tonight's activity, and a family line only if a grown-up turned it on.
  const familyLine = adultBook && familyLineOn ? familyLineFor(familyAccess.pages) : null;
  const widgets = JSON.stringify(
    widgetMessage(
      { when: tonight.when, title: tonight.title, prompt: tonight.prompt, own: tonight.own },
      familyLine,
    ),
  );
  useEffect(() => {
    postToNative(JSON.parse(widgets));
  }, [widgets]);
  const tableOpen = view === "table";
  useEffect(() => {
    postToNative({ v: 1, type: "table", open: tableOpen });
  }, [tableOpen]);
  const help =
    view === "play"
      ? {
          title: "Play one round",
          text: "Each player takes a turn or passes. Reveal together, then finish. A line from each player and a shared page are both optional; a page needs everyone’s approval. End game any time; the round is saved.",
        }
      : place === "home"
        ? {
            title: "Start here",
            text: "Lately shows what’s new in the journal, each saying who can see it: “Everyone” in the family, “Only you”, or you and someone you shared it with. Pick something to write or do on the right.",
          }
        : place === "do"
          ? view === "session" || view === "bookmark"
            ? {
                title: "Think it through",
                text: words.about,
              }
            : {
                title: "Activities",
                text: "Everything, On my own or Together narrows the shelves. Each card says whether it’s for you alone or for the family, and has a clear place to stop. Exercises are saved only when you keep the page; day-by-day checklists save each mark and wait for you.",
              }
          : view === "journal"
            ? {
                title: "Writing",
                text: "Drafts save as you write, even if you go somewhere else or lock Relish. A private page is only yours. A page in Our family journal is added there, whole, when you choose Add to our family journal. Share sends the whole page (with its photos, if you like), or just the words you choose, to the family journal or to one person.",
              }
            : {
                title: "Our family journal",
                text: "One journal. Down the middle runs what the family shares: everyone sees the same pages, and whoever added one can take it out. Off to the side are branches only some people see: your own entries, a line sent between two of you, a game you played. Each branch says who can see it. Family shows only the middle; Just me shows only your branches.",
              };
  // Kids' journals: the children's books in this account, opened as before.
  const kids: KidJournal[] = (family || []).map((p) => ({
    id: p.id,
    name: p.name,
    locked: p.locked,
    onOpen: () => void headerAction(p.onOpen),
  }));
  // Phones: the kids' journals below the one journal (in the Journal menu on
  // wider screens). The Mine / Family switch is gone: it's one journal now.
  const kidLinks = (label: string, list: KidJournal[]) =>
    list.length ? (
      <p className="rp-jkids">
        <span>{label}: </span>
        {list.map((k, i) => (
          <span key={k.id}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <button type="button" className="rp-link" disabled={headerBusy} onClick={k.onOpen}>
              {kidJournalName(k.name)}
            </button>
          </span>
        ))}
      </p>
    ) : null;
  const phoneFoot = kids.length ? (
    <>
      {kidLinks("Kids’ journals", kids.filter((k) => !k.locked))}
      {kidLinks("Earlier copies", kids.filter((k) => k.locked))}
    </>
  ) : null;
  const adult = audienceOf(book) === "adult";
  const menuItems: MenuItem[] = [
    // What the bookshelf used to hold (2026-11-21): the family, children's
    // journals and a partner, now here and in the Journal menu.
    ...(adult
      ? [
          {
            label: "Who’s in our family",
            onSelect: () => void headerAction(openMembers),
          },
          ...(!sample && online && onAddChild
            ? [{ label: "Add a child", onSelect: () => void headerAction(onAddChild) }]
            : []),
          ...(canInvite
            ? [{ label: "Invite a partner", onSelect: () => void headerAction(openInvite) }]
            : []),
        ]
      : []),
    {
      label: "Settings",
      divider: adult,
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
            // In a child's journal this asks for the parent password first.
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
            label: "Journals on this device",
            onSelect: () => void headerAction(vault.shelf),
          },
        ]
      : []),
    sample
      ? {
          label: "Create my private journal",
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
  const personalTitle = `${book.owner}’s journal`;
  const headingText = closed
    ? sharedView
      ? "Our Family pages"
      : personalTitle
    : view === "home"
      ? "Home"
      : view === "do"
        ? "Activities"
        : view === "book"
          ? "Our family journal"
          : view === "journal"
            ? space === "family"
              ? "Writing in Our family journal"
              : "Writing a private page"
            : view === "tools"
        ? "Exercises"
        : view === "manual"
        ? "Your living manual"
        : view === "words"
          ? "Your private pages"
          : view === "play"
            ? "Play together"
            : sharedView
              ? "Our Family pages"
              : view === "bookmark" || view === "session"
                ? "Think it through"
                : "Our family journal";
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
            {v.kind === "practice" ? "Plan kept" : "Kept in your journal"}
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
                Open this page
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
  if (view === "table" && table)
    return (
      <div className="r-app lb-app rp-shell rp-at-table">
        <TableMode
          open={table}
          names={roster.map((p) => p.name)}
          owner={book.owner}
          game={table.kind === "spot" ? activeGame : undefined}
          busy={busy}
          canNote={adultBook}
          posture={tablePosture}
          onAction={gameAction}
          onKeepNote={keepTableNote}
          onFinishSpot={finishSpotTable}
          onLeave={leaveTable}
        />
        <p className="lb-announcement" role="status" aria-live="polite">
          {error || notice}
        </p>
      </div>
    );
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
            Create my private journal <ArrowUpRight size={13} />
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
            void headerAction(() => (next === "journal" ? navigate("book") : navigate(next)))
          }
          items={menuItems}
          journal={place === "journal"}
          kids={kids}
          onJournal={kids.length ? () => void headerAction(openMyBook) : undefined}
        />
      )}
      {book.profile?.kind === "child" && onBackHome && !sharedView && (
        <div className="rp-kidbar">
          <span>
            <strong>{personalTitle}</strong>
          </span>
          <button type="button" disabled={headerBusy} onClick={() => void headerAction(onBackHome)}>
            Back to our family journal
          </button>
        </div>
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
                        label:
                          place === "journal"
                            ? space === "family"
                              ? "Back to our family journal"
                              : "Back to the journal"
                            : "Back to Activities",
                        disabled: headerBusy,
                        onClick: () =>
                          void headerAction(() =>
                            place === "do" ? backToDo() : place === "journal" ? navigate("book") : navigate(place),
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
                        ? `${ageLabels[book.profile.ageBand]} · private journal`
                        : "Only you"
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
        ) : view === "home" && !sharedView ? (
          <Home
            book={book}
            names={familyNames}
            busy={busy}
            headingRef={heading}
            familyPages={familyAccess.pages}
            myBookId={myBookId}
            plan={adult ? book.familyPlan : undefined}
            onNudge={onNudge}
            onResume={resume}
            onDiscard={discard}
            onSaveDraft={keepDraft}
            onCheckBack={answerPlan}
            onWrite={() => openJournal(undefined, false, false, "me")}
            onWriteFamily={() => openJournal(undefined, false, false, "family")}
            onActivities={() => navigate("do")}
            onBook={openMyBook}
            onFamily={openFamily}
            onPage={(id) => {
              browse.current = null;
              openPage(id);
            }}
            onMarkToday={(runId) =>
              void commit((b) => setMark(b, runId, todayKey(), true), undefined, "Marked for today.")
            }
            onRemindTonight={(runId) =>
              void commit(
                (b) => remindTonight(b, runId),
                undefined,
                "Home will show this again this evening.",
              )
            }
            onStopHabit={(runId) =>
              void commit((b) => stopTracker(b, runId), undefined, "Stopped. Nothing else changes.")
            }
            onFilter={(f) => {
              navigate("do");
              setDoFilter(f);
            }}
            onQuickWrite={(text, voice) =>
              quickEntry(voice, { ...newJournalDraft(), text })
            }
            onQuickPhoto={quickPhoto}
          />
        ) : view === "do" && !sharedView ? (
          <DoSomething
            key={pageKey}
            book={book}
            busy={busy}
            roster={roster}
            headingRef={heading}
            initialGame={gameOffer}
            filter={actsFilter}
            onFilter={setActsFilter}
            onOpen={onNudge}
            onResume={resume}
            onStartGame={createGame}
            onSpotTable={startSpotTable}
            onDiscard={discard}
            onOfflinePlay={async (kind, players) => {
              let play: PlayRecord | undefined;
              await vault.save((b) => {
                const [next, record] = recordOfflinePlay(b, kind, players);
                play = record;
                return next;
              });
              sensory.play("place");
              if (play) await notePlay(play);
            }}
            planFeature={
              adult && (members.length > 0 || familyAccess.pages.length > 0 || !!book.familyPlan)
                ? {
                    plan: book.familyPlan,
                    owner: book.owner,
                    names: [book.owner, ...members.map((m) => m.name)],
                    latestShared: familyAccess.pages
                      .filter((p) => p.kind === "passage")
                      .map((p) => ({ text: p.text, caption: p.caption }))
                      .at(0),
                    onPlan: (update) =>
                      vault.save((b) => {
                        const { familyPlan, ...rest } = b;
                        const next = update(familyPlan);
                        return next ? { ...rest, familyPlan: next } : rest;
                      }),
                    onKeep: ({ text, caption }) => addToFamily({ kind: "passage", text, caption }),
                    onReflect: async (page) => {
                      await addToFamily({ kind: "page", ...page });
                    },
                    onFamilyBook: openFamily,
                    onTable: (t) => openTable({ kind: "tonight", tonight: t }),
                  }
                : undefined
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
            onDone={() => navigate("home")}
            onSharePassage={(id) => {
              browse.current = null;
              openPage(id);
              setPassage(true);
            }}
          />
        ) : view === "manual" && !sharedView ? (
          <Manual
            book={book}
            save={vault.save}
            guide={guide}
            sample={sample}
            onPages={openMyBook}
          />
        ) : view === "book" && !sharedView ? (
          <>
          {entrySheet}
          {replyTo && (
            <ShareSheet
              title=""
              text=""
              selected=""
              caption=""
              owner={book.owner}
              others={[]}
              recipients={circle}
              replyTo={replyTo}
              onSend={async (to, words) => {
                await sendLine(to, words);
                if (alive.current) setReplyTo(null);
              }}
              onClose={() => setReplyTo(null)}
            />
          )}
          <YourBook
            key={pageKey}
            book={book}
            busy={busy}
            headingRef={heading}
            initialWho={bookWho}
            initialQuery={bookQuery}
            initialFilter={bookFilter}
            family={{
              access: familyAccess,
              members,
              photos: sharedPhotos,
              onWrite: () => openJournal(undefined, false, false, "family"),
              onInvite: canInvite ? openInvite : undefined,
              onAddChild: !sample && online ? onAddChild : undefined,
              onPlay: () => {
                navigate("do");
                if (audienceOf(book) === "adult") setDoFilter("kids");
              },
              onResumeGame: () => navigate("play"),
              onCloseFinished: (again) =>
                void commit(
                  (b) => changeLiving(b, (x) => ({ ...recordRound(x), game: undefined })),
                  again
                    ? () => {
                        navigate("do");
                        if (audienceOf(book) === "adult") setDoFilter("kids");
                      }
                    : undefined,
                ),
              onRemoved: (problem) =>
                problem ? setError(problem) : setNotice("Taken out of Our family journal."),
              onDelete: sample ? undefined : deleteFromBook,
              initialMembers: showMembers,
            }}
            myBookId={myBookId}
            incoming={waiting}
            onKeepOffer={keepOffer}
            onSetAside={sample || online ? setAside : undefined}
            canWriteBack={(i) => !!i.fromUid && circle.some((r) => r.uid === i.fromUid)}
            onWriteBack={(i) => {
              const to = circle.find((r) => r.uid === i.fromUid);
              if (to) setReplyTo(to);
            }}
            onBrowse={(who, query, filter) => {
              // Keep the saved scroll and row until Back has used them.
              browse.current = { scroll: 0, ...browse.current, who, query, filter };
            }}
            onAddPage={() => openJournal(undefined, false, false, "me")}
            onIdea={() => navigate("do")}
            phoneFoot={phoneFoot}
            onShareEntry={grownUp ? setSharingEntry : undefined}
            onDiscardDraft={(d) => discard({ kind: "draft", key: d.id, title: d.title, at: d.updatedAt, label: "Keep writing", draft: d })}
            onOpenPage={(id) => {
              browse.current = {
                who: browse.current?.who ?? "all",
                query: browse.current?.query ?? "",
                filter: browse.current?.filter ?? "all",
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
          </>
        ) : (view === "words" || view === "journal") && !sharedView ? (
          <>
          {entrySheet}
          <Journal
            key={pageKey}
            onShareEntry={grownUp ? setSharingEntry : undefined}
            family={family}
            familyNames={members.map((m) => m.name)}
            onFamilyAdd={addToFamily}
            mentionable={mentionable}
            recipients={circle}
            onSend={grownUp ? sendLine : undefined}
            onConnect={canInvite && !circle.length ? openInvite : undefined}
            initialCelebrate={kept}
            initialPassage={passage}
            onKept={(id, problem) => {
              // The saved page opens in the journal with "Entry saved".
              navigate("words");
              setReading(`journal:${id}`);
              setKept(true);
              if (problem)
                setError(
                  `Saved as a private page, but it wasn’t added to Our family journal. ${problem}`,
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
          </>
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
                onTable={activeGame.kind === "spot" ? () => openTable({ kind: "spot" }) : undefined}
                onFinish={() => finishGame()}
                onPlayAgain={() => finishGame(true)}
                familyNote={audienceOf(book) === "adult"}
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
          photos={vault.photos}
          sentPhotos={sharedPhotos}
          initialPassage={offered}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "profile" && !sample && !sharedView && (
        <Dialog
          title="Who this journal is for"
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
            This journal’s entries, drafts, plans and games are{" "}
            {sample
              ? "examples in memory only"
              : accountManaged
                ? "encrypted and saved automatically to your account, including its parent-managed children’s journals"
                : "encrypted in this browser on this device"}
            .{" "}
            {online
              ? "AI only sees words you review and choose to send. Suggestions from your private pages have their own opt-in. Photos and people tags are never sent to AI. Saving to your account doesn’t give AI access to your journal."
              : "AI chat and online passage sharing are off in this journal. Voice writing and Relish suggestions, where offered, need a parent’s permission through a parent’s account."}
          </p>
          {!sample && (
            <div className="lb-boundary">
              <h3>Who this journal is for</h3>
              <p>{ageLabels[audienceOf(book)]}</p>
              <p className="lb-fine">
                {online
                  ? "An adult’s journal. AI help and family connections are available when you choose them."
                  : accountManaged
                    ? "This child’s journal belongs to the parent account and saves automatically online. The parent account password protects age changes and switching to other journals. Voice writing needs a parent’s separate permission."
                    : "Prompts are written for this age. A separate parent passphrase protects these settings. Children have no account of their own and no online passage sharing."}
              </p>
              <button
                className="lb-secondary"
                onClick={() => setModal("profile")}
              >
                Change who this journal is for
              </button>
            </div>
          )}
          <div className="lb-boundary">
            <h3>Back up your journal</h3>
            <p>
              {sample
                ? "The sample can’t be backed up. Create your own journal to keep entries."
                : accountManaged
                  ? "Your saved journal is available whenever you sign in. For an extra portable copy, export a backup with a passphrase you choose and keep separately."
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
          {adultBook && inNativeApp() && (
            <div className="lb-boundary">
              <h3>Relish widgets</h3>
              <p>
                Widgets show a writing prompt and tonight’s activity. The “From Our family
                journal” widget can also show a line your family already shared there. Anyone
                near your phone can see it, so it’s off until you turn it on. The lock screen
                never shows family words.
              </p>
              <button
                type="button"
                className="lb-secondary"
                aria-pressed={familyLineOn}
                onClick={() => {
                  setFamilyLineOn(!familyLineOn);
                  writeFamilyLineWidget(vault.editionId, !familyLineOn);
                }}
              >
                {familyLineOn
                  ? "Turn the family line off"
                  : "Show a line from Our family journal"}
              </button>
              {familyLineOn && (
                <p className="lb-fine">
                  On. The widget shows the newest passage in Our family journal.
                </p>
              )}
            </div>
          )}
          {!sample && online && (
            <button
              className="lb-secondary"
              onClick={() => {
                setOffered(undefined);
                setModal("connections");
              }}
            >
              <Users size={16} /> Connected journals and your account
            </button>
          )}
          <p className="lb-fine">
            <a href="/privacy/" target="_blank" rel="noreferrer">
              Read how Relish handles your data
            </a>
          </p>
          {!sample && (
            <details className="lb-boundary">
              <summary>Remove {book.owner}’s journal from this device</summary>
              <p>
                This permanently deletes the copy of {book.owner}’s journal on this
                device. Export a backup first if you want to keep it. Online
                connections, other journals and backups are separate.
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
                          : "This journal couldn’t be removed. It is still here.",
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
              Create my private journal
            </button>
          ) : (
            <button className="lb-text" onClick={vault.lock}>
              <Lock size={16} /> Lock Relish
            </button>
          )}
        </Dialog>
      )}
      {modal === "create" && (
        <Dialog
          title="Create a private journal"
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
          title="Add someone to your journal"
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
            <strong>Three places</strong>
            <p>
              Home shows what’s new in the journal and a few things to do.
              Journal opens Our family journal (the pages everyone shares,
              with your private pages beside them) or a child’s journal.
              Activities has every activity, on your own or together.
            </p>
          </div>
          <div className="lb-boundary">
            <strong>
              {online ? "Privacy and optional AI" : "Age-based prompts"}
            </strong>
            <p>
              {!online
                ? "These are written prompts chosen for your age, not an AI conversation. Your words stay here. You can pause, pass, or ask a trusted grown-up for help."
                : "Your private pages are only yours. Only passages and entries you choose go to Our family journal or a partner’s journal. Games never include private writing. AI help is optional, and you review the exact excerpt first."}
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
