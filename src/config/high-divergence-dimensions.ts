/**
 * Dimensions where two first-person accounts of the same moment
 * are likely to diverge meaningfully. When a moment touches one
 * of these, the default invite mode is `blind` — the recipient
 * writes without seeing the sender's view, so the divergence
 * (if it's there) lands clean instead of being smoothed over.
 */

export const HIGH_DIVERGENCE_DIMENSIONS: readonly string[] = [
  'conflict_style',
  'discipline_approach',
  'emotional_availability',
  'autonomy_granting',
] as const;

export function isHighDivergenceDimension(dimensionId: string): boolean {
  return HIGH_DIVERGENCE_DIMENSIONS.includes(dimensionId);
}

// True if a moment has any high-divergence dimension attached.
// Used by the invite sheet to default the mode to `blind`.
export function momentTouchesHighDivergence(
  dimensions: string[] | undefined,
): boolean {
  if (!dimensions || dimensions.length === 0) return false;
  return dimensions.some(isHighDivergenceDimension);
}
