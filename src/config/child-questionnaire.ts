/**
 * Child-Friendly Questionnaire
 *
 * Age-appropriate questions for children (ages 6-12) to answer with parent support.
 * Uses emoji, simple language, and visual choices.
 */

export interface ChildQuestion {
  id: string;
  text: string;
  type: 'emoji-scale' | 'emoji-choice' | 'checkboxes' | 'drawing' | 'text';
  emoji?: string; // Display emoji next to question
  options?: { value: string; label: string; emoji?: string }[];
  scaleEmojis?: string[]; // For emoji-scale type (e.g., ['😡', '😞', '😐', '🙂', '😊'])
  scaleLabels?: { min: string; max: string };
  helpText?: string;
  required: boolean;
  minAge?: number; // Minimum age for this question
  maxAge?: number; // Maximum age for this question
}

export interface ChildQuestionSection {
  id: string;
  title: string;
  description: string;
  emoji: string;
  questions: ChildQuestion[];
}

export const childQuestionnaire: ChildQuestionSection[] = [
  {
    id: 'feelings',
    title: 'Your Feelings',
    description: "Let's talk about how you feel",
    emoji: '😊',
    questions: [
      {
        id: 'what_makes_mad',
        text: 'What makes you really mad or upset?',
        type: 'checkboxes',
        emoji: '😡',
        options: [
          { value: 'told_no', label: 'When someone tells me "no"', emoji: '🚫' },
          { value: 'interrupted', label: 'When someone interrupts me', emoji: '🗣️' },
          { value: 'losing', label: 'When I lose a game', emoji: '🎮' },
          { value: 'homework', label: 'Homework time', emoji: '📝' },
          { value: 'bedtime', label: 'Having to go to bed', emoji: '🛏️' },
          { value: 'hurried', label: 'When people rush me', emoji: '⏰' },
          { value: 'loud_noises', label: 'Loud noises', emoji: '🔊' },
          { value: 'crowds', label: 'Too many people around', emoji: '👥' },
          { value: 'wrong', label: 'When I make a mistake', emoji: '❌' },
          { value: 'unfair', label: 'When things feel unfair', emoji: '⚖️' },
        ],
        required: false,
      },
      {
        id: 'how_mad_feels',
        text: 'When you get really upset, how does your body feel?',
        type: 'checkboxes',
        emoji: '💢',
        options: [
          { value: 'heart_fast', label: 'My heart beats fast', emoji: '💓' },
          { value: 'hot', label: 'I feel hot', emoji: '🔥' },
          { value: 'shaky', label: 'I feel shaky', emoji: '😰' },
          { value: 'tight', label: 'My body feels tight', emoji: '😬' },
          { value: 'want_cry', label: 'I want to cry', emoji: '😢' },
          { value: 'want_yell', label: 'I want to yell', emoji: '😤' },
          { value: 'want_hide', label: 'I want to hide', emoji: '🙈' },
          { value: 'want_hit', label: 'I want to hit or throw things', emoji: '👊' },
        ],
        required: false,
      },
      {
        id: 'what_helps_calm',
        text: 'What helps you feel better when you\'re upset?',
        type: 'checkboxes',
        emoji: '🌈',
        options: [
          { value: 'hug', label: 'A hug', emoji: '🤗' },
          { value: 'alone_time', label: 'Being alone for a while', emoji: '🚪' },
          { value: 'talk', label: 'Talking about it', emoji: '💬' },
          { value: 'run_play', label: 'Running or playing', emoji: '🏃' },
          { value: 'squeeze', label: 'Squeezing something', emoji: '🤛' },
          { value: 'music', label: 'Listening to music', emoji: '🎵' },
          { value: 'draw', label: 'Drawing or coloring', emoji: '🎨' },
          { value: 'deep_breaths', label: 'Taking deep breaths', emoji: '😮‍💨' },
          { value: 'favorite_thing', label: 'Playing with my favorite thing', emoji: '🧸' },
          { value: 'snack', label: 'Having a snack', emoji: '🍎' },
        ],
        required: false,
      },
      {
        id: 'happy_things',
        text: 'What makes you really happy?',
        type: 'text',
        emoji: '😄',
        helpText: 'Write or tell us about things that make you smile!',
        required: false,
      },
    ],
  },
  {
    id: 'strengths',
    title: 'What You\'re Good At',
    description: 'Let\'s talk about your superpowers!',
    emoji: '⭐',
    questions: [
      {
        id: 'good_at',
        text: 'What are you really good at?',
        type: 'checkboxes',
        emoji: '💪',
        options: [
          { value: 'building', label: 'Building things', emoji: '🏗️' },
          { value: 'drawing', label: 'Drawing or art', emoji: '🎨' },
          { value: 'sports', label: 'Sports or being active', emoji: '⚽' },
          { value: 'reading', label: 'Reading', emoji: '📚' },
          { value: 'math', label: 'Math', emoji: '➕' },
          { value: 'making_friends', label: 'Making friends', emoji: '👫' },
          { value: 'helping', label: 'Helping others', emoji: '🤝' },
          { value: 'being_funny', label: 'Making people laugh', emoji: '😂' },
          { value: 'video_games', label: 'Video games', emoji: '🎮' },
          { value: 'music', label: 'Music or singing', emoji: '🎵' },
          { value: 'animals', label: 'Taking care of animals', emoji: '🐕' },
          { value: 'cooking', label: 'Cooking or baking', emoji: '👨‍🍳' },
        ],
        required: false,
      },
      {
        id: 'proud_of',
        text: 'What are you most proud of about yourself?',
        type: 'text',
        emoji: '🏆',
        helpText: 'Tell us something you\'re really proud you can do!',
        required: false,
      },
    ],
  },
  {
    id: 'challenges',
    title: 'Things That Are Hard',
    description: 'Everyone has things that are tricky. Let\'s talk about yours.',
    emoji: '🤔',
    questions: [
      {
        id: 'hard_things',
        text: 'What things are really hard for you?',
        type: 'checkboxes',
        emoji: '😓',
        options: [
          { value: 'sitting_still', label: 'Sitting still', emoji: '🪑' },
          { value: 'paying_attention', label: 'Paying attention', emoji: '👀' },
          { value: 'waiting', label: 'Waiting my turn', emoji: '⏳' },
          { value: 'following_directions', label: 'Following directions', emoji: '👂' },
          { value: 'homework', label: 'Doing homework', emoji: '📝' },
          { value: 'reading', label: 'Reading', emoji: '📖' },
          { value: 'math', label: 'Math', emoji: '➗' },
          { value: 'making_friends', label: 'Making friends', emoji: '😔' },
          { value: 'sharing', label: 'Sharing', emoji: '🤝' },
          { value: 'losing', label: 'Losing at games', emoji: '😞' },
          { value: 'sleep', label: 'Falling asleep', emoji: '😴' },
          { value: 'transitions', label: 'Stopping one thing to do another', emoji: '🔄' },
        ],
        required: false,
      },
      {
        id: 'when_frustrated',
        text: 'What do you do when something is too hard?',
        type: 'checkboxes',
        emoji: '😤',
        options: [
          { value: 'give_up', label: 'I give up', emoji: '🏳️' },
          { value: 'ask_help', label: 'I ask for help', emoji: '🙋' },
          { value: 'get_mad', label: 'I get really mad', emoji: '😡' },
          { value: 'cry', label: 'I cry', emoji: '😢' },
          { value: 'keep_trying', label: 'I keep trying', emoji: '💪' },
          { value: 'break', label: 'I take a break', emoji: '⏸️' },
        ],
        required: false,
      },
    ],
  },
  {
    id: 'daily_life',
    title: 'Your Day',
    description: 'Tell us about your typical day',
    emoji: '🌅',
    questions: [
      {
        id: 'hardest_time',
        text: 'What\'s the hardest part of your day?',
        type: 'checkboxes',
        emoji: '⏰',
        options: [
          { value: 'waking_up', label: 'Waking up', emoji: '🌅' },
          { value: 'morning_routine', label: 'Getting ready in the morning', emoji: '🪥' },
          { value: 'school_start', label: 'Starting school', emoji: '🏫' },
          { value: 'classwork', label: 'Doing classwork', emoji: '✏️' },
          { value: 'lunch_recess', label: 'Lunch or recess', emoji: '🍱' },
          { value: 'after_school', label: 'Right after school', emoji: '🎒' },
          { value: 'homework_time', label: 'Homework time', emoji: '📚' },
          { value: 'dinner', label: 'Dinner time', emoji: '🍽️' },
          { value: 'bedtime_routine', label: 'Getting ready for bed', emoji: '🛁' },
          { value: 'falling_asleep', label: 'Falling asleep', emoji: '😴' },
        ],
        required: false,
      },
      {
        id: 'best_time',
        text: 'What\'s the best part of your day?',
        type: 'text',
        emoji: '✨',
        helpText: 'What do you look forward to every day?',
        required: false,
      },
      {
        id: 'would_change',
        text: 'If you could change ONE thing about your day, what would it be?',
        type: 'text',
        emoji: '🪄',
        required: false,
      },
    ],
  },
  {
    id: 'preferences',
    title: 'What You Like',
    description: 'Tell us about your favorite things',
    emoji: '❤️',
    questions: [
      {
        id: 'favorite_activities',
        text: 'What do you love to do?',
        type: 'checkboxes',
        emoji: '🎮',
        options: [
          { value: 'video_games', label: 'Play video games', emoji: '🎮' },
          { value: 'outside', label: 'Play outside', emoji: '🌳' },
          { value: 'sports', label: 'Play sports', emoji: '⚽' },
          { value: 'read', label: 'Read books', emoji: '📚' },
          { value: 'draw', label: 'Draw or color', emoji: '🎨' },
          { value: 'build', label: 'Build with blocks/Lego', emoji: '🧱' },
          { value: 'friends', label: 'Hang out with friends', emoji: '👫' },
          { value: 'family', label: 'Spend time with family', emoji: '👨‍👩‍👧‍👦' },
          { value: 'watch', label: 'Watch shows or movies', emoji: '📺' },
          { value: 'music', label: 'Listen to music', emoji: '🎵' },
        ],
        required: false,
      },
      {
        id: 'how_learn_best',
        text: 'How do you learn best?',
        type: 'checkboxes',
        emoji: '🧠',
        options: [
          { value: 'doing', label: 'By doing it myself', emoji: '👐' },
          { value: 'watching', label: 'By watching someone', emoji: '👀' },
          { value: 'listening', label: 'By listening to instructions', emoji: '👂' },
          { value: 'pictures', label: 'By looking at pictures', emoji: '🖼️' },
          { value: 'moving', label: 'By moving around while learning', emoji: '🏃' },
        ],
        required: false,
      },
    ],
  },
];

/**
 * Get appropriate questions based on child's age
 */
export function getAgeAppropriateQuestions(age: number): ChildQuestionSection[] {
  return childQuestionnaire.map((section) => ({
    ...section,
    questions: section.questions.filter((q) => {
      if (q.minAge && age < q.minAge) return false;
      if (q.maxAge && age > q.maxAge) return false;
      return true;
    }),
  }));
}

/**
 * Calculate total questions for progress tracking
 */
export function getTotalQuestions(sections: ChildQuestionSection[]): number {
  return sections.reduce((sum, section) => sum + section.questions.length, 0);
}
