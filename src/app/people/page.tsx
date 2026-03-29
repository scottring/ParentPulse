'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { useManualSummaries } from '@/hooks/useManualSummaries';
import MainLayout from '@/components/layout/MainLayout';
import PersonCard from '@/components/people/PersonCard';
import {
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { RelationshipType } from '@/types/person-manual';
import { computeAge } from '@/utils/age';
import { detectTwins } from '@/utils/family-relationships';
import { Timestamp } from 'firebase/firestore';

const RELATIONSHIP_OPTIONS: Array<{
  type: RelationshipType;
  label: string;
  emoji: string;
}> = [
  { type: 'child', label: 'Child', emoji: '👶' },
  { type: 'spouse', label: 'Spouse/Partner', emoji: '💑' },
  { type: 'elderly_parent', label: 'Elderly Parent', emoji: '👴' },
  { type: 'friend', label: 'Friend', emoji: '🤝' },
  { type: 'professional', label: 'Professional', emoji: '💼' },
  { type: 'sibling', label: 'Sibling', emoji: '👫' },
  { type: 'other', label: 'Other', emoji: '👤' },
];

export default function PeoplePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { people, loading: peopleLoading, addPerson, updatePerson, deletePerson } = usePerson();
  const { summaries, loading: summariesLoading } = useManualSummaries();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonDob, setNewPersonDob] = useState('');
  const [newPersonRelationship, setNewPersonRelationship] = useState<RelationshipType | ''>('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit modal state
  const [editingPerson, setEditingPerson] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation state
  const [deletingPerson, setDeletingPerson] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING DATABASE...</p>
        </div>
      </div>
    );
  }

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;

    setIsAdding(true);
    try {
      const personData: any = {
        name: newPersonName.trim(),
        canSelfContribute: false,
      };

      if (newPersonDob) {
        const dob = new Date(newPersonDob);
        personData.dateOfBirth = Timestamp.fromDate(dob);
        personData.age = computeAge(dob);
      }

      if (newPersonRelationship) {
        personData.relationshipType = newPersonRelationship;
        personData.canSelfContribute = ['spouse', 'child', 'sibling', 'friend'].includes(newPersonRelationship);
      }

      const personId = await addPerson(personData);

      setNewPersonName('');
      setNewPersonDob('');
      setNewPersonRelationship('');
      setShowAddModal(false);

      router.push(`/people/${personId}/create-manual`);
    } catch (err) {
      console.error('Failed to add person:', err);
      alert('Failed to add person. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditPerson = async () => {
    if (!editName.trim() || !editingPerson) return;

    setIsUpdating(true);
    try {
      await updatePerson(editingPerson.personId, {
        name: editName.trim()
      });

      setEditingPerson(null);
      setEditName('');
    } catch (err) {
      console.error('Failed to update person:', err);
      alert('Failed to update person. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!deletingPerson) return;

    setIsDeleting(true);
    try {
      await deletePerson(deletingPerson.personId);
      setDeletingPerson(null);
    } catch (err) {
      console.error('Failed to delete person:', err);
      alert('Failed to delete person. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (person: any) => {
    setEditingPerson(person);
    setEditName(person.name);
  };

  const peopleWithManuals = people.filter(p => p.hasManual);
  const peopleWithoutManuals = people.filter(p => !p.hasManual);
  const twinIds = detectTwins(people);

  return (
    <MainLayout>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <header className="mb-12">
          <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            <div className="flex items-start gap-6">
              <Link
                href="/dashboard"
                className="mt-2 font-mono text-3xl font-bold text-slate-800 hover:text-amber-600 transition-colors"
                data-testid="back-to-dashboard"
              >
                ←
              </Link>

              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-3">
                  PERSONNEL DATABASE
                </div>

                <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-900 mb-2">
                  People Management System
                </h1>

                <p className="font-mono text-sm text-slate-600">
                  CREATE AND MANAGE OPERATING MANUALS FOR ALL REGISTERED INDIVIDUALS
                </p>
              </div>
            </div>
          </div>
        </header>
        {/* Technical Statistics Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Stat 1: Total People */}
          <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="total-people-stat">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
              1
            </div>
            <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
              REGISTRY COUNT
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold font-mono text-slate-900">
                {people.length}
              </div>
              <div className="font-mono text-sm text-slate-600">
                TOTAL<br/>PEOPLE
              </div>
            </div>
          </div>

          {/* Stat 2: Active Manuals */}
          <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="active-manuals-stat">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-green-600">
              2
            </div>
            <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
              OPERATIONAL STATUS
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold font-mono text-green-700">
                {peopleWithManuals.length}
              </div>
              <div className="font-mono text-sm text-slate-600">
                ACTIVE<br/>MANUALS
              </div>
            </div>
          </div>

          {/* Stat 3: Awaiting Setup */}
          <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="awaiting-setup-stat">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
              3
            </div>
            <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
              PENDING INIT
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold font-mono text-amber-600">
                {peopleWithoutManuals.length}
              </div>
              <div className="font-mono text-sm text-slate-600">
                AWAITING<br/>SETUP
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs">
            PERSONNEL REGISTRY
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            data-testid="add-person-button"
          >
            + ADD PERSON
          </button>
        </div>

        {/* People Content */}
        {peopleLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
              <p className="mt-4 font-mono text-sm text-slate-600">LOADING REGISTRY...</p>
            </div>
          </div>
        ) : people.length === 0 ? (
          <div className="relative bg-amber-50 border-4 border-amber-600 p-16 text-center shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-slate-800"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-slate-800"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-slate-800"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-slate-800"></div>

            <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-6">
              DATABASE EMPTY
            </div>
            <h2 className="font-mono text-3xl font-bold mb-4 text-slate-900">
              NO PERSONNEL REGISTERED
            </h2>
            <p className="font-mono text-sm text-slate-700 mb-8 max-w-md mx-auto">
              Initialize the personnel database by adding your first person and creating their operating manual
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-8 py-4 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              data-testid="add-first-person-button"
            >
              ADD FIRST PERSON →
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active Manuals Section */}
            {peopleWithManuals.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs">
                    SECTION 1
                  </div>
                  <h2 className="font-mono text-2xl font-bold">
                    Active Manuals ({peopleWithManuals.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {peopleWithManuals.map((person, index) => (
                    <PersonCard
                      key={person.personId}
                      person={person}
                      index={index}
                      hasManual={true}
                      summary={summaries.get(person.personId)}
                      summaryLoading={summariesLoading}
                      isTwin={twinIds.has(person.personId)}
                      onEdit={() => openEditModal(person)}
                      onDelete={() => setDeletingPerson(person)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Ready for Setup Section */}
            {peopleWithoutManuals.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs">
                    SECTION 2
                  </div>
                  <h2 className="font-mono text-2xl font-bold">
                    Ready for Setup ({peopleWithoutManuals.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {peopleWithoutManuals.map((person, index) => (
                    <PersonCard
                      key={person.personId}
                      person={person}
                      index={index}
                      hasManual={false}
                      isTwin={twinIds.has(person.personId)}
                      onEdit={() => openEditModal(person)}
                      onDelete={() => setDeletingPerson(person)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => !isAdding && setShowAddModal(false)}
        >
          <div
            className="relative bg-white border-4 border-slate-800 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
            data-testid="add-person-modal"
          >
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-6">
              NEW ENTRY
            </div>
            <h3 className="font-mono text-2xl font-bold mb-2 text-slate-900">
              Add Person to Registry
            </h3>
            <p className="font-mono text-xs text-slate-600 mb-6">
              Tell us about someone you'd like to create an operating manual for
            </p>

            {/* Name */}
            <div className="mb-5">
              <label className="font-mono text-xs text-slate-600 mb-2 block uppercase tracking-wider">
                Full Name:
              </label>
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAdding && newPersonName.trim()) {
                    handleAddPerson();
                  }
                }}
                placeholder="e.g., Scott, Iris, Ella, Caleb"
                className="w-full px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                style={{ backgroundColor: '#FFF8F0' }}
                autoFocus
                disabled={isAdding}
                data-testid="person-name-input"
              />
            </div>

            {/* Date of Birth */}
            <div className="mb-5">
              <label className="font-mono text-xs text-slate-600 mb-2 block uppercase tracking-wider">
                Date of Birth: <span className="text-slate-400">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={newPersonDob}
                  onChange={(e) => setNewPersonDob(e.target.value)}
                  className="flex-1 px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                  style={{ backgroundColor: '#FFF8F0' }}
                  disabled={isAdding}
                  data-testid="person-dob-input"
                />
                {newPersonDob && (
                  <span className="font-mono text-sm font-bold text-amber-700 bg-amber-50 border border-amber-300 px-3 py-2">
                    {computeAge(new Date(newPersonDob)) < 18
                      ? `Age ${computeAge(new Date(newPersonDob))}`
                      : `${computeAge(new Date(newPersonDob))} yrs`}
                  </span>
                )}
              </div>
            </div>

            {/* Relationship Type */}
            <div className="mb-6">
              <label className="font-mono text-xs text-slate-600 mb-2 block uppercase tracking-wider">
                Relationship: <span className="text-slate-400">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setNewPersonRelationship(
                      newPersonRelationship === option.type ? '' : option.type
                    )}
                    disabled={isAdding}
                    className={`px-3 py-2 text-left font-mono text-xs border-2 transition-all flex items-center gap-2 ${
                      newPersonRelationship === option.type
                        ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-[2px_2px_0px_0px_rgba(217,119,6,0.5)]'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                    data-testid={`relationship-${option.type}`}
                  >
                    <span>{option.emoji}</span>
                    <span className="font-bold">{option.label}</span>
                  </button>
                ))}
              </div>
              {newPersonDob && newPersonRelationship === 'child' && computeAge(new Date(newPersonDob)) >= 6 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-300 font-mono text-xs text-green-800">
                  {computeAge(new Date(newPersonDob)) >= 8
                    ? `Age ${computeAge(new Date(newPersonDob))} — eligible for self-session and observer sessions`
                    : `Age ${computeAge(new Date(newPersonDob))} — eligible for kid self-session`}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!isAdding) {
                    setShowAddModal(false);
                    setNewPersonName('');
                    setNewPersonDob('');
                    setNewPersonRelationship('');
                  }
                }}
                className="flex-1 px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                disabled={isAdding}
                data-testid="cancel-add-button"
              >
                CANCEL
              </button>
              <button
                onClick={handleAddPerson}
                className="flex-1 px-4 py-3 bg-slate-800 text-white font-mono text-xs font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                disabled={isAdding || !newPersonName.trim()}
                data-testid="submit-add-button"
              >
                {isAdding ? 'PROCESSING...' : 'ADD PERSON'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      {editingPerson && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => !isUpdating && setEditingPerson(null)}
        >
          <div
            className="relative bg-white border-4 border-slate-800 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
            data-testid="edit-person-modal"
          >
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-6">
              EDIT RECORD
            </div>
            <h3 className="font-mono text-2xl font-bold mb-2 text-slate-900">
              Update Person Details
            </h3>
            <p className="font-mono text-xs text-slate-600 mb-6">
              Modify the name for {editingPerson.name}
            </p>

            <div className="mb-6">
              <label className="font-mono text-xs text-slate-600 mb-2 block uppercase tracking-wider">
                Full Name:
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isUpdating) {
                    handleEditPerson();
                  }
                }}
                placeholder="Enter name"
                className="w-full px-4 py-3 font-mono text-sm border-2 border-slate-800 focus:outline-none focus:border-amber-600"
                style={{ backgroundColor: '#FFF8F0' }}
                autoFocus
                disabled={isUpdating}
                data-testid="edit-name-input"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => !isUpdating && setEditingPerson(null)}
                className="flex-1 px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                disabled={isUpdating}
                data-testid="cancel-edit-button"
              >
                CANCEL
              </button>
              <button
                onClick={handleEditPerson}
                className="flex-1 px-4 py-3 bg-slate-800 text-white font-mono text-xs font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                disabled={isUpdating || !editName.trim()}
                data-testid="submit-edit-button"
              >
                {isUpdating ? 'UPDATING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPerson && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => !isDeleting && setDeletingPerson(null)}
        >
          <div
            className="relative bg-white border-4 border-red-600 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]"
            onClick={(e) => e.stopPropagation()}
            data-testid="delete-person-modal"
          >
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-slate-800"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-slate-800"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-slate-800"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-slate-800"></div>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white font-mono text-xs mb-6">
              <ExclamationTriangleIcon className="w-3 h-3" />
              WARNING
            </div>
            <h3 className="font-mono text-2xl font-bold mb-2 text-red-600">
              Delete Person?
            </h3>
            <p className="font-mono text-sm text-slate-900 mb-4">
              Confirm deletion of <strong>{deletingPerson.name}</strong>
            </p>
            {deletingPerson.hasManual && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-600">
                <p className="font-mono text-xs text-red-700 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                  THIS PERSON HAS AN OPERATING MANUAL THAT WILL BE AFFECTED
                </p>
              </div>
            )}
            <p className="font-mono text-xs text-slate-600 mb-6">
              This action cannot be undone. All associated data will be permanently removed from the system.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => !isDeleting && setDeletingPerson(null)}
                className="flex-1 px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                disabled={isDeleting}
                data-testid="cancel-delete-button"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeletePerson}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                disabled={isDeleting}
                data-testid="confirm-delete-button"
              >
                {isDeleting ? 'DELETING...' : 'DELETE PERSON'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
