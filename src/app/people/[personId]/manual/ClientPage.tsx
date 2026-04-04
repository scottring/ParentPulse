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

  const loading = authLoading || personLoading || manualLoading || contribLoading;

  const isSelf = person?.linkedUserId === user?.userId;
  const selfContributions = contributions.filter((c) => c.perspectiveType === 'self');
  const observerContributions = contributions.filter((c) => c.perspectiveType === 'observer');
  const hasAnyPerspective = selfContributions.length > 0 || observerContributions.length > 0;

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
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: '#7C9082', borderTopColor: 'transparent' }} />
        </div>
      </MainLayout>
    );
  }

  if (!user || !person || !manual) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468', fontSize: '14px' }}>Manual not found.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Minimal header */}
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/dashboard"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}
            className="hover:opacity-70 transition-opacity"
          >
            &larr; Back
          </Link>

          {/* Subtle menu for perspectives/invite */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-white/30 transition-all"
              style={{ color: '#8A8078' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
              </svg>
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-56 glass-card-strong rounded-xl shadow-lg overflow-hidden z-10"
                style={{ border: '1px solid rgba(255,255,255,0.4)' }}
              >
                {isSelf && (
                  <Link
                    href={`/people/${personId}/manual/self-onboard`}
                    className="block px-4 py-3 hover:bg-white/30 transition-all"
                    style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' }}
                    onClick={() => setShowMenu(false)}
                  >
                    {selfContributions.length > 0 ? 'Revise your perspective' : 'Add your perspective'}
                  </Link>
                )}
                {!isSelf && (
                  <Link
                    href={`/people/${personId}/manual/onboard`}
                    className="block px-4 py-3 hover:bg-white/30 transition-all"
                    style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' }}
                    onClick={() => setShowMenu(false)}
                  >
                    {observerContributions.some(c => c.contributorId === user.userId) ? 'Revise your observations' : 'Add your observations'}
                  </Link>
                )}
                {person.canSelfContribute && person.relationshipType === 'child' && (
                  <Link
                    href={`/people/${personId}/manual/kid-session`}
                    className="block px-4 py-3 hover:bg-white/30 transition-all"
                    style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' }}
                    onClick={() => setShowMenu(false)}
                  >
                    Let {person.name} add their voice
                  </Link>
                )}
                {!person.linkedUserId && person.canSelfContribute && person.relationshipType !== 'child' && (
                  <button
                    onClick={() => { setShowInvite(true); setShowMenu(false); }}
                    className="block w-full text-left px-4 py-3 hover:bg-white/30 transition-all"
                    style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' }}
                  >
                    Invite {person.name}
                  </button>
                )}
                {/* Kid observers — any eligible child (8+) can observe this person */}
                {people
                  .filter(p =>
                    p.relationshipType === 'child' &&
                    p.personId !== personId &&
                    p.dateOfBirth && isKidObserverEligible(p.dateOfBirth)
                  )
                  .map(kid => {
                    const kidContrib = contributions.find(
                      c => c.relationshipToSubject === 'child-observer' && c.contributorName === kid.name
                    );
                    return (
                      <Link
                        key={kid.personId}
                        href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`}
                        className="block px-4 py-3 hover:bg-white/30 transition-all"
                        style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' }}
                        onClick={() => setShowMenu(false)}
                      >
                        {kidContrib?.status === 'complete'
                          ? `${kid.name}'s observations (revise)`
                          : kidContrib?.status === 'draft'
                          ? `${kid.name}'s observations (continue)`
                          : `Let ${kid.name} share about ${person.name}`}
                      </Link>
                    );
                  })
                }
                <Link
                  href="/workbook"
                  className="block px-4 py-3 hover:bg-white/30 transition-all"
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530', borderTop: '1px solid rgba(255,255,255,0.3)' }}
                  onClick={() => setShowMenu(false)}
                >
                  Workbook
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Person meta header */}
        {(() => {
          const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
          const relationLabel = person.relationshipType === 'self' ? 'You' :
            person.relationshipType === 'spouse' ? 'Partner' :
            person.relationshipType === 'child' ? 'Child' :
            person.relationshipType || '';

          // Who has contributed observations to this manual
          const observedByNames = observerContributions
            .map(c => c.contributorName)
            .filter((name, i, arr) => arr.indexOf(name) === i);
          const hasSelf = selfContributions.length > 0;

          // Which other people this person observes (contributed to other manuals)
          // We derive this from people list — if this person is a child, they may observe parents/siblings
          const observingNames = people
            .filter(p => p.personId !== personId && p.hasManual)
            .map(p => p.name);

          const synthDate = manual.synthesizedContent?.lastSynthesizedAt?.toDate();
          const hasCrossRefs = (manual.synthesizedContent?.crossReferences?.length || 0) > 0;

          return (
            <div className="mb-8">
              <h1
                style={{
                  fontFamily: 'var(--font-parent-display)',
                  fontSize: '32px',
                  fontWeight: 400,
                  color: '#3A3530',
                }}
              >
                {person.name}&apos;s Manual
              </h1>

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {relationLabel && (
                  <span
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#7C9082',
                      background: 'rgba(124,144,130,0.1)',
                      border: '1px solid rgba(124,144,130,0.15)',
                    }}
                  >
                    {relationLabel}
                  </span>
                )}
                {age !== null && (
                  <span
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#5C5347',
                      background: 'rgba(138,128,120,0.06)',
                      border: '1px solid rgba(138,128,120,0.1)',
                    }}
                  >
                    Age {age}
                  </span>
                )}
                {synthDate && (
                  <span
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: hasCrossRefs ? '#7C9082' : '#8A8078',
                      background: hasCrossRefs ? 'rgba(124,144,130,0.08)' : 'rgba(138,128,120,0.06)',
                      border: `1px solid ${hasCrossRefs ? 'rgba(124,144,130,0.15)' : 'rgba(138,128,120,0.1)'}`,
                    }}
                  >
                    Synced {synthDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Observed by / Observing */}
              <div className="mt-4 space-y-1.5">
                {/* Observed by */}
                <div className="flex items-start gap-2">
                  <span
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#8A8078',
                      minWidth: '80px',
                    }}
                  >
                    Observed by
                  </span>
                  <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5C5347' }}>
                    {[
                      ...(hasSelf ? [isSelf ? 'Self' : person.name] : []),
                      ...observedByNames,
                    ].join(', ') || (
                      <Link
                        href={isSelf ? `/people/${personId}/manual/self-onboard` : `/people/${personId}/manual/onboard`}
                        style={{ color: '#7C9082', fontWeight: 500 }}
                        className="hover:opacity-70"
                      >
                        Add first perspective &rarr;
                      </Link>
                    )}
                  </span>
                </div>

                {/* Observing */}
                {observingNames.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#8A8078',
                        minWidth: '80px',
                      }}
                    >
                      Observing
                    </span>
                    <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5C5347' }}>
                      {observingNames.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Inline invite form */}
        {showInvite && !inviteSent && (
          <div className="glass-card p-5 mb-6 rounded-2xl" style={{ border: '1px solid rgba(124,144,130,0.3)' }}>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#5C5347' }} className="mb-3">
              Invite {person.name} to add their own perspective.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={`${person.name}'s email`}
                className="flex-1 px-3 py-2 rounded-full focus:outline-none"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3A3530' }}
              />
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-full text-white disabled:opacity-50"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', backgroundColor: '#7C9082' }}
              >
                {inviting ? 'Sending...' : 'Send'}
              </button>
              <button onClick={() => setShowInvite(false)} style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}>Cancel</button>
            </div>
            {inviteError && <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#dc2626' }} className="mt-2">{inviteError}</p>}
          </div>
        )}
        {inviteSent && (
          <div className="glass-card p-4 mb-6 rounded-2xl" style={{ border: '1px solid rgba(22,163,74,0.3)' }}>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#3A3530' }}>
              Invite sent to <strong>{inviteEmail}</strong>.
            </p>
          </div>
        )}

        {/* The chat — the entire interface */}
        <ManualChat
          personId={personId}
          personName={person.name}
          manual={manual}
        />
      </div>
    </MainLayout>
  );
}
