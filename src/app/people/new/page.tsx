'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useFamily } from '@/hooks/useFamily';
import type { RelationshipType } from '@/types/person-manual';

// ================================================================
// /people/new — the single "add someone" page.
// Name + relationship + one of two paths:
//   · "I'll write about them"    → observer questionnaire
//   · "Invite them to write"     → email invite (spouse/friend/etc.)
// No multi-step wizard. Everything happens on this one screen.
// ================================================================

type Option = {
  type: RelationshipType;
  label: string;
  canInvite: boolean;
  hint?: string;
};

const RELATIONSHIP_OPTIONS: Option[] = [
  { type: 'child',          label: 'Child',               canInvite: false,
    hint: 'Children can add their own voice later with your help.' },
  { type: 'spouse',         label: 'Spouse or partner',   canInvite: true },
  { type: 'elderly_parent', label: 'Parent',              canInvite: true },
  { type: 'sibling',        label: 'Sibling',             canInvite: true },
  { type: 'friend',         label: 'Friend',              canInvite: true },
  { type: 'other',          label: 'Someone else',        canInvite: true },
];

const CAN_SELF_CONTRIBUTE: RelationshipType[] = ['spouse', 'sibling', 'friend', 'elderly_parent', 'other'];

export default function AddSomeonePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addPerson, updatePerson } = usePerson();
  const { createManual } = usePersonManual();
  const { inviteParent } = useFamily();

  const [name, setName] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  const selectedOption = useMemo(
    () => RELATIONSHIP_OPTIONS.find((o) => o.type === relationshipType) ?? null,
    [relationshipType],
  );

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  const canSubmitWrite = !!trimmedName && !!relationshipType && !submitting;
  const canSubmitInvite =
    canSubmitWrite &&
    !!selectedOption?.canInvite &&
    emailLooksValid;

  const handleWriteAboutThem = async () => {
    if (!canSubmitWrite || !relationshipType) return;
    setError(null);
    setSubmitting(true);
    try {
      const personId = await addPerson({
        name: trimmedName,
        relationshipType,
        canSelfContribute: CAN_SELF_CONTRIBUTE.includes(relationshipType),
      });
      const manualId = await createManual(personId, trimmedName, relationshipType);
      await updatePerson(personId, { hasManual: true, manualId });
      router.push(`/people/${personId}/manual/onboard`);
    } catch (err) {
      console.error('Add person (write) failed:', err);
      setError('Something went wrong adding them. Please try again.');
      setSubmitting(false);
    }
  };

  const handleInviteThem = async () => {
    if (!canSubmitInvite || !relationshipType) return;
    setError(null);
    setSubmitting(true);
    try {
      // Create a Person record that will be auto-claimed when they register.
      await addPerson({
        name: trimmedName,
        relationshipType,
        canSelfContribute: true,
      });
      await inviteParent(trimmedEmail);
      setInviteSent({ name: trimmedName });
    } catch (err) {
      console.error('Invite failed:', err);
      setError('We couldn’t send the invite. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="relish-page">
        <div className="press-loading">Opening&hellip;</div>
      </div>
    );
  }

  // ----- Confirmation screen after an invite is sent -----
  if (inviteSent) {
    return (
      <div className="add-page">
        <Link href="/" className="add-wordmark">Relish</Link>
        <div className="add-card" role="main">
          <span className="press-chapter-label">Invite sent</span>
          <h1 className="add-title">Sent to {inviteSent.name}.</h1>
          <p className="add-body">
            When they sign up, their page will already be here waiting — and
            their own words will be added alongside yours.
          </p>
          <div className="add-actions-single">
            <button
              type="button"
              className="press-link"
              style={{ background: 'transparent', border: 0, cursor: 'pointer' }}
              onClick={() => router.push('/manual')}
            >
              Back to my family <span className="arrow">⟶</span>
            </button>
          </div>
          <div className="press-fleuron mt-6">❦</div>
        </div>
        {pageStyles}
      </div>
    );
  }

  // ----- The single form -----
  return (
    <div className="add-page">
      <Link href="/" className="add-wordmark">Relish</Link>

      <div className="add-card" role="main">
        <span className="press-chapter-label">Add someone</span>
        <h1 className="add-title">Who else is in your family?</h1>
        <p className="add-body">
          Add one person. You can write about them yourself, or invite them
          to write too — their view alongside yours.
        </p>

        <hr className="press-rule" />

        {error && (
          <div className="add-error" role="alert">
            <p className="press-marginalia" style={{ fontSize: 14, color: '#C08070' }}>
              — {error}
            </p>
          </div>
        )}

        <div className="add-field">
          <label htmlFor="p-name" className="press-chapter-label">Their name</label>
          <input
            id="p-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Iris, Liam, Mom"
            disabled={submitting}
            className="add-input"
            autoComplete="off"
          />
        </div>

        <div className="add-field">
          <span className="press-chapter-label">Who are they to you?</span>
          <div className="rel-grid">
            {RELATIONSHIP_OPTIONS.map((o) => {
              const selected = relationshipType === o.type;
              return (
                <button
                  key={o.type}
                  type="button"
                  onClick={() => setRelationshipType(o.type)}
                  className={`rel-chip ${selected ? 'is-selected' : ''}`}
                  disabled={submitting}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          {selectedOption?.hint && (
            <p className="press-marginalia" style={{ fontSize: 13, marginTop: 10 }}>
              {selectedOption.hint}
            </p>
          )}
        </div>

        {selectedOption?.canInvite && (
          <div className="add-field">
            <label htmlFor="p-email" className="press-chapter-label">
              Their email <span className="press-marginalia" style={{ fontSize: 12 }}>(optional — only needed to invite them)</span>
            </label>
            <input
              id="p-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="them@example.com"
              disabled={submitting}
              className="add-input"
              autoComplete="email"
            />
          </div>
        )}

        <hr className="press-rule" style={{ marginTop: 28 }} />

        <div className="add-actions">
          <button
            type="button"
            onClick={handleWriteAboutThem}
            disabled={!canSubmitWrite}
            className="press-link add-cta-primary"
            style={{
              background: 'transparent',
              border: 0,
              cursor: canSubmitWrite ? 'pointer' : 'not-allowed',
              opacity: canSubmitWrite ? 1 : 0.4,
            }}
          >
            {submitting && !inviteSent ? 'Saving…' : (<>I&rsquo;ll write about them <span className="arrow">⟶</span></>)}
          </button>

          {selectedOption?.canInvite && (
            <button
              type="button"
              onClick={handleInviteThem}
              disabled={!canSubmitInvite}
              className="press-link-sm add-cta-secondary"
              style={{
                background: 'transparent',
                border: 0,
                cursor: canSubmitInvite ? 'pointer' : 'not-allowed',
                opacity: canSubmitInvite ? 1 : 0.4,
              }}
              title={!emailLooksValid ? 'Enter their email to enable this' : undefined}
            >
              Invite them to write <span className="arrow">⟶</span>
            </button>
          )}
        </div>

        <div className="add-footer">
          <Link href="/manual" className="press-link-sm" style={{ fontSize: 14 }}>
            Not now — back to my family
          </Link>
        </div>

        <div className="press-fleuron mt-6">❦</div>
      </div>

      {pageStyles}
    </div>
  );
}

// ================================================================
// Styles (co-located to match register/welcome aesthetic)
// ================================================================
const pageStyles = (
  <style jsx global>{`
    .add-page {
      min-height: 100vh;
      background: #f7f5f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      position: relative;
    }
    .add-wordmark {
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
    .add-card {
      width: 100%;
      max-width: 560px;
      background: #fdfbf6;
      border: 1px solid rgba(200, 190, 172, 0.55);
      border-radius: 4px;
      padding: 36px 52px 44px;
      text-align: center;
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.8) inset,
        0 1px 2px rgba(60, 48, 28, 0.04),
        0 12px 44px rgba(60, 48, 28, 0.12);
    }
    .add-title {
      font-family: var(--font-parent-display);
      font-style: italic;
      font-weight: 400;
      font-size: 30px;
      color: #3a3530;
      margin: 10px 0 8px;
      line-height: 1.15;
    }
    .add-body {
      font-family: var(--font-parent-body);
      font-size: 15px;
      line-height: 1.55;
      color: #5a5247;
      margin: 10px auto 0;
      max-width: 420px;
    }
    .add-error {
      padding: 10px 14px;
      margin: 16px 0 0;
      border-left: 2px solid rgba(192, 128, 112, 0.5);
      background: rgba(192, 128, 112, 0.05);
      text-align: left;
    }
    .add-field {
      margin-top: 24px;
      text-align: left;
    }
    .add-input {
      width: 100%;
      font-family: var(--font-parent-body);
      font-size: 16px;
      color: #3a3530;
      background: transparent;
      border: 0;
      border-bottom: 1px solid rgba(200, 190, 172, 0.6);
      padding: 10px 2px 10px;
      margin-top: 8px;
    }
    .add-input:focus {
      outline: none;
      border-bottom-color: #7c9082;
    }
    .rel-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    .rel-chip {
      font-family: var(--font-parent-body);
      font-size: 15px;
      color: #5c5347;
      background: transparent;
      border: 1px solid rgba(200, 190, 172, 0.55);
      border-radius: 3px;
      padding: 12px 14px;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .rel-chip:hover:not(:disabled) {
      border-color: rgba(124, 144, 130, 0.55);
      color: #3a3530;
    }
    .rel-chip.is-selected {
      background: rgba(124, 144, 130, 0.1);
      border-color: #7c9082;
      color: #2d5f5d;
      font-weight: 500;
    }
    .rel-chip:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .add-actions {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .add-actions-single {
      margin-top: 24px;
      display: flex;
      justify-content: center;
    }
    .add-cta-primary {
      font-size: 19px;
    }
    .add-cta-secondary {
      font-size: 15px;
    }
    .add-footer {
      text-align: center;
      margin-top: 24px;
    }

    @media (max-width: 520px) {
      .add-card {
        padding: 28px 22px 36px;
      }
      .add-title {
        font-size: 24px;
      }
      .rel-grid {
        grid-template-columns: 1fr;
      }
      .add-wordmark {
        font-size: 30px;
        margin-bottom: 28px;
      }
    }
  `}</style>
);
