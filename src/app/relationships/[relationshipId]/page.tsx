'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRelationshipManual } from '@/hooks/useRelationshipManual';

type ContentTab = 'overview' | 'goals' | 'rituals' | 'dynamics' | 'strategies' | 'milestones';

export default function RelationshipManualPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    manual,
    loading: manualLoading,
    error: manualError,
    updateManual
  } = useRelationshipManual(relationshipId);

  const [activeTab, setActiveTab] = useState<ContentTab>('overview');
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [overviewText, setOverviewText] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (manual?.relationshipOverview) {
      setOverviewText(manual.relationshipOverview);
    }
  }, [manual]);

  if (authLoading || manualLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  if (manualError || !manual) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="parent-card p-12 max-w-2xl text-center">
          <div className="text-6xl mb-4 opacity-40">⚠️</div>
          <h2 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
            {manualError || 'Relationship Manual Not Found'}
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--parent-text-light)' }}>
            This relationship manual may have been deleted or you may not have permission to view it.
          </p>
          <Link
            href="/people"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            ← Back to People
          </Link>
        </div>
      </div>
    );
  }

  const relationshipTypeEmojis = {
    marriage: '💑',
    partnership: '🤝',
    parent_child: '👨‍👧',
    friendship: '🤗',
    professional: '💼',
    other: '👥'
  };

  const tabs: Array<{ id: ContentTab; label: string; emoji: string; count?: number }> = [
    { id: 'overview', label: 'Overview', emoji: '📖' },
    { id: 'goals', label: 'Shared Goals', emoji: '🎯', count: manual.sharedGoals.length },
    { id: 'rituals', label: 'Rituals & Traditions', emoji: '🎉', count: manual.rituals.length + manual.traditions.length },
    { id: 'dynamics', label: 'Relationship Dynamics', emoji: '🔄', count: manual.conflictPatterns.length },
    { id: 'strategies', label: 'Connection Strategies', emoji: '💝', count: manual.connectionStrategies.length },
    { id: 'milestones', label: 'Milestones', emoji: '⭐', count: manual.importantMilestones.length }
  ];

  const handleSaveOverview = async () => {
    try {
      await updateManual(relationshipId, { relationshipOverview: overviewText });
      setIsEditingOverview(false);
    } catch (error) {
      console.error('Error saving overview:', error);
      alert('Failed to save overview');
    }
  };

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <Link href="/people" className="text-2xl transition-transform hover:scale-110 mt-1">
                ←
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{relationshipTypeEmojis[manual.relationshipType]}</span>
                  <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                    {manual.relationshipTitle}
                  </h1>
                  <span
                    className="text-xs px-3 py-1 rounded-full font-medium capitalize"
                    style={{
                      backgroundColor: 'var(--parent-bg)',
                      color: 'var(--parent-accent)',
                      border: '1px solid var(--parent-primary)'
                    }}
                  >
                    {manual.relationshipType.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  <span>👥 {manual.participantNames.join(' & ')}</span>
                  <span>•</span>
                  <span>Updated {manual.updatedAt.toDate().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </div>
                {manual.relationshipDescription && (
                  <p className="text-sm mt-2 max-w-2xl" style={{ color: 'var(--parent-text-light)' }}>
                    {manual.relationshipDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Navigation to participant manuals */}
            <div className="flex gap-2">
              {manual.participantNames.map((name, idx) => (
                <Link
                  key={idx}
                  href={`/people/${manual.participantIds[idx]}/manual`}
                  className="text-sm px-3 py-2 rounded-lg transition-all hover:shadow-md"
                  style={{
                    border: '1px solid var(--parent-border)',
                    color: 'var(--parent-text-light)'
                  }}
                  title={`Go to ${name}'s manual`}
                >
                  → {name}'s Manual
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium transition-all whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'border-current'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{
                  color: activeTab === tab.id ? 'var(--parent-accent)' : 'var(--parent-text-light)'
                }}
              >
                <span className="mr-2">{tab.emoji}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="ml-2 text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: activeTab === tab.id ? 'var(--parent-accent)' : 'var(--parent-bg)',
                      color: activeTab === tab.id ? 'white' : 'var(--parent-text-light)',
                      opacity: 0.8
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                Relationship Overview
              </h2>
              {!isEditingOverview && (
                <button
                  onClick={() => setIsEditingOverview(true)}
                  className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                  style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
                >
                  Edit Overview
                </button>
              )}
            </div>

            {isEditingOverview ? (
              <div className="parent-card p-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Describe your relationship
                </label>
                <textarea
                  value={overviewText}
                  onChange={(e) => setOverviewText(e.target.value)}
                  rows={10}
                  placeholder="Share the story of your relationship, how you work together, what makes this relationship special..."
                  className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)'
                  }}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSaveOverview}
                    className="px-6 py-2 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--parent-accent)' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setOverviewText(manual.relationshipOverview || '');
                      setIsEditingOverview(false);
                    }}
                    className="px-6 py-2 rounded-lg font-medium transition-all hover:shadow-md"
                    style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="parent-card p-6">
                {manual.relationshipOverview ? (
                  <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--parent-text)' }}>
                    {manual.relationshipOverview}
                  </p>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-40">📖</div>
                    <p className="text-base mb-4" style={{ color: 'var(--parent-text-light)' }}>
                      No relationship overview yet. Add a description of your relationship.
                    </p>
                    <button
                      onClick={() => setIsEditingOverview(true)}
                      className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                      style={{ backgroundColor: 'var(--parent-accent)' }}
                    >
                      Add Overview
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Other tabs - Placeholder for now */}
        {activeTab === 'goals' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-12 text-center">
              <div className="text-6xl mb-4 opacity-40">🎯</div>
              <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                Shared Goals
              </h3>
              <p className="text-base" style={{ color: 'var(--parent-text-light)' }}>
                Coming soon - track your shared goals together
              </p>
            </div>
          </div>
        )}

        {activeTab === 'rituals' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-12 text-center">
              <div className="text-6xl mb-4 opacity-40">🎉</div>
              <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                Rituals & Traditions
              </h3>
              <p className="text-base" style={{ color: 'var(--parent-text-light)' }}>
                Coming soon - document your rituals and traditions
              </p>
            </div>
          </div>
        )}

        {activeTab === 'dynamics' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-12 text-center">
              <div className="text-6xl mb-4 opacity-40">🔄</div>
              <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                Relationship Dynamics
              </h3>
              <p className="text-base" style={{ color: 'var(--parent-text-light)' }}>
                Coming soon - track conflict patterns and dynamics
              </p>
            </div>
          </div>
        )}

        {activeTab === 'strategies' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-12 text-center">
              <div className="text-6xl mb-4 opacity-40">💝</div>
              <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                Connection Strategies
              </h3>
              <p className="text-base" style={{ color: 'var(--parent-text-light)' }}>
                Coming soon - document what helps you connect
              </p>
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="animate-fade-in-up">
            <div className="parent-card p-12 text-center">
              <div className="text-6xl mb-4 opacity-40">⭐</div>
              <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
                Milestones
              </h3>
              <p className="text-base" style={{ color: 'var(--parent-text-light)' }}>
                Coming soon - celebrate important relationship milestones
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
