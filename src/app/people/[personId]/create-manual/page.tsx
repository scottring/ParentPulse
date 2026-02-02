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
  { type: 'self', label: 'Myself', description: 'Create an operating manual for yourself', emoji: '🪞' },
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING SYSTEM...</p>
        </div>
      </div>
    );
  }

  const handleCreateManual = async () => {
    setIsCreating(true);
    try {
      // Create simplified manual structure
      const manualId = await createManual(personId, person.name, selectedType);

      // Update person document with relationship type and manual link
      await updatePerson({
        relationshipType: selectedType,
        hasManual: true,
        manualId
      });

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

            <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
              STEP 1: RELATIONSHIP TYPE
            </div>

            <h2 className="font-mono text-2xl font-bold mb-2 text-slate-900 text-center">
              Select Relationship Classification
            </h2>
            <p className="font-mono text-sm text-slate-600 mb-6 text-center max-w-2xl mx-auto">
              SPECIFY YOUR RELATIONSHIP TO {person.name.toUpperCase()} TO CUSTOMIZE MANUAL CONTENT
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {RELATIONSHIP_OPTIONS.map((option, index) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`relative p-4 text-left transition-all border-2 ${
                    selectedType === option.type
                      ? 'bg-amber-50 border-amber-600 shadow-[4px_4px_0px_0px_rgba(217,119,6,1)]'
                      : 'bg-white border-slate-300 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  {/* Number badge */}
                  <div className={`absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center border-2 font-mono text-xs font-bold ${
                    selectedType === option.type
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
                    {selectedType === option.type && (
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
                <strong>NEXT STEP:</strong> After initialization, you will complete a brief questionnaire to generate baseline manual content. Additional details can be added at any time.
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
