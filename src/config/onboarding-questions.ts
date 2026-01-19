/**
 * Onboarding Questions Configuration
 *
 * Defines the conversational questions asked during manual onboarding
 * for each section type and relationship type
 */

import { RelationshipType } from '@/types/person-manual';

// ==================== Question Type System ====================

export type QuestionType =
  | 'text'              // Free-form textarea (default/legacy)
  | 'likert'            // 1-7 scale (Strongly Disagree → Strongly Agree)
  | 'frequency'         // Never/Rarely/Sometimes/Often/Always
  | 'severity'          // Mild/Moderate/Significant
  | 'rating'            // 1-5 stars/numbers
  | 'multiple_choice'   // Single selection
  | 'checkbox'          // Multiple selections
  | 'yes_no'            // Binary
  | 'forced_choice'     // Pick one from pair (Love Languages style)
  | 'composite';        // Multiple sub-questions

export interface QuestionOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface ScaleConfig {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  midLabel?: string;
  type: 'numeric' | 'semantic';
}

export interface OnboardingQuestion {
  id: string;
  question: string;
  questionType?: QuestionType;  // Defaults to 'text' for backward compatibility

  // Legacy text question fields (still supported)
  placeholder?: string;
  helperText?: string;
  required?: boolean;

  // Type-specific configurations
  options?: QuestionOption[];        // For multiple_choice, checkbox, forced_choice
  scale?: ScaleConfig;               // For likert, frequency, severity, rating
  subQuestions?: OnboardingQuestion[]; // For composite questions

  // Qualitative embellishment
  allowQualitativeComment?: boolean;  // Allow optional text after structured answer
  qualitativePlaceholder?: string;    // Placeholder for qualitative comment

  // Clinical metadata
  clinicalSource?: string;     // e.g., "VIA-IS Item 7", "Vanderbilt ADHD Item 3"
  scoringDomain?: string;      // e.g., "Openness", "Inattention", "Attachment Anxiety"
}

export interface OnboardingSection {
  sectionId: string;
  sectionName: string;
  sectionDescription: string;
  icon: string; // Heroicon name
  emoji?: string; // Optional emoji for section indicator
  questions: OnboardingQuestion[];
  skippable: boolean;
}

// ==================== Universal Sections ====================

export const UNIVERSAL_ONBOARDING_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'overview',
    sectionName: 'Overview',
    sectionDescription: 'A personal introduction to help others understand them',
    icon: 'UserCircleIcon',
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
    icon: 'BoltIcon',
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
    icon: 'SparklesIcon',
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
    icon: 'ShieldCheckIcon',
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
    sectionName: 'Character Strengths (VIA Survey)',
    sectionDescription: 'Rate how well each characteristic describes {{personName}}',
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
        qualitativePlaceholder: 'Describe a specific example of their creativity...',
        clinicalSource: 'VIA-IS Creativity',
        scoringDomain: 'Wisdom & Knowledge',
        required: true
      },
      {
        id: 'via_curiosity',
        question: '{{personName}} is curious about many different things',
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
        qualitativePlaceholder: 'What topics or areas are they most curious about?',
        clinicalSource: 'VIA-IS Curiosity',
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
        qualitativePlaceholder: 'Describe a time they persevered through difficulty...',
        clinicalSource: 'VIA-IS Perseverance',
        scoringDomain: 'Courage',
        required: true
      },
      {
        id: 'via_kindness',
        question: '{{personName}} is kind and generous to others',
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
        qualitativePlaceholder: 'Share an example of their kindness...',
        clinicalSource: 'VIA-IS Kindness',
        scoringDomain: 'Humanity',
        required: true
      },
      {
        id: 'via_social_intelligence',
        question: '{{personName}} is aware of what other people are thinking and feeling',
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
        qualitativePlaceholder: 'How do they demonstrate social awareness?',
        clinicalSource: 'VIA-IS Social Intelligence',
        scoringDomain: 'Humanity',
        required: true
      },
      {
        id: 'via_teamwork',
        question: '{{personName}} works well as part of a group or team',
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
        qualitativePlaceholder: 'Describe their teamwork style...',
        clinicalSource: 'VIA-IS Teamwork',
        scoringDomain: 'Justice',
        required: true
      },
      {
        id: 'via_fairness',
        question: '{{personName}} treats everyone fairly and gives them a chance',
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
        qualitativePlaceholder: 'How do they show fairness?',
        clinicalSource: 'VIA-IS Fairness',
        scoringDomain: 'Justice',
        required: true
      },
      {
        id: 'via_self_regulation',
        question: '{{personName}} controls their emotions and impulses',
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
        qualitativePlaceholder: 'Describe their self-control abilities...',
        clinicalSource: 'VIA-IS Self-Regulation',
        scoringDomain: 'Temperance',
        required: true
      },
      {
        id: 'via_gratitude',
        question: '{{personName}} is aware of and thankful for good things that happen',
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
        qualitativePlaceholder: 'How do they express gratitude?',
        clinicalSource: 'VIA-IS Gratitude',
        scoringDomain: 'Transcendence',
        required: true
      },
      {
        id: 'via_hope',
        question: '{{personName}} expects the best and works to achieve it',
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
        qualitativePlaceholder: 'Describe their optimistic outlook...',
        clinicalSource: 'VIA-IS Hope',
        scoringDomain: 'Transcendence',
        required: true
      }
    ]
  }
];

