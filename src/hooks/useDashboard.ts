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

  // Listen to all contributions in the family
  useEffect(() => {
    if (!familyId) { setContribLoading(false); return; }
    const q = query(
      collection(firestore, 'contributions'),
      where('familyId', '==', familyId),
    );
    return onSnapshot(q, (snap) => {
      const docs: Contribution[] = [];
      snap.forEach((d) => docs.push({ ...d.data(), contributionId: d.id } as Contribution));
      setContributions(docs);
      setContribLoading(false);
    }, (err) => { setError(err.message); setContribLoading(false); });
  }, [familyId]);

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

  // Other people (non-self)
  const otherPeople = selfPerson
    ? people.filter((p) => p.personId !== selfPerson.personId)
    : [];

  // People who need observer contributions from the current user
  const peopleNeedingContributions = otherPeople.filter((p) => {
    return !contributions.some(
      (c) => c.contributorId === userId &&
             c.personId === p.personId &&
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

    for (const other of otherPeople) {
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

      const pairAssessments = assessments.filter((a) =>
        a.domain === domain &&
        a.participantIds.includes(selfPersonId) &&
        a.participantIds.includes(other.personId),
      );

      const pairArc = arcs.find((arc) =>
        arc.domain === domain &&
        arc.participantIds.includes(selfPersonId) &&
        arc.participantIds.includes(other.personId),
      ) || null;

      const pairItems = growthItems.filter((item) => {
        if (item.arcId && pairArc && item.arcId === pairArc.arcId) return true;
        if (item.targetPersonIds?.includes(other.personId)) return true;
        return false;
      });

      // Get narrative: prefer AI-generated pair narrative from assessment, fall back to synthesis
      const pairNarrative = pairAssessments.find((a) =>
        (a as DimensionAssessment & { narrative?: string }).narrative,
      );
      const otherManual = manuals.find((m) => m.personId === other.personId);
      const narrative = (pairNarrative as DimensionAssessment & { narrative?: string })?.narrative
        || otherManual?.synthesizedContent?.overview
        || null;

      const hasObserverContribution = contributions.some(
        (c) => c.contributorId === userId &&
               c.personId === other.personId &&
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
    peopleNeedingContributions,
    contributions,
  };
}
