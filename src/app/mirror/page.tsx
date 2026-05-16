'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMirror } from '@/hooks/useMirror';
import { renderMirrorPrompt } from '@/lib/mirror/prompt';
import { MirrorEntryScreen, type PairChoice } from '@/components/mirror/MirrorEntryScreen';
import { MirrorTurn } from '@/components/mirror/MirrorTurn';
import { MirrorHandoff } from '@/components/mirror/MirrorHandoff';
import { MirrorReveal } from '@/components/mirror/MirrorReveal';
import type { MirrorAnswer } from '@/types/mirror';

type Phase = 'pick' | 'turnA' | 'handoff' | 'turnB' | 'synthesizing' | 'reveal' | 'error';

export default function MirrorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { submit } = useMirror();

  const [phase, setPhase] = useState<Phase>('pick');
  const [pair, setPair] = useState<PairChoice | null>(null);
  const [answers, setAnswers] = useState<MirrorAnswer[]>([]);
  const [mirrorLine, setMirrorLine] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <p style={{ padding: 24 }}>Opening…</p>;

  const a = pair?.participants[0];
  const b = pair?.participants[1];

  const finish = async (allAnswers: MirrorAnswer[]) => {
    setPhase('synthesizing');
    try {
      const prompt = renderMirrorPrompt(b!.label);
      const { mirrorLine: line } = await submit({
        familyId: user.familyId!,
        stewardUserId: user.userId,
        prompt,
        answers: allAnswers,
      });
      setMirrorLine(line);
      setPhase('reveal');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('error');
    }
  };

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--parent-bg)' }}>
      {phase === 'pick' && (
        <MirrorEntryScreen
          onStart={(p) => {
            setPair(p);
            setAnswers([]);
            setPhase('turnA');
          }}
        />
      )}

      {phase === 'turnA' && a && b && (
        <MirrorTurn
          answererLabel={a.label}
          otherLabel={b.label}
          onSubmit={(text) => {
            setAnswers([{ participantId: a.participantId, label: a.label, text }]);
            setPhase('handoff');
          }}
        />
      )}

      {phase === 'handoff' && b && (
        <MirrorHandoff nextLabel={b.label} onReady={() => setPhase('turnB')} />
      )}

      {phase === 'turnB' && a && b && (
        <MirrorTurn
          answererLabel={b.label}
          otherLabel={a.label}
          onSubmit={(text) => {
            const all = [
              ...answers,
              { participantId: b.participantId, label: b.label, text },
            ];
            setAnswers(all);
            void finish(all);
          }}
        />
      )}

      {phase === 'synthesizing' && (
        <p style={{ padding: 24, textAlign: 'center' }}>Holding both up to the light…</p>
      )}

      {phase === 'reveal' && (
        <MirrorReveal answers={answers} mirrorLine={mirrorLine} onDone={() => router.push('/')} />
      )}

      {phase === 'error' && (
        <div style={{ padding: 24, textAlign: 'center' }} role="alert">
          <p>{errMsg}</p>
          <button onClick={() => { setErrMsg(''); setPhase('pick'); }} style={{ marginTop: 16 }}>
            Start over
          </button>
        </div>
      )}
    </main>
  );
}
