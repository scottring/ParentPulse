'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { Person, Contribution, PersonManual } from '@/types/person-manual';
import { GrowthItem } from '@/types/growth';
import { GrowthArc, DimensionAssessment, ARC_COLLECTIONS } from '@/types/growth-arc';
import { DimensionDomain } from '@/config/relationship-dimensions';

// Dashboard states — progressive onboarding
export type DashboardState =
  | 'loading'
  | 'new_user'          // No self-contribution yet
  | 'self_complete'     // Self done, no other people added
  | 'has_people'        // People exist, need to contribute about them
  | 'has_contributions' // Contributions exist, ready for analysis
  | 'active';           // Assessments exist, full dashboard

// A role the current user plays in a relationship
export interface UserRole {
  roleLabel: string;
  otherPerson: Person;
  domain: DimensionDomain;
  assessments: DimensionAssessment[];
  activeArc: GrowthArc | null;
  todayItems: GrowthItem[];
  narrative: string | null;         // Warm summary of this relationship
  hasObserverContribution: boolean; // Has the user contributed about this person?
}

export interface DashboardData {
  state: DashboardState;
  selfPerson: Person | null;
  selfManual: PersonManual | null;
  hasSelfContribution: boolean;
  roles: UserRole[];
  loading: boolean;
  error: string | null;
  hasAssessments: boolean;
  assessments: DimensionAssessment[];
  // For onboarding: the first spouse (if any)
  spouse: Person | null;
  // All people in the family
  people: Person[];
  // All person manuals in the family
  manuals: PersonManual[];
  // People who need observer contributions from the user
  peopleNeedingContributions: Person[];
  // All contributions in the family (for portrait inventory freshness)
  contributions: Contribution[];
}

