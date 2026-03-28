'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { Contribution } from '@/types/person-manual';
import MainLayout from '@/components/layout/MainLayout';
import { getSelfOnboardingSections } from '@/config/self-questions';
import { getOnboardingSections, OnboardingQuestion } from '@/config/onboarding-questions';

export default function ManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { contributions, loading: contribLoading } = useContribution(manual?.manualId);

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
              {hasObserverPerspective ? (
                <span className="font-mono text-xs text-green-600 font-bold">
                  {observerContributions.length} CONTRIBUTION{observerContributions.length !== 1 ? 'S' : ''}
                </span>
              ) : (
                <span className="font-mono text-xs text-slate-400">NONE YET</span>
              )}
            </div>
          </div>
        </div>

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
          /* Has perspectives — show contributions */
          <div className="space-y-6">
            {/* Self perspective section */}
            {hasSelfPerspective && (
              <div className="border-2 border-slate-200 bg-white">
                <div className="border-b-2 border-slate-200 px-6 py-3 bg-slate-50">
                  <h3 className="font-mono font-bold text-sm text-slate-800">
                    {isSelf ? 'YOUR PERSPECTIVE' : `${person.name.toUpperCase()}'S PERSPECTIVE`}
                  </h3>
                </div>
                <div className="p-6">
                  {selfContributions.map((contribution) => (
                    <ContributionDisplay key={contribution.contributionId} contribution={contribution} personName={person.name} />
                  ))}
                </div>
              </div>
            )}

            {/* Observer perspective section */}
            {hasObserverPerspective && (
              <div className="border-2 border-slate-200 bg-white">
                <div className="border-b-2 border-slate-200 px-6 py-3 bg-slate-50">
                  <h3 className="font-mono font-bold text-sm text-slate-800">OBSERVER PERSPECTIVES</h3>
                </div>
                <div className="p-6">
                  {observerContributions.map((contribution) => (
                    <div key={contribution.contributionId}>
                      <span className="font-mono text-xs text-slate-400 mb-4 block">
                        by {contribution.contributorName}
                      </span>
                      <ContributionDisplay contribution={contribution} personName={person.name} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synthesis placeholder */}
            {hasSelfPerspective && hasObserverPerspective && !manual.synthesizedContent && (
              <div className="border-2 border-amber-300 bg-amber-50 p-6 text-center">
                <h3 className="font-mono font-bold text-sm text-amber-800 mb-2">
                  READY FOR SYNTHESIS
                </h3>
                <p className="font-mono text-sm text-amber-700">
                  Both self and observer perspectives exist. AI synthesis will highlight alignments and gaps.
                </p>
              </div>
            )}

            {/* Synthesized content */}
            {manual.synthesizedContent && (
              <div className="border-2 border-green-300 bg-green-50">
                <div className="border-b-2 border-green-300 px-6 py-3">
                  <h3 className="font-mono font-bold text-sm text-green-800">SYNTHESIZED INSIGHTS</h3>
                </div>
                <div className="p-6 space-y-4">
                  <p className="font-mono text-sm text-slate-700">{manual.synthesizedContent.overview}</p>
                  {manual.synthesizedContent.gaps.length > 0 && (
                    <div>
                      <span className="font-mono text-xs text-red-600 font-bold">GAPS</span>
                      {manual.synthesizedContent.gaps.map((gap) => (
                        <div key={gap.id} className="mt-2 p-3 border border-red-200 bg-red-50">
                          <p className="font-mono text-sm text-slate-700">{gap.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {manual.synthesizedContent.alignments.length > 0 && (
                    <div>
                      <span className="font-mono text-xs text-green-600 font-bold">ALIGNMENTS</span>
                      {manual.synthesizedContent.alignments.map((alignment) => (
                        <div key={alignment.id} className="mt-2 p-3 border border-green-200 bg-green-50">
                          <p className="font-mono text-sm text-slate-700">{alignment.synthesis}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
function buildQuestionLookups() {
  const selfLookup: Record<string, string> = {};
  const observerLookup: Record<string, string> = {};

  for (const section of getSelfOnboardingSections()) {
    for (const q of section.questions) {
      selfLookup[q.id] = q.question;
    }
  }

  // Build observer lookups for all relationship types
  const relTypes: Array<import('@/types/person-manual').RelationshipType> = ['spouse', 'child', 'friend', 'sibling', 'elderly_parent', 'professional', 'other'];
  for (const relType of relTypes) {
    for (const section of getOnboardingSections(relType)) {
      for (const q of section.questions) {
        if (!observerLookup[q.id]) {
          observerLookup[q.id] = q.question;
        }
      }
    }
  }

  return { selfLookup, observerLookup };
}

const { selfLookup, observerLookup } = buildQuestionLookups();

function extractAnswerText(answer: any): string | null {
  if (typeof answer === 'string') {
    return answer.trim() || null;
  }
  if (typeof answer === 'object' && answer !== null && 'primary' in answer) {
    const primary = answer.primary;
    if (typeof primary === 'string') return primary.trim() || null;
    if (typeof primary === 'number') return String(primary);
  }
  if (typeof answer === 'number') return String(answer);
  return null;
}

function ContributionDisplay({ contribution, personName }: { contribution: Contribution; personName?: string }) {
  const answers = contribution.answers;
  const lookup = contribution.perspectiveType === 'self' ? selfLookup : observerLookup;

  const resolveQuestion = (questionId: string): string | null => {
    const raw = lookup[questionId];
    if (!raw) return null;
    return personName ? raw.replace(/\{\{personName\}\}/g, personName) : raw;
  };

  // Answers can be nested { sectionId: { questionId: value } } or flat { questionId: value }
  const isNested = Object.values(answers).some(
    (v) => typeof v === 'object' && v !== null && !('primary' in v) && !Array.isArray(v) && typeof Object.values(v)[0] !== 'undefined'
  );

  if (isNested) {
    return (
      <div className="space-y-6">
        {Object.entries(answers).map(([sectionId, sectionAnswers]) => {
          if (typeof sectionAnswers !== 'object' || sectionAnswers === null) return null;
          const entries = Object.entries(sectionAnswers as Record<string, any>);
          const nonEmpty = entries.filter(([, v]) => extractAnswerText(v));
          if (nonEmpty.length === 0) return null;

          return (
            <div key={sectionId}>
              <h4 className="font-mono text-xs text-amber-600 font-bold tracking-wider mb-3">
                {SECTION_LABELS[sectionId] || sectionId.replace(/_/g, ' ').toUpperCase()}
              </h4>
              <div className="space-y-4">
                {nonEmpty.map(([questionId, answer]) => {
                  const text = extractAnswerText(answer);
                  if (!text) return null;
                  const questionText = resolveQuestion(questionId);

                  return (
                    <div key={questionId} className="border-l-2 border-slate-200 pl-4">
                      {questionText && (
                        <p className="font-mono text-xs text-slate-500 mb-1">{questionText}</p>
                      )}
                      <p className="font-mono text-sm text-slate-800 whitespace-pre-line">{text}</p>
                    </div>
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
  const nonEmpty = entries.filter(([, v]) => extractAnswerText(v));

  return (
    <div className="space-y-4">
      {nonEmpty.map(([questionId, answer]) => {
        const text = extractAnswerText(answer);
        if (!text) return null;
        const questionText = resolveQuestion(questionId);

        return (
          <div key={questionId} className="border-l-2 border-slate-200 pl-4">
            {questionText && (
              <p className="font-mono text-xs text-slate-500 mb-1">{questionText}</p>
            )}
            <p className="font-mono text-sm text-slate-800 whitespace-pre-line">{text}</p>
          </div>
        );
      })}
    </div>
  );
}
