/**
 * Research-Grounded Relationship Health Dimensions
 *
 * Each dimension maps to established scientific research and provides:
 * 1. Mappings to existing onboarding question IDs for initial assessment
 * 2. Gap-filling assessment prompts for when existing data is insufficient
 * 3. Arc generation context (what to teach, what to practice)
 *
 * Sources:
 * - Gottman: Sound Relationship House, Four Horsemen (40+ years longitudinal research)
 * - Johnson: Emotionally Focused Therapy / A.R.E. model (70-80% improvement in RCTs)
 * - Attachment Theory: Brennan/Clark/Shaver two-dimensional model
 * - PREPARE/ENRICH: Validated with 4M+ couples
 * - Baumrind/Maccoby-Martin: Parenting styles (most replicated in developmental psych)
 * - Self-Determination Theory: Skinner et al. six parenting dimensions
 * - Siegel: Interpersonal neurobiology / Whole-Brain Parenting
 */

// ==================== Types ====================

export type DimensionDomain = 'couple' | 'parent_child';

export type CoupleDimensionId =
  | 'love_maps'
  | 'fondness_admiration'
  | 'turning_toward'
  | 'conflict_style'
  | 'emotional_accessibility'
  | 'emotional_responsiveness'
  | 'attachment_security'
  | 'shared_meaning'
  | 'practical_partnership'
  | 'negative_cycles';

export type ParentChildDimensionId =
  | 'warmth_responsiveness'
  | 'structure_consistency'
  | 'autonomy_support'
  | 'repair_after_rupture'
  | 'mindsight';

export type DimensionId = CoupleDimensionId | ParentChildDimensionId;

export type ResponseType = 'likert_5' | 'emoji_scale' | 'yes_no' | 'frequency';

export interface AssessmentPromptTemplate {
  promptId: string;
  questionText: string;
  responseType: ResponseType;
  weight: number;                // 0.0-1.0, how much this contributes to dimension score
  forPerspective: 'self' | 'observer' | 'either';
}

export interface DimensionDef {
  id: DimensionId;
  domain: DimensionDomain;
  name: string;
  shortDescription: string;
  researchBasis: string;
  researchDetail: string;        // Longer explanation for Claude prompt context
  existingQuestionMappings: string[];
  minDataPointsForScore: number;
  assessmentPrompts: AssessmentPromptTemplate[];
  arcGuidance: {
    awarenessGoal: string;       // What the awareness phase should achieve
    practiceGoal: string;        // What the practice phase should achieve
    integrationGoal: string;     // What the integration phase should achieve
    keyExercises: string[];      // Types of activities that work for this dimension
  };
}

// ==================== Couple Dimensions ====================

