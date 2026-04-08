'use client';

import Link from 'next/link';
import type { OneThing, OneThingType } from '@/lib/one-thing-engine';

interface OneThingCardProps {
  thing: OneThing;
  onAnalyze?: () => void;
  analyzing?: boolean;
}

/**
 * OneThingCard — styled as a leather-bound book hero element.
 * Shows the most important action in a rich, illustrated book motif.
 */
export function OneThingCard({ thing, onAnalyze, analyzing }: OneThingCardProps) {
  const style = typeStyles[thing.type];
  const isCalm = thing.type === 'nothing';
  const isAnalyzeAction = thing.actionLabel === 'Analyze';

  return (
    <div className="leather-book-hero">
      {/* Book base / stand */}
      <div className="leather-book-base" aria-hidden="true" />

      {/* The open book */}
      <div className="leather-book-body">
        {/* Decorative tree illustration on left page */}
        <div className="leather-book-illustration" aria-hidden="true">
          <svg viewBox="0 0 120 140" width="120" height="140">
            <defs>
              <radialGradient id="treeFoliage" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#E8A0B8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#D4829A" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#C06878" stopOpacity="0.2" />
              </radialGradient>
              <linearGradient id="treeTrunk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B6F4E" />
                <stop offset="100%" stopColor="#6B4F3E" />
              </linearGradient>
            </defs>
            {/* Trunk with branches */}
            <path d="M58,135 L58,80 Q55,70 45,60 M62,135 L62,80 Q65,70 75,60 M60,90 Q50,85 40,75 M60,95 Q70,90 80,80" stroke="url(#treeTrunk)" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Foliage blobs — watercolor cherry blossom style */}
            <circle cx="45" cy="50" r="18" fill="url(#treeFoliage)" />
            <circle cx="70" cy="45" r="20" fill="url(#treeFoliage)" />
            <circle cx="55" cy="35" r="16" fill="url(#treeFoliage)" />
            <circle cx="40" cy="65" r="14" fill="url(#treeFoliage)" opacity="0.5" />
            <circle cx="75" cy="60" r="15" fill="url(#treeFoliage)" opacity="0.5" />
            <circle cx="60" cy="25" r="14" fill="url(#treeFoliage)" opacity="0.7" />
            {/* Petal scatter */}
            {[
              [30, 80], [85, 75], [25, 45], [90, 40], [50, 15], [35, 30], [78, 30],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2 + (i % 2)} fill="#E8A0B8" opacity={0.3 + (i % 3) * 0.1} />
            ))}
            {/* Ground shadow */}
            <ellipse cx="60" cy="137" rx="25" ry="3" fill="#8B6F4E" opacity="0.1" />
          </svg>
        </div>

        {/* Text on right page */}
        <div className="leather-book-text">
          <p className="leather-book-calligraphy">
            {isCalm
              ? 'Everything\u2019s steady.\nOpen and read.'
              : thing.title
            }
          </p>
          {!isCalm && (
            <p className="leather-book-subtitle">
              {thing.description}
            </p>
          )}
        </div>

        {/* Brass corner decorations */}
        <div className="leather-book-corner leather-book-corner-tl" aria-hidden="true" />
        <div className="leather-book-corner leather-book-corner-tr" aria-hidden="true" />
        <div className="leather-book-corner leather-book-corner-bl" aria-hidden="true" />
        <div className="leather-book-corner leather-book-corner-br" aria-hidden="true" />
      </div>

      {/* Wax seal CTA button */}
      {isAnalyzeAction && onAnalyze ? (
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="wax-seal-button"
          style={{ '--seal-color': style.accent } as React.CSSProperties}
        >
          <span className="wax-seal-inner">
            {analyzing ? '...' : thing.actionLabel}
          </span>
        </button>
      ) : (
        <Link
          href={thing.actionRoute}
          className="wax-seal-button"
          style={{ '--seal-color': isCalm ? '#8B7B6B' : style.accent } as React.CSSProperties}
        >
          <span className="wax-seal-inner">
            {thing.actionLabel}
          </span>
        </Link>
      )}
    </div>
  );
}

const typeStyles: Record<OneThingType, { label: string; accent: string }> = {
  unfinished: { label: 'Continue', accent: '#9B4B3A' },
  time_sensitive: { label: 'Urgent', accent: '#8B6B2A' },
  new_from_others: { label: 'New', accent: '#6B5B8B' },
  synthesis_ready: { label: 'Review', accent: '#4B7B5B' },
  growth_step: { label: 'Practice', accent: '#5B7B6B' },
  gap: { label: 'Explore', accent: '#8B7B5B' },
  nothing: { label: 'Browse', accent: '#7B7B7B' },
};
