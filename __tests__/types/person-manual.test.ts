/**
 * Tests for simplified PersonManual types (Phase 1)
 */

import { Timestamp } from 'firebase/firestore';
import type {
  PersonManual,
  ManualTrigger,
  ManualStrategy,
  ManualBoundary,
  ManualPattern,
  ManualProgressNote,
} from '@/types/person-manual';

describe('PersonManual Types', () => {
  const mockTimestamp = Timestamp.now();
  const mockUserId = 'user-123';
  const mockFamilyId = 'family-123';
  const mockPersonId = 'person-123';

  describe('PersonManual Structure', () => {
    it('should create a valid PersonManual with all required fields', () => {
      const manual: PersonManual = {
        manualId: 'manual-123',
        familyId: mockFamilyId,
        personId: mockPersonId,
        personName: 'Ella',
        relationshipType: 'child',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        version: 1,
        lastEditedAt: mockTimestamp,
        lastEditedBy: mockUserId,
        coreInfo: {
          sensoryNeeds: ['Quiet environment', 'Soft fabrics'],
          interests: ['Reading', 'Drawing'],
          strengths: ['Creative', 'Empathetic'],
          notes: 'Prefers routine and predictability',
        },
        triggers: [],
        whatWorks: [],
        whatDoesntWork: [],
        boundaries: [],
        emergingPatterns: [],
        progressNotes: [],
        totalTriggers: 0,
        totalStrategies: 0,
        totalBoundaries: 0,
        relatedJournalEntries: [],
        relatedKnowledgeIds: [],
      };

      expect(manual.manualId).toBe('manual-123');
      expect(manual.personName).toBe('Ella');
      expect(manual.coreInfo.sensoryNeeds).toHaveLength(2);
    });

    it('should allow optional coreInfo fields', () => {
      const manual: PersonManual = {
        manualId: 'manual-123',
        familyId: mockFamilyId,
        personId: mockPersonId,
        personName: 'Test Person',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        version: 1,
        lastEditedAt: mockTimestamp,
        lastEditedBy: mockUserId,
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
        relatedJournalEntries: [],
        relatedKnowledgeIds: [],
      };

      expect(manual.coreInfo).toEqual({});
    });
  });

  describe('ManualTrigger', () => {
    it('should create a valid trigger with all required fields', () => {
      const trigger: ManualTrigger = {
        id: 'trigger-1',
        description: 'Loud noises',
        context: 'In crowded places or during transitions',
        typicalResponse: 'Covers ears, becomes withdrawn',
        deescalationStrategy: 'Move to quiet space, gentle touch',
        severity: 'moderate',
        identifiedDate: mockTimestamp,
        identifiedBy: mockUserId,
        confirmedBy: [],
      };

      expect(trigger.severity).toBe('moderate');
      expect(trigger.description).toBe('Loud noises');
    });

    it('should enforce severity type safety', () => {
      const validSeverities: Array<'mild' | 'moderate' | 'significant'> = [
        'mild',
        'moderate',
        'significant',
      ];

      validSeverities.forEach((severity) => {
        const trigger: ManualTrigger = {
          id: 'trigger-1',
          description: 'Test trigger',
          context: 'Test context',
          typicalResponse: 'Test response',
          severity,
          identifiedDate: mockTimestamp,
          identifiedBy: mockUserId,
          confirmedBy: [],
        };

        expect(trigger.severity).toBe(severity);
      });
    });
  });

  describe('ManualStrategy', () => {
    it('should create a valid strategy with effectiveness rating', () => {
      const strategy: ManualStrategy = {
        id: 'strategy-1',
        description: 'Use quiet voice and approach slowly',
        context: 'When she is upset or overwhelmed',
        effectiveness: 5,
        addedDate: mockTimestamp,
        addedBy: mockUserId,
        sourceType: 'discovered',
        notes: 'Works best in the morning',
      };

      expect(strategy.effectiveness).toBe(5);
      expect(strategy.sourceType).toBe('discovered');
    });

    it('should enforce effectiveness rating between 1-5', () => {
      const validRatings: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

      validRatings.forEach((rating) => {
        const strategy: ManualStrategy = {
          id: 'strategy-1',
          description: 'Test strategy',
          context: 'Test context',
          effectiveness: rating,
          addedDate: mockTimestamp,
          addedBy: mockUserId,
          sourceType: 'discovered',
        };

        expect(strategy.effectiveness).toBe(rating);
      });
    });

    it('should support different source types', () => {
      const sourceTypes: Array<'discovered' | 'recommended' | 'professional' | 'knowledge_base'> = [
        'discovered',
        'recommended',
        'professional',
        'knowledge_base',
      ];

      sourceTypes.forEach((sourceType) => {
        const strategy: ManualStrategy = {
          id: 'strategy-1',
          description: 'Test strategy',
          context: 'Test context',
          effectiveness: 3,
          addedDate: mockTimestamp,
          addedBy: mockUserId,
          sourceType,
        };

        expect(strategy.sourceType).toBe(sourceType);
      });
    });
  });

  describe('ManualBoundary', () => {
    it('should create a valid boundary with category', () => {
      const boundary: ManualBoundary = {
        id: 'boundary-1',
        description: 'No screen time after 8 PM',
        category: 'immovable',
        context: 'Essential for good sleep hygiene',
        consequences: 'Difficulty falling asleep, cranky next day',
        addedDate: mockTimestamp,
        addedBy: mockUserId,
      };

      expect(boundary.category).toBe('immovable');
      expect(boundary.consequences).toBeDefined();
    });

    it('should support all boundary categories', () => {
      const categories: Array<'immovable' | 'negotiable' | 'preference'> = [
        'immovable',
        'negotiable',
        'preference',
      ];

      categories.forEach((category) => {
        const boundary: ManualBoundary = {
          id: 'boundary-1',
          description: 'Test boundary',
          category,
          addedDate: mockTimestamp,
          addedBy: mockUserId,
        };

        expect(boundary.category).toBe(category);
      });
    });
  });

  describe('ManualPattern', () => {
    it('should track pattern confidence over time', () => {
      const pattern: ManualPattern = {
        id: 'pattern-1',
        description: 'Gets anxious before school every Monday',
        frequency: 'Weekly, Monday mornings',
        firstObserved: mockTimestamp,
        lastObserved: mockTimestamp,
        confidence: 'consistent',
        relatedEntries: ['entry-1', 'entry-2'],
        identifiedBy: 'user',
      };

      expect(pattern.confidence).toBe('consistent');
      expect(pattern.relatedEntries).toHaveLength(2);
    });

    it('should support all confidence levels', () => {
      const confidenceLevels: Array<'emerging' | 'consistent' | 'validated'> = [
        'emerging',
        'consistent',
        'validated',
      ];

      confidenceLevels.forEach((confidence) => {
        const pattern: ManualPattern = {
          id: 'pattern-1',
          description: 'Test pattern',
          frequency: 'Daily',
          firstObserved: mockTimestamp,
          lastObserved: mockTimestamp,
          confidence,
          relatedEntries: [],
          identifiedBy: 'ai',
        };

        expect(pattern.confidence).toBe(confidence);
      });
    });
  });

  describe('ManualProgressNote', () => {
    it('should create a valid progress note', () => {
      const note: ManualProgressNote = {
        id: 'note-1',
        date: mockTimestamp,
        note: 'Showed significant improvement in managing transitions',
        category: 'improvement',
        addedBy: mockUserId,
      };

      expect(note.category).toBe('improvement');
      expect(note.note).toContain('improvement');
    });

    it('should support all note categories', () => {
      const categories: Array<'improvement' | 'challenge' | 'insight' | 'milestone' | 'concern'> = [
        'improvement',
        'challenge',
        'insight',
        'milestone',
        'concern',
      ];

      categories.forEach((category) => {
        const note: ManualProgressNote = {
          id: 'note-1',
          date: mockTimestamp,
          note: 'Test note',
          category,
          addedBy: mockUserId,
        };

        expect(note.category).toBe(category);
      });
    });
  });

  describe('PersonManual Content Management', () => {
    it('should properly count triggers, strategies, and boundaries', () => {
      const manual: PersonManual = {
        manualId: 'manual-123',
        familyId: mockFamilyId,
        personId: mockPersonId,
        personName: 'Test Person',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        version: 1,
        lastEditedAt: mockTimestamp,
        lastEditedBy: mockUserId,
        coreInfo: {},
        triggers: [
          {
            id: '1',
            description: 'Trigger 1',
            context: '',
            typicalResponse: '',
            severity: 'mild',
            identifiedDate: mockTimestamp,
            identifiedBy: mockUserId,
            confirmedBy: [],
          },
          {
            id: '2',
            description: 'Trigger 2',
            context: '',
            typicalResponse: '',
            severity: 'moderate',
            identifiedDate: mockTimestamp,
            identifiedBy: mockUserId,
            confirmedBy: [],
          },
        ],
        whatWorks: [
          {
            id: '1',
            description: 'Strategy 1',
            context: '',
            effectiveness: 4,
            addedDate: mockTimestamp,
            addedBy: mockUserId,
            sourceType: 'discovered',
          },
        ],
        whatDoesntWork: [],
        boundaries: [
          {
            id: '1',
            description: 'Boundary 1',
            category: 'immovable',
            addedDate: mockTimestamp,
            addedBy: mockUserId,
          },
        ],
        emergingPatterns: [],
        progressNotes: [],
        totalTriggers: 2,
        totalStrategies: 1,
        totalBoundaries: 1,
        relatedJournalEntries: [],
        relatedKnowledgeIds: [],
      };

      expect(manual.triggers).toHaveLength(2);
      expect(manual.whatWorks).toHaveLength(1);
      expect(manual.boundaries).toHaveLength(1);
      expect(manual.totalTriggers).toBe(2);
      expect(manual.totalStrategies).toBe(1);
      expect(manual.totalBoundaries).toBe(1);
    });
  });
});
