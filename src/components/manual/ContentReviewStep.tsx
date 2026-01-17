'use client';

import { GeneratedManualContent } from '@/types/onboarding';

interface ContentReviewStepProps {
  content: GeneratedManualContent;
  personName: string;
}

export function ContentReviewStep({ content, personName }: ContentReviewStepProps) {
  return (
    <div className="space-y-6">
      {/* Role Overview */}
      {content.roleOverview && (
        <div className="parent-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">👤</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              Role Overview
            </h3>
          </div>
          <p className="whitespace-pre-wrap" style={{ color: 'var(--parent-text)' }}>
            {content.roleOverview}
          </p>
        </div>
      )}

      {/* Overview Lists */}
      {content.overview && (
        <div className="parent-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">ℹ️</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              Overview
            </h3>
          </div>
          <div className="space-y-4">
            {content.overview.likes && content.overview.likes.length > 0 && (
              <div>
                <p className="font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Likes & Enjoys:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {content.overview.likes.map((item, i) => (
                    <li key={i} style={{ color: 'var(--parent-text-light)' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.overview.dislikes && content.overview.dislikes.length > 0 && (
              <div>
                <p className="font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Dislikes & Drains:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {content.overview.dislikes.map((item, i) => (
                    <li key={i} style={{ color: 'var(--parent-text-light)' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.overview.motivations && content.overview.motivations.length > 0 && (
              <div>
                <p className="font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Motivations:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {content.overview.motivations.map((item, i) => (
                    <li key={i} style={{ color: 'var(--parent-text-light)' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Triggers */}
      {content.triggers && content.triggers.length > 0 && (
        <div className="parent-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚡</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              Triggers & Patterns ({content.triggers.length})
            </h3>
          </div>
          <div className="space-y-4">
            {content.triggers.map((trigger, i) => (
              <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--parent-bg)' }}>
                <p className="font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  {trigger.description}
                </p>
                <p className="text-sm mb-1" style={{ color: 'var(--parent-text-light)' }}>
                  <span className="font-medium">Context:</span> {trigger.context}
                </p>
                <p className="text-sm mb-1" style={{ color: 'var(--parent-text-light)' }}>
                  <span className="font-medium">Typical Response:</span> {trigger.typicalResponse}
                </p>
                {trigger.deescalationStrategy && (
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    <span className="font-medium">What Helps:</span> {trigger.deescalationStrategy}
                  </p>
                )}
                <span
                  className="inline-block px-2 py-1 rounded text-xs mt-2"
                  style={{
                    backgroundColor: trigger.severity === 'significant' ? '#fee2e2' :
                                    trigger.severity === 'moderate' ? '#fef3c7' : '#dbeafe',
                    color: trigger.severity === 'significant' ? '#991b1b' :
                           trigger.severity === 'moderate' ? '#92400e' : '#1e40af'
                  }}
                >
                  {trigger.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What Works */}
      {content.whatWorks && content.whatWorks.length > 0 && (
        <div className="parent-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              What Works ({content.whatWorks.length})
            </h3>
          </div>
          <div className="space-y-4">
            {content.whatWorks.map((strategy, i) => (
              <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--parent-bg)' }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium flex-1" style={{ color: 'var(--parent-text)' }}>
                    {strategy.description}
                  </p>
                  {strategy.effectiveness && (
                    <div className="flex gap-1 ml-4">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star} style={{ color: star <= strategy.effectiveness! ? '#f59e0b' : '#d1d5db' }}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  <span className="font-medium">When to use:</span> {strategy.context}
                </p>
                {strategy.notes && (
                  <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                    {strategy.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What Doesn't Work */}
      {content.whatDoesntWork && content.whatDoesntWork.length > 0 && (
        <div className="parent-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🚫</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              What Doesn't Work ({content.whatDoesntWork.length})
            </h3>
          </div>
          <div className="space-y-4">
            {content.whatDoesntWork.map((strategy, i) => (
              <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--parent-bg)' }}>
                <p className="font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  {strategy.description}
                </p>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  <span className="font-medium">Why to avoid:</span> {strategy.context}
                </p>
                {strategy.notes && (
                  <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                    {strategy.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boundaries */}
      {content.boundaries && content.boundaries.length > 0 && (
        <div className="parent-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🛡️</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              Boundaries & Limits ({content.boundaries.length})
            </h3>
          </div>
          <div className="space-y-4">
            {content.boundaries.map((boundary, i) => (
              <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--parent-bg)' }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium flex-1" style={{ color: 'var(--parent-text)' }}>
                    {boundary.description}
                  </p>
                  <span
                    className="inline-block px-2 py-1 rounded text-xs ml-4"
                    style={{
                      backgroundColor: boundary.category === 'immovable' ? '#fee2e2' :
                                      boundary.category === 'negotiable' ? '#dbeafe' : '#f3f4f6',
                      color: boundary.category === 'immovable' ? '#991b1b' :
                             boundary.category === 'negotiable' ? '#1e40af' : '#6b7280'
                    }}
                  >
                    {boundary.category}
                  </span>
                </div>
                {boundary.consequences && (
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    <span className="font-medium">If crossed:</span> {boundary.consequences}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Challenges */}
      {((content.strengths && content.strengths.length > 0) || (content.challenges && content.challenges.length > 0)) && (
        <div className="parent-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💪</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              Strengths & Challenges
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {content.strengths && content.strengths.length > 0 && (
              <div>
                <p className="font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Strengths:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {content.strengths.map((strength, i) => (
                    <li key={i} style={{ color: 'var(--parent-text-light)' }}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            {content.challenges && content.challenges.length > 0 && (
              <div>
                <p className="font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Challenges:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {content.challenges.map((challenge, i) => (
                    <li key={i} style={{ color: 'var(--parent-text-light)' }}>{challenge}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
