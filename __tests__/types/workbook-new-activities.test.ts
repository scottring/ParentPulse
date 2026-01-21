/**
 * Test-Driven Development: Activity Type Tests
 *
 * Phase 1A Day 1: RED Phase - These tests will FAIL until types are implemented
 *
 * Tests for 20 new activity types:
 * - Category 1: Emotional Regulation & Coping (5)
 * - Category 2: Executive Function & Routines (4)
 * - Category 3: Relationship & Social Skills (4)
 * - Category 4: Self-Awareness & Identity (4)
 * - Category 5: Growth Mindset & Resilience (3)
 */

import { describe, test, expect } from 'vitest';
import type {
  ActivityType,
  // Category 1: Emotional Regulation & Coping
  WorryBoxResponse,
  EmotionWheelResponse,
  CalmDownToolboxResponse,
  BodySignalsResponse,
  SafePersonMapResponse,
  // Category 2: Executive Function & Routines
  TimeCaptainResponse,
  PriorityPickerResponse,
  EnergyTrackerResponse,
  TransitionTimerResponse,
  // Category 3: Relationship & Social Skills
  FriendshipBuilderResponse,
  ConflictDetectiveResponse,
  KindnessCatcherResponse,
  ShareOrBoundariesResponse,
  // Category 4: Self-Awareness & Identity
  ValueCompassResponse,
  InnerVoiceCheckResponse,
  CompareAndCareResponse,
  MoodJournalResponse,
  // Category 5: Growth Mindset & Resilience
  MistakeMagicResponse,
  HardThingHeroResponse,
  YetPowerResponse
} from '@/types/workbook';
import { ACTIVITY_TEMPLATES } from '@/types/workbook';

// =============================================================================
// CATEGORY 1: EMOTIONAL REGULATION & COPING (5 activities)
// =============================================================================

describe('WorryBoxResponse', () => {
  test('validates worry-box response with controllable worries', () => {
    const response: WorryBoxResponse = {
      worries: [
        { description: 'Test worry', controllable: true },
        { description: 'Another worry', controllable: false }
      ],
      biggestWorry: 'Test worry',
      copingStrategyChosen: 'Talk to parent'
    };

    expect(response.worries).toHaveLength(2);
    expect(response.worries[0].controllable).toBe(true);
    expect(response.biggestWorry).toBeDefined();
  });

  test('allows optional fields in worry-box response', () => {
    const minimalResponse: WorryBoxResponse = {
      worries: [{ description: 'Single worry', controllable: true }]
    };

    expect(minimalResponse.worries).toHaveLength(1);
    expect(minimalResponse.biggestWorry).toBeUndefined();
  });

  test('worry-box activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['worry-box'];

    expect(template).toBeDefined();
    expect(template.type).toBe('worry-box');
    expect(template.emoji).toBe('🎁');
    expect(template.ageAppropriate.minAge).toBe(5);
    expect(template.ageAppropriate.maxAge).toBe(13);
  });
});

describe('EmotionWheelResponse', () => {
  test('validates emotion-wheel with primary and secondary emotions', () => {
    const response: EmotionWheelResponse = {
      primaryEmotion: 'angry',
      secondaryEmotion: 'disappointed',
      intensity: 4,
      trigger: 'homework'
    };

    expect(response.primaryEmotion).toBe('angry');
    expect(response.secondaryEmotion).toBe('disappointed');
    expect(response.intensity).toBeGreaterThanOrEqual(1);
    expect(response.intensity).toBeLessThanOrEqual(5);
  });

  test('allows emotion-wheel without secondary emotion', () => {
    const response: EmotionWheelResponse = {
      primaryEmotion: 'happy',
      intensity: 5
    };

    expect(response.primaryEmotion).toBe('happy');
    expect(response.secondaryEmotion).toBeUndefined();
  });

  test('emotion-wheel activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['emotion-wheel'];

    expect(template).toBeDefined();
    expect(template.type).toBe('emotion-wheel');
    expect(template.emoji).toBe('🎨');
    expect(template.ageAppropriate.minAge).toBe(6);
  });
});

