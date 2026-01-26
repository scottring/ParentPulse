import OpenAI from 'openai';
import type { LayerId, SpiderAssessment } from '@/types/assessment';
import type { ChildManual, ManualStrategy, ManualTrigger } from '@/types/manual';
import type {
  ParentBehaviorGoalV2,
  DailyActivityV2,
} from '@/types/workbook';

// ==================== Types ====================

export interface WorkbookGenerationContext {
  manual: ChildManual; // Currently supporting child manuals
  latestAssessment?: SpiderAssessment;
  baselineAssessment?: SpiderAssessment;
  goalContext: {
    yearGoal: string;
    quarterFocus: string;
    thisMonth: string;
    volumeId: string;
  };
  previousWorkbooks?: { parentGoals: ParentBehaviorGoalV2[]; weeklyReflection?: unknown }[];
  dailyMinutes: number;
}

export interface GeneratedWorkbookContent {
  thisWeek: string;
  parentGoals: Omit<ParentBehaviorGoalV2, 'dailyCompletions' | 'completedCount' | 'totalOpportunities'>[];
  dailyActivities: Omit<DailyActivityV2, 'status' | 'completedAt'>[];
  suggestedPractices: string[];
}

// ==================== Layer Priority ====================

/**
 * Identify which layers need the most focus based on assessments
 */
export function identifyFocusLayers(
  current?: SpiderAssessment,
  baseline?: SpiderAssessment
): { layerId: LayerId; priority: 'high' | 'medium' | 'low'; reason: string }[] {
  if (!current) {
    // No assessment yet, focus on foundational layers
    return [
      { layerId: 1, priority: 'high', reason: 'Start with understanding triggers' },
      { layerId: 2, priority: 'medium', reason: 'Build co-regulation skills' },
      { layerId: 4, priority: 'medium', reason: 'Establish daily strategies' },
    ];
  }

  const results: { layerId: LayerId; priority: 'high' | 'medium' | 'low'; reason: string }[] = [];

  for (const layer of current.layers) {
    let priority: 'high' | 'medium' | 'low' = 'low';
    let reason = '';

    // Find baseline score for comparison
    const baselineLayer = baseline?.layers.find((l) => l.layerId === layer.layerId);
    const baselineScore = baselineLayer?.score || layer.score;

    if (layer.score <= 4) {
      priority = 'high';
      reason = `Score of ${layer.score}/10 indicates significant room for growth`;
    } else if (layer.score <= 6) {
      priority = 'medium';
      reason = `Score of ${layer.score}/10 shows opportunity for improvement`;
    } else if (layer.score < baselineScore) {
      priority = 'medium';
      reason = `Decreased from baseline (${baselineScore} → ${layer.score})`;
    } else {
      reason = `Maintaining at ${layer.score}/10`;
    }

    results.push({ layerId: layer.layerId, priority, reason });
  }

  // Sort by priority (high first)
  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

/**
 * Get relevant strategies from manual for a specific layer
 */
export function getLayerStrategies(
  manual: ChildManual,
  layerId: LayerId
): ManualStrategy[] {
  return manual.whatWorks.filter((s) => s.layerId === layerId);
}

/**
 * Get relevant triggers from manual for a specific layer
 */
export function getLayerTriggers(
  manual: ChildManual,
  layerId: LayerId
): ManualTrigger[] {
  return manual.triggers.filter((t) => t.layerId === layerId);
}

// ==================== Prompt Building ====================

function buildSystemPrompt(): string {
  return `You are a supportive parenting coach helping parents create weekly practice plans.

Your role:
- Generate practical, achievable weekly goals for the PARENT (not the child)
- Focus on what the parent can control: their responses, patience, presence
- Use the "Am I being..." frame: Am I being patient? Am I being present?
- Never blame, shame, or set perfectionistic expectations
- Celebrate small wins and normalize repair

Key principles:
- 3-5 parent behavior goals per week
- 7 daily activities (one per day) that are brief and manageable
- Activities should fit within the time commitment specified
- Goals should address the highest-priority layers first
- Use strategies from the manual that have worked before
- Acknowledge triggers and plan around them

Output format: JSON only, no markdown.`;
}

function buildGenerationPrompt(context: WorkbookGenerationContext): string {
  const focusLayers = identifyFocusLayers(
    context.latestAssessment,
    context.baselineAssessment
  );

  const highPriorityLayers = focusLayers.filter((l) => l.priority === 'high');
  const mediumPriorityLayers = focusLayers.filter((l) => l.priority === 'medium');

  // Get relevant strategies for focus layers
  const relevantStrategies: ManualStrategy[] = [];
  const relevantTriggers: ManualTrigger[] = [];

  for (const layer of [...highPriorityLayers, ...mediumPriorityLayers].slice(0, 3)) {
    relevantStrategies.push(...getLayerStrategies(context.manual, layer.layerId));
    relevantTriggers.push(...getLayerTriggers(context.manual, layer.layerId));
  }

  return `Generate a weekly parenting workbook for ${context.manual.personName}.

## Context
Child: ${context.manual.personName}
Daily time commitment: ${context.dailyMinutes} minutes

## Goal Hierarchy
Year Goal: ${context.goalContext.yearGoal}
This Quarter: ${context.goalContext.quarterFocus}
This Month: ${context.goalContext.thisMonth}

## Priority Layers (1-6 scale, where 1=Inputs, 6=Supervisory)
${focusLayers.map((l) => `Layer ${l.layerId}: ${l.priority} priority - ${l.reason}`).join('\n')}

## What Works (from manual)
${relevantStrategies.slice(0, 5).map((s) => `- ${s.description} (effectiveness: ${s.effectiveness}/5)`).join('\n') || 'No strategies recorded yet'}

## Known Triggers
${relevantTriggers.slice(0, 5).map((t) => `- ${t.description}: ${t.context}`).join('\n') || 'No triggers recorded yet'}

## What Doesn't Work
${context.manual.whatDoesntWork.slice(0, 3).map((s) => `- ${s.description}`).join('\n') || 'None recorded'}

## Generate JSON with this structure:
{
  "thisWeek": "One sentence focus for this week",
  "parentGoals": [
    {
      "goalId": "goal-1",
      "description": "Specific parent behavior to practice",
      "layerFocus": 1,
      "frequency": "daily" or "situational",
      "linkedTriggerId": "optional trigger id"
    }
  ],
  "dailyActivities": [
    {
      "activityId": "activity-sun",
      "title": "Short title",
      "description": "What to do",
      "layerFocus": 1,
      "estimatedMinutes": 10,
      "day": 0
    }
  ],
  "suggestedPractices": [
    "Quick tip 1",
    "Quick tip 2"
  ]
}

Requirements:
- 3-5 parentGoals
- 7 dailyActivities (days 0-6 for Sunday-Saturday)
- 3-5 suggestedPractices
- Each activity should be <=${Math.floor(context.dailyMinutes / 2)} minutes
- Focus on parent behavior, not child compliance
- Use warm, supportive language`;
}

// ==================== OpenAI Integration ====================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    openaiClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return openaiClient;
}

