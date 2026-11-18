/**
 * Relish illustrations: Scott's watercolor list
 * (scotts-world/outputs/relish-watercolor-list.md). Each name is a file
 * at /illustrations/relish/<name>.webp (900 × 900; emblems 600 × 600).
 * A name without a file falls back to a small drawn sketch in the same spot
 * (Illustration.tsx): add the file, then list its name in `painted` below.
 *
 * Still to paint (2026-11-18), for the road-trip activities; each borrows the
 * closest painting until then:
 * - "spot-it": a car window with a cow and a water tower going by
 *   (Spot it!; borrows "kid-kindness-spotting").
 * - "days-highlights": a parked car at dusk with a notebook on the dashboard
 *   (Day’s highlights; borrows "home").
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
  "kid-banner-2",
  "kid-banner-3",
  "kid-banner-4",
  "kid-banner-5",
  "kid-banner-6",
  "kid-banner-7",
  "kid-banner-8",
  "kid-banner-9",
  // Guided-reflection topics
  "guided-listen",
  "guided-ask",
  "guided-joy",
] as const;
export type IllustrationName = (typeof illustrationNames)[number];

/** Paintings in public/illustrations/relish/ (delivered 2026-11-18). */
export const paintedIllustrations: readonly IllustrationName[] = [
  ...illustrationNames,
];

export const illustrationSrc = (name: IllustrationName) =>
  `/illustrations/relish/${name}.webp`;
/** Intrinsic size of a painting, for width/height attributes. */
export const illustrationSize = (name: IllustrationName) =>
  name.startsWith("emblem-") ? 600 : 900;
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
  // Stand-in until a road-trip painting arrives (see the list above).
  "day-highlights": "home",
};
export const gameIllustration: Record<string, IllustrationName> = {
  joy: "small-joy",
  story: "story-voices",
  match: "same-page",
  // Stand-in until a road-trip painting arrives (see the list above).
  spot: "kid-kindness-spotting",
};

/**
 * The pencil sketch beside each kid suggestion on the kids' Home
 * (public/illustrations/relish/kid-banner-map.txt).
 */
export const kidBannerIllustration: Record<string, IllustrationName> = {
  "tween-kindness": "kid-kindness-spotting",
  "young-kindness": "kid-kindness-spotting",
  "teen-write": "kid-banner-2",
  "tween-write": "kid-banner-2",
  "young-write": "kid-banner-2",
  "tween-story": "kid-banner-3",
  "little-story": "kid-banner-3",
  "tween-drains": "kid-banner-4",
  "young-joy": "kid-banner-5",
  "teen-upset": "kid-banner-6",
  "young-upset": "kid-banner-6",
  "little-upset": "kid-banner-6",
  "teen-trial": "kid-banner-7",
  "teen-thanks": "kid-banner-8",
  "little-page": "kid-banner-9",
};
/** The three guided-reflection topics (guidance.ts thread ids). */
export const topicIllustration: Record<string, IllustrationName> = {
  listen: "guided-listen",
  ask: "guided-ask",
  joy: "guided-joy",
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
