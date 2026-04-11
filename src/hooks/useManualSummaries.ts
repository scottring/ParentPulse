'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  Person,
  PersonManual,
  Contribution,
  PERSON_MANUAL_COLLECTIONS,
  RelationshipType,
} from '@/types/person-manual';
import { getOnboardingSections, getQuestionCount } from '@/config/onboarding-questions';
import { getSelfOnboardingSections } from '@/config/self-questions';
import { childQuestionnaire, getTotalQuestions as getChildTotalQuestions } from '@/config/child-questionnaire';

// The core sections that matter for content depth
const SECTIONS = ['overview', 'triggers', 'what_works', 'boundaries', 'communication'] as const;

export type SectionId = (typeof SECTIONS)[number];

export interface SectionDepth {
  sectionId: SectionId;
  label: string;
  answeredCount: number;
  hasContent: boolean;
}

export interface ContributorInfo {
  contributorId: string;
  contributorName: string;
  perspectiveType: 'self' | 'observer';
  relationshipToSubject: string;
  status: 'draft' | 'complete';
  answeredCount: number;
  totalQuestions: number;
  progressPercent: number;
  draftProgress?: { sectionIndex: number; questionIndex: number };
}

export interface JourneyStep {
  id: string;
  label: string;
  description: string;
  status: 'complete' | 'in-progress' | 'not-started';
  progress?: number; // 0-100 for in-progress
  contributorName?: string;
  actionUrl?: string;
}

export interface ManualSummary {
  manualId: string;
  personId: string;

  // Contributors
  contributors: ContributorInfo[];
  hasSelfPerspective: boolean;
  observerCount: number;
  draftsInProgress: number;

  // Content depth per section
  sections: SectionDepth[];
  totalAnswers: number;
  sectionsWithContent: number;
  totalSections: number;

  // Synthesis status
  hasSynthesis: boolean;
  lastSynthesizedAt?: Date;

  // What's thin/missing
  thinSections: string[];
  missingSections: string[];

  // Journey
  journeySteps: JourneyStep[];
  overallProgress: number; // 0-100
}

const SECTION_LABELS: Record<SectionId, string> = {
  overview: 'Overview',
  triggers: 'Triggers',
  what_works: 'What Works',
  boundaries: 'Boundaries',
  communication: 'Communication',
};

function countAnswersForSection(
  answers: Record<string, any>,
  sectionId: string
): number {
  let count = 0;
  for (const key of Object.keys(answers)) {
    if (key.startsWith(`${sectionId}.`) || key.startsWith(`${sectionId}_`)) {
      const val = answers[key];
      if (val !== null && val !== undefined && val !== '') {
        count++;
      }
    }
  }
  return count;
}

function getTotalQuestionsForContributor(
  perspectiveType: 'self' | 'observer',
  relationshipToSubject: string,
  personRelationshipType?: RelationshipType
): number {
  if (relationshipToSubject === 'child-session') {
    return getChildTotalQuestions(childQuestionnaire);
  }
  if (relationshipToSubject === 'child-observer') {
    // Kid observer questionnaire — similar count to child self
    return getChildTotalQuestions(childQuestionnaire);
  }
  if (perspectiveType === 'self') {
    const sections = getSelfOnboardingSections();
    return sections.reduce((sum, s) => sum + s.questions.length, 0);
  }
  // Observer
  const relType = personRelationshipType || 'other';
  return getQuestionCount(relType);
}