// ==================== Child-Specific Sections ====================

// Screening section - determines if detailed neurodivergence sections are shown
export const CHILD_SCREENING_SECTION: OnboardingSection = {
  sectionId: 'screening',
  sectionName: 'Background & Context',
  sectionDescription: 'Let\'s start with some basic information about {{personName}}',
  icon: 'ClipboardDocumentCheckIcon',
  emoji: '📋',
  skippable: false,
  questions: [
    {
      id: 'screening_level',
      question: 'Which best describes {{personName}}?',
      questionType: 'multiple_choice',
      helperText: 'This helps us tailor the questionnaire to focus on relevant areas.',
      required: true,
      options: [
        {
          value: 'typical',
          label: 'Typical development – no major concerns',
          description: 'Generally developing as expected with no significant challenges'
        },
        {
          value: 'mild',
          label: 'Some behavioral challenges, but manageable',
          description: 'Occasional difficulties that don\'t significantly impact daily life'
        },
        {
          value: 'moderate',
          label: 'Moderate challenges with attention, behavior, or emotions',
          description: 'Regular challenges that require specific strategies'
        },
        {
          value: 'significant',
          label: 'Significant challenges that impact daily life',
          description: 'Ongoing difficulties that affect home, school, or social situations'
        },
        {
          value: 'diagnosed',
          label: 'Has formal diagnosis (ADHD, autism, etc.)',
          description: 'Has been diagnosed with a neurodevelopmental or behavioral condition'
        },
        {
          value: 'unsure',
          label: 'I don\'t know',
          description: 'I\'m not sure which category best describes them'
        },
        {
          value: 'prefer_not_say',
          label: 'Prefer not to say',
          description: 'I would rather not specify at this time'
        }
      ]
    }
  ]
};

