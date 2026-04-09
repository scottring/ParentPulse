'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWeeklyActivities } from '@/hooks/useWeeklyActivities';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface WeeklyActivitySectionProps {
  textColor: string;
  textSecondary: string;
  textTertiary: string;
}

export function WeeklyActivitySection({ textColor, textSecondary, textTertiary }: WeeklyActivitySectionProps) {
  const { weeklyByPerson, totalCompleted, totalPending, loading } = useWeeklyActivities();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const total = totalCompleted + totalPending;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generateBatch = httpsCallable(functions, 'generateGrowthBatch');
      await generateBatch({});
    } catch (err) {
      console.error('Failed to generate activities:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return null;

  // Get current week label
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: textTertiary,
          }}
        >
          This Week
        </span>
        <span
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '15px',
            color: textTertiary,
          }}
        >
          {weekLabel}
        </span>
      </div>

      {total === 0 ? (
        <div className="glass-card p-6 text-center">
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: textSecondary }} className="mb-3">
            No activities scheduled this week.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2 rounded-full text-white disabled:opacity-50 transition-all hover:shadow-lg"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', fontWeight: 500, backgroundColor: '#7C9082' }}
          >
            {generating ? 'Generating...' : 'Generate this week\'s activities'}
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Summary bar */}
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: textColor }}>
              {totalCompleted} of {total} done
            </span>
            {/* Progress dots */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: i < totalCompleted ? '#7C9082' : 'rgba(138,128,120,0.25)' }}
                />
              ))}
            </div>
          </div>

          {/* Per-person rows */}
          {Array.from(weeklyByPerson.entries()).map(([personId, data]) => {
            const isExpanded = expanded === personId;
            const personTotal = data.completed.length + data.pending.length;
            return (
              <div key={personId} style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : personId)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', fontWeight: 500, color: textColor }}>
                      {data.personName}
                    </span>
                    <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: textTertiary }}>
                      {data.completed.length}/{personTotal}
                    </span>
                  </div>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={textTertiary} strokeWidth="2"
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 space-y-2">
                    {data.completed.map((item) => (
                      <div key={item.growthItemId} className="flex items-start gap-2.5">
                        <span style={{ color: '#7C9082', fontSize: '14px', marginTop: '1px' }}>&#10003;</span>
                        <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: textSecondary, textDecoration: 'line-through', opacity: 0.6 }}>
                          {item.emoji} {item.title}
                        </span>
                      </div>
                    ))}
                    {data.pending.map((item) => (
                      <Link
                        key={item.growthItemId}
                        href={`/growth/${item.growthItemId}`}
                        className="flex items-start gap-2.5 group hover:opacity-80 transition-opacity"
                      >
                        <span style={{ color: textTertiary, fontSize: '14px', marginTop: '1px' }}>&#9675;</span>
                        <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '15px', color: textColor }}>
                          {item.emoji} {item.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
