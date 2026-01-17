/**
 * Section Templates Configuration
 *
 * Defines which sections each relationship type receives when their manual is created
 * - Universal sections: All relationship types get these
 * - Relationship-specific sections: Only certain types get these
 */

import { RelationshipType } from '@/types/person-manual';

export interface SectionTemplate {
  sectionId: string;
  title: string;
  description: string;
  emoji: string;
  category: 'universal' | 'relationship_specific';
  relationshipTypes: RelationshipType[];
  order: number;
}

// ==================== Universal Sections ====================
// These sections appear in ALL person manuals regardless of relationship type

export const UNIVERSAL_SECTIONS: SectionTemplate[] = [
  {
    sectionId: 'triggers',
    title: 'Triggers & Patterns',
    description: 'What causes challenges or stress, recurring patterns to watch for',
    emoji: '⚡',
    category: 'universal',
    relationshipTypes: ['child', 'spouse', 'elderly_parent', 'friend', 'professional', 'sibling', 'other'],
    order: 1
  },
  {
    sectionId: 'what_works',
    title: 'What Works',
    description: 'Effective strategies and approaches that have proven successful',
    emoji: '✨',
    category: 'universal',
    relationshipTypes: ['child', 'spouse', 'elderly_parent', 'friend', 'professional', 'sibling', 'other'],
    order: 2
  },
  {
    sectionId: 'what_doesnt_work',
    title: "What Doesn't Work",
    description: 'Approaches to avoid, things that make situations worse',
    emoji: '🚫',
    category: 'universal',
    relationshipTypes: ['child', 'spouse', 'elderly_parent', 'friend', 'professional', 'sibling', 'other'],
    order: 3
  },
  {
    sectionId: 'boundaries',
    title: 'Boundaries & Limits',
    description: 'Important boundaries, non-negotiables, and respect markers',
    emoji: '🛡️',
    category: 'universal',
    relationshipTypes: ['child', 'spouse', 'elderly_parent', 'friend', 'professional', 'sibling', 'other'],
    order: 4
  },
  {
    sectionId: 'strengths_challenges',
    title: 'Strengths & Challenges',
    description: 'Core strengths to leverage and areas of difficulty',
    emoji: '💪',
    category: 'universal',
    relationshipTypes: ['child', 'spouse', 'elderly_parent', 'friend', 'professional', 'sibling', 'other'],
    order: 5
  }
];

// ==================== Child-Specific Sections ====================

export const CHILD_SECTIONS: SectionTemplate[] = [
  {
    sectionId: 'development',
    title: 'Development & Milestones',
    description: 'Age-appropriate expectations, skills developing, growth tracking',
    emoji: '📈',
    category: 'relationship_specific',
    relationshipTypes: ['child'],
    order: 10
  },
  {
    sectionId: 'discipline',
    title: 'Discipline & Consequences',
    description: 'What works for discipline, natural consequences, de-escalation strategies',
    emoji: '🎯',
    category: 'relationship_specific',
    relationshipTypes: ['child'],
    order: 11
  },
  {
    sectionId: 'learning_style',
    title: 'Learning Style & School',
    description: 'How they learn best, accommodations needed, homework approach',
    emoji: '📚',
    category: 'relationship_specific',
    relationshipTypes: ['child'],
    order: 12
  },
  {
    sectionId: 'sensory',
    title: 'Sensory & Regulation',
    description: 'Sensory sensitivities, self-regulation strategies, meltdown prevention',
    emoji: '🎨',
    category: 'relationship_specific',
    relationshipTypes: ['child'],
    order: 13
  }
];

// ==================== Spouse/Partner Sections ====================

export const SPOUSE_SECTIONS: SectionTemplate[] = [
  {
    sectionId: 'love_languages',
    title: 'Love Languages & Connection',
    description: 'How they feel loved, quality time preferences, affection needs',
    emoji: '💝',
    category: 'relationship_specific',
    relationshipTypes: ['spouse'],
    order: 10
  },
  {
    sectionId: 'conflict',
    title: 'Conflict & Communication',
    description: 'How to handle disagreements, communication style, repair strategies',
    emoji: '💬',
    category: 'relationship_specific',
    relationshipTypes: ['spouse'],
    order: 11
  },
  {
    sectionId: 'stress',
    title: 'Stress & Support',
    description: 'Stress signals, what helps, what makes it worse, support needs',
    emoji: '😰',
    category: 'relationship_specific',
    relationshipTypes: ['spouse'],
    order: 12
  },
  {
    sectionId: 'responsibilities',
    title: 'Shared Responsibilities',
    description: 'Division of labor, household tasks, parenting alignment',
    emoji: '🤝',
    category: 'relationship_specific',
    relationshipTypes: ['spouse'],
    order: 13
  }
];

// ==================== Elderly Parent Sections ====================

export const ELDERLY_PARENT_SECTIONS: SectionTemplate[] = [
  {
    sectionId: 'health',
    title: 'Health & Medical',
    description: 'Medications, appointments, conditions, care preferences',
    emoji: '🏥',
    category: 'relationship_specific',
    relationshipTypes: ['elderly_parent'],
    order: 10
  },
  {
    sectionId: 'communication_prefs',
    title: 'Communication & Preferences',
    description: 'Communication style, visit preferences, comfort needs',
    emoji: '📞',
    category: 'relationship_specific',
    relationshipTypes: ['elderly_parent'],
    order: 11
  },
  {
    sectionId: 'support_needs',
    title: 'Support Needs & Boundaries',
    description: 'Help needed vs. independence, boundaries to respect',
    emoji: '🤲',
    category: 'relationship_specific',
    relationshipTypes: ['elderly_parent'],
    order: 12
  },
  {
    sectionId: 'memory',
    title: 'Memory & Routines',
    description: 'Memory aids, daily routines, confusion triggers',
    emoji: '🧠',
    category: 'relationship_specific',
    relationshipTypes: ['elderly_parent'],
    order: 13
  }
];

