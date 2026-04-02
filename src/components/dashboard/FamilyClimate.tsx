'use client';

import { ClimateIcon } from './ClimateIcon';
import {
  scoreToClimate,
  getOnboardingClimate,
  getGreeting,
  buildClimateSummary,
} from '@/lib/climate-engine';
import type { OverallHealth } from '@/types/ring-scores';
import type { DashboardState, UserRole } from '@/hooks/useDashboard';

interface FamilyClimateProps {
  health: OverallHealth | null;
  dashboardState: DashboardState;
  userName?: string;
  roles: UserRole[];
}

export function FamilyClimate({ health, dashboardState, userName, roles }: FamilyClimateProps) {
  const greeting = getGreeting(userName);

  // Active state: real data
  if (dashboardState === 'active' && health) {
    const climate = scoreToClimate(health.score, health.trend);
    const summary = buildClimateSummary(health, roles);

    return (
      <div
        className="rounded-2xl overflow-hidden px-7 py-8"
        style={{ background: climate.gradient }}
      >
        <h1
          className="text-2xl font-light tracking-tight"
          style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
        >
          {greeting}
        </h1>

        {summary && (
          <p
            className="mt-3 text-sm leading-relaxed max-w-md"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
          >
            {summary}
          </p>
        )}

        <div className="flex items-center gap-2 mt-4">
          <ClimateIcon state={climate.iconName} size={20} className="opacity-60" />
          <span
            className="text-xs"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            {climate.label}
          </span>
        </div>
      </div>
    );
  }

  // Onboarding states
  const onboarding = getOnboardingClimate(dashboardState, userName);

  return (
    <div
      className="rounded-2xl overflow-hidden px-7 py-8"
      style={{ background: onboarding.gradient }}
    >
      <h1
        className="text-2xl font-light tracking-tight"
        style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
      >
        {greeting}
      </h1>
      <p
        className="mt-2 text-sm"
        style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
      >
        {onboarding.message}
      </p>
    </div>
  );
}
