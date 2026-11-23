import { describe, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { emptyBook, sampleBook, sampleIncoming, type Book } from "../model";
import {
  filterStream,
  groupStream,
  isDirectSend,
  journalStream,
  isWholeSend,
  mentionsOwner,
  sayingOf,
  sharedNote,
  type StreamItem,
} from "../journal-stream";
import { newJournalDraft, writeJournalPage } from "../journal";
import { newFamilyPage } from "../family-pages";
import { familyPagesOf } from "@/components/relish/Family";
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const sample = () => {
  const book = sampleBook();
  return { book, familyPages: book.familyPages!, myBookId: "sample", incoming: sampleIncoming(Date.parse("2026-11-22T20:00:00Z")) };
};
const keys = (items: StreamItem[]) => items.map((i) => i.key);

describe("My journal's stream", () => {
  it("merges what you wrote, what was sent to you, mentions, games and sends, newest first", () => {
    const { book, ...from } = sample();
    const items = journalStream(book, from);
    const kinds = new Set(items.map((i) => i.kind));
    expect([...kinds].sort()).toEqual(["mention", "played", "sent", "wrote", "you-sent"]);
    // Newest first: Anna's line from today leads.
    expect(items[0]).toMatchObject({ kind: "sent", from: "Anna", fromUid: "sample-anna", direct: true });
    expect(items[0].offer?.id).toBe("sample-offer-anna");
    const dates = items.map((i) => Date.parse(i.date));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    // Leo's page mentions Alex as @Dad, by its mentions list.
    expect(items.find((i) => i.kind === "mention")).toMatchObject({ from: "Leo", people: ["leo"], title: "My tooth came out!!" });
    // A game you played, from this journal's own play record.
    expect(items.find((i) => i.kind === "played")).toMatchObject({ key: "play:sample-play-anna", game: "match", people: ["anna"] });
    expect(items.find((i) => i.kind === "you-sent")).toMatchObject({ to: ["Anna"], people: ["anna"] });
  });

  it("never lists your own family pages as mentions, nor a family page twice", () => {
    const { book, ...from } = sample();
    const mine = newFamilyPage({ kind: "page", title: "Me", text: "@Alex wrote about @Alex", byName: "Alex", byBookId: "sample" });
    const passed = newFamilyPage({ id: "sample-offer-anna", kind: "page", text: "@Alex, look", byName: "Anna", byBookId: "sample-anna" });
    const items = journalStream(book, { ...from, familyPages: [...from.familyPages, mine, passed] });
    expect(items.filter((i) => i.kind === "mention").map((i) => i.familyPage?.id)).toEqual(["sample-family-tooth"]);
    expect(items.filter((i) => i.key.endsWith("sample-offer-anna"))).toHaveLength(1);
  });

  it("a kept line stays where it was sent and is no longer New", () => {
    const { book, ...from } = sample();
    const offer = from.incoming[0];
    const kept: Book = {
      ...book,
      connections: {
        ...book.connections!,
        received: [{ id: offer.id, title: offer.title, text: offer.text, from: offer.sender, fromName: offer.senderName, createdAt: offer.createdAt, acceptedAt: "2026-11-23T08:00:00Z", audience: "direct" }],
      },
    };
    const items = journalStream(kept, from);
    const line = items.filter((i) => i.kind === "sent");
    expect(line).toHaveLength(1);
    expect(line[0]).toMatchObject({ key: `passage:${offer.id}`, date: offer.createdAt, direct: true });
    expect(line[0].offer).toBeUndefined();
  });

  it("filters by kind, by person and by search", () => {
    const { book, ...from } = sample();
    const items = journalStream(book, from);
    expect(filterStream(book, items, "sent").map((i) => i.kind)).toEqual(["sent"]);
    expect(filterStream(book, items, "mentions").map((i) => i.from)).toEqual(["Leo"]);
    expect(filterStream(book, items, "played").map((i) => i.key)).toEqual(["play:sample-play-anna"]);
    expect(filterStream(book, items, "said").map((i) => i.kind).sort()).toEqual(["mention", "sent"]);
    expect(filterStream(book, items, "wrote").every((i) => i.kind === "wrote")).toBe(true);
    // Anna: what she sent, what you sent her, the game with her and entries tagged with her.
    const anna = keys(filterStream(book, items, "all", "anna"));
    expect(anna).toEqual(expect.arrayContaining(["offer:sample-offer-anna", "sent:sample-sent-anna", "play:sample-play-anna", "journal:sample-story", "earlier:sample1"]));
    expect(anna).not.toContain("family:sample-family-tooth");
    expect(keys(filterStream(book, items, "all", "all", "flashlight"))).toEqual(["family:sample-family-tooth"]);
    expect(keys(filterStream(book, items, "sent", "leo"))).toEqual([]);
  });

  it("labels where your own entry went", () => {
    let book: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } };
    const draft = { ...newJournalDraft(), title: "Pool", text: "Like a cold hug." };
    book = writeJournalPage(book, draft, 0, "kept");
    book.connections = {
      received: [],
      outgoing: [
        { id: "o1", circleId: "c", title: "Pool", text: "Like a cold hug.", recipients: ["u"], recipientNames: ["Sam"], packets: {}, createdAt: "2026-11-20T10:00:00Z", sent: true, audience: "direct", sourceId: draft.id },
      ],
    };
    const line = newFamilyPage({ kind: "passage", text: "Like a cold hug.", byName: "Robin", byBookId: "mine", sourceId: draft.id });
    const items = journalStream(book, { familyPages: [line], myBookId: "mine" });
    // The words sent were the whole entry: Sam has it, and it isn't shown twice.
    expect(items.find((i) => i.key === `journal:${draft.id}`)?.shared).toEqual({ lines: 1, page: false, sentTo: ["Sam"], pageTo: ["Sam"] });
    expect(items.some((i) => i.kind === "you-sent")).toBe(false);
  });

  it("a line from an entry is a line; the whole entry, sent or shared, says so on the entry", () => {
    let book: Book = { ...emptyBook("Robin"), profile: { kind: "adult" } };
    const draft = { ...newJournalDraft(), title: "Pool", text: "Like a cold hug.\n\nHe climbed out on his own." };
    book = writeJournalPage(book, draft, 0, "kept");
    const send = (id: string, text: string, to: string) => ({
      id, circleId: "c", title: "Pool", text, recipients: [to], recipientNames: [to], packets: {},
      createdAt: "2026-11-20T10:00:00Z", sent: true, audience: "direct" as const, sourceId: draft.id,
    });
    book.connections = {
      received: [],
      outgoing: [send("o1", "Like a cold hug.", "Sam"), send("o2", "Like a cold hug.\n\nHe climbed out on his own.", "Anna")],
    };
    const whole = newFamilyPage({ kind: "page", title: "Pool", text: draft.text, byName: "Robin", byBookId: "mine", sourceId: draft.id });
    const items = journalStream(book, { familyPages: [whole], myBookId: "mine" });
    const shared = items.find((i) => i.key === `journal:${draft.id}`)!.shared;
    expect(shared).toEqual({ lines: 0, page: true, whole: true, sentTo: ["Sam", "Anna"], pageTo: ["Anna"] });
    // The line to Sam is its own card; the whole entry to Anna is the entry itself.
    expect(items.filter((i) => i.kind === "you-sent").map((i) => i.to)).toEqual([["Sam"]]);
    expect(sharedNote(shared)).toBe("Shared with the family · Sent to Sam and Anna");
  });

  it("an entry changed after it was sent whole shows the copy that went", () => {
    const entry = { id: "e1", text: "Like a cold hug.", status: "kept" as const };
    expect(isWholeSend({ sourceId: "e1", text: " Like a  cold hug. " }, entry)).toBe(true);
    expect(isWholeSend({ sourceId: "e1", text: "Like a cold hug." }, { ...entry, text: "Like a cold hug. Then lunch." })).toBe(false);
    expect(isWholeSend({ sourceId: "e1", text: "Like a cold hug." }, { ...entry, status: "draft" })).toBe(false);
    expect(isWholeSend({ sourceId: "e2", text: "Like a cold hug." }, entry)).toBe(false);
    expect(isWholeSend({ text: "Like a cold hug." }, undefined)).toBe(false);
  });

  it("says where an entry went, in a few words", () => {
    expect(sharedNote(undefined)).toBe("");
    expect(sharedNote({ lines: 1, page: false, sentTo: [] })).toBe("One line shared to Our family journal");
    expect(sharedNote({ lines: 2, page: true, whole: true, sentTo: ["Anna"], pageTo: ["Anna"] })).toBe(
      "2 lines shared to Our family journal · Shared with the family · Sent to Anna",
    );
    expect(sharedNote({ lines: 0, page: false, sentTo: ["Anna", "Sam", "Leo"] })).toBe("Sent to Anna, Sam and Leo");
  });

  it("groups Today, This week and Earlier by the writer's calendar", () => {
    const now = new Date(2026, 10, 22, 21, 0);
    const at = (d: number, h = 9) => ({ key: `${d}:${h}`, kind: "wrote" as const, date: new Date(2026, 10, d, h).toISOString(), title: "", text: "", people: [] });
    const groups = groupStream([at(22, 8), at(22, 1), at(20), at(16), at(15), at(1)], now);
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Today", 2],
      ["This week", 2],
      ["Earlier", 2],
    ]);
  });

  it("reads mentions from @Name and from a page's mentions list", () => {
    expect(mentionsOwner({ text: "Thanks @alex!" }, "Alex")).toBe(true);
    expect(mentionsOwner({ text: "Alex made tea" }, "Alex")).toBe(false);
    expect(mentionsOwner({ text: "@Dad made tea", mentions: ["Alex"] }, "Alex")).toBe(true);
  });

  it("keeps lines sent to one person out of Our family journal", () => {
    const { book } = sample();
    const withLine: Book = {
      ...book,
      connections: {
        ...book.connections!,
        received: [
          { id: "d", title: "t", text: "Just for you", from: "u", fromName: "Anna", createdAt: "2026-11-20T10:00:00Z", acceptedAt: "2026-11-20T10:00:00Z", audience: "direct" },
          { id: "f", title: "t", text: "For everyone", from: "u", fromName: "Anna", createdAt: "2026-11-20T10:00:00Z", acceptedAt: "2026-11-20T10:00:00Z" },
        ],
      },
    };
    const texts = familyPagesOf(withLine, [], { name: "Alex", bookId: "sample" }).map((p) => p.text);
    expect(texts).toContain("For everyone");
    expect(texts).not.toContain("Just for you");
    // Alex's line to Anna isn't in the family journal either.
    expect(texts.some((t) => t.includes("field trip form"))).toBe(false);
    // Older sends say neither: a family page carries the same id as its send.
    expect(isDirectSend({ id: "p1" }, [{ id: "p1" }])).toBe(false);
    expect(isDirectSend({ id: "x" }, [{ id: "p1" }])).toBe(true);
  });

  it("quotes a short line for What your family says about you", () => {
    const { book, ...from } = sample();
    const items = journalStream(book, from);
    const said = items.filter((i) => i.kind === "sent" || i.kind === "mention").map((i) => sayingOf(i, book.owner));
    expect(said).toEqual(["You stayed so calm with Leo at the pool today", "@Dad read it to me with a flashlight"]);
  });
});
