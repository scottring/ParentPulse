'use client';

import Link from 'next/link';
import { ArrowRight, Feather, Users, Sparkles, BookOpen } from 'lucide-react';
import type { SurfaceNext } from '@/hooks/useSurfaceNext';

interface NextThingCardProps {
  next: NonNullable<SurfaceNext>;
}

interface CardCopy {
  icon: typeof Feather;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
}

function copyFor(next: NonNullable<SurfaceNext>): CardCopy {
  switch (next.kind) {
    case 'finish-self-onboard':
      return {
        icon: Feather,
        eyebrow: 'Start here',
        headline: 'Your manual starts with you',
        body:
          'Answer a handful of questions so everyone else has something to respond to.',
        cta: 'Begin self-onboard',
      };
    case 'resume-draft':
      return {
        icon: Feather,
        eyebrow: 'Unfinished',
        headline: `Resume your draft about ${next.subjectName}`,
        body: 'Pick up where you left off.',
        cta: 'Continue',
      };
    case 'contribute-about':
      return {
        icon: Users,
        eyebrow: 'Add a perspective',
        headline: `Contribute to ${next.person.name}'s manual`,
        body:
          'Your observations round out the picture — the magic is in the synthesis.',
        cta: 'Start',
      };
    case 'fresh-synthesis':
      return {
        icon: Sparkles,
        eyebrow: 'New synthesis',
        headline: `${next.manual.personName}'s manual has a fresh read`,
        body:
          next.manual.synthesizedContent?.overview?.slice(0, 180) ||
          'New patterns surfaced. Take a look.',
        cta: 'See what\'s new',
      };
  }
}

export function NextThingCard({ next }: NextThingCardProps) {
  const { icon: Icon, eyebrow, headline, body, cta } = copyFor(next);

  return (
    <article className="next-card">
      <div className="icon-wrap" aria-hidden="true">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="headline">{headline}</h2>
      <p className="body">{body}</p>
      <Link href={next.href} className="cta">
        <span>{cta}</span>
        <ArrowRight size={14} strokeWidth={1.5} />
      </Link>
      {/* Quiet secondary affordance — always offer the journal */}
      <Link href="/journal" className="secondary">
        <BookOpen size={12} strokeWidth={1.5} />
        <span>Or open the journal</span>
      </Link>

      <style jsx>{`
        .next-card {
          max-width: 560px;
          width: 100%;
          margin: 24px auto 0;
          padding: 28px 32px 22px;
          background: rgba(255, 250, 240, 0.85);
          border: 1px solid rgba(138, 111, 74, 0.25);
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(30, 20, 10, 0.08);
          text-align: left;
          position: relative;
        }
        .icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(138, 106, 154, 0.14);
          color: #6a4a8a;
          margin-bottom: 12px;
        }
        .eyebrow {
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 9px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a6f4a;
          margin: 0 0 6px;
        }
        .headline {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          line-height: 1.3;
          color: #2a1f14;
          margin: 0 0 10px;
        }
        .body {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.55;
          color: #5a4628;
          margin: 0 0 18px;
        }
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #2a1f14;
          color: #f5ecd8;
          padding: 10px 20px;
          border-radius: 20px;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
          transition: background 140ms ease, transform 140ms ease;
        }
        .cta:hover {
          background: #1a120a;
          transform: translateY(-1px);
        }
        .secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: 14px;
          color: #8a6f4a;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
          transition: color 140ms ease;
        }
        .secondary:hover {
          color: #5a4628;
        }
      `}</style>
    </article>
  );
}
