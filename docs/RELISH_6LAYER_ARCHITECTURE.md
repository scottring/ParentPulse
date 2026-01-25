# Relish: 6-Layer Scaffolding + Hierarchical Goal System
## Implementation Architecture & Roadmap

---

## Executive Summary

**Current State:**
- ✅ PersonManual with triggers, strategies, boundaries, patterns
- ✅ Dual workbook system (parent + child)
- ✅ AI content generation (Claude-based)
- ✅ Basic assessments (RSES, VIA)
- ✅ 26 interactive child activities

**Gap Analysis:**
- ❌ No 6-layer scaffolding framework
- ❌ No hierarchical goal system (Year → Quarter → Month → Week)
- ❌ No spider diagram visualizations
- ❌ No Marriage/Family manual types
- ❌ No agentic AI (conversational system generation)
- ❌ No gap detection and active filling
- ❌ No explicit repair tracking

**Critical Decision: AI Architecture**

**Recommendation: Phased Approach**
- **V1 (Months 1-3)**: Template-based AI with structured forms → Foundation first
- **V2 (Months 4-6)**: Agentic AI with CopilotKit → Intelligence layer second

**Rationale:**
1. Your current Claude integration works well - build on it
2. Agentic AI requires stable data models first
3. Get user feedback on core experience before adding complexity
4. CopilotKit ($200/mo) is justified once product-market fit proven
5. Template-based V1 still delivers 80% of value

---

## Phase 1: Foundation (V1) - Months 1-3

### 1.1 Data Model Extensions

#### Add 6-Layer Framework to PersonManual

```typescript
// /src/types/person-manual.ts (extend existing)

export type LayerId = 1 | 2 | 3 | 4 | 5 | 6;

export interface Layer {
  id: LayerId;
  name: string;
  userFacingName: string; // Friendly labels
  description: string;
}

export const LAYERS: Record<LayerId, Layer> = {
  1: {
    id: 1,
    name: "Inputs & Triggers",
    userFacingName: "What's Hard",
    description: "Situations, sensory inputs, and triggers"
  },
  2: {
    id: 2,
    name: "Processing & Understanding",
    userFacingName: "How We Make Sense",
    description: "Interpretation, emotions, meaning-making"
  },
  3: {
    id: 3,
    name: "Memory & Structure",
    userFacingName: "What Helps",
    description: "Routines, boundaries, family systems"
  },
  4: {
    id: 4,
    name: "Execution & Strategies",
    userFacingName: "What We Do",
    description: "Active strategies, tools, practices"
  },
  5: {
    id: 5,
    name: "Outputs & Behaviors",
    userFacingName: "What Happens",
    description: "Observable behaviors, outcomes"
  },
  6: {
    id: 6,
    name: "Supervisory & Values",
    userFacingName: "What Guides Us",
    description: "Principles, values, long-term vision"
  }
};

// Extend existing types with layer references
export interface Trigger {
  // ... existing fields
  layerId: LayerId; // Add layer classification
}

export interface Strategy {
  // ... existing fields
  layerId: LayerId; // Which layer does this address?
  targetLayerIds: LayerId[]; // Which layers does this impact?
}

export interface Boundary {
  // ... existing fields
  layerId: 3; // Boundaries are always Layer 3
}

// NEW: Layer Assessment
export interface LayerAssessment {
  layerId: LayerId;
  currentScore: number; // 1-10
  baseline: number; // Starting point
  target: number; // Goal for this timeframe
  confidence: 'emerging' | 'consistent' | 'validated';
  lastUpdated: Timestamp;
  evidence: string[]; // Supporting observations
  notes?: string;
}

// NEW: Spider Assessment
export interface SpiderAssessment {
  assessmentId: string;
  personId: string;
  goalVolumeId?: string; // Link to specific goal
  timeframe: 'annual' | 'quarterly' | 'monthly' | 'weekly';
  period: string; // "2026", "2026-Q1", "2026-01", "2026-W03"
  layers: LayerAssessment[]; // Always 6 items
  assessedAt: Timestamp;
  assessedBy: string; // userId
  overallProgress: number; // Aggregate 0-100
  familyId: string;
}
```

