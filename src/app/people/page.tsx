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
  const { people, loading: peopleLoading, addPerson } = usePerson();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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
    </div>
  );
}

interface PersonCardProps {
  person: any;
  animationDelay: string;
}

function PersonCard({ person, animationDelay }: PersonCardProps) {
  const router = useRouter();
  const hasManual = person.hasManual;

  const handleClick = () => {
    if (hasManual) {
      router.push(`/people/${person.personId}/manual`);
    } else {
      router.push(`/people/${person.personId}/create-manual`);
    }
  };

  return (
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
        <svg
          className="w-6 h-6 transition-transform group-hover:translate-x-1"
          style={{ color: 'var(--parent-primary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
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
  );
}
