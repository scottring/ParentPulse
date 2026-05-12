'use client';

import { usePerson } from '@/hooks/usePerson';

export interface ConnectedPartner {
  userId: string;
  displayName: string;
}

/**
 * Returns the current user's connected partner (spouse Person with a linked
 * Relish user account), or null if no such person exists in the family.
 *
 * Used by chat surfaces (CoachChat, AskAboutEntry) to drive the "Flag for…"
 * pill + composer's default recipient.
 */
export function useConnectedPartner(): ConnectedPartner | null {
  const { people } = usePerson();
  const partnerPerson = people.find(
    (p) => p.relationshipType === 'spouse' && p.linkedUserId,
  );
  if (!partnerPerson?.linkedUserId) return null;
  return {
    userId: partnerPerson.linkedUserId,
    displayName: partnerPerson.name ?? 'Partner',
  };
}
