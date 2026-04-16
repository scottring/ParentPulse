import { Person, PersonManual, Contribution } from '@/types/person-manual';
import { DimensionAssessment } from '@/types/growth-arc';
import { ActionItem } from '@/types/action-items';
import {
  computeFreshness,
  computeContributionCoverage,
  FreshnessStatus,
} from '@/lib/freshness-engine';

/**
 * Generate action items from the current family state.
 * These are derived (not stored) — computed on each render from live data.
 */
export function generateActionItems(params: {
  people: Person[];
  manuals: PersonManual[];
  contributions: Contribution[];
  assessments: DimensionAssessment[];
  userId: string;
}): ActionItem[] {
  const { people, manuals, contributions, assessments, userId } = params;
  const items: ActionItem[] = [];
  const activePeople = people.filter((p) => !p.archived);
  const manualMap = new Map(manuals.map((m) => [m.personId, m]));

  for (const person of activePeople) {
    const manual = manualMap.get(person.personId);

    // --- Missing data ---
    if (!manual) {
      items.push({
        id: `missing-manual-${person.personId}`,
        type: 'missing_data',
        priority: 'high',
        title: `Create manual for ${person.name}`,
        description: `${person.name} doesn't have a manual yet. Start by adding your perspective.`,
        targetPersonId: person.personId,
        targetPersonName: person.name,
        actionRoute: `/people/${person.personId}/create-manual`,
        source: 'system',
      });
      continue;
    }

    const coverage = computeContributionCoverage(manual, contributions, person);

    if (!coverage.hasSelfPerspective && person.canSelfContribute) {
      items.push({
        id: `missing-self-${person.personId}`,
        type: 'missing_data',
        priority: 'high',
        title: `Add self-perspective for ${person.name}`,
        description: `${person.name} hasn't contributed their own perspective yet.`,
        targetPersonId: person.personId,
        targetPersonName: person.name,
        actionRoute: `/people/${person.personId}/manual/self-onboard`,
        source: 'system',
      });
    }

    if (coverage.observerCount === 0 && person.relationshipType !== 'self') {
      items.push({
        id: `missing-observer-${person.personId}`,
        type: 'missing_data',
        priority: 'medium',
        title: `Add observer perspective for ${person.name}`,
        description: `No one has contributed an outside perspective on ${person.name} yet.`,
        targetPersonId: person.personId,
        targetPersonName: person.name,
        actionRoute: `/people/${person.personId}/manual/onboard`,
        source: 'system',
      });
    }

    // --- Stale data ---
    const freshness: FreshnessStatus = computeFreshness(manual);
    if (freshness === 'stale') {
      items.push({
        id: `stale-manual-${person.personId}`,
        type: 'stale_data',
        priority: 'medium',
        title: `Update ${person.name}'s manual`,
        description: `${person.name}'s manual hasn't been updated in over 3 months.`,
        targetPersonId: person.personId,
        targetPersonName: person.name,
        actionRoute: `/people/${person.personId}/manual`,
        source: 'system',
      });
    }

    // --- Synthesis alerts ---
    const significantGaps = manual.synthesizedContent?.gaps?.filter(
      (g) => g.gapSeverity === 'significant_gap',
    );
    if (significantGaps && significantGaps.length > 0) {
      items.push({
        id: `synthesis-gap-${person.personId}`,
        type: 'synthesis_alert',
        priority: 'medium',
        title: `Significant gaps found for ${person.name}`,
        description: `AI synthesis found ${significantGaps.length} area${significantGaps.length > 1 ? 's' : ''} where perspectives significantly diverge.`,
        targetPersonId: person.personId,
        targetPersonName: person.name,
        actionRoute: `/people/${person.personId}/manual`,
        source: 'synthesis',
      });
    }
  }

  // --- Check-in due ---
  const staleAssessments = assessments.filter((a) => {
    if (!a.lastAssessedAt) return true;
    const daysSince = (Date.now() - a.lastAssessedAt.toMillis()) / (24 * 60 * 60 * 1000);
    return daysSince > 14;
  });

  if (staleAssessments.length > 0) {
    const isUrgent = staleAssessments.some((a) => {
      if (!a.lastAssessedAt) return true;
      const daysSince = (Date.now() - a.lastAssessedAt.toMillis()) / (24 * 60 * 60 * 1000);
      return daysSince > 30;
    });

    items.push({
      id: 'check-in-due',
      type: 'check_in_due',
      priority: isUrgent ? 'high' : 'medium',
      title: 'Weekly check-in due',
      description: `${staleAssessments.length} dimension${staleAssessments.length > 1 ? 's' : ''} haven't been assessed recently.`,
      actionRoute: '/journal',
      source: 'schedule',
    });
  }

  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}