export function useDashboard(): DashboardData {
  const { user } = useAuth();
  const { people, loading: peopleLoading } = usePerson();

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [manuals, setManuals] = useState<PersonManual[]>([]);
  const [assessments, setAssessments] = useState<DimensionAssessment[]>([]);
  const [arcs, setArcs] = useState<GrowthArc[]>([]);
  const [growthItems, setGrowthItems] = useState<GrowthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contribLoading, setContribLoading] = useState(true);
  const [manualsLoading, setManualsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const familyId = user?.familyId;
  const userId = user?.userId;

  // Listen to contributions in the family.
  //
  // Firestore rules allow reading a contribution if EITHER:
  //   (a) you are the contributor (own drafts + own completes), OR
  //   (b) it is `status == 'complete'` and in your family.
  //
  // A single list query filtered only by familyId can't satisfy list
  // security once other family members have drafts, so Firestore
  // silently rejects the subscription and the dashboard sees an
  // empty contributions array. We split into two aligned queries
  // and merge them client-side.
  useEffect(() => {
    if (!familyId || !userId) { setContribLoading(false); return; }

    const colRef = collection(firestore, 'contributions');
    const ownQuery = query(
      colRef,
      where('familyId', '==', familyId),
      where('contributorId', '==', userId),
    );
    const completeQuery = query(
      colRef,
      where('familyId', '==', familyId),
      where('status', '==', 'complete'),
    );

    const ownDocs = new Map<string, Contribution>();
    const completeDocs = new Map<string, Contribution>();
    let ownLoaded = false;
    let completeLoaded = false;

    const emit = () => {
      const merged = new Map<string, Contribution>();
      for (const [id, c] of ownDocs) merged.set(id, c);
      for (const [id, c] of completeDocs) merged.set(id, c);
      setContributions(Array.from(merged.values()));
      if (ownLoaded && completeLoaded) setContribLoading(false);
    };

    const unsubOwn = onSnapshot(
      ownQuery,
      (snap) => {
        ownDocs.clear();
        snap.forEach((d) =>
          ownDocs.set(d.id, { ...d.data(), contributionId: d.id } as Contribution),
        );
        ownLoaded = true;
        emit();
      },
      (err) => {
        console.error('Error listening to own contributions:', err);
        setError(err.message);
        ownLoaded = true;
        emit();
      },
    );

    const unsubComplete = onSnapshot(
      completeQuery,
      (snap) => {
        completeDocs.clear();
        snap.forEach((d) =>
          completeDocs.set(d.id, { ...d.data(), contributionId: d.id } as Contribution),
        );
        completeLoaded = true;
        emit();
      },
      (err) => {
        console.error('Error listening to completed contributions:', err);
        setError(err.message);
        completeLoaded = true;
        emit();
      },
    );

    return () => {
      unsubOwn();
      unsubComplete();
    };
  }, [familyId, userId]);

  // Listen to all person manuals in the family (for synthesis overviews)
  useEffect(() => {
    if (!familyId) { setManualsLoading(false); return; }
    const q = query(
      collection(firestore, 'person_manuals'),
      where('familyId', '==', familyId),
    );
    return onSnapshot(q, (snap) => {
      const docs: PersonManual[] = [];
      snap.forEach((d) => docs.push({ ...d.data(), manualId: d.id } as PersonManual));
      setManuals(docs);
      setManualsLoading(false);
    }, (err) => { setError(err.message); setManualsLoading(false); });
  }, [familyId]);

  // Listen to dimension assessments
  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(firestore, ARC_COLLECTIONS.DIMENSION_ASSESSMENTS),
      where('familyId', '==', familyId),
    );
    return onSnapshot(q, (snap) => {
      const docs: DimensionAssessment[] = [];
      snap.forEach((d) => docs.push({ ...d.data(), assessmentId: d.id } as DimensionAssessment));
      setAssessments(docs);
    }, (err) => setError(err.message));
  }, [familyId]);

  // Listen to active arcs
  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(firestore, ARC_COLLECTIONS.GROWTH_ARCS),
      where('familyId', '==', familyId),
      where('status', '==', 'active'),
    );
    return onSnapshot(q, (snap) => {
      const docs: GrowthArc[] = [];
      snap.forEach((d) => docs.push({ ...d.data(), arcId: d.id } as GrowthArc));
      setArcs(docs);
    });
  }, [familyId]);

  // Listen to active growth items
  useEffect(() => {
    if (!familyId || !userId) { setLoading(false); return; }
    const q = query(
      collection(firestore, 'growth_items'),
      where('familyId', '==', familyId),
      where('assignedToUserId', '==', userId),
      where('status', 'in', ['active', 'seen']),
      orderBy('scheduledDate', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      const now = new Date();
      const items: GrowthItem[] = [];
      snap.forEach((d) => {
        const item = { ...d.data(), growthItemId: d.id } as GrowthItem;
        const scheduled = item.scheduledDate?.toDate?.() || new Date(0);
        if (scheduled <= now) items.push(item);
      });
      setGrowthItems(items);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [familyId, userId]);

  // Derived state
  const selfPerson = people.find((p) => p.linkedUserId === userId) || null;
  const selfManual = selfPerson
    ? manuals.find((m) => m.personId === selfPerson.personId) || null
    : null;

  // Check if user has completed their self-contribution
  const hasSelfContribution = selfPerson
    ? contributions.some(
        (c) => c.contributorId === userId &&
               c.personId === selfPerson.personId &&
               c.perspectiveType === 'self' &&
               c.status === 'complete',
      )
    : false;

  // Find spouse
  const spouse = people.find((p) => p.relationshipType === 'spouse') || null;

  // All Person IDs that represent the current user across the family:
  // - Their self Person
  // - Any Person they've provided a self-contribution on
  // - Any spouse Person whose first name matches (created by partner to represent them)
  const userName = user?.name?.toLowerCase().trim();
  const userFirstName = userName?.split(' ')[0];
  const allCurrentUserPersonIds = new Set<string>();
  if (selfPerson) allCurrentUserPersonIds.add(selfPerson.personId);
  // Only count a self-perspective contribution as "this person IS the current user"
  // if the person record actually has relationshipType 'self' or has linkedUserId matching.
  // Otherwise a misrouted self-contribution (e.g. on a child) would hide that person.
  contributions
    .filter((c) => c.contributorId === userId && c.perspectiveType === 'self' && c.status === 'complete')
    .forEach((c) => {
      const person = people.find((p) => p.personId === c.personId);
      if (person && (person.relationshipType === 'self' || person.linkedUserId === userId)) {
        allCurrentUserPersonIds.add(c.personId);
      }
    });
  people.forEach((p) => {
    if (p.relationshipType === 'spouse' && userFirstName && p.name.toLowerCase().trim().startsWith(userFirstName)) {
      allCurrentUserPersonIds.add(p.personId);
    }
  });

  // Other people (non-self) — exclude all Person records that represent the current user
  const otherPeople = selfPerson
    ? people.filter((p) => !allCurrentUserPersonIds.has(p.personId))
    : [];

  // Build equivalence map: for each Person, find all Person IDs that represent
  // the same real person (e.g. Iris's self Person + Iris's spouse Person).
  // Two People are equivalent if they share a linkedUserId, or if one is 'self'
  // and another is 'spouse' with a matching first name.
  const equivalentIds = (personId: string): string[] => {
    const person = people.find((p) => p.personId === personId);
    if (!person) return [personId];
    const ids = new Set([personId]);
    const firstName = person.name.toLowerCase().trim().split(' ')[0];
    for (const p of people) {
      if (p.personId === personId) continue;
      // Same linkedUserId
      if (person.linkedUserId && p.linkedUserId === person.linkedUserId) { ids.add(p.personId); continue; }
      // Name match between self and spouse
      if ((person.relationshipType === 'self' && p.relationshipType === 'spouse') ||
          (person.relationshipType === 'spouse' && p.relationshipType === 'self')) {
        if (p.name.toLowerCase().trim().split(' ')[0] === firstName) ids.add(p.personId);
      }
    }
    return [...ids];
  };

  // People who need observer contributions from the current user
  const peopleNeedingContributions = otherPeople.filter((p) => {
    const allIds = equivalentIds(p.personId);
    return !contributions.some(
      (c) => c.contributorId === userId &&
             allIds.includes(c.personId) &&
             c.perspectiveType === 'observer' &&
             c.status === 'complete',
    );
  });

  // Count total complete contributions
  const totalContributions = contributions.filter((c) => c.status === 'complete').length;

  // Compute dashboard state
  const isAllLoading = loading || peopleLoading || contribLoading || manualsLoading;

  const state: DashboardState = useMemo(() => {
    if (isAllLoading) return 'loading';
    if (!hasSelfContribution) return 'new_user';
    if (otherPeople.length === 0) return 'self_complete';
    if (peopleNeedingContributions.length > 0) return 'has_people';
    if (assessments.length === 0 && totalContributions >= 2) return 'has_contributions';
    if (assessments.length > 0) return 'active';
    return 'has_contributions';
  }, [isAllLoading, hasSelfContribution, otherPeople.length, peopleNeedingContributions.length, assessments.length, totalContributions]);

  // Build roles (only in active state)
  const roles: UserRole[] = useMemo(() => {
    if (!selfPerson || state !== 'active') return [];

    const selfPersonId = selfPerson.personId;
    const result: UserRole[] = [];
    const processedPersonIds = new Set<string>();

    // Sort so relationship-typed records (spouse, child, etc.) come before
    // another user's 'self' Person — ensures we display the name the current
    // user chose (e.g. "Iris Leviner") rather than the other user's self name.
    const sortedOtherPeople = [...otherPeople].sort((a, b) => {
      const aIsSelf = a.relationshipType === 'self' ? 1 : 0;
      const bIsSelf = b.relationshipType === 'self' ? 1 : 0;
      return aIsSelf - bIsSelf;
    });

    for (const other of sortedOtherPeople) {
      // Deduplicate equivalent persons (e.g. Iris's spouse Person + Iris's self Person)
      const equivIds = equivalentIds(other.personId);
      if (equivIds.some((id) => processedPersonIds.has(id))) continue;
      equivIds.forEach((id) => processedPersonIds.add(id));
      let roleLabel: string;
      let domain: DimensionDomain;

      if (other.relationshipType === 'spouse') {
        roleLabel = 'Spouse';
        domain = 'couple';
      } else if (other.relationshipType === 'self' && other.linkedUserId && other.linkedUserId !== userId) {
        // Another user's self Person in the same family — treat as spouse/partner
        roleLabel = 'Spouse';
        domain = 'couple';
      } else if (other.relationshipType === 'child') {
        roleLabel = 'Parent';
        domain = 'parent_child';
      } else if (other.relationshipType === 'elderly_parent') {
        roleLabel = 'Caregiver';
        domain = 'parent_child';
      } else if (other.relationshipType === 'sibling') {
        roleLabel = 'Sibling';
        domain = 'couple';
      } else if (other.relationshipType === 'friend') {
        roleLabel = 'Friend';
        domain = 'couple';
      } else {
        continue;
      }

      const otherEquivIds = equivalentIds(other.personId);
      const otherIdSet = new Set(otherEquivIds);

      // Match assessments using any of the current user's Person IDs
      // and any equivalent ID for the other person
      const pairAssessments = assessments.filter((a) =>
        a.domain === domain &&
        a.participantIds.some((id: string) => allCurrentUserPersonIds.has(id)) &&
        a.participantIds.some((id: string) => otherIdSet.has(id)),
      );

      const pairArc = arcs.find((arc) =>
        arc.domain === domain &&
        arc.participantIds.some((id: string) => allCurrentUserPersonIds.has(id)) &&
        arc.participantIds.some((id: string) => otherIdSet.has(id)),
      ) || null;

      const pairItems = growthItems.filter((item) => {
        if (item.arcId && pairArc && item.arcId === pairArc.arcId) return true;
        if (item.targetPersonIds?.some((id: string) => otherIdSet.has(id))) return true;
        return false;
      });

      // Get narrative: prefer AI-generated pair narrative from assessment, fall back to synthesis
      const pairNarrative = pairAssessments.find((a) =>
        (a as DimensionAssessment & { narrative?: string }).narrative,
      );
      const otherManual = manuals.find((m) => otherEquivIds.includes(m.personId));
      const narrative = (pairNarrative as DimensionAssessment & { narrative?: string })?.narrative
        || otherManual?.synthesizedContent?.overview
        || null;

      const hasObserverContribution = contributions.some(
        (c) => c.contributorId === userId &&
               otherEquivIds.includes(c.personId) &&
               c.perspectiveType === 'observer' &&
               c.status === 'complete',
      );

      result.push({
        roleLabel,
        otherPerson: other,
        domain,
        assessments: pairAssessments,
        activeArc: pairArc,
        todayItems: pairItems,
        narrative,
        hasObserverContribution,
      });
    }

    result.sort((a, b) => {
      const order: Record<string, number> = { Spouse: 0, Parent: 1, Caregiver: 2, Sibling: 3, Friend: 4 };
      return (order[a.roleLabel] ?? 5) - (order[b.roleLabel] ?? 5);
    });

    return result;
  }, [selfPerson, state, otherPeople, assessments, arcs, growthItems, manuals, contributions, userId]);

  return {
    state,
    selfPerson,
    selfManual,
    hasSelfContribution,
    roles,
    loading: isAllLoading,
    error,
    hasAssessments: assessments.length > 0,
    assessments,
    spouse,
    people,
    manuals,
    peopleNeedingContributions,
    contributions,
  };
}
