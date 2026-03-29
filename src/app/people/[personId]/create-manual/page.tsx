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

export default function CreateManualPage({ params }: { params: Promise<{ personId: string }> }) {
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING SYSTEM...</p>
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
      <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
        <header className="border-b-4 border-slate-800 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 flex items-center justify-center bg-green-600 border-2 border-slate-800 font-mono text-2xl font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                ✓
              </div>
              <div>
                <div className="inline-block px-3 py-1 bg-green-700 text-white font-mono text-xs mb-2">
                  MANUAL CREATED
                </div>
                <h1 className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
                  {person.name}&apos;s Manual is Ready
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 lg:px-8 py-12">
          <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-green-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-green-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-green-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-green-600"></div>

            <h2 className="font-mono text-xl font-bold mb-2 text-slate-900">
              What&apos;s Next?
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-6">
              A manual comes to life through multiple perspectives. Here&apos;s how to build {person.name}&apos;s:
            </p>

            {/* Age context for kids */}
            {isChildType && personAge !== null && (
              <div className="mb-6 p-3 bg-amber-50 border-2 border-amber-300">
                <p className="font-mono text-xs text-amber-900">
                  {person.name} is {personAge} years old
                  {kidObserverOk && ' — old enough for self-sessions and to share observations about other family members'}
                  {!kidObserverOk && kidSessionOk && ' — old enough for a kid self-session with emoji questions'}
                  {!kidSessionOk && ' — a bit young for self-sessions, but you can build their manual from your perspective'}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {/* Primary CTA: Start your assessment */}
              <Link
                href={`/people/${personId}/manual/onboard`}
                className="block w-full p-4 bg-slate-800 text-white font-mono text-sm font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center"
              >
                START YOUR ASSESSMENT OF {person.name.toUpperCase()} →
              </Link>

              {/* Kid self-session */}
              {isChildType && kidSessionOk && (
                <Link
                  href={`/people/${personId}/manual/kid-session`}
                  className="block w-full p-4 bg-white border-2 border-slate-800 font-mono text-sm font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] text-center"
                >
                  LET {person.name.toUpperCase()} ADD THEIR VOICE →
                </Link>
              )}

              {/* Spouse invite */}
              {effectiveType === 'spouse' && (
                <Link
                  href={`/people/${personId}/manual`}
                  className="block w-full p-4 bg-white border-2 border-slate-800 font-mono text-sm font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] text-center"
                >
                  INVITE {person.name.toUpperCase()} TO CONTRIBUTE →
                </Link>
              )}

              {/* Self-onboard for linked adults */}
              {['friend', 'sibling'].includes(effectiveType) && (
                <Link
                  href={`/people/${personId}/manual`}
                  className="block w-full p-4 bg-white border-2 border-slate-800 font-mono text-sm font-bold text-slate-800 hover:bg-amber-50 hover:border-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] text-center"
                >
                  INVITE {person.name.toUpperCase()} TO ADD THEIR PERSPECTIVE →
                </Link>
              )}

              {/* Skip for now */}
              <Link
                href="/people"
                className="block w-full p-3 font-mono text-xs text-slate-500 hover:text-slate-800 transition-colors text-center"
              >
                I&apos;LL DO THIS LATER — BACK TO PEOPLE
              </Link>
            </div>
          </div>

          <div className="p-4 border-2 border-slate-200 bg-white">
            <p className="font-mono text-xs text-slate-500">
              This is a living document. You can always add more perspectives, update answers, and invite others to contribute later.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Header */}
      <header className="border-b-4 border-slate-800 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-6">
            <Link
              href="/people"
              className="w-12 h-12 flex items-center justify-center bg-slate-100 border-2 border-slate-800 font-mono text-2xl font-bold text-slate-800 hover:bg-amber-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              ←
            </Link>
            <div>
              <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-2">
                MANUAL INITIALIZATION
              </div>
              <h1 className="font-mono text-2xl sm:text-3xl font-bold text-slate-900">
                Create Operating Manual
              </h1>
              <p className="font-mono text-sm text-slate-600 mt-1">
                FOR: {person.name.toUpperCase()}
                {personAge !== null && (
                  <span className="ml-2 text-amber-700">({personAge} years old)</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
        <div>
          <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            {person.relationshipType && person.relationshipType !== 'self' ? (
              <div className="inline-block px-3 py-1 bg-green-700 text-white font-mono text-xs mb-4">
                RELATIONSHIP: {RELATIONSHIP_OPTIONS.find(o => o.type === person.relationshipType)?.label.toUpperCase() || person.relationshipType.toUpperCase()}
              </div>
            ) : (
              <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
                STEP 1: RELATIONSHIP TYPE
              </div>
            )}

            <h2 className="font-mono text-2xl font-bold mb-2 text-slate-900 text-center">
              {person.relationshipType && person.relationshipType !== 'self'
                ? `Confirm Relationship to ${person.name}`
                : 'Select Relationship Classification'}
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-6 text-center max-w-2xl mx-auto">
              {person.relationshipType && person.relationshipType !== 'self'
                ? 'We pre-selected based on what you entered. Change it if needed, then create the manual.'
                : `SPECIFY YOUR RELATIONSHIP TO ${person.name.toUpperCase()} TO CUSTOMIZE MANUAL CONTENT`}
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {RELATIONSHIP_OPTIONS.map((option, index) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`relative p-4 text-left transition-all border-2 ${
                    effectiveType === option.type
                      ? 'bg-amber-50 border-amber-600 shadow-[4px_4px_0px_0px_rgba(217,119,6,1)]'
                      : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  {/* Number badge */}
                  <div className={`absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center border-2 font-mono text-xs font-bold ${
                    effectiveType === option.type
                      ? 'bg-amber-600 text-white border-slate-800'
                      : 'bg-slate-800 text-white border-slate-600'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">{option.emoji}</div>
                    <div className="flex-1">
                      <h4 className="font-mono text-sm font-bold mb-1 text-slate-900">
                        {option.label}
                      </h4>
                      <p className="font-mono text-xs text-slate-600">
                        {option.description}
                      </p>
                    </div>
                    {effectiveType === option.type && (
                      <div className="text-xl text-amber-600 font-bold">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 border-2 border-slate-300 bg-slate-50">
              <div className="inline-block px-2 py-1 bg-slate-800 text-white font-mono text-xs mb-2">
                ℹ INFO
              </div>
              <p className="font-mono text-xs text-slate-700">
                <strong>NEXT STEP:</strong> After initialization, you&apos;ll choose how to start building {person.name}&apos;s manual — either by sharing your own observations or letting them contribute directly.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <Link
              href="/people"
              className="px-6 py-3 border-2 border-slate-300 bg-white font-mono text-sm font-bold text-slate-700 hover:border-slate-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              ← CANCEL
            </Link>
            <button
              onClick={handleCreateManual}
              disabled={isCreating}
              className="px-8 py-3 bg-slate-800 text-white font-mono text-sm font-bold uppercase tracking-wider hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  INITIALIZING...
                </span>
              ) : (
                'CREATE MANUAL →'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
