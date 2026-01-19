/**
 * Relationship Manual Onboarding Questions Configuration
 *
 * Defines the conversational questions asked during relationship manual onboarding
 * Questions are personalized with participant names
 */

import type { OnboardingSection } from './onboarding-questions';

// ==================== Relationship Onboarding Sections ====================

export const RELATIONSHIP_ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'relationship_overview',
    sectionName: 'Relationship Overview',
    sectionDescription: 'Describe your relationship',
    icon: 'HeartIcon',
    emoji: '💕',
    skippable: false,
    questions: [
      {
        id: 'overview_q1',
        question: 'How would you describe your relationship?',
        questionType: 'text',
        placeholder: 'Example: We have a close, supportive partnership where we balance each other out...',
        helperText: 'Think about the overall nature and quality of your relationship',
        required: true
      },
      {
        id: 'overview_q2',
        question: 'What are the core strengths of your relationship?',
        questionType: 'text',
        placeholder: 'Example: Strong communication, shared values, mutual respect, sense of humor...',
        helperText: 'What makes your relationship work well?',
        required: true
      },
      {
        id: 'overview_q3',
        question: 'What challenges or growth areas exist in your relationship?',
        questionType: 'text',
        placeholder: 'Example: Balancing different energy levels, managing stress together, making time for connection...',
        helperText: 'Every relationship has areas to work on - what are yours?',
        required: false
      }
    ]
  },
  {
    sectionId: 'connection',
    sectionName: 'Connection & Rituals',
    sectionDescription: 'How you stay connected',
    icon: 'SparklesIcon',
    emoji: '✨',
    skippable: false,
    questions: [
      {
        id: 'connection_q1',
        question: 'What regular rituals or routines do you share together?',
        questionType: 'text',
        placeholder: 'Example: Sunday morning coffee together, weekly date nights, evening walks, bedtime conversations...',
        helperText: 'What recurring activities help you stay connected?',
        required: false
      },
      {
        id: 'connection_q2',
        question: "What activities help you reconnect when you've been apart or feeling distant?",
        questionType: 'text',
        placeholder: 'Example: Going for a walk, cooking together, playing board games, working on a project...',
        helperText: 'How do you bridge distance or disconnection?',
        required: false
      },
      {
        id: 'connection_q3',
        question: 'What makes {{participantNames}} feel loved and appreciated?',
        questionType: 'text',
        placeholder: 'Example: Words of affirmation, quality time, acts of service, physical touch, thoughtful gestures...',
        helperText: 'How does each person feel most valued?',
        required: false
      }
    ]
  },
  {
    sectionId: 'conflict',
    sectionName: 'Conflict & Resolution',
    sectionDescription: 'How you handle disagreements',
    icon: 'BoltIcon',
    emoji: '⚡',
    skippable: false,
    questions: [
      {
        id: 'conflict_q1',
        question: 'Describe a recent conflict or disagreement. What happened and how did you resolve it?',
        questionType: 'text',
        placeholder: 'Example: We disagreed about weekend plans. Initially we were both frustrated, but after giving each other space...',
        helperText: 'Walk through a specific example from start to resolution',
        required: true
      },
      {
        id: 'conflict_q2',
        question: 'What patterns do you notice in how conflicts typically unfold?',
        questionType: 'text',
        placeholder: 'Example: One of us needs space before talking, we tend to rehash old issues, emotions escalate quickly...',
        helperText: 'What triggers conflict? How does it usually play out?',
        required: false
      },
      {
        id: 'conflict_q3',
        question: 'What approaches help you repair and reconnect after conflict?',
        questionType: 'text',
        placeholder: "Example: Acknowledging each other's feelings, apologizing directly, physical touch, giving it time...",
        helperText: 'What helps you move from conflict back to connection?',
        required: false
      },
      {
        id: 'conflict_q4',
        question: 'What makes conflicts worse or harder to resolve?',
        questionType: 'text',
        placeholder: 'Example: Bringing up past issues, interrupting, defensiveness, trying to resolve when tired...',
        helperText: 'What patterns or behaviors escalate conflict?',
        required: false
      }
    ]
  },
  {
    sectionId: 'goals',
    sectionName: 'Shared Goals & Dreams',
    sectionDescription: "What you're working toward together",
    icon: 'RocketLaunchIcon',
    emoji: '🚀',
    skippable: true,
    questions: [
      {
        id: 'goals_q1',
        question: 'What are the most important shared goals for your relationship?',
        questionType: 'text',
        placeholder: "Example: Build financial security, raise happy kids, travel together, grow spiritually, support each other's careers...",
        helperText: 'What are you working toward as a team?',
        required: false
      },
      {
        id: 'goals_q2',
        question: 'What are you both working on or growing toward right now?',
        questionType: 'text',
        placeholder: 'Example: Better communication, work-life balance, health goals, deepening our friendship...',
        helperText: "What's your current focus for growth?",
        required: false
      },
      {
        id: 'goals_q3',
        question: 'What dreams or aspirations do you share for the future?',
        questionType: 'text',
        placeholder: 'Example: Travel the world, start a business, buy a home, spend more time with extended family...',
        helperText: 'Looking ahead, what do you hope to experience or achieve together?',
        required: false
      }
    ]
  }
];

