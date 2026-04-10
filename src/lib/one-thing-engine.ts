import { Person, PersonManual, Contribution } from '@/types/person-manual';
import { DimensionAssessment, GrowthArc } from '@/types/growth-arc';
import { GrowthItem } from '@/types/growth';
import { computeFreshness } from '@/lib/freshness-engine';
import type { DashboardState, UserRole } from '@/hooks/useDashboard';

// ==================== The One Thing ====================

export type OneThingType =
  | 'unfinished'          // Broken loop — started something, didn't finish
  | 'time_sensitive'      // Expiring growth item, overdue check-in
  | 'new_from_others'     // Someone contributed and you haven't seen it
  | 'synthesis_ready'     // Manual was updated by AI
  | 'growth_step'         // Current exercise in active arc
  | 'gap'                 // Missing perspectives, stale manuals
  | 'nothing';            // Everything is current — calm state

export interface OneThing {
  type: OneThingType;
  title: string;
  description: string;
  actionRoute: string;
  actionLabel: string;
  personName?: string;
  personId?: string;
  priority: number;       // Lower = higher priority (0 is highest)
}

const CALM_STATE: OneThing = {
  type: 'nothing',
  title: 'Everything\u2019s steady',
  description: 'Your family\u2019s manuals are current and your growth is on track. Open a manual and read.',
  actionRoute: '/people',
  actionLabel: 'Browse manuals',
  priority: 999,
};

// ==================== Main Engine ====================

