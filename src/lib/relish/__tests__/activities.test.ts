import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, isBook, type Book } from "../model";
import {
  featuredFor,
  homeUnderWay,
  idleLine,
  leavingLine,
  missedDay,
  reminderDue,
  shelvesFor,
  isPlanCard,
  kindLabel,
  STALE_DAYS,
  weekIndex,
} from "../activities";
import { doItems } from "../catalog";
import {
  answerCheckBack,
  checkBackWords,
  keepToolPage,
  openCheckBacks,
  remindTonight,
  scheduleCheckBack,
  setMark,
  startTracker,
  todayKey,
  toolsOf,
} from "../tools";
import { newJournalDraft, writeJournalPage } from "../journal";
import { addFamilyPage, mergeFamilyPages } from "../family-pages";
import { playNoteId, playNotePage, playNoteText } from "../play-notes";
import { livingOf, recordOfflinePlay } from "../living";

if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto });

const DAY = 86_400_000;
const adult = (): Book => ({
  ...emptyBook("Scott"),
  profile: { kind: "adult" },
  people: [
    { id: "iris", name: "Iris", role: "Partner", color: "sky", note: "", lessons: [] },
    { id: "ella", name: "Ella", role: "Daughter", color: "sun", note: "", lessons: [] },
  ],
});
/** A book with one draft written `days` ago. */
const withDraft = (days: number, now: Date) => {
  const at = new Date(now.getTime() - days * DAY).toISOString();
  const b = writeJournalPage(
    adult(),
    { ...newJournalDraft(), text: "Ella wore her rain boots on her hands" },
    0,
    "draft",
  );
  return { ...b, journal: b.journal!.map((e) => ({ ...e, createdAt: at, updatedAt: at })) };
};

describe("featured this week", () => {
  it("stays the same all week, changes the next, and Show me another moves on", () => {
    const monday = new Date(2026, 10, 16, 9);
    const sunday = new Date(2026, 10, 22, 20);
    const nextMonday = new Date(2026, 10, 23, 9);
    expect(weekIndex(monday)).toBe(weekIndex(sunday));
    expect(weekIndex(nextMonday)).toBe(weekIndex(monday) + 1);
    const a = featuredFor("adult", [], monday)!;
    expect(featuredFor("adult", [], sunday)!.key).toBe(a.key);
    expect(featuredFor("adult", [], nextMonday)!.key).not.toBe(a.key);
    expect(featuredFor("adult", [], monday, 1)!.key).not.toBe(a.key);
  });
  it("skips what's already under way, and fits the book's age", () => {
    const now = new Date(2026, 10, 16, 9);
    const a = featuredFor("adult", [], now)!;
    expect(featuredFor("adult", [{ key: a.key }], now)!.key).not.toBe(a.key);
    const kid = featuredFor("under-6", [], now)!;
    expect(doItems("under-6").some((i) => i.key === kid.key)).toBe(true);
  });
});

describe("shelves by situation", () => {
  it("one set of shelves mixes both kinds; the filter narrows them; plan cards only in an adult's family", () => {
    expect(shelvesFor("adult").map((s) => s.title).slice(0, 3)).toEqual([
      "At dinner",
      "Something felt hard",
      "In the car",
    ]);
    const dinner = shelvesFor("adult")[0].cards;
    expect(dinner.map(kindLabel)).toContain("Together");
    expect(dinner.map(kindLabel)).toContain("On your own");
    expect(shelvesFor("adult", "solo").flatMap((s) => s.cards).every((c) => kindLabel(c) === "On your own")).toBe(true);
    expect(shelvesFor("adult", "together").flatMap((s) => s.cards).every((c) => kindLabel(c) === "Together")).toBe(true);
    expect(shelvesFor("adult").flatMap((s) => s.cards).filter(isPlanCard).map((c) => c.goal)).toContain("laughing");
    expect(
      shelvesFor("adult", "all", [], { plansOk: false }).flatMap((s) => s.cards).some(isPlanCard),
    ).toBe(false);
    expect(shelvesFor("9-12", "together").flatMap((s) => s.cards).some(isPlanCard)).toBe(false);
  });
  it("a child's book keeps every activity it can do, and nothing it can't", () => {
    const shown = new Set(shelvesFor("6-8").flatMap((s) => s.cards.map((c) => c.key)));
    for (const item of doItems("6-8").filter((i) => i.key !== "write")) expect(shown.has(item.key)).toBe(true);
    expect(shown.has("repair")).toBe(false);
  });
});

