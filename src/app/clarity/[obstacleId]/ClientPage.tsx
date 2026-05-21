'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useObstacle } from '@/hooks/useObstacle';
import { useClaritySession } from '@/hooks/useClaritySession';
import { ObstacleHeader } from '@/components/clarity/ObstacleHeader';
import { TurnList } from '@/components/clarity/TurnList';
import { TurnInput } from '@/components/clarity/TurnInput';
import { PrescriptionCard } from '@/components/clarity/PrescriptionCard';

export interface ClientPageProps {
  obstacleId: string;
}

export function ClientPage({ obstacleId }: ClientPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { obstacle, loading: obstacleLoading, error: obstacleError } = useObstacle(obstacleId);
  const {
    moves,
    loading: movesLoading,
    sending,
    error: sessionError,
    sendTurn,
    confirmPrescription,
    pendingPrescriptionDraft,
  } = useClaritySession(obstacleId);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || obstacleLoading) {
    return <Status>Opening…</Status>;
  }
  if (obstacleError) {
    return <Status>Couldn't open this obstacle: {obstacleError}</Status>;
  }
  if (!obstacle) return null;

  // Guardrail: only fresh/clarifying obstacles use this surface in v1.
  // Once status moves to 'prescribed', show a thin "what's next" view.
  const inSession = obstacle.status === 'fresh' || obstacle.status === 'clarifying';

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--r-cream, #F5F0E8)',
        padding: '0 24px 64px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <ObstacleHeader title={obstacle.title} status={obstacle.status} />

        <TurnList moves={moves} />

        {inSession && pendingPrescriptionDraft && (
          <PrescriptionCard
            draft={pendingPrescriptionDraft}
            busy={sending}
            onConfirm={() => confirmPrescription(pendingPrescriptionDraft)}
            onRefine={() => {
              // Refine = the user types more. The textarea is already there;
              // no special handling needed beyond keeping the card visible
              // until either Confirm or another assistant turn supersedes.
            }}
            onNotYet={() => {
              // Same — keep the card up; user continues with text input.
            }}
          />
        )}

        {inSession && !pendingPrescriptionDraft && (
          <TurnInput status={obstacle.status} sending={sending || movesLoading} onSend={sendTurn} />
        )}

        {!inSession && (
          <section style={{ marginTop: 48 }}>
            <p style={postSessionStyle}>
              You confirmed your move. The rest of the loop — execution,
              reflection, and clearing — comes in a later phase.
            </p>
          </section>
        )}

        {sessionError && (
          <p role="alert" style={errorStyle}>
            {sessionError}
          </p>
        )}
      </div>
    </main>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: 'italic',
        fontSize: 19,
        color: 'var(--r-text-4, #6B6254)',
        background: 'var(--r-cream, #F5F0E8)',
      }}
    >
      <p>{children}</p>
    </main>
  );
}

const postSessionStyle = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontStyle: 'italic',
  fontSize: 19,
  color: 'var(--r-text-3, #5F564B)',
  lineHeight: 1.5,
};

const errorStyle = {
  marginTop: 24,
  padding: 12,
  border: '1px solid #b65f3a',
  borderRadius: 4,
  background: 'rgba(182,95,58,0.08)',
  color: '#8C4A3E',
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 13,
};
