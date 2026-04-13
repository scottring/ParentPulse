'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById, usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { useEquivalentManualIds } from '@/hooks/useEquivalentManualIds';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { useDashboard } from '@/hooks/useDashboard';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import type { Person } from '@/types/person-manual';
import {
  RelishPage,
  RelishMasthead,
  RelishSection,
  RelishKicker,
  RelishSectionHeading,
  RelishCard,
  RelishBand,
  RelishLink,
  RelishPill,
  RelishContributorChip,
  relishColor,
  relishFont,
  relishType,
  relishSpace,
  relishBorder,
  relishRadius,
} from '@/components/relish-theme';

const SERIF = relishFont.serif;
const BODY = relishFont.body;
const INK = relishColor.ink;
const MUTED = relishColor.muted;
const FAINT = relishColor.faint;
const SAND = relishColor.sand;
const CREAM = relishColor.cream;
const EDGE = relishColor.edge;
const SAGE = relishColor.sage;
const GOLD = relishColor.gold;
const CORAL = relishColor.coral;
const T = relishType;

// ================================================================
// Main
// ================================================================
export default function RelishClientPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { people } = usePerson();
  const equivalentManualIds = useEquivalentManualIds(personId, people);
  const { contributions, loading: contribLoading } = useContribution(
    manual?.manualId,
    equivalentManualIds,
  );
  const { entries: journalEntries, loading: journalLoading } = useJournalEntries();
  const { activeItems: growthActive, completedItems: growthCompleted, loading: growthLoading } = useGrowthFeed();
  const { assessments } = useDashboard();

  const loading = authLoading || personLoading || manualLoading || contribLoading;

  // ---- Contributors strip (self + observers, deduped) ----
  const contributors = useMemo(() => {
    if (!person) return [];
    const items: Array<{ id: string; name: string; role: string; status: 'done' | 'partial' | 'none' }> = [];

    // The self chapter — from the subject themselves.
    const selfContrib = contributions.find((c) => c.perspectiveType === 'self' && c.status === 'complete')
      ?? contributions.find((c) => c.perspectiveType === 'self');
    items.push({
      id: 'self',
      name: person.name,
      role: 'Self',
      status: selfContrib
        ? selfContrib.status === 'complete' ? 'done' : 'partial'
        : 'none',
    });

    // Observers — dedupe by the displayed identity (contributorName), keeping the most
    // progressed contribution. We key on name because parent-supervised kid contributions
    // all share the parent's contributorId but carry distinct contributorNames.
    const observerContribs = contributions.filter((c) => c.perspectiveType === 'observer');
    const byIdentity = new Map<string, typeof observerContribs[number]>();
    for (const c of observerContribs) {
      const key = c.contributorName?.trim() || c.contributorId;
      const existing = byIdentity.get(key);
      if (!existing || (c.status === 'complete' && existing.status !== 'complete')) {
        byIdentity.set(key, c);
      }
    }
    for (const c of byIdentity.values()) {
      // Find the person record this perspective represents — by name first (handles proxy
      // entry), then by linked user.
      const personByName = people.find((p: Person) => p.name === c.contributorName);
      const linkedPerson = personByName ?? people.find((p: Person) => p.linkedUserId === c.contributorId);
      const displayName = c.contributorName?.trim() || linkedPerson?.name || 'A contributor';
      items.push({
        id: `${c.contributorId}:${c.contributorName}`,
        name: displayName,
        role: linkedPerson ? relLabel(linkedPerson) : 'Observer',
        status: c.status === 'complete' ? 'done' : 'partial',
      });
    }
    return items;
  }, [person, people, contributions]);

  // ---- Compendium: journal + growth + manual ----
  // Journal — entries that mention or are about this person
  const personJournalEntries = useMemo(() => {
    return journalEntries
      .filter((e) =>
        e.personMentions?.includes(personId) ||
        e.subjectPersonId === personId ||
        e.enrichment?.aiPeople?.includes(personId),
      )
      .sort((a, b) => {
        const ad = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bd = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bd - ad;
      });
  }, [journalEntries, personId]);

  const latestJournalEntry = personJournalEntries[0];

  // Growth — items where this person is a target
  const personGrowthActive = useMemo(
    () => growthActive.filter((g) => g.targetPersonIds?.includes(personId)),
    [growthActive, personId],
  );
  const personGrowthCompleted = useMemo(
    () => growthCompleted.filter((g) => g.targetPersonIds?.includes(personId)),
    [growthCompleted, personId],
  );
  const latestGrowthItem = personGrowthActive[0] ?? personGrowthCompleted[0];

  // Assessments — ring scores for this person
  const personAssessments = useMemo(
    () => assessments.filter((a) => a.participantIds?.includes(personId)),
    [assessments, personId],
  );

  // ---- Synthesis numbers ----
  const alignments = manual?.synthesizedContent?.alignments ?? [];
  const gaps = manual?.synthesizedContent?.gaps ?? [];
  const blindSpots = manual?.synthesizedContent?.blindSpots ?? [];
  const totalInsights = alignments.length + gaps.length + blindSpots.length;

  const overview = manual?.synthesizedContent?.overview;

  if (loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the volume&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user || !person) return null;

  const firstName = person.name.split(' ')[0];

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <RelishPage>

          {/* ==================== MASTHEAD ==================== */}
          <RelishMasthead
            title={<>{firstName}&rsquo;s Relish</>}
            byline={<>Volume I &nbsp;&middot;&nbsp; Kept by {(user.name ?? 'You').split(' ')[0]}</>}
          />

          {/* ==================== PERSPECTIVES LINE ==================== */}
          <section style={{ marginBottom: 52 }}>
            <PerspectivesLine contributors={contributors} />
          </section>

          {/* ==================== RECENT CAPTURES ==================== */}
          <SectionHeading>From Across the Compendium</SectionHeading>
          <section style={{ marginBottom: 52 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 18,
              }}
            >
              <CaptureCard
                idx={0}
                kind="journal"
                title="Journal"
                href={latestJournalEntry ? `/journal/${latestJournalEntry.entryId}` : '/journal'}
                body={
                  latestJournalEntry?.text ??
                  'No journal entries mention ' + (person.name.split(' ')[0]) + ' yet.'
                }
                tag={
                  latestJournalEntry
                    ? formatTimeAgo(latestJournalEntry.createdAt?.toDate?.())
                    : `from /journal`
                }
              />
              <CaptureCard
                idx={1}
                kind="observation"
                title="Workbook"
                href={latestGrowthItem ? `/growth/${latestGrowthItem.growthItemId}` : '/workbook'}
                body={
                  latestGrowthItem?.body ??
                  latestGrowthItem?.title ??
                  `No growth work underway for ${person.name.split(' ')[0]} yet.`
                }
                tag={
                  latestGrowthItem
                    ? latestGrowthItem.status === 'completed'
                      ? 'Completed'
                      : latestGrowthItem.depthTier ?? 'Active'
                    : 'from /workbook'
                }
              />
              <CaptureCard
                idx={2}
                kind="reflection"
                title="Manual"
                href={`/people/${personId}/manual`}
                body={
                  overview ??
                  alignments[0]?.synthesis ??
                  gaps[0]?.synthesis ??
                  'The manual synthesis will appear once two perspectives are in.'
                }
                tag={
                  overview ? 'Synthesized' : totalInsights > 0 ? `${totalInsights} insights` : 'from /family-manual'
                }
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link
                href={`/people/${personId}/manual`}
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: MUTED,
                  textDecoration: 'none',
                }}
              >
                Read the full entry {'\u2192'}
              </Link>
            </div>
          </section>

          {/* ==================== WHAT THE SYNTHESIS SAYS ==================== */}
          <SectionHeading>What the Synthesis Says</SectionHeading>
          <section style={{ marginBottom: 52 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.3fr',
                gap: 24,
                padding: '28px 24px',
                background: '#FFFFFF',
                border: `1px solid ${EDGE}`,
                borderRadius: 14,
              }}
            >
              {/* Donut — overall theme */}
              <SynthPanel label="Overall Theme">
                <DonutChart
                  slices={[
                    { value: alignments.length || 1, color: SAGE, label: 'Aligned' },
                    { value: gaps.length || 1, color: CORAL, label: 'Diverging' },
                    { value: blindSpots.length || 0, color: GOLD, label: 'Blind spot' },
                  ]}
                />
                <p
                  style={{
                    fontFamily: SERIF,
                    fontStyle: 'italic',
                    fontSize: 13,
                    color: INK,
                    margin: 0,
                    textAlign: 'center',
                  }}
                >
                  {describeTheme(alignments.length, gaps.length)}
                </p>
              </SynthPanel>

              {/* Bar chart — symbol dashboard */}
              <SynthPanel label="Symbols">
                <BarChart
                  bars={[
                    { label: 'Care', value: 0.82, color: SAGE },
                    { label: 'Work', value: 0.55, color: GOLD },
                    { label: 'Rest', value: 0.38, color: CORAL },
                    { label: 'Play', value: 0.71, color: SAGE },
                  ]}
                />
              </SynthPanel>

              {/* Key takeaways */}
              <SynthPanel label="Key Takeaways">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {takeawaySentences(alignments, gaps).map((t, i) => (
                    <li
                      key={i}
                      style={{
                        fontFamily: SERIF,
                        fontStyle: 'italic',
                        fontSize: 14,
                        color: INK,
                        lineHeight: 1.45,
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <span style={{ color: t.color }}>{'\u2014'}</span>
                      <span>{t.text}</span>
                    </li>
                  ))}
                </ul>
              </SynthPanel>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link
                href={`/people/${personId}/manual`}
                style={{
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: MUTED,
                  textDecoration: 'none',
                }}
              >
                See the full synthesis {'\u2192'}
              </Link>
            </div>
          </section>

          {/* ==================== PROGRESS & ACTIONS ==================== */}
          <section style={{ marginBottom: 40 }}>
            <div
              style={{
                background: SAND,
                border: `1px solid ${EDGE}`,
                borderRadius: 14,
                padding: '28px 26px',
              }}
            >
              <SectionKicker>Progress &amp; Actions</SectionKicker>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 1fr',
                  gap: 24,
                }}
              >
                {/* Integration card */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${EDGE}`,
                    borderRadius: 12,
                    padding: '22px 20px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: 11,
                      color: MUTED,
                      textTransform: 'uppercase',
                      letterSpacing: '0.22em',
                    }}
                  >
                    Next step
                  </span>
                  <p
                    style={{
                      fontFamily: SERIF,
                      fontStyle: 'italic',
                      fontSize: 19,
                      color: INK,
                      margin: '10px 0 14px',
                      lineHeight: 1.35,
                    }}
                  >
                    {gaps[0]
                      ? `Open a conversation about ${gaps[0].topic.toLowerCase()}.`
                      : alignments[0]
                        ? `Build on what's working around ${alignments[0].topic.toLowerCase()}.`
                        : 'Invite a second perspective to begin the volume.'}
                  </p>
                  <Link
                    href={`/people/${personId}/manual`}
                    style={{
                      display: 'inline-block',
                      fontFamily: BODY,
                      fontSize: 13,
                      color: INK,
                      background: CREAM,
                      border: `1px solid ${MUTED}`,
                      borderRadius: 999,
                      padding: '7px 18px',
                      textDecoration: 'none',
                    }}
                  >
                    Take the step
                  </Link>
                </div>

                {/* Integration tracker */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${EDGE}`,
                    borderRadius: 12,
                    padding: '22px 20px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: 11,
                      color: MUTED,
                      textTransform: 'uppercase',
                      letterSpacing: '0.22em',
                    }}
                  >
                    Integration tracker
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    <TrackerRow label="Self chapter" progress={alignments.length > 0 ? 1 : 0.6} />
                    <TrackerRow label="Observer chapters" progress={Math.min(1, contributors.length / 3)} />
                    <TrackerRow label="Synthesis complete" progress={totalInsights > 0 ? 1 : 0} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 18,
              fontFamily: BODY,
              fontSize: 12,
              color: MUTED,
              marginTop: 24,
            }}
          >
            <Link href={`/people/${personId}/manual`} style={{ color: 'inherit', textDecoration: 'none' }}>
              [Open the manual]
            </Link>
            <Link href="/family-manual" style={{ color: 'inherit', textDecoration: 'none' }}>
              [Return to family]
            </Link>
          </div>
        </RelishPage>
      </div>
    </div>
  );
}

// ================================================================
// Small components
// ================================================================
function SectionKicker({ children }: { children: React.ReactNode }) {
  return <RelishKicker>{children}</RelishKicker>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <RelishSectionHeading>{children}</RelishSectionHeading>;
}

// ================================================================
// Perspectives line — compact editorial statement + stacked avatars
// ================================================================
function PerspectivesLine({
  contributors,
}: {
  contributors: Array<{ id: string; name: string; role: string; status: 'done' | 'partial' | 'none' }>;
}) {
  const present = contributors.filter((c) => c.status !== 'none');
  const self = contributors.find((c) => c.role === 'Self');
  const selfStatus = self?.status ?? 'none';
  const observers = contributors.filter((c) => c.role !== 'Self' && c.status !== 'none');

  // Compose an editorial line.
  const statement = (() => {
    if (present.length === 0) return 'This volume is waiting for its first perspective.';
    if (observers.length === 0 && selfStatus !== 'none') return 'Written by the self, awaiting an observer.';
    if (selfStatus === 'none' && observers.length > 0) return `${observers.length === 1 ? 'One observer has' : `${observers.length} observers have`} begun; the self has not.`;
    const names = observers.map((o) => o.name);
    if (names.length === 1) return `Written with ${names[0]}.`;
    if (names.length <= 4) {
      const last = names[names.length - 1];
      const head = names.slice(0, -1).join(', ');
      return `Written with ${head}, and ${last}.`;
    }
    const rest = names.length - 3;
    return `Written with ${names[0]}, ${names[1]}, ${names[2]}, and ${rest} other${rest === 1 ? '' : 's'}.`;
  })();

  return (
    <div style={{ textAlign: 'center' }}>
      <SectionKicker>Perspectives</SectionKicker>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {/* Stacked avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {present.slice(0, 5).map((c, i) => (
            <PerspectiveAvatar key={c.id} name={c.name} status={c.status} offset={i} />
          ))}
        </div>
        <span
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: T.body,
            color: INK,
            lineHeight: 1.5,
          }}
        >
          {statement}
        </span>
      </div>
    </div>
  );
}

function PerspectiveAvatar({
  name,
  status,
  offset,
}: {
  name: string;
  status: 'done' | 'partial' | 'none';
  offset: number;
}) {
  const color = status === 'done' ? SAGE : status === 'partial' ? GOLD : FAINT;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  return (
    <div
      title={`${name} — ${status === 'done' ? 'complete' : status === 'partial' ? 'in progress' : 'not started'}`}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontSize: 14,
        letterSpacing: '0.04em',
        marginLeft: offset === 0 ? 0 : -10,
        border: `2px solid ${CREAM}`,
        boxShadow: `0 0 0 1px ${color}33`,
      }}
    >
      {initials}
    </div>
  );
}

function ContributorChip({
  name,
  role,
  status,
}: {
  name: string;
  role: string;
  status: 'done' | 'partial' | 'none';
}) {
  const color = status === 'done' ? SAGE : status === 'partial' ? GOLD : FAINT;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px 8px 8px',
        background: '#FFFFFF',
        border: `1px solid ${EDGE}`,
        borderRadius: 999,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: 12,
          letterSpacing: '0.04em',
        }}
      >
        {initials}
      </div>
      <div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: INK, lineHeight: 1.1 }}>
          {name}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 10, color: MUTED, letterSpacing: '0.03em' }}>
          {role}
        </div>
      </div>
    </div>
  );
}

function CaptureCard({
  kind,
  title,
  body,
  tag,
  idx,
  href,
}: {
  kind: 'journal' | 'observation' | 'reflection';
  title: string;
  body: string;
  tag?: string;
  idx: number;
  href?: string;
}) {
  const accent = kind === 'journal' ? SAGE : kind === 'observation' ? GOLD : CORAL;
  const glyph = kind === 'journal' ? '\u270E' : kind === 'observation' ? '\u273F' : '\u273D';
  const watermark = String(idx + 1).padStart(2, '0');

  const Outer: React.ElementType = href ? Link : 'div';
  const outerProps = href ? { href } : {};

  return (
    <Outer
      {...outerProps}
      style={{
        position: 'relative',
        background: relishColor.paper,
        border: relishBorder.hairline,
        borderRadius: 16,
        padding: '24px 26px 22px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 260,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
      }}
      className={href ? 'hover:shadow-sm' : undefined}
    >
      {/* Top accent strip */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 4,
          background: accent,
          opacity: 0.85,
        }}
      />
      {/* Corner wash */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}22, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Watermark */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 10,
          right: 18,
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: 'clamp(72px, 7vw, 104px)',
          fontWeight: 300,
          color: accent,
          opacity: 0.1,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        {watermark}
      </span>

      {/* Header: glyph circle + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, position: 'relative' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 0 4px ${accent}1A`,
          }}
        >
          <span
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: 22,
              color: '#FFFFFF',
              lineHeight: 1,
            }}
          >
            {glyph}
          </span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: T.sectionHeading,
              color: INK,
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            {title}
          </div>
          {tag && (
            <div
              style={{
                fontFamily: SERIF,
                fontSize: T.caption,
                color: accent,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          )}
        </div>
      </div>

      <p
        style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: T.body,
          lineHeight: 1.55,
          color: '#5F564B',
          margin: 0,
          flex: 1,
          position: 'relative',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        <span style={{ color: accent, marginRight: 8 }}>{'\u2014'}</span>
        {body}
      </p>
    </Outer>
  );
}

function SynthPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span
        style={{
          fontFamily: SERIF,
          fontSize: 11,
          color: MUTED,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          textAlign: 'center',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function DonutChart({ slices }: { slices: Array<{ value: number; color: string; label: string }> }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const radius = 46;
  const stroke = 18;
  const circ = 2 * Math.PI * radius;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={180} height={180} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={radius} fill="none" stroke={SAND} strokeWidth={stroke} />
        {slices.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circ;
          const offset = circ - (acc * circ);
          acc += frac;
          return (
            <circle
              key={i}
              cx={60}
              cy={60}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              strokeLinecap="butt"
            />
          );
        })}
        <text
          x={60}
          y={66}
          textAnchor="middle"
          fontFamily={SERIF}
          fontStyle="italic"
          fontSize={20}
          fill={INK}
        >
          {Math.round((slices[0].value / total) * 100)}%
        </text>
      </svg>
    </div>
  );
}

function BarChart({ bars }: { bars: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 170, justifyContent: 'center' }}>
      {bars.map((b) => (
        <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 52 }}>
          <div
            style={{
              width: 36,
              height: `${Math.max(12, b.value * 140)}px`,
              background: b.color,
              borderRadius: 5,
              opacity: 0.9,
            }}
          />
          <span style={{ fontFamily: BODY, fontSize: T.caption, color: MUTED, letterSpacing: '0.06em' }}>
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function TrackerRow({ label, progress }: { label: string; progress: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: T.bodySmall, color: INK }}>{label}</span>
        <span style={{ fontFamily: BODY, fontSize: T.caption, color: MUTED }}>{Math.round(progress * 100)}%</span>
      </div>
      <div style={{ height: 7, background: SAND, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', background: SAGE }} />
      </div>
    </div>
  );
}

// ================================================================
// Helpers
// ================================================================
function relLabel(p?: Person): string {
  if (!p) return 'Contributor';
  switch (p.relationshipType) {
    case 'spouse': return 'Partner';
    case 'child': return 'Child';
    case 'elderly_parent': return 'Parent';
    case 'sibling': return 'Sibling';
    case 'friend': return 'Friend';
    case 'professional': return 'Professional';
    case 'self': return 'Self';
    default: return 'Of the family';
  }
}

function firstAnswerText(answers?: Record<string, any>): string | null {
  if (!answers) return null;
  for (const v of Object.values(answers)) {
    if (typeof v === 'string' && v.trim().length > 0) return v;
    if (v && typeof v === 'object') {
      for (const inner of Object.values(v)) {
        if (typeof inner === 'string' && inner.trim().length > 0) return inner;
      }
    }
  }
  return null;
}

function formatTimeAgo(d?: Date): string {
  if (!d) return 'Unwritten';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function describeTheme(aligned: number, diverging: number): string {
  if (aligned === 0 && diverging === 0) return 'Awaiting a second perspective.';
  if (diverging === 0) return 'Strong alignment across perspectives.';
  if (aligned === 0) return 'Rich divergence — room for conversation.';
  if (aligned > diverging) return 'Mostly aligned, with a few notes of divergence.';
  return 'More divergence than alignment — worth sitting with.';
}

type SynthLike = { topic: string; synthesis: string };
function takeawaySentences(
  alignments: SynthLike[],
  gaps: SynthLike[],
): Array<{ text: string; color: string }> {
  const out: Array<{ text: string; color: string }> = [];
  if (alignments[0]) out.push({ text: alignments[0].synthesis, color: SAGE });
  if (gaps[0]) out.push({ text: gaps[0].synthesis, color: CORAL });
  if (gaps[1]) out.push({ text: gaps[1].synthesis, color: CORAL });
  if (out.length === 0) {
    out.push({ text: 'A second perspective will begin the synthesis.', color: FAINT });
  }
  return out.slice(0, 3);
}
