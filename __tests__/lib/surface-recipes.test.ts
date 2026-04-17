import { describe, it, expect } from 'vitest';
import { getRecipeForStage, resolveRecipe } from '@/lib/surface-recipes';
import type { SurfaceData } from '@/types/surface-recipe';
import { Timestamp } from 'firebase/firestore';

// ==================== Minimal empty SurfaceData ====================

const emptySurfaceData: SurfaceData = {
  stage: 'new_user',
  people: [],
  manuals: [],
  contributions: [],
  selfPerson: null,
  spouse: null,
  peopleNeedingContributions: [],
  hasSelfContribution: false,
  activeGrowthItems: [],
  arcGroups: [],
  journalEntries: [],
  echo: null,
  ritual: null,
  actionItems: [],
  dinnerPrompt: null,
  hasAssessments: false,
};

function dataWith(overrides: Partial<SurfaceData>): SurfaceData {
  return { ...emptySurfaceData, ...overrides };
}

// ==================== getRecipeForStage ====================

describe('getRecipeForStage', () => {
  it('returns correct recipe for new_user', () => {
    const recipe = getRecipeForStage('new_user');
    expect(recipe.heroCandidates).toEqual(['stage-cta-self']);
    expect(recipe.gridCandidates).toEqual([]);
    expect(recipe.maxGridTiles).toBe(0);
  });

  it('returns correct recipe for self_complete', () => {
    const recipe = getRecipeForStage('self_complete');
    expect(recipe.heroCandidates).toEqual(['stage-cta-add-person']);
    expect(recipe.gridCandidates).toEqual(['reflection-prompt']);
    expect(recipe.maxGridTiles).toBe(1);
  });

  it('returns correct recipe for has_people', () => {
    const recipe = getRecipeForStage('has_people');
    expect(recipe.heroCandidates).toEqual(['stage-cta-contribute']);
    expect(recipe.gridCandidates).toEqual(['contribution-needed', 'invite-spouse']);
    expect(recipe.maxGridTiles).toBe(2);
  });

  it('returns correct recipe for has_contributions', () => {
    const recipe = getRecipeForStage('has_contributions');
    expect(recipe.heroCandidates).toEqual(['fresh-synthesis', 'stage-cta-contribute']);
    expect(recipe.gridCandidates).toEqual(['ritual-setup', 'perspective-gap']);
    expect(recipe.maxGridTiles).toBe(2);
  });

  it('returns correct recipe for active', () => {
    const recipe = getRecipeForStage('active');
    expect(recipe.heroCandidates).toEqual([
      'fresh-synthesis',
      'person-spotlight',
      'journal-echo',
      'next-action',
      'calm',
    ]);
    expect(recipe.gridCandidates).toEqual([
      'ritual-info',
      'micro-activity',
      'pattern-detected',
      'blind-spot',
      'growth-arc',
      'recent-journal',
      'family-freshness',
    ]);
    expect(recipe.maxGridTiles).toBe(6);
  });

  it('treats loading stage same as new_user (falls through to calm default)', () => {
    const recipe = getRecipeForStage('loading');
    // loading maps to new_user recipe
    expect(recipe.heroCandidates).toEqual(['stage-cta-self']);
    expect(recipe.maxGridTiles).toBe(0);
  });
});

// ==================== resolveRecipe ====================

