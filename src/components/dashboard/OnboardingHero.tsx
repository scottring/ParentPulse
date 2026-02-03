'use client';

import React from 'react';
import {
  CheckCircleIcon,
  LockClosedIcon,
  PlayIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { TechnicalCard, TechnicalLabel } from '@/components/technical';
import type { LayerId } from '@/types/assessment';

// ==================== Types ====================

interface OnboardingHeroProps {
  hasStarted: boolean;
  currentLayer: number | null;
  completedLayers: number[];
  onStartOnboarding: () => void;
  personName?: string;
}

// ==================== Layer Configuration ====================

interface LayerConfig {
  id: LayerId;
  name: string;
  shortName: string;
  description: string;
  icon: string;
}

const LAYERS: LayerConfig[] = [
  {
    id: 6,
    name: 'Values & Principles',
    shortName: 'VALUES',
    description: 'What matters most',
    icon: '06',
  },
  {
    id: 5,
    name: 'Outputs & Growth',
    shortName: 'GROWTH',
    description: 'What flourishing looks like',
    icon: '05',
  },
  {
    id: 4,
    name: 'Execution & Strategies',
    shortName: 'STRATEGIES',
    description: 'What works day-to-day',
    icon: '04',
  },
  {
    id: 3,
    name: 'Memory & Structure',
    shortName: 'STRUCTURE',
    description: 'Boundaries and routines',
    icon: '03',
  },
  {
    id: 2,
    name: 'Processing & Co-Regulation',
    shortName: 'PROCESSING',
    description: 'How we help each other',
    icon: '02',
  },
  {
    id: 1,
    name: 'Inputs & Triggers',
    shortName: 'TRIGGERS',
    description: 'What sets us off',
    icon: '01',
  },
];

// ==================== Sub-Components ====================

function LayerStack({
  currentLayer,
  completedLayers,
}: {
  currentLayer: number | null;
  completedLayers: number[];
}) {
  const getLayerStatus = (layerId: number): 'completed' | 'current' | 'available' | 'locked' => {
    if (completedLayers.includes(layerId)) return 'completed';
    if (currentLayer === layerId) return 'current';

    // Check if this layer is available (all higher layers completed)
    // Since we go from 6 down to 1, a layer is available if all layers > it are completed
    const higherLayers = LAYERS.filter(l => l.id > layerId).map(l => l.id);
    const allHigherCompleted = higherLayers.every(id => completedLayers.includes(id));

    if (allHigherCompleted && currentLayer === null) return 'available';
    if (allHigherCompleted && currentLayer !== null && currentLayer < layerId) return 'completed';
    if (allHigherCompleted) return 'available';

    return 'locked';
  };

  return (
    <div className="relative">
      {/* Tower visualization */}
      <div className="flex flex-col items-center gap-1">
        {LAYERS.map((layer, index) => {
          const status = getLayerStatus(layer.id);
          const isTop = index === 0;
          const isBottom = index === LAYERS.length - 1;

          return (
            <div
              key={layer.id}
              className={`
                relative w-full transition-all duration-300
                ${status === 'current' ? 'scale-105 z-10' : ''}
              `}
            >
              {/* Layer block */}
              <div
                className={`
                  relative flex items-center gap-3 p-3 border-2
                  font-mono transition-all duration-200
                  ${status === 'completed'
                    ? 'bg-green-50 border-green-600 text-green-800'
                    : status === 'current'
                    ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-[4px_4px_0px_0px_rgba(217,119,6,1)]'
                    : status === 'available'
                    ? 'bg-white border-slate-400 text-slate-700 hover:border-slate-600'
                    : 'bg-slate-100 border-slate-300 text-slate-400'
                  }
                  ${isTop ? 'rounded-t-sm' : ''}
                  ${isBottom ? 'rounded-b-sm' : ''}
                `}
              >
                {/* Layer number badge */}
                <div
                  className={`
                    flex-shrink-0 w-8 h-8 flex items-center justify-center
                    font-bold text-xs border-2
                    ${status === 'completed'
                      ? 'bg-green-600 border-green-700 text-white'
                      : status === 'current'
                      ? 'bg-amber-600 border-amber-700 text-white'
                      : status === 'available'
                      ? 'bg-slate-800 border-slate-900 text-white'
                      : 'bg-slate-300 border-slate-400 text-slate-500'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : status === 'locked' ? (
                    <LockClosedIcon className="w-4 h-4" />
                  ) : (
                    layer.icon
                  )}
                </div>

                {/* Layer info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">
                      {layer.shortName}
                    </span>
                    {status === 'current' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-600 text-white text-[10px] font-bold uppercase">
                        <PlayIcon className="w-2.5 h-2.5" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-75 truncate">
                    {layer.description}
                  </p>
                </div>

                {/* Status indicator */}
                {status === 'completed' && (
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                )}
                {status === 'current' && (
                  <ChevronRightIcon className="w-5 h-5 text-amber-600 flex-shrink-0 animate-pulse" />
                )}
              </div>

              {/* Connector line between layers */}
              {!isBottom && (
                <div
                  className={`
                    absolute left-1/2 -bottom-1 w-0.5 h-2 -translate-x-1/2
                    ${completedLayers.includes(layer.id)
                      ? 'bg-green-400'
                      : 'bg-slate-300'
                    }
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Foundation indicator */}
      <div className="mt-3 text-center">
        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
          {completedLayers.length === 6 ? '[ Manual Complete ]' : '[ Building Your Manual ]'}
        </span>
      </div>
    </div>
  );
}

function ProgressIndicator({
  completedLayers,
}: {
  completedLayers: number[];
}) {
  const percentage = Math.round((completedLayers.length / 6) * 100);

  return (
    <div className="font-mono">
      {/* Progress text */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-slate-600 uppercase tracking-wider">
          Journey Progress
        </span>
        <span className="text-sm font-bold text-slate-800">
          {completedLayers.length}/6 Layers
        </span>
      </div>

      {/* Segmented progress bar */}
      <div className="flex gap-1">
        {[6, 5, 4, 3, 2, 1].map((layerId) => (
          <div
            key={layerId}
            className={`
              flex-1 h-3 border-2 transition-colors duration-300
              ${completedLayers.includes(layerId)
                ? 'bg-green-600 border-green-700'
                : 'bg-slate-100 border-slate-300'
              }
            `}
          />
        ))}
      </div>

      {/* ASCII representation */}
      <div className="mt-1.5 text-center text-xs text-slate-500">
        {[6, 5, 4, 3, 2, 1].map((layerId) =>
          completedLayers.includes(layerId) ? '\u2588' : '\u2591'
        ).join('')}
        {' '}{percentage}%
      </div>
    </div>
  );
}

function StartButton({
  onClick,
  hasStarted,
  personName,
}: {
  onClick: () => void;
  hasStarted: boolean;
  personName?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="
        group relative w-full
        bg-amber-500 hover:bg-amber-600
        border-4 border-slate-800
        shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
        hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
        hover:translate-x-[4px] hover:translate-y-[4px]
        transition-all duration-150
        p-6
        font-mono
      "
    >
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-slate-800" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-slate-800" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-slate-800" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-slate-800" />

      {/* Button content */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <PlayIcon className="w-8 h-8 text-slate-800" />
          <span className="text-2xl font-bold text-slate-800 uppercase tracking-wider">
            {hasStarted ? 'Continue Journey' : 'Start Your Journey'}
          </span>
        </div>

        {personName && (
          <span className="text-sm text-slate-700">
            Building the manual for{' '}
            <span className="font-bold">{personName}</span>
          </span>
        )}

        <span className="text-xs text-slate-600 uppercase tracking-widest">
          {hasStarted ? '[ Resume where you left off ]' : '[ Begin the 6-layer framework ]'}
        </span>
      </div>
    </button>
  );
}

// ==================== Main Component ====================

export function OnboardingHero({
  hasStarted,
  currentLayer,
  completedLayers,
  onStartOnboarding,
  personName,
}: OnboardingHeroProps) {
  const isComplete = completedLayers.length === 6;

  return (
    <TechnicalCard
      shadowSize="lg"
      cornerBrackets
      className="p-6 bg-gradient-to-br from-white to-slate-50"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <TechnicalLabel variant="filled" color="amber" size="md">
            {isComplete ? 'MANUAL COMPLETE' : hasStarted ? 'ONBOARDING IN PROGRESS' : 'START HERE'}
          </TechnicalLabel>

          {hasStarted && !isComplete && currentLayer && (
            <TechnicalLabel variant="outline" color="slate" size="sm">
              LAYER {currentLayer} ACTIVE
            </TechnicalLabel>
          )}
        </div>

        <h2 className="font-mono text-xl font-bold text-slate-800 uppercase tracking-wide">
          {isComplete
            ? 'Your Operating Manual is Ready'
            : hasStarted
            ? 'Continue Building Your Manual'
            : 'Build Your Relationship Manual'
          }
        </h2>

        {personName && (
          <p className="mt-1 font-mono text-sm text-slate-600">
            {isComplete
              ? `The manual for ${personName} is complete and ready to use.`
              : `Creating an operating manual for understanding and supporting ${personName}.`
            }
          </p>
        )}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side: Layer stack visualization */}
        <div className="order-2 lg:order-1">
          <div className="mb-3">
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">
              [ 6-Layer Framework ]
            </span>
          </div>
          <LayerStack
            currentLayer={currentLayer}
            completedLayers={completedLayers}
          />
        </div>

        {/* Right side: CTA and progress */}
        <div className="order-1 lg:order-2 flex flex-col gap-6">
          {/* Progress indicator (only show if started) */}
          {hasStarted && (
            <div className="p-4 bg-slate-50 border-2 border-slate-200">
              <ProgressIndicator completedLayers={completedLayers} />
            </div>
          )}

          {/* CTA Button */}
          {!isComplete && (
            <StartButton
              onClick={onStartOnboarding}
              hasStarted={hasStarted}
              personName={personName}
            />
          )}

          {/* Completion message */}
          {isComplete && (
            <div className="p-6 bg-green-50 border-2 border-green-600">
              <div className="flex items-start gap-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600 flex-shrink-0" />
                <div className="font-mono">
                  <h3 className="font-bold text-green-800 uppercase tracking-wide mb-1">
                    Congratulations!
                  </h3>
                  <p className="text-sm text-green-700">
                    You have completed all 6 layers. Your operating manual is now ready to guide your interactions and growth.
                  </p>
                  <button
                    onClick={onStartOnboarding}
                    className="
                      mt-4 px-4 py-2
                      bg-green-600 hover:bg-green-700
                      text-white font-bold text-sm uppercase tracking-wider
                      border-2 border-green-700
                      shadow-[3px_3px_0px_0px_rgba(21,128,61,1)]
                      hover:shadow-[1px_1px_0px_0px_rgba(21,128,61,1)]
                      hover:translate-x-[2px] hover:translate-y-[2px]
                      transition-all duration-150
                    "
                  >
                    [ View Your Manual ]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Framework description (only for not started state) */}
          {!hasStarted && (
            <div className="p-4 bg-slate-800 text-white font-mono">
              <div className="text-xs text-amber-400 uppercase tracking-widest mb-2">
                About the Framework
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                The 6-layer framework helps you build a comprehensive &quot;operating manual&quot; for your relationship.
                Start from the top with your core values and work down to specific triggers and strategies.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Estimated time: 20-30 min</span>
                  <span>6 layers to complete</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer section number */}
      <div className="mt-6 pt-4 border-t-2 border-slate-200 flex items-center justify-between">
        <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">
          Section 01 / Onboarding
        </span>
        <span className="font-mono text-xs text-slate-400">
          RELISH v2.0
        </span>
      </div>
    </TechnicalCard>
  );
}

export default OnboardingHero;
