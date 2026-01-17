'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';

export default function CreateManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, createManual, loading: manualLoading } = usePersonManual(personId);
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
      const manualId = await createManual(personId, person.name);
      router.push(`/people/${personId}/manual`);
    } catch (err) {
      console.error('Failed to create manual:', err);
      alert('Failed to create manual. Please try again.');
      setIsCreating(false);
    }
  };

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
      <main className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
        <div className="parent-card p-8 lg:p-12 text-center animate-fade-in-up">
          {/* Icon */}
          <div
            className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center text-5xl"
            style={{ backgroundColor: '#E8F5E9' }}
          >
            📖
          </div>

          {/* Heading */}
          <h2 className="parent-heading text-3xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Ready to create {person.name}'s manual?
          </h2>

          {/* Description */}
          <p className="text-base mb-8 leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--parent-text-light)' }}>
            An operating manual is a living document that captures what makes {person.name} unique —
            their triggers, what works, what doesn't, and the patterns you discover together.
          </p>

          {/* Benefits List */}
          <div className="text-left mb-10 max-w-md mx-auto space-y-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">🎯</div>
              <div>
                <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                  Role-Based Sections
                </h4>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Create sections for different roles (e.g., "Father to {person.name}", "Teacher to {person.name}")
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">👥</div>
              <div>
                <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                  Collaborative Editing
                </h4>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Both people in a relationship can contribute their perspectives
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">📊</div>
              <div>
                <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                  Track What Works
                </h4>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Document triggers, effective strategies, boundaries, and patterns over time
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">🌱</div>
              <div>
                <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                  Living Document
                </h4>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Your manual evolves as your relationship grows and changes
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/people"
              className="px-8 py-4 rounded-lg font-semibold transition-all hover:shadow-md"
              style={{
                border: '1px solid var(--parent-border)',
                color: 'var(--parent-text-light)'
              }}
            >
              Not Yet
            </Link>
            <button
              onClick={handleCreateManual}
              disabled={isCreating}
              className="px-8 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {isCreating ? 'Creating Manual...' : `Create ${person.name}'s Manual`}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div
          className="mt-8 p-6 rounded-xl text-center animate-fade-in-up"
          style={{
            backgroundColor: 'rgba(124, 144, 130, 0.08)',
            animationDelay: '0.1s'
          }}
        >
          <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
            💡 <strong>Tip:</strong> You can always start simple and add more detail over time.
            The manual grows with your understanding of the relationship.
          </p>
        </div>
      </main>
    </div>
  );
}
