import type { Manual, CoherenceLayers } from '@/types/manual';
import { emptyLayers } from '@/types/manual';

export function createMockManual(overrides: Partial<Manual> = {}): Manual {
  return {
    manualId: 'test-manual-id',
    familyId: 'test-family-id',
    type: 'household',
    title: 'Our Family Manual',
    layers: createMockLayers(),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createEmptyManual(overrides: Partial<Manual> = {}): Manual {
  return {
    manualId: 'empty-manual-id',
    familyId: 'test-family-id',
    type: 'household',
    title: 'Empty Manual',
    layers: emptyLayers,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockLayers(): CoherenceLayers {
  return {
    mind: {
      values: [
        { id: 'v1', name: 'Curiosity', description: 'We love learning new things', rank: 1 },
        { id: 'v2', name: 'Kindness', description: 'We treat everyone with respect', rank: 2 },
      ],
      identityStatements: ["We're the family that always has a project going"],
      nonNegotiables: ['Family dinner on Sundays'],
      narratives: ['We moved across the country and built something together'],
    },
    context: {
      decisionDomains: [
        {
          id: 'd1',
          name: 'Education',
          decisionRights: [
            { personId: 'p1', personName: 'Mom', role: 'owner' },
            { personId: 'p2', personName: 'Dad', role: 'voice' },
          ],
        },
      ],
      boundaries: [
        { id: 'b1', statement: 'No screens during meals', category: 'immovable' },
        { id: 'b2', statement: 'Bedtime by 8:30 on school nights', category: 'negotiable' },
      ],
      resourcePrinciples: ['We choose experiences over things'],
    },
    execution: {
      rhythms: [
        { id: 'r1', name: 'Morning routine', frequency: 'daily', description: 'Wake, eat, prep for school', isActive: true },
        { id: 'r2', name: 'Family meeting', frequency: 'weekly', description: 'Sunday check-in', isActive: true },
      ],
      rituals: [
        { id: 'ri1', name: 'Pizza Friday', description: 'Make pizza together', frequency: 'weekly', meaningSource: 'Quality time and creativity' },
      ],
      commitments: [
        { id: 'c1', name: 'Soccer practice', owner: 'family', description: 'Tues/Thurs 4-5pm' },
      ],
      painPoints: ['Morning rush is chaotic'],
    },
    output: {
      coherenceIndicators: ['Everyone is laughing at dinner', 'Kids ask to do things together'],
      driftSignals: ['More screen time than usual', 'Skipping family meetings'],
      storyArchive: [
        { id: 's1', title: 'The Camping Trip', content: 'Last summer we tried camping...', date: new Date(), tags: ['adventure'] },
      ],
    },
  };
}
