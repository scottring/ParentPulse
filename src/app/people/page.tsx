'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import { useManualSummaries } from '@/hooks/useManualSummaries';
import { useWorkbook } from '@/hooks/useWorkbook';
import MainLayout from '@/components/layout/MainLayout';
import { RelationshipType, Person } from '@/types/person-manual';
import { computeAge } from '@/utils/age';
import { getDimension } from '@/config/relationship-dimensions';
import { Timestamp } from 'firebase/firestore';
import type { WorkbookChapter } from '@/types/workbook';

const RELATIONSHIP_EMOJI: Record<string, string> = {
  self: '🪞',
  spouse: '💑',
  child: '👶',
  elderly_parent: '👴',
  friend: '🤝',
  sibling: '👫',
  professional: '💼',
  other: '👤',
};

const RELATIONSHIP_OPTIONS: Array<{ type: RelationshipType; label: string }> = [
  { type: 'spouse', label: 'Spouse/Partner' },
  { type: 'child', label: 'Child' },
  { type: 'elderly_parent', label: 'Elderly Parent' },
  { type: 'sibling', label: 'Sibling' },
  { type: 'friend', label: 'Friend' },
];

function scoreToBand(score: number): { label: string; color: string } {
  if (score <= 0) return { label: 'No data', color: '#8A8078' };
  if (score < 2.0) return { label: 'Needs attention', color: '#B85450' };
  if (score < 3.0) return { label: 'Growing', color: '#C4864C' };
  if (score < 3.5) return { label: 'Steady', color: '#7C9082' };
  if (score < 4.0) return { label: 'Strong', color: '#6B8F71' };
  return { label: 'Thriving', color: '#4E7A54' };
}

