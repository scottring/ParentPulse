'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { useRoleSection } from '@/hooks/useRoleSection';

export default function RoleSectionDetailPage({ params }: { params: Promise<{ personId: string; roleId: string }> }) {
  const { personId, roleId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { roleSection, loading: sectionLoading } = useRoleSection(roleId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || personLoading || sectionLoading || !user || !person || !roleSection) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const isContributor = roleSection.contributors.includes(user.userId);

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-start gap-4">
            <Link href={`/people/${personId}/manual`} className="text-2xl transition-transform hover:scale-110 mt-1">
              ←
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  {roleSection.roleTitle}
                </h1>
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium capitalize"
                  style={{
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-accent)',
                    border: '1px solid var(--parent-primary)'
                  }}
                >
                  {roleSection.roleType}
                </span>
              </div>
              <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                {roleSection.roleDescription}
              </p>
              <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                Contributors: {roleSection.contributorNames.join(', ')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Triggers Section */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="parent-heading text-2xl flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
              <span className="text-3xl">⚡</span>
              <span>Triggers</span>
              <span className="text-lg font-normal" style={{ color: 'var(--parent-text-light)' }}>
                ({roleSection.triggers.length})
              </span>
            </h2>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-accent)',
                border: '1px solid var(--parent-primary)'
              }}
              disabled
            >
              + Add Trigger
            </button>
          </div>

          {roleSection.triggers.length === 0 ? (
            <div className="parent-card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                No triggers identified yet. Add triggers to track what causes challenges in this role.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roleSection.triggers.map((trigger, index) => (
                <div
                  key={trigger.id}
                  className="parent-card p-5 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                        {trigger.description}
                      </h4>
                      <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                        {trigger.context}
                      </p>
                      {trigger.typicalResponse && (
                        <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                          <strong>Typical response:</strong> {trigger.typicalResponse}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--parent-text-light)' }}>
                        <span>
                          Identified: {trigger.identifiedDate.toDate().toLocaleDateString()}
                        </span>
                        {trigger.confirmedByOthers && trigger.confirmedByOthers.length > 0 && (
                          <span>✓ Confirmed by {trigger.confirmedByOthers.length} {trigger.confirmedByOthers.length === 1 ? 'person' : 'people'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What Works Section */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="parent-heading text-2xl flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
              <span className="text-3xl">✨</span>
              <span>What Works</span>
              <span className="text-lg font-normal" style={{ color: 'var(--parent-text-light)' }}>
                ({roleSection.whatWorks.length})
              </span>
            </h2>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-accent)',
                border: '1px solid var(--parent-primary)'
              }}
              disabled
            >
              + Add Strategy
            </button>
          </div>

          {roleSection.whatWorks.length === 0 ? (
            <div className="parent-card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                No effective strategies yet. Add strategies that work well in this role.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roleSection.whatWorks.map((strategy, index) => (
                <div
                  key={strategy.id}
                  className="parent-card p-5 animate-fade-in-up"
                  style={{ animationDelay: `${0.1 + index * 0.03}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                          {strategy.description}
                        </h4>
                        {strategy.effectiveness && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={star <= strategy.effectiveness ? 'text-yellow-500' : 'text-gray-300'}>
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                        {strategy.context}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                        Added: {strategy.addedDate.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What Doesn't Work Section */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="parent-heading text-2xl flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
              <span className="text-3xl">🚫</span>
              <span>What Doesn't Work</span>
              <span className="text-lg font-normal" style={{ color: 'var(--parent-text-light)' }}>
                ({roleSection.whatDoesntWork.length})
              </span>
            </h2>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
              style={{
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-accent)',
                border: '1px solid var(--parent-primary)'
              }}
              disabled
            >
              + Add Strategy
            </button>
          </div>

          {roleSection.whatDoesntWork.length === 0 ? (
            <div className="parent-card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                No ineffective strategies yet. Document what doesn't work to avoid repeating mistakes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {roleSection.whatDoesntWork.map((strategy, index) => (
                <div
                  key={strategy.id}
                  className="parent-card p-5 animate-fade-in-up"
                  style={{ animationDelay: `${0.2 + index * 0.03}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                        {strategy.description}
                      </h4>
                      <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                        {strategy.context}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                        Added: {strategy.addedDate.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strengths & Challenges Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <h2 className="parent-heading text-xl flex items-center gap-2 mb-4" style={{ color: 'var(--parent-text)' }}>
              <span className="text-2xl">💪</span>
              <span>Strengths</span>
              <span className="text-base font-normal" style={{ color: 'var(--parent-text-light)' }}>
                ({roleSection.strengths.length})
              </span>
            </h2>

            {roleSection.strengths.length === 0 ? (
              <div className="parent-card p-6 text-center">
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  No strengths identified yet
                </p>
              </div>
            ) : (
              <div className="parent-card p-5">
                <ul className="space-y-2">
                  {roleSection.strengths.map((strength, index) => (
                    <li key={index} className="text-sm flex items-start gap-2" style={{ color: 'var(--parent-text)' }}>
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Challenges */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="parent-heading text-xl flex items-center gap-2 mb-4" style={{ color: 'var(--parent-text)' }}>
              <span className="text-2xl">🎯</span>
              <span>Challenges</span>
              <span className="text-base font-normal" style={{ color: 'var(--parent-text-light)' }}>
                ({roleSection.challenges.length})
              </span>
            </h2>

            {roleSection.challenges.length === 0 ? (
              <div className="parent-card p-6 text-center">
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  No challenges identified yet
                </p>
              </div>
            ) : (
              <div className="parent-card p-5">
                <ul className="space-y-2">
                  {roleSection.challenges.map((challenge, index) => (
                    <li key={index} className="text-sm flex items-start gap-2" style={{ color: 'var(--parent-text)' }}>
                      <span className="text-orange-500 flex-shrink-0">⚠</span>
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Boundaries Section */}
        {roleSection.boundaries && roleSection.boundaries.length > 0 && (
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
            <h2 className="parent-heading text-2xl flex items-center gap-2 mb-4" style={{ color: 'var(--parent-text)' }}>
              <span className="text-3xl">🛡️</span>
              <span>Boundaries</span>
              <span className="text-lg font-normal" style={{ color: 'var(--parent-text-light)' }}>
                ({roleSection.boundaries.length})
              </span>
            </h2>

            <div className="space-y-3">
              {roleSection.boundaries.map((boundary, index) => (
                <div
                  key={boundary.id}
                  className="parent-card p-5 animate-fade-in-up"
                  style={{ animationDelay: `${0.35 + index * 0.03}s` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                      {boundary.description}
                    </h4>
                    <span
                      className="text-xs px-2 py-1 rounded-full capitalize"
                      style={{
                        backgroundColor: 'var(--parent-bg)',
                        color: 'var(--parent-text-light)',
                        border: '1px solid var(--parent-border)'
                      }}
                    >
                      {boundary.category}
                    </span>
                  </div>
                  {boundary.context && (
                    <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                      {boundary.context}
                    </p>
                  )}
                  {boundary.consequences && (
                    <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                      <strong>If crossed:</strong> {boundary.consequences}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                    Added: {boundary.addedDate.toDate().toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coming Soon Notice */}
        <div
          className="mt-12 p-8 rounded-2xl text-center animate-fade-in-up"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
            animationDelay: '0.4s'
          }}
        >
          <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
            💡 <strong>Coming Soon:</strong> Add, edit, and remove triggers, strategies, boundaries, and more directly from this page.
            For now, you can manage these in the <Link href="/demo" className="underline" style={{ color: 'var(--parent-accent)' }}>demo page</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
