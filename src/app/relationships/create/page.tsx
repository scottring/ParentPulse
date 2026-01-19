'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { useRelationshipManual } from '@/hooks/useRelationshipManual';
import { RelationshipManual } from '@/types/person-manual';

function CreateRelationshipManualContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { people, loading: peopleLoading } = usePerson();
  const { createManual } = useRelationshipManual();

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [relationshipType, setRelationshipType] = useState<RelationshipManual['relationshipType']>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Pre-fill participants from query parameters
  useEffect(() => {
    const participantsParam = searchParams.get('participants');
    if (participantsParam && people.length > 0) {
      const participantIds = participantsParam.split(',').filter(id =>
        people.some(p => p.personId === id)
      );
      if (participantIds.length > 0) {
        setSelectedParticipants(participantIds);
      }
    }
  }, [searchParams, people]);

  // Auto-generate title when participants or type changes
  useEffect(() => {
    if (selectedParticipants.length >= 2) {
      const participantNames = selectedParticipants
        .map(id => people.find(p => p.personId === id)?.name)
        .filter(Boolean);

      const typeLabels = {
        marriage: 'Marriage',
        partnership: 'Partnership',
        parent_child: 'Parent-Child Relationship',
        friendship: 'Friendship',
        professional: 'Professional Relationship',
        other: 'Relationship'
      };

      setTitle(`${participantNames.join(' & ')} ${typeLabels[relationshipType]}`);
    }
  }, [selectedParticipants, relationshipType, people]);

  const toggleParticipant = (personId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  const handleCreate = async () => {
    if (selectedParticipants.length < 2) {
      alert('Please select at least 2 participants');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setCreating(true);

    try {
      const participantNames = selectedParticipants
        .map(id => people.find(p => p.personId === id)?.name)
        .filter(Boolean) as string[];

      const relationshipId = await createManual(
        selectedParticipants,
        participantNames,
        relationshipType,
        title,
        description || undefined
      );

      // Redirect to onboarding wizard instead of direct to manual
      router.push(`/relationships/${relationshipId}/onboard`);
    } catch (error) {
      console.error('Error creating relationship manual:', error);
      alert('Failed to create relationship manual');
      setCreating(false);
    }
  };

  if (authLoading || peopleLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/people" className="text-2xl transition-transform hover:scale-110">
              ←
            </Link>
            <div>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                Create Relationship Manual
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                Create a shared manual for tracking goals, rituals, and relationship dynamics
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <div className="space-y-8">
          {/* Step 1: Select Participants */}
          <div className="parent-card p-6 animate-fade-in-up">
            <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
              1. Select Participants
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
              Choose at least 2 people to include in this relationship manual
            </p>

            {people.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-base mb-4" style={{ color: 'var(--parent-text-light)' }}>
                  No people found. Add people to your family first.
                </p>
                <Link
                  href="/people"
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg inline-block"
                  style={{ backgroundColor: 'var(--parent-accent)' }}
                >
                  Go to People
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {people.map((person) => (
                  <button
                    key={person.personId}
                    onClick={() => toggleParticipant(person.personId)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedParticipants.includes(person.personId)
                        ? 'border-current shadow-md'
                        : 'hover:border-gray-300'
                    }`}
                    style={{
                      borderColor: selectedParticipants.includes(person.personId)
                        ? 'var(--parent-accent)'
                        : 'var(--parent-border)',
                      backgroundColor: selectedParticipants.includes(person.personId)
                        ? 'var(--parent-card)'
                        : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: 'var(--parent-text)' }}>
                        {person.name}
                      </span>
                      {selectedParticipants.includes(person.personId) && (
                        <span style={{ color: 'var(--parent-accent)' }}>✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Choose Relationship Type */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
              2. Choose Relationship Type
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
              Select the type of relationship this manual represents
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { value: 'marriage' as const, label: 'Marriage', emoji: '💑', desc: 'Married couples' },
                { value: 'partnership' as const, label: 'Partnership', emoji: '🤝', desc: 'Non-married partners' },
                { value: 'parent_child' as const, label: 'Parent-Child', emoji: '👨‍👧', desc: 'Parent and child relationship' },
                { value: 'friendship' as const, label: 'Friendship', emoji: '🤗', desc: 'Friends' },
                { value: 'professional' as const, label: 'Professional', emoji: '💼', desc: 'Work relationships' },
                { value: 'other' as const, label: 'Other', emoji: '👥', desc: 'Other relationship types' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setRelationshipType(type.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    relationshipType === type.value
                      ? 'border-current shadow-md'
                      : 'hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: relationshipType === type.value
                      ? 'var(--parent-accent)'
                      : 'var(--parent-border)',
                    backgroundColor: relationshipType === type.value
                      ? 'var(--parent-card)'
                      : 'transparent'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{type.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                        {type.label}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                        {type.desc}
                      </div>
                    </div>
                    {relationshipType === type.value && (
                      <span style={{ color: 'var(--parent-accent)' }}>✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Name and Describe */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
              3. Name Your Relationship Manual
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Scott & Iris Marriage Manual"
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of this relationship..."
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-end gap-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              href="/people"
              className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md"
              style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={creating || selectedParticipants.length < 2 || !title.trim()}
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {creating ? 'Creating...' : 'Create Relationship Manual'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreateRelationshipManualPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    }>
      <CreateRelationshipManualContent />
    </Suspense>
  );
}
