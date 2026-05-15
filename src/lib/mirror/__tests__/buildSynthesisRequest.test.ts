import { describe, it, expect } from 'vitest';
import { buildSynthesisRequest } from '../buildSynthesisRequest';
import type { MirrorAnswer } from '@/types/mirror';

const answers: MirrorAnswer[] = [
  { participantId: 'scott', label: 'Dad', text: '  A porcupine, needing space.  ' },
  { participantId: 'kaleb', label: 'Kaleb', text: 'A puppy that wanted to play' },
];

describe('buildSynthesisRequest', () => {
  it('passes the prompt through and trims answer text', () => {
    const req = buildSynthesisRequest('the prompt', answers);
    expect(req.prompt).toBe('the prompt');
    expect(req.answers).toEqual([
      { label: 'Dad', text: 'A porcupine, needing space.' },
      { label: 'Kaleb', text: 'A puppy that wanted to play' },
    ]);
  });

  it('throws if any answer is blank (both chairs required)', () => {
    expect(() =>
      buildSynthesisRequest('p', [answers[0], { ...answers[1], text: '   ' }]),
    ).toThrow(/both/i);
  });

  it('requires at least two answers', () => {
    expect(() => buildSynthesisRequest('p', [answers[0]])).toThrow();
  });
});
