/**
 * Self-Onboarding Questions
 *
 * First-person mirror of the observer questions in onboarding-questions.ts.
 * These are answered by the subject of the manual about themselves.
 * Question IDs match observer question IDs for pairing during synthesis.
 */

import { OnboardingSection } from './onboarding-questions';

export const SELF_ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'overview',
    sectionName: 'About You',
    sectionDescription: 'Help others understand who you are',
    icon: 'UserCircleIcon',
    skippable: false,
    questions: [
      {
        id: 'overview_q1',
        question: 'What do you enjoy? What brings you joy or energy?',
        placeholder: 'Example: I love being outdoors, enjoy creative projects, feel energized by deep conversations...',
        helperText: 'Think about your interests, hobbies, and what lights you up',
        required: true,
      },
      {
        id: 'overview_q2',
        question: 'What do you dislike or find draining?',
        placeholder: 'Example: I dislike loud crowds, find small talk exhausting, avoid conflict...',
        helperText: 'What depletes your energy or makes you uncomfortable?',
        required: false,
      },
      {
        id: 'overview_q3',
        question: 'What drives or motivates you?',
        placeholder: 'Example: I\'m motivated by helping others, driven to create, seek mastery and growth...',
        helperText: 'What are your core values or motivations?',
        required: false,
      },
      {
        id: 'overview_q4',
        question: 'What makes you feel comfortable vs. uncomfortable?',
        placeholder: 'Example: I\'m comfortable with routine, uncomfortable with surprises or last-minute changes...',
        helperText: 'What environments or situations help you thrive or cause stress?',
        required: false,
      },
    ],
  },
  {
    sectionId: 'triggers',
    sectionName: 'Your Triggers & Patterns',
    sectionDescription: 'Help others understand what causes you stress',
    icon: 'BoltIcon',
    skippable: false,
    questions: [
      {
        id: 'triggers_q1',
        question: 'Describe a recent time you became stressed or upset. What happened?',
        placeholder: 'Example: Last week I got overwhelmed when too many things were happening at once...',
        helperText: 'Think about the situation, what led up to it, and how you reacted',
        required: true,
      },
      {
        id: 'triggers_q2',
        question: 'What situations or transitions tend to be challenging for you?',
        placeholder: 'Example: Switching between tasks, loud environments, being put on the spot...',
        helperText: 'Consider daily routines, social situations, or specific environments',
        required: false,
      },
      {
        id: 'triggers_q3',
        question: 'What typically helps when you\'re struggling?',
        placeholder: 'Example: Taking a break alone, going for a walk, talking it through with someone...',
        helperText: 'What de-escalation strategies work for you?',
        required: false,
      },
    ],
  },
  {
    sectionId: 'what_works',
    sectionName: 'What Works for You',
    sectionDescription: 'Share what helps you thrive',
    icon: 'SparklesIcon',
    skippable: false,
    questions: [
      {
        id: 'works_q1',
        question: 'What do you need from the people around you to feel supported?',
        placeholder: 'Example: I need advance notice before plans change, I need verbal affirmation, I need space to think...',
        helperText: 'Think about what consistently helps you feel good',
        required: true,
      },
      {
        id: 'works_q2',
        question: 'Think of a time things went really well at home. What made the difference?',
        placeholder: 'Example: When we had a calm morning with no rushing, the whole day felt better...',
        helperText: 'What specific conditions or actions led to success?',
        required: false,
      },
      {
        id: 'works_q3',
        question: 'What motivates or excites you?',
        placeholder: 'Example: Working toward a meaningful goal, quality time with family, learning something new...',
        helperText: 'What gets you engaged and energized?',
        required: false,
      },
    ],
  },
  {
    sectionId: 'boundaries',
    sectionName: 'Your Boundaries & Needs',
    sectionDescription: 'What others should know to support you well',
    icon: 'ShieldCheckIcon',
    skippable: true,
    questions: [
      {
        id: 'boundaries_q1',
        question: 'What boundaries are important to you?',
        placeholder: 'Example: I need alone time after work before engaging, don\'t interrupt me when I\'m focused...',
        helperText: 'What should the people around you know and respect?',
        required: false,
      },
      {
        id: 'boundaries_q2',
        question: 'What do others need to know to interact well with you?',
        placeholder: 'Example: I warm up slowly, I prefer direct communication, I need time to process before responding...',
        helperText: 'Important context for the people in your life',
        required: false,
      },
      {
        id: 'boundaries_q3',
        question: 'What approaches or behaviors should be avoided with you?',
        placeholder: 'Example: Don\'t spring things on me, don\'t dismiss my feelings, avoid sarcasm when I\'m upset...',
        helperText: 'What makes things worse?',
        required: false,
      },
    ],
  },
  {
    sectionId: 'communication',
    sectionName: 'How You Communicate',
    sectionDescription: 'Help others understand your communication style',
    icon: 'ChatBubbleLeftRightIcon',
    skippable: true,
    questions: [
      {
        id: 'communication_q1',
        question: 'How do you prefer to communicate when something is bothering you?',
        placeholder: 'Example: I need time to think before talking, I prefer writing it down first, I want to talk right away...',
        helperText: 'What\'s your natural style when dealing with difficult topics?',
        required: false,
      },
      {
        id: 'communication_q2',
        question: 'How do you show love or appreciation?',
        placeholder: 'Example: I show love through acts of service, quality time, words of affirmation...',
        helperText: 'How do you naturally express care for others?',
        required: false,
      },
      {
        id: 'communication_q3',
        question: 'How do you prefer to receive love or appreciation?',
        placeholder: 'Example: I feel most loved when someone gives me their full attention, helps without being asked...',
        helperText: 'What makes you feel valued and cared for?',
        required: false,
      },
    ],
  },
];

/**
 * Get self-onboarding sections.
 * These are the questions a person answers about themselves.
 */
export function getSelfOnboardingSections(): OnboardingSection[] {
  return [...SELF_ONBOARDING_SECTIONS];
}
