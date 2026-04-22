'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { firestore } from '@/lib/firebase';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';
import { COLLECTIONS } from '@/types';

// ================================================================
// Welcome — the first thing a new reader sees after they create
// their account. Not a redirect, not a loading animation — a real
// hello. Speaks the family name back to confirm the account landed,
// frames what Relish is going to do for them, and offers one clear
// next step: start with yourself.
// ================================================================

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [selfPersonId, setSelfPersonId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState<string>('');
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const peopleQ = query(
          collection(firestore, PERSON_MANUAL_COLLECTIONS.PEOPLE),
          where('familyId', '==', user.familyId),
          where('linkedUserId', '==', user.userId),
          where('relationshipType', '==', 'self'),
        );
        const [peopleSnap, famSnap] = await Promise.all([
          getDocs(peopleQ),
          getDoc(doc(firestore, COLLECTIONS.FAMILIES, user.familyId)),
        ]);
        if (cancelled) return;

        const self = peopleSnap.docs[0];
        if (self) setSelfPersonId(self.id);

        const fam = famSnap.data() as { name?: string } | undefined;
        if (fam?.name) setFamilyName(fam.name);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (authLoading || !user || resolving) {
    return (
      <div className="relish-page">
        <div className="press-loading">Opening the library&hellip;</div>
      </div>
    );
  }

  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'friend';
  const startHref = selfPersonId
    ? `/people/${selfPersonId}/manual/self-onboard`
    : '/workbook';

  return (
    <div className="welcome-page">
      <Link href="/" className="welcome-wordmark">
        Relish
      </Link>

      <div className="welcome-card" role="main">
        <span className="press-chapter-label">An introduction</span>

        <h1 className="welcome-title">Welcome, {firstName}.</h1>

        {familyName && (
          <p className="welcome-familyline">
            The <em>{familyName}</em> library is open.
          </p>
        )}

        <hr className="press-rule" />

        <p className="welcome-body">
          Relish helps you see the people you love through a few different
          lenses — yours, theirs, and what becomes visible when they&rsquo;re
          held together.
        </p>

        <p className="welcome-body">
          Before anyone else, let&rsquo;s start with you. A short set of
          questions in your own words. You can stop any time — we save as
          you go.
        </p>

        <div className="welcome-actions">
          <Link href={startHref} className="press-link welcome-cta">
            Start with myself <span className="arrow">⟶</span>
          </Link>
        </div>

        <div className="press-fleuron mt-8">❦</div>
      </div>

      <style jsx>{`
        .welcome-page {
          min-height: 100vh;
          background: #f7f5f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          position: relative;
        }

        :global(.welcome-wordmark) {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 300;
          font-size: 36px;
          color: #3a3530;
          text-decoration: none;
          letter-spacing: -0.015em;
          line-height: 1;
          margin-bottom: 36px;
        }

        .welcome-card {
          width: 100%;
          max-width: 520px;
          background: #fdfbf6;
          border: 1px solid rgba(200, 190, 172, 0.55);
          border-radius: 4px;
          padding: 40px 52px 48px;
          text-align: center;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.8) inset,
            0 1px 2px rgba(60, 48, 28, 0.04),
            0 12px 44px rgba(60, 48, 28, 0.12);
        }

        .welcome-title {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-weight: 400;
          font-size: 36px;
          color: #3a3530;
          margin: 10px 0 8px;
          line-height: 1.1;
        }

        .welcome-familyline {
          font-family: var(--font-parent-display);
          font-style: italic;
          font-size: 17px;
          color: #6b6254;
          margin: 0 0 8px;
        }
        .welcome-familyline em {
          color: #3a3530;
        }

        .welcome-body {
          font-family: var(--font-parent-body);
          font-size: 15.5px;
          line-height: 1.6;
          color: #4a4238;
          margin: 18px auto 0;
          max-width: 440px;
        }

        .welcome-actions {
          margin-top: 36px;
          display: flex;
          justify-content: center;
        }
        :global(.welcome-cta) {
          font-size: 20px;
        }

        @media (max-width: 520px) {
          .welcome-card {
            padding: 32px 26px 40px;
          }
          .welcome-title {
            font-size: 28px;
          }
          .welcome-body,
          .welcome-familyline {
            font-size: 15px;
          }
          :global(.welcome-wordmark) {
            font-size: 30px;
            margin-bottom: 28px;
          }
        }
      `}</style>
    </div>
  );
}