// ==================== Friend Sections ====================

export const FRIEND_SECTIONS: SectionTemplate[] = [
  {
    sectionId: 'communication_style',
    title: 'Communication Style & Frequency',
    description: 'Connection frequency, preferred methods, boundaries',
    emoji: '📱',
    category: 'relationship_specific',
    relationshipTypes: ['friend'],
    order: 10
  },
  {
    sectionId: 'interests',
    title: 'Interests & Activities',
    description: 'Shared interests, activities you enjoy together, conversation topics',
    emoji: '🎮',
    category: 'relationship_specific',
    relationshipTypes: ['friend'],
    order: 11
  },
  {
    sectionId: 'support',
    title: 'Support & Reciprocity',
    description: 'How they show up, what support looks like, give/take balance',
    emoji: '💙',
    category: 'relationship_specific',
    relationshipTypes: ['friend'],
    order: 12
  },
  {
    sectionId: 'life_updates',
    title: 'Life Updates & Context',
    description: 'Current situation, major events, topics to ask about or avoid',
    emoji: '📰',
    category: 'relationship_specific',
    relationshipTypes: ['friend'],
    order: 13
  }
];

// ==================== Professional/Colleague Sections ====================

export const PROFESSIONAL_SECTIONS: SectionTemplate[] = [
  {
    sectionId: 'work_style',
    title: 'Work Style & Preferences',
    description: 'How they work best, meeting preferences, communication style',
    emoji: '💼',
    category: 'relationship_specific',
    relationshipTypes: ['professional'],
    order: 10
  },
  {
    sectionId: 'goals',
    title: 'Goals & Projects',
    description: 'Current projects, career goals, areas of expertise',
    emoji: '🎯',
    category: 'relationship_specific',
    relationshipTypes: ['professional'],
    order: 11
  },
  {
    sectionId: 'collaboration',
    title: 'Collaboration Approach',
    description: 'How to work together effectively, feedback preferences, boundaries',
    emoji: '🤝',
    category: 'relationship_specific',
    relationshipTypes: ['professional'],
    order: 12
  },
  {
    sectionId: 'professional_strengths',
    title: 'Strengths & Growth Areas',
    description: 'What they excel at, what they\'re developing, how to support',
    emoji: '🌟',
    category: 'relationship_specific',
    relationshipTypes: ['professional'],
    order: 13
  }
];

// ==================== Sibling Sections ====================

export const SIBLING_SECTIONS: SectionTemplate[] = [
  {
    sectionId: 'shared_history',
    title: 'Shared History & Dynamics',
    description: 'Family dynamics, childhood patterns, evolution of relationship',
    emoji: '👫',
    category: 'relationship_specific',
    relationshipTypes: ['sibling'],
    order: 10
  },
  {
    sectionId: 'connection_style',
    title: 'Connection Style',
    description: 'How you stay in touch, what brings you together, distance vs. closeness',
    emoji: '🔗',
    category: 'relationship_specific',
    relationshipTypes: ['sibling'],
    order: 11
  },
  {
    sectionId: 'family_role',
    title: 'Family Role & Responsibilities',
    description: 'Role in family system, caregiving for parents, shared responsibilities',
    emoji: '👨‍👩‍👧‍👦',
    category: 'relationship_specific',
    relationshipTypes: ['sibling'],
    order: 12
  }
];

// ==================== Helper Functions ====================

/**
 * Get all section templates for a specific relationship type
 */
export function getSectionsForRelationshipType(type: RelationshipType): SectionTemplate[] {
  const allSections = [
    ...UNIVERSAL_SECTIONS,
    ...CHILD_SECTIONS,
    ...SPOUSE_SECTIONS,
    ...ELDERLY_PARENT_SECTIONS,
    ...FRIEND_SECTIONS,
    ...PROFESSIONAL_SECTIONS,
    ...SIBLING_SECTIONS
  ];

  return allSections
    .filter(section => section.relationshipTypes.includes(type))
    .sort((a, b) => a.order - b.order);
}

/**
 * Get just the universal sections (for any relationship type)
 */
export function getUniversalSections(): SectionTemplate[] {
  return [...UNIVERSAL_SECTIONS].sort((a, b) => a.order - b.order);
}

/**
 * Get relationship-specific sections for a type
 */
export function getRelationshipSpecificSections(type: RelationshipType): SectionTemplate[] {
  const allSections = [
    ...CHILD_SECTIONS,
    ...SPOUSE_SECTIONS,
    ...ELDERLY_PARENT_SECTIONS,
    ...FRIEND_SECTIONS,
    ...PROFESSIONAL_SECTIONS,
    ...SIBLING_SECTIONS
  ];

  return allSections
    .filter(section => section.relationshipTypes.includes(type))
    .sort((a, b) => a.order - b.order);
}

/**
 * Get section count for a relationship type
 */
export function getSectionCount(type: RelationshipType): {
  universal: number;
  specific: number;
  total: number;
} {
  const universal = getUniversalSections();
  const specific = getRelationshipSpecificSections(type);

  return {
    universal: universal.length,
    specific: specific.length,
    total: universal.length + specific.length
  };
}
