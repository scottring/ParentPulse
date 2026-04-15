'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import type { Person, PersonManual, Contribution } from '@/types/person-manual';

/**
 * The single most important thing for the user to see on the Surface
 * right now. Walked in priority order (unfinished → time-sensitive →
 * fresh synthesis → synthesis overview → calm fallback). Callers use
 * the first non-null result and render the matching card. A `null`
 * return is the calm-state signal.
 */
export type SurfaceNext =
  | {
      kind: 'finish-self-onboard';
      personId: string;
      label: string;
      href: string;
    }
  | {
      kind: 'resume-draft';
      contributionId: string;
      subjectName: string;
      href: string;
    }
  | {
      kind: 'contribute-about';
      person: Person;
      href: string;
    }
  | {
      kind: 'fresh-synthesis';
      manual: PersonManual;
      href: string;
    }
  | null;

const FRESH_SYNTH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function useSurfaceNext(): SurfaceNext {
  const { user } = useAuth();
  const { state, selfPerson, peopleNeedingContributions, contributions, manuals } = useDashboard();

  return useMemo(() => {
    if (state === 'loading') return null;

    // 1. Unfinished self-onboard — the deepest version of "unfinished
    //    business" since it gates everything downstream.
    if (state === 'new_user' && selfPerson) {
      return {
        kind: 'finish-self-onboard',
        personId: selfPerson.personId,
        label: 'Your manual starts with you',
        href: `/people/${selfPerson.personId}/manual/self-onboard`,
      };
    }

    // 2. Resume an in-progress draft the user left unfinished.
    const myDraft: Contribution | undefined = contributions.find(
      (c) => c.contributorId === user?.userId && c.status === 'draft'
    );
    if (myDraft) {
      const subject = manuals.find((m) => m.manualId === myDraft.manualId);
      const href = subject
        ? subject.personId === selfPerson?.personId
          ? `/people/${subject.personId}/manual/self-onboard`
          : `/people/${subject.personId}/manual/onboard`
        : '/people';
      return {
        kind: 'resume-draft',
        contributionId: myDraft.contributionId,
        subjectName: subject?.personName || 'your manual',
        href,
      };
    }

    // 3. No draft, but people still need observer contributions from
    //    this user. Pick the first in the list.
    const nextPerson = peopleNeedingContributions[0];
    if (nextPerson) {
      return {
        kind: 'contribute-about',
        person: nextPerson,
        href: `/people/${nextPerson.personId}/manual/onboard`,
      };
    }

    // 4. Fresh synthesis in the last 7 days — surface it so the user
    //    sees the app's output.
    const freshManual = manuals
      .filter((m) => Boolean(m.synthesizedContent?.overview))
      .sort((a, b) => {
        const at = a.synthesizedContent?.lastSynthesizedAt?.toMillis?.() ?? 0;
        const bt = b.synthesizedContent?.lastSynthesizedAt?.toMillis?.() ?? 0;
        return bt - at;
      })[0];
    const freshAt = freshManual?.synthesizedContent?.lastSynthesizedAt;
    if (
      freshManual &&
      freshAt &&
      Date.now() - freshAt.toMillis() < FRESH_SYNTH_WINDOW_MS
    ) {
      return {
        kind: 'fresh-synthesis',
        manual: freshManual,
        href: `/journal?focus=${freshManual.personId}`,
      };
    }

    return null;
  }, [state, selfPerson, peopleNeedingContributions, contributions, manuals, user?.userId]);
}
