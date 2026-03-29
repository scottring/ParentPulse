import { Person } from '@/types/person-manual';

/**
 * Detect twin pairs among children in the family.
 * Returns a Set of personIds that are twins (same DOB, both relationship type 'child').
 */
export function detectTwins(people: Person[]): Set<string> {
  const twinIds = new Set<string>();
  const children = people.filter(p => p.relationshipType === 'child' && p.dateOfBirth);

  for (let i = 0; i < children.length; i++) {
    for (let j = i + 1; j < children.length; j++) {
      const a = children[i];
      const b = children[j];
      if (!a.dateOfBirth || !b.dateOfBirth) continue;

      const dateA = a.dateOfBirth.toDate();
      const dateB = b.dateOfBirth.toDate();

      // Same date = twins
      if (
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate()
      ) {
        twinIds.add(a.personId);
        twinIds.add(b.personId);
      }
    }
  }

  return twinIds;
}
