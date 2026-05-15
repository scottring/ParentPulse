/**
 * Deterministic key for a relationship from its participant ids.
 * Order-independent and deduped so {a,b} and {b,a} map to one record.
 * Accepts 3+ for future triad/all-together; v1 only ever passes 2.
 */
export function dyadKeyFromParticipantIds(participantIds: string[]): string {
  const unique = Array.from(new Set(participantIds.map((id) => id.trim()).filter(Boolean)));
  if (unique.length < 2) {
    throw new Error('A dyad needs at least two distinct participants');
  }
  return unique.sort().join('__');
}