describe('resolveRecipe', () => {
  // 1. new_user resolves to stage-cta-self hero + empty grid
  it('resolves new_user with no self-contribution to stage-cta-self hero', () => {
    const result = resolveRecipe(dataWith({ stage: 'new_user', hasSelfContribution: false }));
    expect(result.hero).toBe('stage-cta-self');
    expect(result.gridTiles).toEqual([]);
  });

  // 2. ritual-info shows when ritual data exists
  it('includes ritual-info in grid when ritual is active', () => {
    const activeRitual = {
      id: 'r1',
      familyId: 'f1',
      participantUserIds: ['u1', 'u2'] as [string, string],
      cadence: 'weekly' as const,
      dayOfWeek: 0 as const,
      startTimeLocal: '20:00',
      durationMinutes: 15,
      timezone: 'America/New_York',
      status: 'active' as const,
      startsOn: Timestamp.now(),
      createdAt: Timestamp.now(),
      createdByUserId: 'u1',
      updatedAt: Timestamp.now(),
      updatedByUserId: 'u1',
    };

    const result = resolveRecipe(
      dataWith({
        stage: 'active',
        ritual: activeRitual,
        hasSelfContribution: true,
        // no synthesis, echo, action items so hero falls through to calm
      })
    );
    expect(result.gridTiles).toContain('ritual-info');
  });

  // 3. falls through to calm when no hero-eligible data in active state
  it('falls through to calm when no hero data matches in active stage', () => {
    const result = resolveRecipe(
      dataWith({
        stage: 'active',
        hasSelfContribution: true,
        manuals: [],
        echo: null,
        actionItems: [],
        ritual: null,
        arcGroups: [],
        journalEntries: [],
      })
    );
    expect(result.hero).toBe('calm');
  });

  // 4. caps grid at maxGridTiles
  it('caps grid tiles at maxGridTiles for active stage', () => {
    const activeRitual = {
      id: 'r1',
      familyId: 'f1',
      participantUserIds: ['u1', 'u2'] as [string, string],
      cadence: 'weekly' as const,
      dayOfWeek: 0 as const,
      startTimeLocal: '20:00',
      durationMinutes: 15,
      timezone: 'America/New_York',
      status: 'active' as const,
      startsOn: Timestamp.now(),
      createdAt: Timestamp.now(),
      createdByUserId: 'u1',
      updatedAt: Timestamp.now(),
      updatedByUserId: 'u1',
    };

    const microActivity = {
      growthItemId: 'gi1',
      familyId: 'f1',
      type: 'micro_activity' as const,
      title: 'Test',
      body: 'Body',
      emoji: '✦',
      targetPersonIds: [],
      targetPersonNames: [],
      assignedToUserId: 'u1',
      assignedToUserName: 'Scott',
      speed: 'ambient' as const,
      scheduledDate: Timestamp.now(),
      expiresAt: Timestamp.now(),
      estimatedMinutes: 2,
      status: 'active' as const,
      createdAt: Timestamp.now(),
      generatedBy: 'ai' as const,
    };

    const journalEntryWithThemes = {
      entryId: 'e1',
      familyId: 'f1',
      authorId: 'u1',
      text: 'Test entry',
      category: 'moment' as const,
      tags: [],
      visibleToUserIds: ['u1'],
      sharedWithUserIds: [],
      personMentions: [],
      createdAt: Timestamp.now(),
      enrichment: {
        summary: 'summary',
        aiPeople: [],
        aiDimensions: [],
        themes: ['connection', 'growth'],
        enrichedAt: Timestamp.now(),
        model: 'claude-sonnet-4-6',
      },
    };

    const manualWithBlindSpots = {
      manualId: 'm1',
      familyId: 'f1',
      personId: 'p1',
      personName: 'Test',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: 1,
      lastEditedAt: Timestamp.now(),
      lastEditedBy: 'u1',
      coreInfo: {},
      triggers: [],
      whatWorks: [],
      whatDoesntWork: [],
      boundaries: [],
      emergingPatterns: [],
      progressNotes: [],
      totalTriggers: 0,
      totalStrategies: 0,
      totalBoundaries: 0,
      contributionIds: [],
      perspectives: { observers: [] },
      synthesizedContent: {
        overview: 'overview',
        alignments: [],
        gaps: [],
        blindSpots: [{ id: 'bs1', topic: 'A blindspot', synthesis: 'detail' }],
        lastSynthesizedAt: Timestamp.now(),
      },
    };

    const arcGroupActive = {
      arc: {
        arcId: 'a1',
        familyId: 'f1',
        title: 'Arc',
        description: 'desc',
        dimensionId: 'emotional_availability' as any,
        targetPersonIds: [],
        targetPersonNames: [],
        assignedToUserId: 'u1',
        phases: [],
        currentPhase: 1,
        totalPhases: 3,
        status: 'active' as const,
        startedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        generatedBy: 'ai' as const,
      },
      activeItems: [],
      completedItems: [],
      progress: 0,
    };

    const result = resolveRecipe(
      dataWith({
        stage: 'active',
        ritual: activeRitual,
        activeGrowthItems: [microActivity],
        journalEntries: [journalEntryWithThemes],
        manuals: [manualWithBlindSpots],
        arcGroups: [arcGroupActive],
        people: ['p1', 'p2'] as any, // 2 people → family-freshness eligible
        // no synthesis lastSynthesizedAt so fresh-synthesis won't fire
        // no echo, no actionItems so hero falls to calm
      })
    );

    expect(result.gridTiles.length).toBeLessThanOrEqual(6);
  });

  // 5. loading stage treated as new_user (stage-cta-self, hasSelfContribution false)
  it('handles loading stage without throwing', () => {
    const result = resolveRecipe(dataWith({ stage: 'loading', hasSelfContribution: false }));
    // Loading uses new_user recipe — stage-cta-self is eligible when no self-contribution
    expect(result.hero).toBe('stage-cta-self');
    expect(result.gridTiles).toEqual([]);
  });

  // 6. fresh-synthesis hero fires when a manual has lastSynthesizedAt
  it('resolves fresh-synthesis hero when a manual has synthesized content', () => {
    const manualWithSynthesis = {
      manualId: 'm1',
      familyId: 'f1',
      personId: 'p1',
      personName: 'Test',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      version: 1,
      lastEditedAt: Timestamp.now(),
      lastEditedBy: 'u1',
      coreInfo: {},
      triggers: [],
      whatWorks: [],
      whatDoesntWork: [],
      boundaries: [],
      emergingPatterns: [],
      progressNotes: [],
      totalTriggers: 0,
      totalStrategies: 0,
      totalBoundaries: 0,
      contributionIds: [],
      perspectives: { observers: [] },
      synthesizedContent: {
        overview: 'An overview',
        alignments: [],
        gaps: [],
        blindSpots: [],
        lastSynthesizedAt: Timestamp.now(),
      },
    };

    const result = resolveRecipe(
      dataWith({
        stage: 'has_contributions',
        manuals: [manualWithSynthesis],
      })
    );
    expect(result.hero).toBe('fresh-synthesis');
  });

  // 7. stage-cta-contribute hero fires when people need contributions
  it('resolves stage-cta-contribute when peopleNeedingContributions is non-empty', () => {
    const personStub = {
      personId: 'p1',
      familyId: 'f1',
      name: 'Iris',
      hasManual: true,
      canSelfContribute: true,
      addedAt: Timestamp.now(),
      addedByUserId: 'u1',
    };

    const result = resolveRecipe(
      dataWith({
        stage: 'has_people',
        peopleNeedingContributions: [personStub],
      })
    );
    expect(result.hero).toBe('stage-cta-contribute');
    expect(result.gridTiles).toContain('contribution-needed');
  });

  // 8. invite-spouse appears in grid when spouse has no linkedUserId
  it('includes invite-spouse in grid when spouse has no linkedUserId', () => {
    const spouseWithoutLink = {
      personId: 'p2',
      familyId: 'f1',
      name: 'Iris',
      hasManual: false,
      canSelfContribute: false,
      linkedUserId: null,
      addedAt: Timestamp.now(),
      addedByUserId: 'u1',
    };

    const result = resolveRecipe(
      dataWith({
        stage: 'has_people',
        spouse: spouseWithoutLink,
        peopleNeedingContributions: [spouseWithoutLink], // need at least one for hero
      })
    );
    expect(result.gridTiles).toContain('invite-spouse');
  });
});
