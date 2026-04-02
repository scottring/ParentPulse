'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { useDashboard } from '@/hooks/useDashboard';
import { useRingScores } from '@/hooks/useRingScores';
import { useManualSummaries } from '@/hooks/useManualSummaries';
import MainLayout from '@/components/layout/MainLayout';
import { RelationshipType, Person } from '@/types/person-manual';
import { computeAge } from '@/utils/age';
import { scoreToColor } from '@/lib/scoring-engine';
import { Timestamp } from 'firebase/firestore';

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

export default function PeoplePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { people, loading: peopleLoading, addPerson, deletePerson } = usePerson();
  const { assessments, contributions, roles } = useDashboard();
  const { health } = useRingScores(assessments);
  const { summaries, loading: summariesLoading } = useManualSummaries();

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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="manual-spinner" />
        <style jsx>{`
          .manual-spinner { width: 48px; height: 48px; border: 4px solid #1e293b; border-top-color: #d97706; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const selfPerson = people.find((p) => p.linkedUserId === user.userId);
  const otherPeople = people.filter((p) => p.personId !== selfPerson?.personId);

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
              className="font-mono text-[10px] tracking-wider mb-1 block transition-colors"
              style={{ color: '#A3A3A3' }}
            >
              &larr; DASHBOARD
            </Link>
            <h1 className="font-mono font-bold text-xl" style={{ color: '#2C2C2C' }}>
              People
            </h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="font-mono text-[10px] font-bold tracking-wider px-3 py-1.5 rounded transition-all hover:scale-105"
            style={{
              color: '#d97706',
              border: '1px solid rgba(217,119,6,0.4)',
              background: 'rgba(217,119,6,0.08)',
            }}
          >
            + ADD PERSON
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
            />
          ))}
        </div>

        {/* Empty state */}
        {!peopleLoading && otherPeople.length === 0 && !selfPerson && (
          <div
            className="rounded-lg p-8 text-center mt-4"
            style={{ background: '#FAF8F5', border: '1px solid #E8E3DC' }}
          >
            <p className="font-mono text-[11px]" style={{ color: '#6B6B6B' }}>
              Add the people in your life to start building relationship portraits.
            </p>
          </div>
        )}

        {/* Add person inline form */}
        {showAdd && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => !adding && setShowAdd(false)}
          >
            <div
              className="rounded-lg p-6 max-w-sm w-full"
              style={{ background: '#FFFFFF', border: '2px solid #E8E3DC' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-mono text-sm font-bold mb-4" style={{ color: '#2C2C2C' }}>
                Add Person
              </h3>

              <div className="space-y-3">
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                  className="w-full font-mono text-sm rounded px-3 py-2"
                  style={{ border: '1px solid #E8E3DC', background: '#FAF8F5' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />

                <div className="flex flex-wrap gap-1.5">
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setAddType(opt.type)}
                      className="font-mono text-[10px] px-2.5 py-1.5 rounded transition-all"
                      style={{
                        color: addType === opt.type ? '#FFFFFF' : '#6B6B6B',
                        background: addType === opt.type ? '#d97706' : 'rgba(44,44,44,0.04)',
                        border: `1px solid ${addType === opt.type ? '#d97706' : '#E8E3DC'}`,
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
                  className="w-full font-mono text-[11px] rounded px-3 py-2"
                  style={{ border: '1px solid #E8E3DC', background: '#FAF8F5', color: '#6B6B6B' }}
                />

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="flex-1 font-mono text-[10px] font-bold py-2 rounded"
                    style={{ color: '#6B6B6B', border: '1px solid #E8E3DC' }}
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={adding || !addName.trim()}
                    className="flex-1 font-mono text-[10px] font-bold py-2 rounded text-white disabled:opacity-40"
                    style={{ background: '#d97706' }}
                  >
                    {adding ? '...' : 'ADD'}
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
              className="rounded-lg p-6 max-w-sm w-full"
              style={{ background: '#FFFFFF', border: '2px solid #dc2626' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-mono text-sm font-bold mb-2" style={{ color: '#dc2626' }}>
                Delete {confirmDelete.name}?
              </h3>
              <p className="font-mono text-[11px] mb-4" style={{ color: '#6B6B6B' }}>
                This will remove all their data permanently.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 font-mono text-[10px] font-bold py-2 rounded"
                  style={{ color: '#6B6B6B', border: '1px solid #E8E3DC' }}
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 font-mono text-[10px] font-bold py-2 rounded text-white"
                  style={{ background: '#dc2626' }}
                >
                  DELETE
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
}: {
  person: Person;
  isSelf?: boolean;
  score?: { avgScore: number; dimensionCount: number };
  summary?: import('@/hooks/useManualSummaries').ManualSummary;
  contributions: any[];
  userId: string;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const emoji = RELATIONSHIP_EMOJI[person.relationshipType || 'other'] || '👤';

  // Contribution status
  const personContribs = contributions.filter((c: any) => c.personId === person.personId);
  const selfContrib = personContribs.find((c: any) => c.perspectiveType === 'self' && c.status === 'complete');
  const observerContribs = personContribs.filter((c: any) => c.perspectiveType === 'observer' && c.status === 'complete');
  const draftCount = personContribs.filter((c: any) => c.status === 'draft').length;

  const hasSynthesis = summary?.hasSynthesis;
  const progress = summary?.overallProgress || 0;

  const href = person.hasManual
    ? `/people/${person.personId}/manual`
    : `/people/${person.personId}/create-manual`;

  // Next action
  const nextAction = summary?.journeySteps.find((s) => s.status === 'in-progress' || s.status === 'not-started');

  return (
    <Link
      href={href}
      className="block rounded-lg transition-all hover:shadow-md group"
      style={{ background: '#FFFFFF', border: '2px solid #E8E3DC' }}
    >
      {/* Header band */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ background: '#FAF8F5', borderBottom: '1px solid #E8E3DC' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[14px] font-bold" style={{ color: '#2C2C2C' }}>
                {person.name}
              </span>
              {isSelf && (
                <span
                  className="font-mono text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: '#d97706', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}
                >
                  YOU
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[9px] capitalize" style={{ color: '#A3A3A3' }}>
                {(person.relationshipType || 'other').replace('_', ' ')}
              </span>
              {age !== null && (
                <span className="font-mono text-[9px]" style={{ color: '#A3A3A3' }}>
                  &middot; age {age}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score */}
        {score ? (
          <div className="text-center">
            <div
              className="font-mono text-2xl font-bold leading-none"
              style={{ color: scoreToColor(score.avgScore) }}
            >
              {score.avgScore.toFixed(1)}
            </div>
            <div className="font-mono text-[7px] tracking-wider mt-0.5" style={{ color: '#A3A3A3' }}>
              {score.dimensionCount} DIMENSIONS
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="font-mono text-2xl font-bold leading-none" style={{ color: '#D4D4D4' }}>
              —
            </div>
            <div className="font-mono text-[7px] tracking-wider mt-0.5" style={{ color: '#A3A3A3' }}>
              NOT SCORED
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Perspectives */}
        <div>
          <div className="font-mono text-[8px] tracking-widest mb-1.5" style={{ color: '#A3A3A3' }}>
            PERSPECTIVES
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
              <span className="font-mono text-[8px] tracking-widest" style={{ color: '#A3A3A3' }}>
                JOURNEY
              </span>
              <span className="font-mono text-[10px] font-bold" style={{ color: '#6B6B6B' }}>
                {progress}%
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: '#F0EBE4' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  background: progress >= 80 ? '#16a34a' : progress >= 40 ? '#d97706' : '#A3A3A3',
                }}
              />
            </div>
          </div>
        )}

        {/* Next action or draft status */}
        {nextAction && (
          <div
            className="rounded px-3 py-2"
            style={{
              background: nextAction.status === 'in-progress' ? 'rgba(217,119,6,0.06)' : '#FAF8F5',
              border: `1px solid ${nextAction.status === 'in-progress' ? 'rgba(217,119,6,0.15)' : '#E8E3DC'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] font-bold" style={{ color: '#2C2C2C' }}>
                  {nextAction.status === 'in-progress' ? 'CONTINUE' : 'NEXT'}:
                </span>
                <span className="font-mono text-[9px] ml-1" style={{ color: '#6B6B6B' }}>
                  {nextAction.label}
                </span>
              </div>
              <span className="font-mono text-[9px]" style={{ color: '#d97706' }}>&rarr;</span>
            </div>
          </div>
        )}

        {draftCount > 0 && !nextAction && (
          <span className="font-mono text-[9px]" style={{ color: '#d97706' }}>
            {draftCount} draft{draftCount !== 1 ? 's' : ''} in progress
          </span>
        )}
      </div>

      {/* Delete footer — only for non-self */}
      {onDelete && (
        <div
          className="px-5 py-2 text-right opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ borderTop: '1px solid #F0EBE4' }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="font-mono text-[9px] px-2 py-1 rounded transition-all hover:bg-red-50"
            style={{ color: '#dc2626' }}
          >
            DELETE
          </button>
        </div>
      )}
    </Link>
  );
}

function StatusChip({ label, done, draft }: { label: string; done: boolean; draft?: boolean }) {
  if (done) {
    return (
      <span
        className="font-mono text-[9px] font-bold px-2 py-1 rounded"
        style={{ color: '#16a34a', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}
      >
        {label} ✓
      </span>
    );
  }
  if (draft) {
    return (
      <span
        className="font-mono text-[9px] font-bold px-2 py-1 rounded"
        style={{ color: '#d97706', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)' }}
      >
        {label}...
      </span>
    );
  }
  return (
    <span
      className="font-mono text-[9px] px-2 py-1 rounded"
      style={{ color: '#A3A3A3', background: 'rgba(44,44,44,0.03)', border: '1px solid #E8E3DC' }}
    >
      {label}
    </span>
  );
}
