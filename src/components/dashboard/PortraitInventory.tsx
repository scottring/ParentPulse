'use client';

import Link from 'next/link';
import { Person, Contribution } from '@/types/person-manual';
import { GrowthItem } from '@/types/growth';
import InstrumentBezel from './InstrumentBezel';

interface PortraitRow {
  person: Person;
  relationshipLabel: string;
  selfPortrait: ContributionStatus;
  yourPortrait: ContributionStatus;
  theirPortraitOfYou?: ContributionStatus;
  nextAction?: NextAction;
}

interface ContributionStatus {
  state: 'complete' | 'draft' | 'missing' | 'invited';
  updatedAt?: Date;
  actionLabel?: string;
  actionHref?: string;
}

interface NextAction {
  type: 'onboarding' | 'growth';
  label: string;
  description?: string;
  href?: string;
  growthItem?: GrowthItem;
}

interface PortraitInventoryProps {
  selfPerson: Person | null;
  hasSelfContribution: boolean;
  roles: {
    roleLabel: string;
    otherPerson: Person;
    hasObserverContribution: boolean;
  }[];
  contributions: Contribution[];
  userId: string;
  demoQ?: string;
  activeGrowthItems?: GrowthItem[];
  onReactToItem?: (itemId: string, reaction: string) => void;
}

function getFreshness(updatedAt?: Date): { color: string; label: string | null } {
  if (!updatedAt) return { color: '#D4D4D4', label: null };
  const days = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 30) return { color: '#16a34a', label: null };
  if (days < 90) return { color: '#7C9082', label: 'Needs update' };
  return { color: '#dc2626', label: 'Getting stale' };
}

function StatusDot({ status }: { status: ContributionStatus }) {
  const freshness = status.state === 'complete' ? getFreshness(status.updatedAt) : null;

  const dotColor =
    status.state === 'complete' ? (freshness?.color || '#16a34a') :
    status.state === 'draft' ? '#7C9082' :
    status.state === 'invited' ? '#3B82F6' :
    '#D4D4D4';

  const label =
    status.state === 'complete' ? (freshness?.label || 'Done') :
    status.state === 'draft' ? 'In progress' :
    status.state === 'invited' ? 'Invited' :
    'Missing';

  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: dotColor }}
      title={label}
    />
  );
}

