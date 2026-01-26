'use client';

import React, { useState } from 'react';
import { TechnicalCard, SectionHeader, TechnicalLabel } from '../technical';
import { LayerId, getLayerFriendlyName, HouseholdTrigger, HouseholdStrategy, HouseholdBoundary } from '@/types/household-workbook';

interface LayerSectionProps {
  layerId: LayerId;
  triggers?: HouseholdTrigger[];
  strategies?: HouseholdStrategy[];
  boundaries?: HouseholdBoundary[];
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function LayerSection({
  layerId,
  triggers = [],
  strategies = [],
  boundaries = [],
  isExpanded = false,
  onToggle,
  className = '',
}: LayerSectionProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setExpanded(!expanded);
    }
  };

  const isOpen = onToggle ? isExpanded : expanded;
  const friendlyName = getLayerFriendlyName(layerId);
  const totalItems = triggers.length + strategies.length + boundaries.length;

  return (
    <TechnicalCard shadowSize="sm" className={className}>
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
            <span className="font-mono font-bold text-xs text-white">
              {String(layerId).padStart(2, '0')}
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-mono font-bold text-sm text-slate-800 uppercase tracking-wider">
              {friendlyName}
            </h3>
            <p className="font-mono text-xs text-slate-500">
              {totalItems} items documented
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick counts */}
          {triggers.length > 0 && (
            <TechnicalLabel variant="subtle" color="red" size="xs">
              {triggers.length} triggers
            </TechnicalLabel>
          )}
          {strategies.length > 0 && (
            <TechnicalLabel variant="subtle" color="green" size="xs">
              {strategies.length} strategies
            </TechnicalLabel>
          )}
          {boundaries.length > 0 && (
            <TechnicalLabel variant="subtle" color="blue" size="xs">
              {boundaries.length} boundaries
            </TechnicalLabel>
          )}

          {/* Expand/collapse icon */}
          <span className="font-mono text-slate-400">
            {isOpen ? '[-]' : '[+]'}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t-2 border-slate-200 p-4 space-y-4">
          {/* Triggers */}
          {triggers.length > 0 && (
            <div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-red-700 mb-2">
                TRIGGERS
              </h4>
              <div className="space-y-2">
                {triggers.map((trigger) => (
                  <div
                    key={trigger.triggerId}
                    className={`
                      p-3 border-l-4 bg-slate-50
                      ${trigger.severity === 'critical' ? 'border-red-600' : ''}
                      ${trigger.severity === 'high' ? 'border-orange-500' : ''}
                      ${trigger.severity === 'medium' ? 'border-amber-500' : ''}
                      ${trigger.severity === 'low' ? 'border-slate-400' : ''}
                    `}
                  >
                    <p className="text-sm text-slate-700">{trigger.description}</p>
                    {trigger.context && (
                      <p className="text-xs text-slate-500 mt-1">{trigger.context}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <TechnicalLabel variant="outline" color="slate" size="xs">
                        {trigger.severity.toUpperCase()}
                      </TechnicalLabel>
                      <TechnicalLabel variant="subtle" color="slate" size="xs">
                        {trigger.source}
                      </TechnicalLabel>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategies */}
          {strategies.length > 0 && (
            <div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-green-700 mb-2">
                STRATEGIES
              </h4>
              <div className="space-y-2">
                {strategies.map((strategy) => (
                  <div
                    key={strategy.strategyId}
                    className="p-3 border-l-4 border-green-500 bg-slate-50"
                  >
                    <p className="text-sm text-slate-700">{strategy.description}</p>
                    {strategy.howToUse && (
                      <p className="text-xs text-slate-500 mt-1">{strategy.howToUse}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <TechnicalLabel variant="outline" color="green" size="xs">
                        EFFECTIVENESS: {strategy.effectiveness}/5
                      </TechnicalLabel>
                      <TechnicalLabel variant="subtle" color="slate" size="xs">
                        {strategy.source}
                      </TechnicalLabel>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boundaries */}
          {boundaries.length > 0 && (
            <div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
                BOUNDARIES
              </h4>
              <div className="space-y-2">
                {boundaries.map((boundary) => (
                  <div
                    key={boundary.boundaryId}
                    className={`
                      p-3 border-l-4 bg-slate-50
                      ${boundary.category === 'immovable' ? 'border-red-600' : ''}
                      ${boundary.category === 'negotiable' ? 'border-amber-500' : ''}
                      ${boundary.category === 'preference' ? 'border-blue-400' : ''}
                    `}
                  >
                    <p className="text-sm text-slate-700">{boundary.description}</p>
                    {boundary.rationale && (
                      <p className="text-xs text-slate-500 mt-1">{boundary.rationale}</p>
                    )}
                    <TechnicalLabel
                      variant="outline"
                      color={boundary.category === 'immovable' ? 'red' : boundary.category === 'negotiable' ? 'amber' : 'blue'}
                      size="xs"
                      className="mt-2"
                    >
                      {boundary.category.toUpperCase()}
                    </TechnicalLabel>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalItems === 0 && (
            <div className="text-center py-4">
              <p className="font-mono text-sm text-slate-400">
                No items documented yet for this layer.
              </p>
              <p className="font-mono text-xs text-slate-400 mt-1">
                Complete your onboarding to populate this section.
              </p>
            </div>
          )}
        </div>
      )}
    </TechnicalCard>
  );
}

export default LayerSection;
