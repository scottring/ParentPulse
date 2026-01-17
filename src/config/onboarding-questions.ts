/**
 * Onboarding Questions Configuration
 *
 * Defines the conversational questions asked during manual onboarding
 * for each section type and relationship type
 */

import { RelationshipType } from '@/types/person-manual';

export interface OnboardingQuestion {
  id: string;
  question: string;
  placeholder: string;
  helperText?: string;
  required?: boolean;
}

export interface OnboardingSection {
  sectionId: string;
  sectionName: string;
  sectionDescription: string;
  emoji: string;
  questions: OnboardingQuestion[];
  skippable: boolean;
}

// ==================== Universal Sections ====================

export const UNIVERSAL_ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'overview',
    sectionName: 'Overview',
    sectionDescription: 'A personal introduction to help others understand them',
    emoji: '👤',
    skippable: false,
    questions: [
      {
        id: 'overview_q1',
        question: 'What does {{personName}} like? What brings them joy or energy?',
        placeholder: 'Example: Loves being outdoors, enjoys creative projects, energized by time with friends...',
        helperText: 'Think about their interests, hobbies, and what lights them up',
        required: true
      },
      {
        id: 'overview_q2',
        question: 'What does {{personName}} dislike or find draining?',
        placeholder: 'Example: Dislikes loud crowds, finds small talk exhausting, avoids conflict...',
        helperText: 'What depletes their energy or makes them uncomfortable?',
        required: false
      },
      {
        id: 'overview_q3',
        question: 'What drives or motivates {{personName}}?',
        placeholder: 'Example: Motivated by helping others, driven to create, seeks mastery and growth...',
        helperText: 'What are their core values or motivations?',
        required: false
      },
      {
        id: 'overview_q4',
        question: 'What makes {{personName}} feel comfortable vs. uncomfortable?',
        placeholder: 'Example: Comfortable with routine and predictability, uncomfortable with surprises...',
        helperText: 'What environments or situations help them thrive or cause stress?',
        required: false
      }
    ]
  },
  {
    sectionId: 'triggers',
    sectionName: 'Triggers & Patterns',
    sectionDescription: 'Help us understand what causes stress or challenges',
    emoji: '⚡',
    skippable: false,
    questions: [
      {
        id: 'triggers_q1',
        question: 'Describe a recent time {{personName}} became stressed or upset. What happened?',
        placeholder: 'Example: Last week during homework time, they got frustrated when...',
        helperText: 'Think about the situation, what led up to it, and how they reacted',
        required: true
      },
      {
        id: 'triggers_q2',
        question: 'What situations or transitions tend to be challenging for {{personName}}?',
        placeholder: 'Example: Transitions from play to work, loud environments, unexpected changes...',
        helperText: 'Consider daily routines, social situations, or specific environments',
        required: false
      },
      {
        id: 'triggers_q3',
        question: 'What typically helps when {{personName}} is struggling?',
        placeholder: 'Example: Taking a break, going outside, talking through feelings...',
        helperText: 'What de-escalation strategies have you found effective?',
        required: false
      }
    ]
  },
  {
    sectionId: 'what_works',
    sectionName: 'What Works',
    sectionDescription: 'Share strategies that have been effective',
    emoji: '✨',
    skippable: false,
    questions: [
      {
        id: 'works_q1',
        question: 'What strategies have you found most effective with {{personName}}?',
        placeholder: 'Example: Using visual timers, offering choices, giving advance notice...',
        helperText: 'Think about approaches that consistently work well',
        required: true
      },
      {
        id: 'works_q2',
        question: 'Think of a time something went really well. What made the difference?',
        placeholder: 'Example: When we prepared them the night before, the morning went smoothly...',
        helperText: 'What specific actions or conditions led to success?',
        required: false
      },
      {
        id: 'works_q3',
        question: 'What motivates or excites {{personName}}?',
        placeholder: 'Example: Earning special time together, working toward a goal, getting praised...',
        helperText: 'What gets them engaged and cooperative?',
        required: false
      }
    ]
  },
  {
    sectionId: 'boundaries',
    sectionName: 'Boundaries & Important Context',
    sectionDescription: 'What boundaries and context are important to know',
    emoji: '🛡️',
    skippable: true,
    questions: [
      {
        id: 'boundaries_q1',
        question: 'What boundaries or limits are important to respect with {{personName}}?',
        placeholder: 'Example: They need personal space when upset, don\'t touch their special items...',
        helperText: 'What should others know to respect their needs?',
        required: false
      },
      {
        id: 'boundaries_q2',
        question: 'What should others know to interact well with {{personName}}?',
        placeholder: 'Example: They warm up slowly to new people, they prefer direct communication...',
        helperText: 'Important context for teachers, caregivers, or others',
        required: false
      },
      {
        id: 'boundaries_q3',
        question: 'What topics or approaches should be avoided?',
        placeholder: 'Example: Don\'t compare to siblings, avoid surprises, don\'t rush them...',
        helperText: 'What makes things worse or causes unnecessary conflict?',
        required: false
      }
    ]
  },
  {
    sectionId: 'strengths',
    sectionName: 'Strengths & Challenges',
    sectionDescription: 'Their unique strengths and areas of difficulty',
    emoji: '💪',
    skippable: true,
    questions: [
      {
        id: 'strengths_q1',
        question: 'What are {{personName}}\'s greatest strengths?',
        placeholder: 'Example: Creative problem-solver, empathetic, persistent, great sense of humor...',
        helperText: 'What do they do well? What makes them special?',
        required: false
      },
      {
        id: 'strengths_q2',
        question: 'What areas does {{personName}} find challenging?',
        placeholder: 'Example: Following multi-step directions, emotional regulation, social cues...',
        helperText: 'Where do they struggle or need extra support?',
        required: false
      }
    ]
  }
];