// Detailed neurodivergence sections - only shown if screening indicates need
export const CHILD_NEURODIVERGENCE_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'adhd_screening',
    sectionName: 'Attention & Focus',
    sectionDescription: 'Understanding their attention patterns and focus challenges',
    icon: 'SparklesIcon',
    emoji: '🎯',
    skippable: false,
    questions: [
      {
        id: 'adhd_inattention',
        question: 'How often does {{personName}} have difficulty sustaining attention during tasks or activities?',
        questionType: 'frequency',
        scale: {
          min: 0,
          max: 4,
          minLabel: 'Never',
          maxLabel: 'Very Often',
          type: 'semantic'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe specific situations where this happens...',
        clinicalSource: 'Vanderbilt ADHD - Inattention',
        scoringDomain: 'Inattention',
        required: true
      },
      {
        id: 'adhd_organization',
        question: 'How often does {{personName}} have difficulty organizing tasks and activities?',
        questionType: 'frequency',
        scale: {
          min: 0,
          max: 4,
          minLabel: 'Never',
          maxLabel: 'Very Often',
          type: 'semantic'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'What organizational challenges do you notice?',
        clinicalSource: 'Vanderbilt ADHD - Organization',
        scoringDomain: 'Executive Function',
        required: true
      },
      {
        id: 'adhd_hyperactivity',
        question: 'How often does {{personName}} fidget, tap hands/feet, or seem unable to stay still?',
        questionType: 'frequency',
        scale: {
          min: 0,
          max: 4,
          minLabel: 'Never',
          maxLabel: 'Very Often',
          type: 'semantic'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe their movement patterns...',
        clinicalSource: 'Vanderbilt ADHD - Hyperactivity',
        scoringDomain: 'Hyperactivity',
        required: true
      },
      {
        id: 'adhd_impulsivity',
        question: 'How often does {{personName}} blurt out answers before questions are completed or interrupt others?',
        questionType: 'frequency',
        scale: {
          min: 0,
          max: 4,
          minLabel: 'Never',
          maxLabel: 'Very Often',
          type: 'semantic'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Give examples of impulsive behaviors...',
        clinicalSource: 'Vanderbilt ADHD - Impulsivity',
        scoringDomain: 'Impulsivity',
        required: true
      }
    ]
  },
  {
    sectionId: 'sensory_processing',
    sectionName: 'Sensory Processing',
    sectionDescription: 'How they experience and respond to sensory input',
    icon: 'EyeIcon',
    emoji: '👂',
    skippable: false,
    questions: [
      {
        id: 'sensory_tactile',
        question: 'How sensitive is {{personName}} to touch, textures, or clothing?',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'Not Sensitive',
          maxLabel: 'Extremely Sensitive',
          midLabel: 'Moderately',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe specific tactile sensitivities (tags, fabrics, textures)...',
        scoringDomain: 'Tactile Sensitivity',
        required: true
      },
      {
        id: 'sensory_auditory',
        question: 'How does {{personName}} respond to loud noises or busy environments?',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'No Issues',
          maxLabel: 'Very Distressed',
          midLabel: 'Somewhat Bothered',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'What sounds or environments are challenging?',
        scoringDomain: 'Auditory Sensitivity',
        required: true
      },
      {
        id: 'sensory_visual',
        question: 'Does {{personName}} have visual sensitivities (bright lights, busy patterns)?',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'No Sensitivity',
          maxLabel: 'Highly Sensitive',
          midLabel: 'Some Sensitivity',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe visual sensitivities...',
        scoringDomain: 'Visual Sensitivity',
        required: true
      }
    ]
  },
  {
    sectionId: 'executive_function',
    sectionName: 'Executive Function',
    sectionDescription: 'Planning, transitions, and self-regulation abilities',
    icon: 'CogIcon',
    emoji: '🧠',
    skippable: false,
    questions: [
      {
        id: 'ef_transitions',
        question: 'How does {{personName}} handle transitions between activities?',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'Very Smoothly',
          maxLabel: 'Very Difficult',
          midLabel: 'Somewhat Challenging',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe what happens during transitions...',
        scoringDomain: 'Task Switching',
        required: true
      },
      {
        id: 'ef_planning',
        question: 'How well does {{personName}} plan ahead or think through consequences?',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'Plans Well',
          maxLabel: 'Struggles Significantly',
          midLabel: 'Needs Support',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Give examples of planning challenges or successes...',
        scoringDomain: 'Planning & Foresight',
        required: true
      },
      {
        id: 'ef_working_memory',
        question: 'How well does {{personName}} remember multi-step instructions?',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'Remembers Easily',
          maxLabel: 'Forgets Quickly',
          midLabel: 'Needs Reminders',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'How many steps can they typically remember?',
        scoringDomain: 'Working Memory',
        required: true
      }
    ]
  },
  {
    sectionId: 'emotional_regulation',
    sectionName: 'Emotional Regulation',
    sectionDescription: 'How they experience and manage strong emotions',
    icon: 'HeartIcon',
    emoji: '💙',
    skippable: false,
    questions: [
      {
        id: 'emotion_intensity',
        question: 'How intense are {{personName}}\'s emotional reactions?',
        questionType: 'likert',
        scale: {
          min: 1,
          max: 5,
          minLabel: 'Mild',
          maxLabel: 'Very Intense',
          midLabel: 'Moderate',
          type: 'numeric'
        },
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe what their big emotions look like...',
        scoringDomain: 'Emotional Intensity',
        required: true
      },
      {
        id: 'emotion_recovery',
        question: 'How long does it typically take {{personName}} to calm down after being upset?',
        questionType: 'multiple_choice',
        options: [
          { value: '1-5', label: '1-5 minutes', description: 'Recovers quickly with minimal support' },
          { value: '5-15', label: '5-15 minutes', description: 'Needs some time and support' },
          { value: '15-30', label: '15-30 minutes', description: 'Requires extended co-regulation' },
          { value: '30-60', label: '30-60 minutes', description: 'Long recovery period needed' },
          { value: '60+', label: 'More than an hour', description: 'Very extended recovery time' },
          { value: 'varies', label: 'Varies significantly', description: 'Recovery time differs greatly depending on the situation' },
          { value: 'dont_know', label: 'I don\'t know', description: 'I haven\'t observed this enough to say' }
        ],
        allowQualitativeComment: true,
        qualitativePlaceholder: 'What helps them recover?',
        scoringDomain: 'Emotional Recovery',
        required: true
      },
      {
        id: 'emotion_coregulation',
        question: 'What level of support does {{personName}} need to calm down?',
        questionType: 'multiple_choice',
        options: [
          { value: 'independent', label: 'Can self-soothe independently', description: 'Uses own strategies effectively' },
          { value: 'verbal', label: 'Needs verbal reassurance', description: 'Benefits from talking through feelings' },
          { value: 'physical', label: 'Needs physical comfort', description: 'Requires hugs, holding, or physical presence' },
          { value: 'full', label: 'Needs full co-regulation', description: 'Requires active adult support and presence throughout' },
          { value: 'varies', label: 'Varies by situation', description: 'Support needs differ depending on the context' },
          { value: 'dont_know', label: 'I don\'t know', description: 'I haven\'t observed this enough to say' }
        ],
        allowQualitativeComment: true,
        qualitativePlaceholder: 'Describe what works best...',
        scoringDomain: 'Co-regulation Needs',
        required: true
      }
    ]
  }
];

export const CHILD_BASIC_SECTIONS: OnboardingSection[] = [
  {
    sectionId: 'development',
    sectionName: 'Development & Learning',
    sectionDescription: 'How they learn and any developmental considerations',
    icon: 'BookOpenIcon',
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
    icon: 'HeartIcon',
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
    icon: 'HeartIcon',
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
    icon: 'ChatBubbleLeftRightIcon',
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
    icon: 'BriefcaseIcon',
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
    icon: 'UsersIcon',
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
 * For children, returns screening section first - detailed sections added dynamically based on screening response
 */
export function getOnboardingSections(relationshipType: RelationshipType): OnboardingSection[] {
  const sections = [...UNIVERSAL_ONBOARDING_SECTIONS];

  switch (relationshipType) {
    case 'child':
      // Start with screening section - determines if neurodivergence sections are shown
      sections.unshift(CHILD_SCREENING_SECTION);
      // Basic development section always included
      sections.push(...CHILD_BASIC_SECTIONS);
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
 * Get neurodivergence sections for children based on screening response
 * Returns detailed sections if screening indicates moderate/significant challenges or diagnosis
 */
export function getNeurodivergenceSections(screeningResponse: string): OnboardingSection[] {
  // Show detailed neurodivergence sections for moderate, significant, or diagnosed
  if (['moderate', 'significant', 'diagnosed'].includes(screeningResponse)) {
    return CHILD_NEURODIVERGENCE_SECTIONS;
  }
  return [];
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
      placeholder: q.placeholder?.replace(/\{\{personName\}\}/g, personName),
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
