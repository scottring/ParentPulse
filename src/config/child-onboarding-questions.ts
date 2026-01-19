/**
 * Child Manual Onboarding Questions
 * Redesigned with 70% structured questions (multiple choice, scales, checkboxes)
 */

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'scale' | 'multipleChoice' | 'checkboxes';
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  scaleLabels?: { min: string; max: string };
}

export interface QuestionSection {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

// Shared background section - asked to everyone
const backgroundSection: QuestionSection = {
  id: 'background',
  title: 'Background & Context',
  description: "Let's start with some basic information about {{childName}}.",
  questions: [
    {
      id: 'developmental-concerns',
      text: 'Which best describes {{childName}}?',
      type: 'multipleChoice',
      helpText: 'This helps us tailor the questionnaire to focus on relevant areas.',
      required: true,
      options: [
        { value: 'typical', label: 'Typical development - no major concerns' },
        { value: 'mild-concerns', label: 'Some behavioral challenges, but manageable' },
        { value: 'moderate-concerns', label: 'Moderate challenges with attention, behavior, or emotions' },
        { value: 'significant-concerns', label: 'Significant challenges that impact daily life' },
        { value: 'diagnosed', label: 'Has formal diagnosis (ADHD, autism, etc.)' },
      ],
    },
    {
      id: 'diagnosis',
      text: 'Has {{childName}} been formally diagnosed with any conditions?',
      type: 'checkboxes',
      helpText: 'Select all that apply. If not diagnosed but suspected, you can note that in the next question.',
      required: false,
      options: [
        { value: 'adhd', label: 'ADHD' },
        { value: 'anxiety', label: 'Anxiety' },
        { value: 'autism', label: 'Autism Spectrum' },
        { value: 'sensory', label: 'Sensory Processing Disorder' },
        { value: 'learning', label: 'Learning Disability' },
        { value: 'ocd', label: 'OCD' },
        { value: 'depression', label: 'Depression' },
        { value: 'none', label: 'No formal diagnoses' },
      ],
    },
    {
      id: 'diagnosis-notes',
      text: 'Any additional context about diagnoses, suspected conditions, or ongoing evaluations?',
      type: 'textarea',
      placeholder: 'Example: "We think he has ADHD but haven\'t been formally evaluated yet. Teachers have mentioned it."',
      required: false,
    },
    {
      id: 'medications',
      text: 'Is {{childName}} currently taking any medications?',
      type: 'multipleChoice',
      required: true,
      options: [
        { value: 'yes-adhd', label: 'Yes - ADHD medication' },
        { value: 'yes-other', label: 'Yes - Other medication' },
        { value: 'no', label: 'No medications' },
      ],
    },
  ],
};

// Neurodivergent question set (for moderate-concerns, significant-concerns, diagnosed)
const neurodivergentSections: QuestionSection[] = [
  backgroundSection,

  {
    id: 'adhd-hyperactivity',
    title: 'Activity Level & Movement',
    description: "Let's understand {{childName}}'s energy and movement patterns.",
    questions: [
      {
        id: 'hyperactivity-level',
        text: 'How would you rate {{childName}}\'s overall activity level?',
        type: 'scale',
        scaleLabels: {
          min: 'Very calm, low energy',
          max: 'Constantly moving, very high energy',
        },
        required: true,
      },
      {
        id: 'sitting-still',
        text: 'How well can {{childName}} sit still during activities like meals, homework, or watching TV?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: '5min', label: 'Less than 5 minutes - constant movement' },
          { value: '10min', label: '5-10 minutes with fidgeting' },
          { value: '20min', label: '10-20 minutes if engaged' },
          { value: '30min', label: '20-30 minutes fairly well' },
          { value: '30plus', label: 'Over 30 minutes, no problem' },
        ],
      },
      {
        id: 'movement-types',
        text: 'What types of movement do you see most often? (Select all that apply)',
        type: 'checkboxes',
        required: true,
        options: [
          { value: 'fidgeting', label: 'Fidgeting with hands/objects' },
          { value: 'tapping', label: 'Tapping feet or hands' },
          { value: 'squirming', label: 'Squirming in seat' },
          { value: 'climbing', label: 'Climbing on furniture' },
          { value: 'running', label: 'Running when should be walking' },
          { value: 'talking', label: 'Talking excessively' },
          { value: 'noise', label: 'Making noises (humming, vocal sounds)' },
          { value: 'none', label: 'None of these - generally calm' },
        ],
      },
      {
        id: 'physical-needs',
        text: 'Does physical activity help {{childName}}\'s behavior?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'essential', label: 'Essential - they NEED to move daily or behavior suffers' },
          { value: 'helpful', label: 'Helpful - improves focus and mood' },
          { value: 'neutral', label: 'Neutral - doesn\'t make much difference' },
          { value: 'worse', label: 'Sometimes makes it worse - gets them wound up' },
        ],
      },
    ],
  },

  {
    id: 'adhd-attention',
    title: 'Attention & Focus',
    description: "How does {{childName}} handle focusing and paying attention?",
    questions: [
      {
        id: 'focus-preferred',
        text: 'How long can {{childName}} focus on activities they ENJOY (like video games, Legos, etc.)?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: '5min', label: 'Less than 5 minutes' },
          { value: '15min', label: '5-15 minutes' },
          { value: '30min', label: '15-30 minutes' },
          { value: '1hour', label: '30-60 minutes' },
          { value: '1hourplus', label: 'Over an hour - can hyperfocus' },
        ],
      },
      {
        id: 'focus-nonpreferred',
        text: 'How long can {{childName}} focus on activities they DON\'T enjoy (like homework, chores)?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: '1min', label: 'Less than 1 minute - immediate resistance' },
          { value: '5min', label: '1-5 minutes' },
          { value: '10min', label: '5-10 minutes' },
          { value: '15min', label: '10-15 minutes' },
          { value: '15plus', label: 'Over 15 minutes' },
        ],
      },
      {
        id: 'distractibility',
        text: 'How easily is {{childName}} distracted?',
        type: 'scale',
        scaleLabels: {
          min: 'Rarely distracted, stays on task',
          max: 'Extremely distractible, any noise/movement pulls attention',
        },
        required: true,
      },
      {
        id: 'distraction-types',
        text: 'What distracts {{childName}} most? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'noise', label: 'Any noise or sound' },
          { value: 'visual', label: 'Visual movement (people walking by, etc.)' },
          { value: 'thoughts', label: 'Their own thoughts' },
          { value: 'toys', label: 'Toys or objects nearby' },
          { value: 'siblings', label: 'Siblings' },
          { value: 'screens', label: 'Screens/devices' },
        ],
      },
      {
        id: 'focus-helpers',
        text: 'What helps {{childName}} focus better? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'quiet', label: 'Quiet environment' },
          { value: 'music', label: 'Background music or white noise' },
          { value: 'fidgets', label: 'Fidget toys' },
          { value: 'movement', label: 'Movement breaks' },
          { value: 'timers', label: 'Timers or countdowns' },
          { value: 'rewards', label: 'Rewards or incentives' },
          { value: 'oneone', label: 'One-on-one attention' },
          { value: 'visual', label: 'Visual schedules or checklists' },
        ],
      },
    ],
  },

  {
    id: 'adhd-impulsivity',
    title: 'Impulse Control',
    description: "Let's talk about {{childName}}'s ability to think before acting.",
    questions: [
      {
        id: 'impulsivity-level',
        text: 'How impulsive is {{childName}}?',
        type: 'scale',
        scaleLabels: {
          min: 'Always thinks before acting',
          max: 'Acts immediately without thinking',
        },
        required: true,
      },
      {
        id: 'impulsive-behaviors',
        text: 'Which impulsive behaviors do you see? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'interrupting', label: 'Interrupts conversations constantly' },
          { value: 'blurting', label: 'Blurts out answers before question is finished' },
          { value: 'grabbing', label: 'Grabs things without asking' },
          { value: 'hitting', label: 'Hits/pushes when upset (physical impulsivity)' },
          { value: 'risky', label: 'Takes physical risks (runs into street, climbs dangerously)' },
          { value: 'decisions', label: 'Makes snap decisions without thinking through consequences' },
          { value: 'none', label: 'Generally thinks before acting' },
        ],
      },
      {
        id: 'waiting-ability',
        text: 'How well does {{childName}} handle waiting (in line, for their turn, etc.)?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'impossible', label: 'Impossible - immediate meltdown' },
          { value: '1min', label: 'Can wait 1-2 minutes max' },
          { value: '5min', label: 'Can wait 5 minutes with reminders' },
          { value: '10min', label: 'Can wait 10+ minutes if reminded why' },
          { value: 'fine', label: 'Waits patiently, no problem' },
        ],
      },
    ],
  },

  {
    id: 'adhd-organization',
    title: 'Organization & Task Completion',
    description: "How does {{childName}} handle tasks and staying organized?",
    questions: [
      {
        id: 'task-completion',
        text: 'Does {{childName}} typically finish tasks they start?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'rarely', label: 'Rarely - starts many things, finishes almost none' },
          { value: 'sometimes', label: 'Sometimes - if very interested' },
          { value: 'usually', label: 'Usually - with reminders' },
          { value: 'always', label: 'Almost always completes tasks' },
        ],
      },
      {
        id: 'multistep-directions',
        text: 'How well does {{childName}} follow multi-step directions?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: '1step', label: 'Can only handle 1 step at a time' },
          { value: '2step', label: 'Can handle 2 steps' },
          { value: '3step', label: 'Can handle 3+ steps' },
          { value: 'complex', label: 'Can handle complex multi-step tasks' },
        ],
      },
      {
        id: 'losing-things',
        text: 'How often does {{childName}} lose or forget things?',
        type: 'scale',
        scaleLabels: {
          min: 'Never - very organized',
          max: 'Constantly - loses things daily',
        },
        required: true,
      },
      {
        id: 'commonly-lost',
        text: 'What does {{childName}} commonly lose or forget? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'jacket', label: 'Jacket/coat' },
          { value: 'shoes', label: 'Shoes' },
          { value: 'homework', label: 'Homework or school papers' },
          { value: 'supplies', label: 'School supplies' },
          { value: 'toys', label: 'Toys' },
          { value: 'water', label: 'Water bottle/lunch box' },
          { value: 'tasks', label: 'Forgets what they were supposed to do' },
          { value: 'none', label: 'Rarely loses things' },
        ],
      },
    ],
  },

  {
    id: 'emotional-regulation',
    title: 'Emotional Regulation',
    description: "Let's understand how {{childName}} handles emotions.",
    questions: [
      {
        id: 'escalation-speed',
        text: 'How quickly does {{childName}} go from calm to upset?',
        type: 'scale',
        scaleLabels: {
          min: 'Gradual buildup - you see it coming',
          max: 'Instant explosion - 0 to 100 in seconds',
        },
        required: true,
      },
      {
        id: 'common-triggers',
        text: 'What commonly triggers meltdowns or frustration? (Select all that apply)',
        type: 'checkboxes',
        required: true,
        options: [
          { value: 'no', label: 'Being told "no"' },
          { value: 'transitions', label: 'Transitions between activities' },
          { value: 'hunger', label: 'Hunger' },
          { value: 'tired', label: 'Tiredness' },
          { value: 'rushed', label: 'Being rushed' },
          { value: 'losing', label: 'Losing at games' },
          { value: 'interruption', label: 'Being interrupted' },
          { value: 'noise', label: 'Loud noises or crowds' },
          { value: 'touch', label: 'Unwanted touch or sensory input' },
          { value: 'sibling', label: 'Sibling conflicts' },
        ],
      },
      {
        id: 'meltdown-behaviors',
        text: 'When upset, what does {{childName}} do? (Select all that apply)',
        type: 'checkboxes',
        required: true,
        options: [
          { value: 'yelling', label: 'Yelling/screaming' },
          { value: 'crying', label: 'Crying' },
          { value: 'hitting', label: 'Hitting/kicking others' },
          { value: 'throwing', label: 'Throwing things' },
          { value: 'destroying', label: 'Destroying property' },
          { value: 'running', label: 'Running away/hiding' },
          { value: 'shutting-down', label: 'Shutting down/withdrawing' },
        ],
      },
      {
        id: 'calming-time',
        text: 'How long does it take {{childName}} to calm down after being upset?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: '5min', label: '1-5 minutes' },
          { value: '15min', label: '5-15 minutes' },
          { value: '30min', label: '15-30 minutes' },
          { value: '1hour', label: '30-60 minutes' },
          { value: '1hourplus', label: 'Over an hour' },
          { value: 'varies', label: 'Varies greatly depending on situation' },
        ],
      },
      {
        id: 'calming-strategies',
        text: 'What helps {{childName}} calm down? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'alone', label: 'Alone time in their room' },
          { value: 'hugs', label: 'Deep pressure hugs' },
          { value: 'talk', label: 'Talking through it' },
          { value: 'distraction', label: 'Distraction/redirection' },
          { value: 'fidget', label: 'Fidget toys or sensory items' },
          { value: 'music', label: 'Music' },
          { value: 'movement', label: 'Physical activity (running, jumping)' },
          { value: 'water', label: 'Water/snack' },
        ],
      },
      {
        id: 'makes-worse',
        text: 'What makes meltdowns WORSE? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'talking', label: 'Trying to talk/reason during meltdown' },
          { value: 'following', label: 'Following them' },
          { value: 'touching', label: 'Physical touch' },
          { value: 'yelling', label: 'Yelling at them' },
          { value: 'consequences', label: 'Threatening consequences' },
          { value: 'timeout', label: 'Sending to timeout' },
          { value: 'ignoring', label: 'Ignoring them' },
        ],
      },
    ],
  },

  {
    id: 'transitions-routines',
    title: 'Transitions & Daily Routines',
    description: "Which daily transitions and routines are smooth vs. difficult?",
    questions: [
      {
        id: 'hard-transitions',
        text: 'Which transitions are HARDEST for {{childName}}? (Select all that apply)',
        type: 'checkboxes',
        required: true,
        options: [
          { value: 'waking', label: 'Waking up in the morning' },
          { value: 'getting-ready', label: 'Getting dressed/ready' },
          { value: 'leaving-house', label: 'Leaving the house' },
          { value: 'arriving-school', label: 'Arriving at school' },
          { value: 'after-school', label: 'Coming home from school' },
          { value: 'homework', label: 'Starting homework' },
          { value: 'ending-screen', label: 'Ending screen time' },
          { value: 'dinner', label: 'Dinner time' },
          { value: 'bath', label: 'Bath/shower' },
          { value: 'bedtime', label: 'Bedtime' },
        ],
      },
      {
        id: 'transition-strategies',
        text: 'What helps with difficult transitions? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'warnings', label: '5-10 minute warnings' },
          { value: 'timers', label: 'Visual timers' },
          { value: 'choices', label: 'Offering choices' },
          { value: 'songs', label: 'Songs or music' },
          { value: 'race', label: 'Making it a race/game' },
          { value: 'reward', label: 'Immediate rewards' },
          { value: 'routine', label: 'Consistent routine' },
          { value: 'visual', label: 'Visual schedules' },
        ],
      },
      {
        id: 'morning-difficulty',
        text: 'How difficult are mornings (waking → leaving for school)?',
        type: 'scale',
        scaleLabels: {
          min: 'Smooth - gets ready independently',
          max: 'Chaotic - constant battles, often late',
        },
        required: true,
      },
      {
        id: 'bedtime-difficulty',
        text: 'How difficult is bedtime?',
        type: 'scale',
        scaleLabels: {
          min: 'Smooth - goes to bed easily',
          max: 'Very difficult - takes hours, major battles',
        },
        required: true,
      },
    ],
  },

  {
    id: 'cooperation',
    title: 'Cooperation & Behavior',
    description: "When does {{childName}} cooperate best and when is it hardest?",
    questions: [
      {
        id: 'listening-conditions',
        text: 'When does {{childName}} listen and cooperate BEST? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'well-fed', label: 'After eating/when well-fed' },
          { value: 'well-rested', label: 'When well-rested' },
          { value: 'exercise', label: 'After physical activity' },
          { value: 'oneone', label: 'During one-on-one time' },
          { value: 'choices', label: 'When given choices' },
          { value: 'control', label: 'When they feel in control' },
          { value: 'morning', label: 'Morning time' },
          { value: 'routine', label: 'During predictable routines' },
        ],
      },
      {
        id: 'listening-worst',
        text: 'When is cooperation HARDEST? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'tired', label: 'When tired' },
          { value: 'hungry', label: 'When hungry' },
          { value: 'after-school', label: 'Right after school' },
          { value: 'evening', label: 'Evening time' },
          { value: 'overstimulated', label: 'When overstimulated' },
          { value: 'sibling-present', label: 'When sibling is around' },
          { value: 'rushed', label: 'When being rushed' },
        ],
      },
      {
        id: 'communication-style',
        text: 'What communication style works BEST with {{childName}}?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'choices', label: 'Offering 2 choices (not open-ended)' },
          { value: 'firm', label: 'Firm, direct commands' },
          { value: 'gentle', label: 'Gentle requests' },
          { value: 'explain', label: 'Explaining the "why" behind requests' },
          { value: 'game', label: 'Making it a game' },
          { value: 'when-then', label: 'When/then statements ("When you finish X, then Y")' },
        ],
      },
    ],
  },

  {
    id: 'strengths-interests',
    title: 'Strengths & Interests',
    description: "What makes {{childName}} special?",
    questions: [
      {
        id: 'strengths',
        text: 'What are {{childName}}\'s biggest strengths? (Select all that apply)',
        type: 'checkboxes',
        required: true,
        options: [
          { value: 'creative', label: 'Creative/imaginative' },
          { value: 'kind', label: 'Kind/compassionate' },
          { value: 'funny', label: 'Funny/good sense of humor' },
          { value: 'persistent', label: 'Persistent/determined' },
          { value: 'energetic', label: 'Energetic/enthusiastic' },
          { value: 'smart', label: 'Smart/quick learner' },
          { value: 'athletic', label: 'Athletic/coordinated' },
          { value: 'artistic', label: 'Artistic' },
          { value: 'social', label: 'Social/friendly' },
          { value: 'helpful', label: 'Helpful/eager to please' },
        ],
      },
      {
        id: 'interests',
        text: 'What does {{childName}} love to do? (Free text)',
        type: 'textarea',
        placeholder: 'Example: "Obsessed with Minecraft, loves building with Legos, spends hours drawing"',
        required: false,
      },
      {
        id: 'best-moments',
        text: 'When is {{childName}} happiest and at their best? (Free text)',
        type: 'textarea',
        placeholder: 'Example: "Playing with the dog, building with Dad, one-on-one time at the park"',
        required: false,
      },
    ],
  },

  {
    id: 'what-works',
    title: 'Strategies That Work',
    description: "Let's capture what you've learned works well.",
    questions: [
      {
        id: 'successful-strategies',
        text: 'What parenting strategies work WELL with {{childName}}? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'choices', label: 'Offering 2 choices' },
          { value: 'warnings', label: '10-minute warnings before transitions' },
          { value: 'timers', label: 'Using timers' },
          { value: 'visual', label: 'Visual schedules or checklists' },
          { value: 'rewards', label: 'Positive reinforcement/rewards' },
          { value: 'praise', label: 'Specific praise' },
          { value: 'routine', label: 'Consistent routines' },
          { value: 'movement', label: 'Movement breaks' },
          { value: 'oneone', label: 'One-on-one time' },
          { value: 'natural', label: 'Natural consequences' },
        ],
      },
      {
        id: 'failed-strategies',
        text: 'What strategies DON\'T work or make things worse? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'yelling', label: 'Yelling' },
          { value: 'timeout', label: 'Time-outs' },
          { value: 'taking-away', label: 'Taking away privileges' },
          { value: 'reasoning', label: 'Reasoning during meltdowns' },
          { value: 'threatening', label: 'Threatening consequences' },
          { value: 'comparing', label: 'Comparing to siblings' },
          { value: 'ignoring', label: 'Ignoring behavior' },
          { value: 'rushing', label: 'Rushing them' },
        ],
      },
      {
        id: 'additional-notes',
        text: 'Any other important information or patterns we should know?',
        type: 'textarea',
        placeholder: 'Anything else that helps understand your child or what works for your family',
        required: false,
      },
    ],
  },
];

