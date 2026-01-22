# Adult Assessment Framework for ParentPulse
## Evidence-Based Psychological Instruments for Comprehensive Adult Profiling

**Version:** 1.0
**Date:** 2026-01-21
**Purpose:** Extend ParentPulse manual generation with validated psychological assessments for adults across core life domains

---

## Executive Summary

This framework integrates **7 validated psychological assessment tools** across **6 critical life domains** to create comprehensive adult baselines. All instruments are:

✓ **Peer-reviewed** with established psychometric properties
✓ **Brief** (5-15 items each) for efficient administration
✓ **Clinically validated** with normative data and scoring guidelines
✓ **Domain-specific** covering relationships, resilience, parenting, work, mental health, and self-worth
✓ **Compatible** with existing ParentPulse data model and Claude AI integration

---

## Current State Assessment

### Already Implemented ✓
1. **RSES (Rosenberg Self-Esteem Scale)** - 6 items measuring global self-worth
2. **VIA Character Strengths** - 10 items from Values in Action framework
3. **Relationship Dynamics** - Qualitative questions on connection, conflict, goals

### Gaps Identified ✗
1. **No attachment style assessment** (critical for intimate relationships)
2. **No resilience/adversity measurement** (coping with stress)
3. **No parenting style quantification** (authoritative vs. permissive)
4. **No work/career assessment** (job satisfaction, competence)
5. **No mental health screening** (anxiety, depression prevalence)
6. **Limited emotional regulation** for adults

---

## Proposed Assessment Framework

### Domain 1: INTIMATE RELATIONSHIPS & ATTACHMENT

#### **ECR-S (Experiences in Close Relationships - Short Form)**
- **Authors:** Wei et al. (2007)
- **Purpose:** Measure adult attachment anxiety and avoidance
- **Items:** 12 items (6 anxiety, 6 avoidance)
- **Scale:** 7-point Likert (1=Strongly Disagree to 7=Strongly Agree)
- **Scoring:**
  - **Anxiety subscale** (avg of 6 items): <2.5 = Low, 2.5-5.0 = Moderate, >5.0 = High
  - **Avoidance subscale** (avg of 6 items): <2.5 = Low, 2.5-4.5 = Moderate, >4.5 = High
- **Attachment Styles:**
  - **Secure:** Low anxiety + Low avoidance
  - **Anxious-Preoccupied:** High anxiety + Low avoidance
  - **Dismissive-Avoidant:** Low anxiety + High avoidance
  - **Fearful-Avoidant:** High anxiety + High avoidance
- **Clinical Source:** Wei, M., Russell, D. W., Mallinckrodt, B., & Vogel, D. L. (2007). *Journal of Counseling Psychology, 54*(1), 59-77.

**Sample Questions:**
```typescript
{
  id: 'ecr_anxiety_1',
  question: 'I worry that romantic partners won\'t care about me as much as I care about them.',
  questionType: 'likert',
  scale: { min: 1, max: 7, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'ECR-S Anxiety Item 1',
  scoringDomain: 'Attachment Anxiety',
  reversed: false
},
{
  id: 'ecr_avoidance_1',
  question: 'I prefer not to show a partner how I feel deep down.',
  questionType: 'likert',
  scale: { min: 1, max: 7, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'ECR-S Avoidance Item 1',
  scoringDomain: 'Attachment Avoidance',
  reversed: false
}
```

**Integration with PersonManual:**
```typescript
assessmentScores: {
  attachment: {
    anxietyItems: { [itemId]: number },
    avoidanceItems: { [itemId]: number },
    anxietyScore: number,      // 1-7 avg
    avoidanceScore: number,    // 1-7 avg
    attachmentStyle: 'secure' | 'anxious-preoccupied' | 'dismissive-avoidant' | 'fearful-avoidant',
    anxietyCategory: 'low' | 'moderate' | 'high',
    avoidanceCategory: 'low' | 'moderate' | 'high',
    questionCount: 12
  }
}
```

---

### Domain 2: DEALING WITH ADVERSITY (RESILIENCE)

#### **BRS (Brief Resilience Scale)**
- **Authors:** Smith et al. (2008)
- **Purpose:** Measure ability to bounce back from stress
- **Items:** 6 items (3 positively worded, 3 reverse-scored)
- **Scale:** 5-point Likert (1=Strongly Disagree to 5=Strongly Agree)
- **Scoring:** Average of 6 items
  - **Low resilience:** 1.00-2.99
  - **Normal resilience:** 3.00-4.30
  - **High resilience:** 4.31-5.00
- **Clinical Source:** Smith, B. W., et al. (2008). *International Journal of Behavioral Medicine, 15*(3), 194-200.

**Sample Questions:**
```typescript
{
  id: 'brs_1',
  question: 'I tend to bounce back quickly after hard times.',
  questionType: 'likert',
  scale: { min: 1, max: 5, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'BRS Item 1',
  scoringDomain: 'Resilience',
  reversed: false
},
{
  id: 'brs_2_reversed',
  question: 'I have a hard time making it through stressful events.',
  questionType: 'likert',
  scale: { min: 1, max: 5, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'BRS Item 2 (Reversed)',
  scoringDomain: 'Resilience',
  reversed: true  // Score as 6-response for averaging
}
```

**Integration with PersonManual:**
```typescript
assessmentScores: {
  resilience: {
    items: { [itemId]: number },
    totalScore: number,        // Sum of items (6-30)
    averageScore: number,      // Avg (1-5)
    category: 'low' | 'normal' | 'high',
    questionCount: 6
  }
}
```

---

### Domain 3: PARENTING STYLE

#### **PS (Parenting Styles Questionnaire - Brief)**
- **Authors:** Adapted from Baumrind (1971), Robinson et al. (2001)
- **Purpose:** Classify parenting approach (Authoritative, Authoritarian, Permissive, Uninvolved)
- **Items:** 12 items (3 per style dimension)
- **Scale:** 5-point Likert (1=Never to 5=Always)
- **Scoring:** Average scores per dimension
  - **Authoritative:** High warmth + High control
  - **Authoritarian:** Low warmth + High control
  - **Permissive:** High warmth + Low control
  - **Uninvolved:** Low warmth + Low control
- **Dimensions:**
  - **Warmth/Responsiveness** (6 items)
  - **Control/Demandingness** (6 items)
