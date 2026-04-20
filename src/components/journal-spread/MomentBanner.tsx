'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { Moment } from '@/types/moment';

interface MomentBannerProps {
  momentId: string;
}

function otherViewsLabel(count: number): string {
  const others = Math.max(0, count - 1);
  if (others === 0) return 'no other views yet';
  if (others === 1) return 'one other view';
  if (others === 2) return 'two other views';
  return `${others} other views`;
}

/**
 * Slim banner above an entry that announces the entry is one view of
 * a moment and links to the moment detail page. Subscribes to the
 * moment doc so the other-view count stays live if a partner attaches
 * a view while this page is open.
 */
export function MomentBanner({ momentId }: MomentBannerProps) {
  const [moment, setMoment] = useState<Moment | null>(null);

  useEffect(() => {
    const ref = doc(firestore, 'moments', momentId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setMoment(null);
          return;
        }
        setMoment({
          ...(snap.data() as Omit<Moment, 'momentId'>),
          momentId: snap.id,
        });
      },
      (err) => {
        // Swallow listener errors — the banner degrades to nothing.
        console.warn('MomentBanner: listener error', err);
      },
    );
    return () => unsub();
  }, [momentId]);

  if (!moment) return null;

  return (
    <p className="moment-banner">
      <em>this is one view of a moment</em>
      <span className="sep" aria-hidden="true"> · </span>
      <span className="count">{otherViewsLabel(moment.viewCount ?? 1)}</span>
      <span className="sep" aria-hidden="true"> · </span>
      <Link href={`/moments/${moment.momentId}`} className="link">open moment</Link>

      <style jsx>{`
        .moment-banner {
          margin: 0 0 18px 0;
          padding: 10px 14px;
          background: #f2ebdc;
          border-left: 2px solid #a89373;
          font-family: Georgia, serif;
          font-size: 13px;
          color: #6b5d45;
          line-height: 1.5;
        }
        .moment-banner em {
          font-style: italic;
          color: #3d3a34;
        }
        .sep {
          opacity: 0.55;
        }
        .count {
          font-style: normal;
        }
        .moment-banner :global(.link) {
          font-style: italic;
          color: #2d2418;
          text-decoration: underline;
        }
      `}</style>
    </p>
  );
}
