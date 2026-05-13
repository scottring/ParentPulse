import { describe, it, expect } from 'vitest';
import { pickCard, CARD_ROTATION } from '@/lib/check-in/pickCard';

describe('pickCard', () => {
  it('defaults to the first card in the rotation when no previous card', () => {
    expect(pickCard(null)).toBe(CARD_ROTATION[0]);
    expect(pickCard(null)).toBe('parent-reflection');
  });

  it('cycles parent-reflection → high-low-buffalo', () => {
    expect(pickCard('parent-reflection')).toBe('high-low-buffalo');
  });

  it('cycles high-low-buffalo → externalized-worry', () => {
    expect(pickCard('high-low-buffalo')).toBe('externalized-worry');
  });

  it('cycles externalized-worry → parent-reflection (wraps)', () => {
    expect(pickCard('externalized-worry')).toBe('parent-reflection');
  });

  it('honors an explicit override even when last card exists', () => {
    expect(pickCard('parent-reflection', 'parent-reflection')).toBe(
      'parent-reflection',
    );
    expect(pickCard('high-low-buffalo', 'externalized-worry')).toBe(
      'externalized-worry',
    );
  });

  it('honors an override on first-ever check-in', () => {
    expect(pickCard(null, 'high-low-buffalo')).toBe('high-low-buffalo');
    expect(pickCard(null, 'externalized-worry')).toBe('externalized-worry');
  });
});