// ==================== Child-Specific Sections ====================

export const CHILD_SPECIFIC_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'development',
    sectionName: 'Development & Learning',
    sectionDescription: 'How they learn and any developmental considerations',
    emoji: '📚',
    skippable: true,
    questions: [
      {
        id: 'dev_q1',
        question: 'How does {{personName}} learn best?',
        placeholder: 'Example: Visual learner, needs hands-on activities, learns through stories...',
        helperText: 'What teaching methods or approaches work well?',
        required: false
      },
      {
        id: 'dev_q2',
        question: 'Are there any developmental considerations or special needs?',
        placeholder: 'Example: Has ADHD diagnosis, receives speech therapy, has an IEP for math...',
        helperText: 'Any diagnoses, therapies, or educational support?',
        required: false
      }
    ]
  }
];

// ==================== Spouse-Specific Sections ====================

export const SPOUSE_SPECIFIC_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'love_languages',
    sectionName: 'Love Languages & Connection',
    sectionDescription: 'How they feel loved and connected',
    emoji: '💝',
    skippable: true,
    questions: [
      {
        id: 'love_q1',
        question: 'How does {{personName}} feel most loved and appreciated?',
        placeholder: 'Example: Words of affirmation, acts of service, quality time together...',
        helperText: 'What makes them feel valued in your relationship?',
        required: false
      },
      {
        id: 'love_q2',
        question: 'What helps during conflict or disconnection?',
        placeholder: 'Example: Taking space first then talking, physical touch, written notes...',
        helperText: 'How do you reconnect after arguments or tough times?',
        required: false
      }
    ]
  }
];

// ==================== Elderly Parent Sections ====================

export const ELDERLY_PARENT_SPECIFIC_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'health',
    sectionName: 'Health & Care Needs',
    sectionDescription: 'Medical and care considerations',
    emoji: '🏥',
    skippable: true,
    questions: [
      {
        id: 'health_q1',
        question: 'What are the key health or medical considerations for {{personName}}?',
        placeholder: 'Example: Takes blood pressure medication daily, needs help with mobility...',
        helperText: 'Important medical conditions, medications, or care needs',
        required: false
      },
      {
        id: 'health_q2',
        question: 'What support do they need vs. what do they prefer to do independently?',
        placeholder: 'Example: Needs help with bathing but wants to dress independently...',
        helperText: 'Balancing support with maintaining their independence',
        required: false
      }
    ]
  }
];

// ==================== Friend Sections ====================