// ==================== Type-Specific Sections ====================

export const MARRIAGE_PARTNERSHIP_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'partnership_dynamics',
    sectionName: 'Partnership Dynamics',
    sectionDescription: 'How you share life together',
    icon: 'UsersIcon',
    emoji: '👫',
    skippable: true,
    questions: [
      {
        id: 'partnership_q1',
        question: 'How do you divide responsibilities and decision-making?',
        questionType: 'text',
        placeholder: 'Example: We each handle certain areas, make big decisions together, alternate who takes the lead...',
        helperText: 'How do you share the load of daily life?',
        required: false
      },
      {
        id: 'partnership_q2',
        question: 'How do you navigate differences in communication styles or needs?',
        questionType: 'text',
        placeholder: 'Example: One of us processes externally, the other needs time to think...',
        helperText: 'What differences do you need to bridge?',
        required: false
      }
    ]
  }
];

export const PARENT_CHILD_RELATIONSHIP_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'parenting_approach',
    sectionName: 'Your Parenting Relationship',
    sectionDescription: 'How you work together as parents',
    icon: 'AcademicCapIcon',
    emoji: '👨‍👩‍👧',
    skippable: true,
    questions: [
      {
        id: 'parenting_q1',
        question: 'How do you collaborate on parenting decisions and discipline?',
        questionType: 'text',
        placeholder: "Example: We discuss big decisions together, support each other's in-the-moment calls...",
        helperText: 'How do you work as a parenting team?',
        required: false
      },
      {
        id: 'parenting_q2',
        question: 'What are your different parenting styles or strengths?',
        questionType: 'text',
        placeholder: 'Example: One is more structured, the other more playful; one handles bedtime, the other mornings...',
        helperText: 'How do your approaches differ and complement each other?',
        required: false
      }
    ]
  }
];

export const FRIENDSHIP_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'friendship_foundation',
    sectionName: 'Friendship Foundation',
    sectionDescription: 'What sustains your friendship',
    icon: 'UserGroupIcon',
    emoji: '🤝',
    skippable: true,
    questions: [
      {
        id: 'friendship_q1',
        question: 'What brought you together and what keeps your friendship strong?',
        questionType: 'text',
        placeholder: 'Example: Met through work, bonded over shared interests, stayed close through life changes...',
        helperText: "What's the foundation of your friendship?",
        required: false
      },
      {
        id: 'friendship_q2',
        question: 'How do you navigate life changes or different seasons?',
        questionType: 'text',
        placeholder: 'Example: Check in regularly even when busy, adapt expectations, celebrate milestones together...',
        helperText: 'How do you stay connected through change?',
        required: false
      }
    ]
  }
];

// ==================== Helper Functions ====================

/**
 * Get all onboarding sections for a relationship type
 */
export function getRelationshipOnboardingSections(
  relationshipType: 'marriage' | 'partnership' | 'parent_child' | 'friendship' | 'professional' | 'other',
  participantCount: number
): OnboardingSection[] {
  const sections = [...RELATIONSHIP_ONBOARDING_SECTIONS];

  // Add type-specific sections
  if (relationshipType === 'marriage' || relationshipType === 'partnership') {
    sections.push(...MARRIAGE_PARTNERSHIP_SECTIONS);
  }

  if (relationshipType === 'parent_child') {
    sections.push(...PARENT_CHILD_RELATIONSHIP_SECTIONS);
  }

  if (relationshipType === 'friendship') {
    sections.push(...FRIENDSHIP_SECTIONS);
  }

  return sections;
}

/**
 * Replace {{participantNames}} placeholder with actual names in questions
 */
export function personalizeRelationshipQuestions(
  sections: OnboardingSection[],
  participantNames: string[]
): OnboardingSection[] {
  const namesString = participantNames.join(' & ');

  return sections.map(section => ({
    ...section,
    questions: section.questions.map(q => ({
      ...q,
      question: q.question.replace(/\{\{participantNames\}\}/g, namesString),
      placeholder: q.placeholder?.replace(/\{\{participantNames\}\}/g, namesString),
      helperText: q.helperText?.replace(/\{\{participantNames\}\}/g, namesString)
    }))
  }));
}

/**
 * Get total question count for a relationship type
 */
export function getRelationshipQuestionCount(
  relationshipType: 'marriage' | 'partnership' | 'parent_child' | 'friendship' | 'professional' | 'other',
  participantCount: number = 2
): number {
  const sections = getRelationshipOnboardingSections(relationshipType, participantCount);
  return sections.reduce((count, section) => count + section.questions.length, 0);
}

/**
 * Get estimated time to complete onboarding
 */
export function getRelationshipEstimatedTime(
  relationshipType: 'marriage' | 'partnership' | 'parent_child' | 'friendship' | 'professional' | 'other',
  participantCount: number = 2
): string {
  const questionCount = getRelationshipQuestionCount(relationshipType, participantCount);
  const minutes = Math.ceil(questionCount * 1.5); // Estimate 1.5 minutes per question
  return `${minutes}-${minutes + 5} minutes`;
}
