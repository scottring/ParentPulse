'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import { RelationshipType, Person } from '@/types/person-manual';
import { computeAge } from '@/utils/age';
import { Timestamp } from 'firebase/firestore';

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
  return result;
}

// ================================================================
// Relationship options — editorial phrasing
// ================================================================
const RELATIONSHIP_OPTIONS: Array<{ type: RelationshipType; label: string; sub: string }> = [
  { type: 'spouse', label: 'A partner', sub: 'spouse, husband, wife, companion' },
  { type: 'child', label: 'A child', sub: 'son, daughter, stepchild' },
  { type: 'elderly_parent', label: 'A parent', sub: 'mother, father, grandparent' },
  { type: 'sibling', label: 'A sibling', sub: 'brother, sister, half-sibling' },
  { type: 'friend', label: 'A friend', sub: 'close friend, chosen family' },
];

function relationshipLabel(person: Person): string {
  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const ageStr = age !== null ? ` · age ${toRoman(age).toLowerCase()}` : '';
  switch (person.relationshipType) {
    case 'self': return 'Self';
    case 'spouse': return `Partner${ageStr}`;
    case 'child': return `Child${ageStr}`;
    case 'elderly_parent': return `Parent${ageStr}`;
    case 'sibling': return `Sibling${ageStr}`;
    case 'friend': return 'Friend';
    case 'professional': return 'Professional';
    default: return 'Of the family';
  }
}

