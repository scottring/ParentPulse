'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSpouse } from '@/hooks/useSpouse';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import CadencePicker from '@/components/rituals/CadencePicker';
import DayOfWeekPicker from '@/components/rituals/DayOfWeekPicker';
import TimePicker from '@/components/rituals/TimePicker';
import DurationPicker from '@/components/rituals/DurationPicker';
import { coupleRitualToIcs } from '@/lib/rituals/icsExport';
import { downloadIcs } from '@/lib/rituals/downloadIcs';
import type {
  RitualCadence, DayOfWeek,
} from '@/types/couple-ritual';

type Step = 'together' | 'cadence' | 'day' | 'time' | 'duration' | 'confirm';

const STEPS: Step[] = ['together', 'cadence', 'day', 'time', 'duration', 'confirm'];

export default function ClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { spouseUserId, spouseName, loading: spouseLoading } = useSpouse();
  const { createRitual } = useCoupleRitual();

  const [step, setStep] = useState<Step>('together');
  const [cadence, setCadence] = useState<RitualCadence>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(0);
  const [startTimeLocal, setStartTimeLocal] = useState('20:00');
  const [duration, setDuration] = useState(15);
  const [intention, setIntention] = useState('Our weekly check-in');
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  if (spouseLoading) return <Shell><p className="body-copy">Loading&hellip;</p></Shell>;

  if (!spouseUserId || !spouseName) {
    return (
      <Shell eyebrow="Couple rituals">
        <h1 className="display-heading">We couldn&rsquo;t find your partner.</h1>
        <p className="body-copy">
          Couple rituals are for two people who already share a family in Relish.
          Invite your partner first, then come back here together.
        </p>
        <div className="action-row">
          <button onClick={() => router.push('/settings')} className="btn-primary">
            Go to Settings
          </button>
        </div>
      </Shell>
    );
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function handleConfirm() {
    if (!user?.userId) return;
    setSubmitting(true);
    const startsOn = nextDateOnDay(dayOfWeek);
    try {
      const ritualId = await createRitual({
        spouseUserId: spouseUserId!,
        cadence, dayOfWeek, startTimeLocal, durationMinutes: duration,
        timezone: tz, startsOn, intention,
      });
      const { Timestamp } = await import('firebase/firestore');
      const icsRitual = {
        id: ritualId, familyId: user.familyId!,
        participantUserIds: [user.userId, spouseUserId!] as [string, string],
        cadence, dayOfWeek, startTimeLocal, durationMinutes: duration,
        timezone: tz, status: 'active' as const,
        startsOn: Timestamp.fromDate(startsOn),
        createdAt: Timestamp.now(), createdByUserId: user.userId,
        updatedAt: Timestamp.now(), updatedByUserId: user.userId,
        intention,
      };
      const ics = coupleRitualToIcs(icsRitual, user.name ?? 'Me', spouseName!);
      downloadIcs(ics, `relish-check-in-with-${spouseName!.toLowerCase()}.ics`);
      router.push('/rituals');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell eyebrow="A couple ritual" progress={progress}>
      {step === 'together' && (
        <>
          <h1 className="display-heading">Is {spouseName} here with you?</h1>
          <p className="body-copy">
            The idea of a couple ritual is simple: one recurring time, set aside together,
            on purpose. It works best when you decide the when in the same room &mdash; so
            the commitment is real, not just one person&rsquo;s plan.
          </p>
          <div className="action-row">
            <button onClick={() => setStep('cadence')} className="btn-primary">
              Yes, we&rsquo;re together
            </button>
          </div>
        </>
      )}
      {step === 'cadence' && (
        <>
          <h1 className="display-heading">How often?</h1>
          <p className="body-copy">
            Weekly is where most couples land &mdash; often enough to stay current, rare
            enough to feel special.
          </p>
          <div className="picker-wrap">
            <CadencePicker value={cadence} onChange={setCadence} />
          </div>
          <StepNav onBack={() => setStep('together')} onNext={() => setStep('day')} />
        </>
      )}
      {step === 'day' && (
        <>
          <h1 className="display-heading">What day of the week?</h1>
          <p className="body-copy">
            Pick a day that tends to be yours &mdash; quiet, unclaimed by the kids&rsquo;
            schedules or by work.
          </p>
          <div className="picker-wrap">
            <DayOfWeekPicker value={dayOfWeek} onChange={setDayOfWeek} />
          </div>
          <StepNav onBack={() => setStep('cadence')} onNext={() => setStep('time')} />
        </>
      )}
      {step === 'time' && (
        <>
          <h1 className="display-heading">And what time?</h1>
          <p className="body-copy">
            Evening tends to work best &mdash; after the kids are down, before you&rsquo;re
            too tired to be present.
          </p>
          <div className="picker-wrap">
            <TimePicker value={startTimeLocal} onChange={setStartTimeLocal} />
          </div>
          <StepNav onBack={() => setStep('day')} onNext={() => setStep('duration')} />
        </>
      )}
      {step === 'duration' && (
        <>
          <h1 className="display-heading">How long should it last?</h1>
          <p className="body-copy">
            Fifteen minutes is more than you think. The goal isn&rsquo;t a long talk &mdash;
            it&rsquo;s a reliable one.
          </p>
          <div className="picker-wrap">
            <DurationPicker value={duration} onChange={setDuration} />
          </div>
          <StepNav onBack={() => setStep('time')} onNext={() => setStep('confirm')} />
        </>
      )}
      {step === 'confirm' && (
        <>
          <h1 className="display-heading">Your check-in.</h1>
          <p className="body-copy summary">
            {summaryText(cadence, dayOfWeek, startTimeLocal, duration)}
          </p>
          <label className="intention-label">
            <span className="intention-eyebrow">Intention (optional)</span>
            <input
              type="text"
              value={intention}
              maxLength={140}
              onChange={(e) => setIntention(e.target.value)}
              className="intention-input"
            />
          </label>
          <div className="action-row">
            <button onClick={() => setStep('duration')} className="btn-secondary" disabled={submitting}>
              Back
            </button>
            <button onClick={handleConfirm} className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving\u2026' : 'Confirm'}
            </button>
          </div>
          <p className="fine-print">
            A calendar invite will download to this device. {spouseName} will see the ritual in
            her own app &mdash; you can each add it to your calendars from there.
          </p>
        </>
      )}
    </Shell>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="action-row">
      <button onClick={onBack} className="btn-secondary">Back</button>
      <button onClick={onNext} className="btn-primary">Continue</button>
    </div>
  );
}

function Shell({
  children, eyebrow, progress,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  progress?: number;
}) {
  return (
    <>
      <main className="ritual-stage">
        <div className="ritual-hero" aria-hidden="true">
          <span className="ritual-hero-mark">❦</span>
        </div>
        <div className="ritual-card">
          {eyebrow && <p className="ritual-eyebrow">{eyebrow}</p>}
          {children}
          {progress !== undefined && (
            <div className="ritual-progress" aria-hidden="true">
              <div className="ritual-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </main>
      <style jsx>{`
        .ritual-stage {
          min-height: 100vh;
          background: #14100c;
          padding-top: 64px;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 40vh 1fr;
        }
        .ritual-hero {
          position: relative;
          grid-row: 1;
          grid-column: 1;
          overflow: hidden;
          background: var(--r-cream-warm, #E8DDC8);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ritual-hero-mark {
          font-family: var(--r-serif, Georgia, serif);
          font-size: 72px;
          color: var(--r-rule-2, #B5A99A);
          line-height: 1;
        }
        .ritual-card {
          position: relative;
          z-index: 5;
          grid-row: 2;
          grid-column: 1;
          background: #F3F1EC;
          padding: 56px 32px 80px;
          margin-top: -80px;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -18px 48px rgba(0, 0, 0, 0.35);
          max-width: 680px;
          margin-left: auto;
          margin-right: auto;
          width: 100%;
        }
        .ritual-eyebrow {
          font-family: var(--font-parent-body);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8B7D63;
          margin: 0 0 20px;
        }
        .ritual-progress {
          margin-top: 48px;
          height: 2px;
          background: rgba(120, 100, 70, 0.14);
          border-radius: 2px;
          overflow: hidden;
        }
        .ritual-progress-bar {
          height: 100%;
          background: #7C9082;
          transition: width 0.35s ease;
        }
        @media (min-width: 900px) {
          .ritual-stage {
            grid-template-columns: 1fr minmax(460px, 560px);
            grid-template-rows: 1fr;
          }
          .ritual-hero {
            grid-row: 1;
            grid-column: 1;
            min-height: calc(100vh - 64px);
          }
          .ritual-card {
            grid-row: 1;
            grid-column: 2;
            margin: 0;
            padding: 96px 64px 80px;
            border-radius: 0;
            box-shadow: -24px 0 48px rgba(0, 0, 0, 0.35);
            max-width: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: calc(100vh - 64px);
          }
        }
      `}</style>
      <style jsx global>{`
        .ritual-card .display-heading {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 300;
          font-size: clamp(32px, 5vw, 44px);
          line-height: 1.1;
          letter-spacing: -0.015em;
          color: #2B2620;
          margin: 0 0 20px;
        }
        .ritual-card .body-copy {
          font-family: var(--font-parent-body);
          font-size: 16px;
          line-height: 1.65;
          color: #5C5347;
          margin: 0 0 32px;
          max-width: 54ch;
        }
        .ritual-card .body-copy.summary {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 22px;
          color: #3A3530;
          line-height: 1.45;
        }
        .ritual-card .picker-wrap {
          margin-bottom: 8px;
        }
        .ritual-card .action-row {
          display: flex;
          gap: 12px;
          margin-top: 32px;
          flex-wrap: wrap;
        }
        .ritual-card .btn-primary {
          padding: 14px 28px;
          border-radius: 999px;
          background: #7C9082;
          color: #FAF8F3;
          border: none;
          font-family: var(--font-parent-body);
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(80, 100, 85, 0.22);
        }
        .ritual-card .btn-primary:hover:not(:disabled) {
          background: #6E8275;
          transform: translateY(-1px);
        }
        .ritual-card .btn-primary:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .ritual-card .btn-secondary {
          padding: 14px 22px;
          border-radius: 999px;
          background: transparent;
          color: #5C5347;
          border: 1px solid rgba(120, 100, 70, 0.22);
          font-family: var(--font-parent-body);
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .ritual-card .btn-secondary:hover:not(:disabled) {
          background: rgba(120, 100, 70, 0.05);
        }
        .ritual-card .intention-label {
          display: block;
          margin-top: 8px;
        }
        .ritual-card .intention-eyebrow {
          display: block;
          font-family: var(--font-parent-body);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8B7D63;
          margin-bottom: 10px;
        }
        .ritual-card .intention-input {
          display: block;
          width: 100%;
          max-width: 480px;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(120, 100, 70, 0.2);
          background: #FAF8F3;
          font-family: var(--font-parent-body);
          font-size: 15px;
          color: #2B2620;
        }
        .ritual-card .intention-input:focus {
          outline: none;
          border-color: #7C9082;
          box-shadow: 0 0 0 3px rgba(124, 144, 130, 0.2);
        }
        .ritual-card .fine-print {
          margin-top: 28px;
          font-family: var(--font-parent-body);
          font-size: 13px;
          line-height: 1.55;
          color: #8B7D63;
          max-width: 48ch;
        }
      `}</style>
    </>
  );
}

function nextDateOnDay(dayOfWeek: number): Date {
  const now = new Date();
  const diff = (dayOfWeek - now.getDay() + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(0, 0, 0, 0);
  return d;
}

function summaryText(c: string, day: number, time: string, dur: number): string {
  const dayLabels = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const cadenceLabel = c === 'weekly' ? 'Every' : c === 'biweekly' ? 'Every other' : 'Monthly on the nth';
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${cadenceLabel} ${dayLabels[day]} at ${h12}:${m.toString().padStart(2, '0')} ${ampm}, ${dur} minutes.`;
}