describe('CalmDownToolboxResponse', () => {
  test('validates calm-down-toolbox with rated tools', () => {
    const response: CalmDownToolboxResponse = {
      selectedTools: [
        { tool: 'deep breathing', effectiveness: 5 },
        { tool: 'counting to 10', effectiveness: 4 },
        { tool: 'squeeze stress ball', effectiveness: 3 }
      ],
      favoriteTools: ['deep breathing'],
      situationContext: 'When angry about homework'
    };

    expect(response.selectedTools).toHaveLength(3);
    expect(response.selectedTools[0].effectiveness).toBe(5);
    expect(response.favoriteTools).toContain('deep breathing');
  });

  test('calm-down-toolbox activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['calm-down-toolbox'];

    expect(template).toBeDefined();
    expect(template.type).toBe('calm-down-toolbox');
    expect(template.emoji).toBe('🧰');
    expect(template.ageAppropriate.minAge).toBe(4);
  });
});

describe('BodySignalsResponse', () => {
  test('validates body-signals with physical sensations', () => {
    const response: BodySignalsResponse = {
      bodySignals: [
        { location: 'chest', sensation: 'tight', linkedEmotion: 'anxious' },
        { location: 'stomach', sensation: 'butterflies', linkedEmotion: 'nervous' }
      ],
      awareness: 'high'
    };

    expect(response.bodySignals).toHaveLength(2);
    expect(response.bodySignals[0].linkedEmotion).toBe('anxious');
    expect(response.awareness).toBe('high');
  });

  test('body-signals activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['body-signals'];

    expect(template).toBeDefined();
    expect(template.type).toBe('body-signals');
    expect(template.emoji).toBe('👂');
  });
});

describe('SafePersonMapResponse', () => {
  test('validates safe-person-map with multiple safe people', () => {
    const response: SafePersonMapResponse = {
      safePeople: [
        { name: 'Mom', relationship: 'parent', goodFor: ['homework help', 'emotional support'] },
        { name: 'Best friend', relationship: 'friend', goodFor: ['playing', 'talking'] }
      ],
      preferredPerson: 'Mom'
    };

    expect(response.safePeople).toHaveLength(2);
    expect(response.safePeople[0].goodFor).toContain('homework help');
    expect(response.preferredPerson).toBe('Mom');
  });

  test('safe-person-map activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['safe-person-map'];

    expect(template).toBeDefined();
    expect(template.type).toBe('safe-person-map');
    expect(template.emoji).toBe('🗺️');
  });
});

// =============================================================================
// CATEGORY 2: EXECUTIVE FUNCTION & ROUTINES (4 activities)
// =============================================================================

describe('TimeCaptainResponse', () => {
  test('validates time-captain with time estimation tracking', () => {
    const response: TimeCaptainResponse = {
      tasks: [
        { task: 'Brush teeth', estimatedMinutes: 2, actualMinutes: 5 },
        { task: 'Homework', estimatedMinutes: 30, actualMinutes: 45 }
      ],
      timeAccuracy: 'underestimated'
    };

    expect(response.tasks).toHaveLength(2);
    expect(response.tasks[0].actualMinutes).toBeGreaterThan(response.tasks[0].estimatedMinutes);
    expect(response.timeAccuracy).toBe('underestimated');
  });

  test('time-captain activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['time-captain'];

    expect(template).toBeDefined();
    expect(template.type).toBe('time-captain');
    expect(template.emoji).toBe('⏰');
  });
});

describe('PriorityPickerResponse', () => {
  test('validates priority-picker with importance and urgency matrix', () => {
    const response: PriorityPickerResponse = {
      tasks: [
        { task: 'Finish homework', importance: 'high', urgency: 'high' },
        { task: 'Clean room', importance: 'low', urgency: 'low' }
      ],
      chosenPriority: 'Finish homework',
      confidence: 4
    };

    expect(response.tasks).toHaveLength(2);
    expect(response.tasks[0].importance).toBe('high');
    expect(response.confidence).toBeGreaterThanOrEqual(1);
  });

  test('priority-picker activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['priority-picker'];

    expect(template).toBeDefined();
    expect(template.type).toBe('priority-picker');
    expect(template.emoji).toBe('🎯');
  });
});

describe('EnergyTrackerResponse', () => {
  test('validates energy-tracker with time and energy levels', () => {
    const response: EnergyTrackerResponse = {
      timeOfDay: 'morning',
      energyLevel: 4,
      mood: 'energetic',
      rechargeActivity: 'breakfast'
    };

    expect(response.timeOfDay).toBe('morning');
    expect(response.energyLevel).toBeGreaterThanOrEqual(1);
    expect(response.energyLevel).toBeLessThanOrEqual(5);
  });

  test('energy-tracker activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['energy-tracker'];

    expect(template).toBeDefined();
    expect(template.type).toBe('energy-tracker');
    expect(template.emoji).toBe('🔋');
  });
});

