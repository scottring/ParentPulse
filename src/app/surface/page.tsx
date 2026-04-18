'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useCoupleRitual } from '@/hooks/useCoupleRitual';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useJournalEcho } from '@/hooks/useJournalEcho';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useActionItems } from '@/hooks/useActionItems';
import { useDinnerPrompt } from '@/hooks/useDinnerPrompt';
import { resolveRecipe } from '@/lib/surface-recipes';
import { SurfaceLayout } from '@/components/surface/SurfaceLayout';
import { HeroSlot } from '@/components/surface/HeroSlot';
import { GridSlot } from '@/components/surface/GridSlot';
import Navigation from '@/components/layout/Navigation';
import type { SurfaceData } from '@/types/surface-recipe';

/**
 * /surface — the curated dashboard. Previously rendered at / for
 * signed-in users; now lives on its own route while / hosts the
 * library desk anchor page.
 */
export default function SurfacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F0E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic',
            fontSize: '1.25rem',
            color: '#8B7E6A',
          }}
        >
          Loading&hellip;
        </span>
      </div>
    );
  }

  return <SurfaceInner />;
}

function SurfaceInner() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const { ritual } = useCoupleRitual();
  const { entries: journalEntries } = useJournalEntries();
  const { echo } = useJournalEcho(journalEntries);
  const growth = useGrowthFeed();
  const actionItems = useActionItems({
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
    assessments: dashboard.assessments,
    userId: user!.userId,
  });
  const { prompt: dinnerPrompt } = useDinnerPrompt();

  if (dashboard.loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F5F0E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic',
            fontSize: '1.25rem',
            color: '#8B7E6A',
          }}
        >
          Loading&hellip;
        </span>
      </div>
    );
  }

  const data: SurfaceData = {
    stage: dashboard.state,
    people: dashboard.people,
    manuals: dashboard.manuals,
    contributions: dashboard.contributions,
    selfPerson: dashboard.selfPerson,
    spouse: dashboard.spouse,
    peopleNeedingContributions: dashboard.peopleNeedingContributions,
    hasSelfContribution: dashboard.hasSelfContribution,
    activeGrowthItems: growth.activeItems,
    arcGroups: growth.arcGroups,
    journalEntries,
    echo,
    ritual,
    actionItems: actionItems.items,
    dinnerPrompt,
    hasAssessments: dashboard.hasAssessments,
  };

  const resolved = resolveRecipe(data);

  return (
    <>
      <Navigation />
      <main>
        <SurfaceLayout
          hero={<HeroSlot heroId={resolved.hero} data={data} />}
          grid={<GridSlot tileIds={resolved.gridTiles} data={data} />}
          gridTileCount={resolved.gridTiles.length}
        />
      </main>
    </>
  );
}
