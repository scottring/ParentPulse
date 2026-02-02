/**
 * Onboarding Questions Configuration
 *
 * Defines the conversational questions asked during manual onboarding
 * for each section type and relationship type
 */

import { RelationshipType } from '@/types/person-manual';

// ==================== Relationship-Specific Placeholder Text ====================

/**
 * Age and relationship-appropriate placeholder examples for each question
 */
export const RELATIONSHIP_PLACEHOLDERS: Record<RelationshipType, Record<string, { placeholder?: string; helperText?: string }>> = {
  child: {
    // Overview
    overview_q1: {
      placeholder: 'Example: Loves Legos, playing outside, reading comic books, time with grandparents...',
      helperText: 'Think about their favorite toys, activities, and what makes them light up'
    },
    overview_q2: {
      placeholder: 'Example: Dislikes loud noises, hates being rushed, gets overwhelmed by too many choices...',
      helperText: 'What drains their energy or causes meltdowns?'
    },
    overview_q3: {
      placeholder: 'Example: Loves earning screen time, motivated by praise, wants to be helpful...',
      helperText: 'What reward systems or motivations work for them?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable with routine, needs warnings before transitions, uncomfortable with new foods...',
      helperText: 'What helps them feel safe vs. anxious?'
    },
    // Triggers
    triggers_q1: {
      placeholder: 'Example: Last week during homework, they threw their pencil when they couldn\'t solve a math problem...',
      helperText: 'Describe what happened, what led up to it, and how they reacted'
    },
    triggers_q2: {
      placeholder: 'Example: Transitions from play to homework, getting ready for school, bedtime routines...',
      helperText: 'Think about daily routines, school situations, or social challenges'
    },
    triggers_q3: {
      placeholder: 'Example: Counting to 10, going to their calm-down corner, squeezing a stress ball...',
      helperText: 'What de-escalation strategies work when they\'re upset?'
    },
    // What Works
    works_q1: {
      placeholder: 'Example: Visual timers, giving 5-minute warnings, offering two choices instead of demands...',
      helperText: 'What parenting approaches consistently work?'
    },
    works_q2: {
      placeholder: 'Example: When we laid out clothes the night before, morning went smoothly...',
      helperText: 'What made that success happen?'
    },
    works_q3: {
      placeholder: 'Example: Earning stickers, special one-on-one time, getting to pick the movie...',
      helperText: 'What gets them engaged and cooperative?'
    },
    // Boundaries
    boundaries_q1: {
      placeholder: 'Example: Needs personal space when upset, has a special blanket no one else touches...',
      helperText: 'What should babysitters, teachers, and others respect?'
    },
    boundaries_q2: {
      placeholder: 'Example: Warms up slowly, needs time to process questions, does better with visual instructions...',
      helperText: 'Important info for teachers, coaches, or caregivers'
    },
    boundaries_q3: {
      placeholder: 'Example: Don\'t compare to siblings, never force hugs, avoid asking "why did you do that?"...',
      helperText: 'What approaches backfire or make things worse?'
    }
  },
  spouse: {
    overview_q1: {
      placeholder: 'Example: Loves weekend hikes, energized by social gatherings, enjoys cooking together...',
      helperText: 'What brings them joy and energy in your relationship?'
    },
    overview_q2: {
      placeholder: 'Example: Drained by work stress, dislikes last-minute plan changes, needs alone time to recharge...',
      helperText: 'What depletes their energy or causes tension?'
    },
    overview_q3: {
      placeholder: 'Example: Driven by career goals, motivated by family security, values quality time...',
      helperText: 'What are their core values and life priorities?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable with planned activities, uncomfortable discussing finances under stress...',
      helperText: 'What environments help vs. hinder your connection?'
    },
    triggers_q1: {
      placeholder: 'Example: Got frustrated when I made weekend plans without checking first...',
      helperText: 'Describe a recent conflict or moment of tension'
    },
    triggers_q2: {
      placeholder: 'Example: Financial discussions, feeling unheard, when work bleeds into family time...',
      helperText: 'What topics or situations tend to cause friction?'
    },
    triggers_q3: {
      placeholder: 'Example: Giving space to cool down, physical affection, acknowledging their feelings first...',
      helperText: 'What helps when they\'re stressed or you\'re in conflict?'
    },
    works_q1: {
      placeholder: 'Example: Weekly check-ins, sharing calendars, expressing appreciation daily...',
      helperText: 'What communication strategies strengthen your relationship?'
    },
    works_q2: {
      placeholder: 'Example: When we planned our vacation together step-by-step, we both felt heard...',
      helperText: 'What made that success happen?'
    },
    works_q3: {
      placeholder: 'Example: Words of affirmation, acts of service, quality time without phones...',
      helperText: 'What makes them feel loved and appreciated?'
    },
    boundaries_q1: {
      placeholder: 'Example: Needs 30 minutes alone after work, doesn\'t discuss work on weekends...',
      helperText: 'What boundaries keep your relationship healthy?'
    },
    boundaries_q2: {
      placeholder: 'Example: Prefers direct communication, needs time to process big decisions...',
      helperText: 'What should you remember when navigating challenges?'
    },
    boundaries_q3: {
      placeholder: 'Example: Don\'t bring up sensitive topics when tired, avoid "you always" statements...',
      helperText: 'What approaches make conflicts worse?'
    }
  },
  elderly_parent: {
    overview_q1: {
      placeholder: 'Example: Loves gardening, enjoys visits from grandchildren, likes watching old movies...',
      helperText: 'What activities and interactions bring them joy?'
    },
    overview_q2: {
      placeholder: 'Example: Frustrated by technology, dislikes feeling dependent, tires easily in crowds...',
      helperText: 'What situations are challenging or draining for them?'
    },
    overview_q3: {
      placeholder: 'Example: Wants to maintain independence, values family traditions, needs to feel useful...',
      helperText: 'What matters most to them at this stage of life?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable in their home, uncomfortable with change or new caregivers...',
      helperText: 'What helps them feel secure vs. anxious?'
    },
    triggers_q1: {
      placeholder: 'Example: Got upset when I suggested they stop driving after the fender bender...',
      helperText: 'Describe a recent difficult conversation or incident'
    },
    triggers_q2: {
      placeholder: 'Example: Discussions about moving, medical appointments, feeling rushed...',
      helperText: 'What situations tend to cause distress or resistance?'
    },
    triggers_q3: {
      placeholder: 'Example: Giving them time, involving them in decisions, reminiscing about the past...',
      helperText: 'What helps when they\'re upset or anxious?'
    },
    works_q1: {
      placeholder: 'Example: Visiting at consistent times, writing things down, involving them in meal planning...',
      helperText: 'What approaches help your caregiving go smoothly?'
    },
    works_q2: {
      placeholder: 'Example: When I asked for their advice on my garden, they felt valued and capable...',
      helperText: 'What made that interaction positive?'
    },
    works_q3: {
      placeholder: 'Example: Feeling needed, visits from family, sharing memories and stories...',
      helperText: 'What gives them purpose and joy?'
    },
    boundaries_q1: {
      placeholder: 'Example: Respects their right to make some decisions, even if risky...',
      helperText: 'What autonomy is important to preserve?'
    },
    boundaries_q2: {
      placeholder: 'Example: Hearing loss - speak clearly facing them, needs extra time to process...',
      helperText: 'What should family and caregivers know?'
    },
    boundaries_q3: {
      placeholder: 'Example: Don\'t talk about them like they\'re not there, avoid rushing them...',
      helperText: 'What approaches feel disrespectful or upsetting?'
    }
  },
  friend: {
    overview_q1: {
      placeholder: 'Example: Loves trying new restaurants, energized by deep conversations, enjoys hiking...',
      helperText: 'What activities do you enjoy together?'
    },
    overview_q2: {
      placeholder: 'Example: Going through work stress, drained by family obligations, needs alone time...',
      helperText: 'What\'s challenging in their life right now?'
    },
    overview_q3: {
      placeholder: 'Example: Career-focused, values loyalty, going through a major life transition...',
      helperText: 'What drives them and what are they working toward?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable with last-minute plans, uncomfortable with large group gatherings...',
      helperText: 'What helps your friendship thrive?'
    },
    triggers_q1: {
      placeholder: 'Example: Seemed hurt when I forgot to check in during their tough week...',
      helperText: 'Describe a recent misunderstanding or tension'
    },
    triggers_q2: {
      placeholder: 'Example: Sensitive about their job search, stressed by family topics...',
      helperText: 'What topics or situations require care?'
    },
    triggers_q3: {
      placeholder: 'Example: Letting them vent without fixing, checking in consistently...',
      helperText: 'How do you best support them?'
    },
    works_q1: {
      placeholder: 'Example: Regular check-in texts, remembering important dates, being a good listener...',
      helperText: 'What keeps your friendship strong?'
    },
    works_q2: {
      placeholder: 'Example: When I just listened without giving advice, they felt truly heard...',
      helperText: 'What made that moment meaningful?'
    },
    works_q3: {
      placeholder: 'Example: Quality time, acts of service, words of encouragement...',
      helperText: 'How does this friend feel most supported?'
    },
    boundaries_q1: {
      placeholder: 'Example: Respects their need for space, doesn\'t push for details about their dating life...',
      helperText: 'What boundaries help your friendship stay healthy?'
    },
    boundaries_q2: {
      placeholder: 'Example: Going through a divorce, has a history with anxiety, prefers texts over calls...',
      helperText: 'What context helps you be a better friend?'
    },
    boundaries_q3: {
      placeholder: 'Example: Avoid unsolicited advice, don\'t bring up their ex...',
      helperText: 'What topics or approaches should you avoid?'
    }
  },
  professional: {
    overview_q1: {
      placeholder: 'Example: Passionate about their projects, energized by collaboration, values innovation...',
      helperText: 'What drives them professionally?'
    },
    overview_q2: {
      placeholder: 'Example: Frustrated by bureaucracy, stressed by tight deadlines, dislikes unnecessary meetings...',
      helperText: 'What work situations are challenging for them?'
    },
    overview_q3: {
      placeholder: 'Example: Career advancement, work-life balance, making an impact in their field...',
      helperText: 'What are their professional goals and values?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable with structured agendas, uncomfortable with ambiguity...',
      helperText: 'What work environments help them thrive?'
    },
    triggers_q1: {
      placeholder: 'Example: Got frustrated when the project scope changed without notice...',
      helperText: 'Describe a recent work challenge or conflict'
    },
    triggers_q2: {
      placeholder: 'Example: Last-minute changes, feeling micromanaged, unclear expectations...',
      helperText: 'What work situations tend to cause stress?'
    },
    triggers_q3: {
      placeholder: 'Example: Clear communication, written follow-ups, giving them autonomy...',
      helperText: 'What helps when work gets stressful?'
    },
    works_q1: {
      placeholder: 'Example: Regular 1:1s, clear written expectations, async communication...',
      helperText: 'What makes your working relationship effective?'
    },
    works_q2: {
      placeholder: 'Example: When we aligned on goals upfront, the project went smoothly...',
      helperText: 'What made that collaboration successful?'
    },
    works_q3: {
      placeholder: 'Example: Recognition for their work, opportunities to learn, autonomy...',
      helperText: 'What motivates them professionally?'
    },
    boundaries_q1: {
      placeholder: 'Example: Doesn\'t check email after 6pm, prefers scheduled meetings over drop-ins...',
      helperText: 'What professional boundaries do they maintain?'
    },
    boundaries_q2: {
      placeholder: 'Example: Prefers direct feedback, needs time to process before responding...',
      helperText: 'What communication style works best?'
    },
    boundaries_q3: {
      placeholder: 'Example: Don\'t assign tasks verbally without follow-up, avoid last-minute requests...',
      helperText: 'What approaches create friction?'
    }
  },
  sibling: {
    overview_q1: {
      placeholder: 'Example: Loves family gatherings, passionate about their career, enjoys outdoor activities...',
      helperText: 'What brings them joy in life?'
    },
    overview_q2: {
      placeholder: 'Example: Stressed by family drama, drained by their job, sensitive about comparisons...',
      helperText: 'What\'s challenging in their life?'
    },
    overview_q3: {
      placeholder: 'Example: Focused on their kids, driven by career goals, values independence...',
      helperText: 'What matters most to them right now?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable when visits are planned, uncomfortable with surprise drop-ins...',
      helperText: 'What helps your sibling relationship stay positive?'
    },
    triggers_q1: {
      placeholder: 'Example: Tension arose when I brought up how they handled mom\'s care...',
      helperText: 'Describe a recent conflict or sensitive moment'
    },
    triggers_q2: {
      placeholder: 'Example: Discussions about inheritance, comparisons to our childhood, parenting criticism...',
      helperText: 'What topics tend to cause tension?'
    },
    triggers_q3: {
      placeholder: 'Example: Giving space, focusing on shared memories, avoiding old family dynamics...',
      helperText: 'What helps when things get tense?'
    },
    works_q1: {
      placeholder: 'Example: Regular phone calls, planning family events together, respecting differences...',
      helperText: 'What keeps your sibling relationship healthy?'
    },
    works_q2: {
      placeholder: 'Example: When we planned mom\'s birthday together, we reconnected...',
      helperText: 'What made that interaction positive?'
    },
    works_q3: {
      placeholder: 'Example: Feeling included in family decisions, appreciation for their help...',
      helperText: 'What makes them feel valued in the family?'
    },
    boundaries_q1: {
      placeholder: 'Example: Respects their parenting choices, doesn\'t interfere in their marriage...',
      helperText: 'What boundaries keep your relationship healthy?'
    },
    boundaries_q2: {
      placeholder: 'Example: Going through a rough patch at work, sensitive about their weight...',
      helperText: 'What context helps you be a better sibling?'
    },
    boundaries_q3: {
      placeholder: 'Example: Don\'t bring up old resentments, avoid comparing our kids...',
      helperText: 'What topics or approaches should you avoid?'
    }
  },
  self: {
    overview_q1: {
      placeholder: 'Example: I love morning coffee rituals, feel energized by creative projects, enjoy deep conversations...',
      helperText: 'What activities and experiences bring you joy?'
    },
    overview_q2: {
      placeholder: 'Example: Drained by social obligations, dislike being rushed, find small talk exhausting...',
      helperText: 'What depletes your energy?'
    },
    overview_q3: {
      placeholder: 'Example: Driven to help others, motivated by learning, value authenticity and growth...',
      helperText: 'What are your core values and what drives you?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable with routine, uncomfortable with conflict, need alone time to recharge...',
      helperText: 'What environments help you thrive?'
    },
    triggers_q1: {
      placeholder: 'Example: Last week I snapped at my partner when I was already stressed about work...',
      helperText: 'Describe a recent time you felt overwhelmed or reactive'
    },
    triggers_q2: {
      placeholder: 'Example: Feeling unappreciated, tight deadlines, too many social commitments...',
      helperText: 'What situations tend to trigger stress or negative reactions?'
    },
    triggers_q3: {
      placeholder: 'Example: Going for a walk, journaling, talking to a friend, taking a break...',
      helperText: 'What helps you calm down or regain perspective?'
    },
    works_q1: {
      placeholder: 'Example: Morning routines, setting boundaries, regular exercise, scheduling downtime...',
      helperText: 'What strategies help you function at your best?'
    },
    works_q2: {
      placeholder: 'Example: When I prepared the night before, my morning was calm and productive...',
      helperText: 'What conditions led to that success?'
    },
    works_q3: {
      placeholder: 'Example: Making progress on goals, positive feedback, quality time with loved ones...',
      helperText: 'What motivates and energizes you?'
    },
    boundaries_q1: {
      placeholder: 'Example: Need alone time daily, don\'t respond to work after 7pm, protect weekend mornings...',
      helperText: 'What boundaries do you need to maintain wellbeing?'
    },
    boundaries_q2: {
      placeholder: 'Example: I need advance notice for plans, prefer text over calls, need time to process before responding...',
      helperText: 'What should others know to interact well with you?'
    },
    boundaries_q3: {
      placeholder: 'Example: Don\'t try to cheer me up when I\'m processing, avoid unsolicited advice...',
      helperText: 'What approaches from others make things worse?'
    }
  },
  other: {
    overview_q1: {
      placeholder: 'Example: Enjoys specific hobbies, energized by certain activities, values particular things...',
      helperText: 'What brings them joy or energy?'
    },
    overview_q2: {
      placeholder: 'Example: Finds certain situations draining, dislikes specific things...',
      helperText: 'What depletes their energy?'
    },
    overview_q3: {
      placeholder: 'Example: Motivated by specific goals, driven by certain values...',
      helperText: 'What drives them?'
    },
    overview_q4: {
      placeholder: 'Example: Comfortable with certain conditions, uncomfortable in specific situations...',
      helperText: 'What environments help them thrive?'
    },
    triggers_q1: {
      placeholder: 'Example: Describe a specific situation where they became stressed...',
      helperText: 'What happened and how did they react?'
    },
    triggers_q2: {
      placeholder: 'Example: Specific situations, transitions, or environments that are challenging...',
      helperText: 'What tends to cause difficulty?'
    },
    triggers_q3: {
      placeholder: 'Example: Specific strategies or approaches that help...',
      helperText: 'What helps when they\'re struggling?'
    },
    works_q1: {
      placeholder: 'Example: Specific approaches or strategies that work well...',
      helperText: 'What has been effective?'
    },
    works_q2: {
      placeholder: 'Example: Describe what made a positive situation work...',
      helperText: 'What led to success?'
    },
    works_q3: {
      placeholder: 'Example: Specific motivators or rewards that work...',
      helperText: 'What motivates them?'
    },
    boundaries_q1: {
      placeholder: 'Example: Specific limits or needs to respect...',
      helperText: 'What boundaries are important?'
    },
    boundaries_q2: {
      placeholder: 'Example: Important context others should know...',
      helperText: 'What helps interactions go well?'
    },
    boundaries_q3: {
      placeholder: 'Example: Topics or approaches to avoid...',
      helperText: 'What makes things worse?'
    }
  }
};

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
    sectionId: 'self_worth',
    sectionName: 'Self-Worth & Confidence',
    sectionDescription: 'Understanding how {{personName}} feels about themselves',
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
        qualitativePlaceholder: 'What makes you say this? Any specific examples?',
        clinicalSource: 'RSES Item 1',
        scoringDomain: 'Global Self-Worth',
        required: true
      },
      {
        id: 'sw_qualities',
        question: '{{personName}} feels that they have a number of good qualities',
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
        qualitativePlaceholder: 'What qualities does {{personName}} recognize in themselves?',
        clinicalSource: 'RSES Item 3',
        scoringDomain: 'Self-Perception',
        required: true
      },
      {
        id: 'sw_efficacy',
        question: '{{personName}} is able to do things as well as most other people',
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
        qualitativePlaceholder: 'In what areas does {{personName}} feel competent?',
        clinicalSource: 'RSES Item 4',
        scoringDomain: 'Self-Efficacy',
        required: true
      },
      {
        id: 'sw_acceptance',
        question: '{{personName}} takes a positive attitude toward themselves',
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
        qualitativePlaceholder: 'How does {{personName}} typically talk about or treat themselves?',
        clinicalSource: 'RSES Item 7',
        scoringDomain: 'Self-Acceptance',
        required: true
      },
      {
        id: 'sw_social',
        question: '{{personName}} feels they are a person of worth, at least on an equal plane with others',
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
        qualitativePlaceholder: 'How does {{personName}} compare themselves to peers or others?',
        clinicalSource: 'RSES Item 2',
        scoringDomain: 'Social Competence',
        required: true
      },
      {
        id: 'sw_physical',
        question: '{{personName}} feels comfortable with their body and physical abilities',
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
        qualitativePlaceholder: 'How does {{personName}} feel about their physical self?',
        clinicalSource: 'Physical Self-Concept',
        scoringDomain: 'Physical Competence',
        required: true
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
    case 'self':
      // Self manuals use universal sections - questions will be phrased differently via personalization
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
 * Replace {{personName}} placeholder, adjust pronouns, and apply relationship-specific placeholders
 */
export function personalizeQuestions(
  sections: OnboardingSection[],
  personName: string,
  relationshipType?: RelationshipType
): OnboardingSection[] {
  const isSelf = relationshipType === 'self';
  const placeholders = relationshipType ? RELATIONSHIP_PLACEHOLDERS[relationshipType] : undefined;

  const personalizeText = (text: string | undefined): string | undefined => {
    if (!text) return text;

    let result = text;

    if (isSelf) {
      // For self manuals, use "you/your" pronouns
      result = result
        .replace(/\{\{personName\}\}/g, 'you')
        .replace(/\bthey\b/gi, (match) => match[0] === 'T' ? 'You' : 'you')
        .replace(/\bthem\b/gi, 'you')
        .replace(/\btheir\b/gi, 'your')
        .replace(/\bthemselves\b/gi, 'yourself')
        .replace(/\bthemself\b/gi, 'yourself')
        // Fix common patterns
        .replace(/you is\b/gi, 'you are')
        .replace(/you was\b/gi, 'you were')
        .replace(/you has\b/gi, 'you have')
        .replace(/you does\b/gi, 'you do')
        .replace(/does you\b/gi, 'do you')
        .replace(/you feels\b/gi, 'you feel')
        .replace(/you thinks\b/gi, 'you think')
        .replace(/you works\b/gi, 'you work')
        .replace(/you expects\b/gi, 'you expect')
        .replace(/you treats\b/gi, 'you treat')
        .replace(/you controls\b/gi, 'you control')
        .replace(/you finishes\b/gi, 'you finish')
        .replace(/you takes\b/gi, 'you take');
    } else {
      // For other relationship types, just replace the name placeholder
      result = result.replace(/\{\{personName\}\}/g, personName);
    }

    return result;
  };

  return sections.map(section => ({
    ...section,
    sectionDescription: personalizeText(section.sectionDescription) || section.sectionDescription,
    questions: section.questions.map(q => {
      // Get relationship-specific placeholder overrides if available
      const overrides = placeholders?.[q.id];

      return {
        ...q,
        question: personalizeText(q.question) || q.question,
        // Use relationship-specific placeholder if available, otherwise personalize the default
        placeholder: overrides?.placeholder || personalizeText(q.placeholder),
        helperText: overrides?.helperText || personalizeText(q.helperText),
        qualitativePlaceholder: personalizeText(q.qualitativePlaceholder)
      };
    })
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
