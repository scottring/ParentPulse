'use client';

import { useState } from 'react';
import { Contribution } from '@/types/person-manual';

interface Props {
  contributions: Contribution[];
}

/**
 * Tabbed panel showing raw contribution data organized by perspective.
 */
export function PerspectivePanel({ contributions }: Props) {
  const completed = contributions.filter((c) => c.status === 'complete');
  const [activeTab, setActiveTab] = useState(0);

  if (completed.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'rgba(0,0,0,0.02)',
          border: '1px dashed rgba(138,128,120,0.2)',
        }}
      >
        <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: '#5F564B' }}>
          No contributions yet. Invite someone to share their perspective.
        </p>
      </div>
    );
  }

  const current = completed[activeTab];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {completed.map((c, i) => (
          <button
            key={c.contributionId}
            onClick={() => setActiveTab(i)}
            className="text-[12px] px-3 py-1.5 rounded-full whitespace-nowrap transition-all"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontWeight: i === activeTab ? 600 : 400,
              background: i === activeTab ? '#7C9082' : 'rgba(0,0,0,0.03)',
              color: i === activeTab ? 'white' : '#5C5347',
              border: `1px solid ${i === activeTab ? '#7C9082' : 'rgba(138,128,120,0.12)'}`,
            }}
          >
            {c.perspectiveType === 'self' ? 'Self' : c.contributorName}
          </button>
        ))}
      </div>

      {/* Content */}
      {current && (
        <div className="space-y-3">
          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}>
            <span>{current.perspectiveType === 'self' ? 'Self-perspective' : `Observer (${current.relationshipToSubject})`}</span>
            <span>{current.updatedAt?.toDate?.()?.toLocaleDateString?.() ?? ''}</span>
          </div>

          {/* Answers */}
          {Object.entries(current.answers).map(([sectionKey, sectionAnswers]) => (
            <div key={sectionKey} className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.02)' }}>
              <h4
                className="mb-2"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#3A3530',
                  textTransform: 'capitalize',
                }}
              >
                {sectionKey.replace(/_/g, ' ')}
              </h4>
              <div className="space-y-2">
                {typeof sectionAnswers === 'object' && sectionAnswers !== null
                  ? Object.entries(sectionAnswers as Record<string, unknown>).map(([qKey, answer]) => (
                      <div key={qKey}>
                        <span
                          className="text-[10px] font-medium"
                          style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}
                        >
                          {qKey.replace(/_/g, ' ')}
                        </span>
                        <p
                          className="text-[12px] mt-0.5"
                          style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347', lineHeight: 1.5 }}
                        >
                          {typeof answer === 'string' ? answer
                            : typeof answer === 'number' ? String(answer)
                            : Array.isArray(answer) ? answer.join(', ')
                            : JSON.stringify(answer)}
                        </p>
                      </div>
                    ))
                  : (
                    <p className="text-[12px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347' }}>
                      {String(sectionAnswers)}
                    </p>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