function buildJourneySteps(
  personId: string,
  manual: PersonManual,
  contributors: ContributorInfo[],
  currentUserId: string,
  person?: Person
): JourneyStep[] {
  const steps: JourneyStep[] = [];

  // Step 1: Manual Created (always complete if we're here)
  steps.push({
    id: 'manual-created',
    label: 'Manual Created',
    description: 'Operating manual initialized',
    status: 'complete',
  });

  // Step 2: Primary observer assessment (current user's observer contribution)
  const myObserver = contributors.find(
    c => c.contributorId === currentUserId && c.perspectiveType === 'observer' && c.relationshipToSubject !== 'child-observer'
  );
  if (myObserver) {
    steps.push({
      id: 'primary-observer',
      label: 'Your Assessment',
      description: myObserver.status === 'complete'
        ? `${myObserver.answeredCount} answers submitted`
        : `${myObserver.progressPercent}% complete`,
      status: myObserver.status === 'complete' ? 'complete' : 'in-progress',
      progress: myObserver.progressPercent,
      contributorName: 'You',
      actionUrl: `/people/${personId}/manual/onboard`,
    });
  } else {
    steps.push({
      id: 'primary-observer',
      label: 'Your Assessment',
      description: 'Share your perspective',
      status: 'not-started',
      actionUrl: `/people/${personId}/manual/onboard`,
    });
  }

  // Step 3: Self-perspective
  const selfContrib = contributors.find(c => c.perspectiveType === 'self');
  const isChild = person?.relationshipType === 'child';
  if (selfContrib) {
    steps.push({
      id: 'self-perspective',
      label: isChild ? `${selfContrib.contributorName}'s Voice` : 'Self-Perspective',
      description: selfContrib.status === 'complete'
        ? `${selfContrib.answeredCount} answers submitted`
        : `${selfContrib.progressPercent}% complete`,
      status: selfContrib.status === 'complete' ? 'complete' : 'in-progress',
      progress: selfContrib.progressPercent,
      contributorName: selfContrib.contributorName,
      actionUrl: isChild
        ? `/people/${personId}/manual/kid-session`
        : `/people/${personId}/manual/self-onboard`,
    });
  } else {
    steps.push({
      id: 'self-perspective',
      label: isChild ? `${person?.name || 'Child'}'s Voice` : 'Self-Perspective',
      description: isChild ? 'Kid self-session' : 'Their own perspective',
      status: 'not-started',
      actionUrl: isChild
        ? `/people/${personId}/manual/kid-session`
        : `/people/${personId}/manual/self-onboard`,
    });
  }

  // Step 4: Additional perspectives (other observers, kid-observer sessions)
  const additionalObservers = contributors.filter(
    c => c.perspectiveType === 'observer' &&
      c.contributorId !== currentUserId &&
      c.relationshipToSubject !== 'child-observer'
  );
  const kidObservers = contributors.filter(
    c => c.relationshipToSubject === 'child-observer'
  );
  const allAdditional = [...additionalObservers, ...kidObservers];
  const additionalComplete = allAdditional.filter(c => c.status === 'complete').length;
  const additionalTotal = allAdditional.length;

  if (additionalTotal > 0) {
    const allDone = allAdditional.every(c => c.status === 'complete');
    const anyStarted = allAdditional.some(c => c.status === 'draft' || c.status === 'complete');
    steps.push({
      id: 'additional-perspectives',
      label: 'More Perspectives',
      description: `${additionalComplete} of ${additionalTotal} additional perspective${additionalTotal !== 1 ? 's' : ''}`,
      status: allDone ? 'complete' : anyStarted ? 'in-progress' : 'not-started',
      progress: additionalTotal > 0 ? Math.round((additionalComplete / additionalTotal) * 100) : 0,
    });
  } else {
    steps.push({
      id: 'additional-perspectives',
      label: 'More Perspectives',
      description: 'Invite others to contribute',
      status: 'not-started',
    });
  }

  // Step 5: AI Synthesis
  const hasSynthesis = !!manual.synthesizedContent?.overview;
  const hasEnoughForSynthesis = contributors.some(c => c.status === 'complete');
  steps.push({
    id: 'synthesis',
    label: 'AI Synthesis',
    description: hasSynthesis ? 'Manual synthesized' : hasEnoughForSynthesis ? 'Ready to synthesize' : 'Needs completed perspectives first',
    status: hasSynthesis ? 'complete' : 'not-started',
    actionUrl: `/people/${personId}/manual`,
  });

  return steps;
}

