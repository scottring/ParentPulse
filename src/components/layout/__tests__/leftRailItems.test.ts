import { describe, it, expect } from 'vitest';
import {
  LEFT_RAIL_ITEMS,
  HIDE_CHROME_ROUTES,
  shouldHideChrome,
} from '@/components/layout/leftRailItems';

describe('leftRailItems', () => {
  it('exposes the seven canonical rail items in order', () => {
    expect(LEFT_RAIL_ITEMS.map((i) => i.key)).toEqual([
      'journal', 'people', 'therapy', 'rituals', 'experiments', 'unspoken', 'archive',
    ]);
  });

  it('marks Therapy as PIN-gated', () => {
    expect(LEFT_RAIL_ITEMS.find((i) => i.key === 'therapy')?.pinGated).toBe(true);
  });

  describe('shouldHideChrome', () => {
    it.each([
      ['/login', true],
      ['/login/', true],
      ['/register', true],
      ['/check-in/abc', false],
      ['/check-in/', false],
      ['/', false],
      ['/manual', false],
      ['/therapy', false],
      ['/experiments/arc-1', false],
      ['/journal/entry-1', false],
    ])('returns %o for %s', (path, expected) => {
      expect(shouldHideChrome(path)).toBe(expected);
    });
  });
});
