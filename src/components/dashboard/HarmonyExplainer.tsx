'use client';

import { useState, useEffect, useCallback } from 'react';

interface HarmonyExplainerProps {
  onClose: () => void;
  /** Ref to the diagram container so we can position the overlay */
  diagramRef: React.RefObject<HTMLDivElement | null>;
}

const STEPS = [
  {
    title: 'Your Portrait',
    ringLabel: 'THE INNERMOST CIRCLE',
    description:
      'The center of the wheel is your overall relationship portrait — a blend of how you\'re doing across every role, seen from every angle.',
    // SVG mask: reveal center (r=70), dim the rest
    // Radii match ThreeRingDiagram: center=70, middle=120, outer=175
    reveal: { cx: 300, cy: 200, innerR: 0, outerR: 70 },
  },
  {
    title: 'Three Domains',
    ringLabel: 'THE MIDDLE RING',
    description:
      'The middle ring breaks your portrait into three domains — how you\'re doing as an individual, as a partner, and as a parent.',
    reveal: { cx: 300, cy: 200, innerR: 70, outerR: 120 },
    details: [
      { label: 'Self', desc: 'You as an individual' },
      { label: 'Couple', desc: 'You as a partner' },
      { label: 'Parent', desc: 'You as a parent' },
    ],
  },
  {
    title: 'Three Perspectives',
    ringLabel: 'THE OUTER RING',
    description:
      'Each domain is shaped by up to three viewpoints. The magic is in seeing where these perspectives align — and where they differ.',
    reveal: { cx: 300, cy: 200, innerR: 120, outerR: 175 },
    details: [
      { label: 'Your own', desc: 'How you see yourself in that role' },
      { label: 'Your spouse\'s', desc: 'How your partner sees you' },
      { label: 'Your kids\'', desc: 'How your children experience you' },
    ],
  },
];

export default function HarmonyExplainer({ onClose, diagramRef }: HarmonyExplainerProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  }, [step, onClose]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrev, onClose]);

  // Scroll diagram into view
  useEffect(() => {
    diagramRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [diagramRef]);

  const { reveal } = current;

  return (
    <>
      {/* Full-page dimming backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* SVG overlay on the diagram — matches the diagram's viewBox exactly */}
      <div
        className="absolute inset-0 z-50 pointer-events-none"
        style={{ overflow: 'hidden' }}
      >
        <svg
          viewBox="0 0 600 400"
          className="w-full h-auto"
          style={{ maxHeight: '56vh' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Mask: white = visible, black = hidden */}
            <mask id="ring-spotlight">
              {/* Start with everything dimmed */}
              <rect x="0" y="0" width="600" height="400" fill="white" fillOpacity="0.15" />
              {/* Cut out the highlighted ring area by drawing it bright */}
              {reveal.innerR > 0 ? (
                <>
                  {/* Donut: bright outer, dark inner */}
                  <circle cx={reveal.cx} cy={reveal.cy} r={reveal.outerR} fill="white" />
                  <circle cx={reveal.cx} cy={reveal.cy} r={reveal.innerR} fill="black" fillOpacity="0.85" />
                </>
              ) : (
                <circle cx={reveal.cx} cy={reveal.cy} r={reveal.outerR} fill="white" />
              )}
            </mask>
          </defs>
          {/* Apply the mask as a full overlay */}
          <rect x="0" y="0" width="600" height="400" fill="transparent" mask="url(#ring-spotlight)" />

          {/* Animated ring highlight border */}
          {reveal.innerR > 0 ? (
            <>
              <circle
                cx={reveal.cx} cy={reveal.cy} r={reveal.outerR}
                fill="none" stroke="#d97706" strokeWidth="2.5" opacity="0.8"
              />
              <circle
                cx={reveal.cx} cy={reveal.cy} r={reveal.innerR}
                fill="none" stroke="#d97706" strokeWidth="2.5" opacity="0.8"
              />
            </>
          ) : (
            <circle
              cx={reveal.cx} cy={reveal.cy} r={reveal.outerR}
              fill="none" stroke="#d97706" strokeWidth="3" opacity="0.9"
            >
              <animate attributeName="r" values={`${reveal.outerR - 2};${reveal.outerR + 2};${reveal.outerR - 2}`} dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </div>

      {/* Explanation card — positioned below the diagram */}
      <div className="absolute left-0 right-0 z-50 px-4" style={{ bottom: '-16px', transform: 'translateY(100%)' }}>
        <div
          className="max-w-lg mx-auto rounded-xl p-5 pointer-events-auto"
          style={{
            background: '#FFFFFF',
            border: '2px solid #2C2C2C',
            boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Step dots */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '24px' : '8px',
                    background: i === step ? '#d97706' : i < step ? '#2C2C2C' : '#E8E3DC',
                  }}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="font-mono text-[10px] tracking-wider"
              style={{ color: '#A3A3A3' }}
            >
              SKIP
            </button>
          </div>

          {/* Ring label */}
          <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#d97706' }}>
            {current.ringLabel}
          </span>

          {/* Title */}
          <h3 className="font-mono text-lg font-bold mt-1 mb-2" style={{ color: '#2C2C2C' }}>
            {current.title}
          </h3>

          {/* Description */}
          <p className="font-mono text-[12px] leading-relaxed" style={{ color: '#6B6B6B' }}>
            {current.description}
          </p>

          {/* Detail chips */}
          {current.details && (
            <div className={`mt-3 ${current.details.length === 3 && current.details[0].label.length < 10 ? 'flex gap-2' : 'space-y-1.5'}`}>
              {current.details.map((d) => (
                <div
                  key={d.label}
                  className={`rounded-lg px-3 py-2 ${current.details!.length === 3 && current.details![0].label.length < 10 ? 'flex-1 text-center' : 'flex items-center gap-3'}`}
                  style={{ background: '#FAF8F5', border: '1px solid #E8E3DC' }}
                >
                  <span className="font-mono text-[11px] font-bold" style={{ color: '#2C2C2C', minWidth: current.details!.length === 3 && current.details![0].label.length < 10 ? undefined : '100px' }}>
                    {d.label}
                  </span>
                  {current.details!.length === 3 && current.details![0].label.length < 10 ? (
                    <span className="font-mono text-[9px] block mt-0.5" style={{ color: '#A3A3A3' }}>{d.desc}</span>
                  ) : (
                    <span className="font-mono text-[10px]" style={{ color: '#6B6B6B' }}>{d.desc}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="font-mono text-[11px] font-bold px-4 py-2 rounded transition-all disabled:opacity-0"
              style={{ color: '#6B6B6B', border: '1px solid #E8E3DC' }}
            >
              &larr; BACK
            </button>
            <button
              onClick={handleNext}
              className="font-mono text-[11px] font-bold px-5 py-2 rounded transition-all hover:scale-105"
              style={{ background: '#2C2C2C', color: '#FFFFFF' }}
            >
              {step < STEPS.length - 1 ? 'NEXT \u2192' : 'GOT IT'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
