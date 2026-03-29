import { Timestamp } from 'firebase/firestore';

/**
 * Compute age in years from a date of birth.
 * Accepts Firestore Timestamp or JS Date.
 */
export function computeAge(dateOfBirth: Timestamp | Date): number {
  const dob = dateOfBirth instanceof Timestamp ? dateOfBirth.toDate() : dateOfBirth;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function isChild(dateOfBirth: Timestamp | Date): boolean {
  return computeAge(dateOfBirth) < 18;
}

/** Age 6+ can participate in kid sessions */
export function isKidSessionEligible(dateOfBirth: Timestamp | Date): boolean {
  const age = computeAge(dateOfBirth);
  return age >= 6 && age < 18;
}

/** Age 8+ can contribute observer perspectives on others */
export function isKidObserverEligible(dateOfBirth: Timestamp | Date): boolean {
  const age = computeAge(dateOfBirth);
  return age >= 8 && age < 18;
}

/** Format age for display: "Age 8" or "8 years old" */
export function formatAge(dateOfBirth: Timestamp | Date): string {
  return `Age ${computeAge(dateOfBirth)}`;
}
