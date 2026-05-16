import { describe, it, expect } from 'vitest';
import { dyadKeyFromParticipantIds } from '../dyadKey';

describe('dyadKeyFromParticipantIds', () => {
  it('is order-independent for a pair', () => {
    expect(dyadKeyFromParticipantIds(['scott', 'kaleb']))
      .toBe(dyadKeyFromParticipantIds(['kaleb', 'scott']));
  });

  it('joins sorted ids with a double underscore', () => {
    expect(dyadKeyFromParticipantIds(['kaleb', 'scott'])).toBe('kaleb__scott');
  });

  it('supports 3+ participants (future triad), still sorted', () => {
    expect(dyadKeyFromParticipantIds(['scott', 'ella', 'kaleb']))
      .toBe('ella__kaleb__scott');
  });

  it('dedupes and rejects empty', () => {
    expect(dyadKeyFromParticipantIds(['a', 'a', 'b'])).toBe('a__b');
    expect(() => dyadKeyFromParticipantIds([])).toThrow();
    expect(() => dyadKeyFromParticipantIds(['only'])).toThrow();
  });
});
