import { describe, it, expect } from "vitest";
import { emptyBook, isBook, type Book } from "../model";
import {
  ageBands,
  audienceOf,
  canUseOnline,
  configureProfile,
  makeParentLock,
  isEditionProfile,
  youngestAudience,
  verifyParent,
} from "../profiles";
import { guidanceFor } from "../guidance";
import { createVault, unlockVault } from "../vault";
import {
  advanceGame,
  gameText,
  isLiving,
  newGame,
  freshLiving,
  joyOptions,
} from "../living";
const pass = "A private parent test phrase";
async function child(): Promise<Book> {
  return {
    ...emptyBook("Fictional child"),
    profile: {
      kind: "child",
      ageBand: "6-8",
      parentLock: await makeParentLock(pass),
    },
  };
}
describe("explicit edition profiles", () => {
  it("does not infer permission from a name, relationship or missing legacy profile", () => {
    const book = emptyBook("Daddy");
    expect(isBook(book)).toBe(true);
    expect(canUseOnline(book)).toBe(false);
    expect(audienceOf(book)).toBe("under-6");
    expect(canUseOnline({ profile: { kind: "adult" } })).toBe(true);
  });
  it("requires the parent passphrase for age changes and promotion to adult", async () => {
    const book = await child();
    await expect(configureProfile(book, "adult", "wrong")).rejects.toThrow(
      "did not match",
    );
    await expect(configureProfile(book, "13-17", "wrong")).rejects.toThrow(
      "did not match",
    );
    const updated = await configureProfile(book, "9-12", pass);
    expect(updated.kind).toBe("child");
    expect(book.profile?.kind).toBe("child");
    expect(await configureProfile(book, "adult", pass)).toEqual({
      kind: "adult",
    });
  });
  it("keeps the age range and salted parent verifier inside an encrypted restorable backup", async () => {
    const book = await child();
    const { envelope } = await createVault(book, "Separate book test phrase");
    const raw = JSON.stringify(envelope);
    for (const word of ["Fictional child", "6-8", pass, "parentLock"])
      expect(raw).not.toContain(word);
    const restored = await unlockVault(raw, "Separate book test phrase");
    expect(restored.book).toEqual(book);
    const profile = restored.book.profile;
    if (profile?.kind !== "child") throw new Error("Missing child profile");
    expect(await verifyParent(profile.parentLock, pass)).toBe(true);
    expect(await verifyParent(profile.parentLock, "wrong")).toBe(false);
    expect(await makeParentLock(pass)).not.toEqual(profile.parentLock);
  });
  it("rejects malformed profiles instead of silently enabling adult features", async () => {
    const book = await child();
    for (const profile of [
      null,
      {},
      { kind: "teen" },
      { kind: "adult", ageBand: "6-8" },
      { kind: "child", ageBand: "19", parentLock: {} },
      {
        kind: "child",
        ageBand: "6-8",
        parentLock: { salt: 111, verifier: "a".repeat(64) },
      },
    ]) {
      expect(isEditionProfile(profile)).toBe(false);
      expect(isBook({ ...book, profile })).toBe(false);
    }
  });
  it("has complete, distinct guidance and finite sessions for every child range", async () => {
    const book = await child();
    const titles = new Set<string>();
    for (const ageBand of ageBands) {
      const profile = {
        kind: "child" as const,
        ageBand,
        parentLock: await makeParentLock(pass),
      };
      const guide = guidanceFor({ profile });
      titles.add(guide.threads.ask.title);
      expect(canUseOnline({ profile })).toBe(false);
      for (const plan of Object.values(guide.plans))
        expect(plan.end.length).toBeGreaterThan(30);
      expect(guide.cue).toBeTruthy();
    }
    expect(titles.size).toBe(4);
  });
});
describe("mixed-age games", () => {
  it("uses the youngest participant, including unknown ages, and clamps to a child edition", () => {
    const players = [
      { id: "a", name: "Adult", audience: "adult" as const },
      { id: "b", name: "Child", audience: "9-12" as const },
    ];
    expect(newGame("joy", players).audience).toBe("9-12");
    expect(youngestAudience([...players, {}])).toBe("under-6");
    expect(newGame("joy", players, "6-8").audience).toBe("6-8");
  });
  it("preserves the selected content and exact reveal across JSON restore and passes", () => {
    let game = newGame("story", [
      { id: "a", name: "A", audience: "6-8" },
      { id: "b", name: "B", audience: "adult" },
    ]);
    game = advanceGame(game, { type: "start" });
    game = advanceGame(game, { type: "choice", choice: 0 });
    const text = gameText(game);
    game = JSON.parse(JSON.stringify(game));
    game = advanceGame(game, { type: "ready" });
    game = advanceGame(game, { type: "choice", choice: null });
    game = advanceGame(game, { type: "ready" });
    game = advanceGame(game, { type: "choice", choice: 2 });
    expect(gameText(game)).toContain(text);
    expect(gameText(game)).toContain("have a picnic");
    expect(isLiving({ ...freshLiving(), game })).toBe(true);
    expect(
      isLiving({ ...freshLiving(), game: { ...game, audience: "invalid" } }),
    ).toBe(false);
    expect(
      isLiving({ ...freshLiving(), game: { ...game, contentVersion: 2 } }),
    ).toBe(false);
  });
  it("retains the original content for older saved games", () => {
    const game = newGame("joy", [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ]);
    delete game.audience;
    delete game.contentVersion;
    expect(joyOptions(game)[0]).toBe("An unhurried walk");
    expect(isLiving({ ...freshLiving(), game })).toBe(true);
  });
});