/**
 * Generate workbook content using OpenAI
 */
export async function generateWorkbookContent(
  context: WorkbookGenerationContext
): Promise<GeneratedWorkbookContent> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildGenerationPrompt(context) },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content) as GeneratedWorkbookContent;

  // Validate required fields
  if (!parsed.thisWeek || !parsed.parentGoals || !parsed.dailyActivities) {
    throw new Error('Invalid workbook structure from OpenAI');
  }

  return parsed;
}

// ==================== Fallback Generation ====================

/**
 * Generate fallback content when AI is unavailable
 */
export function generateFallbackContent(
  context: WorkbookGenerationContext
): GeneratedWorkbookContent {
  const focusLayers = identifyFocusLayers(
    context.latestAssessment,
    context.baselineAssessment
  );

  const topLayer = focusLayers[0]?.layerId || 1;
  const childName = context.manual.personName;

  return {
    thisWeek: `Focus on being present with ${childName} during transitions`,
    parentGoals: [
      {
        goalId: 'goal-1',
        description: `Give ${childName} a 5-minute warning before transitions`,
        layerFocus: topLayer,
        frequency: 'situational',
      },
      {
        goalId: 'goal-2',
        description: 'Take 3 deep breaths before responding to challenging behavior',
        layerFocus: 2 as LayerId,
        frequency: 'situational',
      },
      {
        goalId: 'goal-3',
        description: `Spend 10 minutes of distraction-free time with ${childName}`,
        layerFocus: 5 as LayerId,
        frequency: 'daily',
      },
    ],
    dailyActivities: [
      {
        activityId: 'activity-0',
        title: 'Weekly intention',
        description: 'Write down one thing you want to be more present for this week',
        layerFocus: 6 as LayerId,
        estimatedMinutes: 5,
        day: 0,
      },
      {
        activityId: 'activity-1',
        title: 'Notice patterns',
        description: `Pay attention to when ${childName} seems most regulated today`,
        layerFocus: 1 as LayerId,
        estimatedMinutes: 5,
        day: 1,
      },
      {
        activityId: 'activity-2',
        title: 'Practice co-regulation',
        description: 'When emotions rise, try matching then calming your own energy first',
        layerFocus: 2 as LayerId,
        estimatedMinutes: 10,
        day: 2,
      },
      {
        activityId: 'activity-3',
        title: 'Review routines',
        description: 'Which part of your daily routine feels smoothest? Why?',
        layerFocus: 3 as LayerId,
        estimatedMinutes: 5,
        day: 3,
      },
      {
        activityId: 'activity-4',
        title: 'Try a strategy',
        description: 'Pick one thing from "what works" and use it intentionally today',
        layerFocus: 4 as LayerId,
        estimatedMinutes: 10,
        day: 4,
      },
      {
        activityId: 'activity-5',
        title: 'Connection time',
        description: `10 minutes of ${childName}'s choice - follow their lead completely`,
        layerFocus: 5 as LayerId,
        estimatedMinutes: 10,
        day: 5,
      },
      {
        activityId: 'activity-6',
        title: 'Reflect & reset',
        description: 'What went well this week? What felt hard? No judgment, just notice.',
        layerFocus: 6 as LayerId,
        estimatedMinutes: 5,
        day: 6,
      },
    ],
    suggestedPractices: [
      'Repair early and often - it builds trust',
      'Your calm is contagious (so is your stress)',
      "Progress isn't linear - bad days don't erase good ones",
    ],
  };
}

// ==================== Week Utilities ====================

/**
 * Get ISO week string (e.g., "2026-W04")
 */
export function getWeekId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get week start (Sunday) and end (Saturday) dates
 */
export function getWeekBounds(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get week number (1-52)
 */
export function getWeekNumber(date: Date = new Date()): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
