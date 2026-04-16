/**
 * Surface priority engine — pure function that takes all available
 * data and returns the prioritized sections for the home surface.
 *
 * Priority hierarchy (from DESIGN-VISION.md):
 * 1. Unfinished business (high-priority action items)
 * 2. Time-sensitive (expiring growth items)
 * 3. New information from others (recent contributions)
 * 4. Synthesis ready (significant gaps or alignments)
 * 5. Growth arc next step (active practice)
 * 6. Gaps and invitations (stale manuals, missing perspectives)
 * 7. Calm (nothing needed)
 */

import type {
  SurfacePriorityInput,
  SurfaceSections,
  LeadItem,
  ManualInsightItem,
  FamilyPill,
} from '@/types/surface';
import type { ActionItem } from '@/types/action-items';
import type { GrowthItem } from '@/types/growth';
import type { PersonManual, SynthesizedInsight } from '@/types/person-manual';
import { computeFreshness } from '@/lib/freshness-engine';

// ─── Main Entry Point ──────────────────────────────────────

export function computeSurfaceSections(input: SurfacePriorityInput): SurfaceSections {
  const dismissed = input.dismissedIds ?? new Set<string>();
  const lead = computeLead(input, dismissed);
  const recentCaptures = input.journalEntries
    .filter((e) => !dismissed.has(e.entryId))
    .slice(0, 3);
  const manualInsight = pickManualInsight(input.manuals, lead, dismissed);
  const practiceToTry = pickPractice(input.activeGrowthItems, lead, dismissed);
  const familyPeople = buildFamilyPills(input);
  const echo = input.echo && !dismissed.has(input.echo.entryId) ? input.echo : null;

  return { lead, recentCaptures, manualInsight, practiceToTry, familyPeople, echo };
}

// ─── Lead Computation ──────────────────────────────────────

function computeLead(input: SurfacePriorityInput, dismissed: Set<string>): LeadItem {
  const { actionItems, activeGrowthItems, arcGroups, manuals, contributions, userId } = input;

  // 1. Unfinished business — high-priority action items
  const urgent = actionItems.filter((a) => a.priority === 'high' && !dismissed.has(a.id));
  if (urgent.length > 0) {
    const item = urgent[0];
    return actionItemToLead(item);
  }

  // 2. Time-sensitive — growth items expiring within 24h
  const now = Date.now();
  const expiringSoon = activeGrowthItems.filter((g) => {
    if (dismissed.has(g.growthItemId)) return false;
    const exp = g.expiresAt?.toDate?.()?.getTime();
    return exp && exp - now < 24 * 60 * 60 * 1000 && exp > now;
  });
  if (expiringSoon.length > 0) {
    return growthItemToLead(expiringSoon[0], 'Time-sensitive');
  }

  // 3. New information from others — contributions by other family members
  const recentOtherContributions = contributions
    .filter((c) => c.contributorId !== userId && c.status === 'complete')
    .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
  if (recentOtherContributions.length > 0) {
    const c = recentOtherContributions[0];
    const daysSince = c.updatedAt?.toDate?.()
      ? Math.floor((now - c.updatedAt.toDate().getTime()) / (1000 * 60 * 60 * 24))
      : null;
    if (daysSince !== null && daysSince <= 7) {
      const firstName = c.contributorName?.split(' ')[0] || 'Someone';
      return {
        id: `contrib-${c.contributionId}`,
        type: 'contribution_new',
        eyebrow: 'New in the library',
        title: `${firstName} added a new perspective`,
        body: `A fresh contribution has been added${c.personId ? '' : ''}. The manual is richer for it.`,
        ctaLabel: 'Read what changed',
        ctaHref: c.personId ? `/people/${c.personId}/manual` : '/manual',
        personName: firstName,
        glyph: '✦',
        glyphColor: '#7C9082',
      };
    }
  }

  // 4. Synthesis ready — significant gaps
  const topGap = findTopInsight(manuals, 'significant_gap');
  if (topGap) {
    return {
      id: `insight-${topGap.personId}-${topGap.insight.id}`,
      type: 'insight',
      eyebrow: 'From the synthesis',
      title: `On ${topGap.personName}: perspectives differ`,
      body: topGap.insight.synthesis,
      ctaLabel: 'Open the manual',
      ctaHref: `/people/${topGap.personId}/manual`,
      personName: topGap.personName,
      glyph: '—',
      glyphColor: '#C08070',
    };
  }

  // 5. Growth arc next step
  if (arcGroups.length > 0 && arcGroups[0].activeItems.length > 0) {
    return growthItemToLead(arcGroups[0].activeItems[0], 'This week in your arc');
  }

  // 5b. Any active growth item
  if (activeGrowthItems.length > 0) {
    return growthItemToLead(activeGrowthItems[0], 'Something to try');
  }

  // 6. Gaps and invitations — medium-priority action items
  const medium = actionItems.filter((a) => a.priority === 'medium' && !dismissed.has(a.id));
  if (medium.length > 0) {
    return actionItemToLead(medium[0]);
  }

  // 7. Calm — nothing needed
  return {
    id: 'calm',
    type: 'calm',
    eyebrow: 'Today',
    title: 'Everything\u2019s steady',
    body: 'The manuals are current, the journal is listening, and nothing needs your attention. Open the journal and read, or capture a thought when one comes.',
    ctaLabel: 'Open the journal',
    ctaHref: '/journal',
    glyph: '❦',
    glyphColor: '#7C9082',
  };
}

