'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';
import type { GrowthItem } from '@/types/growth';
import type { GrowthArc } from '@/types/growth-arc';

// ================================================================
// Picker: choose the single focus practice
// ================================================================
function pickTodayFocus(items: GrowthItem[]): GrowthItem | null {
  if (items.length === 0) return null;
  const ranked = [...items].sort((a, b) => {
    const aGap = a.sourceInsightType === 'gap' ? 1 : 0;
    const bGap = b.sourceInsightType === 'gap' ? 1 : 0;
    if (aGap !== bGap) return bGap - aGap;
    const aExp = a.expiresAt?.toDate?.()?.getTime() || Number.MAX_SAFE_INTEGER;
    const bExp = b.expiresAt?.toDate?.()?.getTime() || Number.MAX_SAFE_INTEGER;
    if (aExp !== bExp) return aExp - bExp;
    return (a.estimatedMinutes || 999) - (b.estimatedMinutes || 999);
  });
  return ranked[0];
}

// ================================================================
// Roman numeral helper
// ================================================================
function toRoman(n: number): string {
  if (n < 1) return '';
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let num = n;
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result.toLowerCase();
}

// ================================================================
// Phase labels — lowercase, italic voice
// ================================================================
const PHASE_LABELS: Record<string, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

// ================================================================
// Date formatting — "Tuesday, April VIII"
// ================================================================
function formatPressDate(d: Date): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const day = toRoman(d.getDate()).toUpperCase();
  return `${weekday}, ${month} ${day}`;
}

function formatVolumeNumber(d: Date): string {
  // Week of year as volume
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const week = Math.ceil((diff + start.getDay() + 1) / 7);
  return toRoman(week).toUpperCase();
}

