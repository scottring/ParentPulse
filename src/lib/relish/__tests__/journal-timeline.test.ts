import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { sampleBook, sampleChildBook, sampleIncoming, type Book } from "../model";
import { journalStream } from "../journal-stream";
import { audienceLabel, audienceLabels, filterTimeline, journalTimeline, seenLabel, type TimelineItem } from "../journal-timeline";
import { newJournalDraft, writeJournalPage } from "../journal";
import { newFamilyPage } from "../family-pages";
import type { Incoming } from "../partner-share";
import { familyPagesOf } from "@/components/relish/Family";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const me = { name: "Alex", bookId: "sample" };
function timeline(book: Book = sampleBook(), extra: { incoming?: Incoming[] } = {}) {
  const familyPages = book.familyPages || [];
  const incoming = extra.incoming ?? sampleIncoming(Date.parse("2026-11-22T20:00:00Z"));
  const stream = journalStream(book, { familyPages, myBookId: me.bookId, incoming });
  return journalTimeline(book, stream, familyPagesOf(book, familyPages, me));
}
const lanes = (items: TimelineItem[]) => items.map((t) => `${t.lane}:${t.key}`);

describe("One journal: the family spine with branches", () => {
  it("puts every family page on the spine and everything only some people see on branches, newest first", () => {
    const items = timeline();
    const spine = items.filter((t) => t.lane === "spine");
    const branches = items.filter((t) => t.lane === "branch");
    // All six of the sample's family pages, once each.
    expect(spine.map((t) => t.page?.id).sort()).toEqual(
      (sampleBook().familyPages || []).map((p) => p.id).sort(),
    );
    // Anna's line, Alex's line to Anna, the round they played, Alex's own pages.
    expect(branches.map((t) => t.key)).toEqual(
      expect.arrayContaining(["offer:sample-offer-anna", "sent:sample-sent-anna", "play:sample-play-anna", "journal:sample-story"]),
    );
    const dates = items.map((t) => Date.parse(t.date));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("an entry shared whole: on the spine for everyone, or a You and Anna branch, never twice", () => {
    let book = sampleBook();
    const draft = { ...newJournalDraft(), title: "The pool", text: "He climbed out on his own." };
    book = writeJournalPage(book, draft, 0, "kept");
    const key = `journal:${draft.id}`;
    // Private: a branch, only you.
    expect(timeline(book).find((t) => t.key === key)).toMatchObject({ lane: "branch", seenWith: [] });
    // Sent whole to Anna: the entry's own branch says You and Anna, with no second copy.
    const sent = {
      ...book,
      connections: {
        ...book.connections!,
        outgoing: [
          ...(book.connections?.outgoing || []),
          { id: "whole-anna", circleId: "sample", title: "The pool", text: draft.text, recipients: ["sample-anna"], recipientNames: ["Anna"], packets: {}, createdAt: new Date().toISOString(), sent: true, audience: "direct" as const, sourceId: draft.id },
        ],
      },
    };
    const items = timeline(sent);
    expect(items.find((t) => t.key === key)).toMatchObject({ lane: "branch", seenWith: ["Anna"] });
    expect(seenLabel(items.find((t) => t.key === key)!.seenWith)).toBe("You and Anna");
    expect(items.some((t) => t.key === "sent:whole-anna")).toBe(false);
    // Added whole to Our family journal: one card, on the spine, saying where it came from.
    const page = newFamilyPage({ kind: "page", title: "The pool", text: draft.text, byName: "Alex", byBookId: me.bookId, sourceId: draft.id });
    const family = { ...book, familyPages: [...(book.familyPages || []), page] };
    const all = timeline(family);
    expect(all.some((t) => t.key === key)).toBe(false);
    const spine = all.find((t) => t.page?.id === page.id)!;
    expect(spine).toMatchObject({ lane: "spine", item: { key, shared: { whole: true } } });
  });

  it("labels who can see each branch", () => {
    const items = timeline();
    const seen = (key: string) => seenLabel(items.find((t) => t.key === key)!.seenWith);
    expect(seen("journal:sample-story")).toBe("Only you");
    expect(seen("earlier:sample1")).toBe("Only you");
    expect(seen("offer:sample-offer-anna")).toBe("You and Anna");
    expect(seen("sent:sample-sent-anna")).toBe("You and Anna");
    expect(seen("play:sample-play-anna")).toBe("You and Anna");
    expect(seenLabel(["Anna", "Leo", "anna"])).toBe("You, Anna and Leo");
    expect(seenLabel(["Anna", "Leo", "June"])).toBe("You, Anna, Leo and June");
  });

  it("gives other views (Home's Lately) the same who-can-see-it label, by stream key or family page id", () => {
    const items = timeline();
    const labels = audienceLabels(items);
    // A round played with Anna, by its page id on Home.
    expect(labels.get("play:sample-play-anna")).toBe("You and Anna");
    expect(labels.get("journal:sample-story")).toBe("Only you");
    // Every family page is Everyone, by its own id.
    for (const p of sampleBook().familyPages || []) expect(labels.get(p.id)).toBe("Everyone");
    expect(audienceLabel({ lane: "spine", seenWith: ["Anna"] })).toBe("Everyone");
    expect(audienceLabel({ lane: "branch", seenWith: [] })).toBe("Only you");
    expect(audienceLabel({ lane: "branch", seenWith: ["Anna", "Leo"] })).toBe("You, Anna and Leo");
  });

  it("a mention shows once, on the spine, saying it mentions you", () => {
    const items = timeline();
    const tooth = items.filter((t) => t.page?.id === "sample-family-tooth" || t.item?.familyPage?.id === "sample-family-tooth");
    expect(tooth).toHaveLength(1);
    expect(tooth[0]).toMatchObject({ lane: "spine", item: { kind: "mention", from: "Leo" } });
  });

  it("a private draft is a branch only you can see, never on the spine", () => {
    const book = writeJournalPage(sampleBook(), { ...newJournalDraft(), title: "Not yet", text: "PRIVATE WORDS" }, 0, "draft");
    const items = timeline(book);
    const draft = items.find((t) => t.item?.draft);
    expect(draft).toMatchObject({ lane: "branch", seenWith: [] });
    expect(items.filter((t) => t.lane === "spine").some((t) => /PRIVATE WORDS/.test(t.page?.text || ""))).toBe(false);
  });

  it("an entry written for the family shows once, on the spine, as yours", () => {
    const draft = { ...newJournalDraft(), title: "Pancakes", text: "Leo flipped one onto the ceiling." };
    let book = writeJournalPage(sampleBook(), draft, 0, "kept");
    book = {
      ...book,
      journal: book.journal!.map((e) => (e.id === draft.id ? { ...e, audience: "family" as const } : e)),
      familyPages: [
        ...book.familyPages!,
        newFamilyPage({ kind: "page", title: "Pancakes", text: "Leo flipped one onto the ceiling.", byName: "Alex", byBookId: "sample", createdAt: "2026-11-21T09:00:00Z" }),
      ],
    };
    const items = timeline(book).filter((t) => /ceiling/.test(t.page?.text || t.item?.text || ""));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ lane: "spine", page: { mine: true }, item: { kind: "wrote" } });
  });

  it("a page a partner passed on to the family is on the spine, not a branch", () => {
    const passed = newFamilyPage({ id: "sample-offer-anna", kind: "page", title: "At the pool", text: "Calm at the pool.", byName: "Anna", byBookId: "sample-anna" });
    const book = { ...sampleBook(), familyPages: [...sampleBook().familyPages!, passed] };
    const incoming = [{ ...sampleIncoming()[0], audience: "family" as const }];
    const items = timeline(book, { incoming }).filter((t) => t.key.includes("sample-offer-anna"));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ lane: "spine", page: { id: "sample-offer-anna" }, item: { offer: { id: "sample-offer-anna" } } });
  });

  it("filters: Family is the spine, Just me the branches, and kinds and people narrow both", () => {
    const book = sampleBook();
    const items = timeline(book);
    expect(filterTimeline(book, items, "family").every((t) => t.lane === "spine")).toBe(true);
    expect(filterTimeline(book, items, "family")).toHaveLength(6);
    expect(filterTimeline(book, items, "mine").every((t) => t.lane === "branch")).toBe(true);
    expect(lanes(filterTimeline(book, items, "sent"))).toEqual(["branch:offer:sample-offer-anna"]);
    expect(lanes(filterTimeline(book, items, "mentions"))).toEqual(["spine:spine:sample-family-tooth"]);
    expect(lanes(filterTimeline(book, items, "played"))).toEqual(["branch:play:sample-play-anna"]);
    // June: her passage on the spine, and the page that names her.
    expect(filterTimeline(book, items, "all", "june").map((t) => t.page?.id)).toEqual([
      "sample-family-drive",
      "sample-family-june",
    ]);
    // Anyone by name, even someone not in this journal's people.
    expect(filterTimeline(book, items, "family", "name:Anna").map((t) => t.page?.id)).toEqual(["sample-family-snow"]);
    expect(filterTimeline(book, items, "all", "all", "snow lion")).toHaveLength(1);
  });

  it("a child's journal is the spine plus their own entries", () => {
    const book = sampleChildBook();
    const familyPages = book.familyPages || [];
    const stream = journalStream(book, { familyPages, myBookId: "sample-leo" });
    const items = journalTimeline(book, stream, familyPagesOf(book, familyPages, { name: "Leo", bookId: "sample-leo" }));
    expect(items.filter((t) => t.lane === "spine")).toHaveLength(6);
    expect(items.filter((t) => t.lane === "branch").map((t) => t.key).sort()).toEqual([
      "journal:sample-leo-snow",
      "journal:sample-leo-tooth",
    ]);
    expect(items.filter((t) => t.lane === "branch").every((t) => seenLabel(t.seenWith) === "Only you")).toBe(true);
  });
});