#### Add Hierarchical Goal System

```typescript
// /src/types/goal-hierarchy.ts (NEW FILE)

export interface GoalVolume {
  volumeId: string;
  personId: string;
  familyId: string;

  // User-facing content
  title: string; // "Emotional Regulation & Family Harmony"
  description: string;

  // Timeframe
  startDate: Timestamp;
  endDate: Timestamp; // Typically 1 year from start
  durationQuarters: 1 | 2 | 3 | 4; // How many quarters this runs

  // 6-Layer baseline and targets
  baselineAssessment: SpiderAssessment;
  targetAssessment: Partial<SpiderAssessment>; // What we're aiming for

  // Time commitment
  dailyMinutes: 15 | 30 | 45;

  // Status
  status: 'draft' | 'active' | 'completed' | 'paused' | 'archived';

  // Quarterly milestones (auto-generated)
  quarterlyMilestones: string[]; // quarterlyMilestoneIds

  createdAt: Timestamp;
  createdBy: string;
}

export interface QuarterlyMilestone {
  milestoneId: string;
  volumeId: string;
  personId: string;
  familyId: string;

  // User-facing
  title: string; // "Recognizing & naming feelings before they get big"
  description: string;
  quarterNumber: 1 | 2 | 3 | 4; // Which quarter of the volume

  // Timeframe
  startDate: Timestamp;
  endDate: Timestamp; // ~90 days

  // 6-Layer targets for this quarter
  targetAssessment: Partial<SpiderAssessment>;

  // Monthly focuses (auto-generated)
  monthlyFocuses: string[]; // monthlyFocusIds

  status: 'pending' | 'active' | 'completed';
  completedAt?: Timestamp;
}

export interface MonthlyFocus {
  focusId: string;
  milestoneId: string;
  volumeId: string;
  personId: string;
  familyId: string;

  // User-facing
  title: string; // "Building emotion vocabulary"
  description: string;
  monthNumber: 1 | 2 | 3; // Which month of the quarter

  // Timeframe
  startDate: Timestamp;
  endDate: Timestamp; // ~30 days

  // 6-Layer focus for this month
  primaryLayerIds: LayerId[]; // Which layers are we emphasizing?
  targetAssessment: Partial<SpiderAssessment>;

  // Weekly workbooks (generated)
  weeklyWorkbooks: string[]; // weekIds

  status: 'pending' | 'active' | 'completed';
}
```

#### Add Manual Type for Marriage/Family

```typescript
// /src/types/person-manual.ts (extend existing)

export type ManualType = 'child' | 'adult' | 'marriage' | 'family';

export interface PersonManual {
  // ... existing fields
  manualType: ManualType; // Add this field

  // For marriage manuals
  partnerIds?: string[]; // [scottId, irisId]

  // For family manuals
  householdId?: string; // Links to family/household
}
```

### 1.2 Database Collections (Firestore)

```typescript
// New collections to add

/goal_volumes/{volumeId}
  - GoalVolume documents

/quarterly_milestones/{milestoneId}
  - QuarterlyMilestone documents

/monthly_focuses/{focusId}
  - MonthlyFocus documents

/spider_assessments/{assessmentId}
  - SpiderAssessment documents

/repair_instances/{repairId}  // NEW: Track repair practices
  - Repair tracking (who, when, what happened, how repaired)

// Extend existing collections

/person_manuals/{manualId}
  - Add manualType field
  - Add layerId to triggers, strategies, boundaries

/parent_workbooks/{workbookId}
  - Link to monthlyFocusId
  - Add weekly spider assessment
```

### 1.3 UI Components (New)

