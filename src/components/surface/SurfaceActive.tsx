'use client';

import BackIssues from '@/components/magazine/BackIssues';
import TheLead from './TheLead';
import TheFamily from './TheFamily';
import RecentCaptures from './RecentCaptures';
import WhatTheManualSees from './WhatTheManualSees';
import SomethingToTry from './SomethingToTry';
import TheEcho from './TheEcho';
import DismissButton from './DismissButton';
import type { SurfaceSections } from '@/types/surface';

interface SurfaceActiveProps {
  sections: SurfaceSections;
  onDismiss?: (id: string) => void;
}

/**
 * The full active surface — all sections, conditionally rendered
 * based on data availability. Each section fades in as it appears.
 */
export default function SurfaceActive({ sections, onDismiss }: SurfaceActiveProps) {
  const {
    lead,
    recentCaptures,
    manualInsight,
    practiceToTry,
    familyPeople,
    echo,
  } = sections;

  return (
    <div className="surface-centered">
      <div className="surface-section surface-enter" style={{ animationDelay: '0ms' }}>
        <TheLead item={lead} />
        {lead.type !== 'calm' && onDismiss && (
          <div className="surface-dismiss">
            <DismissButton onClick={() => onDismiss(lead.id)} />
          </div>
        )}
      </div>

      {recentCaptures.length > 0 && (
        <div className="surface-section surface-enter" style={{ animationDelay: '80ms' }}>
          <RecentCaptures entries={recentCaptures} />
        </div>
      )}

      {manualInsight && (
        <div className="surface-section surface-enter" style={{ animationDelay: '160ms' }}>
          <WhatTheManualSees insight={manualInsight} />
          {onDismiss && (
            <div className="surface-dismiss">
              <DismissButton onClick={() => onDismiss(manualInsight.insight.id)} />
            </div>
          )}
        </div>
      )}

      {practiceToTry && (
        <div className="surface-section surface-enter" style={{ animationDelay: '240ms' }}>
          <SomethingToTry item={practiceToTry} />
          {onDismiss && (
            <div className="surface-dismiss">
              <DismissButton onClick={() => onDismiss(practiceToTry.growthItemId)} label="skip" />
            </div>
          )}
        </div>
      )}

      {familyPeople.length > 0 && (
        <div className="surface-section surface-enter" style={{ animationDelay: '320ms' }}>
          <TheFamily people={familyPeople} />
        </div>
      )}

      {echo && (
        <div className="surface-section surface-enter" style={{ animationDelay: '400ms' }}>
          <TheEcho echo={echo} />
          {onDismiss && (
            <div className="surface-dismiss">
              <DismissButton onClick={() => onDismiss(echo.entryId)} />
            </div>
          )}
        </div>
      )}

      <BackIssues line="The books are always open." />

      <style jsx>{`
        .surface-centered {
          text-align: center;
        }
        .surface-centered :global(.section-header) {
          text-align: center;
        }
        .surface-centered :global(.section-eyebrow) {
          text-align: center;
        }
        .surface-centered :global(.featured-title) {
          margin-left: auto;
          margin-right: auto;
        }
        .surface-centered :global(.featured-body) {
          margin-left: auto;
          margin-right: auto;
        }
        .surface-centered :global(.featured-cta-frame) {
          margin-left: auto;
          margin-right: auto;
        }
        .surface-centered :global(.featured-cta) {
          padding-left: 0;
          text-align: center;
        }
        .surface-section {
          will-change: opacity, transform;
          position: relative;
        }
        .surface-dismiss {
          display: flex;
          justify-content: center;
          margin-top: -4px;
        }
        .surface-enter {
          animation: surfaceFadeIn 0.5s ease both;
        }
        @keyframes surfaceFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
