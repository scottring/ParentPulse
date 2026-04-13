'use client';

import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useJournalEcho } from '@/hooks/useJournalEcho';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useActionItems } from '@/hooks/useActionItems';
import { useFreshness } from '@/hooks/useFreshness';

import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Volume from '@/components/magazine/Volume';
import Masthead from '@/components/magazine/Masthead';

import SurfaceContent from './SurfaceContent';
import { computeSurfaceSections } from '@/lib/surface-priority';

/**
 * TheSurface — the signed-in home page.
 *
 * One scrollable page that draws from journal, manual, and growth
 * system. Sections appear and disappear based on what data exists
 * and what matters today.
 */
export default function TheSurface() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const { entries, loading: entriesLoading } = useJournalEntries();
  const { echo } = useJournalEcho(entries);
  const growthFeed = useGrowthFeed();

  const { items: actionItems } = useActionItems({
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
    assessments: dashboard.assessments,
    userId: user?.userId || '',
  });

  const { familyCompleteness } = useFreshness({
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
  });

  const firstName = (user?.name || 'Reader').split(' ')[0];

  // Auto-trigger growth generation when the backend flags it.
  // The onSynthesisComplete Cloud Function sets needsGrowthGeneration
  // on the family doc; when the dashboard detects it, we call
  // generateBatch once per session.
  const hasTriggeredGeneration = useRef(false);
  useEffect(() => {
    if (
      dashboard.state === 'active' &&
      growthFeed.activeItems.length === 0 &&
      !growthFeed.generating &&
      !hasTriggeredGeneration.current &&
      dashboard.hasAssessments
    ) {
      hasTriggeredGeneration.current = true;
      growthFeed.generateBatch().catch(() => {
        // Non-critical — the Surface still works without growth items
      });
    }
  }, [dashboard.state, dashboard.hasAssessments, growthFeed]);

  // Auto-seed assessments when dashboard reaches active state but has none
  const hasTriggeredSeeding = useRef(false);
  useEffect(() => {
    if (
      dashboard.state === 'has_contributions' &&
      !dashboard.hasAssessments &&
      !hasTriggeredSeeding.current
    ) {
      hasTriggeredSeeding.current = true;
      growthFeed.seedAssessments().catch(() => {
        // Non-critical
      });
    }
  }, [dashboard.state, dashboard.hasAssessments, growthFeed]);

  // Dismissed items — session-scoped (resets on reload so nothing
  // is permanently hidden). Each section can dismiss its content by
  // ID, which causes the priority engine to skip it and surface the
  // next item.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  }, []);

  // Compute prioritized sections for active state
  const sections = useMemo(() => {
    if (dashboard.state !== 'active') return null;
    return computeSurfaceSections({
      dashboardState: dashboard.state,
      actionItems,
      activeGrowthItems: growthFeed.activeItems,
      arcGroups: growthFeed.arcGroups,
      manuals: dashboard.manuals,
      people: dashboard.people,
      contributions: dashboard.contributions,
      journalEntries: entries,
      echo,
      userId: user?.userId || '',
      dismissedIds,
    });
  }, [
    dashboard.state,
    dashboard.manuals,
    dashboard.people,
    dashboard.contributions,
    actionItems,
    growthFeed.activeItems,
    growthFeed.arcGroups,
    entries,
    echo,
    user?.userId,
    dismissedIds,
  ]);

  // Loading state
  if (dashboard.loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening today&rsquo;s page&hellip;</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="relish-container">
          <Volume
            masthead={<Masthead title={`${firstName}\u2019s Relish`} />}
          >
            <SurfaceContent
              state={dashboard.state}
              selfPerson={dashboard.selfPerson}
              firstPersonNeedingContribution={
                dashboard.peopleNeedingContributions[0] || null
              }
              sections={sections}
              onDismiss={dismiss}
            />
          </Volume>
        </div>
      </div>
    </div>
  );
}
