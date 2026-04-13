'use client';

import FeaturedHero from '@/components/magazine/FeaturedHero';
import type { LeadItem } from '@/types/surface';

interface TheLeadProps {
  item: LeadItem;
}

/**
 * The single most important thing right now.
 * Wraps the existing FeaturedHero magazine primitive.
 */
export default function TheLead({ item }: TheLeadProps) {
  return (
    <FeaturedHero
      eyebrow={item.eyebrow}
      kindLabel={item.type === 'calm' ? undefined : undefined}
      glyph={item.glyph}
      glyphColor={item.glyphColor}
      title={item.title}
      body={item.body}
      ctaHref={item.ctaHref}
      ctaLabel={item.ctaLabel}
    />
  );
}
