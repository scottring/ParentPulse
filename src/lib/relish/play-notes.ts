/**
 * When a round is played, Our family book gets one short note: the game, who
 * played and the day ("Played Spot it! with Kaleb and Ella."). Only the note
 * goes up. The players' answers stay in the book the game was played in,
 * unless everyone approves a shared page, as before (Scott, 2026-11-21).
 *
 * The note's id comes from the play's id, so a round recorded again (an
 * answer changed at the reveal, Finish round, another device) never adds a
 * second note: Our family book keeps one page per id.
 */
import { gameNames } from "./catalog";
import { newFamilyPage, type FamilyPage } from "./family-pages";
import type { GameKind, PlayRecord } from "./living";
import { namesList } from "./tools";

export const playNoteId = (playId: string) => `play-${playId}`.slice(0, 100);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** "Played Spot it! with Kaleb and Ella." From the writer's side when they played. */
export function playNoteText(
  play: Pick<PlayRecord, "kind" | "players">,
  owner: string,
) {
  const game = gameNames[play.kind as GameKind] ?? "a game";
  const others = play.players
    .filter((p) => p.id !== "owner" && !same(p.name, owner))
    .map((p) => p.name);
  const played = others.length < play.players.length;
  if (played) return others.length ? `Played ${game} with ${namesList(others)}.` : `Played ${game}.`;
  return `${namesList(others)} played ${game}.`;
}
export function playNotePage(
  play: Pick<PlayRecord, "id" | "kind" | "players" | "playedAt">,
  me: { name: string; bookId: string },
): FamilyPage {
  return newFamilyPage({
    id: playNoteId(play.id),
    kind: "game",
    title: gameNames[play.kind] ?? "A game",
    text: playNoteText(play, me.name),
    byName: me.name,
    byBookId: me.bookId,
    activity: play.kind,
    createdAt: play.playedAt,
  });
}
