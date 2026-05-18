'use client';

import { usePerson } from '@/hooks/usePerson';

export interface ConnectedPartner {
  userId: string;
  displayName: string;
}

/**
 * Returns a connected adult the current user can flag things for — any
 * family member with a linked Relish account who isn't the user themself
 * and isn't a child. A `spouse` is preferred when present; otherwise the
 * first other linked adult (sibling, friend, co-parent, etc.) is used.
 *
 * Returns null only when nobody in the family has a linked account, in
 * which case the "Flag for…" affordance stays hidden (there's genuinely
 * no one to flag to).
 *
 * Used by chat surfaces (CoachChat, AskAboutEntry) to drive the "Flag
 * for…" pill + the composer's default recipient.
 */
export function useConnectedPartner(): ConnectedPartner | null {
  const { people } = usePerson();
  const linkedAdults = people.filter(
    (p) =>
      p.linkedUserId &&
      p.relationshipType !== 'self' &&
      p.relationshipType !== 'child',
  );
  if (linkedAdults.length === 0) return null;
  const chosen =
    linkedAdults.find((p) => p.relationshipType === 'spouse') ??
    linkedAdults[0];
  return {
    userId: chosen.linkedUserId!,
    displayName: chosen.name ?? 'Partner',
  };
}