export function computeOneThing(params: {
  state: DashboardState;
  userId: string;
  userName: string;
  selfPerson: Person | null;
  people: Person[];
  manuals: PersonManual[];
  contributions: Contribution[];
  assessments: DimensionAssessment[];
  roles: UserRole[];
  activeArcs: GrowthArc[];
  todayItems: GrowthItem[];
  hasSelfContribution: boolean;
}): OneThing {
  const {
    state, userId, userName, selfPerson, people, manuals,
    contributions, assessments, roles, activeArcs, todayItems,
    hasSelfContribution,
  } = params;

  // During onboarding, the One Thing is always the next onboarding step
  const onboardingThing = getOnboardingThing(state, selfPerson, people, params);
  if (onboardingThing) return onboardingThing;

  // Active state: run the priority hierarchy
  const candidates: OneThing[] = [];

  // 1. Unfinished business — draft contributions
  // Exclude drafts for people where the user already has a completed contribution
  const completedPersonIds = new Set(
    contributions
      .filter((c) => c.contributorId === userId && c.status === 'complete')
      .map((c) => c.personId),
  );
  const drafts = contributions.filter(
    (c) => c.contributorId === userId && c.status === 'draft' && !completedPersonIds.has(c.personId),
  );
  if (drafts.length > 0) {
    const draft = drafts[0];
    const person = people.find((p) => p.personId === draft.personId);
    // Safety: only route to self-onboard if this is actually the user's own person record
    const isSelfPerson = selfPerson && draft.personId === selfPerson.personId;
    const routeIsSelf = draft.perspectiveType === 'self' && isSelfPerson;
    candidates.push({
      type: 'unfinished',
      title: `Finish your contribution for ${person?.name || 'someone'}`,
      description: 'You started this but didn\u2019t finish. Pick up where you left off.',
      actionRoute: routeIsSelf
        ? `/people/${draft.personId}/manual/self-onboard`
        : `/people/${draft.personId}/manual/onboard`,
      actionLabel: 'Continue',
      personName: person?.name,
      personId: draft.personId,
      priority: 0,
    });
  }

  // 2. Time-sensitive — growth items expiring today, overdue check-ins
  const expiringItems = todayItems.filter((item) => {
    if (!item.expiresAt) return false;
    const hoursLeft = (item.expiresAt.toMillis() - Date.now()) / (1000 * 60 * 60);
    return hoursLeft < 24 && hoursLeft > 0;
  });
  if (expiringItems.length > 0) {
    const item = expiringItems[0];
    candidates.push({
      type: 'time_sensitive',
      title: 'Today\u2019s practice',
      description: item.title || item.body?.slice(0, 80) || 'A growth activity is waiting for you.',
      actionRoute: '/journal',
      actionLabel: 'Do it now',
      priority: 1,
    });
  }

  // Check-in overdue (> 14 days)
  const lastAssessedTimes = assessments
    .map((a) => a.lastAssessedAt?.toMillis() || 0)
    .filter((t) => t > 0);
  const mostRecentAssessment = lastAssessedTimes.length > 0 ? Math.max(...lastAssessedTimes) : 0;
  const daysSinceCheckin = mostRecentAssessment > 0
    ? (Date.now() - mostRecentAssessment) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (daysSinceCheckin > 14 && assessments.length > 0) {
    candidates.push({
      type: 'time_sensitive',
      title: 'Check-in overdue',
      description: daysSinceCheckin > 30
        ? 'It\u2019s been over a month. A quick check-in keeps your picture accurate.'
        : 'A weekly check-in helps track what\u2019s shifting.',
      actionRoute: '/checkin',
      actionLabel: 'Check in now',
      priority: daysSinceCheckin > 30 ? 1 : 2,
    });
  }

  // 3. New information from others — contributions you haven't seen
  const othersContributions = contributions.filter(
    (c) => c.contributorId !== userId &&
           c.status === 'complete' &&
           c.updatedAt &&
           (Date.now() - c.updatedAt.toMillis()) < 7 * 24 * 60 * 60 * 1000,
  );
  // Simple heuristic: if there are recent contributions from others, flag them
  if (othersContributions.length > 0) {
    const latest = othersContributions.sort(
      (a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis(),
    )[0];
    const person = people.find((p) => p.personId === latest.personId);
    candidates.push({
      type: 'new_from_others',
      title: `${latest.contributorName} shared about ${person?.name || 'someone'}`,
      description: 'New perspective added \u2014 see how it changes the picture.',
      actionRoute: `/people/${latest.personId}/manual`,
      actionLabel: 'View manual',
      personName: person?.name,
      personId: latest.personId,
      priority: 3,
    });
  }

  // 4. Synthesis ready — manuals with recent synthesis
  const recentSyntheses = manuals.filter((m) => {
    const synthAt = m.synthesizedContent?.lastSynthesizedAt;
    if (!synthAt) return false;
    const daysSince = (Date.now() - synthAt.toMillis()) / (1000 * 60 * 60 * 24);
    return daysSince < 3;
  });
  if (recentSyntheses.length > 0) {
    const manual = recentSyntheses[0];
    candidates.push({
      type: 'synthesis_ready',
      title: `${manual.personName}\u2019s manual was refreshed`,
      description: 'AI synthesis updated with new insights.',
      actionRoute: `/people/${manual.personId}/manual`,
      actionLabel: 'Read insights',
      personName: manual.personName,
      personId: manual.personId,
      priority: 4,
    });
  }

  // 5. Growth arc next step
  if (todayItems.length > 0 && expiringItems.length === 0) {
    const item = todayItems[0];
    const targetPerson = item.targetPersonIds?.[0];
    const person = targetPerson ? people.find((p) => p.personId === targetPerson) : null;
    candidates.push({
      type: 'growth_step',
      title: item.title || 'Today\u2019s growth practice',
      description: item.body?.slice(0, 100) || 'A new activity is ready for you.',
      actionRoute: '/journal',
      actionLabel: 'Start',
      personName: person?.name,
      personId: person?.personId,
      priority: 5,
    });
  } else if (activeArcs.length > 0 && todayItems.length === 0) {
    const arc = activeArcs[0];
    candidates.push({
      type: 'growth_step',
      title: `Continue: ${arc.title}`,
      description: `Week ${arc.currentWeek} of ${arc.durationWeeks} \u2014 ${arc.levelTitle}`,
      actionRoute: '/journal',
      actionLabel: 'Open workbook',
      priority: 5,
    });
  }

  // 6. Gaps — missing perspectives, stale manuals
  const activePeople = people.filter((p) => !p.archived);
  const manualMap = new Map(manuals.map((m) => [m.personId, m]));

  for (const person of activePeople) {
    if (person.personId === selfPerson?.personId) continue;
    const manual = manualMap.get(person.personId);

    if (!manual) {
      candidates.push({
        type: 'gap',
        title: `${person.name} doesn\u2019t have a manual yet`,
        description: 'Start building understanding.',
        actionRoute: `/people/${person.personId}/create-manual`,
        actionLabel: 'Create manual',
        personName: person.name,
        personId: person.personId,
        priority: 6,
      });
      break; // Only show one gap at a time
    }

    const freshness = computeFreshness(manual);
    if (freshness === 'stale') {
      candidates.push({
        type: 'gap',
        title: `${person.name}\u2019s manual is getting stale`,
        description: 'It\u2019s been a while. Things may have changed.',
        actionRoute: `/people/${person.personId}/manual`,
        actionLabel: 'Update',
        personName: person.name,
        personId: person.personId,
        priority: 6,
      });
      break;
    }

    if (!manual.perspectives?.self && person.canSelfContribute) {
      candidates.push({
        type: 'gap',
        title: `${person.name} hasn\u2019t shared their own perspective`,
        description: 'Invite them to add their self-view.',
        actionRoute: `/people/${person.personId}/manual`,
        actionLabel: 'View manual',
        personName: person.name,
        personId: person.personId,
        priority: 7,
      });
      break;
    }
  }

  // Pick the highest-priority candidate
  if (candidates.length === 0) return CALM_STATE;
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0];
}

