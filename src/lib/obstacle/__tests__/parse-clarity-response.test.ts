import { describe, it, expect } from 'vitest';
import { parseClarityResponse } from '../parse-clarity-response';

describe('parseClarityResponse', () => {
  it('parses a simple reflection + question turn', () => {
    const raw = JSON.stringify({
      reflection: 'You sound torn.',
      question: 'Have you said this to her?',
    });
    const parsed = parseClarityResponse(raw);
    expect(parsed.reflection).toBe('You sound torn.');
    expect(parsed.question).toBe('Have you said this to her?');
    expect(parsed.prescriptionDraft).toBeUndefined();
  });

  it('parses a turn that includes a prescription draft', () => {
    const raw = JSON.stringify({
      reflection: 'It sounds clearer now.',
      question: 'Want to try something concrete?',
      prescriptionDraft: {
        shape: 'atomic',
        body: "Ask her: 'is naming it what shifts it?'",
      },
    });
    const parsed = parseClarityResponse(raw);
    expect(parsed.prescriptionDraft?.shape).toBe('atomic');
    expect(parsed.prescriptionDraft?.body).toContain('naming it');
  });

  it('tolerates JSON wrapped in code fences', () => {
    const raw =
      '```json\n' +
      JSON.stringify({ reflection: 'r', question: 'q' }) +
      '\n```';
    const parsed = parseClarityResponse(raw);
    expect(parsed.reflection).toBe('r');
    expect(parsed.question).toBe('q');
  });

  it('throws on missing required fields', () => {
    const raw = JSON.stringify({ reflection: 'only this' });
    expect(() => parseClarityResponse(raw)).toThrow();
  });

  it('throws on non-JSON gibberish', () => {
    expect(() => parseClarityResponse('not json')).toThrow();
  });

  it('rejects prescriptionDraft with invalid shape', () => {
    const raw = JSON.stringify({
      reflection: 'r',
      question: 'q',
      prescriptionDraft: { shape: 'not-a-shape', body: 'x' },
    });
    expect(() => parseClarityResponse(raw)).toThrow();
  });
});