const COUPLE_DIMENSIONS: DimensionDef[] = [
  {
    id: 'love_maps',
    domain: 'couple',
    name: 'Love Maps',
    shortDescription: 'How well you know each other\'s inner world',
    researchBasis: 'Gottman Sound Relationship House, Level 1',
    researchDetail: 'Gottman\'s research shows couples who maintain detailed "love maps" — mental models of each other\'s world (worries, hopes, history, daily life) — are significantly more likely to stay connected through life transitions. This is the foundation of the Sound Relationship House.',
    existingQuestionMappings: ['overview_q1', 'overview_q2', 'overview_q3', 'overview_q4'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'lm_1',
        questionText: 'Could you name three things your partner is currently stressed about?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'either',
      },
      {
        promptId: 'lm_2',
        questionText: 'How well do you know your partner\'s current life dreams and aspirations?',
        responseType: 'likert_5',
        weight: 0.7,
        forPerspective: 'self',
      },
      {
        promptId: 'lm_3',
        questionText: 'When was the last time you learned something new about your partner?',
        responseType: 'frequency',
        weight: 0.6,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Notice how much (or little) you know about your partner\'s current inner world',
      practiceGoal: 'Ask open-ended questions and listen without solving',
      integrationGoal: 'Build a habit of daily curiosity about your partner',
      keyExercises: ['open-ended questions at dinner', 'love map card game', 'daily check-in ritual'],
    },
  },
  {
    id: 'fondness_admiration',
    domain: 'couple',
    name: 'Fondness & Admiration',
    shortDescription: 'How often you express appreciation and respect',
    researchBasis: 'Gottman Sound Relationship House, Level 2',
    researchDetail: 'The habit of expressing fondness and admiration is the antidote to contempt — the single strongest predictor of divorce (93.6% accuracy). Couples who maintain a 5:1 ratio of positive to negative interactions during conflict stay together. This is about the everyday habit of scanning for what your partner does right.',
    existingQuestionMappings: ['communication_q2', 'communication_q3'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'fa_1',
        questionText: 'In the last week, how many times did you express specific appreciation to your partner?',
        responseType: 'frequency',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'fa_2',
        questionText: 'How often does your partner express appreciation or admiration for you?',
        responseType: 'frequency',
        weight: 0.7,
        forPerspective: 'observer',
      },
      {
        promptId: 'fa_3',
        questionText: 'Can you easily list five things you genuinely admire about your partner?',
        responseType: 'likert_5',
        weight: 0.6,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Track how often appreciation flows in your relationship vs. criticism',
      practiceGoal: 'Build a daily appreciation practice — specific, not generic',
      integrationGoal: 'Shift your scanning habit from "what\'s wrong" to "what\'s right"',
      keyExercises: ['daily specific appreciation', 'admiration list', 'gratitude sharing at meals'],
    },
  },
  {
    id: 'turning_toward',
    domain: 'couple',
    name: 'Turning Toward',
    shortDescription: 'How you respond to each other\'s bids for connection',
    researchBasis: 'Gottman Sound Relationship House, Level 3',
    researchDetail: 'Gottman found that couples who stayed together turned toward each other\'s "bids" for connection 86% of the time, while couples who divorced turned toward only 33%. A bid can be as small as "look at that bird" — what matters is whether you engage. Turning away (ignoring) or turning against (hostile response) erodes the relationship.',
    existingQuestionMappings: ['what_works_q1', 'what_works_q2'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'tt_1',
        questionText: 'When your partner tries to get your attention (a comment, a touch, showing you something), how do you usually respond?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'self',
      },
      {
        promptId: 'tt_2',
        questionText: 'How often does your partner put down their phone/task to engage when you say something?',
        responseType: 'frequency',
        weight: 0.8,
        forPerspective: 'observer',
      },
      {
        promptId: 'tt_3',
        questionText: 'In a typical evening together, how many small positive exchanges do you have?',
        responseType: 'frequency',
        weight: 0.5,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Notice bids for connection — yours and your partner\'s — and how they\'re received',
      practiceGoal: 'Intentionally turn toward by pausing, making eye contact, and responding warmly',
      integrationGoal: 'Make turning toward automatic — the default response to any bid',
      keyExercises: ['bid tracking exercise', 'phone-free connection windows', 'micro-moments of presence'],
    },
  },
  {
    id: 'conflict_style',
    domain: 'couple',
    name: 'Conflict Style',
    shortDescription: 'How you handle disagreements (Four Horsemen presence)',
    researchBasis: 'Gottman Four Horsemen of the Apocalypse',
    researchDetail: 'The Four Horsemen — criticism (attacking character), contempt (expressing disgust/superiority), defensiveness (counter-attacking), and stonewalling (shutting down) — predict relationship failure with over 90% accuracy. Each has a researched antidote: gentle startup, appreciation culture, accepting responsibility, and self-soothing.',
    existingQuestionMappings: ['triggers_q1', 'triggers_q2', 'boundaries_q1', 'communication_q1'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'cs_1',
        questionText: 'During disagreements, does either of you use "you always" or "you never" language?',
        responseType: 'frequency',
        weight: 0.8,
        forPerspective: 'either',
      },
      {
        promptId: 'cs_2',
        questionText: 'When you\'re upset with your partner, do you tend to attack the problem or attack them as a person?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'self',
      },
      {
        promptId: 'cs_3',
        questionText: 'Does either partner shut down or walk away during arguments?',
        responseType: 'frequency',
        weight: 0.7,
        forPerspective: 'either',
      },
      {
        promptId: 'cs_4',
        questionText: 'How often do you or your partner roll eyes, use sarcasm, or express contempt during conflict?',
        responseType: 'frequency',
        weight: 1.0,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Identify which Horsemen show up in your conflicts and when',
      practiceGoal: 'Replace each Horseman with its antidote: gentle startup, appreciation, responsibility, self-soothing',
      integrationGoal: 'Develop a shared conflict protocol — agreed-upon ways to fight fair',
      keyExercises: ['horseman spotting exercise', 'gentle startup practice', 'repair attempt signals', '20-minute self-soothing breaks'],
    },
  },
  {
    id: 'emotional_accessibility',
    domain: 'couple',
    name: 'Emotional Accessibility',
    shortDescription: 'Can you reach each other emotionally?',
    researchBasis: 'Johnson EFT — A.R.E. model (Accessibility)',
    researchDetail: 'Sue Johnson\'s Emotionally Focused Therapy identifies Accessibility as the "A" in A.R.E. — the core question "Are you there for me?" Emotional accessibility means being open to your partner\'s emotions, not just physically present. When one partner can\'t reach the other emotionally, it triggers attachment panic — pursuit or withdrawal.',
    existingQuestionMappings: ['what_works_q1', 'boundaries_q2', 'communication_q1'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'ea_1',
        questionText: 'When you\'re upset, can you turn to your partner and feel heard?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'self',
      },
      {
        promptId: 'ea_2',
        questionText: 'Does your partner let you in when they\'re struggling, or do they tend to handle things alone?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'observer',
      },
      {
        promptId: 'ea_3',
        questionText: 'How often do you feel emotionally alone even when your partner is physically present?',
        responseType: 'frequency',
        weight: 0.7,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Notice when you or your partner reaches out emotionally — and what happens',
      practiceGoal: 'Practice staying emotionally present when your partner shows vulnerability',
      integrationGoal: 'Build trust that emotional needs will be met consistently',
      keyExercises: ['vulnerability sharing', 'emotion labeling', '"what do you need right now?" check-ins'],
    },
  },
  {
    id: 'emotional_responsiveness',
    domain: 'couple',
    name: 'Emotional Responsiveness',
    shortDescription: 'Do you respond with care when your partner reaches out?',
    researchBasis: 'Johnson EFT — A.R.E. model (Responsiveness)',
    researchDetail: 'Responsiveness is the "R" in Johnson\'s A.R.E. model. It\'s not just being accessible — it\'s actively responding with care and attunement when your partner reaches out. Research shows responsive partners reduce each other\'s cortisol (stress hormone) levels. Non-responsiveness signals "you don\'t matter to me."',
    existingQuestionMappings: ['triggers_q3', 'what_works_q3', 'communication_q1'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'er_1',
        questionText: 'When your partner is upset, how quickly do you notice and respond?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'er_2',
        questionText: 'When you express a need, does your partner take it seriously and try to help?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'observer',
      },
      {
        promptId: 'er_3',
        questionText: 'After a hard day, does your partner comfort you in a way that actually helps?',
        responseType: 'likert_5',
        weight: 0.7,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Track how you each respond when the other is in distress',
      practiceGoal: 'Practice empathic responding — validate before fixing',
      integrationGoal: 'Make responsiveness reflexive, not effortful',
      keyExercises: ['stress-reducing conversation', 'empathic listening practice', '"tell me more" responses'],
    },
  },
  {
    id: 'attachment_security',
    domain: 'couple',
    name: 'Attachment Security',
    shortDescription: 'Comfort with closeness and trust in the bond',
    researchBasis: 'Brennan/Clark/Shaver adult attachment model',
    researchDetail: 'Attachment theory — one of the most researched constructs in psychology — measures two dimensions: anxiety (fear of abandonment, reassurance-seeking) and avoidance (discomfort with closeness, emotional suppression). Secure attachment (low on both) correlates with relationship satisfaction, effective conflict resolution, and physical health.',
    existingQuestionMappings: ['boundaries_q1', 'boundaries_q3', 'communication_q1'],
    minDataPointsForScore: 3,
    assessmentPrompts: [
      {
        promptId: 'as_1',
        questionText: 'How comfortable are you depending on your partner for emotional support?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'as_2',
        questionText: 'How often do you worry that your partner doesn\'t truly love you or might leave?',
        responseType: 'frequency',
        weight: 0.9,
        forPerspective: 'self',
      },
      {
        promptId: 'as_3',
        questionText: 'When things get emotionally intense, do you tend to pull closer or pull away?',
        responseType: 'likert_5',
        weight: 0.7,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Understand your own attachment style and your partner\'s — without judgment',
      practiceGoal: 'Practice expressing attachment needs directly instead of through pursuit or withdrawal',
      integrationGoal: 'Build earned security through consistent emotional availability',
      keyExercises: ['attachment style reflection', 'direct need expression', 'hold me tight conversation'],
    },
  },
  {
    id: 'shared_meaning',
    domain: 'couple',
    name: 'Shared Meaning',
    shortDescription: 'Shared rituals, values, goals, and sense of "us"',
    researchBasis: 'Gottman Sound Relationship House, Levels 6-7',
    researchDetail: 'The top levels of Gottman\'s Sound Relationship House: making life dreams come true (supporting each other\'s individual aspirations) and creating shared meaning (building a shared culture of rituals, roles, goals, and symbols). Couples with strong shared meaning weather crises better because they have a shared narrative of "who we are."',
    existingQuestionMappings: ['overview_q3'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'sm_1',
        questionText: 'Do you and your partner have shared rituals that are meaningful to both of you?',
        responseType: 'likert_5',
        weight: 0.7,
        forPerspective: 'either',
      },
      {
        promptId: 'sm_2',
        questionText: 'How well do you know your partner\'s life dreams and biggest aspirations?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'sm_3',
        questionText: 'Do you have a shared vision for your family\'s future that you both feel good about?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Explore what "shared meaning" currently exists in your relationship — rituals, values, dreams',
      practiceGoal: 'Create or strengthen one shared ritual and explore each other\'s life dreams',
      integrationGoal: 'Develop a shared narrative — "this is who we are and where we\'re going"',
      keyExercises: ['dream within conflict exercise', 'shared ritual creation', 'values conversation', 'family mission statement'],
    },
  },
  {
    id: 'practical_partnership',
    domain: 'couple',
    name: 'Practical Partnership',
    shortDescription: 'Division of labor, finances, and daily logistics',
    researchBasis: 'PREPARE/ENRICH scales (Relationship Roles, Financial Management)',
    researchDetail: 'PREPARE/ENRICH research with 4M+ couples shows that disagreement on practical matters — division of household tasks, financial management, career priorities, and leisure activities — is a major source of chronic conflict. The issue isn\'t usually the tasks themselves but the perceived fairness and whether both partners feel their contributions are valued.',
    existingQuestionMappings: ['boundaries_q1', 'what_works_q1'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'pp_1',
        questionText: 'How fair does the division of household and family responsibilities feel?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'either',
      },
      {
        promptId: 'pp_2',
        questionText: 'Do you and your partner agree on how to handle money and finances?',
        responseType: 'likert_5',
        weight: 0.7,
        forPerspective: 'either',
      },
      {
        promptId: 'pp_3',
        questionText: 'How well do you balance shared time vs. individual time?',
        responseType: 'likert_5',
        weight: 0.6,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Audit the invisible labor — who does what, and does it feel fair to both?',
      practiceGoal: 'Renegotiate one area of imbalance using the "fair play" model',
      integrationGoal: 'Build a sustainable system where both partners feel valued and balanced',
      keyExercises: ['invisible labor audit', 'responsibility renegotiation', 'appreciation for unseen work'],
    },
  },
  {
    id: 'negative_cycles',
    domain: 'couple',
    name: 'Negative Cycles',
    shortDescription: 'Recurring destructive patterns (pursue-withdraw, criticize-defend)',
    researchBasis: 'Johnson EFT "Demon Dialogues"',
    researchDetail: 'EFT identifies three core negative interaction cycles: Pursue-Withdraw (one escalates while other shuts down — the most common), Criticize-Defend (attack and counter-attack), and Withdraw-Withdraw (both disengage — often a late-stage pattern). These cycles are self-reinforcing: the pursuer\'s escalation triggers more withdrawal, which triggers more pursuit.',
    existingQuestionMappings: ['triggers_q1', 'triggers_q2', 'communication_q1'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'nc_1',
        questionText: 'When you and your partner disagree, does one of you tend to push harder while the other pulls away?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'either',
      },
      {
        promptId: 'nc_2',
        questionText: 'Do you find yourselves having the same argument over and over in different disguises?',
        responseType: 'frequency',
        weight: 0.8,
        forPerspective: 'either',
      },
      {
        promptId: 'nc_3',
        questionText: 'After an argument, how long does it typically take to reconnect?',
        responseType: 'frequency',
        weight: 0.6,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Name your cycle — see the pattern rather than blaming each other',
      practiceGoal: 'Interrupt the cycle by expressing the emotion underneath the behavior',
      integrationGoal: 'Build a shared language for when the cycle starts: "there it is again"',
      keyExercises: ['cycle mapping exercise', 'raw spot identification', 'underneath the anger conversation', 'de-escalation signals'],
    },
  },
];

// ==================== Parent-Child Dimensions ====================

const PARENT_CHILD_DIMENSIONS: DimensionDef[] = [
  {
    id: 'warmth_responsiveness',
    domain: 'parent_child',
    name: 'Warmth & Responsiveness',
    shortDescription: 'Emotional attunement, affection, and acceptance',
    researchBasis: 'Baumrind parenting styles + Self-Determination Theory',
    researchDetail: 'Parental warmth — emotional attunement, sensitivity to the child\'s cues, affection, acceptance, and involvement — is one of the two most validated dimensions in developmental psychology. Research across 91-98% of families studied worldwide shows warmth promotes adolescent well-being. High warmth is the "responsive" axis of Baumrind\'s model.',
    existingQuestionMappings: ['overview_q1', 'what_works_q1', 'communication_q2', 'communication_q3'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'wr_1',
        questionText: 'How often do you express physical affection with your child (hugs, etc.)?',
        responseType: 'frequency',
        weight: 0.7,
        forPerspective: 'self',
      },
      {
        promptId: 'wr_2',
        questionText: 'Can you tell when your child is upset even before they say anything?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'wr_3',
        questionText: 'How often do you listen to your child\'s perspective before responding or correcting?',
        responseType: 'frequency',
        weight: 0.9,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Notice how many of your interactions are warm/positive vs. corrective/directive',
      practiceGoal: 'Increase the ratio of positive connection to correction — aim for 5:1',
      integrationGoal: 'Make warmth the backdrop of every interaction, even discipline',
      keyExercises: ['special time ritual', 'emotion coaching moments', 'positive narration'],
    },
  },
  {
    id: 'structure_consistency',
    domain: 'parent_child',
    name: 'Structure & Consistency',
    shortDescription: 'Clear expectations and reliable follow-through',
    researchBasis: 'Baumrind parenting styles + SDT Structure dimension',
    researchDetail: 'Structure — clear expectations, consistent consequences, predictability vs. chaos — is the other core parenting dimension. The authoritative style (high warmth + high structure) produces the best outcomes across cultures: confident, self-regulated, socially competent children. Structure without warmth is authoritarian; warmth without structure is permissive.',
    existingQuestionMappings: ['triggers_q2', 'boundaries_q1', 'boundaries_q2'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'sc_1',
        questionText: 'Does your child clearly know the household rules and what happens when they\'re broken?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'sc_2',
        questionText: 'How consistently do you follow through on stated consequences?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'either',
      },
      {
        promptId: 'sc_3',
        questionText: 'Do both parents enforce the same rules, or does it depend on who\'s in charge?',
        responseType: 'likert_5',
        weight: 0.7,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Audit current rules and expectations — are they clear, consistent, and agreed upon?',
      practiceGoal: 'Pick one area of inconsistency and align on it as a team',
      integrationGoal: 'Build a family structure that\'s firm but flexible — kids feel safe, not controlled',
      keyExercises: ['family rules review', 'consequence consistency check', 'co-parenting alignment conversation'],
    },
  },
  {
    id: 'autonomy_support',
    domain: 'parent_child',
    name: 'Autonomy Support',
    shortDescription: 'Respecting the child\'s voice and self-direction',
    researchBasis: 'Self-Determination Theory (Skinner, Johnson, Snyder)',
    researchDetail: 'Autonomy support — encouraging the child\'s voice, choices, and self-direction vs. coercion — is one of the strongest predictors of child well-being in SDT research. It\'s not permissiveness (letting kids do whatever) but rather honoring their perspective while maintaining structure. "You need to clean your room, but you choose when and how."',
    existingQuestionMappings: ['what_works_q1', 'what_works_q3', 'overview_q3'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'as_pc_1',
        questionText: 'How often do you give your child choices within boundaries rather than directives?',
        responseType: 'frequency',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'as_pc_2',
        questionText: 'When your child disagrees with a rule, do you explain the reasoning behind it?',
        responseType: 'likert_5',
        weight: 0.7,
        forPerspective: 'either',
      },
      {
        promptId: 'as_pc_3',
        questionText: 'Does your child feel comfortable expressing opinions that differ from yours?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Notice how often you direct vs. collaborate with your child',
      practiceGoal: 'Practice offering choices within boundaries — "You decide, within these limits"',
      integrationGoal: 'Shift from compliance-based to autonomy-supportive parenting in key moments',
      keyExercises: ['choice-giving practice', 'reasoning conversations', 'collaborative problem-solving'],
    },
  },
  {
    id: 'repair_after_rupture',
    domain: 'parent_child',
    name: 'Repair After Rupture',
    shortDescription: 'Reconnecting after conflict or disconnection',
    researchBasis: 'Siegel interpersonal neurobiology / Tronick still-face research',
    researchDetail: 'Daniel Siegel\'s research shows that secure attachment is NOT about never rupturing — it\'s about reliably repairing. Every parent loses their temper, misreads their child, or disconnects. What matters is whether you come back, name what happened, and reconnect. Tronick\'s still-face experiments show even infants can tolerate distress when repair follows.',
    existingQuestionMappings: ['triggers_q3', 'what_works_q2'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'rr_1',
        questionText: 'After you lose your temper with your child, do you go back and talk about what happened?',
        responseType: 'frequency',
        weight: 0.9,
        forPerspective: 'self',
      },
      {
        promptId: 'rr_2',
        questionText: 'Does your child seem to trust that things will be okay after a conflict?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'either',
      },
      {
        promptId: 'rr_3',
        questionText: 'How quickly after a rupture do you and your child reconnect?',
        responseType: 'frequency',
        weight: 0.6,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Track ruptures and notice whether/how repair happens',
      practiceGoal: 'Build a repair script: "I lost my cool earlier. What I should have said is..."',
      integrationGoal: 'Make repair automatic — something you do naturally after every rupture',
      keyExercises: ['rupture-repair journal', 'age-appropriate apology practice', 'reconnection rituals after conflict'],
    },
  },
  {
    id: 'mindsight',
    domain: 'parent_child',
    name: 'Mindsight',
    shortDescription: 'Understanding your child\'s inner world and emotional life',
    researchBasis: 'Siegel interpersonal neurobiology / Reflective Functioning',
    researchDetail: 'Mindsight — the capacity to see your own mind and your child\'s mind — is central to Siegel\'s approach. Parents with high reflective functioning (understanding WHY their child behaves a certain way, not just WHAT they do) raise more securely attached children. It\'s the difference between "she\'s being defiant" and "she\'s overwhelmed and doesn\'t have the skills to cope right now."',
    existingQuestionMappings: ['overview_q3', 'overview_q4', 'triggers_q1'],
    minDataPointsForScore: 2,
    assessmentPrompts: [
      {
        promptId: 'ms_1',
        questionText: 'When your child acts out, do you usually understand what\'s driving the behavior underneath?',
        responseType: 'likert_5',
        weight: 0.9,
        forPerspective: 'self',
      },
      {
        promptId: 'ms_2',
        questionText: 'How well could you describe your child\'s current biggest worry or fear?',
        responseType: 'likert_5',
        weight: 0.8,
        forPerspective: 'self',
      },
      {
        promptId: 'ms_3',
        questionText: 'Do you help your child name their emotions in the moment?',
        responseType: 'frequency',
        weight: 0.7,
        forPerspective: 'either',
      },
    ],
    arcGuidance: {
      awarenessGoal: 'Practice seeing behavior as communication — "what is my child trying to tell me?"',
      practiceGoal: 'Build an emotion-coaching habit: name it, validate it, guide it',
      integrationGoal: 'Develop a mental model of your child\'s inner world that updates in real-time',
      keyExercises: ['behavior-as-communication reframes', 'emotion coaching in the moment', 'curiosity before correction'],
    },
  },
];

// ==================== Exports ====================

export const ALL_DIMENSIONS: DimensionDef[] = [
  ...COUPLE_DIMENSIONS,
  ...PARENT_CHILD_DIMENSIONS,
];

export const COUPLE_DIMENSION_IDS = COUPLE_DIMENSIONS.map(d => d.id);
export const PARENT_CHILD_DIMENSION_IDS = PARENT_CHILD_DIMENSIONS.map(d => d.id);

export function getDimension(id: DimensionId): DimensionDef | undefined {
  return ALL_DIMENSIONS.find(d => d.id === id);
}

export function getDimensionsForDomain(domain: DimensionDomain): DimensionDef[] {
  return ALL_DIMENSIONS.filter(d => d.domain === domain);
}