// ==================== Onboarding One Thing ====================

function getOnboardingThing(
  state: DashboardState,
  selfPerson: Person | null,
  people: Person[],
  params: { hasSelfContribution: boolean },
): OneThing | null {
  if (state === 'active') return null;

  switch (state) {
    case 'new_user':
      if (!selfPerson) return null;
      return {
        type: 'unfinished',
        title: 'Start with you',
        description: 'How you handle stress, what you need, how you communicate.',
        actionRoute: `/people/${selfPerson.personId}/manual/self-onboard`,
        actionLabel: 'Begin',
        priority: 0,
      };

    case 'self_complete':
      return {
        type: 'gap',
        title: 'Who matters most?',
        description: 'Add the people you want to understand better.',
        actionRoute: '/people',
        actionLabel: 'Add someone',
        priority: 0,
      };

    case 'has_people': {
      const otherPeople = people.filter(
        (p) => p.personId !== selfPerson?.personId && !p.archived,
      );
      const first = otherPeople[0];
      if (!first) return null;
      const isChild = first.relationshipType === 'child';
      return {
        type: 'gap',
        title: `What do you see in ${first.name}?`,
        description: `You see ${first.name} from a perspective they can\u2019t see themselves.`,
        actionRoute: isChild
          ? `/people/${first.personId}/manual/kid-session`
          : `/people/${first.personId}/manual/onboard`,
        actionLabel: isChild ? 'Start session' : 'Begin',
        personName: first.name,
        personId: first.personId,
        priority: 0,
      };
    }

    case 'has_contributions':
      return {
        type: 'time_sensitive',
        title: 'Ready to see the picture',
        description: 'We\u2019ll map your relationships across 20 dimensions.',
        actionRoute: '/dashboard',
        actionLabel: 'Analyze',
        priority: 0,
      };

    default:
      return null;
  }
}

// ==================== Scoped One Thing (per-page) ====================

export function computePersonOneThing(params: {
  personId: string;
  userId: string;
  manual: PersonManual | null;
  contributions: Contribution[];
  assessments: DimensionAssessment[];
}): OneThing | null {
  const { personId, userId, manual, contributions, assessments } = params;

  if (!manual) return null;

  // Check for drafts on this person
  const draft = contributions.find(
    (c) => c.personId === personId && c.contributorId === userId && c.status === 'draft',
  );
  if (draft) {
    // Only route to self-onboard if this is genuinely a self-perspective draft
    // AND the person's linkedUserId matches the current user
    const isTrulySelf = draft.perspectiveType === 'self' &&
      manual.perspectives?.self === userId;
    return {
      type: 'unfinished',
      title: 'You have an unfinished contribution',
      description: 'Pick up where you left off.',
      actionRoute: isTrulySelf
        ? `/people/${personId}/manual/self-onboard`
        : `/people/${personId}/manual/onboard`,
      actionLabel: 'Continue',
      personId,
      priority: 0,
    };
  }

  // Check for significant gaps
  const gaps = manual.synthesizedContent?.gaps?.filter(
    (g) => g.gapSeverity === 'significant_gap',
  );
  if (gaps && gaps.length > 0) {
    return {
      type: 'synthesis_ready',
      title: `${gaps.length} significant perspective gap${gaps.length > 1 ? 's' : ''}`,
      description: gaps[0].topic,
      actionRoute: `/people/${personId}/manual`,
      actionLabel: 'Explore gaps',
      personId,
      priority: 4,
    };
  }

  // Stale
  const freshness = computeFreshness(manual);
  if (freshness === 'stale') {
    return {
      type: 'gap',
      title: 'This manual is getting stale',
      description: 'Consider updating your perspective.',
      actionRoute: `/people/${personId}/manual/onboard`,
      actionLabel: 'Update',
      personId,
      priority: 6,
    };
  }

  return null; // Nothing needs attention — calm state
}
