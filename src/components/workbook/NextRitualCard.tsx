'use client';

import Link from 'next/link';
import type { Ritual } from '@/types/ritual';

interface NextRitualCardProps {
  ritual: Ritual;
}

const KIND_TITLE: Record<string, string> = {
  solo_weekly: 'Your solo week',
  partner_biweekly: 'You & your partner',
  family_monthly: 'The family read',
  repair: 'A repair ritual',
};

const KIND_SUBTITLE: Record<string, string> = {
  solo_weekly: 'Twenty minutes with the book. Alone.',
  partner_biweekly: 'Two voices on the same stack of pages.',
  family_monthly: 'Everyone at the table, for a chapter.',
  repair: 'Something to set right.',
};

function countdownLabel(nextRunAt: Ritual['nextRunAt'] | undefined): string {
  if (!nextRunAt?.toDate) return 'soon';
  const run = nextRunAt.toDate();
  const now = new Date();
  const ms = run.getTime() - now.getTime();
  const days = Math.round(ms / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 7) {
    const weekday = run.toLocaleDateString('en-GB', {weekday: 'long'});
    return `${weekday}, ${days} days away`;
  }
  const friendly = run.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return `${friendly}`;
}

/**
 * Featured card at the top of the Workbook surface. Replaces the
 * daily-practice card when an active ritual exists. Tapping opens
 * the runner — no extra modal, no opt-in gesture.
 */
export function NextRitualCard({ ritual }: NextRitualCardProps) {
  const title = KIND_TITLE[ritual.kind] ?? 'Your next ritual';
  const subtitle = KIND_SUBTITLE[ritual.kind] ?? '';
  const when = countdownLabel(ritual.nextRunAt);

  return (
    <Link href={`/rituals/${ritual.ritualId}/run`} className="next-ritual-link">
      <article className="next-ritual">
        <p className="kicker">Next ritual · {when}</p>
        <h2 className="title">{title}</h2>
        <p className="subtitle">{subtitle}</p>
        <span className="open-hint">open the ritual →</span>
      </article>

      <style jsx>{`
        :global(.next-ritual-link) {
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .next-ritual {
          background: #f7eedb;
          border: 1px solid #e0d2ac;
          border-radius: 6px;
          padding: 22px 28px;
          font-family: Georgia, 'Times New Roman', serif;
          color: #2d2418;
        }
        :global(.next-ritual-link:hover) .next-ritual {
          background: #f1e3c5;
        }
        .kicker {
          margin: 0 0 10px 0;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a89373;
        }
        .title {
          margin: 0 0 6px 0;
          font-size: 22px;
          line-height: 1.25;
        }
        .subtitle {
          margin: 0 0 14px 0;
          font-style: italic;
          color: #6b5d45;
          font-size: 14px;
          line-height: 1.55;
        }
        .open-hint {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b5d45;
        }
      `}</style>
    </Link>
  );
}
