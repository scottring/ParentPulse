import type { BedtimeCardKind } from '@/types/journal';

/** Rotation order. New cards append here; the first entry is the
 *  default for first-ever check-ins. */
export const CARD_ROTATION: ReadonlyArray<BedtimeCardKind> = [
  'parent-reflection',
  'high-low-buffalo',
  'externalized-worry',
];

/** Pick the card for tonight's bedtime check-in. Cycles through
 *  `CARD_ROTATION` based on the last card this kid ran. First-ever
 *  check-in defaults to the first card in the rotation. An explicit
 *  override always wins. */
export function pickCard(
  lastCard: BedtimeCardKind | null,
  override?: BedtimeCardKind,
): BedtimeCardKind {
  if (override) return override;
  if (!lastCard) return CARD_ROTATION[0];
  const idx = CARD_ROTATION.indexOf(lastCard);
  if (idx < 0) return CARD_ROTATION[0];
  return CARD_ROTATION[(idx + 1) % CARD_ROTATION.length];
}
