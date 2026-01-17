'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { RelationshipType } from '@/types/person-manual';
import { getManualSectionsPreview } from '@/utils/manual-initialization';

type Step = 'select_type' | 'review';

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
  const [step, setStep] = useState<Step>('select_type');
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
      // Create manual with sections
      const manualId = await createManual(personId, person.name, selectedType);

      // Update person document with relationship type
      await updatePerson({ relationshipType: selectedType });

      // Navigate to onboarding wizard instead of manual view
      router.push(`/people/${personId}/manual/onboard`);
    } catch (err) {
      console.error('Failed to create manual:', err);
      alert('Failed to create manual. Please try again.');
      setIsCreating(false);
    }
  };

  const preview = getManualSectionsPreview(selectedType);
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
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'select_type' ? 'text-white' : 'text-white opacity-50'
              }`}
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              1
            </div>
            <span className={`text-sm font-medium ${step === 'select_type' ? '' : 'opacity-50'}`} style={{ color: 'var(--parent-text)' }}>
              Select Relationship
            </span>
          </div>
          <div className="w-12 h-0.5" style={{ backgroundColor: 'var(--parent-border)' }}></div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'review' ? 'text-white' : 'text-white opacity-50'
              }`}
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              2
            </div>
            <span className={`text-sm font-medium ${step === 'review' ? '' : 'opacity-50'}`} style={{ color: 'var(--parent-text)' }}>
              Review & Create
            </span>
          </div>
        </div>

        {/* Step 1: Select Relationship Type */}
        {step === 'select_type' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-8 mb-8">
              <h2 className="parent-heading text-2xl mb-4 text-center" style={{ color: 'var(--parent-text)' }}>
                What's your relationship to {person.name}?
              </h2>
              <p className="text-sm mb-6 text-center max-w-2xl mx-auto" style={{ color: 'var(--parent-text-light)' }}>
                This helps us create the right sections for your manual. Each relationship type gets customized sections that fit your needs.
              </p>

              <div className="grid md:grid-cols-2 gap-3">
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => setSelectedType(option.type)}
                    className={`parent-card p-4 text-left transition-all hover:shadow-md ${
                      selectedType === option.type ? 'ring-2' : ''
                    }`}
                    style={{
                      borderColor: selectedType === option.type ? 'var(--parent-accent)' : 'var(--parent-border)',
                      ringColor: 'var(--parent-accent)'
                    }}
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
                onClick={() => setStep('review')}
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Create */}
        {step === 'review' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">{selectedOption?.emoji}</div>
                <div>
                  <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                    {person.name}'s Manual
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    {selectedOption?.label} relationship
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
                  This manual will include {preview.totalSections} sections:
                </h3>

                <div className="space-y-4">
                  {preview.universalSections.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--parent-text-light)' }}>
                        Universal Sections ({preview.universalSections.length})
                      </p>
                      <div className="grid gap-2">
                        {preview.universalSections.map((section) => (
                          <div key={section.title} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--parent-bg)' }}>
                            <span className="text-xl">{section.emoji}</span>
                            <div>
                              <p className="font-medium text-sm" style={{ color: 'var(--parent-text)' }}>{section.title}</p>
                              <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>{section.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.specificSections.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--parent-text-light)' }}>
                        {selectedOption?.label}-Specific Sections ({preview.specificSections.length})
                      </p>
                      <div className="grid gap-2">
                        {preview.specificSections.map((section) => (
                          <div key={section.title} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--parent-bg)' }}>
                            <span className="text-xl">{section.emoji}</span>
                            <div>
                              <p className="font-medium text-sm" style={{ color: 'var(--parent-text)' }}>{section.title}</p>
                              <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>{section.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(124, 144, 130, 0.08)' }}
              >
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  💡 <strong>Good to know:</strong> All sections start empty. You'll fill them in over time as you discover what works for {person.name}.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('select_type')}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md"
                style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
              >
                ← Back
              </button>
              <button
                onClick={handleCreateManual}
                disabled={isCreating}
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                {isCreating ? 'Creating Manual...' : `Create ${person.name}'s Manual`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
