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
  PersonManual,
  Contribution,
  PERSON_MANUAL_COLLECTIONS,
} from '@/types/person-manual';

// The core sections that matter for content depth
const SECTIONS = ['overview', 'triggers', 'what_works', 'boundaries', 'communication'] as const;

export type SectionId = (typeof SECTIONS)[number];

export interface SectionDepth {
  sectionId: SectionId;
  label: string;
  answeredCount: number; // total answers across all contributions for this section
  hasContent: boolean;
}

export interface ContributorInfo {
  contributorId: string;
  contributorName: string;
  perspectiveType: 'self' | 'observer';
  status: 'draft' | 'complete';
  answeredCount: number;
  draftProgress?: { sectionIndex: number; questionIndex: number };
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
  thinSections: string[]; // labels of sections with 0-1 answers
  missingSections: string[]; // labels of sections with 0 answers
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

function buildSummary(
  manual: PersonManual,
  contributions: Contribution[]
): ManualSummary {
  const manualContributions = contributions.filter(
    (c) => c.manualId === manual.manualId
  );

  // Build contributor info
  const contributors: ContributorInfo[] = manualContributions.map((c) => {
    let answeredCount = 0;
    if (c.answers) {
      for (const val of Object.values(c.answers)) {
        if (val !== null && val !== undefined && val !== '') answeredCount++;
      }
    }
    return {
      contributorId: c.contributorId,
      contributorName: c.contributorName,
      perspectiveType: c.perspectiveType,
      status: c.status,
      answeredCount,
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
  };
}

export function useManualSummaries(): {
  summaries: Map<string, ManualSummary>; // keyed by personId
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
        // Fetch all manuals and contributions for the family in parallel
        const [manualsSnap, contributionsSnap] = await Promise.all([
          getDocs(
            query(
              collection(firestore, PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS),
              where('familyId', '==', user!.familyId)
            )
          ),
          getDocs(
            query(
              collection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
              where('familyId', '==', user!.familyId)
            )
          ),
        ]);

        if (cancelled) return;

        const manuals = manualsSnap.docs.map((d) => ({
          ...d.data(),
          manualId: d.id,
        })) as PersonManual[];

        const contributions = contributionsSnap.docs.map((d) => ({
          ...d.data(),
          contributionId: d.id,
        })) as Contribution[];

        const map = new Map<string, ManualSummary>();
        for (const manual of manuals) {
          map.set(manual.personId, buildSummary(manual, contributions));
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