describe("what Home lists as still going", () => {
  const now = new Date(2026, 10, 21, 10);
  it("shows idle time after a few days and drops things untouched for two weeks", () => {
    const fresh = homeUnderWay(withDraft(1, now), now);
    expect(fresh).toHaveLength(1);
    expect(idleLine(fresh[0])).toBe("");
    const idle = homeUnderWay(withDraft(9, now), now)[0];
    expect(idleLine(idle)).toBe("last touched 9 days ago");
    expect(leavingLine(idle)).toBe("");
    const leaving = homeUnderWay(withDraft(13, now), now)[0];
    expect(leavingLine(leaving)).toBe("moves to Journal tomorrow");
    expect(homeUnderWay(withDraft(STALE_DAYS, now), now)).toHaveLength(0);
  });
});

describe("a habit that slipped a day", () => {
  const start = (book: Book, daysAgo: number, now: Date) => {
    let b = startTracker(book, "hellos", "ella");
    const run = toolsOf(b).trackers[0];
    b = {
      ...b,
      tools: {
        ...toolsOf(b),
        trackers: [{ ...run, startedAt: new Date(now.getTime() - daysAgo * DAY).toISOString() }],
      },
    };
    return [b, run.id] as const;
  };
  const markOn = (b: Book, runId: string, daysAgo: number, now: Date) => {
    const key = todayKey(new Date(now.getTime() - daysAgo * DAY));
    const run = toolsOf(b).trackers.find((t) => t.id === runId)!;
    return {
      ...b,
      tools: {
        ...toolsOf(b),
        trackers: [{ ...run, marks: [...run.marks, { key, at: new Date().toISOString() }] }],
      },
    };
  };
  const now = new Date(2026, 10, 21, 10);
  it("notices yesterday unmarked and today still open, and never before a first mark", () => {
    const [b0, id] = start(adult(), 5, now);
    let b = b0;
    expect(missedDay(b, now)).toBeUndefined();
    b = markOn(b, id, 3, now);
    expect(missedDay(b, now)?.run.id).toBe(id);
    expect(missedDay(markOn(b, id, 1, now), now)).toBeUndefined();
    expect(missedDay(markOn(b, id, 0, now), now)).toBeUndefined();
  });
  it("Remind me tonight shows on Home from the evening, and marking today answers it", () => {
    const [b0, id] = start(adult(), 5, now);
    const b = remindTonight(markOn(b0, id, 3, now), id, now);
    const at = toolsOf(b).trackers[0].remindAt!;
    expect(new Date(at).getHours()).toBe(18);
    expect(isBook(b)).toBe(true);
    expect(reminderDue(b, now)).toBeUndefined();
    const evening = new Date(2026, 10, 21, 19);
    expect(reminderDue(b, evening)?.run.id).toBe(id);
    expect(reminderDue(b, new Date(2026, 10, 22, 19))).toBeUndefined();
    const marked = setMark(b, id, todayKey(), true);
    expect(toolsOf(marked).trackers[0].remindAt).toBeUndefined();
  });
  it("after 6 pm, the reminder comes an hour later", () => {
    const [b0, id] = start(adult(), 2, now);
    const late = new Date(2026, 10, 21, 20, 30);
    const b = remindTonight(b0, id, late);
    expect(Date.parse(toolsOf(b).trackers[0].remindAt!)).toBe(late.getTime() + 3_600_000);
  });
});

