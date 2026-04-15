'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import type { PersonManual } from '@/types/person-manual';

interface SynthesisHighlightCardProps {
  manual: PersonManual;
}

/**
 * A pull-quote-style card surfacing the freshest synthesis overview
 * for someone in the family. Sits below the hero as a secondary
 * card — "here's what the app is seeing right now."
 */
export function SynthesisHighlightCard({ manual }: SynthesisHighlightCardProps) {
  const overview = manual.synthesizedContent?.overview?.trim() ?? '';
  if (!overview) return null;

  const initial = manual.personName.charAt(0).toUpperCase();

  return (
    <article className="synth-card">
      <header className="head">
        <span className="avatar" aria-hidden="true">{initial}</span>
        <div className="head-text">
          <p className="kicker">
            <Compass size={11} strokeWidth={1.5} />
            <span>Synthesis · about {manual.personName}</span>
          </p>
        </div>
      </header>
      <p className="pull">{overview}</p>
      <Link href={`/people/${manual.personId}/manual`} className="go">
        Read more →
      </Link>

      <style jsx>{`
        .synth-card {
          max-width: 560px;
          width: 100%;
          margin: 18px auto 0;
          padding: 22px 28px 18px;
          background: rgba(255, 250, 240, 0.55);
          border-left: 3px solid #8a6a9a;
          border-radius: 0 6px 6px 0;
          text-align: left;
          position: relative;
        }
        .head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #d4b483;
          color: #2a1f14;
          font-family: -apple-system, sans-serif;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #f5ecd8;
        }
        .kicker {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6a9a;
          font-weight: 700;
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pull {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 17px;
          line-height: 1.5;
          color: #3d2f1f;
          margin: 0 0 12px;
        }
        .go {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a6a9a;
          text-decoration: none;
          transition: color 140ms ease;
        }
        .go:hover {
          color: #5d407d;
        }
      `}</style>
    </article>
  );
}
