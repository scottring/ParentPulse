import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

/**
 * Find the other parent-role user in the family. Returns null if 0 or
 * >1 other parents exist (we do not silently pick one).
 */
export async function findSpouseUserId(
  familyId: string,
  currentUserId: string,
): Promise<string | null> {
  const q = query(
    collection(firestore, 'users'),
    where('familyId', '==', familyId),
    where('role', '==', 'parent'),
  );
  const snap = await getDocs(q);
  const otherIds = snap.docs
    .filter((d) => d.data().role === 'parent')
    .map((d) => d.id)
    .filter((id) => id !== currentUserId);
  return otherIds.length === 1 ? otherIds[0] : null;
}
