import { describe, it, expect } from 'vitest';
import { BOOK_ASSETS, FLAT_COLORS, BOOK_ASSETS_AVAILABLE } from '@/components/journal-spread/assets';

describe('journal-spread assets', () => {
  it('exports the required asset paths', () => {
    expect(BOOK_ASSETS.cover).toContain('/images/book/cover.');
    expect(BOOK_ASSETS.spineLeather).toContain('/images/book/');
    expect(BOOK_ASSETS.paperLeft).toContain('/images/book/');
    expect(BOOK_ASSETS.paperRight).toContain('/images/book/');
    expect(BOOK_ASSETS.gutterShadow).toContain('/images/book/');
  });

  it('exports flat fallback colors', () => {
    expect(FLAT_COLORS.paper).toMatch(/^#[0-9a-f]{6}$/i);
    expect(FLAT_COLORS.ink).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('availability flag is a boolean', () => {
    expect(typeof BOOK_ASSETS_AVAILABLE).toBe('boolean');
  });
});