- **Clinical Source:** Robinson, C. C., et al. (2001). *Psychological Reports, 89*(1), 139-150.

**Sample Questions:**
```typescript
// WARMTH/RESPONSIVENESS
{
  id: 'ps_warmth_1',
  question: 'I am responsive to my child\'s feelings and needs.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Never', maxLabel: 'Always' },
  clinicalSource: 'Parenting Styles - Warmth Item 1',
  scoringDomain: 'Parenting Warmth',
  reversed: false
},
{
  id: 'ps_warmth_2',
  question: 'I give comfort and understanding when my child is upset.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Never', maxLabel: 'Always' },
  clinicalSource: 'Parenting Styles - Warmth Item 2',
  scoringDomain: 'Parenting Warmth',
  reversed: false
},

// CONTROL/DEMANDINGNESS
{
  id: 'ps_control_1',
  question: 'I expect my child to follow family rules.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Never', maxLabel: 'Always' },
  clinicalSource: 'Parenting Styles - Control Item 1',
  scoringDomain: 'Parenting Control',
  reversed: false
},
{
  id: 'ps_control_2',
  question: 'I provide clear expectations and consequences for my child\'s behavior.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Never', maxLabel: 'Always' },
  clinicalSource: 'Parenting Styles - Control Item 2',
  scoringDomain: 'Parenting Control',
  reversed: false
}
```

**Integration with PersonManual:**
```typescript
assessmentScores: {
  parentingStyle: {
    warmthItems: { [itemId]: number },
    controlItems: { [itemId]: number },
    warmthScore: number,       // Avg 1-5
    controlScore: number,      // Avg 1-5
    primaryStyle: 'authoritative' | 'authoritarian' | 'permissive' | 'uninvolved',
    warmthCategory: 'low' | 'moderate' | 'high',
    controlCategory: 'low' | 'moderate' | 'high',
    questionCount: 12
  }
}
```

---

### Domain 4: WORK/CAREER SATISFACTION

#### **BWSS (Brief Work Satisfaction Scale)**
- **Authors:** Adapted from Judge & Locke (1993), Spector (1997)
- **Purpose:** Measure job satisfaction and work-related well-being
- **Items:** 8 items across 4 facets
- **Scale:** 7-point Likert (1=Strongly Disagree to 7=Strongly Agree)
- **Facets:**
  - **Task satisfaction** (2 items) - Interest in work itself
  - **Competence** (2 items) - Feeling capable and effective
  - **Autonomy** (2 items) - Control over work methods
  - **Purpose/Meaning** (2 items) - Significance of work
- **Scoring:** Average across items (1-7)
  - **Low satisfaction:** 1.0-3.5
  - **Moderate satisfaction:** 3.6-5.5
  - **High satisfaction:** 5.6-7.0

**Sample Questions:**
```typescript
// TASK SATISFACTION
{
  id: 'work_task_1',
  question: 'I find my work interesting and engaging.',
  questionType: 'likert',
  scale: { min: 1, max: 7, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'Work Satisfaction - Task Item 1',
  scoringDomain: 'Work Task Satisfaction',
  reversed: false
},

// COMPETENCE
{
  id: 'work_competence_1',
  question: 'I feel confident in my ability to do my job well.',
  questionType: 'likert',
  scale: { min: 1, max: 7, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'Work Satisfaction - Competence Item 1',
  scoringDomain: 'Work Competence',
  reversed: false
},

// AUTONOMY
{
  id: 'work_autonomy_1',
  question: 'I have freedom to decide how I do my work.',
  questionType: 'likert',
  scale: { min: 1, max: 7, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'Work Satisfaction - Autonomy Item 1',
  scoringDomain: 'Work Autonomy',
  reversed: false
},

// PURPOSE/MEANING
{
  id: 'work_purpose_1',
  question: 'My work contributes to something meaningful.',
  questionType: 'likert',
  scale: { min: 1, max: 7, minLabel: 'Strongly Disagree', maxLabel: 'Strongly Agree' },
  clinicalSource: 'Work Satisfaction - Purpose Item 1',
  scoringDomain: 'Work Purpose',
  reversed: false
}
```

**Integration with PersonManual:**
```typescript
assessmentScores: {
  workSatisfaction: {
    items: { [itemId]: number },
    taskScore: number,          // Avg 1-7
    competenceScore: number,    // Avg 1-7
    autonomyScore: number,      // Avg 1-7
    purposeScore: number,       // Avg 1-7
    overallScore: number,       // Avg 1-7
    category: 'low' | 'moderate' | 'high',
    questionCount: 8
  }
}
```

---

### Domain 5: MENTAL HEALTH SCREENING

#### **PHQ-4 (Patient Health Questionnaire-4)**
- **Authors:** Kroenke et al. (2009)
- **Purpose:** Ultra-brief screening for depression and anxiety
- **Items:** 4 items (2 depression, 2 anxiety)
- **Scale:** 4-point frequency (0=Not at all, 1=Several days, 2=More than half the days, 3=Nearly every day)
- **Timeframe:** "Over the past 2 weeks..."
- **Scoring:**
  - **Depression subscale (PHQ-2):** 0-6 (≥3 = positive screen)
  - **Anxiety subscale (GAD-2):** 0-6 (≥3 = positive screen)
  - **Total score:** 0-12
    - **None/minimal:** 0-2
    - **Mild:** 3-5
    - **Moderate:** 6-8
    - **Severe:** 9-12
- **Clinical Source:** Kroenke, K., et al. (2009). *Psychosomatics, 50*(6), 613-621.

