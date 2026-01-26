'use client';

import React from 'react';
import { TechnicalCard, TechnicalLabel } from '../technical';
import { HOUSEHOLD_PAIN_POINTS, HOUSEHOLD_LAYERS, LayerId } from '@/types/household-workbook';

interface PainPointSelectorProps {
  selectedPainPoints: string[];
  onSelect: (painPointId: string) => void;
  maxSelections?: number;
  className?: string;
}

export function PainPointSelector({
  selectedPainPoints,
  onSelect,
  maxSelections = 3,
  className = '',
}: PainPointSelectorProps) {
  const isSelected = (id: string) => selectedPainPoints.includes(id);
  const canSelect = selectedPainPoints.length < maxSelections;

  const getLayerNames = (layers: readonly number[]) => {
    return layers
      .map((l) => HOUSEHOLD_LAYERS[l as LayerId]?.friendly || '')
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-xs text-slate-500 uppercase tracking-wider">
          SELECT UP TO {maxSelections} PAIN POINTS
        </p>
        <TechnicalLabel variant="subtle" color="slate" size="xs">
          {selectedPainPoints.length} / {maxSelections} SELECTED
        </TechnicalLabel>
      </div>

      {HOUSEHOLD_PAIN_POINTS.map((painPoint) => {
        const selected = isSelected(painPoint.id);
        const disabled = !selected && !canSelect;

        return (
          <button
            key={painPoint.id}
            onClick={() => onSelect(painPoint.id)}
            disabled={disabled}
            className={`
              w-full text-left transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <TechnicalCard
              shadowSize={selected ? 'md' : 'sm'}
              className={`
                p-4
                ${selected ? 'border-amber-500 bg-amber-50' : 'hover:border-slate-400'}
              `}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div
                  className={`
                    w-6 h-6 border-2 flex items-center justify-center flex-shrink-0
                    ${selected ? 'bg-amber-500 border-amber-500' : 'border-slate-300 bg-white'}
                  `}
                >
                  {selected && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-mono font-bold text-slate-800 uppercase tracking-wide">
                    {painPoint.label}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {painPoint.description}
                  </p>

                  {/* Layer mapping */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">
                      We&apos;ll focus on:
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      {getLayerNames(painPoint.relatedLayers)}
                    </span>
                  </div>
                </div>

                {/* Selected indicator */}
                {selected && (
                  <TechnicalLabel variant="filled" color="amber" size="xs">
                    SELECTED
                  </TechnicalLabel>
                )}
              </div>
            </TechnicalCard>
          </button>
        );
      })}
    </div>
  );
}

export default PainPointSelector;