```typescript
// /src/components/goals/ (NEW DIRECTORY)

GoalVolumeCreator.tsx          // Create year goal from manual
QuarterlyMilestoneView.tsx     // Show 4 quarters of a volume
MonthlyFocusCard.tsx           // Current month display
WeeklyJourney.tsx              // Week context in workbook

// /src/components/visualizations/ (NEW DIRECTORY)

SpiderDiagram.tsx              // Radar chart (use recharts)
LayerProgressBar.tsx           // Individual layer progress
ProgressTimeline.tsx           // Historical spider diagrams
TrendIndicator.tsx             // Progressing/stalled/regressing

// /src/components/manual/ (EXTEND)

ManualCover.tsx                // Beautiful manual home screen
TriggerCard.tsx                // Redesign with layer indicator
StrategyCard.tsx               // Add layer tags, effectiveness viz
RepairSection.tsx              // NEW: Repair strategies library
StrengthsSection.tsx           // Celebration section

// /src/components/repair/ (NEW DIRECTORY)

RepairPrompt.tsx               // Daily repair reflection
RepairLog.tsx                  // History of repairs
RepairStrategyCard.tsx         // Individual repair approach
```

### 1.4 Cloud Functions (Extend Existing)

```typescript
// /functions/src/ai/ (extend existing)

// MODIFY: generateInitialManualContent
// - Add layer classification to triggers/strategies
// - Generate initial spider assessment baseline
// - Identify which layers need attention

// NEW: generateGoalVolume
export const generateGoalVolume = functions.https.onCall(async (data) => {
  // Input: manualId, user intent ("What do you want to work on?")
  // Output: Year goal with 4 quarterly milestones
  // Uses Claude to break down goal into quarters
  // Generates baseline spider assessment
  // Creates monthly focuses for Q1
});

// NEW: generateWeeklyWorkbookFromFocus
export const generateWeeklyWorkbookFromFocus = functions.https.onCall(async (data) => {
  // Input: monthlyFocusId, weekNumber (1-4)
  // Output: Parent + child workbook aligned to monthly focus
  // Pull from manual triggers/strategies for this layer focus
  // Generate activities targeting specific layers
});

// NEW: analyzeWeeklyProgress
export const analyzeWeeklyProgress = functions.https.onCall(async (data) => {
  // Input: weeklyReflection, completions
  // Output: Updated spider assessment
  // AI analyzes qualitative reflection + quantitative completion
  // Updates layer scores
  // Detects patterns, suggests adjustments
});

// NEW: detectManualGaps
export const detectManualGaps = functions.https.onCall(async (data) => {
  // Input: manualId
  // Output: Array of gaps with targeted questions
  // Analyzes: insufficient triggers, missing routines, weak strategies
  // Prioritizes: critical gaps, layer-aligned gaps, context-triggered
});
```

---

## Phase 2: Intelligence (V2) - Months 4-6

### 2.1 Agentic AI Architecture

**Decision: Use Anthropic SDK + Custom Agentic Patterns**

Instead of CopilotKit, build custom agentic patterns using Anthropic's SDK:

```typescript
// /src/lib/ai/agents/ (NEW DIRECTORY)

// Base agent framework
AgentOrchestrator.ts           // Manages multi-turn conversations
ConversationContext.ts         // Maintains state across turns
ToolRegistry.ts                // Available actions for agents

// Specialized agents
ChipSystemAgent.ts             // Designs behavioral token economies
ChecklistAgent.ts              // Creates visual routine checklists
CoRegulationAgent.ts           // Designs calming strategies
EmotionTrackerAgent.ts         // Custom emotion tracking systems
RoutineBuilderAgent.ts         // Morning/bedtime/homework routines
```

**Why NOT CopilotKit (for now):**
- Adds $200/mo cost before revenue
- React-focused (your AI logic lives in Cloud Functions)
- Learning curve delays V1 launch
- Can migrate later when justified

**Custom Agentic Pattern (Anthropic SDK):**