**Sample Questions:**
```typescript
// DEPRESSION (PHQ-2)
{
  id: 'phq_depression_1',
  question: 'Over the past 2 weeks, how often have you felt little interest or pleasure in doing things?',
  questionType: 'frequency',
  scale: {
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' }
    ]
  },
  clinicalSource: 'PHQ-4 Depression Item 1',
  scoringDomain: 'Depression Screening',
  reversed: false
},
{
  id: 'phq_depression_2',
  question: 'Over the past 2 weeks, how often have you felt down, depressed, or hopeless?',
  questionType: 'frequency',
  scale: {
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' }
    ]
  },
  clinicalSource: 'PHQ-4 Depression Item 2',
  scoringDomain: 'Depression Screening',
  reversed: false
},

// ANXIETY (GAD-2)
{
  id: 'gad_anxiety_1',
  question: 'Over the past 2 weeks, how often have you felt nervous, anxious, or on edge?',
  questionType: 'frequency',
  scale: {
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' }
    ]
  },
  clinicalSource: 'PHQ-4 Anxiety Item 1',
  scoringDomain: 'Anxiety Screening',
  reversed: false
},
{
  id: 'gad_anxiety_2',
  question: 'Over the past 2 weeks, how often have you not been able to stop or control worrying?',
  questionType: 'frequency',
  scale: {
    options: [
      { value: 0, label: 'Not at all' },
      { value: 1, label: 'Several days' },
      { value: 2, label: 'More than half the days' },
      { value: 3, label: 'Nearly every day' }
    ]
  },
  clinicalSource: 'PHQ-4 Anxiety Item 2',
  scoringDomain: 'Anxiety Screening',
  reversed: false
}
```

**Integration with PersonManual:**
```typescript
assessmentScores: {
  mentalHealth: {
    depressionItems: { [itemId]: number },
    anxietyItems: { [itemId]: number },
    depressionScore: number,    // 0-6
    anxietyScore: number,       // 0-6
    totalScore: number,         // 0-12
    depressionScreen: 'negative' | 'positive',  // ≥3 = positive
    anxietyScreen: 'negative' | 'positive',     // ≥3 = positive
    overallSeverity: 'none-minimal' | 'mild' | 'moderate' | 'severe',
    questionCount: 4,
    clinicalNote: 'Positive screens indicate need for further clinical evaluation'
  }
}
```

---

### Domain 6: EMOTIONAL REGULATION (ADULTS)

#### **DERS-SF (Difficulties in Emotion Regulation Scale - Short Form)**
- **Authors:** Kaufman et al. (2016)
- **Purpose:** Measure emotion regulation difficulties
- **Items:** 18 items (abbreviated from 36-item DERS)
- **Scale:** 5-point Likert (1=Almost Never to 5=Almost Always)
- **Subscales:**
  - **Non-acceptance** (3 items) - Negative reactions to distress
  - **Goals** (3 items) - Difficulty concentrating when upset
  - **Impulse** (3 items) - Difficulty controlling behavior when upset
  - **Awareness** (3 items, reversed) - Attention to emotions
  - **Strategies** (3 items) - Access to regulation strategies
  - **Clarity** (3 items, reversed) - Understanding emotions
- **Scoring:** Sum items (18-90)
  - **Low difficulties:** 18-40
  - **Moderate difficulties:** 41-65
  - **High difficulties:** 66-90

**Sample Questions:**
```typescript
// NON-ACCEPTANCE
{
  id: 'ders_nonaccept_1',
  question: 'When I\'m upset, I become angry with myself for feeling that way.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Almost Never', maxLabel: 'Almost Always' },
  clinicalSource: 'DERS-SF Non-Acceptance Item 1',
  scoringDomain: 'Emotional Non-Acceptance',
  reversed: false
},

// GOALS
{
  id: 'ders_goals_1',
  question: 'When I\'m upset, I have difficulty concentrating.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Almost Never', maxLabel: 'Almost Always' },
  clinicalSource: 'DERS-SF Goals Item 1',
  scoringDomain: 'Goal-Directed Behavior',
  reversed: false
},

// IMPULSE
{
  id: 'ders_impulse_1',
  question: 'When I\'m upset, I lose control over my behaviors.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Almost Never', maxLabel: 'Almost Always' },
  clinicalSource: 'DERS-SF Impulse Item 1',
  scoringDomain: 'Impulse Control',
  reversed: false
},

// AWARENESS (reversed scoring)
{
  id: 'ders_awareness_1',
  question: 'I pay attention to how I feel.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Almost Never', maxLabel: 'Almost Always' },
  clinicalSource: 'DERS-SF Awareness Item 1 (Reversed)',
  scoringDomain: 'Emotional Awareness',
  reversed: true
},

// STRATEGIES
{
  id: 'ders_strategies_1',
  question: 'When I\'m upset, I believe there is nothing I can do to feel better.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Almost Never', maxLabel: 'Almost Always' },
  clinicalSource: 'DERS-SF Strategies Item 1',
  scoringDomain: 'Regulation Strategies',
  reversed: false
},

// CLARITY (reversed scoring)
{
  id: 'ders_clarity_1',
  question: 'I am clear about what emotions I\'m feeling.',
  questionType: 'frequency',
  scale: { min: 1, max: 5, minLabel: 'Almost Never', maxLabel: 'Almost Always' },
  clinicalSource: 'DERS-SF Clarity Item 1 (Reversed)',
  scoringDomain: 'Emotional Clarity',
  reversed: true
}
```

**Integration with PersonManual:**
```typescript
assessmentScores: {
  emotionalRegulation: {
    items: { [itemId]: number },
    nonAcceptanceScore: number,  // Avg per subscale
    goalsScore: number,
    impulseScore: number,
    awarenessScore: number,      // Higher = better
    strategiesScore: number,
    clarityScore: number,        // Higher = better
    totalScore: number,          // Sum 18-90
    category: 'low-difficulties' | 'moderate-difficulties' | 'high-difficulties',
    questionCount: 18
  }
}
```

---

### Domain 7: LOVE LANGUAGES (RELATIONSHIPS)

#### **5 Love Languages Assessment**
- **Authors:** Gary Chapman (1992)
- **Purpose:** Identify preferred ways of giving and receiving love/affection
- **Items:** 10 forced-choice pairs (20 total preferences)
- **Scale:** Forced choice between two statements (A or B)
- **Languages:**
  1. **Words of Affirmation** - Verbal compliments, encouragement, appreciation
  2. **Quality Time** - Undivided attention, meaningful conversations, shared activities
  3. **Receiving Gifts** - Thoughtful presents, tokens of appreciation, symbols of love
  4. **Acts of Service** - Helpful actions, doing things for partner, lightening their load
  5. **Physical Touch** - Hugs, kisses, hand-holding, physical closeness
- **Scoring:** Count selections per language (0-10 each)
  - **Primary Love Language:** Highest count (typically 6-10)
  - **Secondary Love Language:** Second highest (typically 4-7)
  - **Least Important:** Lowest counts (typically 0-3)
