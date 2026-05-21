import type { Obstacle, ObstacleVisibility } from '@/types/obstacle';

export function defaultVisibility(authorId: string): ObstacleVisibility {
  return { mode: 'private', sharedWith: [authorId] };
}

/**
 * Compute the denormalized `visibleToUserIds` array given a visibility
 * descriptor + the user's own id + the family's full member list.
 *
 * - private:     [authorId]
 * - shared-with: visibility.sharedWith (assumed to include author)
 * - family:      all family member ids (dedup)
 */
export function resolveVisibleToUserIds(
  visibility: ObstacleVisibility,
  authorId: string,
  familyMemberIds: string[],
): string[] {
  if (visibility.mode === 'private') return [authorId];
  if (visibility.mode === 'shared-with') {
    const set = new Set<string>(visibility.sharedWith);
    set.add(authorId);
    return Array.from(set);
  }
  // family
  const set = new Set<string>([authorId, ...familyMemberIds]);
  return Array.from(set);
}

export function canRead(obstacle: Obstacle, viewerId: string): boolean {
  return obstacle.visibleToUserIds.includes(viewerId);
}
