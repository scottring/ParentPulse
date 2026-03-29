/**
 * Child Observer Questionnaire
 *
 * Age-appropriate questions for children (ages 8+) to answer about another family member.
 * Reuses the same emoji-heavy, visual choice patterns as the child self-questionnaire
 * but reframed from an observer perspective.
 *
 * Uses {{personName}} placeholders — call getChildObserverQuestions(name) to substitute.
 */

import { ChildQuestion, ChildQuestionSection } from './child-questionnaire';

const childObserverQuestionnaire: ChildQuestionSection[] = [
  {
    id: 'kid_obs_feelings',
    title: "{{personName}}'s Feelings",
    description: "Let's talk about how {{personName}} feels",
    emoji: '😊',
    questions: [
      {
        id: 'kid_obs_what_makes_mad',
        text: 'What makes {{personName}} really mad or upset?',
        type: 'checkboxes',
        emoji: '😡',
        options: [
          { value: 'told_no', label: 'When someone tells them "no"', emoji: '🚫' },
          { value: 'interrupted', label: 'When someone interrupts them', emoji: '🗣️' },
          { value: 'losing', label: 'When they lose a game', emoji: '🎮' },
          { value: 'work', label: 'Work stuff', emoji: '💼' },
          { value: 'mess', label: 'When things are messy', emoji: '🧹' },
          { value: 'hurried', label: 'When people rush them', emoji: '⏰' },
          { value: 'loud_noises', label: 'Loud noises', emoji: '🔊' },
          { value: 'fighting', label: 'When we fight', emoji: '😤' },
          { value: 'wrong', label: 'When something goes wrong', emoji: '❌' },
          { value: 'unfair', label: 'When things feel unfair', emoji: '⚖️' },
        ],
        required: false,
      },
      {
        id: 'kid_obs_how_shows_mad',
        text: 'When {{personName}} gets upset, what do they do?',
        type: 'checkboxes',
        emoji: '💢',
        options: [
          { value: 'gets_quiet', label: 'Gets really quiet', emoji: '🤐' },
          { value: 'gets_loud', label: 'Gets loud or yells', emoji: '📢' },
          { value: 'walks_away', label: 'Walks away', emoji: '🚶' },
          { value: 'talks_about', label: 'Talks about it', emoji: '💬' },
          { value: 'cries', label: 'Cries', emoji: '😢' },
          { value: 'sighs', label: 'Sighs a lot', emoji: '😮‍💨' },
          { value: 'gets_busy', label: 'Gets really busy doing stuff', emoji: '🏃' },
          { value: 'snaps', label: 'Gets snappy or short with people', emoji: '😠' },
        ],
        required: false,
      },
      {
        id: 'kid_obs_what_makes_happy',
        text: 'What makes {{personName}} really happy?',
        type: 'text',
        emoji: '😄',
        helpText: 'What have you noticed makes them smile or laugh?',
        required: false,
      },
    ],
  },
  {
    id: 'kid_obs_strengths',
    title: "What {{personName}} Is Good At",
    description: "Tell us about {{personName}}'s superpowers!",
    emoji: '⭐',
    questions: [
      {
        id: 'kid_obs_good_at',
        text: 'What is {{personName}} really good at?',
        type: 'checkboxes',
        emoji: '💪',
        options: [
          { value: 'cooking', label: 'Cooking', emoji: '👨‍🍳' },
          { value: 'fixing', label: 'Fixing things', emoji: '🔧' },
          { value: 'listening', label: 'Listening', emoji: '👂' },
          { value: 'being_funny', label: 'Being funny', emoji: '😂' },
          { value: 'helping', label: 'Helping people', emoji: '🤝' },
          { value: 'working', label: 'Working hard', emoji: '💼' },
          { value: 'playing', label: 'Playing with us', emoji: '🎮' },
          { value: 'hugs', label: 'Giving hugs', emoji: '🤗' },
          { value: 'teaching', label: 'Teaching things', emoji: '📚' },
          { value: 'making_safe', label: 'Making us feel safe', emoji: '🛡️' },
        ],
        required: false,
      },
      {
        id: 'kid_obs_best_thing',
        text: "What's the BEST thing about {{personName}}?",
        type: 'text',
        emoji: '🏆',
        helpText: 'What do you love most about them?',
        required: false,
      },
    ],
  },
  {
    id: 'kid_obs_challenges',
    title: "Things That Are Hard for {{personName}}",
    description: "Everyone has things that are tricky — even grown-ups!",
    emoji: '🤔',
    questions: [
      {
        id: 'kid_obs_hard_things',
        text: "What do you think is hard for {{personName}}?",
        type: 'checkboxes',
        emoji: '😓',
        options: [
          { value: 'patience', label: 'Being patient', emoji: '⏳' },
          { value: 'relaxing', label: 'Relaxing', emoji: '🧘' },
          { value: 'listening', label: 'Really listening', emoji: '👂' },
          { value: 'not_working', label: 'Stopping work', emoji: '💼' },
          { value: 'being_wrong', label: 'Being wrong', emoji: '🙁' },
          { value: 'saying_sorry', label: 'Saying sorry', emoji: '🙏' },
          { value: 'playing', label: 'Taking time to play', emoji: '🎲' },
          { value: 'sleeping', label: 'Getting enough sleep', emoji: '😴' },
          { value: 'staying_calm', label: 'Staying calm', emoji: '😌' },
          { value: 'understanding', label: 'Understanding how I feel', emoji: '💭' },
        ],
        required: false,
      },
      {
        id: 'kid_obs_wish_different',
        text: 'If you could change ONE thing about {{personName}}, what would it be?',
        type: 'text',
        emoji: '🪄',
        helpText: "It's okay to be honest! This helps them understand you better.",
        required: false,
      },
    ],
  },
  {
    id: 'kid_obs_together',
    title: 'You & {{personName}}',
    description: 'Tell us about your time together',
    emoji: '❤️',
    questions: [
      {
        id: 'kid_obs_favorite_together',
        text: 'What do you love doing together with {{personName}}?',
        type: 'checkboxes',
        emoji: '🎮',
        options: [
          { value: 'games', label: 'Playing games', emoji: '🎲' },
          { value: 'outside', label: 'Going outside', emoji: '🌳' },
          { value: 'cooking', label: 'Cooking together', emoji: '👨‍🍳' },
          { value: 'reading', label: 'Reading together', emoji: '📚' },
          { value: 'talking', label: 'Just talking', emoji: '💬' },
          { value: 'watching', label: 'Watching shows', emoji: '📺' },
          { value: 'trips', label: 'Going on trips', emoji: '🚗' },
          { value: 'cuddling', label: 'Cuddling', emoji: '🤗' },
          { value: 'sports', label: 'Playing sports', emoji: '⚽' },
          { value: 'shopping', label: 'Going shopping', emoji: '🛍️' },
        ],
        required: false,
      },
      {
        id: 'kid_obs_wish_more',
        text: 'What do you wish you could do MORE with {{personName}}?',
        type: 'text',
        emoji: '✨',
        helpText: 'What would you want to do together if you had more time?',
        required: false,
      },
      {
        id: 'kid_obs_feel_safe',
        text: 'How safe do you feel with {{personName}}?',
        type: 'emoji-scale',
        emoji: '🛡️',
        scaleEmojis: ['😟', '😕', '😐', '🙂', '😊'],
        scaleLabels: { min: 'Not very safe', max: 'Super safe!' },
        required: false,
        minAge: 8,
      },
    ],
  },
];

/**
 * Get child observer questions with personName substituted
 */
export function getChildObserverQuestions(personName: string): ChildQuestionSection[] {
  const substitute = (text: string) => text.replace(/\{\{personName\}\}/g, personName);

  return childObserverQuestionnaire.map(section => ({
    ...section,
    title: substitute(section.title),
    description: substitute(section.description),
    questions: section.questions.map(q => ({
      ...q,
      text: substitute(q.text),
      helpText: q.helpText ? substitute(q.helpText) : undefined,
    })),
  }));
}

/**
 * Get total question count for progress tracking
 */
export function getChildObserverTotalQuestions(): number {
  return childObserverQuestionnaire.reduce(
    (sum, section) => sum + section.questions.length, 0
  );
}