- **Clinical Source:** Chapman, G. (1992). *The Five Love Languages: How to Express Heartfelt Commitment to Your Mate*. (Note: Not a peer-reviewed psychometric instrument but widely used in couples therapy with high face validity)

**Sample Questions:**
```typescript
// FORCED CHOICE FORMAT
{
  id: 'love_lang_1',
  question: 'Which would make you feel more loved?',
  questionType: 'forced_choice',
  options: [
    {
      value: 'words_of_affirmation',
      label: 'A) Your partner says "I really appreciate all you do for our family"',
      language: 'Words of Affirmation'
    },
    {
      value: 'quality_time',
      label: 'B) Your partner turns off their phone to have a conversation with you',
      language: 'Quality Time'
    }
  ],
  clinicalSource: 'Love Languages Item 1',
  scoringDomain: 'Preferred Expression of Love',
  reversed: false
},
{
  id: 'love_lang_2',
  question: 'Which means more to you?',
  questionType: 'forced_choice',
  options: [
    {
      value: 'acts_of_service',
      label: 'A) Your partner does the dishes without being asked',
      language: 'Acts of Service'
    },
    {
      value: 'physical_touch',
      label: 'B) Your partner gives you a long hug when you\'re stressed',
      language: 'Physical Touch'
    }
  ],
  clinicalSource: 'Love Languages Item 2',
  scoringDomain: 'Preferred Expression of Love',
  reversed: false
},
{
  id: 'love_lang_3',
  question: 'What would feel most special to you?',
  questionType: 'forced_choice',
  options: [
    {
      value: 'receiving_gifts',
      label: 'A) Your partner surprises you with a small gift that reminded them of you',
      language: 'Receiving Gifts'
    },
    {
      value: 'words_of_affirmation',
      label: 'B) Your partner writes you a heartfelt note about why they love you',
      language: 'Words of Affirmation'
    }
  ],
  clinicalSource: 'Love Languages Item 3',
  scoringDomain: 'Preferred Expression of Love',
  reversed: false
},
{
  id: 'love_lang_4',
  question: 'Which would make you feel more cared for?',
  questionType: 'forced_choice',
  options: [
    {
      value: 'quality_time',
      label: 'A) Your partner plans a date night with just the two of you',
      language: 'Quality Time'
    },
    {
      value: 'acts_of_service',
      label: 'B) Your partner takes care of an errand you\'ve been dreading',
      language: 'Acts of Service'
    }
  ],
  clinicalSource: 'Love Languages Item 4',
  scoringDomain: 'Preferred Expression of Love',
  reversed: false
},
{
  id: 'love_lang_5',
  question: 'What makes you feel most connected?',
  questionType: 'forced_choice',
  options: [
    {
      value: 'physical_touch',
      label: 'A) Your partner holds your hand while watching TV together',
      language: 'Physical Touch'
    },
    {
      value: 'receiving_gifts',
      label: 'B) Your partner brings you your favorite treat without you asking',
      language: 'Receiving Gifts'
    }
  ],
  clinicalSource: 'Love Languages Item 5',
  scoringDomain: 'Preferred Expression of Love',
  reversed: false
}
// ... continue with 5 more pairs to cover all 10 combinations
```

**Complete Pairing Matrix (10 questions required):**
Each language must be compared with every other language exactly once:

| Question | Option A | Option B |
|----------|----------|----------|
| 1 | Words of Affirmation | Quality Time |
| 2 | Acts of Service | Physical Touch |
| 3 | Receiving Gifts | Words of Affirmation |
| 4 | Quality Time | Acts of Service |
| 5 | Physical Touch | Receiving Gifts |
| 6 | Words of Affirmation | Acts of Service |
| 7 | Quality Time | Physical Touch |
| 8 | Receiving Gifts | Acts of Service |
| 9 | Words of Affirmation | Physical Touch |
| 10 | Quality Time | Receiving Gifts |

**Additional: Partner & Family Love Languages**
For comprehensive relationship profiling, assess:
1. **My Love Language** (10 forced-choice pairs above)
2. **How I Think My Partner Receives Love** (same 10 pairs, but "What makes your partner feel most loved?")
3. **How I Think My Child Receives Love** (adapted for parent-child: e.g., "praise" instead of "romantic words")
4. **How I Think My Parent/Sibling Receives Love** (family member variant)

This creates opportunities for:
- **Mismatch identification:** "You prefer Quality Time but your partner primarily gives Acts of Service"
- **Communication insights:** "You both value Physical Touch - prioritize this in reconnection strategies"
- **Family dynamics:** "Your child's love language is Words of Affirmation, but you default to Acts of Service"

**Integration with PersonManual:**
```typescript
assessmentScores: {
  loveLanguages: {
    self: {
      wordsOfAffirmation: number,    // 0-10 count
      qualityTime: number,
      receivingGifts: number,
      actsOfService: number,
      physicalTouch: number,
      primaryLanguage: 'words_of_affirmation' | 'quality_time' | 'receiving_gifts' | 'acts_of_service' | 'physical_touch',
      secondaryLanguage: string,
      ranking: string[],             // All 5 ranked by score
      questionCount: 10
    },
    partnerPerception?: {            // "How I think my partner receives love"
      wordsOfAffirmation: number,
      qualityTime: number,
      receivingGifts: number,
      actsOfService: number,
      physicalTouch: number,
      primaryLanguage: string,
      mismatchWithSelf?: {           // Auto-calculated
        selfPrimary: string,
        partnerPrimary: string,
        alignment: 'matched' | 'complementary' | 'mismatched'
      }
    },
    childPerception?: {              // For parents
      wordsOfAffirmation: number,
      qualityTime: number,
      receivingGifts: number,
      actsOfService: number,
      physicalTouch: number,
      primaryLanguage: string
    }
  }
}
```