describe("check-backs when asked for", () => {
  const plan = "I saw you did Kaleb’s field trip form. Thank you.";
  it("keeping a page without a plan asks nothing; Remind me schedules one, once", () => {
    const kept = keepToolPage(adult(), {
      title: "Notice the unseen work · Iris",
      text: `What to say: ${plan}`,
      toolId: "unseen",
      personId: "iris",
    });
    expect(openCheckBacks(kept)).toHaveLength(0);
    const pageId = kept.journal![0].id;
    const now = new Date(2026, 10, 21, 10);
    let b = scheduleCheckBack(kept, { toolId: "unseen", pageId, plan, personId: "iris" }, now);
    b = scheduleCheckBack(b, { toolId: "unseen", pageId, plan, personId: "iris" }, now);
    const [c] = openCheckBacks(b);
    expect(openCheckBacks(b)).toHaveLength(1);
    expect(Date.parse(c.dueAt) - now.getTime()).toBe(2 * DAY);
    expect(checkBackWords(b, c)).toEqual({
      lead: "You planned to thank Iris:",
      quote: plan,
      ask: "Did you get to say it?",
    });
    expect(isBook(b)).toBe(true);
    // An exercise without a check-back changes nothing.
    expect(scheduleCheckBack(kept, { toolId: "helps-upset", pageId, plan })).toBe(kept);
  });
  it("I said it, Not yet (two more days) and Let it go", () => {
    const kept = keepToolPage(adult(), { title: "t", text: "x", toolId: "unseen", personId: "iris" });
    const now = new Date(2026, 10, 21, 10);
    const b = scheduleCheckBack(kept, { toolId: "unseen", pageId: kept.journal![0].id, plan }, now);
    const [c] = openCheckBacks(b);
    const later = new Date(Date.parse(c.dueAt) + 1000);
    const notYet = answerCheckBack(b, c.id, { kind: "later" }, later);
    expect(Date.parse(openCheckBacks(notYet)[0].dueAt)).toBe(later.getTime() + 2 * DAY);
    expect(openCheckBacks(answerCheckBack(b, c.id, { kind: "let-go" }, later))).toHaveLength(0);
    const said = answerCheckBack(b, c.id, { kind: "tried" }, later);
    expect(toolsOf(said).checkBacks![0].status).toBe("tried");
  });
});

describe("plays noted in Our family book", () => {
  const me = { name: "Scott", bookId: "scott-book" };
  const play = {
    id: "game-1",
    kind: "spot" as const,
    players: [
      { id: "owner", name: "Scott" },
      { id: "k", name: "Kaleb" },
      { id: "e", name: "Ella" },
    ],
    playedAt: "2026-11-21T15:00:00.000Z",
  };
  it("says the game, who played and nothing else", () => {
    const page = playNotePage(play, me);
    expect(page).toMatchObject({
      id: playNoteId("game-1"),
      kind: "game",
      title: "Spot it!",
      text: "Played Spot it! with Kaleb and Ella.",
      activity: "spot",
      byName: "Scott",
      createdAt: play.playedAt,
    });
    expect(playNoteText({ kind: "match", players: [{ id: "a", name: "Iris" }, { id: "b", name: "Ella" }] }, "Scott")).toBe(
      "Iris and Ella played Same page?.",
    );
  });
  it("one entry per play: recording the same round again never adds a second note", () => {
    let book: Pick<Book, "familyPages"> = {};
    book = addFamilyPage(book, playNotePage(play, me));
    // Re-recorded later (an approval, Finish, another device): same id, same one page.
    book = addFamilyPage(book, playNotePage({ ...play, playedAt: "2026-11-21T16:00:00.000Z" }, me));
    expect(book.familyPages).toHaveLength(1);
    expect(mergeFamilyPages([playNotePage(play, me)], book.familyPages!)).toHaveLength(1);
    // A different round is a different note.
    book = addFamilyPage(book, playNotePage({ ...play, id: "game-2" }, me));
    expect(book.familyPages).toHaveLength(2);
  });
  it("We did this: a game played without the app is noted as played today", () => {
    const now = new Date(2026, 10, 21, 18);
    const [b, record] = recordOfflinePlay(adult(), "story", [
      { id: "owner", name: "Scott" },
      { id: "ella", name: "Ella" },
    ], now);
    expect(livingOf(b).plays).toEqual([record]);
    expect(record).toMatchObject({ kind: "story", playedAt: now.toISOString() });
    expect(isBook(b)).toBe(true);
    expect(() => recordOfflinePlay(adult(), "story", [{ id: "owner", name: "Scott" }])).toThrow(
      /at least two/,
    );
  });
});
