/**
 * Relish illustrations: Scott's watercolor list
 * (scotts-world/outputs/relish-watercolor-list.md). Each name is a file
 * at /illustrations/relish/<name>.png. Until a painting arrives, the app
 * draws a small sketch in the same spot (Illustration.tsx), so pictures can
 * be dropped in one at a time: add the file, then add its name here.
 */
export const illustrationNames = [
  // Places and screens
  "welcome",
  "home",
  "do-something",
  "your-book",
  "family",
  "empty-pages",
  "saved",
  "locked",
  // Activities
  "jot",
  "voice",
  "think-it-through",
  "helps-when-upset",
  "drains-and-fills",
  "under-the-behavior",
  "who-carries-what",
  "rewrite-the-opener",
  "thought-on-trial",
  "unseen-work",
  "plan-a-repair",
  "real-hellos",
  "specific-thanks",
  "repair-bingo",
  "small-joy",
  "story-voices",
  "same-page",
  // Kids' books
  "kid-cover",
  "emblem-beetle",
  "emblem-fox",
  "emblem-whale",
  "emblem-star",
  "emblem-leaf",
  "emblem-moon",
  "kid-kindness-spotting",
  // Optional
  "guided-listen",
  "guided-ask",
  "guided-joy",
] as const;
export type IllustrationName = (typeof illustrationNames)[number];

/**
 * Paintings that exist in public/illustrations/relish/. Empty until Scott
 * sends the folder; every other name falls back to its sketch.
 */
export const paintedIllustrations: readonly IllustrationName[] = [];

export const illustrationSrc = (name: IllustrationName) =>
  `/illustrations/relish/${name}.png`;
export const isPainted = (name: IllustrationName) =>
  paintedIllustrations.includes(name);

/** Which picture goes with each exercise (tool id) and game. */
export const exerciseIllustration: Record<string, IllustrationName> = {
  "helps-upset": "helps-when-upset",
  "drains-fills": "drains-and-fills",
  iceberg: "under-the-behavior",
  load: "who-carries-what",
  "soft-start": "rewrite-the-opener",
  "thought-court": "thought-on-trial",
  unseen: "unseen-work",
  repair: "plan-a-repair",
  hellos: "real-hellos",
  "thanks-week": "specific-thanks",
  "repair-bingo": "repair-bingo",
  "kindness-bingo": "kid-kindness-spotting",
};
export const gameIllustration: Record<string, IllustrationName> = {
  joy: "small-joy",
  story: "story-voices",
  match: "same-page",
};

/** The emblems a child's cloth cover can carry. */
export const emblems = ["beetle", "fox", "whale", "star", "leaf", "moon"] as const;
export type Emblem = (typeof emblems)[number];
/**
 * The book model has no place to store a chosen emblem yet, so the cover
 * picks one from the child's name: same name, same emblem, every time.
 */
export function emblemFor(name: string): Emblem {
  const first = name.trim().toLowerCase().charAt(0);
  const byLetter: Record<string, Emblem> = {
    b: "beetle",
    k: "beetle",
    f: "fox",
    r: "fox",
    w: "whale",
    o: "whale",
    s: "star",
    e: "star",
    l: "leaf",
    g: "leaf",
    m: "moon",
    n: "moon",
  };
  if (byLetter[first]) return byLetter[first];
  let sum = 0;
  for (const ch of name.trim().toLowerCase()) sum += ch.charCodeAt(0);
  return emblems[sum % emblems.length];
}