// ================================================================
// Main page
// ================================================================
export default function PeoplePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { people, loading: peopleLoading, addPerson, deletePerson } = usePerson();

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<RelationshipType>('spouse');
  const [addDob, setAddDob] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Active people sorted: self first, then by addedAt
  const sortedPeople = useMemo(() => {
    const active = people.filter((p) => !p.archived);
    return [...active].sort((a, b) => {
      if (a.relationshipType === 'self') return -1;
      if (b.relationshipType === 'self') return 1;
      return (b.addedAt?.toMillis?.() || 0) - (a.addedAt?.toMillis?.() || 0);
    });
  }, [people]);

  const handleAdd = async () => {
    if (!addName.trim() || adding) return;
    setAdding(true);
    try {
      const personData: Omit<Person, 'personId' | 'familyId' | 'addedAt' | 'addedByUserId' | 'hasManual'> = {
        name: addName.trim(),
        relationshipType: addType,
        canSelfContribute: addType === 'spouse' || addType === 'child' || addType === 'elderly_parent',
      };
      if (addDob) {
        personData.dateOfBirth = Timestamp.fromDate(new Date(addDob));
      }
      const personId = await addPerson(personData);
      setShowAdd(false);
      setAddName('');
      setAddDob('');
      setAddType('spouse');
      router.push(`/people/${personId}/create-manual`);
    } catch (err) {
      console.error('Failed to add person:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      await deletePerson(confirmDelete.personId);
      setConfirmDelete(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || peopleLoading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the index&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="press-binder" style={{ maxWidth: 720 }}>

          {/* Running header */}
          <div className="press-running-header" style={{ paddingTop: 28 }}>
            <span>The Family Manual</span>
            <span className="sep">·</span>
            <span>Index of People</span>
          </div>

          {/* Back link */}
          <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 12 }}>
            <Link href="/family-manual" className="press-link-sm">
              ⟵ Return to the family manual
            </Link>
          </div>

          {/* Title */}
          <div className="press-binder-head">
            <h1 className="press-binder-title">The people</h1>
            <p className="press-binder-sub">
              Everyone with a volume in this manual, and room for
              those yet to come.
            </p>
          </div>

          {/* The one action — add a new volume */}
          <div className="press-binder-action">
            <button
              onClick={() => setShowAdd(true)}
              className="press-link"
              style={{ background: 'transparent', cursor: 'pointer' }}
            >
              Begin a new volume
              <span className="arrow">⟶</span>
            </button>
          </div>

          {/* The list of existing people */}
          {sortedPeople.length > 0 && (
            <div className="press-binder-archive" style={{ padding: '20px 0 32px' }}>
              <div
                className="press-chapter-label"
                style={{ textAlign: 'center', paddingTop: 20, marginBottom: 0 }}
              >
                Kept in the family
              </div>
              <div className="press-asterism" aria-hidden="true" />

              <div style={{ padding: '0 48px' }}>
                {sortedPeople.map((person, i) => (
                  <PersonRow
                    key={person.personId}
                    person={person}
                    index={i + 1}
                    onDelete={
                      person.relationshipType === 'self'
                        ? undefined
                        : () => setConfirmDelete(person)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {sortedPeople.length === 0 && (
            <div className="press-empty" style={{ padding: '40px 20px 60px' }}>
              <p className="press-empty-title" style={{ fontSize: 24 }}>
                The index is empty.
              </p>
              <p className="press-empty-body" style={{ fontSize: 14 }}>
                Begin by adding the first person you want to
                understand more fully.
              </p>
            </div>
          )}

          {/* Fleuron */}
          <div className="press-fleuron mt-6" style={{ fontSize: 16 }}>
            ❦
          </div>
        </div>
      </div>

      {/* Add person modal — press styled */}
      {showAdd && (
        <AddPersonDialog
          addName={addName}
          setAddName={setAddName}
          addType={addType}
          setAddType={setAddType}
          addDob={addDob}
          setAddDob={setAddDob}
          adding={adding}
          onConfirm={handleAdd}
          onClose={() => !adding && setShowAdd(false)}
        />
      )}

      {/* Delete confirmation — press styled */}
      {confirmDelete && (
        <DeleteDialog
          person={confirmDelete}
          deleting={deleting}
          onConfirm={handleDelete}
          onClose={() => !deleting && setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ================================================================
// A person row — book-catalog style entry
// ================================================================
function PersonRow({
  person,
  index,
  onDelete,
}: {
  person: Person;
  index: number;
  onDelete?: () => void;
}) {
  const label = relationshipLabel(person);
  const hasManual = person.hasManual;

  return (
    <div
      className="flex items-baseline gap-4 py-5"
      style={{ borderBottom: '1px solid rgba(200,190,172,0.4)' }}
    >
      {/* Volume number */}
      <span
        className="press-chapter-label"
        style={{ width: 40, flexShrink: 0, color: '#6B6254' }}
      >
        {toRoman(index)}.
      </span>

      {/* Name + meta — the main content */}
      <Link
        href={
          hasManual
            ? `/people/${person.personId}/manual`
            : `/people/${person.personId}/create-manual`
        }
        className="flex-1 min-w-0 block"
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <h3
          className="press-display-sm"
          style={{
            fontSize: 20,
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {person.name}
        </h3>
        <p
          className="press-marginalia mt-1"
          style={{ fontSize: 14 }}
        >
          {label}
          {!hasManual && (
            <> &middot; <em style={{ color: '#C4A265' }}>volume not yet written</em></>
          )}
        </p>
      </Link>

      {/* Open arrow */}
      <Link
        href={
          hasManual
            ? `/people/${person.personId}/manual`
            : `/people/${person.personId}/create-manual`
        }
        className="press-link-sm"
        style={{ flexShrink: 0 }}
      >
        {hasManual ? 'Open' : 'Begin'} ⟶
      </Link>

      {/* Delete — quiet ghost button */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="press-marginalia"
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            fontSize: 14,
            color: '#7A6E5C',
            marginLeft: 8,
            flexShrink: 0,
          }}
          aria-label={`Archive ${person.name}`}
        >
          archive
        </button>
      )}
    </div>
  );
}

// ================================================================
// Add person dialog — press styled
// ================================================================
interface AddDialogProps {
  addName: string;
  setAddName: (v: string) => void;
  addType: RelationshipType;
  setAddType: (v: RelationshipType) => void;
  addDob: string;
  setAddDob: (v: string) => void;
  adding: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function AddPersonDialog({
  addName, setAddName, addType, setAddType, addDob, setAddDob,
  adding, onConfirm, onClose,
}: AddDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(58, 48, 32, 0.4)',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="press-volume relative overflow-hidden"
        style={{ maxWidth: 540, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Running header */}
        <div className="press-running-header">
          <span>A new volume</span>
          <span className="sep">·</span>
          <span>Begin here</span>
        </div>

        <div style={{ padding: '24px 56px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span className="press-chapter-label">Begin</span>
            <h2
              className="press-display-md mt-2"
              style={{ fontSize: 29 }}
            >
              A new volume
            </h2>
            <p className="press-marginalia mt-2" style={{ fontSize: 13 }}>
              Someone you&rsquo;d like to understand more fully.
            </p>
          </div>

          <hr className="press-rule" />

          {/* Name field */}
          <div className="mt-6">
            <span className="press-chapter-label">Their name</span>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Iris"
              autoFocus
              className="w-full focus:outline-none mt-2"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 22,
                fontStyle: 'italic',
                color: '#3A3530',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid rgba(200,190,172,0.6)',
                padding: '8px 2px 10px',
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter(e, onConfirm)}
            />
          </div>

          {/* Relationship field */}
          <div className="mt-8">
            <span className="press-chapter-label">Who they are to you</span>
            <div className="mt-3">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setAddType(opt.type)}
                  className="w-full text-left py-3"
                  style={{
                    background: 'transparent',
                    border: 0,
                    borderBottom: '1px solid rgba(200,190,172,0.35)',
                    cursor: 'pointer',
                    transition: 'padding 0.2s ease',
                    paddingLeft: addType === opt.type ? 14 : 0,
                  }}
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: 18,
                        fontStyle: 'italic',
                        color: addType === opt.type ? '#3A3530' : '#6B6254',
                        fontWeight: addType === opt.type ? 500 : 400,
                      }}
                    >
                      {opt.label}
                    </span>
                    <span
                      className="press-marginalia"
                      style={{ fontSize: 13 }}
                    >
                      {opt.sub}
                    </span>
                    {addType === opt.type && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontFamily: 'var(--font-parent-display)',
                          fontStyle: 'italic',
                          color: '#7C9082',
                          fontSize: 15,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Birthday field */}
          <div className="mt-8">
            <span className="press-chapter-label">
              Date of birth <em style={{ textTransform: 'none', letterSpacing: 0, color: '#7A6E5C' }}>(optional)</em>
            </span>
            <input
              type="date"
              value={addDob}
              onChange={(e) => setAddDob(e.target.value)}
              className="w-full focus:outline-none mt-2"
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: 16,
                fontStyle: 'italic',
                color: addDob ? '#3A3530' : '#746856',
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid rgba(200,190,172,0.6)',
                padding: '8px 2px 10px',
              }}
            />
          </div>

          <hr className="press-rule" style={{ marginTop: 36 }} />

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={adding}
              className="press-link-sm"
              style={{
                background: 'transparent',
                cursor: adding ? 'not-allowed' : 'pointer',
                opacity: adding ? 0.4 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!addName.trim() || adding}
              className="press-link"
              style={{
                background: 'transparent',
                cursor: !addName.trim() || adding ? 'not-allowed' : 'pointer',
                opacity: !addName.trim() || adding ? 0.4 : 1,
              }}
            >
              {adding ? 'Beginning…' : 'Begin the volume'}
              {!adding && <span className="arrow">⟶</span>}
            </button>
          </div>

          <div className="press-fleuron mt-8">❦</div>
        </div>
      </div>
    </div>
  );
}

function handleEnter(e: React.KeyboardEvent<HTMLInputElement>, onConfirm: () => void) {
  e.preventDefault();
  onConfirm();
}

// ================================================================
// Delete confirmation dialog
// ================================================================
function DeleteDialog({
  person,
  deleting,
  onConfirm,
  onClose,
}: {
  person: Person;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(58, 48, 32, 0.4)',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="press-volume relative overflow-hidden"
        style={{ maxWidth: 480, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="press-running-header">
          <span>Archive a volume</span>
        </div>

        <div style={{ padding: '24px 48px 36px', textAlign: 'center' }}>
          <span className="press-chapter-label">Confirm</span>
          <h2
            className="press-display-md mt-2"
            style={{ fontSize: 24 }}
          >
            Archive {person.name}&rsquo;s volume?
          </h2>
          <p
            className="press-body-italic mt-4"
            style={{ fontSize: 14, maxWidth: 340, margin: '16px auto 0' }}
          >
            The volume will be set aside. Its contents remain in the
            archive and can be restored later.
          </p>

          <hr className="press-rule" style={{ marginTop: 28 }} />

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={deleting}
              className="press-link-sm"
              style={{
                background: 'transparent',
                cursor: deleting ? 'wait' : 'pointer',
                opacity: deleting ? 0.4 : 1,
              }}
            >
              Keep the volume
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="press-link"
              style={{
                background: 'transparent',
                cursor: deleting ? 'wait' : 'pointer',
                opacity: deleting ? 0.5 : 1,
                color: '#C08070',
                borderBottomColor: 'rgba(192,128,112,0.4)',
              }}
            >
              {deleting ? 'Archiving…' : 'Archive'}
              {!deleting && <span className="arrow">⟶</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
