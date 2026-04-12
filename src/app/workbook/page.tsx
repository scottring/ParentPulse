'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';

import Volume from '@/components/magazine/Volume';
import Masthead from '@/components/magazine/Masthead';
import PrimaryRow from '@/components/magazine/PrimaryRow';
import SideColumn from '@/components/magazine/SideColumn';
import Section from '@/components/magazine/Section';
import ContentGrid from '@/components/magazine/ContentGrid';
import BackIssues from '@/components/magazine/BackIssues';

import FeaturedFocus from '@/components/workbook/FeaturedFocus';
import ArcSpine from '@/components/workbook/ArcSpine';
import PracticeCard from '@/components/workbook/PracticeCard';
import ReadingCard from '@/components/workbook/ReadingCard';
import KeptEntry from '@/components/workbook/KeptEntry';
import AllKept from '@/components/workbook/AllKept';
import {
  pickTodayFocus,
  isReading,
  weekStart,
} from '@/components/workbook/helpers';

// ================================================================
// THE WORKBOOK — practice library in magazine dressing.
//
// Same data as the current /journal page (growth feed), re-expressed
// through the extracted magazine primitives. /journal itself is
// untouched; once this route is validated, /journal can be rebuilt as
// the diary-style surface per the Apr 11 journal-first architecture.
// ================================================================
export default function WorkbookPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { arcGroups, activeItems, completedItems, loading } = useGrowthFeed();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const focusItem = useMemo(
    () => pickTodayFocus(activeItems),
    [activeItems],
  );

  const otherPractices = useMemo(
    () =>
      activeItems.filter(
        (i) =>
          !isReading(i) && i.growthItemId !== focusItem?.growthItemId,
      ),
    [activeItems, focusItem],
  );

  const readings = useMemo(
    () =>
      activeItems.filter(
        (i) => isReading(i) && i.growthItemId !== focusItem?.growthItemId,
      ),
    [activeItems, focusItem],
  );

  const keptThisWeek = useMemo(() => {
    const start = weekStart().getTime();
    return (completedItems || [])
      .filter((i) => {
        if (i.status !== 'completed') return false;
        const ts = i.statusUpdatedAt?.toDate?.()?.getTime() || 0;
        return ts >= start;
      })
      .sort((a, b) => {
        const aTs = a.statusUpdatedAt?.toDate?.()?.getTime() || 0;
        const bTs = b.statusUpdatedAt?.toDate?.()?.getTime() || 0;
        return bTs - aTs;
      });
  }, [completedItems]);

  const allKept = activeItems.length === 0 && keptThisWeek.length > 0;
  const hasContent =
    activeItems.length > 0 ||
    arcGroups.length > 0 ||
    keptThisWeek.length > 0;

  if (authLoading || loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the Workbook&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const firstName = (user.name || 'Reader').split(' ')[0];

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="relish-container">
          <Volume
            masthead={<Masthead title={`${firstName}'s Workbook`} />}
          >
            {!hasContent ? (
              <EmptyWorkbook />
            ) : (
              <>
                <PrimaryRow
                  featured={
                    focusItem ? (
                      <div data-walkthrough="featured-focus"><FeaturedFocus item={focusItem} /></div>
                    ) : allKept ? (
                      <AllKept keptCount={keptThisWeek.length} />
                    ) : (
                      <div className="workbook-featured-empty">
                        <p className="press-body-italic">
                          No practice waiting today. Open an arc on the
                          right, or capture a thought.
                        </p>
                        <style jsx>{`
                          .workbook-featured-empty {
                            padding: 40px;
                            text-align: center;
                            border: 1px dashed rgba(200, 190, 172, 0.6);
                            border-radius: 2px;
                          }
                        `}</style>
                      </div>
                    )
                  }
                  aside={
                    arcGroups.length > 0 ? (
                      <div data-walkthrough="arcs"><SideColumn eyebrow="Ongoing" title="Arcs">
                        {arcGroups.map((group, idx) => (
                          <ArcSpine
                            key={group.arc.arcId}
                            group={group}
                            index={idx + 1}
                          />
                        ))}
                      </SideColumn></div>
                    ) : undefined
                  }
                />

                {otherPractices.length > 0 && (
                  <Section
                    eyebrow="This week"
                    title="Other practices waiting"
                  >
                    <ContentGrid variant="practices">
                      {otherPractices.map((item) => (
                        <PracticeCard
                          key={item.growthItemId}
                          item={item}
                        />
                      ))}
                    </ContentGrid>
                  </Section>
                )}

                {readings.length > 0 && (
                  <Section
                    eyebrow="Also"
                    title="Things to read"
                    tone="readings"
                  >
                    <ContentGrid variant="readings">
                      {readings.map((item) => (
                        <ReadingCard
                          key={item.growthItemId}
                          item={item}
                        />
                      ))}
                    </ContentGrid>
                  </Section>
                )}

                {keptThisWeek.length > 0 && (
                  <Section
                    eyebrow="Kept this week"
                    title="What you&rsquo;ve set down"
                    tone="kept"
                  >
                    <div className="workbook-kept-list">
                      {keptThisWeek.map((item) => (
                        <KeptEntry
                          key={item.growthItemId}
                          item={item}
                        />
                      ))}
                    </div>
                    <style jsx>{`
                      .workbook-kept-list {
                        display: flex;
                        flex-direction: column;
                        max-width: 720px;
                      }
                    `}</style>
                  </Section>
                )}

                <BackIssues />
              </>
            )}
          </Volume>
        </div>
      </div>
    </div>
  );
}

function EmptyWorkbook() {
  return (
    <div className="press-empty" style={{ padding: '80px 40px' }}>
      <p className="press-empty-title">
        The Workbook is waiting for its first page.
      </p>
      <p className="press-empty-body">
        Open a manual for someone you love, or capture a thought with
        the pen. Practices appear here as your growth arcs take shape.
      </p>
      <Link href="/family-manual" className="press-link">
        Open the Family Manual
        <span className="arrow">⟶</span>
      </Link>
      <div className="press-fleuron mt-8">❦</div>
    </div>
  );
}