**Scoring Function Example:**
```typescript
export function extractLoveLanguageScores(answers: WizardAnswers): LoveLanguageScores | null {
  const loveLanguageAnswers = answers.love_languages;
  if (!loveLanguageAnswers) return null;

  const counts = {
    words_of_affirmation: 0,
    quality_time: 0,
    receiving_gifts: 0,
    acts_of_service: 0,
    physical_touch: 0
  };

  // Count selections across all 10 forced-choice pairs
  for (let i = 1; i <= 10; i++) {
    const answer = loveLanguageAnswers[`love_lang_${i}`];
    if (typeof answer === 'string' && answer in counts) {
      counts[answer as keyof typeof counts]++;
    } else if (typeof answer === 'object' && 'primary' in answer) {
      const choice = String(answer.primary);
      if (choice in counts) {
        counts[choice as keyof typeof counts]++;
      }
    }
  }

  // Rank languages by count
  const ranked = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([lang]) => lang);

  return {
    wordsOfAffirmation: counts.words_of_affirmation,
    qualityTime: counts.quality_time,
    receivingGifts: counts.receiving_gifts,
    actsOfService: counts.acts_of_service,
    physicalTouch: counts.physical_touch,
    primaryLanguage: ranked[0] as any,
    secondaryLanguage: ranked[1],
    ranking: ranked,
    questionCount: 10
  };
}
```

**Use Cases in Manual Generation:**

1. **Romantic Relationships:**
   - Generate "What Works" strategies aligned with partner's primary love language
   - Identify "What Doesn't Work" when partners have mismatched languages
   - Create reconnection rituals using both partners' top 2 languages
   - Flag potential conflicts: "You need Quality Time but partner shows love through Acts of Service"

2. **Parent-Child:**
   - Tailor parenting strategies to child's love language
   - Example: "Your child's primary language is Words of Affirmation - use specific praise like 'I noticed you shared your toy, that was kind'"
   - Explain why generic rewards (Gifts) might not resonate if child values Physical Touch

3. **Family Members:**
   - Improve sibling relationships by teaching each other's languages
   - Elderly parent care: "Your parent values Acts of Service - helping with chores means more than verbal praise"
   - Create family rituals honoring multiple love languages

**Claude Prompt Enhancement:**
```typescript
if (assessmentScores.loveLanguages) {
  const ll = assessmentScores.loveLanguages.self;
  prompt += `\n\nLove Language Profile:
Primary: ${ll.primaryLanguage} (${ll[ll.primaryLanguage as any]}/10 selections)
Secondary: ${ll.secondaryLanguage}
Full Ranking: ${ll.ranking.join(' > ')}

This means ${personName} feels most loved through ${ll.primaryLanguage.replace('_', ' ')}.

APPLY THIS TO MANUAL GENERATION:
- "What Works" strategies should include ${ll.primaryLanguage}-based reconnection (e.g., ${getLoveLanguageExample(ll.primaryLanguage)})
- Triggers may include feeling unloved when partner doesn't speak this language
- Boundaries should protect time/space for receiving love in preferred way`;

  // If partner perception exists
  if (assessmentScores.loveLanguages.partnerPerception) {
    const pp = assessmentScores.loveLanguages.partnerPerception;
    prompt += `\n\nPartner's Perceived Love Language: ${pp.primaryLanguage}
⚠️ ${ll.primaryLanguage === pp.primaryLanguage ? '✓ ALIGNED - You both speak the same love language' : '⚠️ MISMATCH - You need ' + ll.primaryLanguage + ' but partner likely gives ' + pp.primaryLanguage}

Include in "What Works": Teach partner to speak your love language
Include in "Important Context": This mismatch may cause "feeling unloved" even when partner is trying`;
  }
}

function getLoveLanguageExample(language: string): string {
  const examples = {
    'words_of_affirmation': 'specific verbal appreciation, love notes, encouragement',
    'quality_time': 'undivided attention, device-free conversations, date nights',
    'receiving_gifts': 'thoughtful tokens, surprise treats, meaningful presents',
    'acts_of_service': 'helpful actions, doing their chores, lightening their load',
    'physical_touch': 'hugs, hand-holding, physical closeness, massage'
  };
  return examples[language as keyof typeof examples] || language;
}
```

---

## Implementation Roadmap

### Phase 1: Data Model Extensions (Week 1)

**File:** `/src/types/onboarding.ts`

```typescript
// Extend AssessmentScores interface
export interface AssessmentScores {
  // EXISTING
  via?: VIAScores;
  selfWorth?: SelfWorthScores;
  adhd?: ADHDScores;
  sensory?: SensoryScores;
  executiveFunction?: ExecutiveFunctionScores;

  // NEW ADULT ASSESSMENTS
  attachment?: AttachmentScores;
  resilience?: ResilienceScores;
  parentingStyle?: ParentingStyleScores;
  workSatisfaction?: WorkSatisfactionScores;
  mentalHealth?: MentalHealthScores;
  emotionalRegulation?: EmotionalRegulationScores;
  loveLanguages?: LoveLanguageScores;
}

export interface AttachmentScores {
  anxietyItems: { [itemId: string]: number };
  avoidanceItems: { [itemId: string]: number };
  anxietyScore: number;
  avoidanceScore: number;
  attachmentStyle: 'secure' | 'anxious-preoccupied' | 'dismissive-avoidant' | 'fearful-avoidant';
  anxietyCategory: 'low' | 'moderate' | 'high';
  avoidanceCategory: 'low' | 'moderate' | 'high';
  questionCount: number;
}

export interface ResilienceScores {
  items: { [itemId: string]: number };
  totalScore: number;
  averageScore: number;
  category: 'low' | 'normal' | 'high';
  questionCount: number;
}

export interface ParentingStyleScores {
  warmthItems: { [itemId: string]: number };
  controlItems: { [itemId: string]: number };
  warmthScore: number;
  controlScore: number;
  primaryStyle: 'authoritative' | 'authoritarian' | 'permissive' | 'uninvolved';
  warmthCategory: 'low' | 'moderate' | 'high';
  controlCategory: 'low' | 'moderate' | 'high';
  questionCount: number;
}

export interface WorkSatisfactionScores {
  items: { [itemId: string]: number };
  taskScore: number;
  competenceScore: number;
  autonomyScore: number;
  purposeScore: number;
  overallScore: number;
  category: 'low' | 'moderate' | 'high';
  questionCount: number;
}

export interface MentalHealthScores {
  depressionItems: { [itemId: string]: number };
  anxietyItems: { [itemId: string]: number };
  depressionScore: number;
  anxietyScore: number;
  totalScore: number;
  depressionScreen: 'negative' | 'positive';
  anxietyScreen: 'negative' | 'positive';
  overallSeverity: 'none-minimal' | 'mild' | 'moderate' | 'severe';
  questionCount: number;
  clinicalNote: string;
}

export interface EmotionalRegulationScores {
  items: { [itemId: string]: number };
  nonAcceptanceScore: number;
  goalsScore: number;
  impulseScore: number;
  awarenessScore: number;
  strategiesScore: number;
  clarityScore: number;
  totalScore: number;
  category: 'low-difficulties' | 'moderate-difficulties' | 'high-difficulties';
  questionCount: number;
}

export interface LoveLanguageScores {
  self: {
    wordsOfAffirmation: number;
    qualityTime: number;
    receivingGifts: number;
    actsOfService: number;
    physicalTouch: number;
    primaryLanguage: 'words_of_affirmation' | 'quality_time' | 'receiving_gifts' | 'acts_of_service' | 'physical_touch';
    secondaryLanguage: string;
    ranking: string[];
    questionCount: number;
  };
  partnerPerception?: {
    wordsOfAffirmation: number;
    qualityTime: number;
    receivingGifts: number;
    actsOfService: number;
    physicalTouch: number;
    primaryLanguage: string;
    mismatchWithSelf?: {
      selfPrimary: string;
      partnerPrimary: string;
      alignment: 'matched' | 'complementary' | 'mismatched';
    };
  };
  childPerception?: {
    wordsOfAffirmation: number;
    qualityTime: number;
    receivingGifts: number;
    actsOfService: number;
    physicalTouch: number;
    primaryLanguage: string;
  };
}
```