describe('TransitionTimerResponse', () => {
  test('validates transition-timer with transition tracking', () => {
    const response: TransitionTimerResponse = {
      fromActivity: 'playing video games',
      toActivity: 'doing homework',
      warningUsed: true,
      transitionSuccess: 'bumpy',
      strategyUsed: '5 minute warning'
    };

    expect(response.fromActivity).toBeDefined();
    expect(response.toActivity).toBeDefined();
    expect(response.warningUsed).toBe(true);
    expect(['smooth', 'bumpy', 'meltdown']).toContain(response.transitionSuccess);
  });

  test('transition-timer activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['transition-timer'];

    expect(template).toBeDefined();
    expect(template.type).toBe('transition-timer');
    expect(template.emoji).toBe('⏱️');
  });
});

// =============================================================================
// CATEGORY 3: RELATIONSHIP & SOCIAL SKILLS (4 activities)
// =============================================================================

describe('FriendshipBuilderResponse', () => {
  test('validates friendship-builder with qualities and strengths', () => {
    const response: FriendshipBuilderResponse = {
      friendshipQualities: ['kind', 'funny', 'helpful'],
      myStrengths: ['good listener', 'loyal'],
      wantToImprove: ['sharing'],
      recentFriendlyAction: 'Helped friend with homework'
    };

    expect(response.friendshipQualities).toHaveLength(3);
    expect(response.myStrengths).toContain('good listener');
  });

  test('friendship-builder activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['friendship-builder'];

    expect(template).toBeDefined();
    expect(template.type).toBe('friendship-builder');
    expect(template.emoji).toBe('🤝');
  });
});

describe('ConflictDetectiveResponse', () => {
  test('validates conflict-detective with perspective-taking', () => {
    const response: ConflictDetectiveResponse = {
      situation: 'Argument about whose turn it was',
      myPerspective: 'I thought it was my turn',
      theirPerspective: 'They thought it was their turn',
      myFeelings: ['frustrated', 'confused'],
      resolution: 'We decided to take turns',
      lessonLearned: 'Ask before assuming'
    };

    expect(response.myPerspective).toBeDefined();
    expect(response.myFeelings).toContain('frustrated');
    expect(response.resolution).toBeDefined();
  });

  test('conflict-detective activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['conflict-detective'];

    expect(template).toBeDefined();
    expect(template.type).toBe('conflict-detective');
    expect(template.emoji).toBe('🔍');
  });
});

describe('KindnessCatcherResponse', () => {
  test('validates kindness-catcher with different kindness types', () => {
    const response: KindnessCatcherResponse = {
      kindnessType: 'gave',
      description: 'Helped carry groceries',
      feeling: 'happy',
      whoWasInvolved: ['me', 'neighbor']
    };

    expect(['gave', 'received', 'observed']).toContain(response.kindnessType);
    expect(response.whoWasInvolved).toHaveLength(2);
  });

  test('kindness-catcher activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['kindness-catcher'];

    expect(template).toBeDefined();
    expect(template.type).toBe('kindness-catcher');
    expect(template.emoji).toBe('💝');
  });
});

describe('ShareOrBoundariesResponse', () => {
  test('validates share-or-boundaries with decision-making', () => {
    const response: ShareOrBoundariesResponse = {
      scenarios: [
        { situation: 'Friend asks to borrow toy', response: 'yes', reasoning: 'I trust them' },
        { situation: 'Someone wants my snack', response: 'no', reasoning: "I'm hungry" }
      ],
      confidenceLevel: 4
    };

    expect(response.scenarios).toHaveLength(2);
    expect(['yes', 'no', 'maybe']).toContain(response.scenarios[0].response);
    expect(response.confidenceLevel).toBeGreaterThanOrEqual(1);
  });

  test('share-or-boundaries activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['share-or-boundaries'];

    expect(template).toBeDefined();
    expect(template.type).toBe('share-or-boundaries');
    expect(template.emoji).toBe('🛡️');
  });
});