function buildSummary(
  manual: PersonManual,
  contributions: Contribution[],
  currentUserId: string,
  person?: Person
): ManualSummary {
  const manualContributions = contributions.filter(
    (c) => c.manualId === manual.manualId
  );

  const personRelType = person?.relationshipType || manual.relationshipType;

  // Build contributor info with progress percentages
  const contributors: ContributorInfo[] = manualContributions.map((c) => {
    let answeredCount = 0;
    if (c.answers) {
      for (const val of Object.values(c.answers)) {
        if (val !== null && val !== undefined && val !== '') answeredCount++;
      }
    }
    const totalQuestions = getTotalQuestionsForContributor(
      c.perspectiveType,
      c.relationshipToSubject,
      personRelType
    );
    return {
      contributorId: c.contributorId,
      contributorName: c.contributorName,
      perspectiveType: c.perspectiveType,
      relationshipToSubject: c.relationshipToSubject,
      status: c.status,
      answeredCount,
      totalQuestions,
      progressPercent: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      draftProgress: c.draftProgress,
    };
  });

  const hasSelfPerspective = contributors.some(
    (c) => c.perspectiveType === 'self' && c.status === 'complete'
  );
  const observerCount = contributors.filter(
    (c) => c.perspectiveType === 'observer' && c.status === 'complete'
  ).length;
  const draftsInProgress = contributors.filter(
    (c) => c.status === 'draft'
  ).length;

  // Aggregate content depth per section across all complete contributions
  const completeContributions = manualContributions.filter(
    (c) => c.status === 'complete'
  );

  const sections: SectionDepth[] = SECTIONS.map((sectionId) => {
    let totalForSection = 0;
    for (const c of completeContributions) {
      if (c.answers) {
        totalForSection += countAnswersForSection(c.answers, sectionId);
      }
    }
    return {
      sectionId,
      label: SECTION_LABELS[sectionId],
      answeredCount: totalForSection,
      hasContent: totalForSection > 0,
    };
  });

  const totalAnswers = sections.reduce((sum, s) => sum + s.answeredCount, 0);
  const sectionsWithContent = sections.filter((s) => s.hasContent).length;

  const thinSections = sections
    .filter((s) => s.answeredCount <= 1)
    .map((s) => s.label);
  const missingSections = sections
    .filter((s) => s.answeredCount === 0)
    .map((s) => s.label);

  // Build journey
  const journeySteps = buildJourneySteps(manual.personId, manual, contributors, currentUserId, person);
  const completedSteps = journeySteps.filter(s => s.status === 'complete').length;
  const overallProgress = Math.round((completedSteps / journeySteps.length) * 100);

  return {
    manualId: manual.manualId,
    personId: manual.personId,
    contributors,
    hasSelfPerspective,
    observerCount,
    draftsInProgress,
    sections,
    totalAnswers,
    sectionsWithContent,
    totalSections: SECTIONS.length,
    hasSynthesis: !!manual.synthesizedContent?.overview,
    lastSynthesizedAt: manual.synthesizedContent?.lastSynthesizedAt?.toDate(),
    thinSections,
    missingSections,
    journeySteps,
    overallProgress,
  };
}

export function useManualSummaries(): {
  summaries: Map<string, ManualSummary>;
  loading: boolean;
  error: string | null;
} {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<Map<string, ManualSummary>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSummaries(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      try {
        // Contributions need to be loaded as two aligned queries and
        // merged, because Firestore rules allow reading a contribution
        // only if EITHER (a) you're the contributor or (b) status is
        // 'complete' and you're in the family. A single query filtered
        // only by familyId fails list-query security once other family
        // members have drafts in the collection.
        const [manualsSnap, ownContribSnap, completeContribSnap, peopleSnap] =
          await Promise.all([
            getDocs(
              query(
                collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
                where('familyId', '==', user!.familyId)
              )
            ),
            getDocs(
              query(
                collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
                where('familyId', '==', user!.familyId),
                where('contributorId', '==', user!.userId)
              )
            ),
            getDocs(
              query(
                collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
                where('familyId', '==', user!.familyId),
                where('status', '==', 'complete')
              )
            ),
            getDocs(
              query(
                collection(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE),
                where('familyId', '==', user!.familyId)
              )
            ),
          ]);

        if (cancelled) return;

        const manuals = manualsSnap.docs.map((d) => ({
          ...d.data(),
          manualId: d.id,
        })) as PersonManual[];

        // Merge own + complete contributions, deduping by contributionId
        const contribMap = new Map<string, Contribution>();
        for (const d of ownContribSnap.docs) {
          contribMap.set(d.id, { ...d.data(), contributionId: d.id } as Contribution);
        }
        for (const d of completeContribSnap.docs) {
          contribMap.set(d.id, { ...d.data(), contributionId: d.id } as Contribution);
        }
        const contributions = Array.from(contribMap.values());

        const people = peopleSnap.docs.map((d) => ({
          ...d.data(),
          personId: d.id,
        })) as Person[];

        const peopleMap = new Map(people.map(p => [p.personId, p]));

        const map = new Map<string, ManualSummary>();
        for (const manual of manuals) {
          const person = peopleMap.get(manual.personId);
          map.set(manual.personId, buildSummary(manual, contributions, user!.userId, person));
        }

        setSummaries(map);
        setError(null);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to fetch manual summaries:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { summaries, loading, error };
}
