import { newGame, type Game, type Player } from "../living";
import { samePageBank } from "../play-content";

/**
 * A Same page? round as rounds were started before answers in your own words
 * (contentVersion 2: five multiple-choice questions everyone answers), so the
 * older shape keeps its tests now that new rounds start at contentVersion 3.
 */
export function sameV2(players: Player[]): Game {
  const g: Game = { ...newGame("match", players), contentVersion: 2, answers: [] };
  delete g.said;
  g.questions = samePageBank(g.audience!)
    .slice(0, 5)
    .map((q) => q.id);
  return g;
}