```typescript
// Example: Chip System Generation Agent

import Anthropic from '@anthropic-ai/sdk';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class ChipSystemAgent {
  private anthropic: Anthropic;
  private conversation: ConversationTurn[] = [];

  async startDiscovery(childManual: PersonManual): Promise<string> {
    // Analyze manual triggers/strategies
    const context = this.buildContext(childManual);

    const systemPrompt = `You are an expert in behavioral psychology and token economies.

    Context:
    ${context}

    Task: Have a conversational dialogue with the parent to design a custom chip/token system.

    Discovery goals:
    1. What behaviors to target (max 4-5)
    2. What motivates this child
    3. Parent's capacity for tracking
    4. Child's developmental level

    Start with an empathetic observation about the child's struggles, then ask the first question.`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: 'Begin the conversation' }
      ]
    });

    const message = response.content[0].text;
    this.conversation.push({ role: 'assistant', content: message });

    return message;
  }

  async respondToParent(parentReply: string): Promise<string | ChipSystem> {
    this.conversation.push({ role: 'user', content: parentReply });

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: `Continue the discovery conversation. When you have enough info, output JSON with:

      {
        "type": "chip_system",
        "system": {
          "name": "...",
          "earnBehaviors": [...],
          "spendOptions": [...],
          "rules": [...],
          ...
        }
      }

      Otherwise, continue asking questions.`,
      messages: this.conversation as any
    });

    const text = response.content[0].text;

    // Check if AI has finished discovery
    if (text.includes('"type": "chip_system"')) {
      return JSON.parse(text).system;
    }

    this.conversation.push({ role: 'assistant', content: text });
    return text;
  }

  private buildContext(manual: PersonManual): string {
    return `Child: ${manual.childInfo?.name}, age ${manual.childInfo?.age}

    Common struggles:
    ${manual.triggers.map(t => `- ${t.description}`).join('\n')}

    What works:
    ${manual.whatWorks.map(s => `- ${s.description} (effectiveness: ${s.effectiveness}/5)`).join('\n')}`;
  }
}
```

**Frontend Integration:**

```typescript
// /src/components/tools/ChipSystemBuilder.tsx

export function ChipSystemBuilder({ manual }: { manual: PersonManual }) {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const startAgent = async () => {
    const response = await fetch('/api/agents/chip-system/start', {
      method: 'POST',
      body: JSON.stringify({ manualId: manual.id })
    });

    const { message } = await response.json();
    setConversation([{ role: 'assistant', text: message }]);
  };

  const sendMessage = async (parentReply: string) => {
    setConversation(prev => [...prev, { role: 'user', text: parentReply }]);

    const response = await fetch('/api/agents/chip-system/respond', {
      method: 'POST',
      body: JSON.stringify({ reply: parentReply, sessionId })
    });

    const { message, system } = await response.json();

    if (system) {
      // Agent finished - show generated system for review
      showSystemReview(system);
    } else {
      // Continue conversation
      setConversation(prev => [...prev, { role: 'assistant', text: message }]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2>Design a Chip System for {manual.childInfo.name}</h2>

      <div className="space-y-4 mt-6">
        {conversation.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} text={msg.text} />
        ))}
      </div>

      <MessageInput onSend={sendMessage} disabled={isGenerating} />
    </div>
  );
}
```

### 2.2 System Monitoring & Adjustment

```typescript
// /functions/src/ai/systemMonitoring.ts

export const analyzeChipSystemEffectiveness = functions.pubsub
  .schedule('every sunday 20:00')
  .onRun(async (context) => {
    // For each active chip system:
    // 1. Analyze 4-week trend
    // 2. Detect patterns (declining engagement, never-earned behaviors)
    // 3. Generate adjustment suggestions
    // 4. Create notification for parent
  });

interface ChipSystemAnalysis {
  systemId: string;
  weeklyTrend: {
    week: string;
    chipsEarned: number;
    chipsSpent: number;
    engagementScore: number; // 1-10
  }[];

  insights: {
    type: 'declining_engagement' | 'impossible_behavior' | 'imbalanced_economy' | 'success';
    confidence: number;
    evidence: string[];
    suggestion: string;
  }[];

  recommendedAdjustments: {
    type: 'add_behavior' | 'remove_behavior' | 'adjust_values' | 'add_reward';
    details: any;
  }[];
}
```

---

## Phase 3: Gap Detection & Active Filling - Month 3

### 3.1 Gap Detection System

```typescript
// /src/lib/ai/gapDetection.ts

