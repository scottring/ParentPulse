import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { BedtimeCardKind, JournalCheckIn } from '@/types/journal';

/** Fetch the most recent bedtime check-in card for this kid, or null
 *  if there are none. Queries by `subjectPersonId` and `familyId`,
 *  pulls the last 25 entries for this kid, and filters client-side
 *  for `checkIn.kind === 'child-bedtime'`. This avoids a new
 *  composite index. */
export async function getLastBedtimeCard(
  familyId: string,
  kidPersonId: string,
): Promise<BedtimeCardKind | null> {
  const q = query(
    collection(firestore, 'journal_entries'),
    where('familyId', '==', familyId),
    where('subjectPersonId', '==', kidPersonId),
    orderBy('createdAt', 'desc'),
    limit(25),
  );
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as { checkIn?: JournalCheckIn };
    const ci = data.checkIn;
    if (ci && ci.kind === 'child-bedtime' && ci.card) {
      return ci.card;
    }
  }
  return null;
}
