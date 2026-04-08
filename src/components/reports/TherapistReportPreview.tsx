'use client';

import { useState } from 'react';

export interface TherapistReportData {
  period: string;
  generatedAt: string;
  familyOverview: string;
  patternsOfNote: string[];
  areasForDiscussion: string[];
  progressSummary: string;
  rawDataSummary: string;
}

interface Props {
  report: TherapistReportData;
  onClose: () => void;
}

/**
 * Preview + redact + export therapist report.
 * The report is never stored — generated on demand.
 */
export function TherapistReportPreview({ report, onClose }: Props) {
  const [redacted, setRedacted] = useState<Set<string>>(new Set());

  const toggleRedact = (key: string) => {
    setRedacted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildExportText = () => {
    const lines: string[] = [];
    lines.push('FAMILY THERAPIST REPORT');
    lines.push(`Period: ${report.period}`);
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push('');
    lines.push('FAMILY OVERVIEW');
    lines.push(report.familyOverview);
    lines.push('');
    lines.push('PATTERNS OF NOTE');
    report.patternsOfNote.forEach((p, i) => {
      if (!redacted.has(`pattern-${i}`)) lines.push(`- ${p}`);
    });
    lines.push('');
    lines.push('AREAS FOR DISCUSSION');
    report.areasForDiscussion.forEach((a, i) => {
      if (!redacted.has(`area-${i}`)) lines.push(`- ${a}`);
    });
    lines.push('');
    if (!redacted.has('progress')) {
      lines.push('PROGRESS SUMMARY');
      lines.push(report.progressSummary);
      lines.push('');
    }
    lines.push('RAW DATA SUMMARY');
    lines.push(report.rawDataSummary);
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildExportText());
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<pre style="font-family: Georgia, serif; max-width: 700px; margin: 40px auto; line-height: 1.8;">${buildExportText()}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{ background: '#FAF8F5' }}
      >
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between" style={{ background: '#FAF8F5', borderBottom: '1px solid rgba(138,128,120,0.1)' }}>
          <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '18px', fontWeight: 500, color: '#3A3530' }}>
            Therapist Report
          </h2>
          <button onClick={onClose} className="text-[20px]" style={{ color: '#9ca3af' }}>&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Period */}
          <div className="text-[12px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}>
            Period: {report.period} &middot; Generated: {report.generatedAt}
          </div>

          {/* Family Overview */}
          <ReportSection title="Family Overview">
            <p className="text-[13px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347', lineHeight: 1.7 }}>
              {report.familyOverview}
            </p>
          </ReportSection>

          {/* Patterns of Note */}
          <ReportSection title="Patterns of Note">
            {report.patternsOfNote.map((p, i) => (
              <RedactableLine
                key={i}
                text={p}
                redactKey={`pattern-${i}`}
                isRedacted={redacted.has(`pattern-${i}`)}
                onToggle={toggleRedact}
              />
            ))}
          </ReportSection>

          {/* Areas for Discussion */}
          <ReportSection title="Areas for Discussion">
            {report.areasForDiscussion.map((a, i) => (
              <RedactableLine
                key={i}
                text={a}
                redactKey={`area-${i}`}
                isRedacted={redacted.has(`area-${i}`)}
                onToggle={toggleRedact}
              />
            ))}
          </ReportSection>

          {/* Progress */}
          <ReportSection title="Progress Summary">
            <RedactableLine
              text={report.progressSummary}
              redactKey="progress"
              isRedacted={redacted.has('progress')}
              onToggle={toggleRedact}
            />
          </ReportSection>

          {/* Raw Data */}
          <ReportSection title="Raw Data Summary">
            <p className="text-[12px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468', lineHeight: 1.6 }}>
              {report.rawDataSummary}
            </p>
          </ReportSection>
        </div>

        {/* Export footer */}
        <div
          className="sticky bottom-0 px-6 py-4 flex items-center gap-3"
          style={{ background: '#FAF8F5', borderTop: '1px solid rgba(138,128,120,0.1)' }}
        >
          <button
            onClick={handleCopy}
            className="flex-1 text-[12px] font-medium py-2.5 rounded-full text-white transition-all hover:opacity-90"
            style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082' }}
          >
            Copy to clipboard
          </button>
          <button
            onClick={handlePrint}
            className="text-[12px] font-medium px-5 py-2.5 rounded-full transition-all hover:opacity-80"
            style={{
              fontFamily: 'var(--font-parent-body)',
              color: '#5C5347',
              border: '1px solid rgba(138,128,120,0.2)',
            }}
          >
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-parent-body)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7C9082',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function RedactableLine({ text, redactKey, isRedacted, onToggle }: {
  text: string;
  redactKey: string;
  isRedacted: boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <div
      className="flex items-start gap-2 cursor-pointer group rounded-lg px-2 py-1 -mx-2 transition-colors hover:bg-black/[0.02]"
      onClick={() => onToggle(redactKey)}
    >
      <span
        className="w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px]"
        style={{
          borderColor: isRedacted ? '#dc2626' : 'rgba(138,128,120,0.2)',
          background: isRedacted ? 'rgba(220,38,38,0.06)' : 'transparent',
          color: isRedacted ? '#dc2626' : 'transparent',
        }}
      >
        {isRedacted ? '\u2715' : '\u2713'}
      </span>
      <p
        className="text-[13px] flex-1"
        style={{
          fontFamily: 'var(--font-parent-body)',
          color: isRedacted ? '#d1d5db' : '#5C5347',
          lineHeight: 1.6,
          textDecoration: isRedacted ? 'line-through' : 'none',
        }}
      >
        {text}
      </p>
    </div>
  );
}