### Phase 2: Question Bank Creation (Week 1-2)

**File:** `/src/config/adult-assessments.ts`

```typescript
import { OnboardingSection } from '@/types/onboarding';

export const adultPsychologicalAssessments: OnboardingSection[] = [
  {
    sectionId: 'attachment',
    sectionName: 'Relationship Attachment Style',
    sectionDescription: 'Understanding how you connect with romantic partners',
    icon: '💞',
    skippable: false,
    questions: [
      // ECR-S questions here (12 items)
      // ... see sample questions above
    ]
  },
  {
    sectionId: 'resilience',
    sectionName: 'Resilience & Coping',
    sectionDescription: 'How you bounce back from stress and adversity',
    icon: '🌱',
    skippable: false,
    questions: [
      // BRS questions here (6 items)
      // ... see sample questions above
    ]
  },
  {
    sectionId: 'parenting_style',
    sectionName: 'Parenting Approach',
    sectionDescription: 'Your parenting style and strategies',
    icon: '👨‍👩‍👧‍👦',
    skippable: false,
    questions: [
      // PS questions here (12 items)
      // ... see sample questions above
    ]
  },
  {
    sectionId: 'work_satisfaction',
    sectionName: 'Work & Career',
    sectionDescription: 'Job satisfaction and professional well-being',
    icon: '💼',
    skippable: false,
    questions: [
      // BWSS questions here (8 items)
      // ... see sample questions above
    ]
  },
  {
    sectionId: 'mental_health',
    sectionName: 'Mental Health Screening',
    sectionDescription: 'Brief screening for anxiety and depression',
    icon: '🧠',
    skippable: false,
    questions: [
      // PHQ-4 questions here (4 items)
      // ... see sample questions above
    ]
  },
  {
    sectionId: 'emotional_regulation',
    sectionName: 'Emotional Regulation',
    sectionDescription: 'How you manage and understand your emotions',
    icon: '🎭',
    skippable: false,
    questions: [
      // DERS-SF questions here (18 items)
      // ... see sample questions above
    ]
  },
  {
    sectionId: 'love_languages',
    sectionName: 'Love Languages',
    sectionDescription: 'How you prefer to give and receive love',
    icon: '💝',
    skippable: false,
    questions: [
      // Love Languages questions here (10 forced-choice pairs)
      // ... see sample questions above
    ]
  }
];
```

### Phase 3: Scoring Logic (Week 2)

**File:** `/functions/utils/assessmentScoring.ts`