// Typical/neurotypical child question set (for typical, mild-concerns)
const typicalChildSections: QuestionSection[] = [
  backgroundSection,

  {
    id: 'daily-behavior',
    title: 'Daily Behavior & Routine',
    description: "Let's understand {{childName}}'s typical day.",
    questions: [
      {
        id: 'general-behavior',
        text: 'Overall, how would you describe {{childName}}\'s behavior?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'easy', label: 'Generally easy-going and cooperative' },
          { value: 'typical', label: 'Typical ups and downs' },
          { value: 'spirited', label: 'Spirited/strong-willed but manageable' },
          { value: 'challenging', label: 'More challenging than average' },
        ],
      },
      {
        id: 'listening',
        text: 'How well does {{childName}} listen and follow directions?',
        type: 'scale',
        scaleLabels: {
          min: 'Rarely listens, constant battles',
          max: 'Listens well, follows directions easily',
        },
        required: true,
      },
      {
        id: 'routine-areas',
        text: 'Which daily routines need the most attention? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'morning', label: 'Morning routine (getting ready for school)' },
          { value: 'homework', label: 'Homework time' },
          { value: 'chores', label: 'Doing chores' },
          { value: 'bedtime', label: 'Bedtime' },
          { value: 'mealtimes', label: 'Mealtimes' },
          { value: 'screen-limits', label: 'Following screen time limits' },
          { value: 'none', label: 'All routines go smoothly' },
        ],
      },
      {
        id: 'energy-level',
        text: 'What is {{childName}}\'s typical energy level?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'low', label: 'Low energy - prefers quiet activities' },
          { value: 'moderate', label: 'Moderate - balanced mix of active and quiet' },
          { value: 'high', label: 'High energy - loves active play' },
          { value: 'variable', label: 'Varies greatly day to day' },
        ],
      },
    ],
  },

  {
    id: 'emotions-behavior',
    title: 'Emotions & Self-Control',
    description: "How does {{childName}} handle emotions and frustration?",
    questions: [
      {
        id: 'emotional-reactions',
        text: 'When upset or frustrated, {{childName}} typically:',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'calm-quickly', label: 'Gets upset but calms down quickly on their own' },
          { value: 'needs-help', label: 'Needs help calming down but responds well' },
          { value: 'big-feelings', label: 'Has big feelings that take time to pass' },
          { value: 'escalates', label: 'Tends to escalate before calming down' },
        ],
      },
      {
        id: 'common-triggers',
        text: 'What commonly triggers frustration or tantrums? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'no', label: 'Being told "no"' },
          { value: 'sibling', label: 'Conflicts with siblings' },
          { value: 'homework', label: 'Homework or challenging tasks' },
          { value: 'losing', label: 'Losing at games' },
          { value: 'tired-hungry', label: 'Being tired or hungry' },
          { value: 'changes', label: 'Changes to plans' },
          { value: 'limited-triggers', label: 'Few triggers - generally even-tempered' },
        ],
      },
      {
        id: 'self-control',
        text: 'How is {{childName}}\'s self-control and impulse management?',
        type: 'scale',
        scaleLabels: {
          min: 'Very impulsive, acts without thinking',
          max: 'Good self-control, thinks before acting',
        },
        required: true,
      },
    ],
  },

  {
    id: 'school-learning',
    title: 'School & Learning',
    description: "Tell us about {{childName}}'s school experience.",
    questions: [
      {
        id: 'school-enjoyment',
        text: 'How does {{childName}} feel about school?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'loves', label: 'Loves school, excited to go' },
          { value: 'likes', label: 'Generally likes school' },
          { value: 'neutral', label: 'Neutral - neither loves nor hates it' },
          { value: 'struggles', label: 'Struggles with school, reluctant to go' },
          { value: 'varies', label: 'Varies depending on the day' },
        ],
      },
      {
        id: 'academic-performance',
        text: 'How is {{childName}}\'s academic performance?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'advanced', label: 'Above grade level, quick learner' },
          { value: 'on-level', label: 'On grade level, doing well' },
          { value: 'some-struggles', label: 'Some struggles in certain subjects' },
          { value: 'needs-support', label: 'Needs extra support or intervention' },
        ],
      },
      {
        id: 'homework-situation',
        text: 'How does homework time typically go?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'independent', label: 'Works independently, minimal parent involvement' },
          { value: 'some-help', label: 'Needs occasional help or reminders' },
          { value: 'constant-support', label: 'Needs constant parent support' },
          { value: 'major-battles', label: 'Major battles and resistance' },
          { value: 'no-homework', label: 'Little or no homework assigned' },
        ],
      },
      {
        id: 'learning-areas',
        text: 'Are there any areas where {{childName}} needs extra support? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'reading', label: 'Reading' },
          { value: 'math', label: 'Math' },
          { value: 'writing', label: 'Writing' },
          { value: 'focus', label: 'Staying focused in class' },
          { value: 'organization', label: 'Organization and time management' },
          { value: 'social', label: 'Social skills with peers' },
          { value: 'none', label: 'No major concerns' },
        ],
      },
    ],
  },

  {
    id: 'social-relationships',
    title: 'Social & Relationships',
    description: "How does {{childName}} interact with others?",
    questions: [
      {
        id: 'friendships',
        text: 'How are {{childName}}\'s friendships?',
        type: 'multipleChoice',
        required: true,
        options: [
          { value: 'many-friends', label: 'Has many friends, very social' },
          { value: 'few-close', label: 'Has a few close friends' },
          { value: 'some-struggles', label: 'Makes friends but has some social struggles' },
          { value: 'difficult', label: 'Difficulty making or keeping friends' },
          { value: 'prefers-alone', label: 'Prefers to play alone' },
        ],
      },
      {
        id: 'sibling-relationships',
        text: 'If {{childName}} has siblings, how do they get along?',
        type: 'multipleChoice',
        required: false,
        options: [
          { value: 'great', label: 'Great - close relationship, play well together' },
          { value: 'typical', label: 'Typical - some fights but generally good' },
          { value: 'frequent-conflict', label: 'Frequent conflicts' },
          { value: 'mostly-conflict', label: 'Mostly conflict, hard to be together' },
          { value: 'no-siblings', label: 'No siblings' },
        ],
      },
      {
        id: 'social-skills',
        text: 'Any social skills areas to work on? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'sharing', label: 'Sharing and taking turns' },
          { value: 'cooperation', label: 'Cooperating in group activities' },
          { value: 'conflict', label: 'Resolving conflicts peacefully' },
          { value: 'losing', label: 'Handling losing gracefully' },
          { value: 'empathy', label: 'Understanding others\' feelings' },
          { value: 'boundaries', label: 'Respecting personal boundaries' },
          { value: 'none', label: 'Social skills are strong' },
        ],
      },
    ],
  },

  {
    id: 'discipline-guidance',
    title: 'Discipline & Guidance',
    description: "What approaches work best for guiding {{childName}}'s behavior?",
    questions: [
      {
        id: 'discipline-effectiveness',
        text: 'Which discipline approaches work BEST? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'praise', label: 'Positive reinforcement and praise' },
          { value: 'natural-consequences', label: 'Natural consequences' },
          { value: 'logical-consequences', label: 'Logical consequences' },
          { value: 'timeout', label: 'Time-outs or calm-down time' },
          { value: 'loss-privilege', label: 'Loss of privileges' },
          { value: 'rewards', label: 'Reward charts or incentives' },
          { value: 'talking', label: 'Talking through behavior' },
          { value: 'redirection', label: 'Redirection' },
        ],
      },
      {
        id: 'motivation',
        text: 'What motivates {{childName}} to cooperate? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'praise', label: 'Praise and recognition' },
          { value: 'rewards', label: 'Tangible rewards' },
          { value: 'pleasing-parents', label: 'Desire to please parents' },
          { value: 'independence', label: 'Gaining independence/privileges' },
          { value: 'competition', label: 'Competition with siblings' },
          { value: 'understanding-why', label: 'Understanding the "why" behind rules' },
        ],
      },
      {
        id: 'discipline-challenges',
        text: 'What makes discipline/guidance difficult? (Select all that apply)',
        type: 'checkboxes',
        required: false,
        options: [
          { value: 'strong-willed', label: 'Very strong-willed' },
          { value: 'tests-limits', label: 'Constantly tests limits' },
          { value: 'inconsistent', label: 'Inconsistent responses from different caregivers' },
          { value: 'big-reactions', label: 'Big emotional reactions to correction' },
          { value: 'doesnt-care', label: 'Doesn\'t seem to care about consequences' },
          { value: 'argues', label: 'Argues or negotiates constantly' },
          { value: 'none', label: 'Generally receptive to guidance' },
        ],
      },
    ],
  },

  {
    id: 'strengths-interests-typical',
    title: 'Strengths & Interests',
    description: "What makes {{childName}} special?",
    questions: [
      {
        id: 'strengths',
        text: 'What are {{childName}}\'s biggest strengths? (Select all that apply)',
        type: 'checkboxes',
        required: true,
        options: [
          { value: 'creative', label: 'Creative/imaginative' },
          { value: 'kind', label: 'Kind/compassionate' },
          { value: 'funny', label: 'Funny/good sense of humor' },
          { value: 'persistent', label: 'Persistent/determined' },
          { value: 'energetic', label: 'Energetic/enthusiastic' },
          { value: 'smart', label: 'Smart/quick learner' },
          { value: 'athletic', label: 'Athletic/coordinated' },
          { value: 'artistic', label: 'Artistic' },
          { value: 'social', label: 'Social/friendly' },
          { value: 'helpful', label: 'Helpful/eager to please' },
          { value: 'independent', label: 'Independent/self-sufficient' },
          { value: 'curious', label: 'Curious/loves to learn' },
        ],
      },
      {
        id: 'interests',
        text: 'What does {{childName}} love to do? (Free text)',
        type: 'textarea',
        placeholder: 'Example: "Loves soccer and playing outside, enjoys reading before bed, building with Legos"',
        required: false,
      },
      {
        id: 'parenting-goals',
        text: 'What are your main parenting goals or areas you want to improve with {{childName}}?',
        type: 'textarea',
        placeholder: 'Example: "Want to reduce screen time battles, help them be more independent with homework, improve sibling relationships"',
        required: false,
      },
    ],
  },
];

// Export function to get appropriate question set based on developmental profile
export function getChildOnboardingQuestions(developmentalConcern?: string): QuestionSection[] {
  if (!developmentalConcern) {
    // If screening hasn't happened yet, return just background section
    return [backgroundSection];
  }

  // Use intensive neurodivergent questions for moderate to significant concerns
  if (
    developmentalConcern === 'moderate-concerns' ||
    developmentalConcern === 'significant-concerns' ||
    developmentalConcern === 'diagnosed'
  ) {
    return neurodivergentSections;
  }

  // Use typical child questions for typical development or mild concerns
  return typicalChildSections;
}

// Legacy export for backward compatibility
export const childOnboardingQuestions = neurodivergentSections;
