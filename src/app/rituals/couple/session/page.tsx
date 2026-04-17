'use client';

import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';

export default function Page() {
  return (
    <>
      <Navigation />
      <main style={{
        padding: '120px 32px 64px', maxWidth: 560, margin: '0 auto',
        textAlign: 'center', fontFamily: 'var(--font-parent-body)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-parent-display)', fontSize: 40, fontWeight: 300,
          fontStyle: 'italic', margin: '0 0 16px', color: '#3A3530',
        }}>
          Your check-in has begun.
        </h1>
        <p style={{ fontSize: 16, color: '#6B6254', margin: '0 0 32px', lineHeight: 1.6 }}>
          Sit together. Talk about what&rsquo;s on your minds.
          <br />
          (The shared Surface is coming soon &mdash; for now this is the signal to start.)
        </p>
        <Link href="/rituals" style={{
          fontFamily: 'var(--font-parent-body)', fontSize: 15, color: '#3A3530',
          textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #7C9082',
          paddingBottom: 2,
        }}>
          Back to rituals
        </Link>
      </main>
    </>
  );
}
