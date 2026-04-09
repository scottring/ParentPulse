'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import { useFreshness } from '@/hooks/useFreshness';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';
import { scoreToClimate } from '@/lib/climate-engine';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { TherapistReportPreview, TherapistReportData } from '@/components/reports/TherapistReportPreview';

// ================================================================
// Roman numeral helpers
// ================================================================
function toRoman(n: number): string {
  if (n < 1) return '';
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let num = n;
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

// ================================================================
// Synthetic archive builder — assembles past "reports" from what
// we have in Firestore so the index isn't empty. When the real
// generateTherapistReport cloud function gains a history endpoint,
// swap this for that data.
// ================================================================
interface ArchiveEntry {
  id: string;
  year: number;
  month: number;   // 0-indexed
  monthName: string;
  number: number;  // within the month
  title: string;
  dateLabel: string;
  route?: string;
}

function buildArchiveFromState(params: {
  manuals: Array<{ manualId: string; personName: string; synthesizedContent?: { lastSynthesizedAt?: { toDate?: () => Date } } }>;
}): ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];

  // Synthesis events become archive entries
  params.manuals.forEach((m) => {
    const ts = m.synthesizedContent?.lastSynthesizedAt?.toDate?.();
    if (!ts) return;
    entries.push({
      id: `synth-${m.manualId}`,
      year: ts.getFullYear(),
      month: ts.getMonth(),
      monthName: ts.toLocaleDateString('en-US', { month: 'long' }).toUpperCase(),
      number: 0, // renumbered below
      title: `Synthesis of ${m.personName}’s volume`,
      dateLabel: ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase(),
    });
  });

  // Sort reverse chronological
  entries.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Renumber within each month
  const byMonth = new Map<string, ArchiveEntry[]>();
  for (const e of entries) {
    const key = `${e.year}-${e.month}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(e);
  }
  byMonth.forEach((list) => {
    list.forEach((entry, idx) => {
      entry.number = list.length - idx;
    });
  });

  return entries;
}

// ================================================================
// Main page
// ================================================================
export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { state, people, manuals, assessments, contributions } = useDashboard();
  const { health } = useRingScores(assessments);
  const { familyCompleteness } = useFreshness({ people, manuals, contributions });

  const [therapistReport, setTherapistReport] = useState<TherapistReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const archive = useMemo(
    () => buildArchiveFromState({ manuals }),
    [manuals],
  );

  // Group archive by year, then by month
  const archiveByYear = useMemo(() => {
    const map = new Map<number, Map<string, ArchiveEntry[]>>();
    for (const e of archive) {
      if (!map.has(e.year)) map.set(e.year, new Map());
      const monthMap = map.get(e.year)!;
      if (!monthMap.has(e.monthName)) monthMap.set(e.monthName, []);
      monthMap.get(e.monthName)!.push(e);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries()),
      }));
  }, [archive]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const generateTherapistReport = httpsCallable(functions, 'generateTherapistReport');
      const result = await generateTherapistReport({ period: 'month' });
      setTherapistReport(result.data as TherapistReportData);
      setLastGenerated(new Date());
    } catch (err) {
      console.error('Failed to generate therapist report:', err);
      // Fallback client-side
      const now = new Date();
      const activePeople = people.filter((p) => !p.archived);
      const climate = health ? scoreToClimate(health.score, health.trend) : null;
      setTherapistReport({
        period: 'Last 30 days',
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
        progressSummary:
          health?.trend === 'improving'
            ? 'Overall family health is trending positively.'
            : health?.trend === 'declining'
            ? 'Some areas show declining trends that may benefit from discussion.'
            : 'Family health is stable across most dimensions.',
        rawDataSummary: `${assessments.length} dimensions tracked across ${activePeople.length} family members. Completeness: ${familyCompleteness.overallPercent}%.`,
      });
      setLastGenerated(new Date());
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading || state === 'loading') {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the archive&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const daysSinceLast = lastGenerated
    ? Math.floor((Date.now() - lastGenerated.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="press-binder">

          {/* Running header — tiny small caps, centered */}
          <div className="press-running-header" style={{ paddingTop: 28 }}>
            <span>The Archive</span>
            <span className="sep">·</span>
            <span>Reports, summaries, and letters</span>
          </div>

          {/* Binder title — huge italic Cormorant */}
          <div className="press-binder-head">
            <h1 className="press-binder-title">The Archive</h1>
            <p className="press-binder-sub">
              A record of what has been said and what has shifted.
            </p>
          </div>

          {/* The one action — italic link, not a button */}
          <div className="press-binder-action">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="press-link"
              style={{
                background: 'transparent',
                cursor: generating ? 'wait' : 'pointer',
                opacity: generating ? 0.5 : 1,
              }}
            >
              {generating ? 'Composing…' : 'Compose a new report'}
              {!generating && <span className="arrow">⟶</span>}
            </button>
            {daysSinceLast !== null && (
              <p
                className="press-marginalia mt-4"
                style={{ fontSize: 14, textAlign: 'center' }}
              >
                last composed {daysSinceLast === 0 ? 'today' : `${daysSinceLast} days ago`}
              </p>
            )}
          </div>

          {/* The archive table of contents */}
          <div className="press-binder-archive">
            {archiveByYear.length === 0 ? (
              <EmptyArchive />
            ) : (
              <>
                <div
                  className="press-chapter-label"
                  style={{ textAlign: 'center', paddingTop: 32, marginBottom: 0 }}
                >
                  Past reports
                </div>
                <div className="press-asterism" aria-hidden="true" />
                <div style={{ padding: '0 48px 20px' }}>
                  {archiveByYear.map(({ year, months }) => (
                    <div key={year}>
                      <div className="press-archive-year">
                        {toRoman(year)}
                      </div>
                      {months.map(([monthName, entries]) => (
                        <div key={monthName}>
                          <div className="press-archive-month">{monthName}</div>
                          {entries.map((entry) => (
                            <Link
                              key={entry.id}
                              href={entry.route || '#'}
                              className="press-archive-entry"
                            >
                              <span className="press-archive-num">
                                {toRoman(entry.number)}.
                              </span>
                              <span className="press-archive-title">
                                {entry.title}
                              </span>
                              <span className="press-archive-dots" />
                              <span className="press-archive-date">
                                {entry.dateLabel}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Fleuron at bottom */}
          <div className="press-fleuron mt-10" style={{ fontSize: 19 }}>
            ❦
          </div>

          {/* Colophon — a tiny note at the very bottom */}
          <p
            className="press-marginalia text-center mt-6"
            style={{ fontSize: 15, color: '#7A6E5C' }}
          >
            Reports are generated on demand. Private entries and
            perspectives marked confidential are never included.
          </p>
        </div>
      </div>

      {/* Therapist report modal */}
      {therapistReport && (
        <TherapistReportPreview
          report={therapistReport}
          onClose={() => setTherapistReport(null)}
        />
      )}
    </div>
  );
}

function EmptyArchive() {
  return (
    <div className="press-empty" style={{ padding: '56px 40px' }}>
      <p className="press-empty-title" style={{ fontSize: 26 }}>
        The archive is empty.
      </p>
      <p className="press-empty-body" style={{ fontSize: 15 }}>
        Past reports and summaries will gather here after your first
        synthesis or therapist report is composed.
      </p>
      <div className="press-fleuron" style={{ fontSize: 16 }}>❦</div>
    </div>
  );
}