// =============================================================================
// CATEGORY 4: SELF-AWARENESS & IDENTITY (4 activities)
// =============================================================================

describe('ValueCompassResponse', () => {
  test('validates value-compass with ranked values', () => {
    const response: ValueCompassResponse = {
      topValues: ['kindness', 'honesty', 'creativity'],
      exampleActions: [
        { value: 'kindness', action: 'Helped a friend' },
        { value: 'honesty', action: 'Told the truth even when hard' }
      ],
      valuesAlignment: 'strong'
    };

    expect(response.topValues).toHaveLength(3);
    expect(response.exampleActions[0].value).toBe('kindness');
    expect(['strong', 'developing', 'exploring']).toContain(response.valuesAlignment);
  });

  test('value-compass activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['value-compass'];

    expect(template).toBeDefined();
    expect(template.type).toBe('value-compass');
    expect(template.emoji).toBe('🧭');
  });
});

describe('InnerVoiceCheckResponse', () => {
  test('validates inner-voice-check with self-talk examples', () => {
    const response: InnerVoiceCheckResponse = {
      selfTalkExamples: [
        { situation: 'Failed test', innerVoice: "I'm so stupid", helpful: false },
        { situation: 'Won game', innerVoice: 'I did great!', helpful: true }
      ],
      reframes: [
        { original: "I'm so stupid", reframed: 'I can learn from this' }
      ],
      tone: 'critical'
    };

    expect(response.selfTalkExamples).toHaveLength(2);
    expect(response.reframes).toBeDefined();
    expect(['supportive', 'critical', 'mixed']).toContain(response.tone);
  });

  test('inner-voice-check activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['inner-voice-check'];

    expect(template).toBeDefined();
    expect(template.type).toBe('inner-voice-check');
    expect(template.emoji).toBe('💭');
  });
});

describe('CompareAndCareResponse', () => {
  test('validates compare-and-care with social comparison handling', () => {
    const response: CompareAndCareResponse = {
      comparisonTrigger: 'Friend got better grade',
      feeling: 'jealous',
      personalGrowthFocus: 'I improved from last time',
      perspective: 'growth-focused'
    };

    expect(response.comparisonTrigger).toBeDefined();
    expect(['comparison-focused', 'growth-focused', 'balanced']).toContain(response.perspective);
  });

  test('compare-and-care activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['compare-and-care'];

    expect(template).toBeDefined();
    expect(template.type).toBe('compare-and-care');
    expect(template.emoji).toBe('🪞');
  });
});

describe('MoodJournalResponse', () => {
  test('validates mood-journal with time-based mood tracking', () => {
    const response: MoodJournalResponse = {
      timeBlocks: [
        { time: 'morning', mood: 'happy', color: 'yellow', event: 'Breakfast with family' },
        { time: 'afternoon', mood: 'frustrated', color: 'red', event: 'Difficult homework' }
      ],
      overallDay: 'okay',
      biggestInfluence: 'Homework stress'
    };

    expect(response.timeBlocks).toHaveLength(2);
    expect(['great', 'good', 'okay', 'hard']).toContain(response.overallDay);
  });

  test('mood-journal activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['mood-journal'];

    expect(template).toBeDefined();
    expect(template.type).toBe('mood-journal');
    expect(template.emoji).toBe('📓');
  });
});

// =============================================================================
// CATEGORY 5: GROWTH MINDSET & RESILIENCE (3 activities)
// =============================================================================

describe('MistakeMagicResponse', () => {
  test('validates mistake-magic with learning from mistakes', () => {
    const response: MistakeMagicResponse = {
      mistake: 'Forgot to study for test',
      initialFeeling: 'disappointed',
      whatLearned: 'Need to plan ahead',
      nextTime: 'Use calendar reminders',
      growthMindset: 'emerging'
    };

    expect(response.mistake).toBeDefined();
    expect(['strong', 'emerging', 'fixed']).toContain(response.growthMindset);
  });

  test('mistake-magic activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['mistake-magic'];

    expect(template).toBeDefined();
    expect(template.type).toBe('mistake-magic');
    expect(template.emoji).toBe('✨');
  });
});