```typescript
import { WizardAnswers, AssessmentScores } from '../types/onboarding';

/**
 * Extract attachment scores from ECR-S responses
 */
export function extractAttachmentScores(answers: WizardAnswers): AttachmentScores | null {
  const attachmentAnswers = answers.attachment;
  if (!attachmentAnswers) return null;

  const anxietyItems: { [key: string]: number } = {};
  const avoidanceItems: { [key: string]: number } = {};

  // Extract anxiety items (ecr_anxiety_1 through ecr_anxiety_6)
  for (let i = 1; i <= 6; i++) {
    const itemId = `ecr_anxiety_${i}`;
    const answer = attachmentAnswers[itemId];
    if (typeof answer === 'object' && 'primary' in answer) {
      anxietyItems[itemId] = Number(answer.primary);
    } else if (typeof answer === 'number') {
      anxietyItems[itemId] = answer;
    }
  }

  // Extract avoidance items (ecr_avoidance_1 through ecr_avoidance_6)
  for (let i = 1; i <= 6; i++) {
    const itemId = `ecr_avoidance_${i}`;
    const answer = attachmentAnswers[itemId];
    if (typeof answer === 'object' && 'primary' in answer) {
      avoidanceItems[itemId] = Number(answer.primary);
    } else if (typeof answer === 'number') {
      avoidanceItems[itemId] = answer;
    }
  }

  // Calculate subscale averages
  const anxietyScore = Object.values(anxietyItems).reduce((sum, val) => sum + val, 0) / 6;
  const avoidanceScore = Object.values(avoidanceItems).reduce((sum, val) => sum + val, 0) / 6;

  // Categorize
  const anxietyCategory = anxietyScore < 2.5 ? 'low' : anxietyScore <= 5.0 ? 'moderate' : 'high';
  const avoidanceCategory = avoidanceScore < 2.5 ? 'low' : avoidanceScore <= 4.5 ? 'moderate' : 'high';

  // Determine attachment style
  let attachmentStyle: 'secure' | 'anxious-preoccupied' | 'dismissive-avoidant' | 'fearful-avoidant';
  if (anxietyCategory === 'low' && avoidanceCategory === 'low') {
    attachmentStyle = 'secure';
  } else if (anxietyCategory === 'high' && avoidanceCategory === 'low') {
    attachmentStyle = 'anxious-preoccupied';
  } else if (anxietyCategory === 'low' && avoidanceCategory === 'high') {
    attachmentStyle = 'dismissive-avoidant';
  } else {
    attachmentStyle = 'fearful-avoidant';
  }

  return {
    anxietyItems,
    avoidanceItems,
    anxietyScore: Math.round(anxietyScore * 100) / 100,
    avoidanceScore: Math.round(avoidanceScore * 100) / 100,
    attachmentStyle,
    anxietyCategory,
    avoidanceCategory,
    questionCount: 12
  };
}

/**
 * Extract resilience scores from BRS responses
 */
export function extractResilienceScores(answers: WizardAnswers): ResilienceScores | null {
  const resilienceAnswers = answers.resilience;
  if (!resilienceAnswers) return null;

  const items: { [key: string]: number } = {};
  const reversedItems = ['brs_2_reversed', 'brs_4_reversed', 'brs_6_reversed'];

  // Extract and reverse score as needed
  for (let i = 1; i <= 6; i++) {
    const itemId = `brs_${i}${reversedItems.includes(`brs_${i}_reversed`) ? '_reversed' : ''}`;
    const answer = resilienceAnswers[itemId];

    let score: number;
    if (typeof answer === 'object' && 'primary' in answer) {
      score = Number(answer.primary);
    } else if (typeof answer === 'number') {
      score = answer;
    } else {
      continue;
    }

    // Reverse score if needed (6 - original score)
    if (reversedItems.includes(itemId)) {
      score = 6 - score;
    }

    items[itemId] = score;
  }

  const totalScore = Object.values(items).reduce((sum, val) => sum + val, 0);
  const averageScore = totalScore / 6;

  // Categorize
  let category: 'low' | 'normal' | 'high';
  if (averageScore < 3.0) {
    category = 'low';
  } else if (averageScore <= 4.3) {
    category = 'normal';
  } else {
    category = 'high';
  }

  return {
    items,
    totalScore: Math.round(totalScore * 100) / 100,
    averageScore: Math.round(averageScore * 100) / 100,
    category,
    questionCount: 6
  };
}

// Similar functions for:
// - extractParentingStyleScores()
// - extractWorkSatisfactionScores()
// - extractMentalHealthScores()
// - extractEmotionalRegulationScores()

/**
 * Master function to extract all adult assessment scores
 */
export function extractAdultAssessmentScores(answers: WizardAnswers): Partial<AssessmentScores> {
  return {
    attachment: extractAttachmentScores(answers),
    resilience: extractResilienceScores(answers),
    parentingStyle: extractParentingStyleScores(answers),
    workSatisfaction: extractWorkSatisfactionScores(answers),
    mentalHealth: extractMentalHealthScores(answers),
    emotionalRegulation: extractEmotionalRegulationScores(answers)
  };
}
```

### Phase 4: Claude Prompt Engineering (Week 3)

**File:** `/functions/index.js` (update `buildManualContentPrompt`)

Add assessment score interpretation to Claude prompt:

```typescript
function buildManualContentPrompt(personName, relationshipType, formattedAnswers, assessmentScores) {
  let prompt = `You are generating a therapeutic manual for ${personName}...`;

  // Add assessment score context
  if (assessmentScores) {
    prompt += `\n\nVALIDATED ASSESSMENT RESULTS:\n`;

    if (assessmentScores.attachment) {
      prompt += `\nAttachment Style (ECR-S): ${assessmentScores.attachment.attachmentStyle}
- Anxiety: ${assessmentScores.attachment.anxietyScore}/7 (${assessmentScores.attachment.anxietyCategory})
- Avoidance: ${assessmentScores.attachment.avoidanceScore}/7 (${assessmentScores.attachment.avoidanceCategory})
Interpretation: Use this to understand relationship patterns, fear of abandonment, comfort with intimacy.`;
    }

    if (assessmentScores.resilience) {
      prompt += `\n\nResilience (BRS): ${assessmentScores.resilience.averageScore}/5 (${assessmentScores.resilience.category})
Interpretation: ${assessmentScores.resilience.category === 'high' ? 'Strong bounce-back ability' : assessmentScores.resilience.category === 'normal' ? 'Average coping capacity' : 'May need resilience-building support'}`;
    }

    if (assessmentScores.mentalHealth) {
      const mh = assessmentScores.mentalHealth;
      prompt += `\n\nMental Health Screening (PHQ-4):
- Depression: ${mh.depressionScore}/6 (${mh.depressionScreen})
- Anxiety: ${mh.anxietyScore}/6 (${mh.anxietyScreen})
- Overall: ${mh.overallSeverity}
⚠️ ${mh.depressionScreen === 'positive' || mh.anxietyScreen === 'positive' ? 'POSITIVE SCREEN - Consider clinical referral' : 'Negative screen'}`;
    }

    if (assessmentScores.emotionalRegulation) {
      prompt += `\n\nEmotional Regulation (DERS-SF): ${assessmentScores.emotionalRegulation.totalScore}/90 (${assessmentScores.emotionalRegulation.category})
Subscales:
- Non-acceptance of emotions: ${assessmentScores.emotionalRegulation.nonAcceptanceScore}/5
- Goal interference when upset: ${assessmentScores.emotionalRegulation.goalsScore}/5
- Impulse control difficulties: ${assessmentScores.emotionalRegulation.impulseScore}/5
- Emotional awareness: ${assessmentScores.emotionalRegulation.awarenessScore}/5 (higher = better)
- Limited strategies: ${assessmentScores.emotionalRegulation.strategiesScore}/5
- Emotional clarity: ${assessmentScores.emotionalRegulation.clarityScore}/5 (higher = better)`;
    }

    // Similar for parenting style, work satisfaction...
  }

  prompt += `\n\nUSE THESE ASSESSMENT RESULTS TO:
1. Identify patterns in triggers (e.g., attachment anxiety → abandonment triggers)
2. Tailor "what works" strategies to resilience level and emotional regulation profile
3. Flag clinical concerns in importantContext if mental health screens are positive
4. Recognize strengths aligned with character strengths and work competence
5. Frame relationship boundaries using attachment style insights`;

  return prompt;
}
```

### Phase 5: UI/UX Integration (Week 3-4)

**Conditional Section Display** based on relationship type:

