import { describe, it, expect } from 'vitest';
import { truncateQuote, MAX_QUOTE_CHARS } from '../flag';

describe('truncateQuote', () => {
  it('trims and collapses whitespace', () => {
    expect(truncateQuote('  hello   world  ')).toBe('hello world');
  });

  it('returns short input unchanged', () => {
    expect(truncateQuote('short')).toBe('short');
  });

  it('truncates with ellipsis when over the cap', () => {
    const big = 'x'.repeat(MAX_QUOTE_CHARS + 50);
    const out = truncateQuote(big);
    expect(out).toHaveLength(MAX_QUOTE_CHARS);
    expect(out.endsWith('…')).toBe(true);
  });

  it('handles empty input', () => {
    expect(truncateQuote('')).toBe('');
    expect(truncateQuote(undefined as unknown as string)).toBe('');
  });
});
