/**
 * Component to review and edit AI-generated relationship manual content before saving
 */

import React from 'react';
import type { GeneratedRelationshipManualContent } from '@/hooks/useSaveRelationshipContent';

interface RelationshipContentReviewProps {
  content: GeneratedRelationshipManualContent;
  participantNames: string[];
}

export function RelationshipContentReview({ content, participantNames }: RelationshipContentReviewProps) {
  const namesString = participantNames.join(' & ');

  return (
    <div className="space-y-8">
      {/* Relationship Overview */}
      {content.relationshipOverview && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }}>
            💕 Relationship Overview
          </h3>
          <div className="prose max-w-none" style={{ color: '#5C5347' }}>
            {content.relationshipOverview.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {/* Shared Goals */}
      {content.sharedGoals && content.sharedGoals.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }}>
            🚀 Shared Goals
          </h3>
          <div className="space-y-4">
            {content.sharedGoals.map((goal, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: '#7C9082' }}>
                <h4 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '17px', fontWeight: 400, color: '#3A3530' }}>
                  {goal.title}
                </h4>
                <p className="text-sm mt-1" style={{ color: '#5C5347' }}>
                  {goal.description}
                </p>
                <div className="flex gap-4 mt-2 text-sm" style={{ color: '#5C5347' }}>
                  <span className="opacity-75">Category: {goal.category}</span>
                  {goal.timeline && <span className="opacity-75">Timeline: {goal.timeline}</span>}
                </div>
                {goal.milestones && goal.milestones.length > 0 && (
                  <ul className="mt-2 ml-4 text-sm space-y-1" style={{ color: '#5C5347' }}>
                    {goal.milestones.map((milestone, mIdx) => (
                      <li key={mIdx} className="list-disc">{milestone}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rituals */}
      {content.rituals && content.rituals.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }}>
            ✨ Rituals & Connection
          </h3>
          <div className="space-y-4">
            {content.rituals.map((ritual, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: '#7C9082' }}>
                <h4 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '17px', fontWeight: 400, color: '#3A3530' }}>
                  {ritual.title}
                </h4>
                <p className="text-sm mt-1" style={{ color: '#5C5347' }}>
                  {ritual.description}
                </p>
                <div className="flex gap-4 mt-2 text-sm" style={{ color: '#5C5347' }}>
                  <span className="opacity-75">Frequency: {ritual.frequency}</span>
                  {ritual.timing && <span className="opacity-75">When: {ritual.timing}</span>}
                </div>
                {ritual.significance && (
                  <p className="mt-2 text-sm italic" style={{ color: '#5C5347' }}>
                    Why it matters: {ritual.significance}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traditions */}
      {content.traditions && content.traditions.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }}>
            🎉 Traditions
          </h3>
          <div className="space-y-4">
            {content.traditions.map((tradition, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: '#7C9082' }}>
                <h4 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '17px', fontWeight: 400, color: '#3A3530' }}>
                  {tradition.title}
                </h4>
                <p className="text-sm mt-1" style={{ color: '#5C5347' }}>
                  {tradition.description}
                </p>
                <div className="flex gap-4 mt-2 text-sm" style={{ color: '#5C5347' }}>
                  <span className="opacity-75">Occasion: {tradition.occasion}</span>
                  {tradition.yearStarted && <span className="opacity-75">Since: {tradition.yearStarted}</span>}
                </div>
                <p className="mt-2 text-sm" style={{ color: '#5C5347' }}>
                  How we celebrate: {tradition.howWeCelebrate}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict Patterns */}
      {content.conflictPatterns && content.conflictPatterns.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }}>
            ⚡ Conflict Patterns
          </h3>
          <div className="space-y-4">
            {content.conflictPatterns.map((pattern, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: '#7C9082' }}>
                <div className="flex items-start justify-between">
                  <h4 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '17px', fontWeight: 400, color: '#3A3530' }}>
                    {pattern.pattern}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    pattern.severity === 'significant' ? 'bg-red-100 text-red-700' :
                    pattern.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {pattern.severity}
                  </span>
                </div>
                <p className="text-sm mt-2" style={{ color: '#5C5347' }}>
                  Typical outcome: {pattern.typicalOutcome}
                </p>
                {pattern.triggerSituations && pattern.triggerSituations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium" style={{ color: '#3A3530' }}>Triggers:</p>
                    <ul className="mt-1 ml-4 text-sm space-y-1" style={{ color: '#5C5347' }}>
                      {pattern.triggerSituations.map((trigger, tIdx) => (
                        <li key={tIdx} className="list-disc">{trigger}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pattern.whatHelps && pattern.whatHelps.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium" style={{ color: '#7C9082' }}>What helps:</p>
                    <ul className="mt-1 ml-4 text-sm space-y-1" style={{ color: '#5C5347' }}>
                      {pattern.whatHelps.map((help, hIdx) => (
                        <li key={hIdx} className="list-disc">{help}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pattern.whatMakesWorse && pattern.whatMakesWorse.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium" style={{ color: '#dc2626' }}>What makes it worse:</p>
                    <ul className="mt-1 ml-4 text-sm space-y-1" style={{ color: '#5C5347' }}>
                      {pattern.whatMakesWorse.map((worse, wIdx) => (
                        <li key={wIdx} className="list-disc">{worse}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Strategies */}
      {content.connectionStrategies && content.connectionStrategies.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }}>
            💞 Connection Strategies
          </h3>
          <div className="space-y-4">
            {content.connectionStrategies.map((strategy, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: '#7C9082' }}>
                <div className="flex items-start justify-between">
                  <h4 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '17px', fontWeight: 400, color: '#3A3530' }}>
                    {strategy.strategy}
                  </h4>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= strategy.effectiveness ? 'text-yellow-500' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm mt-1" style={{ color: '#5C5347' }}>
                  {strategy.context}
                </p>
                {strategy.notes && (
                  <p className="text-sm mt-2 italic" style={{ color: '#5C5347' }}>
                    {strategy.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Milestones */}
      {content.importantMilestones && content.importantMilestones.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '19px', fontWeight: 400, color: '#3A3530' }}>
            🏆 Important Milestones
          </h3>
          <div className="space-y-4">
            {content.importantMilestones.map((milestone, idx) => (
              <div key={idx} className="border-l-4 pl-4" style={{ borderColor: '#7C9082' }}>
                <div className="flex items-start justify-between">
                  <h4 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '17px', fontWeight: 400, color: '#3A3530' }}>
                    {milestone.title}
                  </h4>
                  <span className="text-sm opacity-75" style={{ color: '#5C5347' }}>
                    {milestone.date}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: '#5C5347' }}>
                  {milestone.description}
                </p>
                <p className="text-sm mt-2 italic" style={{ color: '#5C5347' }}>
                  Why it matters: {milestone.significance}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary note */}
      <div className="glass-card rounded-2xl p-6" style={{ borderLeft: '4px solid #7C9082' }}>
        <p className="text-sm" style={{ color: '#3A3530' }}>
          <strong>Note:</strong> This content was generated based on your responses. You can edit any of these sections later from the relationship manual page.
        </p>
      </div>
    </div>
  );
}
