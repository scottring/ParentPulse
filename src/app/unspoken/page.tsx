'use client';
/* ================================================================
   /unspoken — a private holding queue for journal entries the user
   has written but not yet released. Entries arrive here via the
   "Hold this for later" action on /journal/[entryId]. Display only —
   no auto-routing into rituals or therapy (predict, don't route).
   ================================================================ */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUnspokenEntries } from '@/hooks/useUnspokenEntries';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { QueueList } from '@/components/unspoken/QueueList';
import { IntegrationPathCard, type IntegrationPathSlot } from '@/components/unspoken/IntegrationPathCard';
import { VellumStack } from '@/components/unspoken/VellumStack';

export default function UnspokenPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { entries, loading } = useUnspokenEntries();
  const { ritual } = useCoupleRitual();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return <main style={appStyle}><div style={pageStyle}><p style={mutedStyle}>Opening&hellip;</p></div></main>;
  }
  if (!user) return null;

  const slots: IntegrationPathSlot[] = [];
  if (ritual) {
    const summary = summarizeRitual(ritual);
    if (summary) {
      slots.push({
        label: 'Next ritual',
        value: summary,
      });
    }
  }

  return (
    <main style={appStyle}>
      <div style={pageStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Safe Holding Space</p>
          <h1 style={titleStyle}>Thoughts awaiting their time.</h1>
          <p style={ledeStyle}>
            What you write here stays here &mdash; protected, unrouted, ready when
            you are. The Unspoken is a private sanctuary for the words you
            haven&rsquo;t yet said out loud.
          </p>
        </header>

        <QueueList entries={entries} />
        <IntegrationPathCard slots={slots} />
        <VellumStack />
      </div>
    </main>
  );
}

function summarizeRitual(r: { cadence?: string; dayOfWeek?: number; startTimeLocal?: string }): string {
  try {
    if (r.dayOfWeek === undefined || r.dayOfWeek === null || !r.startTimeLocal) return '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayLabel = days[r.dayOfWeek];
    if (!dayLabel) return '';
    const parts = r.startTimeLocal.split(':');
    if (parts.length < 2) return '';
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return '';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return `${dayLabel} ${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  } catch {
    return '';
  }
}

const appStyle: CSSProperties = { minHeight: '100vh', background: 'var(--r-cream, #F7F5F0)' };
const pageStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '64px 32px 96px' };
const mutedStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', color: 'var(--r-text-4, #6B6254)' };
const headerStyle: CSSProperties = { textAlign: 'center', marginBottom: 12 };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 14px' };
const titleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(36px, 5vw, 48px)', color: 'var(--r-ink, #2B2620)', margin: '0 0 16px' };
const ledeStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 17, lineHeight: 1.55, color: 'var(--r-text-3, #5C5347)', margin: '0 auto', maxWidth: '54ch' };
