/**
 * Demo Onboarding Questions Configuration
 *
 * Shortened questionnaire for demo purposes - focuses on key questions
 * to demonstrate the full flow quickly (< 5 minutes)
 */

import { OnboardingSection } from './onboarding-questions';

/**
 * Demo onboarding sections - streamlined for quick demonstration
 * Only includes essential questions to showcase AI content generation
 */
export const DEMO_ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'overview',
    sectionName: 'Overview',
    sectionDescription: 'A quick introduction to {{personName}}',
    icon: 'UserCircleIcon',
    skippable: false,
    questions: [
      {
        id: 'overview_q1',
        question: 'What does {{personName}} like? What brings them joy?',
        placeholder: 'Example: Loves playing Minecraft, building with LEGO, riding his bike...',
        helperText: 'Think about their favorite activities and interests',
        required: true
      }
    ]
  },
  {
    sectionId: 'triggers',
    sectionName: 'Triggers & Challenges',
    sectionDescription: 'What causes stress or frustration',
    icon: 'BoltIcon',
    skippable: false,
    questions: [
      {
        id: 'triggers_q1',
        question: 'Describe a recent time {{personName}} became upset. What happened?',
        placeholder: 'Example: Last night during homework, he got frustrated when he couldn\'t solve a math problem...',
        helperText: 'Think about what triggered them and how they reacted',
        required: true
      },
      {
        id: 'triggers_q2',
        question: 'What typically helps when {{personName}} is struggling?',
        placeholder: 'Example: Taking a break to bounce on the trampoline, listening to music...',
        helperText: 'What calms them down or helps them refocus?',
        required: false
      }
    ]
  },
  {
    sectionId: 'what_works',
    sectionName: 'What Works',
    sectionDescription: 'Strategies that have been effective',
    icon: 'SparklesIcon',
    skippable: false,
    questions: [
      {
        id: 'works_q1',
        question: 'What strategies work well with {{personName}}?',
        placeholder: 'Example: Using a visual timer, giving 5-minute warnings before transitions, offering choices...',
        helperText: 'Think about approaches that consistently work',
        required: true
      }
    ]
  },
  {
    sectionId: 'self_worth',
    sectionName: 'Self-Worth',
    sectionDescription: 'How {{personName}} feels about themselves',
    icon: 'SparklesIcon',
    emoji: '✨',
    skippable: false,
    questions: [
      {
        id: 'sw_global',
        question: 'On the whole, {{personName}} is satisfied with themselves',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 4,
          minLabel: 'Strongly Disagree',
          maxLabel: 'Strongly Agree',
          midLabel: 'Neutral',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'What makes you say this?',
        clinicalSource: 'RSES Item 1',
        scoringDomain: 'Global Self-Worth',
        required: true
      }
    ]
  },
  {
    sectionId: 'strengths',
    sectionName: 'Character Strengths',
    sectionDescription: 'What are {{personName}}\'s positive qualities?',
    icon: 'FireIcon',
    emoji: '💪',
    skippable: false,
    questions: [
      {
        id: 'via_creativity',
        question: '{{personName}} thinks of new and original ways to do things',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'Very Unlike Them',
          maxLabel: 'Very Like Them',
          midLabel: 'Neutral',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe an example of their creativity...',
        clinicalSource: 'VIA-IS Creativity',
        scoringDomain: 'Wisdom & Knowledge',
        required: true
      },
      {
        id: 'via_perseverance',
        question: '{{personName}} finishes what they start despite obstacles',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'Very Unlike Them',
          maxLabel: 'Very Like Them',
          midLabel: 'Neutral',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe a time they persevered...',
        clinicalSource: 'VIA-IS Perseverance',
        scoringDomain: 'Courage',
        required: true
      }
    ]
  }
];

/**
 * Pre-filled demo answers for "Alex" (8-year-old boy)
 * Use these for fastest demo experience
 */
export const DEMO_PREFILLED_ANSWERS = {
  overview: {
    overview_q1: 'Alex loves playing Minecraft and building elaborate structures. He\'s really into LEGO, especially the Technic sets. He gets excited about science experiments and loves riding his bike around the neighborhood with friends.'
  },
  triggers: {
    triggers_q1: 'Last night during homework, Alex got really frustrated with a long division problem. He threw his pencil across the room and said "I\'m stupid, I can\'t do this!" He started crying and refused to continue. It took about 20 minutes before he calmed down enough to try again.',
    triggers_q2: 'Taking a movement break really helps - he bounces on the trampoline for 5 minutes or does jumping jacks. Breaking tasks into smaller chunks also works. If he\'s really upset, he needs about 10-15 minutes alone in his room with his noise-canceling headphones listening to instrumental music.'
  },
  what_works: {
    works_q1: 'Visual timers work great for homework time. Giving him choices (do you want to start with math or reading?) helps with cooperation. Praising specific things he does well ("I noticed you checked your work carefully!") keeps him motivated. Using fidget tools during homework helps him focus better.'
  },
  self_worth: {
    sw_global: '2', // Disagree - struggles with self-esteem
    sw_global_comment: 'Alex often compares himself negatively to his older sister who excels academically. He frequently says things like "I\'m not good at anything" especially after struggling with schoolwork.'
  },
  strengths: {
    via_creativity: '5', // Very like them
    via_creativity_comment: 'Alex built an entire working elevator in Minecraft using redstone circuits. He comes up with creative solutions to problems and loves experimenting with new building techniques.',
    via_perseverance: '2', // Unlike them
    via_perseverance_comment: 'Alex tends to give up quickly when something is hard, especially with homework. However, he will persist for hours on building projects that interest him.'
  }
};

/**
 * Get total question count for demo onboarding
 */
export function getDemoQuestionCount(): number {
  return DEMO_ONBOARDING_SECTIONS.reduce(
    (count, section) => count + section.questions.length,
    0
  );
}

/**
 * Get estimated time for demo onboarding
 */
export function getDemoEstimatedTime(): string {
  const questionCount = getDemoQuestionCount();
  const minutes = Math.ceil(questionCount * 0.8); // Shorter per question for demo
  return `${minutes} minutes`;
}
