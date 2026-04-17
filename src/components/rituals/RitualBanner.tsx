'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useSpouse } from '@/hooks/useSpouse';
import { ritualBannerState, type RitualBannerState } from '@/lib/rituals/isInWindow';

const DISMISS_KEY = 'relish.ritualBanner.dismissed';
const BANNER_HEIGHT_PX = 48;

/**
 * Dismissals are scoped by (ritualId, state, local date). That way:
 * - Dismissing today's pre-window reminder doesn't suppress tomorrow's.
 * - Dismissing the pre-window reminder doesn't suppress the in-window CTA
 *   that arrives when the ritual is actually starting.
 */
interface DismissKey {
  ritualId: string;
  state: RitualBannerState;
  date: string; // YYYY-MM-DD local
}

function sameDismissal(a: DismissKey, b: DismissKey): boolean {
  return a.ritualId === b.ritualId && a.state === b.state && a.date === b.date;
}

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RitualBanner() {
  const { ritual, loading } = useCoupleRitual();
  const { spouseName } = useSpouse();
  const [now, setNow] = useState<Date>(() => new Date());
  const [dismissed, setDismissed] = useState<DismissKey | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {
      // localStorage unavailable or corrupt — banner shows
    }
  }, []);

  // Determine whether the banner is going to render something.
  const state = ritual && !loading ? ritualBannerState(ritual, now) : 'hidden';
  const currentKey: DismissKey | null = ritual
    ? { ritualId: ritual.id, state, date: todayLocalDate() }
    : null;
  const showBanner =
    !!ritual &&
    !loading &&
    state !== 'hidden' &&
    !(dismissed && currentKey && sameDismissal(dismissed, currentKey));

  // The banner lives at viewport top:0 so its height is predictable across
  // every page layout (some pages render their own fixed top-bar instead
  // of the shared <Navigation/>). All fixed top-bars downstream read
  // --relish-top-offset for their own `top`, and body padding-top reads
  // the same value to push in-flow page content below the banner.
  useEffect(() => {
    const root = document.documentElement;
    if (showBanner) {
      root.style.setProperty('--relish-top-offset', `${BANNER_HEIGHT_PX}px`);
    } else {
      root.style.removeProperty('--relish-top-offset');
    }
    return () => {
      root.style.removeProperty('--relish-top-offset');
    };
  }, [showBanner]);

  if (!showBanner || !ritual || !currentKey) return null;

  function handleDismiss() {
    setDismissed(currentKey);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(currentKey));
    } catch {
      // non-fatal
    }
  }

  const partner = spouseName ?? 'your partner';
  const timeLabel = formatTime(ritual.startTimeLocal);
  const isInWindow = state === 'inWindow';

  return (
    <div
      className={`ritual-banner ${isInWindow ? 'in-window' : 'pre-window'}`}
      role="status"
    >
      {isInWindow ? (
        <Link href="/rituals/couple/session" className="ritual-banner-message">
          Your check-in with {partner} is starting.
          <span className="ritual-banner-cta">Start together &rarr;</span>
        </Link>
      ) : (
        <span className="ritual-banner-message">
          Your check-in with {partner} is tonight at {timeLabel}.
        </span>
      )}
      <button
        type="button"
        className="ritual-banner-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        &times;
      </button>
      <style jsx>{`
        .ritual-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: ${BANNER_HEIGHT_PX}px;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 0 52px 0 20px;
          border-bottom: 1px solid rgba(120, 100, 70, 0.12);
          font-family: var(--font-parent-body);
          font-size: 14px;
          box-shadow: 0 2px 12px rgba(20, 16, 12, 0.06);
        }
        .ritual-banner.pre-window {
          background: #F3F1EC;
          color: #5C5347;
        }
        .ritual-banner.in-window {
          background: #7C9082;
          color: #FAF8F3;
          font-weight: 500;
        }
        :global(.ritual-banner-message) {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: center;
          gap: 10px;
          color: inherit;
          text-decoration: none;
          text-align: center;
          line-height: 1.4;
          cursor: inherit;
        }
        :global(a.ritual-banner-message) {
          cursor: pointer;
        }
        :global(a.ritual-banner-message:hover) {
          opacity: 0.92;
        }
        :global(.ritual-banner-cta) {
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .ritual-banner-dismiss {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: inherit;
          opacity: 0.55;
          font-size: 22px;
          line-height: 1;
          padding: 4px 10px;
          cursor: pointer;
          border-radius: 4px;
          transition: opacity 0.15s ease, background 0.15s ease;
        }
        .ritual-banner-dismiss:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.06);
        }
        .ritual-banner.in-window .ritual-banner-dismiss:hover {
          background: rgba(255, 255, 255, 0.14);
        }
      `}</style>
    </div>
  );
}

function formatTime(hm: string): string {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
