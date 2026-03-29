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

export default function ManualPage({ params }: { params: Promise<{ personId: string }> }) {
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
  type ViewMode = 'synthesized' | 'perspectives' | 'gaps';
  const [viewMode, setViewMode] = useState<ViewMode>('synthesized');

  const loading = authLoading || personLoading || manualLoading || contribLoading;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!user || !person || !manual) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="font-mono text-slate-500">Manual not found.</p>
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
            href="/people"
            className="font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            &larr; BACK TO PEOPLE
          </Link>
          <h1 className="font-mono font-bold text-2xl text-slate-800 mt-2">
            {person.name}&apos;s Manual
          </h1>
          <p className="font-mono text-sm text-slate-500 mt-1">
            {isSelf ? 'Your operating manual' : `Operating manual for ${person.name}`}
          </p>
        </div>

        {/* Perspective Status */}
        <div className="border-2 border-slate-200 bg-white p-6 mb-6">
          <h2 className="font-mono font-bold text-sm text-slate-800 mb-4">PERSPECTIVES</h2>
          <div className="space-y-3">
            {/* Self perspective */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasSelfPerspective ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className="font-mono text-sm text-slate-700">
                  {isSelf ? 'Your perspective' : `${person.name}'s own perspective`}
                </span>
              </div>
              {hasSelfPerspective ? (
                <span className="font-mono text-xs text-green-600 font-bold">
                  {selfContributions.length} CONTRIBUTION{selfContributions.length !== 1 ? 'S' : ''}
                </span>
              ) : isSelf ? (
                <Link
                  href={`/people/${personId}/manual/self-onboard`}
                  className="font-mono text-xs text-amber-600 font-bold hover:text-amber-700 transition-colors"
                >
                  ADD YOUR PERSPECTIVE &rarr;
                </Link>
              ) : person.canSelfContribute && person.relationshipType === 'child' ? (
                <Link
                  href={`/people/${personId}/manual/kid-session`}
                  className="font-mono text-xs text-amber-600 font-bold hover:text-amber-700 transition-colors"
                >
                  LET {person.name.toUpperCase()} ADD THEIR VOICE &rarr;
                </Link>
              ) : person.canSelfContribute && person.relationshipType !== 'child' ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/people/${personId}/manual/self-onboard`}
                    className="font-mono text-xs text-amber-600 font-bold hover:text-amber-700 transition-colors"
                  >
                    START SELF-ASSESSMENT &rarr;
                  </Link>
                  {!person.linkedUserId && (
                    <button
                      onClick={() => setShowInvite(true)}
                      className="font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      or INVITE
                    </button>
                  )}
                </div>
              ) : (
                <span className="font-mono text-xs text-slate-400">AWAITING</span>
              )}
            </div>

            {/* Observer perspectives */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${hasObserverPerspective ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className="font-mono text-sm text-slate-700">
                  Observer perspectives
                </span>
              </div>
              <div className="flex items-center gap-3">
                {hasObserverPerspective && (
                  <span className="font-mono text-xs text-green-600 font-bold">
                    {observerContributions.length} CONTRIBUTION{observerContributions.length !== 1 ? 'S' : ''}
                  </span>
                )}
                {!isSelf && (
                  <Link
                    href={`/people/${personId}/manual/onboard`}
                    className="font-mono text-xs text-blue-600 font-bold hover:text-blue-700 transition-colors"
                  >
                    {hasObserverPerspective ? 'ADD MORE' : 'ADD YOUR OBSERVATIONS'} &rarr;
                  </Link>
                )}
              </div>
            </div>

            {/* Kid observer perspectives */}
            {(() => {
              // Show kids who are eligible observers: either confirmed age 8+ via DOB,
              // or children without DOB (assume eligible since parent marked them as child)
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
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${kidObserverContribs.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className="font-mono text-sm text-slate-700">
                      Kid observer perspectives
                    </span>
                  </div>
                  <div className="ml-6 space-y-1">
                    {eligibleKids.map(kid => {
                      const kidContrib = kidObserverContribs.find(c => c.contributorName === kid.name);
                      return (
                        <div key={kid.personId} className="flex items-center justify-between">
                          <span className="font-mono text-xs text-slate-600">
                            {kid.name}
                          </span>
                          {kidContrib?.status === 'complete' ? (
                            <span className="font-mono text-xs text-green-600 font-bold">DONE</span>
                          ) : kidContrib?.status === 'draft' ? (
                            <Link
                              href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`}
                              className="font-mono text-xs text-amber-600 font-bold hover:text-amber-700"
                            >
                              CONTINUE &rarr;
                            </Link>
                          ) : (
                            <Link
                              href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`}
                              className="font-mono text-xs text-purple-600 font-bold hover:text-purple-700"
                            >
                              LET {kid.name.toUpperCase()} SHARE &rarr;
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
          <div className="border-2 border-amber-300 bg-amber-50 p-6 mb-6">
            <h3 className="font-mono font-bold text-sm text-amber-800 mb-2">
              INVITE {person.name.toUpperCase()} TO RELISH
            </h3>
            <p className="font-mono text-xs text-amber-700 mb-4">
              They&apos;ll create their own account and can add their perspective to this manual.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={`${person.name}'s email address`}
                className="flex-1 px-3 py-2 border-2 border-amber-300 bg-white font-mono text-sm focus:outline-none focus:border-amber-500"
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
                className="px-4 py-2 bg-amber-600 text-white font-mono text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-all"
              >
                {inviting ? 'SENDING...' : 'SEND INVITE'}
              </button>
              <button
                onClick={() => setShowInvite(false)}
                className="px-3 py-2 border border-amber-300 font-mono text-xs text-amber-700 hover:border-amber-500"
              >
                CANCEL
              </button>
            </div>
            {inviteError && (
              <p className="font-mono text-xs text-red-600 mt-2">{inviteError}</p>
            )}
          </div>
        )}
        {inviteSent && (
          <div className="border-2 border-green-300 bg-green-50 p-6 mb-6">
            <p className="font-mono text-sm text-green-800">
              Invite sent to <strong>{inviteEmail}</strong>. When they register with this email, they&apos;ll automatically join your family and can add their perspective.
            </p>
          </div>
        )}

        {/* Main Content Area */}
        {!hasAnyPerspective ? (
          /* Empty State */
          <div className="border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <div className="text-4xl mb-4">&#128214;</div>
            <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
              {isSelf ? 'Your manual is empty' : `${person.name}'s manual is empty`}
            </h2>
            <p className="font-mono text-sm text-slate-500 mb-6 max-w-md mx-auto">
              {isSelf
                ? 'Start by telling us about yourself. Your answers will help the people who care about you understand you better.'
                : `Start by sharing what you know about ${person.name}. They can add their own perspective later.`}
            </p>
            {isSelf ? (
              <Link
                href={`/people/${personId}/manual/self-onboard`}
                className="inline-block px-8 py-3 border-2 border-slate-800 bg-slate-800 text-white font-mono font-bold hover:bg-slate-700 transition-all"
              >
                TELL US ABOUT YOURSELF &rarr;
              </Link>
            ) : (
              <Link
                href={`/people/${personId}/manual/onboard`}
                className="inline-block px-8 py-3 border-2 border-slate-800 bg-slate-800 text-white font-mono font-bold hover:bg-slate-700 transition-all"
              >
                SHARE WHAT YOU KNOW &rarr;
              </Link>
            )}
          </div>
        ) : (
          /* Has perspectives — show view mode tabs + content */
          <div className="space-y-6">
            {/* View mode tabs */}
            <div className="flex border-2 border-slate-200 bg-white">
              {([
                { mode: 'synthesized' as ViewMode, label: 'SYNTHESIZED', available: !!manual.synthesizedContent },
                { mode: 'perspectives' as ViewMode, label: 'BY PERSPECTIVE', available: true },
                { mode: 'gaps' as ViewMode, label: 'GAPS & INSIGHTS', available: !!manual.synthesizedContent },
              ]).map(({ mode, label, available }) => (
                <button
                  key={mode}
                  onClick={() => available && setViewMode(mode)}
                  className={`flex-1 px-4 py-3 font-mono text-xs font-bold transition-all ${
                    viewMode === mode
                      ? 'bg-slate-800 text-white'
                      : available
                      ? 'text-slate-600 hover:bg-slate-100'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ========== SYNTHESIZED VIEW ========== */}
            {viewMode === 'synthesized' && manual.synthesizedContent && (
              <div className="space-y-6">
                {/* Overview */}
                <div className="border-2 border-slate-200 bg-white p-6">
                  <p className="font-mono text-sm text-slate-800 leading-relaxed">
                    {manual.synthesizedContent.overview}
                  </p>
                </div>

                {/* Alignments */}
                {manual.synthesizedContent.alignments.length > 0 && (
                  <div className="border-2 border-green-200 bg-white">
                    <div className="border-b-2 border-green-200 px-6 py-3 bg-green-50">
                      <h3 className="font-mono font-bold text-sm text-green-800">ALIGNMENTS</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {manual.synthesizedContent.alignments.map((item) => (
                        <div key={item.id} className="border-l-2 border-green-400 pl-4">
                          <span className="font-mono text-xs text-green-600 font-bold">{item.topic}</span>
                          {item.selfPerspective && (
                            <p className="font-mono text-xs text-slate-500 mt-1">
                              {person.name} says: &ldquo;{item.selfPerspective}&rdquo;
                            </p>
                          )}
                          {item.observerPerspective && (
                            <p className="font-mono text-xs text-slate-500 mt-1">
                              Observer sees: &ldquo;{item.observerPerspective}&rdquo;
                            </p>
                          )}
                          <p className="font-mono text-sm text-slate-800 mt-1">{item.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gaps */}
                {manual.synthesizedContent.gaps.length > 0 && (
                  <div className="border-2 border-amber-200 bg-white">
                    <div className="border-b-2 border-amber-200 px-6 py-3 bg-amber-50">
                      <h3 className="font-mono font-bold text-sm text-amber-800">GAPS</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {manual.synthesizedContent.gaps.map((item) => (
                        <div key={item.id} className={`border-l-2 pl-4 ${
                          item.gapSeverity === 'significant_gap' ? 'border-red-400' : 'border-amber-400'
                        }`}>
                          <span className={`font-mono text-xs font-bold ${
                            item.gapSeverity === 'significant_gap' ? 'text-red-600' : 'text-amber-600'
                          }`}>{item.topic}</span>
                          {item.selfPerspective && (
                            <p className="font-mono text-xs text-slate-500 mt-1">
                              {person.name} says: &ldquo;{item.selfPerspective}&rdquo;
                            </p>
                          )}
                          {item.observerPerspective && (
                            <p className="font-mono text-xs text-slate-500 mt-1">
                              Observer sees: &ldquo;{item.observerPerspective}&rdquo;
                            </p>
                          )}
                          <p className="font-mono text-sm text-slate-800 mt-1">{item.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blind Spots */}
                {manual.synthesizedContent.blindSpots?.length > 0 && (
                  <div className="border-2 border-purple-200 bg-white">
                    <div className="border-b-2 border-purple-200 px-6 py-3 bg-purple-50">
                      <h3 className="font-mono font-bold text-sm text-purple-800">BLIND SPOTS</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {manual.synthesizedContent.blindSpots.map((item) => (
                        <div key={item.id} className="border-l-2 border-purple-400 pl-4">
                          <span className="font-mono text-xs text-purple-600 font-bold">{item.topic}</span>
                          {item.selfPerspective && (
                            <p className="font-mono text-xs text-slate-500 mt-1">
                              Only {person.name} sees: &ldquo;{item.selfPerspective}&rdquo;
                            </p>
                          )}
                          {item.observerPerspective && (
                            <p className="font-mono text-xs text-slate-500 mt-1">
                              Only observer sees: &ldquo;{item.observerPerspective}&rdquo;
                            </p>
                          )}
                          <p className="font-mono text-sm text-slate-800 mt-1">{item.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Re-synthesize button */}
                <button
                  onClick={async () => {
                    setSynthesizing(true);
                    try {
                      const synthesize = httpsCallable(functions, 'synthesizeManualContent');
                      await synthesize({ manualId: manual.manualId });
                      await fetchByPersonId(personId);
                    } catch (err) {
                      console.error('Synthesis failed:', err);
                    } finally {
                      setSynthesizing(false);
                    }
                  }}
                  disabled={synthesizing}
                  className="w-full px-6 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-600 hover:border-slate-800 disabled:opacity-50 transition-all"
                >
                  {synthesizing ? 'RE-SYNTHESIZING...' : 'RE-SYNTHESIZE WITH LATEST DATA'}
                </button>
              </div>
            )}

            {/* Synthesized view but no synthesis yet */}
            {viewMode === 'synthesized' && !manual.synthesizedContent && (
              <div className="border-2 border-amber-300 bg-amber-50 p-8 text-center">
                <h3 className="font-mono font-bold text-amber-800 mb-2">NO SYNTHESIS YET</h3>
                <p className="font-mono text-sm text-amber-700 mb-4">
                  Run AI synthesis to generate insights from the available perspectives.
                </p>
                <button
                  onClick={async () => {
                    setSynthesizing(true);
                    try {
                      const synthesize = httpsCallable(functions, 'synthesizeManualContent');
                      await synthesize({ manualId: manual.manualId });
                      await fetchByPersonId(personId);
                    } catch (err) {
                      console.error('Synthesis failed:', err);
                    } finally {
                      setSynthesizing(false);
                    }
                  }}
                  disabled={synthesizing}
                  className="px-6 py-3 bg-amber-600 text-white font-mono font-bold hover:bg-amber-700 disabled:opacity-50 transition-all"
                >
                  {synthesizing ? 'SYNTHESIZING...' : 'SYNTHESIZE NOW'}
                </button>
              </div>
            )}

            {/* ========== BY PERSPECTIVE VIEW ========== */}
            {viewMode === 'perspectives' && (
              <div className="space-y-6">
                {hasSelfPerspective && (
                  <div className="border-2 border-slate-200 bg-white">
                    <div className="border-b-2 border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between">
                      <h3 className="font-mono font-bold text-sm text-slate-800">
                        {isSelf ? 'YOUR PERSPECTIVE' : `${person.name.toUpperCase()}'S PERSPECTIVE`}
                      </h3>
                      {isSelf && (
                        <Link href={`/people/${personId}/manual/self-onboard`} className="font-mono text-xs text-amber-600 font-bold hover:text-amber-700">
                          ADD MORE &rarr;
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
                  <div className="border-2 border-slate-200 bg-white">
                    <div className="border-b-2 border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between">
                      <h3 className="font-mono font-bold text-sm text-slate-800">OBSERVER PERSPECTIVES</h3>
                      <Link href={`/people/${personId}/manual/onboard`} className="font-mono text-xs text-blue-600 font-bold hover:text-blue-700">
                        ADD MORE &rarr;
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
                      <div key={item.id} className="border-2 border-slate-200 bg-white p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2 h-2 rounded-full ${
                            item.gapSeverity === 'significant_gap' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />
                          <span className="font-mono text-xs font-bold text-slate-800">{item.topic}</span>
                          <span className={`font-mono text-xs ${
                            item.gapSeverity === 'significant_gap' ? 'text-red-500' : 'text-amber-500'
                          }`}>
                            {item.gapSeverity === 'significant_gap' ? 'SIGNIFICANT' : 'MINOR'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="border-l-2 border-amber-300 pl-3">
                            <span className="font-mono text-xs text-slate-500">{person.name}</span>
                            <p className="font-mono text-sm text-slate-700 mt-1">
                              {item.selfPerspective || <span className="text-slate-400 italic">No self-perspective</span>}
                            </p>
                          </div>
                          <div className="border-l-2 border-blue-300 pl-3">
                            <span className="font-mono text-xs text-slate-500">Observer</span>
                            <p className="font-mono text-sm text-slate-700 mt-1">
                              {item.observerPerspective || <span className="text-slate-400 italic">No observer perspective</span>}
                            </p>
                          </div>
                        </div>
                        <p className="font-mono text-sm text-slate-800 bg-slate-50 p-3">{item.synthesis}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Blind spots */}
                {manual.synthesizedContent.blindSpots?.length > 0 && (
                  <div>
                    <h3 className="font-mono text-xs font-bold text-purple-600 mb-3">BLIND SPOTS</h3>
                    {manual.synthesizedContent.blindSpots.map((item) => (
                      <div key={item.id} className="border-2 border-purple-200 bg-white p-6 mb-4">
                        <span className="font-mono text-xs font-bold text-slate-800">{item.topic}</span>
                        <div className="grid grid-cols-2 gap-4 mt-3 mb-3">
                          <div className="border-l-2 border-amber-300 pl-3">
                            <span className="font-mono text-xs text-slate-500">{person.name}</span>
                            <p className="font-mono text-sm text-slate-700 mt-1">
                              {item.selfPerspective || <span className="text-slate-400 italic">--</span>}
                            </p>
                          </div>
                          <div className="border-l-2 border-blue-300 pl-3">
                            <span className="font-mono text-xs text-slate-500">Observer</span>
                            <p className="font-mono text-sm text-slate-700 mt-1">
                              {item.observerPerspective || <span className="text-slate-400 italic">--</span>}
                            </p>
                          </div>
                        </div>
                        <p className="font-mono text-sm text-slate-800 bg-purple-50 p-3">{item.synthesis}</p>
                      </div>
                    ))}
                  </div>
                )}

                {manual.synthesizedContent.gaps.length === 0 && (!manual.synthesizedContent.blindSpots || manual.synthesizedContent.blindSpots.length === 0) && (
                  <div className="border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="font-mono text-sm text-slate-500">No gaps or blind spots detected. Perspectives are well aligned.</p>
                  </div>
                )}
              </div>
            )}

            {/* CTAs for missing perspectives */}
            {!hasSelfPerspective && isSelf && (
              <Link
                href={`/people/${personId}/manual/self-onboard`}
                className="block border-2 border-dashed border-amber-400 bg-amber-50 p-6 text-center hover:bg-amber-100 transition-colors"
              >
                <span className="font-mono font-bold text-amber-800">
                  ADD YOUR OWN PERSPECTIVE &rarr;
                </span>
                <p className="font-mono text-sm text-amber-600 mt-1">
                  Others have shared their observations. Now add your voice.
                </p>
              </Link>
            )}

            {!hasObserverPerspective && !isSelf && (
              <Link
                href={`/people/${personId}/manual/onboard`}
                className="block border-2 border-dashed border-blue-400 bg-blue-50 p-6 text-center hover:bg-blue-100 transition-colors"
              >
                <span className="font-mono font-bold text-blue-800">
                  SHARE WHAT YOU KNOW &rarr;
                </span>
                <p className="font-mono text-sm text-blue-600 mt-1">
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
  // Map numeric value to a descriptive label
  const range = scale.max - scale.min;
  const position = (value - scale.min) / range;
  if (position <= 0) return scale.minLabel;
  if (position >= 1) return scale.maxLabel;
  if (scale.midLabel && Math.abs(position - 0.5) < 0.01) return scale.midLabel;
  // For positions between labels, show "Label (N/max)"
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
    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 mb-4">
      <span className="font-mono text-xs text-amber-700">
        IN PROGRESS — not all questions answered yet
      </span>
      <Link
        href={`/people/${personId}/manual/${contribution.perspectiveType === 'self' ? 'self-onboard' : 'onboard'}`}
        className="font-mono text-xs text-amber-800 font-bold hover:text-amber-900"
      >
        CONTINUE &rarr;
      </Link>
    </div>
  ) : null;

  const updatedDate = contribution.updatedAt?.toDate?.()
    ? contribution.updatedAt.toDate()
    : contribution.updatedAt?.seconds
    ? new Date(contribution.updatedAt.seconds * 1000)
    : null;

  const attribution = (
    <div className="flex items-center gap-2 mb-4 font-mono text-xs text-slate-400">
      <span>{contribution.contributorName}</span>
      <span>&middot;</span>
      <span>{contribution.perspectiveType === 'self' ? 'self' : contribution.relationshipToSubject || 'observer'}</span>
      {updatedDate && (
        <>
          <span>&middot;</span>
          <span>{updatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </>
      )}
      {isDraft && <span className="text-amber-600 font-bold ml-1">DRAFT</span>}
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
              <h4 className="font-mono text-xs text-amber-600 font-bold tracking-wider mb-3">
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
      <div className="border-l-2 border-amber-400 pl-4">
        {questionText && (
          <p className="font-mono text-xs text-slate-500 mb-1">{questionText}</p>
        )}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setValue(answerText); setEditing(false); }
          }}
          rows={3}
          className="w-full px-3 py-2 border-2 border-amber-300 bg-amber-50 font-mono text-sm text-slate-800 focus:outline-none focus:border-amber-500 resize-y"
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 bg-slate-800 text-white font-mono text-xs font-bold hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
          <button
            onClick={() => { setValue(answerText); setEditing(false); }}
            className="px-3 py-1 border border-slate-300 font-mono text-xs text-slate-600 hover:border-slate-800"
          >
            CANCEL
          </button>
          <span className="font-mono text-xs text-slate-400 self-center ml-auto">
            Ctrl+Enter to save, Esc to cancel
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-l-2 border-slate-200 pl-4 ${editable ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors' : ''}`}
      onClick={editable ? () => setEditing(true) : undefined}
      title={editable ? 'Click to edit' : undefined}
    >
      {questionText && (
        <p className="font-mono text-xs text-slate-500 mb-1">{questionText}</p>
      )}
      <p className="font-mono text-sm text-slate-800 whitespace-pre-line">{answerText}</p>
    </div>
  );
}
