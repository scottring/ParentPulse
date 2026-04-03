'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { RelationshipType } from '@/types/person-manual';
import { computeAge, isKidSessionEligible, isKidObserverEligible } from '@/utils/age';

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

export function CreateManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading, updatePerson } = usePersonById(personId);
  const { manual, createManual, loading: manualLoading } = usePersonManual(personId);
  const [selectedType, setSelectedType] = useState<RelationshipType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showWhatsNext, setShowWhatsNext] = useState(false);
  const [createdManualId, setCreatedManualId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Pre-select relationship type if already set on person (from Add Person modal)
  useEffect(() => {
    if (person?.relationshipType && person.relationshipType !== 'self' && selectedType === null) {
      setSelectedType(person.relationshipType);
    }
  }, [person, selectedType]);

  // If manual already exists and we're not showing What's Next, redirect to manual view
  useEffect(() => {
    if (manual && !manualLoading && !showWhatsNext) {
      router.push(`/people/${personId}/manual`);
    }
  }, [manual, manualLoading, personId, router, showWhatsNext]);

  if (authLoading || personLoading || !user || !person) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '3px solid #7C9082', borderTopColor: 'transparent' }}></div>
          <p className="mt-4" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const effectiveType = selectedType || 'other';
  const personAge = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const isChildType = effectiveType === 'child';
  const kidSessionOk = person.dateOfBirth ? isKidSessionEligible(person.dateOfBirth) : isChildType;
  const kidObserverOk = person.dateOfBirth ? isKidObserverEligible(person.dateOfBirth) : false;

  const handleCreateManual = async () => {
    setIsCreating(true);
    try {
      const manualId = await createManual(personId, person.name, effectiveType);

      const canSelfContribute = ['spouse', 'child', 'sibling', 'friend'].includes(effectiveType);
      await updatePerson({
        relationshipType: effectiveType,
        hasManual: true,
        manualId,
        canSelfContribute,
      });

      setCreatedManualId(manualId);
      setShowWhatsNext(true);
    } catch (err) {
      console.error('Failed to create manual:', err);
      alert('Failed to create manual. Please try again.');
      setIsCreating(false);
    }
  };

  // What's Next screen after manual creation
  if (showWhatsNext) {
    return (
      <div className="min-h-screen">
        <header className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: 0 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 flex items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: '#7C9082' }}>
                ✓
              </div>
              <div>
                <div className="inline-block px-3 py-1 rounded-full text-white text-xs mb-2" style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#7C9082' }}>
                  Manual Created
                </div>
                <h1 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '28px', fontWeight: 600, color: '#3A3530' }}>
                  {person.name}&apos;s Manual is Ready
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 lg:px-8 py-12">
          <div className="glass-card-strong p-8 mb-8" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
            <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '22px', fontWeight: 600, color: '#3A3530', marginBottom: '8px' }}>
              What&apos;s Next?
            </h2>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347', marginBottom: '24px' }}>
              A manual comes to life through multiple perspectives. Here&apos;s how to build {person.name}&apos;s:
            </p>

            {/* Age context for kids */}
            {isChildType && personAge !== null && (
              <div className="mb-6 p-3 rounded-lg" style={{ backgroundColor: 'rgba(124,144,130,0.08)', border: '1px solid rgba(124,144,130,0.2)' }}>
                <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#3A3530' }}>
                  {person.name} is {personAge} years old
                  {kidObserverOk && ' — old enough for self-sessions and to share observations about other family members'}
                  {!kidObserverOk && kidSessionOk && ' — old enough for a kid self-session with emoji questions'}
                  {!kidSessionOk && ' — a bit young for self-sessions, but you can build their manual from your perspective'}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Primary CTA: Start your portrait */}
              <Link
                href={`/people/${personId}/manual/onboard`}
                className="block w-full p-4 rounded-full text-white text-sm text-center transition-all hover:opacity-90"
                style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#7C9082' }}
              >
                Start your portrait of {person.name} &rarr;
              </Link>

              {/* Kid self-session */}
              {isChildType && kidSessionOk && (
                <Link
                  href={`/people/${personId}/manual/kid-session`}
                  className="block w-full p-4 rounded-full text-sm text-center transition-all hover:opacity-90"
                  style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, color: '#3A3530', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}
                >
                  Let {person.name} add their voice &rarr;
                </Link>
              )}

              {/* Spouse invite */}
              {effectiveType === 'spouse' && (
                <Link
                  href={`/people/${personId}/manual`}
                  className="block w-full p-4 rounded-full text-sm text-center transition-all hover:opacity-90"
                  style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, color: '#3A3530', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}
                >
                  Invite {person.name} to contribute &rarr;
                </Link>
              )}

              {/* Self-onboard for linked adults */}
              {['friend', 'sibling'].includes(effectiveType) && (
                <Link
                  href={`/people/${personId}/manual`}
                  className="block w-full p-4 rounded-full text-sm text-center transition-all hover:opacity-90"
                  style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, color: '#3A3530', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}
                >
                  Invite {person.name} to add their perspective &rarr;
                </Link>
              )}

              {/* Skip for now */}
              <Link
                href="/dashboard"
                className="block w-full p-3 text-center transition-colors"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}
              >
                I&apos;ll do this later — back to people
              </Link>
            </div>
          </div>

          <div className="glass-card p-4" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#7C7468' }}>
              This is a living document. You can always add more perspectives, update answers, and invite others to contribute later.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card" style={{ border: '1px solid rgba(255,255,255,0.4)', borderRadius: 0 }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="w-12 h-12 flex items-center justify-center rounded-full text-2xl transition-all"
              style={{ color: '#3A3530', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              &larr;
            </Link>
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-white text-xs mb-2" style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#7C9082' }}>
                New Manual
              </div>
              <h1 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '28px', fontWeight: 600, color: '#3A3530' }}>
                Create Operating Manual
              </h1>
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347', marginTop: '4px' }}>
                For: {person.name}
                {personAge !== null && (
                  <span style={{ marginLeft: '8px', color: '#7C9082' }}>({personAge} years old)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div>
          <div className="glass-card-strong p-8 mb-8" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
            {person.relationshipType && person.relationshipType !== 'self' ? (
              <div className="inline-block px-3 py-1 rounded-full text-white text-xs mb-4" style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#7C9082' }}>
                Relationship: {RELATIONSHIP_OPTIONS.find(o => o.type === person.relationshipType)?.label || person.relationshipType}
              </div>
            ) : (
              <div className="inline-block px-3 py-1 rounded-full text-white text-xs mb-4" style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#3A3530' }}>
                Step 1: Relationship Type
              </div>
            )}

            <h2 className="text-center" style={{ fontFamily: 'var(--font-parent-display)', fontSize: '24px', fontWeight: 600, color: '#3A3530', marginBottom: '8px' }}>
              {person.relationshipType && person.relationshipType !== 'self'
                ? `Confirm Relationship to ${person.name}`
                : 'Select Relationship'}
            </h2>
            <p className="text-center max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', color: '#5C5347', marginBottom: '24px' }}>
              {person.relationshipType && person.relationshipType !== 'self'
                ? 'We pre-selected based on what you entered. Change it if needed, then create the manual.'
                : `Specify your relationship to ${person.name} to customize manual content.`}
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {RELATIONSHIP_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className="relative p-4 text-left rounded-xl transition-all"
                  style={{
                    backgroundColor: effectiveType === option.type ? 'rgba(124,144,130,0.1)' : 'rgba(255,255,255,0.3)',
                    border: effectiveType === option.type ? '2px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">{option.emoji}</div>
                    <div className="flex-1">
                      <h4 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '14px', fontWeight: 600, color: '#3A3530', marginBottom: '4px' }}>
                        {option.label}
                      </h4>
                      <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5C5347' }}>
                        {option.description}
                      </p>
                    </div>
                    {effectiveType === option.type && (
                      <div style={{ fontSize: '18px', color: '#7C9082', fontWeight: 700 }}>✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(124,144,130,0.06)', border: '1px solid rgba(124,144,130,0.15)' }}>
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '12px', color: '#5C5347' }}>
                <strong>Next step:</strong> After initialization, you&apos;ll choose how to start building {person.name}&apos;s manual — either by sharing your own observations or letting them contribute directly.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full text-sm transition-all"
              style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.3)' }}
            >
              &larr; Cancel
            </Link>
            <button
              onClick={handleCreateManual}
              disabled={isCreating}
              className="px-8 py-3 rounded-full text-white text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-parent-body)', fontWeight: 500, backgroundColor: '#7C9082' }}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                'Create Manual \u2192'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
