'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';
import { ritualBannerState } from '@/lib/rituals/isInWindow';

export default function RitualBanner() {
  const { ritual, loading } = useCoupleRitual();
  const { spouseName } = useSpouse();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);

  if (loading || !ritual) return null;
  const state = ritualBannerState(ritual, now);
  if (state === 'hidden') return null;

  const partner = spouseName ?? 'your partner';
  const timeLabel = formatTime(ritual.startTimeLocal);

  if (state === 'preWindow') {
    return (
      <div style={preStyle}>
        Your check-in with {partner} is tonight at {timeLabel}.
      </div>
    );
  }
  return (
    <Link href="/rituals/couple/session" style={inStyle}>
      Your check-in with {partner} is starting. Start together →
    </Link>
  );
}

function formatTime(hm: string): string {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const preStyle: React.CSSProperties = {
  position: 'fixed', top: 64, left: 0, right: 0, zIndex: 40,
  background: '#F3F1EC', borderBottom: '1px solid rgba(120,100,70,0.12)',
  padding: '10px 20px', textAlign: 'center',
  fontFamily: 'var(--font-parent-body)', fontSize: 14, color: '#5C5347',
};
const inStyle: React.CSSProperties = {
  ...preStyle,
  background: '#7C9082',
  color: 'white',
  textDecoration: 'none',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'block',
};
