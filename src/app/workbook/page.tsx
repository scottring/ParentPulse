'use client';

import { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useWorkbook } from '@/hooks/useWorkbook';
import { getDimension } from '@/config/relationship-dimensions';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import Link from 'next/link';

type BalanceLevel = 'in_balance' | 'growing' | 'needs_attention' | 'getting_started';

const BALANCE_CONFIG: Record<BalanceLevel, { label: string; color: string }> = {
  in_balance: { label: 'In balance', color: '#7C9082' },
  growing: { label: 'Growing', color: '#C4A265' },
  needs_attention: { label: 'Needs attention', color: '#C08070' },
  getting_started: { label: 'Getting started', color: '#9B9488' },
};

function computeBalance(scores: number[]): BalanceLevel {
  if (scores.length < 2) return 'getting_started';
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev < 0.5) return 'in_balance';
  if (stdDev < 1.0) return 'growing';
  return 'needs_attention';
}

interface RelationshipNode {
  personId: string;
  name: string;
  relationshipType?: string;
  balance: BalanceLevel;
  activeChapter: { dimensionName: string } | null;
}

export default function WorkbookPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { roles, state } = useDashboard();
  const { activeChapters } = useWorkbook();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const relationships: RelationshipNode[] = useMemo(() => {
    return roles.map((role) => {
      const personId = role.otherPerson.personId;
      const name = role.otherPerson.name;
      const scores = role.assessments.map((a) => a.currentScore);
      const balance = computeBalance(scores);

      const chapter = activeChapters.find(
        (c) => c.personId === personId && c.status === 'active'
      );
      const dim = chapter ? getDimension(chapter.dimensionId) : null;

      return {
        personId,
        name,
        relationshipType: role.otherPerson.relationshipType,
        balance,
        activeChapter: chapter
          ? { dimensionName: dim?.name || chapter.dimensionId }
          : null,
      };
    });
  }, [roles, activeChapters]);

  if (authLoading || state === 'loading') {
    return (
      <div className="relish-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: '#7C9082', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return null;

  const userName = user.name?.split(' ')[0] || 'You';

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[60px]">
        <div className="relish-container" style={{ maxWidth: 720 }}>
          {/* Back to bookshelf */}
          <div className="pt-4 pb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-[13px] hover:opacity-70"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}
            >
              &larr; Back to Bookshelf
            </Link>
          </div>

          {/* Header */}
          <div className="pb-6">
            <h1
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
                fontWeight: 500,
                color: '#3A3530',
                lineHeight: 1.15,
              }}
            >
              Growth Workbook
            </h1>
          </div>

          {relationships.length > 0 ? (
            <GrowthTree userName={userName} relationships={relationships} />
          ) : (
            <div className="relish-panel text-center" style={{ padding: '48px 28px' }}>
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#9B9488', lineHeight: 1.6 }}>
                Complete your family manuals first to unlock growth work.
              </p>
              <Link href="/family-manual" className="one-thing-cta inline-block mt-4">
                Go to Family Manual
              </Link>
            </div>
          )}

          <div className="pb-16" />
        </div>
      </div>
    </div>
  );
}

// ==================== Growth Tree ====================

