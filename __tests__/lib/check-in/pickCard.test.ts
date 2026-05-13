import { describe, it, expect } from 'vitest';
import { pickCard } from '@/lib/check-in/pickCard';

describe('pickCard', () => {
  it('defaults to parent-reflection when no previous card', () => {
    expect(pickCard(null)).toBe('parent-reflection');
  });

  it('returns high-low-buffalo when last card was parent-reflection', () => {
    expect(pickCard('parent-reflection')).toBe('high-low-buffalo');
  });

  it('returns parent-reflection when last card was high-low-buffalo', () => {
    expect(pickCard('high-low-buffalo')).toBe('parent-reflection');
  });

  it('honors an explicit override even when last card exists', () => {
    expect(pickCard('parent-reflection', 'parent-reflection')).toBe(
      'parent-reflection',
    );
    expect(pickCard('high-low-buffalo', 'parent-reflection')).toBe(
      'parent-reflection',
    );
  });

  it('honors an override on first-ever check-in', () => {
    expect(pickCard(null, 'high-low-buffalo')).toBe('high-low-buffalo');
  });
});
