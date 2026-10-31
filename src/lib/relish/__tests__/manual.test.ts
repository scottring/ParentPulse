import { describe, it, expect } from "vitest";
import { emptyBook, isBook } from "../model";
import { newJournalDraft, writeJournalPage } from "../journal";
import {
  manualSources,
  manualOf,
  sourceFingerprint,
  addManualIdeas,
  reviewManualIdea,
  isManualIdeas,
} from "../manual";
import { keepAlbumPassage, bookPages } from "../pages";
describe("living manual evidence and consent", () => {
  it("limits family analysis to explicitly approved text; never includes private pages, tags, captions or drafts", () => {
    let b = writeJournalPage(
      emptyBook("A"),
      {
        ...newJournalDraft(),
        text: "A shared sentence. PRIVATE REST.",
        photos: [
          {
            id: crypto.randomUUID(),
            width: 1,
            height: 1,
            caption: "PRIVATE CAPTION",
          },
        ],
      },
      0,
      "kept",
    );
    b = writeJournalPage(
      b,
      { ...newJournalDraft(), text: "PRIVATE DRAFT" },
      0,
      "draft",
    );
    expect(manualSources(b, "family")).toEqual([]);
    b = keepAlbumPassage(
      b,
      bookPages(b)[0],
      "Our moment",
      "A shared sentence.",
      [],
    );
    const shared = manualSources(b, "family");
    expect(shared).toHaveLength(1);
    expect(shared[0].text).toBe("A shared sentence.");
    expect(JSON.stringify(shared)).not.toContain("PRIVATE");
    expect(JSON.stringify(manualSources(b, "personal"))).not.toContain(
      "PRIVATE DRAFT",
    );
    expect(JSON.stringify(manualSources(b, "personal"))).not.toContain(
      "PRIVATE CAPTION",
    );
  });
  it("requires source-backed suggestions, keeps them tentative, and only promotes on review", async () => {
    let b = writeJournalPage(
      emptyBook("A"),
      { ...newJournalDraft(), text: "We liked a quiet walk." },
      0,
      "kept",
    );
    b = {
      ...b,
      manual: { ...manualOf(b), automatic: { personal: true, family: false } },
    };
    const sources = manualSources(b, "personal"),
      fingerprint = await sourceFingerprint(sources);
    const ideas = [
      {
        title: "Room to talk",
        observation: "A quiet walk seemed helpful in this moment.",
        tryThis: "Would another walk feel good?",
        sourceIds: [sources[0].id],
      },
    ];
    b = addManualIdeas(b, "personal", sources, ideas, fingerprint);
    expect(isBook(b)).toBe(true);
    expect(b.manual!.cards[0].status).toBe("suggested");
    expect(addManualIdeas(b, "personal", sources, ideas, fingerprint)).toBe(b);
    b = reviewManualIdea(b, b.manual!.cards[0].id, "kept");
    expect(b.manual!.cards[0].status).toBe("kept");
    expect(
      isManualIdeas(
        [{ ...ideas[0], sourceIds: ["invented"] }],
        sources.map((s) => s.id),
      ),
    ).toBe(false);
  });
  it("drops responses after automatic analysis is disabled or source pages change", async () => {
    const b = writeJournalPage(
      emptyBook("A"),
      { ...newJournalDraft(), text: "A moment." },
      0,
      "kept",
    );
    const sources = manualSources(b, "personal"),
      fp = await sourceFingerprint(sources);
    expect(addManualIdeas(b, "personal", sources, [], fp)).toBe(b);
    const changed = writeJournalPage(
      b,
      { ...b.journal![0], text: "A different moment." },
      1,
      "kept",
    );
    expect(() => addManualIdeas(changed, "personal", sources, [], fp)).toThrow(
      "New pages",
    );
  });
});
