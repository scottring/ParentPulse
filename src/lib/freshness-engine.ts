import { Timestamp } from 'firebase/firestore';
import { Person, PersonManual, Contribution } from '@/types/person-manual';

// ==================== Freshness ====================

export type FreshnessStatus = 'fresh' | 'aging' | 'stale';

const FRESH_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;  // 30 days
const AGING_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;   // 90 days

/**
 * How fresh is a manual's data?
 * fresh: updated within 30 days
 * aging: 30-90 days
 * stale: > 90 days or never updated
 */
export function computeFreshness(manual: PersonManual): FreshnessStatus {
  const refTimestamp = manual.lastContributionAt ?? manual.updatedAt;
  if (!refTimestamp) return 'stale';

  const ageMs = Date.now() - refTimestamp.toMillis();
  if (ageMs < FRESH_THRESHOLD_MS) return 'fresh';
  if (ageMs < AGING_THRESHOLD_MS) return 'aging';
  return 'stale';
}

/**
 * Human-readable "Updated X ago" string.
 */
export function freshnessLabel(manual: PersonManual): string {
  const refTimestamp = manual.lastContributionAt ?? manual.updatedAt;
  if (!refTimestamp) return 'Never updated';

  const days = Math.floor((Date.now() - refTimestamp.toMillis()) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `Updated ${Math.floor(days / 30)} months ago`;
  return `Updated over a year ago`;
}

// ==================== Contribution Coverage ====================

export interface ContributionCoverage {
  hasSelfPerspective: boolean;
  observerCount: number;
  missingPerspectives: string[];
  oldestContribution: Timestamp | null;
  newestContribution: Timestamp | null;
}

/**
 * Analyze what perspective coverage exists for a manual.
 */
export function computeContributionCoverage(
  manual: PersonManual,
  contributions: Contribution[],
  person: Person,
): ContributionCoverage {
  const completed = contributions.filter(
    (c) => c.manualId === manual.manualId && c.status === 'complete',
  );

  const hasSelfPerspective = completed.some((c) => c.perspectiveType === 'self');
  const observers = completed.filter((c) => c.perspectiveType === 'observer');

  const missing: string[] = [];
  if (!hasSelfPerspective && person.canSelfContribute) {
    missing.push('self');
  }
  if (observers.length === 0) {
    missing.push('observer');
  }

  const timestamps = completed
    .map((c) => c.updatedAt)
    .filter((t): t is Timestamp => !!t);
  timestamps.sort((a, b) => a.toMillis() - b.toMillis());

  return {
    hasSelfPerspective,
    observerCount: observers.length,
    missingPerspectives: missing,
    oldestContribution: timestamps[0] ?? null,
    newestContribution: timestamps[timestamps.length - 1] ?? null,
  };
}

// ==================== Family Completeness ====================

export type PersonDataStatus = 'complete' | 'partial' | 'empty' | 'stale';

export interface PersonCompleteness {
  personId: string;
  name: string;
  status: PersonDataStatus;
  freshness: FreshnessStatus;
  hasSelfPerspective: boolean;
  observerCount: number;
}

export interface FamilyCompleteness {
  overallPercent: number;
  coverage: number;
  freshness: number;
  depth: number;
  perPerson: PersonCompleteness[];
}

/**
 * Compute how complete and current the family's data is overall.
 */
export function computeFamilyCompleteness(
  people: Person[],
  manuals: PersonManual[],
  contributions: Contribution[],
): FamilyCompleteness {
  const activePeople = people.filter((p) => !p.archived);
  if (activePeople.length === 0) {
    return { overallPercent: 0, coverage: 0, freshness: 0, depth: 0, perPerson: [] };
  }

  const manualMap = new Map(manuals.map((m) => [m.personId, m]));

  const perPerson: PersonCompleteness[] = activePeople.map((person) => {
    const manual = manualMap.get(person.personId);
    if (!manual) {
      return {
        personId: person.personId,
        name: person.name,
        status: 'empty' as const,
        freshness: 'stale' as const,
        hasSelfPerspective: false,
        observerCount: 0,
      };
    }

    const coverage = computeContributionCoverage(manual, contributions, person);
    const fresh = computeFreshness(manual);

    let status: PersonDataStatus;
    if (fresh === 'stale') {
      status = 'stale';
    } else if (coverage.hasSelfPerspective && coverage.observerCount > 0) {
      status = 'complete';
    } else if (coverage.hasSelfPerspective || coverage.observerCount > 0) {
      status = 'partial';
    } else {
      status = 'empty';
    }

    return {
      personId: person.personId,
      name: person.name,
      status,
      freshness: fresh,
      hasSelfPerspective: coverage.hasSelfPerspective,
      observerCount: coverage.observerCount,
    };
  });

  // Coverage: % of people who have manuals
  const withManuals = perPerson.filter((p) => p.status !== 'empty').length;
  const coverage = withManuals / activePeople.length;

  // Freshness: % of manuals that are fresh
  const freshManuals = perPerson.filter((p) => p.freshness === 'fresh').length;
  const freshness = withManuals > 0 ? freshManuals / withManuals : 0;

  // Depth: avg perspectives per person (self counts as 1, each observer as 1)
  const totalPerspectives = perPerson.reduce(
    (sum, p) => sum + (p.hasSelfPerspective ? 1 : 0) + p.observerCount,
    0,
  );
  const maxPerspectives = activePeople.length * 2; // ideal: self + at least 1 observer each
  const depth = maxPerspectives > 0 ? totalPerspectives / maxPerspectives : 0;

  // Overall: weighted average
  const overallPercent = Math.round((coverage * 0.4 + freshness * 0.3 + depth * 0.3) * 100);

  return { overallPercent, coverage, freshness, depth, perPerson };
}

// ==================== Age / Developmental Helpers ====================

export type AgeGroup = 'infant' | 'toddler' | 'preschool' | 'school_age' | 'tween' | 'teen' | 'adult';

export function getAgeGroup(age: number): AgeGroup {
  if (age < 1) return 'infant';
  if (age < 3) return 'toddler';
  if (age < 5) return 'preschool';
  if (age < 10) return 'school_age';
  if (age < 13) return 'tween';
  if (age < 18) return 'teen';
  return 'adult';
}

export function ageGroupLabel(group: AgeGroup): string {
  const labels: Record<AgeGroup, string> = {
    infant: 'Infant',
    toddler: 'Toddler',
    preschool: 'Preschool',
    school_age: 'School-age',
    tween: 'Tween',
    teen: 'Teen',
    adult: 'Adult',
  };
  return labels[group];
}