export const FRIEND_SPECIFIC_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'connection',
    sectionName: 'Connection & Communication',
    sectionDescription: 'How you stay connected and communicate',
    emoji: '📱',
    skippable: true,
    questions: [
      {
        id: 'friend_q1',
        question: 'How do you and {{personName}} typically stay in touch?',
        placeholder: 'Example: Weekly coffee dates, text conversations, monthly dinners...',
        helperText: 'What\'s your rhythm of connection?',
        required: false
      },
      {
        id: 'friend_q2',
        question: 'What topics should you remember to ask about or avoid?',
        placeholder: 'Example: Ask about their new job, avoid talking about their ex...',
        helperText: 'Important life context to remember',
        required: false
      }
    ]
  }
];

// ==================== Professional Sections ====================

export const PROFESSIONAL_SPECIFIC_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'work_style',
    sectionName: 'Work Style & Collaboration',
    sectionDescription: 'How they work best professionally',
    emoji: '💼',
    skippable: true,
    questions: [
      {
        id: 'work_q1',
        question: 'How does {{personName}} work best?',
        placeholder: 'Example: Prefers email over calls, needs detailed agendas, works best in mornings...',
        helperText: 'Communication style, meeting preferences, work habits',
        required: false
      },
      {
        id: 'work_q2',
        question: 'What should you know about collaborating with {{personName}}?',
        placeholder: 'Example: Give them time to process before decisions, appreciates direct feedback...',
        helperText: 'How to work together effectively',
        required: false
      }
    ]
  }
];

// ==================== Sibling Sections ====================

export const SIBLING_SPECIFIC_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'dynamics',
    sectionName: 'Relationship Dynamics',
    sectionDescription: 'Your relationship patterns and dynamics',
    emoji: '👫',
    skippable: true,
    questions: [
      {
        id: 'sibling_q1',
        question: 'What are the key dynamics in your relationship with {{personName}}?',
        placeholder: 'Example: We\'re very close, they\'re more reserved, we process differently...',
        helperText: 'How would you describe your sibling relationship?',
        required: false
      },
      {
        id: 'sibling_q2',
        question: 'What should you remember about {{personName}}\'s current situation?',
        placeholder: 'Example: Going through a divorce, just started a new business, caring for young kids...',
        helperText: 'Life context that affects your relationship',
        required: false
      }
    ]
  }
];

// ==================== Helper Functions ====================

/**
 * Get all onboarding sections for a relationship type
 */
export function getOnboardingSections(relationshipType: RelationshipType): OnboardingSection[] {
  const sections = [...UNIVERSAL_ONBOARDING_SECTIONS];

  switch (relationshipType) {
    case 'child':
      sections.push(...CHILD_SPECIFIC_SECTIONS);
      break;
    case 'spouse':
      sections.push(...SPOUSE_SPECIFIC_SECTIONS);
      break;
    case 'elderly_parent':
      sections.push(...ELDERLY_PARENT_SPECIFIC_SECTIONS);
      break;
    case 'friend':
      sections.push(...FRIEND_SPECIFIC_SECTIONS);
      break;
    case 'professional':
      sections.push(...PROFESSIONAL_SPECIFIC_SECTIONS);
      break;
    case 'sibling':
      sections.push(...SIBLING_SPECIFIC_SECTIONS);
      break;
    case 'other':
      // Only universal sections
      break;
  }

  return sections;
}

/**
 * Replace {{personName}} placeholder with actual name in questions
 */
export function personalizeQuestions(
  sections: OnboardingSection[],
  personName: string
): OnboardingSection[] {
  return sections.map(section => ({
    ...section,
    questions: section.questions.map(q => ({
      ...q,
      question: q.question.replace(/\{\{personName\}\}/g, personName),
      placeholder: q.placeholder.replace(/\{\{personName\}\}/g, personName),
      helperText: q.helperText?.replace(/\{\{personName\}\}/g, personName)
    }))
  }));
}

/**
 * Get total question count for a relationship type
 */
export function getQuestionCount(relationshipType: RelationshipType): number {
  const sections = getOnboardingSections(relationshipType);
  return sections.reduce((count, section) => count + section.questions.length, 0);
}

/**
 * Get estimated time to complete onboarding
 */
export function getEstimatedTime(relationshipType: RelationshipType): string {
  const questionCount = getQuestionCount(relationshipType);
  const minutes = Math.ceil(questionCount * 1.5); // Estimate 1.5 minutes per question
  return `${minutes}-${minutes + 5} minutes`;
}