export default function PeoplePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { people, loading: peopleLoading, addPerson, deletePerson } = usePerson();
  const { assessments, contributions, roles } = useDashboard();
  const { health } = useRingScores(assessments);
  const { summaries, loading: summariesLoading } = useManualSummaries();
  const { activeChapters } = useWorkbook();

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<RelationshipType>('spouse');
  const [addDob, setAddDob] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Person | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Build per-person score map from assessments
  const personScores = useMemo(() => {
    const map = new Map<string, { avgScore: number; dimensionCount: number }>();
    for (const person of people) {
      const relevant = assessments.filter((a) =>
        a.participantIds?.includes(person.personId),
      );
      if (relevant.length > 0) {
        const avg = relevant.reduce((s, a) => s + a.currentScore, 0) / relevant.length;
        map.set(person.personId, {
          avgScore: Math.round(avg * 10) / 10,
          dimensionCount: relevant.length,
        });
      }
    }
    return map;
  }, [people, assessments]);

  const selfPerson = useMemo(
    () => people.find((p) => p.linkedUserId === user?.userId),
    [people, user?.userId],
  );

  // Deduplicate equivalent persons (e.g. Iris's self Person + Iris's spouse Person).
  // Prefer the relationship-typed record (spouse/child/etc.) over another user's 'self' record
  // since it carries the name the current user chose.
  const otherPeople = useMemo(() => {
    const candidates = people.filter((p) => p.personId !== selfPerson?.personId);
    const seen = new Set<string>();
    const result: Person[] = [];

    // Sort so relationship-typed records come before 'self' records from other users
    const sorted = [...candidates].sort((a, b) => {
      const aIsSelf = a.relationshipType === 'self' ? 1 : 0;
      const bIsSelf = b.relationshipType === 'self' ? 1 : 0;
      return aIsSelf - bIsSelf;
    });

    for (const p of sorted) {
      // Check if an equivalent person was already added
      const isEquiv = sorted.some(
        (other) =>
          other.personId !== p.personId &&
          seen.has(other.personId) &&
          (
            // Same linkedUserId
            (p.linkedUserId && other.linkedUserId === p.linkedUserId) ||
            // Name match between self and spouse
            ((p.relationshipType === 'self' && other.relationshipType === 'spouse') ||
             (p.relationshipType === 'spouse' && other.relationshipType === 'self')) &&
            p.name.toLowerCase().trim().split(' ')[0] === other.name.toLowerCase().trim().split(' ')[0]
          ),
      );
      if (isEquiv) continue;
      seen.add(p.personId);
      result.push(p);
    }
    return result;
  }, [people, selfPerson]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="manual-spinner" />
        <style jsx>{`
          .manual-spinner { width: 48px; height: 48px; border: 4px solid #3A3530; border-top-color: #7C9082; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const data: any = {
        name: addName.trim(),
        relationshipType: addType,
        canSelfContribute: ['spouse', 'sibling', 'friend'].includes(addType),
      };
      if (addDob) {
        data.dateOfBirth = Timestamp.fromDate(new Date(addDob));
        data.age = computeAge(new Date(addDob));
      }
      const personId = await addPerson(data);
      setAddName('');
      setAddDob('');
      setShowAdd(false);
      router.push(`/people/${personId}/create-manual`);
    } catch (err) {
      console.error('Failed to add person:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (person: Person) => {
    try {
      await deletePerson(person.personId);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/dashboard"
              className="text-[12px] font-medium mb-1 block transition-colors hover:opacity-70"
              style={{ color: '#8A8078', fontFamily: 'var(--font-parent-body)' }}
            >
              &larr; Dashboard
            </Link>
            <h1
              className="text-[32px] font-normal leading-tight"
              style={{ color: '#3A3530', fontFamily: 'var(--font-parent-display)' }}
            >
              People
            </h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-[12px] font-medium px-4 py-2 rounded-full transition-all hover:scale-105"
            style={{
              fontFamily: 'var(--font-parent-body)',
              color: '#FFFFFF',
              background: '#7C9082',
            }}
          >
            + Add person
          </button>
        </div>

        {/* People cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selfPerson && (
            <PersonCard
              person={selfPerson}
              isSelf
              score={personScores.get(selfPerson.personId)}
              summary={summaries.get(selfPerson.personId)}
              contributions={contributions}
              userId={user.userId}
              workbookChapters={activeChapters.filter(c => c.personId === selfPerson.personId && c.status === 'active')}
            />
          )}
          {otherPeople.map((person) => (
            <PersonCard
              key={person.personId}
              person={person}
              score={personScores.get(person.personId)}
              summary={summaries.get(person.personId)}
              contributions={contributions}
              userId={user.userId}
              onDelete={() => setConfirmDelete(person)}
              workbookChapters={activeChapters.filter(c => c.personId === person.personId && c.status === 'active')}
            />
          ))}
        </div>

        {/* Empty state */}
        {!peopleLoading && otherPeople.length === 0 && !selfPerson && (
          <div className="glass-card rounded-2xl p-8 text-center mt-4">
            <h3
              className="text-[22px] font-normal mb-2"
              style={{ color: '#3A3530', fontFamily: 'var(--font-parent-display)' }}
            >
              No one here yet
            </h3>
            <p
              className="text-[13px]"
              style={{ color: '#7C7468', fontFamily: 'var(--font-parent-body)' }}
            >
              Add the people in your life to start building relationship portraits.
            </p>
          </div>
        )}

        {/* Add person modal */}
        {showAdd && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => !adding && setShowAdd(false)}
          >
            <div
              className="glass-card-strong rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-[22px] font-normal mb-4"
                style={{ color: '#3A3530', fontFamily: 'var(--font-parent-display)' }}
              >
                Add person
              </h3>

              <div className="space-y-3">
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                  className="w-full text-[13px] rounded-2xl px-3 py-2"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    border: '1px solid rgba(138,128,120,0.2)',
                    background: 'rgba(255,255,255,0.4)',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />

                <div className="flex flex-wrap gap-1.5">
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setAddType(opt.type)}
                      className="text-[11px] font-medium px-2.5 py-1.5 rounded-full transition-all"
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        color: addType === opt.type ? '#FFFFFF' : '#7C7468',
                        background: addType === opt.type ? '#7C9082' : 'rgba(138,128,120,0.08)',
                        border: `1px solid ${addType === opt.type ? '#7C9082' : 'rgba(138,128,120,0.2)'}`,
                      }}
                    >
                      {RELATIONSHIP_EMOJI[opt.type]} {opt.label}
                    </button>
                  ))}
                </div>

                <input
                  type="date"
                  value={addDob}
                  onChange={(e) => setAddDob(e.target.value)}
                  className="w-full text-[11px] rounded-2xl px-3 py-2"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    border: '1px solid rgba(138,128,120,0.2)',
                    background: 'rgba(255,255,255,0.4)',
                    color: '#7C7468',
                  }}
                />

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="flex-1 text-[12px] font-medium py-2 rounded-full transition-all"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      color: '#7C7468',
                      border: '1px solid rgba(138,128,120,0.2)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={adding || !addName.trim()}
                    className="flex-1 text-[12px] font-medium py-2 rounded-full text-white disabled:opacity-40 transition-all"
                    style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082' }}
                  >
                    {adding ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <div
              className="glass-card-strong rounded-2xl p-6 max-w-sm w-full"
              style={{ border: '1px solid rgba(220,38,38,0.3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-[22px] font-normal mb-2"
                style={{ color: '#dc2626', fontFamily: 'var(--font-parent-display)' }}
              >
                Delete {confirmDelete.name}?
              </h3>
              <p
                className="text-[13px] mb-4"
                style={{ color: '#7C7468', fontFamily: 'var(--font-parent-body)' }}
              >
                This will remove all their data permanently.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 text-[12px] font-medium py-2 rounded-full transition-all"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    color: '#7C7468',
                    border: '1px solid rgba(138,128,120,0.2)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 text-[12px] font-medium py-2 rounded-full text-white transition-all"
                  style={{ fontFamily: 'var(--font-parent-body)', background: '#dc2626' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// --- Person Card Component ---

function PersonCard({
  person,
  isSelf,
  score,
  summary,
  contributions,
  userId,
  onDelete,
  workbookChapters,
}: {
  person: Person;
  isSelf?: boolean;
  score?: { avgScore: number; dimensionCount: number };
  summary?: import('@/hooks/useManualSummaries').ManualSummary;
  contributions: any[];
  userId: string;
  onDelete?: () => void;
  workbookChapters?: WorkbookChapter[];
}) {
  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const emoji = RELATIONSHIP_EMOJI[person.relationshipType || 'other'] || '👤';

  // Contribution status
  const personContribs = contributions.filter((c: any) => c.personId === person.personId);
  const selfContrib = personContribs.find((c: any) => c.perspectiveType === 'self' && c.status === 'complete');
  const observerContribs = personContribs.filter((c: any) => c.perspectiveType === 'observer' && c.status === 'complete');
  const draftCount = personContribs.filter((c: any) => c.status === 'draft').length;

  const hasSynthesis = summary?.hasSynthesis;
  const progress = summary?.overallProgress || 0;

  // Determine the primary action for this person
  const hasObserverContrib = observerContribs.length > 0;
  const myObserverContrib = personContribs.find((c: any) => c.perspectiveType === 'observer' && c.contributorId === userId && c.status === 'complete');
  const myObserverDraft = personContribs.find((c: any) => c.perspectiveType === 'observer' && c.contributorId === userId && c.status === 'draft');
  const selfDraft = personContribs.find((c: any) => c.perspectiveType === 'self' && c.status === 'draft');

  const assessHref = !person.hasManual
    ? `/people/${person.personId}/create-manual`
    : isSelf
      ? `/people/${person.personId}/manual/self-onboard`
      : `/people/${person.personId}/manual/onboard`;

  const manualHref = person.hasManual ? `/people/${person.personId}/manual` : null;

  // What label for the primary action button?
  let actionLabel: string;
  let actionSublabel: string | null = null;
  if (!person.hasManual) {
    actionLabel = 'Set up manual';
  } else if (isSelf) {
    if (selfDraft) {
      actionLabel = 'Continue assessment';
    } else if (selfContrib) {
      actionLabel = 'Revise your answers';
    } else {
      actionLabel = 'Assess yourself';
    }
  } else {
    if (myObserverDraft) {
      actionLabel = 'Continue assessment';
    } else if (myObserverContrib) {
      actionLabel = 'Revise your observations';
    } else {
      actionLabel = `Assess ${person.name}`;
    }
  }

  // Next action
  const nextAction = summary?.journeySteps.find((s) => s.status === 'in-progress' || s.status === 'not-started');

  // Qualitative band from score
  const band = score ? scoreToBand(score.avgScore) : null;

  return (
    <div
      className="block glass-card rounded-2xl transition-all hover:shadow-md group"
    >
      {/* Header band */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(138,128,120,0.1)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[22px] font-normal"
                style={{ color: '#3A3530', fontFamily: 'var(--font-parent-display)' }}
              >
                {person.name}
              </span>
              {isSelf && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    color: '#7C9082',
                    background: 'rgba(124,144,130,0.1)',
                  }}
                >
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[11px] capitalize"
                style={{ color: '#8A8078', fontFamily: 'var(--font-parent-body)' }}
              >
                {(person.relationshipType || 'other').replace('_', ' ')}
              </span>
              {age !== null && (
                <span
                  className="text-[11px]"
                  style={{ color: '#8A8078', fontFamily: 'var(--font-parent-body)' }}
                >
                  &middot; age {age}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Qualitative band instead of numeric score */}
        {band ? (
          <div className="text-right">
            <div
              className="text-[13px] font-medium"
              style={{ color: band.color, fontFamily: 'var(--font-parent-body)' }}
            >
              {band.label}
            </div>
            <div
              className="text-[10px] font-semibold tracking-[0.12em] mt-0.5"
              style={{ color: '#8A8078', fontFamily: 'var(--font-parent-body)' }}
            >
              {score!.dimensionCount} dimensions
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div
              className="text-[13px] font-medium"
              style={{ color: '#8A8078', fontFamily: 'var(--font-parent-body)' }}
            >
              Not scored
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Perspectives */}
        <div>
          <div
            className="text-[10px] font-semibold tracking-[0.12em] mb-1.5"
            style={{ color: '#8A8078', fontFamily: 'var(--font-parent-body)' }}
          >
            Perspectives
          </div>
          <div className="flex items-center gap-3">
            <StatusChip
              label="Self"
              done={!!selfContrib}
              draft={!selfContrib && personContribs.some((c: any) => c.perspectiveType === 'self' && c.status === 'draft')}
            />
            <StatusChip
              label={observerContribs.length > 1 ? `${observerContribs.length} Observers` : 'Observer'}
              done={observerContribs.length > 0}
              draft={!observerContribs.length && personContribs.some((c: any) => c.perspectiveType === 'observer' && c.status === 'draft')}
            />
            {hasSynthesis && (
              <StatusChip label="Synthesized" done />
            )}
          </div>
        </div>

        {/* Progress */}
        {summary && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[10px] font-semibold tracking-[0.12em]"
                style={{ color: '#8A8078', fontFamily: 'var(--font-parent-body)' }}
              >
                Journey
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: '#5C5347', fontFamily: 'var(--font-parent-body)' }}
              >
                {progress}%
              </span>
            </div>
            <div
              className="w-full h-[2px] rounded-full overflow-hidden"
              style={{ background: 'rgba(138,128,120,0.15)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: '#7C9082',
                }}
              />
            </div>
          </div>
        )}

        {/* Workbook chapters */}
        {workbookChapters && workbookChapters.length > 0 && (
          <div
            className="rounded-2xl px-3 py-2"
            style={{
              background: 'rgba(124,144,130,0.06)',
              border: '1px solid rgba(124,144,130,0.15)',
            }}
          >
            <span
              className="text-[10px] font-semibold tracking-[0.12em]"
              style={{ color: '#7C9082', fontFamily: 'var(--font-parent-body)' }}
            >
              Working on
            </span>
            <span
              className="text-[11px] ml-1.5"
              style={{ color: '#5C5347', fontFamily: 'var(--font-parent-body)' }}
            >
              {workbookChapters
                .map(ch => getDimension(ch.dimensionId)?.name || ch.dimensionId)
                .join(', ')}
            </span>
            <Link
              href="/workbook"
              className="text-[11px] ml-1.5 hover:opacity-70"
              style={{ color: '#7C9082', fontFamily: 'var(--font-parent-body)' }}
            >
              &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(138,128,120,0.1)' }}
      >
        <Link
          href={assessHref}
          className="flex-1 text-[12px] font-medium py-2 rounded-full text-center text-white transition-all hover:opacity-90"
          style={{ fontFamily: 'var(--font-parent-body)', background: '#7C9082' }}
        >
          {actionLabel} &rarr;
        </Link>
        {manualHref && (
          <Link
            href={manualHref}
            className="text-[12px] font-medium px-4 py-2 rounded-full text-center transition-all hover:opacity-80"
            style={{
              fontFamily: 'var(--font-parent-body)',
              color: '#5C5347',
              border: '1px solid rgba(138,128,120,0.2)',
            }}
          >
            View manual
          </Link>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-[11px] px-2 py-1 rounded-full transition-all hover:bg-red-50 opacity-0 group-hover:opacity-100"
            style={{ color: '#dc2626', fontFamily: 'var(--font-parent-body)' }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function StatusChip({ label, done, draft }: { label: string; done: boolean; draft?: boolean }) {
  if (done) {
    return (
      <span
        className="text-[11px] font-medium px-2.5 py-1 rounded-full"
        style={{
          fontFamily: 'var(--font-parent-body)',
          color: '#7C9082',
          background: 'rgba(124,144,130,0.1)',
        }}
      >
        {label} ✓
      </span>
    );
  }
  if (draft) {
    return (
      <span
        className="text-[11px] font-medium px-2.5 py-1 rounded-full"
        style={{
          fontFamily: 'var(--font-parent-body)',
          color: '#8A8078',
          background: 'rgba(138,128,120,0.08)',
        }}
      >
        {label}...
      </span>
    );
  }
  return (
    <span
      className="text-[11px] px-2.5 py-1 rounded-full"
      style={{
        fontFamily: 'var(--font-parent-body)',
        color: '#8A8078',
        background: 'rgba(138,128,120,0.05)',
        border: '1px solid rgba(138,128,120,0.15)',
      }}
    >
      {label}
    </span>
  );
}