function GrowthTree({ userName, relationships }: { userName: string; relationships: RelationshipNode[] }) {
  // Layout constants
  const width = 600;
  const nodeRadius = 28;
  const trunkWidth = 6;
  const branchWidth = 3;

  // Trunk: centered, from bottom up
  const trunkX = width / 2;
  const trunkTop = 60;
  const trunkBottom = 80 + relationships.length * 110;
  const totalHeight = trunkBottom + 60;

  // Root node (you) at the base of the trunk
  const rootY = trunkBottom;

  // Branch nodes alternate left and right, spaced vertically up the trunk
  const nodes = relationships.map((rel, i) => {
    const side = i % 2 === 0 ? 1 : -1; // right first, then alternate
    const y = trunkBottom - 100 - i * 110;
    const x = trunkX + side * 160;
    return { ...rel, x, y, side };
  });

  // Branch junction points on the trunk
  const junctions = nodes.map((n) => ({ x: trunkX, y: n.y + 10 }));

  return (
    <div className="relative" style={{ width: '100%', maxWidth: width, margin: '0 auto' }}>
      <svg
        viewBox={`0 0 ${width} ${totalHeight}`}
        width="100%"
        height={totalHeight}
        style={{ overflow: 'visible' }}
      >
        {/* Trunk */}
        <line
          x1={trunkX} y1={trunkTop}
          x2={trunkX} y2={trunkBottom}
          stroke="#8B7B5E"
          strokeWidth={trunkWidth}
          strokeLinecap="round"
        />

        {/* Small roots at the base */}
        <path
          d={`M${trunkX} ${trunkBottom} Q${trunkX - 20} ${trunkBottom + 20} ${trunkX - 35} ${trunkBottom + 30}`}
          stroke="#8B7B5E" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.5}
        />
        <path
          d={`M${trunkX} ${trunkBottom} Q${trunkX + 15} ${trunkBottom + 22} ${trunkX + 30} ${trunkBottom + 28}`}
          stroke="#8B7B5E" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.4}
        />

        {/* Branches — organic curves from trunk to nodes */}
        {nodes.map((node, i) => {
          const jx = junctions[i].x;
          const jy = junctions[i].y;
          // Quadratic bezier: junction on trunk → control point → node
          const cpX = jx + node.side * 60;
          const cpY = jy - 30;
          return (
            <path
              key={`branch-${node.personId}`}
              d={`M${jx} ${jy} Q${cpX} ${cpY} ${node.x} ${node.y}`}
              stroke="#8B7B5E"
              strokeWidth={branchWidth}
              fill="none"
              strokeLinecap="round"
              opacity={0.6}
            />
          );
        })}

        {/* Small crown at the top of the trunk */}
        <circle cx={trunkX} cy={trunkTop} r={4} fill="#7C9082" opacity={0.5} />
        <path
          d={`M${trunkX} ${trunkTop} Q${trunkX - 12} ${trunkTop - 15} ${trunkX - 8} ${trunkTop - 25}`}
          stroke="#7C9082" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.35}
        />
        <path
          d={`M${trunkX} ${trunkTop} Q${trunkX + 10} ${trunkTop - 18} ${trunkX + 12} ${trunkTop - 24}`}
          stroke="#7C9082" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.3}
        />

        {/* Relationship nodes */}
        {nodes.map((node) => {
          const config = BALANCE_CONFIG[node.balance];
          return (
            <g key={node.personId}>
              {/* Node background */}
              <circle
                cx={node.x} cy={node.y}
                r={nodeRadius + 3}
                fill="none"
                stroke={config.color}
                strokeWidth={2}
                opacity={0.5}
              />
              <circle
                cx={node.x} cy={node.y}
                r={nodeRadius}
                fill="#F7F5F0"
                stroke="#E5E0D8"
                strokeWidth={1}
              />
              {/* Initials */}
              <text
                x={node.x} y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#5C5347"
                fontFamily="var(--font-parent-body)"
                fontSize="13"
                fontWeight="500"
              >
                {node.name.split(' ')[0].slice(0, 1).toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Root node — You */}
        <circle
          cx={trunkX} cy={rootY}
          r={nodeRadius}
          fill="#F7F5F0"
          stroke="#8B7B5E"
          strokeWidth={2}
        />
        <text
          x={trunkX} y={rootY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#5C5347"
          fontFamily="var(--font-parent-body)"
          fontSize="12"
          fontWeight="500"
        >
          {userName}
        </text>
      </svg>

      {/* Clickable overlays with labels — positioned absolutely over the SVG */}
      {nodes.map((node) => {
        const config = BALANCE_CONFIG[node.balance];
        // Label on the outside of the node (away from trunk)
        const labelSide = node.side;
        const labelX = node.side === 1
          ? node.x + nodeRadius + 12
          : node.x - nodeRadius - 12;

        return (
          <Link
            key={node.personId}
            href={`/workbook/${node.personId}`}
            className="absolute hover:opacity-80 transition-opacity"
            style={{
              left: labelSide === 1 ? `${(labelX / width) * 100}%` : 'auto',
              right: labelSide === -1 ? `${((width - labelX) / width) * 100}%` : 'auto',
              top: `${((node.y - 20) / totalHeight) * 100}%`,
              textAlign: labelSide === 1 ? 'left' : 'right',
            }}
          >
            <span
              className="block"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '17px',
                fontWeight: 500,
                color: '#3A3530',
              }}
            >
              You & {node.name.split(' ')[0]}
            </span>
            <span
              className="flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '11px',
                fontWeight: 500,
                color: config.color,
                justifyContent: labelSide === 1 ? 'flex-start' : 'flex-end',
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: config.color, display: 'inline-block',
                }}
              />
              {config.label}
            </span>
            {node.activeChapter && (
              <span
                className="block mt-0.5"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '11px',
                  color: '#9B9488',
                }}
              >
                {node.activeChapter.dimensionName}
              </span>
            )}
          </Link>
        );
      })}

      {/* Tap target over each SVG node */}
      {nodes.map((node) => (
        <Link
          key={`tap-${node.personId}`}
          href={`/workbook/${node.personId}`}
          className="absolute rounded-full"
          style={{
            left: `${((node.x - nodeRadius - 5) / width) * 100}%`,
            top: `${((node.y - nodeRadius - 5) / totalHeight) * 100}%`,
            width: (nodeRadius + 5) * 2,
            height: (nodeRadius + 5) * 2,
          }}
          aria-label={`Growth with ${node.name}`}
        />
      ))}
    </div>
  );
}
