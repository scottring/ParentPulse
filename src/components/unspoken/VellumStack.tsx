'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

export function VellumStack() {
  return (
    <section style={sectionStyle} aria-label="Sanctuary for stillness">
      <p style={eyebrowStyle}>Sanctuary for Stillness</p>
      <p style={bodyStyle}>
        The Unspoken is layered, not lost. Entries you held here become part of
        the deeper record — viewable in the Archive when you're ready to
        revisit them.
      </p>
      <Link href="/archive" style={linkStyle}>Explore the Archive ⟶</Link>
    </section>
  );
}

const sectionStyle: CSSProperties = { padding: '32px 0', borderTop: '1px solid rgba(120, 100, 70, 0.12)' };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 14px' };
const bodyStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--r-text-3, #5C5347)', margin: '0 0 18px', maxWidth: '58ch' };
const linkStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--r-ink, #2B2620)', textDecoration: 'none', borderBottom: '1px solid var(--r-ink, #2B2620)', paddingBottom: 2 };
