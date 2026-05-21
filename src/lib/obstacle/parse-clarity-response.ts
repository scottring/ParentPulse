import type { PrescriptionShape, PrescriptionDraft } from '@/types/obstacle';

export interface ClarityResponse {
  reflection: string;
  question: string;
  prescriptionDraft?: PrescriptionDraft;
}

const VALID_SHAPES: PrescriptionShape[] = [
  'atomic',
  'sequence',
  'experiment',
  'illustrated-story',
];

/**
 * Parse + validate the LLM's per-turn JSON envelope.
 *
 * Contract (enforced by the handler's system prompt):
 *   { reflection: string, question: string, prescriptionDraft?: {shape, body} }
 *
 * Tolerates the LLM wrapping the JSON in a ```json code fence.
 */
export function parseClarityResponse(raw: string): ClarityResponse {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(stripped);
  } catch (err) {
    throw new Error(`Failed to parse clarity response as JSON: ${(err as Error).message}`);
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('Clarity response was not a JSON object');
  }
  const o = obj as Record<string, unknown>;

  if (typeof o.reflection !== 'string' || !o.reflection.trim()) {
    throw new Error('Missing or empty reflection');
  }
  if (typeof o.question !== 'string' || !o.question.trim()) {
    throw new Error('Missing or empty question');
  }

  const out: ClarityResponse = {
    reflection: o.reflection.trim(),
    question: o.question.trim(),
  };

  if (o.prescriptionDraft) {
    const pd = o.prescriptionDraft as Record<string, unknown>;
    if (!VALID_SHAPES.includes(pd.shape as PrescriptionShape)) {
      throw new Error(`Invalid prescription shape: ${String(pd.shape)}`);
    }
    if (typeof pd.body !== 'string' || !pd.body.trim()) {
      throw new Error('Missing prescription body');
    }
    out.prescriptionDraft = {
      shape: pd.shape as PrescriptionShape,
      body: pd.body.trim(),
    };
  }

  return out;
}
