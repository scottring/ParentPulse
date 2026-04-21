'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useTherapyAggregate } from '@/hooks/useTherapyAggregate';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';

/**
 * SurfaceTherapyCard — a counts-only therapy prep prompt on The Surface.
 *
 * CRITICAL: Hidden entirely when PIN is locked. Never shows theme
 * titles or content — only aggregate counts and contextual copy.
 *
 * Promoted (thicker amber border) when:
 *   - a starred theme has been carried forward 2+ times, or
 *   - the open window age exceeds the typical cadence
 */
export function SurfaceTherapyCard() {
  const { pinIsSet, unlocked } = usePrivacyLock();
  const agg = useTherapyAggregate();

  // Compute derived values from aggregate — all hooks must run unconditionally
  // before early returns to satisfy rules-of-hooks.
  const { promoted, copy } = useMemo(() => {
    if (!agg.ready || !agg.hasTherapist) {
      return { promoted: false, copy: '' };
    }
    const { themeCount, starredCarriedTwicePlus, openedAtMillis, typicalCadenceDays } = agg;
    const openedAgeDays =
      openedAtMillis !== null
        ? (moduleLoadTime - openedAtMillis) / (1000 * 60 * 60 * 24)
        : null;
    const pastCadence = openedAgeDays !== null && openedAgeDays > typicalCadenceDays;
    const isPromoted = starredCarriedTwicePlus || pastCadence;

    let cardCopy: string;
    if (themeCount === 0) {
      cardCopy = 'Therapy prep \u2014 ready to start building.';
    } else if (starredCarriedTwicePlus) {
      cardCopy = `A few threads keep carrying forward \u00b7 ${themeCount} ${themeCount === 1 ? 'theme' : 'themes'}.`;
    } else if (pastCadence) {
      cardCopy = `Your next session is probably coming up \u00b7 ${themeCount} ${themeCount === 1 ? 'theme' : 'themes'}.`;
    } else {
      cardCopy = `Therapy prep \u00b7 ${themeCount} ${themeCount === 1 ? 'theme' : 'themes'}.`;
    }
    return { promoted: isPromoted, copy: cardCopy };
  }, [agg]);

  // Hidden while PIN is locked
  if (pinIsSet && !unlocked) return null;

  // Not ready yet — render nothing (no skeleton, stays invisible)
  if (!agg.ready) return null;

  // No therapist set up — show the prompt to get started
  if (!agg.hasTherapist) {
    return (
      <CardShell promoted={false}>
        Therapy &middot; set up your therapy book
      </CardShell>
    );
  }

  return (
    <CardShell promoted={promoted}>
      {copy}
    </CardShell>
  );
}

/**
 * Module-level timestamp — set once when the JS module loads (not during
 * render), so it does not violate the react-hooks/purity impure-function rule.
 * Good enough for "how old is this session window" calculations.
 */
const moduleLoadTime = Date.now();

// ────────────────────────────────────────────────────────────────

function CardShell({
  children,
  promoted,
}: {
  children: React.ReactNode;
  promoted: boolean;
}) {
  const borderColor = promoted ? '#c1a36a' : '#e8dcc3';

  return (
    <Link href="/therapy" className="therapy-card">
      <span className="therapy-copy">{children}</span>
      <span className="therapy-arrow" aria-hidden="true">&#8594;</span>

      <style jsx>{`
        .therapy-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-radius: 8px;
          border: ${promoted ? '2px' : '1px'} solid ${borderColor};
          background: rgba(255, 255, 255, 0.55);
          text-decoration: none;
          color: #3a3530;
          transition: background 160ms ease, border-color 160ms ease;
          cursor: pointer;
        }
        .therapy-card:hover {
          background: rgba(255, 255, 255, 0.75);
        }
        .therapy-copy {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 13px;
          line-height: 1.4;
          letter-spacing: 0.01em;
          color: #3a3530;
          flex: 1;
        }
        .therapy-arrow {
          font-family: -apple-system, sans-serif;
          color: #8a7b5f;
          margin-left: 12px;
          transition: transform 160ms ease;
        }
        .therapy-card:hover .therapy-arrow {
          transform: translateX(2px);
        }
      `}</style>
    </Link>
  );
}
