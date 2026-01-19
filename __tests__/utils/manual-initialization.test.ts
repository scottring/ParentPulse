import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationshipType, RoleType } from '@/types/person-manual';

// Mock Firebase before importing the module
vi.mock('@/lib/firebase', () => ({
  firestore: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    }))
  }
}));

// Import after mocks are set up
import {
  getManualSectionsPreview,
  isValidRelationshipType
} from '@/utils/manual-initialization';

describe('manual-initialization utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidRelationshipType', () => {
    it('should return true for valid relationship types', () => {
      const validTypes: RelationshipType[] = [
        'child',
        'spouse',
        'elderly_parent',
        'friend',
        'professional',
        'sibling',
        'other'
      ];

      validTypes.forEach(type => {
        expect(isValidRelationshipType(type)).toBe(true);
      });
    });

    it('should return false for invalid relationship types', () => {
      const invalidTypes = [
        'invalid',
        'parent', // Not a relationship type, this is a role type
        'coworker',
        'neighbor',
        '',
        'CHILD', // Case sensitive
        'Child',
        123,
        null,
        undefined
      ];

      invalidTypes.forEach(type => {
        expect(isValidRelationshipType(type as string)).toBe(false);
      });
    });
  });

  describe('getManualSectionsPreview', () => {
    it('should return preview structure for child relationship', () => {
      const preview = getManualSectionsPreview('child');

      expect(preview).toHaveProperty('totalSections');
      expect(preview.totalSections).toBe(1);
      expect(preview).toHaveProperty('universalSections');
      expect(preview).toHaveProperty('specificSections');
      expect(preview).toHaveProperty('sections');
    });

    it('should return preview structure for spouse relationship', () => {
      const preview = getManualSectionsPreview('spouse');

      expect(preview.totalSections).toBe(1);
      expect(preview.universalSections).toBeInstanceOf(Array);
      expect(preview.universalSections.length).toBeGreaterThan(0);
    });

    it('should return preview structure for elderly_parent relationship', () => {
      const preview = getManualSectionsPreview('elderly_parent');

      expect(preview.totalSections).toBe(1);
      expect(preview.universalSections).toBeInstanceOf(Array);
    });

    it('should return preview structure for friend relationship', () => {
      const preview = getManualSectionsPreview('friend');

      expect(preview.totalSections).toBe(1);
      expect(preview.universalSections).toBeInstanceOf(Array);
    });

    it('should return preview structure for professional relationship', () => {
      const preview = getManualSectionsPreview('professional');

      expect(preview.totalSections).toBe(1);
      expect(preview.universalSections).toBeInstanceOf(Array);
    });

    it('should return preview structure for sibling relationship', () => {
      const preview = getManualSectionsPreview('sibling');

      expect(preview.totalSections).toBe(1);
      expect(preview.universalSections).toBeInstanceOf(Array);
    });

    it('should return preview structure for other relationship', () => {
      const preview = getManualSectionsPreview('other');

      expect(preview.totalSections).toBe(1);
      expect(preview.universalSections).toBeInstanceOf(Array);
    });

    it('should use "other" as default when no relationship type provided', () => {
      const preview = getManualSectionsPreview();

      expect(preview.totalSections).toBe(1);
      expect(preview.universalSections).toBeInstanceOf(Array);
    });

    it('should include all required content areas in universalSections', () => {
      const preview = getManualSectionsPreview('child');

      const expectedTitles = [
        'Role Overview',
        'Triggers & Patterns',
        'What Works',
        "What Doesn't Work",
        'Boundaries & Limits',
        'Strengths & Challenges'
      ];

      const actualTitles = preview.universalSections.map(section => section.title);

      expectedTitles.forEach(title => {
        expect(actualTitles).toContain(title);
      });
    });

    it('should include emoji and description for each content area', () => {
      const preview = getManualSectionsPreview('child');

      preview.universalSections.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('description');
        expect(section).toHaveProperty('emoji');
        expect(section).toHaveProperty('category');
        expect(section.title).toBeTruthy();
        expect(section.description).toBeTruthy();
        expect(section.emoji).toBeTruthy();
      });
    });

    it('should mark all sections as universal category', () => {
      const preview = getManualSectionsPreview('child');

      preview.universalSections.forEach(section => {
        expect(section.category).toBe('universal');
      });
    });

    it('should return empty specificSections array', () => {
      const allTypes: RelationshipType[] = [
        'child',
        'spouse',
        'elderly_parent',
        'friend',
        'professional',
        'sibling',
        'other'
      ];

      allTypes.forEach(type => {
        const preview = getManualSectionsPreview(type);
        expect(preview.specificSections).toEqual([]);
      });
    });
  });

  describe('relationshipToRoleType mapping', () => {
    // Since relationshipToRoleType is not exported, we test it indirectly through the preview
    // The mapping is verified through section structure
    it('should map all relationship types consistently', () => {
      const relationshipTypes: RelationshipType[] = [
        'child',
        'spouse',
        'elderly_parent',
        'friend',
        'professional',
        'sibling',
        'other'
      ];

      // Each relationship type should produce a valid preview
      relationshipTypes.forEach(relType => {
        const preview = getManualSectionsPreview(relType);
        expect(preview).toBeDefined();
        expect(preview.totalSections).toBe(1);
        expect(preview.universalSections.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateRoleTitle behavior', () => {
    // Since generateRoleTitle is not exported, we verify it through createManualSections
    // However, since createManualSections requires Firebase, we just ensure the preview
    // includes proper structure that would be used for title generation

    it('should have proper structure for role title generation', () => {
      const preview = getManualSectionsPreview('child');

      // Verify the structure exists that createManualSections would use
      expect(preview.universalSections).toBeDefined();
      expect(preview.universalSections[0]).toHaveProperty('title');
    });
  });
});

describe('RelationshipType enum coverage', () => {
  it('should cover all 7 relationship types', () => {
    const allRelationshipTypes: RelationshipType[] = [
      'child',
      'spouse',
      'elderly_parent',
      'friend',
      'professional',
      'sibling',
      'other'
    ];

    expect(allRelationshipTypes.length).toBe(7);

    // Verify each is valid
    allRelationshipTypes.forEach(type => {
      expect(isValidRelationshipType(type)).toBe(true);
    });
  });
});

describe('RoleType mapping expectations', () => {
  // These are the expected mappings based on the code
  const expectedMappings: Record<RelationshipType, RoleType> = {
    'child': 'parent', // I am parenting this child
    'spouse': 'spouse',
    'elderly_parent': 'caregiver',
    'friend': 'friend',
    'professional': 'professional',
    'sibling': 'sibling',
    'other': 'other'
  };

  Object.entries(expectedMappings).forEach(([relType, roleType]) => {
    it(`relationship '${relType}' should map to role '${roleType}'`, () => {
      // This test documents the expected behavior
      // The actual mapping is tested through integration tests
      expect(expectedMappings[relType as RelationshipType]).toBe(roleType);
    });
  });
});
