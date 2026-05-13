import type { BedtimeCardKind } from '@/types/journal';

/** Pick the card for tonight's bedtime check-in. Strictly alternates
 *  based on the last card this kid ran. First-ever check-in defaults
 *  to Parent Reflection. An explicit override always wins. */
export function pickCard(
  lastCard: BedtimeCardKind | null,
  override?: BedtimeCardKind,
): BedtimeCardKind {
  if (override) return override;
  if (!lastCard) return 'parent-reflection';
  return lastCard === 'parent-reflection'
    ? 'high-low-buffalo'
    : 'parent-reflection';
}