// ─── Helpers ───────────────────────────────────────────────

function actionItemToLead(item: ActionItem): LeadItem {
  return {
    id: item.id,
    type: 'action',
    eyebrow: item.priority === 'high' ? 'Needs your attention' : 'An invitation',
    title: item.title,
    body: item.description,
    ctaLabel: item.type === 'missing_data' ? 'Begin writing' : 'Take a look',
    ctaHref: item.actionRoute,
    personName: item.targetPersonName,
    glyph: item.priority === 'high' ? '◆' : '·',
    glyphColor: item.priority === 'high' ? '#C08070' : '#7C9082',
  };
}

function growthItemToLead(item: GrowthItem, eyebrow: string): LeadItem {
  return {
    id: item.growthItemId,
    type: 'practice',
    eyebrow,
    title: item.title,
    body: item.body,
    ctaLabel: 'Begin this practice',
    ctaHref: `/growth/${item.growthItemId}`,
    glyph: item.emoji || '✦',
    glyphColor: '#5C8064',
  };
}

function findTopInsight(
  manuals: PersonManual[],
  severity: 'significant_gap' | 'minor_gap' | 'aligned',
): ManualInsightItem | null {
  for (const manual of manuals) {
    const sc = manual.synthesizedContent;
    if (!sc) continue;

    const gaps = sc.gaps?.filter((g) => g.gapSeverity === severity) || [];
    if (gaps.length > 0) {
      return {
        personName: manual.personName,
        personId: manual.personId,
        insight: gaps[0],
        insightType: severity === 'aligned' ? 'alignment' : 'gap',
      };
    }
  }
  return null;
}

function pickManualInsight(
  manuals: PersonManual[],
  lead: LeadItem,
  dismissed: Set<string>,
): ManualInsightItem | null {
  // Don't duplicate the lead if it's already an insight
  if (lead.type === 'insight') {
    // Find a different insight — try alignments instead of gaps
    for (const manual of manuals) {
      const sc = manual.synthesizedContent;
      if (!sc) continue;
      if (sc.alignments?.length) {
        return {
          personName: manual.personName,
          personId: manual.personId,
          insight: sc.alignments[0],
          insightType: 'alignment',
        };
      }
    }
    return null;
  }

  // Find the most significant insight available
  return (
    findTopInsight(manuals, 'significant_gap') ||
    findTopInsight(manuals, 'minor_gap') ||
    findTopInsight(manuals, 'aligned') ||
    null
  );
}

function pickPractice(
  activeItems: GrowthItem[],
  lead: LeadItem,
  dismissed: Set<string>,
): GrowthItem | null {
  const items = activeItems.filter((i) => !dismissed.has(i.growthItemId));
  if (items.length === 0) return null;

  // If the lead is already a practice, pick a different one
  if (lead.type === 'practice') {
    const different = items.find(
      (i) => `/growth/${i.growthItemId}` !== lead.ctaHref,
    );
    return different || null;
  }

  return items[0];
}

function buildFamilyPills(input: SurfacePriorityInput): FamilyPill[] {
  const { people, manuals, contributions, userId } = input;
  const activePeople = people.filter((p) => !p.archived && p.relationshipType !== 'self');
  const manualMap = new Map(manuals.map((m) => [m.personId, m]));
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  return activePeople.map((person) => {
    const manual = manualMap.get(person.personId);
    const freshness = manual ? computeFreshness(manual) : 'stale' as const;

    // Check for recent contributions from others
    const hasNewContribution = contributions.some(
      (c) =>
        c.personId === person.personId &&
        c.contributorId !== userId &&
        c.status === 'complete' &&
        (c.updatedAt?.toDate?.()?.getTime() || 0) > sevenDaysAgo,
    );

    return {
      personId: person.personId,
      name: person.name,
      relationshipType: person.relationshipType || 'other',
      freshness,
      hasNewContribution,
      manualRoute: manual
        ? `/people/${person.personId}/manual`
        : `/people/${person.personId}/create-manual`,
    };
  });
}