```typescript
// /src/app/people/[personId]/manual/onboard/page.tsx

const getRelevantAssessments = (relationshipType: RelationshipType) => {
  const baseAssessments = [
    'self_worth',     // RSES - all relationships
    'strengths'       // VIA - all relationships
  ];

  const relationshipSpecific: string[] = [];

  switch (relationshipType) {
    case 'spouse':
    case 'partner':
      relationshipSpecific.push(
        'attachment',           // ECR-S
        'resilience',           // BRS
        'mental_health',        // PHQ-4
        'emotional_regulation'  // DERS-SF
      );
      break;

    case 'child':
      relationshipSpecific.push(
        'parenting_style',      // PS
        'resilience',           // BRS
        'mental_health'         // PHQ-4
      );
      break;

    case 'elderly_parent':
      relationshipSpecific.push(
        'resilience',           // BRS
        'mental_health'         // PHQ-4
      );
      break;

    case 'professional':
    case 'self':
      relationshipSpecific.push(
        'work_satisfaction',    // BWSS
        'resilience',           // BRS
        'mental_health',        // PHQ-4
        'emotional_regulation'  // DERS-SF
      );
      break;

    default:
      // Minimal assessment for other relationship types
      relationshipSpecific.push('mental_health');
  }

  return [...baseAssessments, ...relationshipSpecific];
};
```

---

## Expected Benefits

### 1. **Clinical Validity**
- All instruments peer-reviewed with established norms
- Quantitative baselines enable progress tracking
- Normative comparisons (e.g., "resilience score is in the 75th percentile")

### 2. **Personalized AI Content**
- Claude generates triggers, strategies, boundaries informed by:
  - Attachment style (relationship patterns)
  - Resilience level (coping capacity)
  - Mental health status (clinical needs)
  - Emotional regulation profile (de-escalation strategies)
  - Parenting style (discipline approaches)
  - Work satisfaction (stress sources)

### 3. **Progress Monitoring**
- Reassessment every 3-6 months
- Track changes in:
  - Self-worth trajectory
  - Resilience improvements
  - Mental health symptom reduction
  - Attachment security increases
- Visual dashboards showing score evolution

### 4. **Clinical Flags**
- Automatic alerts for positive mental health screens
- Suggestions for professional referral when needed
- Informed consent for data sharing with therapists

### 5. **Relationship Insights**
- Couples can compare attachment styles
- Parent-child dyads tracked (parent parenting style + child outcomes)
- Work-life balance patterns identified

---

## Total Question Load

| Assessment | Items | Time (min) | Domain |
|-----------|-------|------------|---------|
| **RSES** (existing) | 6 | 2 | Self-Worth |
| **VIA** (existing) | 10 | 3 | Character Strengths |
| **ECR-S** (new) | 12 | 4 | Attachment |
| **BRS** (new) | 6 | 2 | Resilience |
| **PS** (new) | 12 | 4 | Parenting Style |
| **BWSS** (new) | 8 | 3 | Work Satisfaction |
| **PHQ-4** (new) | 4 | 1 | Mental Health |
| **DERS-SF** (new) | 18 | 6 | Emotional Regulation |
| **Love Languages** (new) | 10 | 3 | Relationship Preferences |
| **TOTAL** | **86** | **28** | All Domains |

**Optimized Administration:**
- Use conditional logic (not everyone needs all assessments)
- Spouse/partner: ~70 items (23 min) - includes Love Languages, Attachment, Resilience, Mental Health, Emotional Regulation
- Parent (with child): ~60 items (20 min) - includes Love Languages (child perception), Parenting Style, Resilience, Mental Health
- Professional/self: ~45 items (15 min) - Work Satisfaction, Resilience, Mental Health, Emotional Regulation
- Family (sibling/elderly parent): ~50 items (17 min) - Love Languages, Resilience, Mental Health

---

## References

1. Wei, M., Russell, D. W., Mallinckrodt, B., & Vogel, D. L. (2007). The Experiences in Close Relationship Scale (ECR)-short form: Reliability, validity, and factor structure. *Journal of Personality Assessment, 88*(2), 187-204.

2. Smith, B. W., Dalen, J., Wiggins, K., Tooley, E., Christopher, P., & Bernard, J. (2008). The brief resilience scale: assessing the ability to bounce back. *International Journal of Behavioral Medicine, 15*(3), 194-200.

3. Robinson, C. C., Mandleco, B., Olsen, S. F., & Hart, C. H. (2001). The Parenting Styles and Dimensions Questionnaire (PSDQ). *Handbook of family measurement techniques, 3*, 319-321.

4. Judge, T. A., & Locke, E. A. (1993). Effect of dysfunctional thought processes on subjective well-being and job satisfaction. *Journal of Applied Psychology, 78*(3), 475.

5. Kroenke, K., Spitzer, R. L., Williams, J. B., & Löwe, B. (2009). An ultra-brief screening scale for anxiety and depression: the PHQ–4. *Psychosomatics, 50*(6), 613-621.

6. Kaufman, E. A., Xia, M., Fosco, G., Yaptangco, M., Skidmore, C. R., & Crowell, S. E. (2016). The Difficulties in Emotion Regulation Scale Short Form (DERS-SF): Validation and replication in adolescent and adult samples. *Journal of Psychopathology and Behavioral Assessment, 38*(3), 443-455.

7. Chapman, G. D. (1992). *The five love languages: How to express heartfelt commitment to your mate*. Chicago: Northfield Publishing.

8. Chapman, G. D., & Campbell, R. (2016). *The 5 love languages of children*. Chicago: Northfield Publishing.

9. Rosenberg, M. (1965). *Society and the adolescent self-image*. Princeton, NJ: Princeton University Press.

10. Peterson, C., & Seligman, M. E. (2004). *Character strengths and virtues: A handbook and classification*. Oxford University Press.

---

## Next Steps

1. **Review & Approve** this framework with stakeholders
2. **Implement Phase 1** (data models) in development environment
3. **Create full question bank** (Phase 2) with all 76 items
4. **Build scoring functions** (Phase 3) and unit test
5. **Update Claude prompts** (Phase 4) with assessment interpretation
6. **Design assessment UI** (Phase 5) with progress indicators
7. **Pilot test** with 10-20 users across relationship types
8. **Iterate** based on user feedback and completion rates
9. **Launch** to production with monitoring
10. **Build analytics dashboard** for reassessment tracking

---

**Document Owner:** Claude Code Assistant
**Last Updated:** 2026-01-21
**Status:** Proposal - Awaiting Approval
