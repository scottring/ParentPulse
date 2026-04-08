'use client';

import { ReactNode } from 'react';

interface BookSpreadProps {
  leftPage: ReactNode;
  rightPage: ReactNode;
  timeline?: ReactNode;
  greeting?: ReactNode;
  /** The hero book element shown on the right side of the greeting area */
  bookHero?: ReactNode;
}

export function BookSpread({ leftPage, rightPage, timeline, greeting, bookHero }: BookSpreadProps) {
  return (
    <div className="storybook-wrapper">
      {/* Watercolor sun decoration — top right */}
      <div className="storybook-sun" aria-hidden="true">
        <svg viewBox="0 0 160 160" width="160" height="160">
          <defs>
            <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5D478" stopOpacity="1" />
              <stop offset="40%" stopColor="#E8B84B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#D4973A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F5D478" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F5D478" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Outer glow */}
          <circle cx="80" cy="80" r="78" fill="url(#sunGlow)" />
          {/* Rays — watercolor style, irregular */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30) * Math.PI / 180;
            const innerR = 32 + (i % 3) * 4;
            const outerR = 52 + (i % 2) * 16;
            const width = 6 + (i % 3) * 3;
            const x1 = 80 + Math.cos(angle) * innerR;
            const y1 = 80 + Math.sin(angle) * innerR;
            const x2 = 80 + Math.cos(angle) * outerR;
            const y2 = 80 + Math.sin(angle) * outerR;
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#E8B84B"
                strokeWidth={width}
                strokeLinecap="round"
                opacity={0.35 + (i % 3) * 0.15}
              />
            );
          })}
          {/* Core */}
          <circle cx="80" cy="80" r="28" fill="url(#sunCore)" />
          {/* Highlight */}
          <ellipse cx="72" cy="72" rx="10" ry="8" fill="white" opacity="0.3" />
        </svg>
      </div>

      {/* Greeting area with book hero */}
      <div className="storybook-header">
        <div className="storybook-greeting">
          {greeting}
        </div>
        {bookHero && (
          <div className="storybook-book-hero">
            {bookHero}
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="storybook-content">
        {/* Left column: family info */}
        <div className="storybook-left">
          {leftPage}
        </div>

        {/* Right column: actions & perspectives */}
        <div className="storybook-right">
          {rightPage}
        </div>
      </div>

      {/* Timeline area */}
      {timeline && (
        <div className="storybook-timeline-area">
          {timeline}
        </div>
      )}

      {/* Watercolor skyline at bottom */}
      <div className="storybook-skyline" aria-hidden="true">
        <svg viewBox="0 0 1200 100" preserveAspectRatio="none" width="100%" height="100">
          <defs>
            <linearGradient id="skylineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B9E85" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#7C9082" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          {/* Buildings silhouette */}
          <path d="M0,80 L40,80 L40,50 L55,50 L55,35 L65,35 L65,50 L80,50 L80,65 L100,65 L100,40 L108,40 L108,30 L115,30 L115,40 L125,40 L125,65 L150,65 L150,55 L170,55 L170,70 L200,70 L200,45 L210,45 L210,25 L220,25 L220,45 L235,45 L235,70 L270,70 L270,60 L285,60 L285,45 L295,45 L295,70 L330,70 L330,80 L360,80 L360,60 L375,60 L375,40 L385,40 L385,60 L400,60 L400,80" fill="url(#skylineGrad)" />
          {/* Trees */}
          {[50, 140, 250, 340, 450, 550, 650, 750, 850, 950, 1050, 1150].map((x, i) => {
            const h = 20 + (i % 4) * 8;
            const w = 12 + (i % 3) * 6;
            const trunkH = 8 + (i % 2) * 4;
            const green = i % 3 === 0 ? '#8B9E85' : i % 3 === 1 ? '#7C9082' : '#6B8B74';
            return (
              <g key={i} transform={`translate(${x}, ${100 - trunkH})`}>
                {/* Trunk */}
                <rect x={w/2 - 1.5} y={-trunkH + trunkH} width={3} height={trunkH} fill="#A08060" opacity="0.2" />
                {/* Canopy — teardrop / triangular */}
                <ellipse cx={w/2} cy={-h/2} rx={w/2} ry={h/2} fill={green} opacity="0.18" />
              </g>
            );
          })}
          {/* Ground line */}
          <line x1="0" y1="95" x2="1200" y2="95" stroke="#A08060" strokeWidth="1" opacity="0.1" />
          {/* More buildings — right side */}
          <path d="M400,80 L430,80 L430,55 L445,55 L445,40 L455,40 L455,55 L470,55 L470,70 L500,70 L500,50 L515,50 L515,35 L525,35 L525,50 L540,50 L540,70 L580,70 L580,60 L600,60 L600,80 L650,80 L650,55 L665,55 L665,40 L675,40 L675,55 L690,55 L690,80 L720,80 L720,65 L740,65 L740,50 L750,50 L750,65 L770,65 L770,80 L820,80 L820,60 L835,60 L835,45 L845,45 L845,60 L860,60 L860,80 L900,80 L900,70 L920,70 L920,55 L930,55 L930,70 L950,70 L950,80 L1000,80 L1000,60 L1020,60 L1020,80 L1060,80 L1060,50 L1075,50 L1075,35 L1085,35 L1085,50 L1100,50 L1100,80 L1200,80 L1200,100 L0,100 Z" fill="url(#skylineGrad)" />
        </svg>
      </div>
    </div>
  );
}
