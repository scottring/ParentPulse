'use client';

import { SynthesizedInsight, CrossReference } from '@/types/person-manual';
import Link from 'next/link';

interface Props {
  alignments: SynthesizedInsight[];
  gaps: SynthesizedInsight[];
  blindSpots: SynthesizedInsight[];
  crossReferences?: CrossReference[];
}

const SECTION_STYLES = {
  alignment: { bg: 'rgba(22,163,74,0.05)', border: 'rgba(22,163,74,0.15)', label: 'Aligned', color: '#166534' },
  gap: { bg: 'rgba(217,119,6,0.05)', border: 'rgba(217,119,6,0.15)', label: 'Gap', color: '#92400e' },
  blindSpot: { bg: 'rgba(124,58,237,0.05)', border: 'rgba(124,58,237,0.15)', label: 'Blind spot', color: '#5b21b6' },
} as const;

function InsightCard({ insight, variant }: { insight: SynthesizedInsight; variant: keyof typeof SECTION_STYLES }) {
  const style = SECTION_STYLES[variant];
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: `${style.border}`, color: style.color }}
        >
          {style.label}
        </span>
        {insight.gapSeverity === 'significant_gap' && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(220,38,38,0.1)', color: '#991b1b' }}
          >
            Significant
          </span>
        )}
      </div>
      <h4
        style={{
          fontFamily: 'var(--font-parent-body)',
          fontSize: '15px',
          fontWeight: 600,
          color: '#3A3530',
          marginBottom: '4px',
        }}
      >
        {insight.topic}
      </h4>
      <p
        style={{
          fontFamily: 'var(--font-parent-body)',
          fontSize: '14px',
          color: '#5C5347',
          lineHeight: 1.6,
        }}
      >
        {insight.synthesis}
      </p>
      {(insight.selfPerspective || insight.observerPerspective) && (
        <div className="mt-3 space-y-1.5">
          {insight.selfPerspective && (
            <div className="text-[11px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}>
              <span className="font-medium">Self:</span> {insight.selfPerspective}
            </div>
          )}
          {insight.observerPerspective && (
            <div className="text-[11px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}>
              <span className="font-medium">Observer:</span> {insight.observerPerspective}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SynthesisCards({ alignments, gaps, blindSpots, crossReferences }: Props) {
  const hasContent = alignments.length > 0 || gaps.length > 0 || blindSpots.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-6">
      {/* Alignments */}
      {alignments.length > 0 && (
        <Section title="Alignments" subtitle="Where perspectives agree" count={alignments.length}>
          {alignments.map((a) => <InsightCard key={a.id} insight={a} variant="alignment" />)}
        </Section>
      )}

      {/* Gaps */}
      {gaps.length > 0 && (
        <Section title="Gaps" subtitle="Where perspectives diverge" count={gaps.length}>
          {gaps.map((g) => <InsightCard key={g.id} insight={g} variant="gap" />)}
        </Section>
      )}

      {/* Blind Spots */}
      {blindSpots.length > 0 && (
        <Section title="Blind Spots" subtitle="Only one side sees this" count={blindSpots.length}>
          {blindSpots.map((b) => <InsightCard key={b.id} insight={b} variant="blindSpot" />)}
        </Section>
      )}

      {/* Cross References */}
      {crossReferences && crossReferences.length > 0 && (
        <Section title="Family Connections" subtitle="Patterns across relationships" count={crossReferences.length}>
          {crossReferences.map((cr, i) => (
            <div
              key={i}
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: 'rgba(45,95,93,0.04)',
                border: '1px solid rgba(45,95,93,0.12)',
              }}
            >
              <span className="text-base flex-shrink-0">
                {cr.connectionType === 'tension' ? '\u26A1' : cr.connectionType === 'impact' ? '\u{1F4A1}' : cr.connectionType === 'shared_pattern' ? '\u{1F504}' : '\u2764'}
              </span>
              <div>
                <Link
                  href={`/people/${cr.relatedPersonId}/manual`}
                  className="text-[12px] font-medium hover:underline"
                  style={{ fontFamily: 'var(--font-parent-body)', color: '#2D5F5D' }}
                >
                  {cr.relatedPersonName}
                </Link>
                <p
                  className="mt-0.5 text-[12px]"
                  style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347', lineHeight: 1.5 }}
                >
                  {cr.insight}
                </p>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, count, children }: { title: string; subtitle: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: '16px',
            fontWeight: 500,
            color: '#3A3530',
          }}
        >
          {title}
        </h3>
        <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: '#5F564B' }}>
          {count}
        </span>
      </div>
      <p
        className="mb-3"
        style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5F564B' }}
      >
        {subtitle}
      </p>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}
