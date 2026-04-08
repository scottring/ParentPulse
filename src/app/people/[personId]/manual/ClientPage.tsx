'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById, usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { useFamily } from '@/hooks/useFamily';
import { ManualChat } from '@/components/manual/ManualChat';
import { useEquivalentManualIds } from '@/hooks/useEquivalentManualIds';
import { isKidObserverEligible, computeAge } from '@/utils/age';
import MainLayout from '@/components/layout/MainLayout';
import { PersonManual } from '@/types/person-manual';

const C = {
  sage: '#7C9082',
  sageBg: 'rgba(124,144,130,0.07)',
  sageBorder: 'rgba(124,144,130,0.16)',
  amber: '#C4A265',
  amberBg: 'rgba(196,162,101,0.07)',
  amberBorder: 'rgba(196,162,101,0.16)',
  coral: '#C08070',
  text: '#3A3530',
  textMuted: '#7C7468',
  textLight: '#9B9488',
  border: '#EEEBE5',
  cardBg: '#FAFAF7',
};

export function ManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { people } = usePerson();
  const equivalentManualIds = useEquivalentManualIds(personId, people);
  const { contributions, loading: contribLoading } = useContribution(manual?.manualId, equivalentManualIds);
  const { inviteParent } = useFamily();

  const [showMenu, setShowMenu] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const loading = authLoading || personLoading || manualLoading || contribLoading;
  const isSelf = person?.linkedUserId === user?.userId;
  const selfContributions = contributions.filter((c) => c.perspectiveType === 'self');
  const observerContributions = contributions.filter((c) => c.perspectiveType === 'observer');

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await inviteParent(inviteEmail.trim());
      setInviteSent(true);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteParent]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: C.sage, borderTopColor: 'transparent' }} />
        </div>
      </MainLayout>
    );
  }

  if (!user || !person || !manual) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p style={{ fontFamily: 'var(--font-parent-body)', color: C.textMuted, fontSize: '15px' }}>Manual not found.</p>
        </div>
      </MainLayout>
    );
  }

  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const synth = manual.synthesizedContent;
  const topGap = synth?.gaps?.[0] || null;

  // Top 3 strategies sorted by effectiveness
  const topStrategies = [...(manual.whatWorks || [])]
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 3);

  // Top 2 triggers sorted by severity
  const topTriggers = [...(manual.triggers || [])]
    .sort((a, b) => {
      const ord = { significant: 0, moderate: 1, mild: 2 };
      return (ord[a.severity] ?? 3) - (ord[b.severity] ?? 3);
    })
    .slice(0, 2);

  // Strength chips
  const strengths = manual.coreInfo?.strengths?.slice(0, 6) || [];

  // Meta
  const perspectiveCount =
    (selfContributions.length > 0 ? 1 : 0) +
    observerContributions.map((c) => c.contributorName).filter((n, i, a) => a.indexOf(n) === i).length;

  const font = (size: number, weight = 400, color = C.text) => ({
    fontFamily: 'var(--font-parent-body)' as const,
    fontSize: size,
    fontWeight: weight,
    color,
    lineHeight: 1.55,
  });

  const displayFont = (size: number, weight = 400, color = C.text) => ({
    fontFamily: 'var(--font-parent-display)' as const,
    fontSize: size,
    fontWeight: weight,
    color,
    lineHeight: 1.2,
  });

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 py-8" style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/family-manual" style={font(12, 400, C.textLight)} className="hover:opacity-70">
            &larr; Family Manual
          </Link>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-black/5" style={{ color: C.textLight }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            {showMenu && <DropdownMenu {...{ personId, person, isSelf, selfContributions, observerContributions, people, contributions, user, setShowMenu, setShowInvite }} />}
          </div>
        </div>

        {/* Name */}
        <h1 style={displayFont(36, 400)}>
          {person.name}
        </h1>

        {/* Meta line */}
        <p style={{ ...font(13, 400, C.textLight), marginTop: 4, marginBottom: 24 }}>
          {[
            person.relationshipType === 'self' ? 'You' :
              person.relationshipType === 'spouse' ? 'Partner' :
              person.relationshipType === 'child' && age !== null ? `Age ${age}` :
              person.relationshipType || '',
            perspectiveCount > 0 ? `${perspectiveCount} perspective${perspectiveCount !== 1 ? 's' : ''}` : '',
          ].filter(Boolean).join(' \u00b7 ')}
        </p>

        {/* Invite form */}
        {showInvite && !inviteSent && (
          <InviteForm {...{ person, inviteEmail, setInviteEmail, inviting, handleInvite, inviteError, setShowInvite }} />
        )}
        {inviteSent && (
          <div className="rounded-xl p-4 mb-6" style={{ background: C.sageBg, border: `1px solid ${C.sageBorder}` }}>
            <p style={font(14)}>Invite sent to <strong>{inviteEmail}</strong>.</p>
          </div>
        )}

        {/* Overview */}
        {synth?.overview && (
          <p style={{ ...font(17, 400, C.text), lineHeight: 1.7, marginBottom: 28 }}>
            {synth.overview}
          </p>
        )}

        {/* Strengths chips */}
        {strengths.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {strengths.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full"
                style={{ ...font(13, 500, C.sage), background: C.sageBg, border: `1px solid ${C.sageBorder}` }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Two columns: What Works + Handle With Care */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mb-8">
          {/* What works */}
          <div>
            <p style={{ ...font(11, 600, C.textLight), letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
              What works
            </p>
            {topStrategies.length > 0 ? (
              <div className="space-y-3">
                {topStrategies.map((s) => (
                  <p key={s.id} style={font(15)}>
                    {s.description}
                  </p>
                ))}
              </div>
            ) : (
              <p style={font(14, 400, C.textLight)}>Not enough data yet.</p>
            )}
          </div>

          {/* Handle with care */}
          <div>
            <p style={{ ...font(11, 600, C.textLight), letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
              Handle with care
            </p>
            {topTriggers.length > 0 ? (
              <div className="space-y-3">
                {topTriggers.map((t) => (
                  <div key={t.id}>
                    <p style={font(15)}>{t.description}</p>
                    {t.deescalationStrategy && (
                      <p style={{ ...font(13, 400, C.sage), marginTop: 2 }}>
                        {t.deescalationStrategy}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={font(14, 400, C.textLight)}>Not enough data yet.</p>
            )}
          </div>
        </div>

        {/* The #1 gap — the most interesting perspective difference */}
        {topGap && (
          <div className="rounded-xl px-5 py-4 mb-8" style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}` }}>
            <p style={{ ...font(11, 600, C.amber), letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
              Where perspectives differ
            </p>
            <p style={{ ...font(16, 500, C.text), marginBottom: 8 }}>
              {topGap.topic}
            </p>
            {topGap.selfPerspective && (
              <div className="flex gap-2 items-start mb-2">
                <div className="shrink-0 mt-1.5 w-1 h-4 rounded-full" style={{ background: C.sage, opacity: 0.5 }} />
                <p style={font(14)}>
                  <span style={{ color: C.textLight }}>Their words: </span>
                  &ldquo;{topGap.selfPerspective}&rdquo;
                </p>
              </div>
            )}
            {topGap.observerPerspective && (
              <div className="flex gap-2 items-start">
                <div className="shrink-0 mt-1.5 w-1 h-4 rounded-full" style={{ background: C.amber, opacity: 0.5 }} />
                <p style={font(14)}>
                  <span style={{ color: C.textLight }}>Observer: </span>
                  &ldquo;{topGap.observerPerspective}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* Spacer pushes chat to bottom */}
        <div className="flex-1" />

        {/* Chat — always at the bottom */}
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl hover:shadow-sm transition-all"
            style={{ background: C.cardBg, border: `1px solid ${C.border}`, cursor: 'pointer' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={font(15, 400, C.textMuted)}>
              Ask about {person.name}, or log something new...
            </span>
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p style={{ ...font(11, 600, C.textLight), letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                Ask the Manual
              </p>
              <button onClick={() => setChatOpen(false)} style={font(11, 400, C.textLight)} className="hover:opacity-70">
                Collapse
              </button>
            </div>
            <ManualChat personId={personId} personName={person.name} manual={manual} />
          </div>
        )}

        <div className="pb-8" />
      </div>
    </MainLayout>
  );
}

// ==================== Extracted Components ====================

function DropdownMenu({ personId, person, isSelf, selfContributions, observerContributions, people, contributions, user, setShowMenu, setShowInvite }: any) {
  const font13 = { fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' } as const;
  const itemClass = "block px-4 py-3 hover:bg-black/[0.03] transition-all";

  return (
    <div
      className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-lg overflow-hidden z-10"
      style={{ background: '#FAFAF7', border: '1px solid #EEEBE5' }}
    >
      {isSelf && (
        <Link href={`/people/${personId}/manual/self-onboard`} className={itemClass} style={font13} onClick={() => setShowMenu(false)}>
          {selfContributions.length > 0 ? 'Revise your perspective' : 'Add your perspective'}
        </Link>
      )}
      {!isSelf && (
        <Link href={`/people/${personId}/manual/onboard`} className={itemClass} style={font13} onClick={() => setShowMenu(false)}>
          {observerContributions.some((c: any) => c.contributorId === user.userId) ? 'Revise your observations' : 'Add your observations'}
        </Link>
      )}
      {person.canSelfContribute && person.relationshipType === 'child' && (
        <Link href={`/people/${personId}/manual/kid-session`} className={itemClass} style={font13} onClick={() => setShowMenu(false)}>
          Let {person.name} add their voice
        </Link>
      )}
      {!person.linkedUserId && person.canSelfContribute && person.relationshipType !== 'child' && (
        <button onClick={() => { setShowInvite(true); setShowMenu(false); }} className={`${itemClass} w-full text-left`} style={font13}>
          Invite {person.name}
        </button>
      )}
      {people
        .filter((p: any) => p.relationshipType === 'child' && p.personId !== personId && p.dateOfBirth && isKidObserverEligible(p.dateOfBirth))
        .map((kid: any) => {
          const kidContrib = contributions.find((c: any) => c.relationshipToSubject === 'child-observer' && c.contributorName === kid.name);
          return (
            <Link key={kid.personId} href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`} className={itemClass} style={font13} onClick={() => setShowMenu(false)}>
              {kidContrib?.status === 'complete' ? `${kid.name}\u2019s observations (revise)` : kidContrib?.status === 'draft' ? `${kid.name}\u2019s observations (continue)` : `Let ${kid.name} share about ${person.name}`}
            </Link>
          );
        })
      }
    </div>
  );
}

function InviteForm({ person, inviteEmail, setInviteEmail, inviting, handleInvite, inviteError, setShowInvite }: any) {
  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: '#FAFAF7', border: '1px solid rgba(124,144,130,0.16)' }}>
      <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }} className="mb-3">
        Invite {person.name} to add their own perspective.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e: any) => setInviteEmail(e.target.value)}
          placeholder={`${person.name}'s email`}
          className="flex-1 px-3 py-2 rounded-lg focus:outline-none"
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', border: '1px solid #EEEBE5', background: 'white', color: '#3A3530' }}
        />
        <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="px-4 py-2 rounded-lg text-white disabled:opacity-50" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', backgroundColor: '#7C9082' }}>
          {inviting ? '...' : 'Send'}
        </button>
        <button onClick={() => setShowInvite(false)} style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#9B9488' }}>Cancel</button>
      </div>
      {inviteError && <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#dc2626' }} className="mt-2">{inviteError}</p>}
    </div>
  );
}
