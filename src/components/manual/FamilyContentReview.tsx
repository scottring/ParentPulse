/**
 * Component to review and edit AI-generated family manual content before saving
 */

import React from 'react';
import type { GeneratedFamilyManualContent } from '@/hooks/useSaveFamilyContent';

interface FamilyContentReviewProps {
  content: GeneratedFamilyManualContent;
}

export function FamilyContentReview({ content }: FamilyContentReviewProps) {
  return (
    <div className="space-y-8">
      {/* House Rules */}
      {content.houseRules && content.houseRules.length > 0 && (
        <div className="parent-card p-6">
          <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
            🛡️ House Rules
          </h3>
          <div className="space-y-4">
            {content.houseRules.map((rule, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: 'var(--parent-accent)' }}>
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                    {rule.rule}
                  </h4>
                  <div className="flex gap-2">
                    {rule.nonNegotiable && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                        Non-negotiable
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                      {rule.appliesTo === 'everyone' ? 'Everyone' :
                       rule.appliesTo === 'adults' ? 'Adults' :
                       rule.appliesTo === 'children' ? 'Children' :
                       'Specific people'}
                    </span>
                  </div>
                </div>
                <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
                  <strong>Why:</strong> {rule.reasoning}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  <strong>Consequences:</strong> {rule.consequences}
                </p>
                {rule.specificPeople && rule.specificPeople.length > 0 && (
                  <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                    <strong>Applies to:</strong> {rule.specificPeople.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Family Values */}
      {content.familyValues && content.familyValues.length > 0 && (
        <div className="parent-card p-6">
          <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
            💫 Core Values
          </h3>
          <div className="space-y-4">
            {content.familyValues.map((value, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: 'var(--parent-accent)' }}>
                <h4 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                  {value.value}
                </h4>
                <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
                  {value.description}
                </p>
                <p className="text-sm mt-2 italic" style={{ color: 'var(--parent-text-light)' }}>
                  <strong>How we show it:</strong> {value.howWeShowIt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routines */}
      {content.routines && content.routines.length > 0 && (
        <div className="parent-card p-6">
          <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
            🔄 Daily Routines & Rhythms
          </h3>
          <div className="space-y-4">
            {content.routines.map((routine, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: 'var(--parent-accent)' }}>
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                    {routine.title}
                  </h4>
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 capitalize">
                    {routine.frequency}
                  </span>
                </div>
                <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
                  {routine.description}
                </p>
                <p className="text-sm mt-1 opacity-75" style={{ color: 'var(--parent-text-light)' }}>
                  <strong>When:</strong> {routine.timing}
                </p>
                {routine.steps && routine.steps.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--parent-text)' }}>Steps:</p>
                    <ol className="mt-1 ml-4 text-sm space-y-1" style={{ color: 'var(--parent-text-light)' }}>
                      {routine.steps.map((step, sIdx) => (
                        <li key={sIdx} className="list-decimal">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {routine.notes && (
                  <p className="text-sm mt-2 italic" style={{ color: 'var(--parent-text-light)' }}>
                    Note: {routine.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traditions */}
      {content.traditions && content.traditions.length > 0 && (
        <div className="parent-card p-6">
          <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
            🎉 Traditions & Celebrations
          </h3>
          <div className="space-y-4">
            {content.traditions.map((tradition, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: 'var(--parent-accent)' }}>
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                    {tradition.title}
                  </h4>
                  <span className="text-sm opacity-75" style={{ color: 'var(--parent-text-light)' }}>
                    {tradition.occasion}
                  </span>
                </div>
                <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
                  {tradition.description}
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
                  <strong>How we celebrate:</strong> {tradition.howWeCelebrate}
                </p>
                <p className="text-sm mt-2 italic" style={{ color: 'var(--parent-text-light)' }}>
                  <strong>Why it matters:</strong> {tradition.significance}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary note */}
      <div className="parent-card p-6 bg-blue-50 border-l-4 border-blue-500">
        <p className="text-sm" style={{ color: 'var(--parent-text)' }}>
          <strong>Note:</strong> This content was generated based on your responses. You can edit any of these sections later from the family manual page.
        </p>
      </div>
    </div>
  );
}
