'use client';

import Link from 'next/link';
import type { Person } from '@/types/person-manual';

type CTAVariant = 'self' | 'add-person' | 'contribute';

interface StageCTAHeroProps {
  variant: CTAVariant;
  targetPerson?: Person | null;
  selfPersonId?: string | null;
}

interface VariantConfig {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

export function StageCTAHero({ variant, targetPerson, selfPersonId }: StageCTAHeroProps) {
  const configs: Record<CTAVariant, VariantConfig> = {
    self: {
      eyebrow: 'Welcome to Relish',
      title: 'Start by telling us about yourself',
      body: 'Your manual begins with you. Answering a few questions about how you work, what you need, and what matters to you gives everyone in your family a foundation to build on.',
      ctaLabel: 'Begin your self-assessment',
      ctaHref: selfPersonId ? `/people/${selfPersonId}/manual/self-onboard` : '/people',
    },
    'add-person': {
      eyebrow: 'Nice work ✓',
      title: 'Now add someone you care about',
      body: 'The magic happens when more than one perspective is in the room. Add a person to your family and start building a picture together.',
      ctaLabel: 'Add a person',
      ctaHref: '/people',
    },
    contribute: {
      eyebrow: 'Building the picture',
      title: `Share your perspective on ${targetPerson?.name ?? 'them'}`,
      body: 'Your observations matter. What you notice about someone — how they work, what helps them, what doesn\'t — becomes part of a living portrait they\'ll actually use.',
      ctaLabel: 'Start contributing',
      ctaHref: targetPerson ? `/people/${targetPerson.personId}/manual/onboard` : '/people',
    },
  };

  const { eyebrow, title, body, ctaLabel, ctaHref } = configs[variant];

  return (
    <div className="stage-cta-hero">
      <div className="hero-inner">
        <span className="eyebrow">{eyebrow}</span>
        <div className="ornament" aria-hidden="true">❦</div>
        <h2 className="title">{title}</h2>
        <p className="body">{body}</p>
        <Link href={ctaHref} className="cta-btn">
          {ctaLabel} →
        </Link>
      </div>

      <style jsx>{`
        .stage-cta-hero {
          height: 100%;
          min-height: 100%;
          background: linear-gradient(160deg, #3a3530 0%, #4a4540 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 40px;
        }
        .hero-inner {
          max-width: 420px;
        }
        .eyebrow {
          display: block;
          font-family: var(--font-parent-body, sans-serif);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8baf8e;
          margin-bottom: 20px;
        }
        .ornament {
          font-family: var(--font-cormorant, serif);
          font-size: 22px;
          color: #6b8f71;
          line-height: 1;
          margin-bottom: 16px;
        }
        .title {
          font-family: var(--font-cormorant, serif);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(28px, 3.5vw, 42px);
          color: #f5f0e8;
          margin: 0 0 20px;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }
        .body {
          font-family: var(--font-parent-body, sans-serif);
          font-size: 15px;
          line-height: 1.65;
          color: #b5aa98;
          margin: 0 0 36px;
        }
        .cta-btn {
          display: inline-block;
          background: #6b8f71;
          color: #f5f0e8;
          font-family: var(--font-parent-body, sans-serif);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 100px;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .cta-btn:hover {
          background: #5a7d60;
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .stage-cta-hero {
            padding: 40px 24px;
            min-height: 360px;
          }
          .hero-inner {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
