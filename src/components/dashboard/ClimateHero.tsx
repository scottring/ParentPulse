'use client';

import { ClimateIcon } from './ClimateIcon';
import {
  scoreToClimate,
  getOnboardingClimate,
  getGreeting,
  type ClimateState,
} from '@/lib/climate-engine';
import type { OverallHealth } from '@/types/ring-scores';
import type { DashboardState } from '@/hooks/useDashboard';

interface ClimateHeroProps {
  health: OverallHealth | null;
  dashboardState: DashboardState;
  userName?: string;
}

export function ClimateHero({ health, dashboardState, userName }: ClimateHeroProps) {
  const greeting = getGreeting(userName);

  // Active state: use real health data
  if (dashboardState === 'active' && health) {
    const climate = scoreToClimate(health.score, health.trend);

    return (
      <div
        className="relative rounded-2xl overflow-hidden px-8 py-10 md:py-12"
        style={{ background: climate.gradient }}
      >
        <div className="flex items-center gap-6">
          <ClimateIcon state={climate.iconName} size={56} className="shrink-0 opacity-80" />
          <div>
            <h1
              className="text-2xl md:text-3xl font-light tracking-tight"
              style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
            >
              {greeting}
            </h1>
            <p
              className="mt-1.5 text-base"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
            >
              {climate.label}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding states: use preset climates
  const onboarding = getOnboardingClimate(dashboardState, userName);

  return (
    <div
      className="relative rounded-2xl overflow-hidden px-8 py-10 md:py-12"
      style={{ background: onboarding.gradient }}
    >
      <div>
        <h1
          className="text-2xl md:text-3xl font-light tracking-tight"
          style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
        >
          {greeting}
        </h1>
        <p
          className="mt-2 text-base"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
        >
          {onboarding.message}
        </p>
      </div>
    </div>
  );
}
