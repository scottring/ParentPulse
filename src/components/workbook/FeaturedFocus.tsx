'use client';

import type { GrowthItem } from '@/types/growth';
import FeaturedHero from '@/components/magazine/FeaturedHero';
import { TYPE_LABELS, isReading } from './helpers';

interface FeaturedFocusProps {
  item: GrowthItem;
  eyebrow?: string;
}

// Workbook-specific wrapper around the generic FeaturedHero. Owns the
// copy mapping: body trim, reading glyph, "about X / for Y" meta line,
// CTA label.
export default function FeaturedFocus({
  item,
  eyebrow = 'Today in the Workbook',
}: FeaturedFocusProps) {
  const typeLabel = TYPE_LABELS[item.type] || 'A practice';
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');
  const reading = isReading(item);
  const glyph = reading ? '❦' : '◆';
  const glyphColor = reading ? '#B88E5A' : '#5C8064';
  const fromChat = Boolean(
    (item as unknown as { sourceChatSessionId?: string }).sourceChatSessionId,
  );
  // P3.3 — "from your journal" pill retired; provenance is the
  // first screen of the practice now.

  const bodyExcerpt =
    item.body && item.body.length > 340
      ? item.body.slice(0, 340).trim() + '…'
      : item.body || undefined;

  const meta = (
    <>
      {about && (
        <>
          about <span className="press-sc">{about}</span>
          <span className="sep">·</span>
        </>
      )}
      for <span className="press-sc">{forWhom}</span>
      {fromChat && (
        <>
          <span className="sep">·</span>
          drawn from a conversation
        </>
      )}
    </>
  );

  return (
    <FeaturedHero
      eyebrow={eyebrow}
      kindLabel={`${typeLabel} · ${minutes} ${reading ? 'min read' : 'min'}`}
      glyph={glyph}
      glyphColor={glyphColor}
      title={item.title}
      body={bodyExcerpt}
      meta={meta}
      ctaHref={`/growth/${item.growthItemId}`}
      ctaLabel={reading ? 'Open the story' : 'Begin this practice'}
    />
  );
}
