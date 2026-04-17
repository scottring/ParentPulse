'use client';

import Link from 'next/link';
import { CoupleRitual } from '@/types/couple-ritual';
import { nextOccurrence } from '@/lib/rituals/nextOccurrence';

interface RitualTileProps {
  ritual: CoupleRitual;
  spouseName: string;
}

function formatTime(timeLocal: string): string {
  const [hh, mm] = timeLocal.split(':').map(Number);
  const period = hh >= 12 ? 'pm' : 'am';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${hour12}${period}` : `${hour12}:${mm.toString().padStart(2, '0')}${period}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function RitualTile({ ritual, spouseName }: RitualTileProps) {
  const now = new Date();
  const next = nextOccurrence(ritual, now);
  const diffMs = next.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dayLabel = DAY_NAMES[ritual.dayOfWeek];
  const timeLabel = formatTime(ritual.startTimeLocal);
  const countdownLabel =
    daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;

  return (
    <Link
      href="/rituals/couple/manage"
      className="bg-white rounded-xl p-4 hover:shadow-sm transition-shadow block"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: '#8B7E6A' }}>
        Ritual
      </p>
      <p className="text-sm leading-snug font-medium" style={{ color: '#3A3530' }}>
        {dayLabel} · {timeLabel}
      </p>
      <p className="text-xs mt-1" style={{ color: '#8B7E6A' }}>
        with {spouseName} · {countdownLabel}
      </p>
    </Link>
  );
}