// ================================================================
// Page component
// ================================================================
export default function WorkbookPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { arcGroups, activeItems, loading } = useGrowthFeed();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const focusItem = useMemo(() => pickTodayFocus(activeItems), [activeItems]);
  const otherItems = useMemo(
    () => activeItems.filter((i) => i.growthItemId !== focusItem?.growthItemId),
    [activeItems, focusItem],
  );
  const totalMinutes = useMemo(
    () => activeItems.reduce((sum, i) => sum + (i.estimatedMinutes || 0), 0),
    [activeItems],
  );

  if (authLoading || loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the workbook&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const today = new Date();
  const firstName = (user.name || 'Reader').split(' ')[0];
  const hasContent = activeItems.length > 0 || arcGroups.length > 0;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="relish-container" style={{ maxWidth: 1120 }}>

          {/* The volume — the book as an object */}
          <div className="press-volume mt-8 relative overflow-hidden">

            {/* Running header across the top of the spread */}
            <div className="press-running-header">
              <span>{firstName}&rsquo;s Workbook</span>
              <span className="sep">·</span>
              <span>Volume {formatVolumeNumber(today)}</span>
              <span className="sep">·</span>
              <span>{formatPressDate(today)}</span>
            </div>

            {!hasContent ? (
              <EmptyWorkbook />
            ) : (
              <>
                {/* The two-page spread */}
                <div className="spread-container relative">
                  {/* Gutter — the subtle dip where pages meet the spine */}
                  <div className="press-gutter" aria-hidden="true" />

                  {/* ============ LEFT PAGE ============ */}
                  <LeftPage arcGroups={arcGroups} />

                  {/* ============ RIGHT PAGE ============ */}
                  <RightPage focusItem={focusItem} otherItems={otherItems} />
                </div>

                {/* Bottom running band — the count summary */}
                <CountBand
                  arcCount={arcGroups.length}
                  practiceCount={activeItems.length}
                  totalMinutes={totalMinutes}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Empty state — quiet, poetic, on-brand
// ================================================================
function EmptyWorkbook() {
  return (
    <div className="press-empty">
      <p className="press-empty-title">
        These pages are still waiting to be written.
      </p>
      <p className="press-empty-body">
        Open a manual for someone you love, or tap the pen in the corner
        to capture a thought. The workbook fills itself as you go.
      </p>
      <Link href="/family-manual" className="press-link">
        Open the Family Manual
        <span className="arrow">⟶</span>
      </Link>
      <div className="press-fleuron mt-8">❦</div>
    </div>
  );
}

// ================================================================
// Left page: Chapters in Progress
// ================================================================
function LeftPage({
  arcGroups,
}: {
  arcGroups: ReturnType<typeof useGrowthFeed>['arcGroups'];
}) {
  return (
    <div className="press-page-left" style={{ minHeight: 560 }}>
      <h2 className="press-display-md mb-1">Chapters in progress</h2>
      <p
        className="press-marginalia mb-6"
        style={{ borderBottom: '1px solid rgba(200,190,172,0.5)', paddingBottom: 18 }}
      >
        The longer works you and yours are walking through, one week
        at a time.
      </p>

      {arcGroups.length === 0 ? (
        <NoChapters />
      ) : (
        <div>
          {arcGroups.map((group, idx) => (
            <ChapterEntry
              key={group.arc.arcId}
              arc={group.arc}
              index={idx + 1}
              isLast={idx === arcGroups.length - 1}
            />
          ))}
        </div>
      )}

      {/* Folio — left page gets lowercase roman */}
      <div
        style={{
          position: 'absolute',
          left: 56,
          bottom: 76,
          pointerEvents: 'none',
        }}
        className="press-folio"
      >
        ix
      </div>
    </div>
  );
}

function NoChapters() {
  return (
    <div className="py-4">
      <p className="press-body-italic" style={{ fontSize: 15 }}>
        No chapters yet. They begin when you start a growth arc with
        someone — a multi-week practice focused on one dimension of
        your relationship.
      </p>
    </div>
  );
}

// ================================================================
// A single chapter entry on the left page
// ================================================================
function ChapterEntry({
  arc,
  index,
  isLast,
}: {
  arc: GrowthArc;
  index: number;
  isLast: boolean;
}) {
  const phase = PHASE_LABELS[arc.currentPhase] || arc.currentPhase;
  const weekLabel = `Week ${toRoman(arc.currentWeek)} of ${toRoman(arc.durationWeeks)}`;
  const completed = arc.completedItemCount || 0;
  const total = arc.totalItemCount || 0;
  const remaining = Math.max(total - completed, 0);

  // Prose about the practices — "three practices kept, five to come"
  const practiceProse =
    total === 0
      ? 'Practices being prepared'
      : completed === 0
        ? `${spellNumber(total)} practices in preparation`
        : remaining === 0
          ? `All ${spellNumber(total)} practices kept`
          : `${capitalize(spellNumber(completed))} kept, ${spellNumber(remaining)} to come`;

  // Participants — in small caps
  const participants = (arc.participantNames || []).join(' & ');

  return (
    <Link
      href={`/growth/${arc.arcId}`}
      className="press-chapter-entry block hover:opacity-85 transition-opacity"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <span className="press-chapter-roman">Chapter {toRoman(index).toUpperCase()}</span>
      <h3 className="press-chapter-title">{arc.title}</h3>
      {participants && (
        <p className="press-chapter-sub">
          with <span className="press-sc">{participants}</span>
        </p>
      )}
      <hr className="press-rule-short" />
      <p className="press-chapter-meta">
        {weekLabel} &middot; <em>{phase}</em>
        <br />
        {practiceProse}
      </p>
      {!isLast && <div className="press-fleuron mt-5">❦</div>}
    </Link>
  );
}

// ================================================================
// Right page: Today's featured practice
// ================================================================
function RightPage({
  focusItem,
  otherItems,
}: {
  focusItem: GrowthItem | null;
  otherItems: GrowthItem[];
}) {
  return (
    <div className="press-page-right" style={{ minHeight: 560, position: 'relative' }}>
      {focusItem ? (
        <TodaysPractice item={focusItem} />
      ) : (
        <div className="py-6">
          <h2 className="press-display-lg mb-6">Today</h2>
          <p className="press-body-italic">
            No practice waiting for you this minute. The day is yours.
          </p>
        </div>
      )}

      {otherItems.length > 0 && <AlsoThisWeek items={otherItems} />}

      {/* Folio — right page */}
      <div
        style={{
          position: 'absolute',
          right: 56,
          bottom: 76,
          pointerEvents: 'none',
        }}
        className="press-folio"
      >
        x
      </div>
    </div>
  );
}

// ================================================================
// Today's practice — the one thing
// ================================================================
function TodaysPractice({ item }: { item: GrowthItem }) {
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');
  const level =
    item.relationalLevel === 'couple'
      ? 'A couple practice'
      : item.relationalLevel === 'family'
        ? 'A family practice'
        : 'Individual';

  const fromChat = Boolean(
    (item as unknown as { sourceChatSessionId?: string }).sourceChatSessionId,
  );

  return (
    <div>
      <span className="press-chapter-label">Today</span>
      <h2 className="press-display-lg">
        {item.title}
      </h2>

      <div className="press-asterism" aria-hidden="true" />

      {/* Body of the practice, with drop cap */}
      <p className="press-body press-drop-cap">
        {item.body}
      </p>

      {fromChat && (
        <p
          className="press-marginalia mt-5 italic"
          style={{ textAlign: 'right' }}
        >
          — drawn from a conversation with the manual
        </p>
      )}

      <hr className="press-rule mt-8" />

      {/* Meta line in small caps */}
      <p className="press-meta-line">
        {romanMinutes(minutes)} minutes
        {about && (
          <>
            <span className="dot">·</span>
            about <span className="press-sc">{about}</span>
          </>
        )}
        <span className="dot">·</span>
        for <span className="press-sc">{forWhom}</span>
        <span className="dot">·</span>
        {level}
      </p>

      {/* The one action — an italic link, not a button */}
      <div className="mt-9">
        <Link
          href={`/growth/${item.growthItemId}`}
          className="press-link"
        >
          Begin this practice
          <span className="arrow">⟶</span>
        </Link>
      </div>
    </div>
  );
}

// ================================================================
// Also this week — the quiet footer list on the right page
// ================================================================
function AlsoThisWeek({ items }: { items: GrowthItem[] }) {
  return (
    <div className="mt-12">
      <span className="press-chapter-label">Also this week</span>
      <div>
        {items.slice(0, 5).map((item) => {
          const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
          const about = item.targetPersonNames?.join(' & ');
          return (
            <Link
              key={item.growthItemId}
              href={`/growth/${item.growthItemId}`}
              className="press-also-entry"
            >
              <p className="press-also-title">{item.title}</p>
              <p className="press-also-meta">
                for <span className="press-sc" style={{ fontSize: 14 }}>{forWhom}</span>
                {about && (
                  <>
                    {' '}· about <span className="press-sc" style={{ fontSize: 14 }}>{about}</span>
                  </>
                )}
                {' '}· {romanMinutes(item.estimatedMinutes || 0)} min
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ================================================================
// The count band at the foot of the spread — answers the 5 questions
// ================================================================
function CountBand({
  arcCount,
  practiceCount,
  totalMinutes,
}: {
  arcCount: number;
  practiceCount: number;
  totalMinutes: number;
}) {
  return (
    <div className="press-count-band">
      <span>
        {arcCount > 0
          ? `${spellNumber(arcCount)} ${arcCount === 1 ? 'chapter' : 'chapters'} in progress`
          : 'No chapters yet'}
      </span>
      <span className="dot">·</span>
      <span>
        {practiceCount > 0
          ? `${spellNumber(practiceCount)} ${practiceCount === 1 ? 'practice' : 'practices'} this week`
          : 'No practices'}
      </span>
      <span className="dot">·</span>
      <span>
        {totalMinutes > 0 ? `about ${spellNumber(totalMinutes)} minutes total` : 'A quiet week'}
      </span>
    </div>
  );
}

// ================================================================
// Small helpers
// ================================================================
function romanMinutes(n: number): string {
  // For the display: use roman for small, arabic for larger
  if (n <= 20) return toRoman(n).toUpperCase();
  return String(n);
}

function spellNumber(n: number): string {
  const names = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  ];
  return n >= 0 && n <= 20 ? names[n] : String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
