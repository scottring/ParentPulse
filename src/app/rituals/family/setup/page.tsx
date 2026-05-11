'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { CSSProperties } from 'react';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';

export default function FamilyCheckInSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { people } = usePerson();
  const kids = people.filter((p) => p.relationshipType === 'child');

  const [targetPersonId, setTargetPersonId] = useState<string>(kids[0]?.personId ?? '');
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startTimeLocal, setStartTimeLocal] = useState('17:00');
  const [submitting, setSubmitting] = useState(false);

  // Keep selection in sync once kids load
  if (!targetPersonId && kids[0]?.personId) {
    setTargetPersonId(kids[0].personId);
  }

  const handleSubmit = async () => {
    if (!user?.familyId || !user?.userId || !targetPersonId) return;
    setSubmitting(true);
    try {
      await addDoc(collection(firestore, 'couple_rituals'), {
        familyId: user.familyId,
        createdByUserId: user.userId,
        participantUserIds: [user.userId],
        targetType: 'family-checkin',
        targetPersonId,
        cadence,
        dayOfWeek,
        startTimeLocal,
        durationMinutes: 15,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push('/rituals');
    } catch (err) {
      console.error('family check-in create failed:', err);
      alert('Could not save right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={appStyle}>
      <div style={pageStyle}>
        <header style={headerStyle}>
          <p style={eyebrowStyle}>Set up a family check-in</p>
          <h1 style={titleStyle}>A recurring moment, on the calendar.</h1>
        </header>

        {kids.length === 0 ? (
          <p style={emptyMsg}>
            <em>No kids in your family yet.</em> Add a child in <a href="/settings" style={linkStyle}>Settings</a> first.
          </p>
        ) : (
          <>
            <label style={fieldStyle}>
              <span style={labelStyle}>With</span>
              <select value={targetPersonId} onChange={(e) => setTargetPersonId(e.target.value)} style={selectStyle}>
                {kids.map((k) => <option key={k.personId} value={k.personId}>{k.name}</option>)}
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>How often</span>
              <select value={cadence} onChange={(e) => setCadence(e.target.value as 'weekly' | 'biweekly' | 'monthly')} style={selectStyle}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every other week</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Day</span>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))} style={selectStyle}>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Time</span>
              <input type="time" value={startTimeLocal} onChange={(e) => setStartTimeLocal(e.target.value)} style={inputStyle} />
            </label>

            <button type="button" onClick={handleSubmit} disabled={submitting || !targetPersonId} style={submitStyle}>
              {submitting ? 'Saving…' : 'Save check-in'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const appStyle: CSSProperties = { minHeight: '100vh', background: 'var(--r-cream, #F7F5F0)' };
const pageStyle: CSSProperties = { maxWidth: 520, margin: '0 auto', padding: '64px 32px 96px' };
const headerStyle: CSSProperties = { marginBottom: 32 };
const eyebrowStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)', margin: '0 0 12px' };
const titleStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 32, color: 'var(--r-ink, #2B2620)', margin: 0 };
const fieldStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 };
const labelStyle: CSSProperties = { fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--r-text-4, #6B6254)' };
const selectStyle: CSSProperties = { padding: '10px 12px', fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 16, color: 'var(--r-ink, #2B2620)', background: 'var(--r-paper, #FDFBF6)', border: '1px solid rgba(120, 100, 70, 0.24)', borderRadius: 6 };
const inputStyle: CSSProperties = selectStyle;
const submitStyle: CSSProperties = { marginTop: 14, padding: '12px 18px', background: 'var(--r-ink, #2B2620)', color: 'var(--r-cream, #FAF8F3)', border: 'none', borderRadius: 4, fontFamily: 'var(--r-sans, -apple-system, sans-serif)', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' };
const emptyMsg: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontSize: 17, lineHeight: 1.55, color: 'var(--r-text-3, #5C5347)' };
const linkStyle: CSSProperties = { color: 'var(--r-ink, #2B2620)', borderBottom: '1px solid var(--r-ink, #2B2620)', textDecoration: 'none' };