describe('HardThingHeroResponse', () => {
  test('validates hard-thing-hero with challenge attempts', () => {
    const response: HardThingHeroResponse = {
      hardThing: 'Tried out for soccer team',
      attempted: true,
      outcome: 'need-more-practice',
      feeling: 'proud',
      superpowerUsed: 'Courage'
    };

    expect(response.attempted).toBe(true);
    expect(['succeeded', 'learned', 'need-more-practice']).toContain(response.outcome);
  });

  test('hard-thing-hero activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['hard-thing-hero'];

    expect(template).toBeDefined();
    expect(template.type).toBe('hard-thing-hero');
    expect(template.emoji).toBe('🦸');
  });
});

describe('YetPowerResponse', () => {
  test('validates yet-power with growth mindset language', () => {
    const response: YetPowerResponse = {
      cantStatements: ["I can't do math", "I can't make friends"],
      yetStatements: ["I can't do math YET", "I can't make friends YET"],
      beliefInGrowth: 4,
      nextStep: 'Practice math daily'
    };

    expect(response.cantStatements).toHaveLength(2);
    expect(response.yetStatements).toHaveLength(2);
    expect(response.beliefInGrowth).toBeGreaterThanOrEqual(1);
    expect(response.beliefInGrowth).toBeLessThanOrEqual(5);
  });

  test('yet-power activity exists in ACTIVITY_TEMPLATES', () => {
    const template = ACTIVITY_TEMPLATES['yet-power'];

    expect(template).toBeDefined();
    expect(template.type).toBe('yet-power');
    expect(template.emoji).toBe('🌱');
  });
});

// =============================================================================
// ACTIVITY TYPE UNION TESTS
// =============================================================================

describe('ActivityType union', () => {
  test('includes all 20 new activity types', () => {
    const newActivityTypes: ActivityType[] = [
      // Category 1
      'worry-box', 'emotion-wheel', 'calm-down-toolbox', 'body-signals', 'safe-person-map',
      // Category 2
      'time-captain', 'priority-picker', 'energy-tracker', 'transition-timer',
      // Category 3
      'friendship-builder', 'conflict-detective', 'kindness-catcher', 'share-or-boundaries',
      // Category 4
      'value-compass', 'inner-voice-check', 'compare-and-care', 'mood-journal',
      // Category 5
      'mistake-magic', 'hard-thing-hero', 'yet-power'
    ];

    // This will compile if all types exist in the union
    newActivityTypes.forEach(type => {
      expect(typeof type).toBe('string');
    });
  });
});

// =============================================================================
// ACTIVITY TEMPLATES COMPREHENSIVE TESTS
// =============================================================================

describe('ACTIVITY_TEMPLATES', () => {
  const newActivityTypes = [
    'worry-box', 'emotion-wheel', 'calm-down-toolbox', 'body-signals', 'safe-person-map',
    'time-captain', 'priority-picker', 'energy-tracker', 'transition-timer',
    'friendship-builder', 'conflict-detective', 'kindness-catcher', 'share-or-boundaries',
    'value-compass', 'inner-voice-check', 'compare-and-care', 'mood-journal',
    'mistake-magic', 'hard-thing-hero', 'yet-power'
  ];

  test('all 20 new activities have templates', () => {
    newActivityTypes.forEach(activityType => {
      expect(ACTIVITY_TEMPLATES[activityType]).toBeDefined();
    });
  });

  test('all templates have required fields', () => {
    newActivityTypes.forEach(activityType => {
      const template = ACTIVITY_TEMPLATES[activityType];

      expect(template.type).toBe(activityType);
      expect(template.title).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.emoji).toBeDefined();
      expect(template.parentInstructions).toBeDefined();
      expect(template.estimatedMinutes).toBeGreaterThan(0);
      expect(template.estimatedMinutes).toBeLessThanOrEqual(10);
      expect(template.ageAppropriate).toBeDefined();
      expect(template.ageAppropriate.minAge).toBeGreaterThanOrEqual(3);
    });
  });

  test('age ranges are logical', () => {
    newActivityTypes.forEach(activityType => {
      const template = ACTIVITY_TEMPLATES[activityType];

      if (template.ageAppropriate.maxAge) {
        expect(template.ageAppropriate.maxAge).toBeGreaterThan(template.ageAppropriate.minAge);
      }
    });
  });

  test('emojis are unique (no duplicates)', () => {
    const emojis = newActivityTypes.map(type => ACTIVITY_TEMPLATES[type].emoji);
    const uniqueEmojis = new Set(emojis);

    expect(uniqueEmojis.size).toBe(emojis.length);
  });
});
