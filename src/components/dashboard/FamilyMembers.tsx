'use client';

import Link from 'next/link';
import { Person, Contribution } from '@/types/person-manual';
import { GrowthItem } from '@/types/growth';

interface FamilyMembersProps {
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

const AVATAR_COLORS = [
  '#7C9082', // sage
  '#D4A574', // tan
  '#2D5F5D', // teal
  '#9B7E6B', // warm brown
  '#8B7EB5', // soft purple
  '#6B9B8A', // sea green
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

type ContribState = 'complete' | 'draft' | 'missing' | 'invited';

function getContribState(contributions: Contribution[], contributorId: string, personId: string, perspective: 'self' | 'observer'): ContribState {
  const complete = contributions.find(
    (c) => c.contributorId === contributorId && c.personId === personId && c.perspectiveType === perspective && c.status === 'complete',
  );
  if (complete) return 'complete';
  const draft = contributions.find(
    (c) => c.contributorId === contributorId && c.personId === personId && c.perspectiveType === perspective && c.status === 'draft',
  );
  if (draft) return 'draft';
  return 'missing';
}

const STATE_COLORS: Record<ContribState, string> = {
  complete: '#16a34a',
  draft: '#7C9082',
  invited: '#3B82F6',
  missing: '#D4D4D4',
};

const STATE_LABELS: Record<ContribState, string> = {
  complete: 'Done',
  draft: 'In progress',
  invited: 'Invited',
  missing: 'Not started',
};

export function FamilyMembers({
  selfPerson,
  hasSelfContribution,
  roles,
  contributions,
  userId,
  demoQ = '',
  activeGrowthItems = [],
  onReactToItem,
}: FamilyMembersProps) {
  const members: MemberRow[] = [];

  // Self
  if (selfPerson) {
    const selfState = hasSelfContribution ? 'complete' as ContribState : getContribState(contributions, userId, selfPerson.personId, 'self');
    let action: MemberAction | undefined;
    if (selfState !== 'complete') {
      action = {
        label: selfState === 'draft' ? 'Continue portrait' : 'Complete your portrait',
        href: `/people/${selfPerson.personId}/manual/self-onboard${demoQ}`,
      };
    }
    members.push({
      person: selfPerson,
      label: 'You',
      index: 0,
      states: [{ label: 'Portrait', state: selfState }],
      action,
    });
  }

  // Others
  roles.forEach((role, i) => {
    const other = role.otherPerson;
    const yourState = getContribState(contributions, userId, other.personId, 'observer');

    let theirSelfState: ContribState = 'missing';
    if (other.linkedUserId) {
      const theirSelf = contributions.find(
        (c) => c.contributorId === other.linkedUserId && c.personId === other.personId && c.perspectiveType === 'self' && c.status === 'complete',
      );
      theirSelfState = theirSelf ? 'complete' : other.linkedUserId ? 'invited' : 'missing';
    }

    const onboardPath = other.relationshipType === 'child'
      ? `/people/${other.personId}/manual/kid-session${demoQ}`
      : `/people/${other.personId}/manual/onboard${demoQ}`;

    let action: MemberAction | undefined;
    if (yourState !== 'complete') {
      action = {
        label: yourState === 'draft' ? 'Continue' : other.relationshipType === 'child' ? 'Start portrait session' : 'Share observations',
        href: onboardPath,
      };
    } else {
      const growthItem = activeGrowthItems.find((item) => item.targetPersonIds?.includes(other.personId));
      if (growthItem) {
        action = {
          label: growthItem.title,
          subtitle: `${growthItem.estimatedMinutes} min`,
          growthItem,
        };
      }
    }

    members.push({
      person: other,
      label: role.roleLabel,
      index: i + 1,
      states: [
        { label: 'Yours', state: yourState },
        { label: 'Theirs', state: theirSelfState },
      ],
      action,
    });
  });

  if (members.length === 0) return null;

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden"
      style={{ boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
    >
      <div className="px-6 pt-5 pb-2">
        <p
          className="text-xs font-medium tracking-wide uppercase"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)', letterSpacing: '0.08em' }}
        >
          Your family
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: '#F0EBE4' }}>
        {members.map((m) => (
          <MemberRowComponent
            key={m.person.personId}
            member={m}
            onReactToItem={onReactToItem}
          />
        ))}
      </div>
    </div>
  );
}

// ==================== Internal Types ====================

interface MemberAction {
  label: string;
  subtitle?: string;
  href?: string;
  growthItem?: GrowthItem;
}

interface MemberRow {
  person: Person;
  label: string;
  index: number;
  states: { label: string; state: ContribState }[];
  action?: MemberAction;
}

function MemberRowComponent({ member, onReactToItem }: { member: MemberRow; onReactToItem?: (id: string, reaction: string) => void }) {
  const { person, label, index, states, action } = member;

  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-medium"
          style={{ fontFamily: 'var(--font-parent-body)', background: getAvatarColor(index) }}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className="text-sm font-medium"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
            >
              {person.name}
            </span>
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* Status dots */}
        <div className="flex items-center gap-3">
          {states.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span
                className="text-[10px]"
                style={{ fontFamily: 'var(--font-parent-body)', color: '#A3A3A3' }}
              >
                {s.label}
              </span>
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: STATE_COLORS[s.state] }}
                title={STATE_LABELS[s.state]}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action row */}
      {action && (
        <div className="mt-3 ml-12">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{
                fontFamily: 'var(--font-parent-body)',
                color: '#B8864A',
                background: 'rgba(212, 165, 116, 0.08)',
                border: '1px solid rgba(212, 165, 116, 0.2)',
              }}
            >
              {action.label}
            </Link>
          ) : action.growthItem && onReactToItem ? (
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
              >
                {action.label}
              </span>
              {action.subtitle && (
                <span className="text-[10px]" style={{ color: '#A3A3A3' }}>
                  {action.subtitle}
                </span>
              )}
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => onReactToItem(action.growthItem!.growthItemId, 'tried_it')}
                  className="px-2 py-1 rounded-md text-xs transition-all hover:scale-105"
                  style={{ background: 'rgba(44,44,44,0.04)', border: '1px solid var(--parent-border)' }}
                  title="Tried it"
                >
                  {'\u2705'}
                </button>
                <button
                  onClick={() => onReactToItem(action.growthItem!.growthItemId, 'not_now')}
                  className="px-2 py-1 rounded-md text-xs transition-all hover:scale-105"
                  style={{ background: 'rgba(44,44,44,0.04)', border: '1px solid var(--parent-border)' }}
                  title="Not now"
                >
                  {'\u23f0'}
                </button>
              </div>
            </div>
          ) : (
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
            >
              {action.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
