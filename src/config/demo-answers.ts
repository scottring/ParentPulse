/**
 * Sample answers for demo/testing — lets you skip typing and test flows quickly.
 * Each set covers all section/question IDs from the onboarding config.
 */

import { QuestionAnswer } from '@/types/onboarding';

type AnswerSet = Record<string, Record<string, QuestionAnswer>>;

/** Flat lookup: questionId → sample text (for per-field "fill" button in demo mode) */
function flatten(set: AnswerSet): Record<string, QuestionAnswer> {
  const flat: Record<string, QuestionAnswer> = {};
  for (const section of Object.values(set)) {
    for (const [qId, answer] of Object.entries(section)) {
      flat[qId] = answer;
    }
  }
  return flat;
}

let _selfFlat: Record<string, QuestionAnswer> | null = null;
let _observerFlat: Record<string, QuestionAnswer> | null = null;
let _kidFlat: Record<string, any> | null = null;

function flattenAny(set: Record<string, Record<string, any>>): Record<string, any> {
  const flat: Record<string, any> = {};
  for (const section of Object.values(set)) {
    for (const [qId, answer] of Object.entries(section)) {
      flat[qId] = answer;
    }
  }
  return flat;
}

export function getDemoAnswer(questionId: string, perspective: 'self' | 'observer' | 'kid'): any | undefined {
  if (perspective === 'self') {
    _selfFlat ??= flatten(DEMO_SELF_ANSWERS);
    return _selfFlat[questionId];
  }
  if (perspective === 'kid') {
    _kidFlat ??= flattenAny(DEMO_KID_ANSWERS);
    return _kidFlat[questionId];
  }
  _observerFlat ??= flatten(DEMO_OBSERVER_ANSWERS);
  return _observerFlat[questionId];
}

/** Self-perspective answers (for self-onboard flow) */
export const DEMO_SELF_ANSWERS: AnswerSet = {
  overview: {
    overview_q1: 'I love cooking on weekends, morning runs, and deep-dive podcasts. Quality time with family recharges me.',
    overview_q2: 'Small talk drains me. I struggle with last-minute plan changes and unspoken tension.',
    overview_q3: 'Being a great parent and partner. I believe relationships take real work and understanding.',
    overview_q4: 'Comfortable with clear plans and open communication. Uncomfortable when people avoid naming what\'s wrong.',
  },
  triggers: {
    triggers_q1: 'Got frustrated during a disagreement about screen time rules — I shut down instead of explaining why it mattered.',
    triggers_q2: 'Work-to-home transition. Bedtime when everyone\'s tired. Mornings when we\'re running late.',
    triggers_q3: 'When someone acknowledges my feelings before trying to fix things. A few minutes of quiet to decompress.',
  },
  what_works: {
    works_q1: 'Direct communication — ask, don\'t hint. I need some solo recharge time, even just 20 minutes.',
    works_q2: 'A Saturday morning where we had coffee before the kids woke up — no agenda, just talking. Set the tone for the weekend.',
    works_q3: 'Learning new things, meaningful conversations, feeling like I\'m making progress on something.',
  },
  boundaries: {
    boundaries_q1: 'Don\'t bring up heavy topics right when I walk in from work. My morning run is non-negotiable.',
    boundaries_q2: 'I\'m not an introvert — I\'m an ambivert who needs recovery time. I used to feel guilty about needing space.',
    boundaries_q3: 'Sarcasm when I\'m stressed. "You always/never" statements. Trying to solve my problems when I just need to vent.',
  },
  self_worth: {
    sw_global: { primary: 3, timestamp: Date.now() },
    sw_qualities: { primary: 3, timestamp: Date.now() },
    sw_efficacy: { primary: 3, timestamp: Date.now() },
    sw_acceptance: { primary: 2, qualitative: 'I tend to be harder on myself than others are on me.', timestamp: Date.now() },
    sw_social: { primary: 3, timestamp: Date.now() },
  },
};

/** Observer-perspective answers (for onboard/observer flow — about someone else) */
export const DEMO_OBSERVER_ANSWERS: AnswerSet = {
  overview: {
    overview_q1: 'They light up when cooking and get genuinely excited about new ideas. Morning runs are sacred.',
    overview_q2: 'Struggles with ambiguity and last-minute changes. Social events with strangers can be draining.',
    overview_q3: 'Wants to be the best version of themselves in every role. Sometimes this drive creates pressure.',
    overview_q4: 'Comfortable with structure and clear expectations. Uncomfortable when emotions are high but unnamed.',
  },
  triggers: {
    triggers_q1: 'During a disagreement they went quiet and shut down. Took a full day to come back to the conversation.',
    triggers_q2: 'The work-to-home transition is the biggest one. Also feeling like the "bad cop" parent.',
    triggers_q3: 'Give them space first, then gently check in. Acknowledge feelings before jumping to solutions.',
  },
  what_works: {
    works_q1: 'They need to feel heard before they can hear you. Responds well to "I" statements, not criticism.',
    works_q2: 'Our best moments are unhurried mornings and evening walks. When there\'s no agenda and we\'re just present.',
    works_q3: 'New challenges to research and master. Cooking something complex. Deep conversations about parenting.',
  },
  boundaries: {
    boundaries_q1: 'Don\'t ambush them with heavy conversations after work. The morning run is sacred — never suggest skipping.',
    boundaries_q2: 'When they go quiet, they\'re processing — not being cold. Give space and they always come back.',
    boundaries_q3: 'Sarcasm or dismissiveness shuts them down. "Why are you making this a big deal" is the worst thing to say.',
  },
  self_worth: {
    sw_global: { primary: 3, timestamp: Date.now() },
    sw_qualities: { primary: 4, timestamp: Date.now() },
    sw_efficacy: { primary: 3, timestamp: Date.now() },
    sw_acceptance: { primary: 2, timestamp: Date.now() },
    sw_social: { primary: 3, timestamp: Date.now() },
  },
};

/** Kid-session answers (checkboxes, text, emoji — for kid-session flow) */
// Kid answers use `any` because ChildQuestionDisplay accepts raw values (arrays, numbers, strings)
export const DEMO_KID_ANSWERS: Record<string, Record<string, any>> = {
  feelings: {
    what_makes_mad: ['hurried', 'unfair', 'interrupted'],
    how_mad_feels: ['tight', 'want_cry'],
    what_helps_calm: ['draw', 'alone_time', 'talk'],
    happy_things: 'Playing outside with my friends, drawing pictures, and when we do science experiments in the kitchen!',
  },
  strengths: {
    good_at: ['drawing', 'helping', 'reading', 'animals'],
    proud_of: 'I made a card for my friend when she was sad and it made her really smile. I\'m good at knowing when people are upset.',
  },
  challenges: {
    hard_things: ['waiting', 'transitions', 'homework'],
    when_frustrated: ['ask_help', 'get_mad', 'break'],
  },
  daily_life: {
    hardest_time: ['homework_time', 'morning_routine'],
    best_time: 'Right after school when I can play outside or draw. And dinner time when we talk about our days.',
    would_change: 'I wish homework was shorter so I had more time to draw and play.',
  },
  preferences: {
    favorite_activities: ['draw', 'outside', 'read', 'friends', 'family'],
    how_learn_best: ['doing', 'pictures'],
  },
};
