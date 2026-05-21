export interface TranscriptTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuildClarityTurnPromptInput {
  obstacleTitle: string;
  transcript: TranscriptTurn[];
}

/**
 * Builds the user-message string passed to the LLM each turn.
 *
 * The system prompt (voice rules, JSON envelope contract, safety,
 * generalization) lives in the handler. This function just renders
 * the per-turn context: the obstacle title (once set) and the prior
 * transcript.
 */
export function buildClarityTurnPrompt(input: BuildClarityTurnPromptInput): string {
  const parts: string[] = [];
  if (input.obstacleTitle && input.obstacleTitle.trim()) {
    parts.push(`Obstacle: ${input.obstacleTitle.trim()}`);
    parts.push('');
  }
  for (const t of input.transcript) {
    const label = t.role === 'user' ? 'USER' : 'ASSISTANT';
    parts.push(`${label}: ${t.content}`);
  }
  parts.push('');
  parts.push('Respond as ASSISTANT now.');
  return parts.join('\n');
}
