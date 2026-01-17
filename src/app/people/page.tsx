'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';

export default function PeoplePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { people, loading: peopleLoading, addPerson, updatePerson, deletePerson } = usePerson();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
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
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const handleAddPerson = async () => {
    if (!newPersonName.trim()) return;

    setIsAdding(true);
    try {
      const personId = await addPerson({
        name: newPersonName.trim(),
        pronouns: undefined,
        childData: undefined
      });

      setNewPersonName('');
      setShowAddModal(false);

      // Navigate to create manual for this person
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

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl transition-transform hover:scale-110">
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  People in Your Life
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Create and manage operating manuals for everyone who matters
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
              style={{
                color: 'var(--parent-text-light)',
                border: '1px solid var(--parent-border)'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Stats Overview */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up">
          <div className="parent-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl">👥</div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--parent-text)' }}>
                  {people.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Total People
                </p>
              </div>
            </div>
          </div>

          <div className="parent-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl">📖</div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--parent-accent)' }}>
                  {peopleWithManuals.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Active Manuals
                </p>
              </div>
            </div>
          </div>

          <div className="parent-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl">✨</div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--parent-secondary)' }}>
                  {peopleWithoutManuals.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Awaiting Setup
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Person Button */}
        <div className="flex justify-between items-center mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
            Your People
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg flex items-center gap-2"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            <span className="text-xl">+</span>
            <span>Add Person</span>
          </button>
        </div>

        {/* People Grid */}
        {peopleLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 spinner"></div>
          </div>
        ) : people.length === 0 ? (
          <div className="parent-card p-12 text-center paper-texture animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-6xl mb-4 opacity-40">👋</div>
            <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
              Start Building Your Operating Manuals
            </h3>
            <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'var(--parent-text-light)' }}>
              Add the important people in your life - children, spouse, elderly parents, close friends -
              and create personalized manuals to understand what works for each relationship.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-8 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg inline-flex items-center gap-2"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              <span className="text-2xl">+</span>
              <span>Add Your First Person</span>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* People with Manuals */}
            {peopleWithManuals.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
                  <span className="text-2xl">📖</span>
                  <span>Active Manuals ({peopleWithManuals.length})</span>
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {peopleWithManuals.map((person, index) => (
                    <PersonCard
                      key={person.personId}
                      person={person}
                      animationDelay={`${0.2 + index * 0.05}s`}
                      onEdit={() => openEditModal(person)}
                      onDelete={() => setDeletingPerson(person)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* People without Manuals */}
            {peopleWithoutManuals.length > 0 && (
              <div className="animate-fade-in-up" style={{ animationDelay: `${0.2 + peopleWithManuals.length * 0.05}s` }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
                  <span className="text-2xl">✨</span>
                  <span>Ready for Setup ({peopleWithoutManuals.length})</span>
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {peopleWithoutManuals.map((person, index) => (
                    <PersonCard
                      key={person.personId}
                      person={person}
                      animationDelay={`${0.2 + (peopleWithManuals.length + index) * 0.05}s`}
                      onEdit={() => openEditModal(person)}
                      onDelete={() => setDeletingPerson(person)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Person Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !isAdding && setShowAddModal(false)}
        >
          <div
            className="parent-card p-8 max-w-md w-full animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            style={{ animationDelay: '0s' }}
          >
            <h3 className="parent-heading text-2xl mb-4" style={{ color: 'var(--parent-text)' }}>
              Add a New Person
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
              Enter the name of someone you'd like to create an operating manual for.
            </p>

            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAdding) {
                  handleAddPerson();
                }
              }}
              placeholder="e.g., Scott, Iris, Ella, Caleb"
              className="w-full px-4 py-3 rounded-lg mb-6 text-base"
              style={{
                border: '2px solid var(--parent-border)',
                color: 'var(--parent-text)',
                backgroundColor: 'var(--parent-bg)'
              }}
              autoFocus
              disabled={isAdding}
            />

            <div className="flex gap-3">
              <button
                onClick={() => !isAdding && setShowAddModal(false)}
                className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text-light)'
                }}
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPerson}
                className="flex-1 px-4 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--parent-accent)' }}
                disabled={isAdding || !newPersonName.trim()}
              >
                {isAdding ? 'Adding...' : 'Add Person'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      {editingPerson && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !isUpdating && setEditingPerson(null)}
        >
          <div
            className="parent-card p-8 max-w-md w-full animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="parent-heading text-2xl mb-4" style={{ color: 'var(--parent-text)' }}>
              Edit Person
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
              Update the name for {editingPerson.name}.
            </p>

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
              className="w-full px-4 py-3 rounded-lg mb-6 text-base"
              style={{
                border: '2px solid var(--parent-border)',
                color: 'var(--parent-text)',
                backgroundColor: 'var(--parent-bg)'
              }}
              autoFocus
              disabled={isUpdating}
            />

            <div className="flex gap-3">
              <button
                onClick={() => !isUpdating && setEditingPerson(null)}
                className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text-light)'
                }}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleEditPerson}
                className="flex-1 px-4 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--parent-accent)' }}
                disabled={isUpdating || !editName.trim()}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPerson && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !isDeleting && setDeletingPerson(null)}
        >
          <div
            className="parent-card p-8 max-w-md w-full animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="parent-heading text-2xl mb-4 text-red-600">
              Delete Person?
            </h3>
            <p className="text-base mb-6" style={{ color: 'var(--parent-text)' }}>
              Are you sure you want to delete <strong>{deletingPerson.name}</strong>?
              {deletingPerson.hasManual && (
                <span className="block mt-2 text-red-600">
                  Warning: This person has an operating manual that will also be affected.
                </span>
              )}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => !isDeleting && setDeletingPerson(null)}
                className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text-light)'
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePerson}
                className="flex-1 px-4 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
                style={{ backgroundColor: '#dc2626' }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PersonCardProps {
  person: any;
  animationDelay: string;
  onEdit: () => void;
  onDelete: () => void;
}

function PersonCard({ person, animationDelay, onEdit, onDelete }: PersonCardProps) {
  const router = useRouter();
  const hasManual = person.hasManual;
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = () => {
    if (hasManual) {
      router.push(`/people/${person.personId}/manual`);
    } else {
      router.push(`/people/${person.personId}/create-manual`);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete();
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="parent-card p-6 text-left hover:shadow-lg transition-all duration-300 group w-full animate-fade-in-up"
        style={{ animationDelay }}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110"
            style={{ backgroundColor: hasManual ? '#E8F5E9' : '#FFF3E0' }}
          >
            {hasManual ? '📖' : '✨'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-lg transition-all hover:bg-opacity-10 hover:bg-black"
              style={{ color: 'var(--parent-text-light)' }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>
        </div>

        <h3 className="parent-heading text-xl mb-2" style={{ color: 'var(--parent-text)' }}>
          {person.name}
        </h3>

        {person.pronouns && (
          <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
            {person.pronouns}
          </p>
        )}

        {hasManual ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--parent-accent)' }}>
            <span>✓</span>
            <span>Has operating manual</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--parent-secondary)' }}>
            <span>→</span>
            <span>Create manual</span>
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="absolute right-2 top-14 z-20 parent-card py-2 min-w-[140px] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEdit}
              className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-10 hover:bg-black transition-colors flex items-center gap-2"
              style={{ color: 'var(--parent-text)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm hover:bg-opacity-10 hover:bg-red-100 transition-colors flex items-center gap-2 text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
