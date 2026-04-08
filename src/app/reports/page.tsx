'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import { useFreshness } from '@/hooks/useFreshness';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import { PeriodSelector, ReportPeriod } from '@/components/reports/PeriodSelector';
import { PersonStatusCard } from '@/components/reports/PersonStatusCard';
import { TherapistReportPreview, TherapistReportData } from '@/components/reports/TherapistReportPreview';
import { scoreToClimate } from '@/lib/climate-engine';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { state, people, manuals, assessments, contributions, roles } = useDashboard();
  const { health } = useRingScores(assessments);
  const { familyCompleteness } = useFreshness({ people, manuals, contributions });

  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [therapistReport, setTherapistReport] = useState<TherapistReportData | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const climate = health ? scoreToClimate(health.score, health.trend) : null;

  const manualMap = useMemo(
    () => new Map(manuals.map((m) => [m.personId, m])),
    [manuals],
  );

  const activePeople = useMemo(
    () => people.filter((p) => !p.archived),
    [people],
  );

  // Cross-family patterns
  const crossPatterns = useMemo(() => {
    const patterns: Array<{ insight: string; people: string[] }> = [];
    for (const manual of manuals) {
      const refs = manual.synthesizedContent?.crossReferences ?? [];
      for (const ref of refs) {
        patterns.push({
          insight: ref.insight,
          people: [manual.personName, ref.relatedPersonName],
        });
      }
    }
    // Deduplicate by insight text
    const seen = new Set<string>();
    return patterns.filter((p) => {
      if (seen.has(p.insight)) return false;
      seen.add(p.insight);
      return true;
    });
  }, [manuals]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const generateTherapistReport = httpsCallable(functions, 'generateTherapistReport');
      const result = await generateTherapistReport({ period });
      setTherapistReport(result.data as TherapistReportData);
    } catch (err) {
      console.error('Failed to generate therapist report:', err);
      // Fallback: generate a basic report client-side
      const now = new Date();
      const periodLabel = period === '2weeks' ? 'Last 2 weeks' : period === 'month' ? 'Last 30 days' : 'Last 90 days';
      setTherapistReport({
        period: periodLabel,
        generatedAt: now.toLocaleDateString(),
        familyOverview: `Family of ${activePeople.length} members. Overall health score: ${health?.score?.toFixed(1) ?? 'N/A'}/5.0. Climate: ${climate?.state ?? 'unknown'}.`,
        patternsOfNote: manuals
          .flatMap((m) => m.synthesizedContent?.gaps?.filter((g) => g.gapSeverity === 'significant_gap') ?? [])
          .slice(0, 5)
          .map((g) => `${g.topic}: ${g.synthesis}`),
        areasForDiscussion: manuals
          .flatMap((m) => m.synthesizedContent?.blindSpots ?? [])
          .slice(0, 3)
          .map((b) => `${b.topic}: ${b.synthesis}`),
        progressSummary: health?.trend === 'improving'
          ? 'Overall family health is trending positively.'
          : health?.trend === 'declining'
          ? 'Some areas show declining trends that may benefit from discussion.'
          : 'Family health is stable across most dimensions.',
        rawDataSummary: `${assessments.length} dimensions tracked across ${activePeople.length} family members. ${contributions.filter((c) => c.status === 'complete').length} completed contributions. Completeness: ${familyCompleteness.overallPercent}%.`,
      });
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || state === 'loading') {
    return (
      <>
        <Navigation />
        <SideNav />
        <div className="min-h-screen pt-[60px] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent border-gray-300" />
        </div>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navigation />
      <SideNav />

      <div className="min-h-screen pt-[60px] pb-20" style={{ background: '#FAF8F5' }}>
        <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8">

          {/* Header */}
          <h1
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#3A3530',
              lineHeight: 1.2,
            }}
          >
            Reports
          </h1>

          {/* Period selector */}
          <div className="mt-5 mb-6">
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>

          {/* Family overview card */}
          {health && (
            <div className="glass-card rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}
                  >
                    Family health
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: '28px',
                        fontWeight: 400,
                        color: '#3A3530',
                      }}
                    >
                      {health.score.toFixed(1)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#7C7468' }}>
                      / 5.0
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {climate && (
                    <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#5C5347' }}>
                      {climate.state.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span
                    className="block text-[11px] mt-0.5"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}
                  >
                    {health.trend === 'improving' ? '\u2197 Improving' : health.trend === 'declining' ? '\u2198 Declining' : health.trend === 'stable' ? '\u2192 Stable' : ''}
                  </span>
                  <span
                    className="block text-[11px]"
                    style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}
                  >
                    Completeness: {familyCompleteness.overallPercent}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Per-person cards */}
          <div className="space-y-2 mb-6">
            <span
              className="block mb-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'rgba(40,40,40,0.3)' }}
            >
              By person
            </span>
            {activePeople.map((person) => (
              <PersonStatusCard
                key={person.personId}
                person={person}
                manual={manualMap.get(person.personId)}
                assessments={assessments}
              />
            ))}
          </div>

          {/* Cross-family patterns */}
          {crossPatterns.length > 0 && (
            <div className="mb-6">
              <span
                className="block mb-2 text-[10px] font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'rgba(40,40,40,0.3)' }}
              >
                Cross-family patterns
              </span>
              <div className="space-y-2">
                {crossPatterns.slice(0, 5).map((cp, i) => (
                  <div
                    key={i}
                    className="glass-card rounded-xl p-4"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {cp.people.map((name) => (
                        <span
                          key={name}
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{
                            fontFamily: 'var(--font-parent-body)',
                            background: 'rgba(45,95,93,0.06)',
                            color: '#2D5F5D',
                            fontWeight: 500,
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                    <p className="text-[12px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347', lineHeight: 1.5 }}>
                      {cp.insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Therapist report CTA */}
          <div
            className="glass-card-strong rounded-xl p-6 text-center"
            style={{ border: '1px solid rgba(124,144,130,0.15)' }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '17px',
                fontWeight: 500,
                color: '#3A3530',
              }}
            >
              Therapist Report
            </h3>
            <p
              className="mt-1 mb-4"
              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#7C7468', lineHeight: 1.6 }}
            >
              Generate a clinical-tone summary to bring to your therapist. You can redact anything before sharing.
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="inline-flex items-center px-6 py-2.5 rounded-full text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40 transition-all"
              style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082' }}
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Therapist report modal */}
      {therapistReport && (
        <TherapistReportPreview
          report={therapistReport}
          onClose={() => setTherapistReport(null)}
        />
      )}
    </>
  );
}
