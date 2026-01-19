'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { RelationshipType } from '@/types/person-manual';

const RELATIONSHIP_OPTIONS: Array<{
  type: RelationshipType;
  label: string;
  description: string;
  emoji: string;
}> = [
  { type: 'child', label: 'Child', description: 'Your son, daughter, or child you parent', emoji: '👶' },
  { type: 'spouse', label: 'Spouse/Partner', description: 'Your romantic partner or spouse', emoji: '💑' },
  { type: 'elderly_parent', label: 'Elderly Parent', description: 'Your aging parent needing care', emoji: '👴' },
  { type: 'friend', label: 'Friend', description: 'A close friend in your life', emoji: '🤝' },
  { type: 'professional', label: 'Professional', description: 'Colleague, mentor, or work relationship', emoji: '💼' },
  { type: 'sibling', label: 'Sibling', description: 'Your brother or sister', emoji: '👫' },
  { type: 'other', label: 'Other', description: 'Another type of relationship', emoji: '👤' }
];

export default function CreateManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading, updatePerson } = usePersonById(personId);
  const { manual, createManual, loading: manualLoading } = usePersonManual(personId);
  const [selectedType, setSelectedType] = useState<RelationshipType>('other');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // If manual already exists, redirect to manual view
  useEffect(() => {
    if (manual && !manualLoading) {
      router.push(`/people/${personId}/manual`);
    }
  }, [manual, manualLoading, personId, router]);

  if (authLoading || personLoading || !user || !person) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const handleCreateManual = async () => {
    setIsCreating(true);
    try {
      // Create simplified manual structure
      await createManual(personId, person.name, selectedType);

      // Update person document with relationship type
      await updatePerson({ relationshipType: selectedType });

      // Navigate to onboarding wizard
      router.push(`/people/${personId}/manual/onboard`);
    } catch (err) {
      console.error('Failed to create manual:', err);
      alert('Failed to create manual. Please try again.');
      setIsCreating(false);
    }
  };

  const selectedOption = RELATIONSHIP_OPTIONS.find(opt => opt.type === selectedType);

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/people" className="text-2xl transition-transform hover:scale-110">
              ←
            </Link>
            <div>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                Create Operating Manual
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                For {person.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div className="animate-fade-in-up">
          <div className="parent-card p-8 mb-8">
            <h2 className="parent-heading text-2xl mb-4 text-center" style={{ color: 'var(--parent-text)' }}>
              What's your relationship to {person.name}?
            </h2>
            <p className="text-sm mb-6 text-center max-w-2xl mx-auto" style={{ color: 'var(--parent-text-light)' }}>
              This helps personalize the manual content for your specific relationship.
            </p>

            <div className="grid md:grid-cols-2 gap-3 mb-6">
              {RELATIONSHIP_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`parent-card p-4 text-left transition-all hover:shadow-md ${
                    selectedType === option.type ? 'ring-2' : ''
                  }`}
                  style={{
                    borderColor: selectedType === option.type ? 'var(--parent-accent)' : 'var(--parent-border)',
                    '--tw-ring-color': 'var(--parent-accent)'
                  } as React.CSSProperties}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">{option.emoji}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                        {option.label}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                        {option.description}
                      </p>
                    </div>
                    {selectedType === option.type && (
                      <div className="text-2xl" style={{ color: 'var(--parent-accent)' }}>✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'rgba(124, 144, 130, 0.08)' }}
            >
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                💡 <strong>What's next:</strong> After creating the manual, you'll answer a few questions to generate initial content. You can always add more details later.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <Link
              href="/people"
              className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md"
              style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
            >
              Cancel
            </Link>
            <button
              onClick={handleCreateManual}
              disabled={isCreating}
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {isCreating ? 'Creating Manual...' : `Create Manual & Continue`}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