export interface ManualGap {
  gapId: string;
  manualId: string;

  type: 'insufficient_triggers' | 'missing_routine' | 'weak_strategies' |
        'unclear_values' | 'no_repair_patterns' | 'untested_layer';

  layerId?: LayerId; // If layer-specific
  severity: 'critical' | 'high' | 'medium' | 'low';

  title: string; // "Bedtime routine not documented"
  description: string;

  // Targeted questions to fill gap
  questions: {
    questionText: string;
    type: 'multiple_choice' | 'ranking' | 'open_text' | 'scale';
    options?: string[];
  }[];

  detectedAt: Timestamp;
  status: 'pending' | 'in_progress' | 'filled' | 'dismissed';
}

export async function detectGaps(manual: PersonManual): Promise<ManualGap[]> {
  const gaps: ManualGap[] = [];

  // Rule 1: Insufficient triggers
  if (manual.triggers.length < 3) {
    gaps.push({
      type: 'insufficient_triggers',
      severity: 'high',
      title: `We need to understand ${manual.childInfo.name}'s triggers better`,
      description: 'Only 2 triggers documented. Let\'s explore what else is hard.',
      questions: [
        {
          questionText: 'Which situations cause the most stress?',
          type: 'multiple_choice',
          options: ['Transitions', 'Sensory overwhelm', 'Sibling conflict', ...]
        }
      ]
    });
  }

  // Rule 2: Missing bedtime routine
  const hasBedtimeRoutine = manual.patterns.some(p =>
    p.description.toLowerCase().includes('bedtime')
  );

  if (!hasBedtimeRoutine) {
    gaps.push({
      type: 'missing_routine',
      severity: 'medium',
      title: 'Bedtime routine not documented',
      description: 'Understanding what works at bedtime helps us support you.',
      questions: [...]
    });
  }

  // Rule 3: Layer-specific gaps (using current goal)
  const activeGoal = await getActiveGoalVolume(manual.id);
  if (activeGoal) {
    const currentFocus = await getCurrentMonthlyFocus(activeGoal.volumeId);
    const focusLayers = currentFocus.primaryLayerIds;

    focusLayers.forEach(layerId => {
      const layerStrategies = manual.whatWorks.filter(s => s.layerId === layerId);
      if (layerStrategies.length < 2) {
        gaps.push({
          type: 'weak_strategies',
          layerId,
          severity: 'critical', // Critical because it's current focus
          title: `Need more strategies for ${LAYERS[layerId].userFacingName}`,
          ...
        });
      }
    });
  }

  return gaps.sort((a, b) => severityRank(a) - severityRank(b));
}
```

### 3.2 Active Gap Filling UI

```typescript
// /src/components/manual/GapFillingPrompt.tsx