export default function PortraitInventory({
  selfPerson,
  hasSelfContribution,
  roles,
  contributions,
  userId,
  demoQ = '',
  activeGrowthItems = [],
  onReactToItem,
}: PortraitInventoryProps) {
  const rows: PortraitRow[] = [];

  // Helper: find the next growth item targeting a person
  function getNextGrowthItem(personId: string): GrowthItem | undefined {
    return activeGrowthItems.find(
      (item) => item.targetPersonIds?.includes(personId),
    );
  }

  // Self row
  if (selfPerson) {
    const selfContribution = contributions.find(
      (c) => c.contributorId === userId &&
        c.personId === selfPerson.personId &&
        c.perspectiveType === 'self' &&
        c.status === 'complete',
    );
    const selfDraft = !selfContribution && contributions.find(
      (c) => c.contributorId === userId &&
        c.personId === selfPerson.personId &&
        c.perspectiveType === 'self' &&
        c.status === 'draft',
    );

    // Self next action
    let nextAction: NextAction | undefined;
    if (!selfContribution && !selfDraft) {
      nextAction = {
        type: 'onboarding',
        label: 'Complete your portrait',
        href: `/people/${selfPerson.personId}/manual/self-onboard${demoQ}`,
      };
    } else if (selfDraft) {
      nextAction = {
        type: 'onboarding',
        label: 'Continue portrait',
        href: `/people/${selfPerson.personId}/manual/self-onboard${demoQ}`,
      };
    } else {
      // Look for personal growth items (no targetPersonIds or targeting self)
      const personalItem = activeGrowthItems.find(
        (item) => !item.targetPersonIds?.length || item.targetPersonIds.includes(selfPerson.personId),
      );
      if (personalItem) {
        nextAction = {
          type: 'growth',
          label: personalItem.title,
          description: `${personalItem.estimatedMinutes}m · ${personalItem.speed === 'ambient' ? 'Today' : 'This week'}`,
          growthItem: personalItem,
        };
      }
    }

    rows.push({
      person: selfPerson,
      relationshipLabel: 'You',
      selfPortrait: selfContribution
        ? { state: 'complete', updatedAt: selfContribution.updatedAt?.toDate?.() || undefined }
        : selfDraft
          ? { state: 'draft' }
          : { state: 'missing' },
      yourPortrait: { state: 'complete', updatedAt: undefined }, // N/A
      nextAction,
    });
  }

  // Role rows
  for (const role of roles) {
    const other = role.otherPerson;

    // Your portrait of them
    const yourContrib = contributions.find(
      (c) => c.contributorId === userId &&
        c.personId === other.personId &&
        c.perspectiveType === 'observer' &&
        c.status === 'complete',
    );
    const yourDraft = !yourContrib && contributions.find(
      (c) => c.contributorId === userId &&
        c.personId === other.personId &&
        c.perspectiveType === 'observer' &&
        c.status === 'draft',
    );

    const onboardPath = other.relationshipType === 'child'
      ? `/people/${other.personId}/manual/kid-session${demoQ}`
      : `/people/${other.personId}/manual/onboard${demoQ}`;

    const yourPortrait: ContributionStatus = yourContrib
      ? { state: 'complete', updatedAt: yourContrib.updatedAt?.toDate?.() || undefined }
      : yourDraft
        ? { state: 'draft' }
        : { state: 'missing' };

    // Their self-portrait
    let selfPortrait: ContributionStatus;
    if (other.linkedUserId) {
      const theirSelf = contributions.find(
        (c) => c.contributorId === other.linkedUserId &&
          c.personId === other.personId &&
          c.perspectiveType === 'self' &&
          c.status === 'complete',
      );
      const theirDraft = !theirSelf && contributions.find(
        (c) => c.contributorId === other.linkedUserId &&
          c.personId === other.personId &&
          c.perspectiveType === 'self' &&
          c.status === 'draft',
      );
      selfPortrait = theirSelf
        ? { state: 'complete', updatedAt: theirSelf.updatedAt?.toDate?.() || undefined }
        : theirDraft
          ? { state: 'draft' }
          : { state: 'invited' };
    } else {
      selfPortrait = { state: 'missing' };
    }

    // Their portrait of you
    let theirPortraitOfYou: ContributionStatus | undefined;
    if (other.linkedUserId && selfPerson) {
      const theirObserver = contributions.find(
        (c) => c.contributorId === other.linkedUserId &&
          c.personId === selfPerson.personId &&
          c.perspectiveType === 'observer' &&
          c.status === 'complete',
      );
      theirPortraitOfYou = theirObserver
        ? { state: 'complete', updatedAt: theirObserver.updatedAt?.toDate?.() || undefined }
        : { state: 'invited' };
    }

    // Next action for this person
    let nextAction: NextAction | undefined;
    if (!yourContrib && !yourDraft) {
      nextAction = {
        type: 'onboarding',
        label: other.relationshipType === 'child' ? 'Start portrait session' : 'Share your observations',
        href: onboardPath,
      };
    } else if (yourDraft) {
      nextAction = {
        type: 'onboarding',
        label: 'Continue portrait',
        href: onboardPath,
      };
    } else {
      const growthItem = getNextGrowthItem(other.personId);
      if (growthItem) {
        nextAction = {
          type: 'growth',
          label: growthItem.title,
          description: `${growthItem.estimatedMinutes}m · ${growthItem.speed === 'ambient' ? 'Today' : 'This week'}`,
          growthItem: growthItem,
        };
      }
    }

    rows.push({
      person: other,
      relationshipLabel: role.roleLabel,
      selfPortrait,
      yourPortrait,
      theirPortraitOfYou,
      nextAction,
    });
  }

  if (rows.length === 0) return null;

  return (
    <InstrumentBezel title="YOUR FAMILY">
      <div className="divide-y" style={{ borderColor: '#E8E3DC' }}>
        {rows.map((row) => {
          const isSelf = row.relationshipLabel === 'You';

          return (
            <div
              key={row.person.personId}
              className="px-4 py-3"
            >
              {/* Top line: person name + portrait status dots */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold" style={{ fontFamily: 'var(--font-parent-body)', color: '#2C2C2C' }}>
                    {row.person.name}
                  </span>
                  <span className="text-[9px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}>
                    {row.relationshipLabel}
                  </span>
                </div>

                {/* Portrait status dots */}
                <div className="flex items-center gap-2">
                  {isSelf ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[8px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}>portrait</span>
                      <StatusDot status={row.selfPortrait} />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1" title="Their self-portrait">
                        <span className="text-[8px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}>self</span>
                        <StatusDot status={row.selfPortrait} />
                      </div>
                      <div className="flex items-center gap-1" title="Your portrait of them">
                        <span className="text-[8px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}>yours</span>
                        <StatusDot status={row.yourPortrait} />
                      </div>
                      {row.theirPortraitOfYou && (
                        <div className="flex items-center gap-1" title="Their portrait of you">
                          <span className="text-[8px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}>theirs</span>
                          <StatusDot status={row.theirPortraitOfYou} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Next action row */}
              {row.nextAction && (
                <div
                  className="mt-2 flex items-center justify-between rounded-lg px-3 py-2"
                  style={{
                    background: row.nextAction.type === 'onboarding'
                      ? 'rgba(124,144,130,0.06)'
                      : '#FAF8F5',
                    border: `1px solid ${
                      row.nextAction.type === 'onboarding'
                        ? 'rgba(124,144,130,0.15)'
                        : '#E8E3DC'
                    }`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[10px] font-bold block truncate"
                      style={{ fontFamily: 'var(--font-parent-body)', color: '#2C2C2C' }}
                    >
                      {row.nextAction.label}
                    </span>
                    {row.nextAction.description && (
                      <span
                        className="text-[8px] block mt-0.5"
                        style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}
                      >
                        {row.nextAction.description}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {/* Growth item quick reactions */}
                    {row.nextAction.type === 'growth' && row.nextAction.growthItem && onReactToItem && (
                      <>
                        <button
                          onClick={() => onReactToItem(row.nextAction!.growthItem!.growthItemId, 'tried_it')}
                          className="px-1.5 py-0.5 rounded text-xs transition-all hover:scale-110"
                          style={{ background: 'rgba(44,44,44,0.04)', border: '1px solid #E8E3DC' }}
                          title="Tried it"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => onReactToItem(row.nextAction!.growthItem!.growthItemId, 'not_now')}
                          className="px-1.5 py-0.5 rounded text-xs transition-all hover:scale-110"
                          style={{ background: 'rgba(44,44,44,0.04)', border: '1px solid #E8E3DC' }}
                          title="Not now"
                        >
                          ⏰
                        </button>
                      </>
                    )}

                    {/* Onboarding action button */}
                    {row.nextAction.type === 'onboarding' && row.nextAction.href && (
                      <Link
                        href={row.nextAction.href}
                        className="text-[8px] font-bold px-2 py-1 rounded transition-all hover:scale-105"
                        style={{
                          color: '#7C9082',
                          border: '1px solid rgba(124,144,130,0.3)',
                          background: 'rgba(124,144,130,0.1)',
                        }}
                      >
                        START
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* All caught up */}
              {!row.nextAction && !isSelf && (
                <div className="mt-2 px-3 py-1.5">
                  <span className="text-[9px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}>
                    All caught up
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </InstrumentBezel>
  );
}
