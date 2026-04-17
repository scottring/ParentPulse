// src/app/rituals/couple/setup/ClientPage.tsx
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

  if (spouseLoading) return <div style={pageStyle}>Loading…</div>;

  if (!spouseUserId || !spouseName) {
    return (
      <div style={pageStyle}>
        <h1 style={h1Style}>We couldn't find your partner.</h1>
        <p style={pStyle}>
          Couple rituals need both of you in the family. Invite your partner first,
          then come back here.
        </p>
        <button onClick={() => router.push('/settings')} style={primaryBtn}>
          Go to Settings
        </button>
      </div>
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
      const ics = coupleRitualToIcs(
        icsRitual,
        user.name ?? 'Me',
        spouseName!,
      );
      downloadIcs(ics, `relish-check-in-with-${spouseName!.toLowerCase()}.ics`);
      router.push('/rituals');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={pageStyle}>
      {step === 'together' && (
        <>
          <h1 style={h1Style}>Is {spouseName} here with you?</h1>
          <p style={pStyle}>
            This works best when you set it up together, in the same room.
          </p>
          <button onClick={() => setStep('cadence')} style={primaryBtn}>
            Yes, we're together
          </button>
        </>
      )}
      {step === 'cadence' && (
        <>
          <h1 style={h1Style}>How often?</h1>
          <p style={pStyle}>Weekly is the default most couples land on.</p>
          <CadencePicker value={cadence} onChange={setCadence} />
          <StepNav onBack={() => setStep('together')} onNext={() => setStep('day')} />
        </>
      )}
      {step === 'day' && (
        <>
          <h1 style={h1Style}>What day?</h1>
          <DayOfWeekPicker value={dayOfWeek} onChange={setDayOfWeek} />
          <StepNav onBack={() => setStep('cadence')} onNext={() => setStep('time')} />
        </>
      )}
      {step === 'time' && (
        <>
          <h1 style={h1Style}>What time?</h1>
          <TimePicker value={startTimeLocal} onChange={setStartTimeLocal} />
          <StepNav onBack={() => setStep('day')} onNext={() => setStep('duration')} />
        </>
      )}
      {step === 'duration' && (
        <>
          <h1 style={h1Style}>How long?</h1>
          <DurationPicker value={duration} onChange={setDuration} />
          <StepNav onBack={() => setStep('time')} onNext={() => setStep('confirm')} />
        </>
      )}
      {step === 'confirm' && (
        <>
          <h1 style={h1Style}>Your check-in</h1>
          <p style={pStyle}>
            {summaryText(cadence, dayOfWeek, startTimeLocal, duration)}
          </p>
          <label style={{ display: 'block', marginTop: 24, fontSize: 13, color: '#6B6254' }}>
            Intention (optional)
            <input
              type="text"
              value={intention}
              maxLength={140}
              onChange={(e) => setIntention(e.target.value)}
              style={{
                display: 'block', marginTop: 8, width: '100%', maxWidth: 480,
                padding: '10px 12px', borderRadius: 8,
                border: '1px solid rgba(120,100,70,0.18)',
                fontFamily: 'var(--font-parent-body)', fontSize: 15,
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button onClick={() => setStep('duration')} style={secondaryBtn} disabled={submitting}>
              Back
            </button>
            <button onClick={handleConfirm} style={primaryBtn} disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
      <button onClick={onBack} style={secondaryBtn}>Back</button>
      <button onClick={onNext} style={primaryBtn}>Next</button>
    </div>
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

const pageStyle: React.CSSProperties = {
  padding: '80px 32px 64px', maxWidth: 640, margin: '0 auto',
  fontFamily: 'var(--font-parent-body)', color: '#3A3530',
};
const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-parent-display)', fontSize: 40, fontWeight: 300,
  fontStyle: 'italic', margin: '0 0 12px', color: '#3A3530', lineHeight: 1.2,
};
const pStyle: React.CSSProperties = {
  fontSize: 16, color: '#6B6254', margin: '0 0 24px', lineHeight: 1.55,
};
const primaryBtn: React.CSSProperties = {
  padding: '12px 24px', borderRadius: 10, background: '#7C9082', color: 'white',
  border: 'none', fontFamily: 'var(--font-parent-body)', fontSize: 15, fontWeight: 500,
  cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '12px 24px', borderRadius: 10, background: 'transparent', color: '#3A3530',
  border: '1px solid rgba(120,100,70,0.18)', fontFamily: 'var(--font-parent-body)',
  fontSize: 15, cursor: 'pointer',
};
