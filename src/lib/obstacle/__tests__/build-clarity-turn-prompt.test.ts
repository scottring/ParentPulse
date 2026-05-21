import { describe, it, expect } from 'vitest';
import { buildClarityTurnPrompt } from '../build-clarity-turn-prompt';

describe('buildClarityTurnPrompt', () => {
  it('opens with the obstacle title when set', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: 'the wrestling thing',
      transcript: [
        { role: 'user', content: "I've been wanting to bring up..." },
      ],
    });
    expect(out).toContain('Obstacle: the wrestling thing');
  });

  it('omits obstacle title block when title is empty (fresh obstacle)', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: '',
      transcript: [{ role: 'user', content: "I've been thinking..." }],
    });
    expect(out).not.toContain('Obstacle:');
  });

  it('formats transcript as a labeled sequence', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: 't',
      transcript: [
        { role: 'user', content: 'A' },
        { role: 'assistant', content: 'B' },
        { role: 'user', content: 'C' },
      ],
    });
    expect(out).toContain('USER: A');
    expect(out).toContain('ASSISTANT: B');
    expect(out).toContain('USER: C');
  });

  it('appends a "respond now" sentinel at the end', () => {
    const out = buildClarityTurnPrompt({
      obstacleTitle: 't',
      transcript: [{ role: 'user', content: 'A' }],
    });
    expect(out.trim().endsWith('Respond as ASSISTANT now.')).toBe(true);
  });
});