export function GapFillingPrompt({ gap }: { gap: ManualGap }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});

  const handleComplete = async () => {
    // Send answers to Cloud Function
    await fillManualGap({
      gapId: gap.gapId,
      answers
    });

    // AI processes answers and updates manual
    toast.success('Manual updated! Thank you for sharing.');
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-lg border-2 border-amber-200">
      <div className="flex items-start gap-4">
        <Lightbulb className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />

        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">{gap.title}</h3>
          <p className="text-gray-700 mb-4">{gap.description}</p>

          {/* Typeform-style question display */}
          <QuestionCard
            question={gap.questions[currentQuestion]}
            onAnswer={(answer) => {
              setAnswers({ ...answers, [currentQuestion]: answer });
              if (currentQuestion < gap.questions.length - 1) {
                setCurrentQuestion(currentQuestion + 1);
              } else {
                handleComplete();
              }
            }}
          />

          <ProgressIndicator
            current={currentQuestion + 1}
            total={gap.questions.length}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Roadmap

### Month 1: Data Foundation
**Week 1-2: Data Models**
- [ ] Extend PersonManual with layerId fields
- [ ] Create GoalVolume, QuarterlyMilestone, MonthlyFocus types
- [ ] Create SpiderAssessment type
- [ ] Add ManualType field
- [ ] Firestore schema migration

**Week 3-4: Basic CRUD**
- [ ] React hooks for goal hierarchy (useGoalVolume, useQuarterlyMilestone, etc.)
- [ ] Firestore security rules
- [ ] Manual onboarding: capture layer context (behind the scenes)

### Month 2: Visualizations & Journey
**Week 1-2: Spider Diagrams**
- [ ] SpiderDiagram component (recharts)
- [ ] Weekly assessment capture
- [ ] Historical timeline view
- [ ] Baseline vs. current vs. target overlay

**Week 3-4: Goal Journey UI**
- [ ] GoalVolumeCreator wizard
- [ ] QuarterlyMilestoneView
- [ ] Workbook: "Your Journey" section showing hierarchy
- [ ] Week-to-year context in workbooks

### Month 3: AI Intelligence
**Week 1-2: Template-Based System Generation**
- [ ] Cloud Function: generateGoalVolume
- [ ] Cloud Function: generateWeeklyWorkbookFromFocus
- [ ] Pre-designed templates (chip economy, checklists)
- [ ] Parent fills specifics via guided forms

**Week 3-4: Gap Detection**
- [ ] Gap detection algorithm
- [ ] GapFillingPrompt component
- [ ] Weekly workbook integration
- [ ] Manual completeness dashboard

### Month 4-6: Agentic AI (V2)
**Week 1-2: Agent Framework**
- [ ] Custom agentic patterns with Anthropic SDK
- [ ] ConversationContext management
- [ ] Frontend chat UI components

**Week 2-4: Specialized Agents**
- [ ] ChipSystemAgent (conversational design)
- [ ] ChecklistAgent
- [ ] RoutineBuilderAgent

**Week 5-6: Monitoring & Adjustment**
- [ ] System effectiveness analysis
- [ ] Proactive suggestions
- [ ] Parent notifications

---

## Key Architectural Decisions

### 1. **AI Architecture: Template-Based V1 → Agentic V2**
✅ Start with Claude API + structured forms
✅ Migrate to conversational agents in Month 4
✅ Use Anthropic SDK (not CopilotKit) for more control

### 2. **6-Layer Integration: Invisible to Users**
✅ Backend tracks layerId on all content
✅ Users see friendly labels ("What's Hard", "What Works")
✅ Spider diagrams reveal layer structure

### 3. **Goal Hierarchy: Nested Firestore Collections**
```
/goal_volumes/{volumeId}
  /quarterly_milestones/{milestoneId}
    /monthly_focuses/{focusId}
      /weekly_workbooks/{weekId}  // Links to existing collection
```

### 4. **Manual Types: Single PersonManual with Type Field**
✅ manualType: 'child' | 'adult' | 'marriage' | 'family'
✅ Shared structure, different presentation
✅ Marriage manuals link to partnerIds
✅ Family manuals link to householdId

### 5. **Repair Tracking: First-Class Citizen**
```typescript
interface RepairInstance {
  repairId: string;
  personId: string;
  trigger: string; // What went wrong
  repairStrategy: string; // How we came back
  effectiveness: 1-5;
  timestamp: Timestamp;
}
```

---

## Next Steps

1. **Review this architecture** - Does it align with your vision?
2. **Prioritize features** - What's MVP vs. nice-to-have?
3. **Start Month 1** - Data model extensions
4. **Design spider diagram** - Visual identity for progress
5. **Plan onboarding** - How to capture 6-layer context invisibly

---

## Questions for You

1. **Timeline pressure?** - Need to launch in 3 months or can we take 6?
2. **Manual types priority** - Child first, then Marriage, then Family?
3. **Assessment frequency** - Weekly spider assessments sustainable?
4. **Repair prominence** - Daily repair prompt in every workbook?
5. **Gap filling aggressiveness** - How pushy should we be about filling gaps?

Let's discuss and refine!
