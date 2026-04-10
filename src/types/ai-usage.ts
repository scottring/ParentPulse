import { Timestamp } from 'firebase/firestore';

// ================================================================
// AI Usage — tracking token consumption and cost per AI call
// ================================================================

/**
 * A single recorded AI API call. Written by cloud functions after each
 * Anthropic call completes. Aggregated on the client to show spend.
 */
export interface AIUsageEvent {
  eventId: string;
  familyId: string;
  userId: string;             // who triggered the call (or 'system' for scheduled)
  function: string;           // which cloud function — e.g. 'askManual', 'generateKidStoryFromChatContext'
  subOperation?: string;      // optional sub-label — e.g. 'intent_classifier', 'main_response', 'insight_extraction'
  model: string;              // full model ID
  modelFamily: 'sonnet' | 'haiku' | 'opus' | 'other';
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  estimatedCostUsd: number;   // computed from rate table
  timestamp: Timestamp;

  // Optional lineage / context for debugging
  personId?: string;           // who the call was about (e.g. manual-chat target)
  sessionId?: string;          // chat session if applicable
}

// ================================================================
// Pricing — dollars per million tokens (approximate, update as needed)
// ================================================================

interface ModelRate {
  input: number;   // USD per 1M input tokens
  output: number;  // USD per 1M output tokens
  cacheWrite?: number;
  cacheRead?: number;
  family: 'sonnet' | 'haiku' | 'opus' | 'other';
}

export const AI_MODEL_RATES: Record<string, ModelRate> = {
  // Sonnet family — ~$3 input, $15 output per million
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30, family: 'sonnet' },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30, family: 'sonnet' },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30, family: 'sonnet' },
  // Haiku family — substantially cheaper
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25, cacheWrite: 0.30, cacheRead: 0.03, family: 'haiku' },
  'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00, cacheWrite: 1.25, cacheRead: 0.10, family: 'haiku' },
  // Opus — most expensive
  'claude-opus-4-20250514': { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50, family: 'opus' },
  'claude-opus-4-6': { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50, family: 'opus' },
};

/**
 * Compute estimated cost in USD for a single API call, given its token usage.
 * Falls back to Sonnet rates if the model isn't in the table (conservative).
 */
export function computeCost(
  model: string,
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  },
): number {
  const rate = AI_MODEL_RATES[model] || AI_MODEL_RATES['claude-sonnet-4-20250514'];
  const input = (usage.input_tokens || 0) * rate.input / 1_000_000;
  const output = (usage.output_tokens || 0) * rate.output / 1_000_000;
  const cacheWrite = (usage.cache_creation_input_tokens || 0) * (rate.cacheWrite || rate.input) / 1_000_000;
  const cacheRead = (usage.cache_read_input_tokens || 0) * (rate.cacheRead || rate.input * 0.1) / 1_000_000;
  return input + output + cacheWrite + cacheRead;
}

/**
 * Get the family descriptor for a model ID.
 */
export function getModelFamily(model: string): 'sonnet' | 'haiku' | 'opus' | 'other' {
  return AI_MODEL_RATES[model]?.family || 'other';
}

// ================================================================
// Budget configuration — stored on the family document
// ================================================================

export interface BudgetConfig {
  monthlyLimitUsd: number;           // e.g. 20 — alert after $20 in a calendar month
  thresholds: number[];              // e.g. [0.5, 0.8, 1.0] — warn at 50%, 80%, 100%
  lastAlertedThreshold?: number;     // the most recent threshold the user was shown an alert for
  lastAlertedAt?: Timestamp;
}

export const DEFAULT_BUDGET: BudgetConfig = {
  monthlyLimitUsd: 15,
  thresholds: [0.5, 0.8, 1.0],
};

// ================================================================
// Aggregates — what the UI consumes after grouping events
// ================================================================

export interface UsageAggregate {
  totalCostUsd: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byFunction: Array<{
    function: string;
    calls: number;
    costUsd: number;
  }>;
  byModel: Array<{
    model: string;
    family: string;
    calls: number;
    costUsd: number;
  }>;
}

// ================================================================
// Firestore collection
// ================================================================

export const AI_USAGE_COLLECTIONS = {
  EVENTS: 'ai_usage_events',
} as const;
