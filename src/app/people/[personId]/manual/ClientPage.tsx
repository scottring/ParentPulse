'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById, usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { useFamily } from '@/hooks/useFamily';
import { Contribution } from '@/types/person-manual';
import { isKidObserverEligible } from '@/utils/age';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import MainLayout from '@/components/layout/MainLayout';
import { getSelfOnboardingSections } from '@/config/self-questions';
import { getOnboardingSections, OnboardingQuestion } from '@/config/onboarding-questions';
import { ManualChat } from '@/components/manual/ManualChat';

export function ManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading, fetchByPersonId } = usePersonManual(personId);
  const { contributions, loading: contribLoading, updateContribution } = useContribution(manual?.manualId);
  const { family, inviteParent } = useFamily();
  const { people } = usePerson();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  type ViewMode = 'synthesized' | 'perspectives' | 'gaps';
  const [viewMode, setViewMode] = useState<ViewMode>(manual?.synthesizedContent ? 'synthesized' : 'perspectives');

  // Shared synthesis handler: runs synthesis then refreshes dimension assessments (life wheel)
  const runSynthesis = async () => {
    setSynthesizing(true);
    try {
      const synthesize = httpsCallable(functions, 'synthesizeManualContent');
      await synthesize({ manualId: manual?.manualId });
      // Refresh assessment scores so the life wheel updates with new synthesis data
      try {
        const seedAssessments = httpsCallable(functions, 'seedDimensionAssessments');
        await seedAssessments({});
      } catch (assessErr) {
        console.warn('Assessment refresh after synthesis failed (non-critical):', assessErr);
      }
      await fetchByPersonId(personId);
      setViewMode('synthesized');
    } catch (err) {
      console.error('Synthesis failed:', err);
    } finally {
      setSynthesizing(false);
    }
  };

  const loading = authLoading || personLoading || manualLoading || contribLoading;

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

  const selfContributions = contributions.filter((c) => c.perspectiveType === 'self');
  const observerContributions = contributions.filter((c) => c.perspectiveType === 'observer');
  const isSelf = person.linkedUserId === user.userId;
  const hasSelfPerspective = selfContributions.length > 0;
  const hasObserverPerspective = observerContributions.length > 0;
  const hasAnyPerspective = hasSelfPerspective || hasObserverPerspective;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}
            className="hover:opacity-70 transition-opacity"
          >
            &larr; Back to dashboard
          </Link>
          <h1 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '36px', fontWeight: 400, color: '#3A3530' }} className="mt-2">
            {person.name}&apos;s Manual
          </h1>
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }} className="mt-1">
            {isSelf ? 'Your operating manual' : `Operating manual for ${person.name}`}
          </p>
        </div>


        {/* Ask the Manual button */}
        {hasAnyPerspective && (
          <button
            onClick={() => setShowChat(true)}
            className="w-full mb-6 p-4 glass-card-strong rounded-full transition-all hover:shadow-lg flex items-center justify-center gap-3"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#3A3530' }}
          >
            <span className="px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#7C9082', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Ask</span>
            Ask about {person.name}
          </button>
        )}

        {/* Manual Chat Overlay */}
        {showChat && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/30">
            <div className="w-full max-w-xl h-full">
              <ManualChat
                personId={personId}
                personName={person.name}
                manual={manual}
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        )}

        {/* Perspective Status */}
        <div className="glass-card p-6 mb-6">
          <h2 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8A8078' }} className="mb-4">Perspectives</h2>
          <div className="space-y-3">
            {/* Self perspective */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasSelfPerspective ? 'bg-green-500' : ''}`} style={!hasSelfPerspective ? { backgroundColor: '#8A8078', opacity: 0.4 } : {}} />
                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}>
                  {isSelf ? 'Your perspective' : `${person.name}'s own perspective`}
                </span>
              </div>
              {hasSelfPerspective ? (
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#16a34a' }}>
                    {selfContributions.length} Contribution{selfContributions.length !== 1 ? 's' : ''}
                  </span>
                  {(isSelf || selfContributions.some(c => c.contributorId === user.userId)) && (
                    <Link
                      href={`/people/${personId}/manual/self-onboard`}
                      style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      Revise &rarr;
                    </Link>
                  )}
                </div>
              ) : isSelf ? (
                <Link
                  href={`/people/${personId}/manual/self-onboard`}
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
                  className="hover:opacity-70 transition-opacity"
                >
                  Add your perspective &rarr;
                </Link>
              ) : person.canSelfContribute && person.relationshipType === 'child' ? (
                <Link
                  href={`/people/${personId}/manual/kid-session`}
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
                  className="hover:opacity-70 transition-opacity"
                >
                  Let {person.name} add their voice &rarr;
                </Link>
              ) : person.canSelfContribute && person.relationshipType !== 'child' ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/people/${personId}/manual/self-onboard`}
                    style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    Start self-assessment &rarr;
                  </Link>
                  {!person.linkedUserId && (
                    <button
                      onClick={() => setShowInvite(true)}
                      style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      or invite
                    </button>
                  )}
                </div>
              ) : (
                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8A8078' }}>Awaiting</span>
              )}
            </div>

            {/* Observer perspectives */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasObserverPerspective ? 'bg-green-500' : ''}`} style={!hasObserverPerspective ? { backgroundColor: '#8A8078', opacity: 0.4 } : {}} />
                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}>
                  Observer perspectives
                </span>
              </div>
              <div className="flex items-center gap-3">
                {hasObserverPerspective && (
                  <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#16a34a' }}>
                    {observerContributions.length} Contribution{observerContributions.length !== 1 ? 's' : ''}
                  </span>
                )}
                {!isSelf && (
                  <Link
                    href={`/people/${personId}/manual/onboard`}
                    style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    {observerContributions.some(c => c.contributorId === user.userId) ? 'Revise' : hasObserverPerspective ? 'Add more' : 'Add your observations'} &rarr;
                  </Link>
                )}
              </div>
            </div>

            {/* Kid observer perspectives */}
            {(() => {
              const eligibleKids = people.filter(
                p => p.relationshipType === 'child' &&
                  p.personId !== personId &&
                  (!p.dateOfBirth || isKidObserverEligible(p.dateOfBirth))
              );
              if (eligibleKids.length === 0) return null;

              const kidObserverContribs = contributions.filter(
                c => c.relationshipToSubject === 'child-observer'
              );

              return (
                <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${kidObserverContribs.length > 0 ? 'bg-green-500' : ''}`} style={kidObserverContribs.length === 0 ? { backgroundColor: '#8A8078', opacity: 0.4 } : {}} />
                    <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}>
                      Kid observer perspectives
                    </span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {eligibleKids.map(kid => {
                      const kidContrib = kidObserverContribs.find(c => c.contributorName === kid.name);
                      return (
                        <div key={kid.personId} className="flex items-center justify-between">
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5C5347' }}>
                            {kid.name}
                          </span>
                          {kidContrib?.status === 'complete' ? (
                            <Link
                              href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`}
                              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#16a34a' }}
                              className="hover:opacity-70"
                            >
                              Done · Revise &rarr;
                            </Link>
                          ) : kidContrib?.status === 'draft' ? (
                            <Link
                              href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`}
                              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
                              className="hover:opacity-70"
                            >
                              Continue &rarr;
                            </Link>
                          ) : (
                            <Link
                              href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`}
                              style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
                              className="hover:opacity-70"
                            >
                              Let {kid.name} share &rarr;
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Invite Form */}
        {showInvite && !inviteSent && (
          <div className="glass-card p-6 mb-6" style={{ border: '1px solid rgba(124,144,130,0.3)' }}>
            <h3 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', color: '#3A3530' }} className="mb-2">
              Invite {person.name} to Relish
            </h3>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }} className="mb-4">
              They&apos;ll create their own account and can add their perspective to this manual.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={`${person.name}'s email address`}
                className="flex-1 px-3 py-2 rounded-xl focus:outline-none"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.5)', color: '#3A3530' }}
              />
              <button
                onClick={async () => {
                  if (!inviteEmail.trim()) return;
                  setInviting(true);
                  setInviteError(null);
                  try {
                    await inviteParent(inviteEmail.trim());
                    setInviteSent(true);
                  } catch (err: any) {
                    console.error('Invite failed:', err);
                    setInviteError(err.message || 'Failed to send invite');
                  } finally {
                    setInviting(false);
                  }
                }}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-full text-white disabled:opacity-50 transition-all"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#7C9082' }}
              >
                {inviting ? 'Sending...' : 'Send invite'}
              </button>
              <button
                onClick={() => setShowInvite(false)}
                className="px-3 py-2 rounded-full transition-all"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468', border: '1px solid rgba(255,255,255,0.4)' }}
              >
                Cancel
              </button>
            </div>
            {inviteError && (
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#dc2626' }} className="mt-2">{inviteError}</p>
            )}
          </div>
        )}
        {inviteSent && (
          <div className="glass-card p-6 mb-6" style={{ border: '1px solid rgba(22,163,74,0.3)' }}>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }}>
              Invite sent to <strong>{inviteEmail}</strong>. When they register with this email, they&apos;ll automatically join your family and can add their perspective.
            </p>
          </div>
        )}

        {/* Main Content Area */}
        {!hasAnyPerspective ? (
          /* Empty State */
          <div className="glass-card p-12 text-center" style={{ border: '1px dashed rgba(138,128,120,0.4)' }}>
            <div className="text-4xl mb-4">&#128214;</div>
            <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', color: '#3A3530' }} className="mb-2">
              {isSelf ? 'Your manual is empty' : `${person.name}'s manual is empty`}
            </h2>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }} className="mb-6 max-w-md mx-auto">
              {isSelf
                ? 'Start by telling us about yourself. Your answers will help the people who care about you understand you better.'
                : `Start by sharing what you know about ${person.name}. They can add their own perspective later.`}
            </p>
            {isSelf ? (
              <Link
                href={`/people/${personId}/manual/self-onboard`}
                className="inline-block px-8 py-3 rounded-full text-white transition-all hover:shadow-lg"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#3A3530' }}
              >
                Tell us about yourself &rarr;
              </Link>
            ) : (
              <Link
                href={`/people/${personId}/manual/onboard`}
                className="inline-block px-8 py-3 rounded-full text-white transition-all hover:shadow-lg"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#3A3530' }}
              >
                Share what you know &rarr;
              </Link>
            )}
          </div>
        ) : (
          /* Has perspectives — show view mode tabs + content */
          <div className="space-y-6">
            {/* Synthesis readiness banner */}
            {!manual.synthesizedContent && hasAnyPerspective && (
              <div className="glass-card p-6" style={{ border: '1px solid rgba(124,144,130,0.3)' }}>
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">&#10024;</div>
                  <div className="flex-1">
                    <h3 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', color: '#3A3530' }} className="mb-1">
                      Ready to synthesize
                    </h3>
                    <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }} className="mb-3 leading-relaxed">
                      {hasSelfPerspective && hasObserverPerspective
                        ? `You have both self and observer perspectives. Synthesize now to see where they align, where they differ, and what blind spots emerge.`
                        : hasSelfPerspective
                        ? `${isSelf ? 'Your' : `${person.name}'s`} self-perspective is in. You can synthesize now, or invite someone to add an observer perspective first for richer insights.`
                        : `An observer perspective is in. ${isSelf ? 'Add your own perspective' : `Ask ${person.name} to add theirs`} for the richest synthesis, or synthesize now with what you have.`}
                    </p>
                    <button
                      onClick={runSynthesis}
                      disabled={synthesizing}
                      className="px-6 py-2.5 rounded-full text-white disabled:opacity-50 transition-all hover:shadow-lg"
                      style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#7C9082' }}
                    >
                      {synthesizing ? 'Synthesizing...' : 'Synthesize now'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* New data available banner */}
            {manual.synthesizedContent && hasAnyPerspective && (
              (() => {
                const synthDate = manual.synthesizedContent.lastSynthesizedAt?.toDate() || new Date(0);
                const hasNewerContribution = contributions.some((c) => {
                  const contribDate = c.updatedAt?.toDate() || c.createdAt?.toDate() || new Date(0);
                  return contribDate > synthDate;
                });
                if (!hasNewerContribution) return null;
                return (
                  <div className="glass-card px-6 py-4 flex items-center justify-between">
                    <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }}>
                      <strong>New data available</strong> since last synthesis. Re-synthesize to update insights.
                    </p>
                    <button
                      onClick={runSynthesis}
                      disabled={synthesizing}
                      className="px-4 py-2 rounded-full text-white disabled:opacity-50 transition-all flex-shrink-0 hover:shadow-lg"
                      style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#7C9082' }}
                    >
                      {synthesizing ? 'Updating...' : 'Re-synthesize'}
                    </button>
                  </div>
                );
              })()
            )}

            {/* View mode tabs */}
            <div className="flex glass-card overflow-hidden">
              {([
                { mode: 'synthesized' as ViewMode, label: 'Synthesized', available: !!manual.synthesizedContent },
                { mode: 'perspectives' as ViewMode, label: 'By Perspective', available: true },
                { mode: 'gaps' as ViewMode, label: 'Gaps & Insights', available: !!manual.synthesizedContent },
              ]).map(({ mode, label, available }) => (
                <button
                  key={mode}
                  onClick={() => available && setViewMode(mode)}
                  className="flex-1 px-4 py-3 transition-all"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    ...(viewMode === mode
                      ? { backgroundColor: '#7C9082', color: 'white' }
                      : available
                      ? { color: '#5C5347' }
                      : { color: '#8A8078', opacity: 0.4, cursor: 'not-allowed' })
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ========== SYNTHESIZED VIEW ========== */}
            {viewMode === 'synthesized' && manual.synthesizedContent && (
              <div className="space-y-6">
                {/* Overview */}
                <div className="glass-card p-6">
                  <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530', lineHeight: '1.7' }}>
                    {manual.synthesizedContent.overview}
                  </p>
                </div>

                {/* Alignments */}
                {manual.synthesizedContent.alignments.length > 0 && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(22,163,74,0.06)' }}>
                      <h3 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#16a34a' }}>Alignments</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {manual.synthesizedContent.alignments.map((item) => (
                        <div key={item.id} className="border-l-2 border-green-400 pl-4">
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#16a34a' }}>{item.topic}</span>
                          {item.selfPerspective && (
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mt-1">
                              {person.name} says: &ldquo;{item.selfPerspective}&rdquo;
                            </p>
                          )}
                          {item.observerPerspective && (
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mt-1">
                              Observer sees: &ldquo;{item.observerPerspective}&rdquo;
                            </p>
                          )}
                          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }} className="mt-1">{item.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gaps */}
                {manual.synthesizedContent.gaps.length > 0 && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(124,144,130,0.08)' }}>
                      <h3 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#7C9082' }}>Gaps</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {manual.synthesizedContent.gaps.map((item) => (
                        <div key={item.id} className={`border-l-2 pl-4 ${
                          item.gapSeverity === 'significant_gap' ? 'border-red-400' : ''
                        }`} style={item.gapSeverity !== 'significant_gap' ? { borderLeftColor: '#7C9082' } : {}}>
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: item.gapSeverity === 'significant_gap' ? '#dc2626' : '#7C9082' }}>{item.topic}</span>
                          {item.selfPerspective && (
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mt-1">
                              {person.name} says: &ldquo;{item.selfPerspective}&rdquo;
                            </p>
                          )}
                          {item.observerPerspective && (
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mt-1">
                              Observer sees: &ldquo;{item.observerPerspective}&rdquo;
                            </p>
                          )}
                          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }} className="mt-1">{item.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blind Spots */}
                {manual.synthesizedContent.blindSpots?.length > 0 && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(147,51,234,0.06)' }}>
                      <h3 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#9333ea' }}>Blind Spots</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {manual.synthesizedContent.blindSpots.map((item) => (
                        <div key={item.id} className="border-l-2 border-purple-400 pl-4">
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#9333ea' }}>{item.topic}</span>
                          {item.selfPerspective && (
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mt-1">
                              Only {person.name} sees: &ldquo;{item.selfPerspective}&rdquo;
                            </p>
                          )}
                          {item.observerPerspective && (
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mt-1">
                              Only observer sees: &ldquo;{item.observerPerspective}&rdquo;
                            </p>
                          )}
                          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }} className="mt-1">{item.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-synthesize button */}
                <button
                  onClick={runSynthesis}
                  disabled={synthesizing}
                  className="w-full px-6 py-3 glass-card rounded-full disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#5C5347' }}
                >
                  {synthesizing ? 'Re-synthesizing...' : 'Re-synthesize with latest data'}
                </button>
              </div>
            )}

            {/* Synthesized view but no synthesis yet */}
            {viewMode === 'synthesized' && !manual.synthesizedContent && (
              <div className="glass-card p-8 text-center" style={{ border: '1px solid rgba(124,144,130,0.3)' }}>
                <h3 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', color: '#3A3530' }} className="mb-2">No synthesis yet</h3>
                <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }} className="mb-4">
                  Run AI synthesis to generate insights from the available perspectives.
                </p>
                <button
                  onClick={runSynthesis}
                  disabled={synthesizing}
                  className="px-6 py-3 rounded-full text-white disabled:opacity-50 transition-all hover:shadow-lg"
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#7C9082' }}
                >
                  {synthesizing ? 'Synthesizing...' : 'Synthesize now'}
                </button>
              </div>
            )}

            {/* ========== BY PERSPECTIVE VIEW ========== */}
            {viewMode === 'perspectives' && (
              <div className="space-y-6">
                {hasSelfPerspective && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
                      <h3 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8A8078' }}>
                        {isSelf ? 'Your perspective' : `${person.name}'s perspective`}
                      </h3>
                      {isSelf && (
                        <Link href={`/people/${personId}/manual/self-onboard`} style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }} className="hover:opacity-70">
                          Add more &rarr;
                        </Link>
                      )}
                    </div>
                    <div className="p-6">
                      {selfContributions.map((c) => (
                        <ContributionDisplay key={c.contributionId} contribution={c} personName={person.name} personId={personId} editable={isSelf || c.contributorId === user.userId} onUpdate={updateContribution} />
                      ))}
                    </div>
                  </div>
                )}

                {hasObserverPerspective && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}>
                      <h3 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#8A8078' }}>Observer perspectives</h3>
                      <Link href={`/people/${personId}/manual/onboard`} style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }} className="hover:opacity-70">
                        Add more &rarr;
                      </Link>
                    </div>
                    <div className="p-6">
                      {observerContributions.map((c) => (
                        <div key={c.contributionId}>
                          <ContributionDisplay contribution={c} personName={person.name} personId={personId} editable={c.contributorId === user.userId} onUpdate={updateContribution} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========== GAPS & INSIGHTS VIEW ========== */}
            {viewMode === 'gaps' && manual.synthesizedContent && (
              <div className="space-y-6">
                {/* Gaps — the main event */}
                {manual.synthesizedContent.gaps.length > 0 && (
                  <div className="space-y-4">
                    {manual.synthesizedContent.gaps.map((item) => (
                      <div key={item.id} className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2 h-2 rounded-full ${
                            item.gapSeverity === 'significant_gap' ? 'bg-red-500' : ''
                          }`} style={item.gapSeverity !== 'significant_gap' ? { backgroundColor: '#7C9082' } : {}} />
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#3A3530' }}>{item.topic}</span>
                          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: item.gapSeverity === 'significant_gap' ? '#dc2626' : '#7C9082' }}>
                            {item.gapSeverity === 'significant_gap' ? 'Significant' : 'Minor'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div style={{ borderLeft: '2px solid #7C9082' }} className="pl-3">
                            <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>{person.name}</span>
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }} className="mt-1">
                              {item.selfPerspective || <span style={{ color: '#8A8078', fontStyle: 'italic' }}>No self-perspective</span>}
                            </p>
                          </div>
                          <div className="border-l-2 border-blue-300 pl-3">
                            <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>Observer</span>
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }} className="mt-1">
                              {item.observerPerspective || <span style={{ color: '#8A8078', fontStyle: 'italic' }}>No observer perspective</span>}
                            </p>
                          </div>
                        </div>
                        <p className="p-3 rounded-xl" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530', background: 'rgba(255,255,255,0.4)' }}>{item.synthesis}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blind spots */}
                {manual.synthesizedContent.blindSpots?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#9333ea' }} className="mb-3">Blind Spots</h3>
                    {manual.synthesizedContent.blindSpots.map((item) => (
                      <div key={item.id} className="glass-card p-6 mb-4" style={{ border: '1px solid rgba(147,51,234,0.2)' }}>
                        <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#3A3530' }}>{item.topic}</span>
                        <div className="grid grid-cols-2 gap-4 mt-3 mb-3">
                          <div style={{ borderLeft: '2px solid #7C9082' }} className="pl-3">
                            <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>{person.name}</span>
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }} className="mt-1">
                              {item.selfPerspective || <span style={{ color: '#8A8078', fontStyle: 'italic' }}>--</span>}
                            </p>
                          </div>
                          <div className="border-l-2 border-blue-300 pl-3">
                            <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>Observer</span>
                            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }} className="mt-1">
                              {item.observerPerspective || <span style={{ color: '#8A8078', fontStyle: 'italic' }}>--</span>}
                            </p>
                          </div>
                        </div>
                        <p className="p-3 rounded-xl" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530', background: 'rgba(147,51,234,0.06)' }}>{item.synthesis}</p>
                      </div>
                    ))}
                  </div>
                )}

                {manual.synthesizedContent.gaps.length === 0 && (!manual.synthesizedContent.blindSpots || manual.synthesizedContent.blindSpots.length === 0) && (
                  <div className="glass-card p-8 text-center" style={{ border: '1px dashed rgba(138,128,120,0.4)' }}>
                    <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }}>No gaps or blind spots detected. Perspectives are well aligned.</p>
                  </div>
                )}
              </div>
            )}

            {/* CTAs for missing perspectives */}
            {!hasSelfPerspective && isSelf && (
              <Link
                href={`/people/${personId}/manual/self-onboard`}
                className="block glass-card p-6 text-center hover:shadow-lg transition-all"
                style={{ border: '1px dashed rgba(124,144,130,0.5)' }}
              >
                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}>
                  Add your own perspective &rarr;
                </span>
                <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }} className="mt-1">
                  Others have shared their observations. Now add your voice.
                </p>
              </Link>
            )}

            {!hasObserverPerspective && !isSelf && (
              <Link
                href={`/people/${personId}/manual/onboard`}
                className="block glass-card p-6 text-center hover:shadow-lg transition-all"
                style={{ border: '1px dashed rgba(124,144,130,0.5)' }}
              >
                <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}>
                  Share what you know &rarr;
                </span>
                <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#7C7468' }} className="mt-1">
                  Add your perspective about {person.name}.
                </p>
              </Link>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ==================== Contribution Display ====================

const SECTION_LABELS: Record<string, string> = {
  overview: 'About You',
  triggers: 'Triggers & Patterns',
  what_works: 'What Works',
  boundaries: 'Boundaries & Needs',
  communication: 'Communication',
  strengths: 'Strengths',
  needs: 'Needs',
};

// Build separate lookups for self vs observer questions
interface QuestionMeta {
  question: string;
  questionType?: string;
  scale?: import('@/config/onboarding-questions').ScaleConfig;
  options?: import('@/config/onboarding-questions').QuestionOption[];
}

function buildQuestionLookups() {
  const selfLookup: Record<string, QuestionMeta> = {};
  const observerLookup: Record<string, QuestionMeta> = {};

  for (const section of getSelfOnboardingSections()) {
    for (const q of section.questions) {
      selfLookup[q.id] = { question: q.question, questionType: q.questionType, scale: q.scale, options: q.options };
    }
  }

  // Build observer lookups for all relationship types
  const relTypes: Array<import('@/types/person-manual').RelationshipType> = ['spouse', 'child', 'friend', 'sibling', 'elderly_parent', 'professional', 'other'];
  for (const relType of relTypes) {
    for (const section of getOnboardingSections(relType)) {
      for (const q of section.questions) {
        if (!observerLookup[q.id]) {
          observerLookup[q.id] = { question: q.question, questionType: q.questionType, scale: q.scale, options: q.options };
        }
      }
    }
  }

  return { selfLookup, observerLookup };
}

const { selfLookup, observerLookup } = buildQuestionLookups();

function formatScaleValue(value: number, scale?: import('@/config/onboarding-questions').ScaleConfig): string {
  if (!scale) return String(value);
  const range = scale.max - scale.min;
  const position = (value - scale.min) / range;
  if (position <= 0) return scale.minLabel;
  if (position >= 1) return scale.maxLabel;
  if (scale.midLabel && Math.abs(position - 0.5) < 0.01) return scale.midLabel;
  if (position < 0.5) return `${scale.minLabel} — leaning (${value}/${scale.max})`;
  return `${scale.maxLabel} — leaning (${value}/${scale.max})`;
}

function formatOptionValue(value: string | number, options?: import('@/config/onboarding-questions').QuestionOption[]): string {
  if (!options) return String(value);
  const match = options.find((o) => o.value === value);
  return match ? match.label : String(value);
}

function extractAnswerText(answer: any, meta?: QuestionMeta): string | null {
  if (typeof answer === 'string') {
    return answer.trim() || null;
  }
  if (typeof answer === 'object' && answer !== null && 'primary' in answer) {
    const primary = answer.primary;
    const qualitative = answer.qualitative;
    const parts: string[] = [];

    if (typeof primary === 'string' && primary.trim()) {
      if (meta?.options) {
        parts.push(formatOptionValue(primary, meta.options));
      } else {
        parts.push(primary.trim());
      }
    } else if (typeof primary === 'number') {
      parts.push(formatScaleValue(primary, meta?.scale));
    } else if (Array.isArray(primary)) {
      if (meta?.options) {
        parts.push(primary.map((v) => formatOptionValue(v, meta.options)).join(', '));
      } else {
        parts.push(primary.join(', '));
      }
    }

    if (typeof qualitative === 'string' && qualitative.trim()) {
      parts.push(qualitative.trim());
    }

    return parts.length > 0 ? parts.join(' — ') : null;
  }
  if (typeof answer === 'number') return String(answer);
  return null;
}

function ContributionDisplay({
  contribution,
  personName,
  personId,
  editable = false,
  onUpdate,
}: {
  contribution: Contribution;
  personName?: string;
  personId?: string;
  editable?: boolean;
  onUpdate?: (id: string, updates: Partial<Pick<Contribution, 'answers' | 'status' | 'draftProgress'>>) => Promise<boolean>;
}) {
  const isDraft = contribution.status === 'draft';
  const answers = contribution.answers;
  const lookup = contribution.perspectiveType === 'self' ? selfLookup : observerLookup;

  const resolveQuestion = (questionId: string): string | null => {
    const meta = lookup[questionId];
    if (!meta) return null;
    return personName ? meta.question.replace(/\{\{personName\}\}/g, personName) : meta.question;
  };

  const getQuestionMeta = (questionId: string): QuestionMeta | undefined => lookup[questionId];

  // Answers can be nested { sectionId: { questionId: value } } or flat { questionId: value }
  const isNested = Object.values(answers).some(
    (v) => typeof v === 'object' && v !== null && !('primary' in v) && !Array.isArray(v) && typeof Object.values(v)[0] !== 'undefined'
  );

  const handleSave = useCallback(async (path: string[], newValue: string) => {
    if (!onUpdate) return;
    const updated = JSON.parse(JSON.stringify(answers));
    if (path.length === 2) {
      if (!updated[path[0]]) updated[path[0]] = {};
      updated[path[0]][path[1]] = newValue;
    } else if (path.length === 1) {
      updated[path[0]] = newValue;
    }
    await onUpdate(contribution.contributionId, { answers: updated });
  }, [answers, contribution.contributionId, onUpdate]);

  const draftBanner = isDraft && personId ? (
    <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: 'rgba(124,144,130,0.1)', border: '1px solid rgba(124,144,130,0.2)' }}>
      <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C9082' }}>
        In progress — not all questions answered yet
      </span>
      <Link
        href={`/people/${personId}/manual/${contribution.perspectiveType === 'self' ? 'self-onboard' : 'onboard'}`}
        style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, color: '#7C9082' }}
        className="hover:opacity-70"
      >
        Continue &rarr;
      </Link>
    </div>
  ) : null;

  const updatedDate = contribution.updatedAt?.toDate?.()
    ? contribution.updatedAt.toDate()
    : contribution.updatedAt?.seconds
    ? new Date(contribution.updatedAt.seconds * 1000)
    : null;

  const attribution = (
    <div className="flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }}>
      <span>{contribution.contributorName}</span>
      <span>&middot;</span>
      <span>{contribution.perspectiveType === 'self' ? 'self' : contribution.relationshipToSubject || 'observer'}</span>
      {updatedDate && (
        <>
          <span>&middot;</span>
          <span>{updatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </>
      )}
      {isDraft && <span style={{ color: '#7C9082', fontWeight: 600 }} className="ml-1">Draft</span>}
    </div>
  );

  if (isNested) {
    return (
      <div className="space-y-6">
        {attribution}
        {draftBanner}
        {Object.entries(answers).map(([sectionId, sectionAnswers]) => {
          if (typeof sectionAnswers !== 'object' || sectionAnswers === null) return null;
          const entries = Object.entries(sectionAnswers as Record<string, any>);
          const nonEmpty = entries.filter(([qId, v]) => extractAnswerText(v, getQuestionMeta(qId)));
          if (nonEmpty.length === 0) return null;

          return (
            <div key={sectionId}>
              <h4 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#7C9082' }} className="mb-3">
                {SECTION_LABELS[sectionId] || sectionId.replace(/_/g, ' ').toUpperCase()}
              </h4>
              <div className="space-y-4">
                {nonEmpty.map(([questionId, answer]) => {
                  const text = extractAnswerText(answer, getQuestionMeta(questionId));
                  if (!text) return null;
                  const questionText = resolveQuestion(questionId);

                  return (
                    <EditableAnswer
                      key={questionId}
                      questionText={questionText}
                      answerText={text}
                      editable={editable}
                      onSave={(newValue) => handleSave([sectionId, questionId], newValue)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const entries = Object.entries(answers);
  const nonEmpty = entries.filter(([qId, v]) => extractAnswerText(v, getQuestionMeta(qId)));

  return (
    <div className="space-y-4">
      {attribution}
      {draftBanner}
      {nonEmpty.map(([questionId, answer]) => {
        const text = extractAnswerText(answer, getQuestionMeta(questionId));
        if (!text) return null;
        const questionText = resolveQuestion(questionId);

        return (
          <EditableAnswer
            key={questionId}
            questionText={questionText}
            answerText={text}
            editable={editable}
            onSave={(newValue) => handleSave([questionId], newValue)}
          />
        );
      })}
    </div>
  );
}

// ==================== Editable Answer ====================

function EditableAnswer({
  questionText,
  answerText,
  editable,
  onSave,
}: {
  questionText: string | null;
  answerText: string;
  editable: boolean;
  onSave: (newValue: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(answerText);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value.trim() === answerText) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(value.trim());
      setEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="pl-4" style={{ borderLeft: '2px solid #7C9082' }}>
        {questionText && (
          <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mb-1">{questionText}</p>
        )}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setValue(answerText); setEditing(false); }
          }}
          rows={3}
          className="w-full px-3 py-2 rounded-xl focus:outline-none resize-y"
          style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530', border: '1px solid rgba(124,144,130,0.3)', background: 'rgba(124,144,130,0.06)' }}
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 rounded-full text-white disabled:opacity-50"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#3A3530' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => { setValue(answerText); setEditing(false); }}
            className="px-3 py-1 rounded-full"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            Cancel
          </button>
          <span style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#8A8078' }} className="self-center ml-auto">
            Ctrl+Enter to save, Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pl-4 ${editable ? 'cursor-pointer transition-colors' : ''}`}
      style={{
        borderLeft: '2px solid rgba(255,255,255,0.4)',
        ...(editable ? {} : {})
      }}
      onClick={editable ? () => setEditing(true) : undefined}
      title={editable ? 'Click to edit' : undefined}
      onMouseEnter={editable ? (e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = '#7C9082'; } : undefined}
      onMouseLeave={editable ? (e) => { (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(255,255,255,0.4)'; } : undefined}
    >
      {questionText && (
        <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }} className="mb-1">{questionText}</p>
      )}
      <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#3A3530' }} className="whitespace-pre-line">{answerText}</p>
    </div>
  );
}
