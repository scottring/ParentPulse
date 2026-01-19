/**
 * Family Manual Onboarding Questions Configuration
 *
 * Defines the conversational questions asked during family manual onboarding
 */

import type { OnboardingSection } from './onboarding-questions';

// ==================== Family Onboarding Sections ====================

export const FAMILY_ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'family_overview',
    sectionName: 'Family Overview',
    sectionDescription: 'Describe your family',
    icon: 'HomeIcon',
    emoji: '🏠',
    skippable: false,
    questions: [
      {
        id: 'overview_q1',
        question: 'Describe your family. Who lives in your home?',
        questionType: 'text',
        placeholder: 'Example: Parents + 3 kids (ages 8, 12, 15), or Multi-generational household with grandparents...',
        helperText: 'Tell us about your family composition',
        required: true
      },
      {
        id: 'overview_q2',
        question: 'What makes your family unique? What defines who you are together?',
        questionType: 'text',
        placeholder: 'Example: We\'re adventurous and love learning, we prioritize time together, we\'re a blended family...',
        helperText: 'What\'s your family\'s character or personality?',
        required: true
      },
      {
        id: 'overview_q3',
        question: 'What are you most proud of about your family?',
        questionType: 'text',
        placeholder: 'Example: How we support each other, our resilience, our sense of humor...',
        helperText: 'What makes your family special?',
        required: false
      }
    ]
  },
  {
    sectionId: 'values',
    sectionName: 'Core Values',
    sectionDescription: 'What matters most to your family',
    icon: 'SparklesIcon',
    emoji: '💫',
    skippable: false,
    questions: [
      {
        id: 'values_q1',
        question: 'What values are most important to your family?',
        questionType: 'text',
        placeholder: 'Example: Honesty, kindness, hard work, creativity, respect, gratitude...',
        helperText: 'What principles guide your family life?',
        required: true
      },
      {
        id: 'values_q2',
        question: 'How do you live out these values in daily life?',
        questionType: 'text',
        placeholder: 'Example: We practice gratitude at dinner, we volunteer together monthly, we encourage trying new things...',
        helperText: 'How do your values show up in practice?',
        required: false
      },
      {
        id: 'values_q3',
        question: 'What do you want your children to remember about growing up in your family?',
        questionType: 'text',
        placeholder: 'Example: That they were loved unconditionally, that we always made time for each other, that we faced challenges together...',
        helperText: 'What legacy do you want to create?',
        required: false
      }
    ]
  },
  {
    sectionId: 'rules',
    sectionName: 'House Rules & Expectations',
    sectionDescription: 'What keeps your household running smoothly',
    icon: 'ShieldCheckIcon',
    emoji: '🛡️',
    skippable: false,
    questions: [
      {
        id: 'rules_q1',
        question: 'What are the non-negotiable rules in your household?',
        questionType: 'text',
        placeholder: 'Example: No screens at the table, homework before play, bedtime routines, respectful communication...',
        helperText: 'What boundaries are firm in your home?',
        required: true
      },
      {
        id: 'rules_q2',
        question: 'What happens when rules are broken? How do you handle consequences?',
        questionType: 'text',
        placeholder: 'Example: Loss of privileges, natural consequences, time to reflect, discussion and repair...',
        helperText: 'How do you enforce boundaries?',
        required: false
      },
      {
        id: 'rules_q3',
        question: 'What expectations do you have for how family members treat each other?',
        questionType: 'text',
        placeholder: 'Example: Use kind words, help without being asked, apologize when wrong, listen when others speak...',
        helperText: 'How should people behave in your family?',
        required: false
      }
    ]
  },
  {
    sectionId: 'routines',
    sectionName: 'Daily Routines & Rhythms',
    sectionDescription: 'The structure of your family life',
    icon: 'ClockIcon',
    emoji: '🔄',
    skippable: true,
    questions: [
      {
        id: 'routines_q1',
        question: 'Describe your typical daily routine from wake-up to bedtime.',
        questionType: 'text',
        placeholder: 'Example: 6:30 wake-up, breakfast by 7, school drop-off at 8, dinner at 6, bedtime routine starts at 8...',
        helperText: 'Walk through a typical weekday',
        required: false
      },
      {
        id: 'routines_q2',
        question: 'What weekly or monthly rhythms help your family thrive?',
        questionType: 'text',
        placeholder: 'Example: Sunday family dinners, Friday movie night, monthly family meetings, Saturday chores...',
        helperText: 'What recurring routines provide structure?',
        required: false
      },
      {
        id: 'routines_q3',
        question: 'What routines are most important for your family\'s well-being?',
        questionType: 'text',
        placeholder: 'Example: Morning connection time, bedtime stories, weekend family breakfast, evening walks...',
        helperText: 'Which routines matter most?',
        required: false
      }
    ]
  },
  {
    sectionId: 'traditions',
    sectionName: 'Traditions & Celebrations',
    sectionDescription: 'Special rituals that bring your family together',
    icon: 'SparklesIcon',
    emoji: '🎉',
    skippable: true,
    questions: [
      {
        id: 'traditions_q1',
        question: 'What traditions or celebrations are important to your family?',
        questionType: 'text',
        placeholder: 'Example: Birthday breakfast in bed, annual camping trip, holiday rituals, first day of school photos...',
        helperText: 'What special occasions or rituals do you celebrate?',
        required: false
      },
      {
        id: 'traditions_q2',
        question: 'What makes these traditions meaningful? Why do they matter?',
        questionType: 'text',
        placeholder: 'Example: They create lasting memories, mark important milestones, bring us together, connect us to our heritage...',
        helperText: 'What\'s the significance of your traditions?',
        required: false
      },
      {
        id: 'traditions_q3',
        question: 'Are there any new traditions you want to start or old ones you want to revive?',
        questionType: 'text',
        placeholder: 'Example: Want to start monthly adventures, bring back Sunday game nights, create a family yearbook...',
        helperText: 'What traditions are you dreaming about?',
        required: false
      }
    ]
  }
];

// ==================== Helper Functions ====================

/**
 * Get all onboarding sections for family manual
 */
export function getFamilyOnboardingSections(): OnboardingSection[] {
  return [...FAMILY_ONBOARDING_SECTIONS];
}

/**
 * Get total question count for family onboarding
 */
export function getFamilyQuestionCount(): number {
  const sections = getFamilyOnboardingSections();
  return sections.reduce((count, section) => count + section.questions.length, 0);
}

/**
 * Get estimated time to complete family onboarding
 */
export function getFamilyEstimatedTime(): string {
  const questionCount = getFamilyQuestionCount();
  const minutes = Math.ceil(questionCount * 1.5); // Estimate 1.5 minutes per question
  return `${minutes}-${minutes + 5} minutes`;
}
