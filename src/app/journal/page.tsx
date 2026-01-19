'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useJournal, JournalFilters } from '@/hooks/useJournal';
import { useChildren } from '@/hooks/useChildren';
import { JournalEntry, JournalCategory } from '@/types';

export default function JournalListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { entries, loading: entriesLoading, fetchEntries } = useJournal();
  const { children, loading: childrenLoading } = useChildren();

  const [filters, setFilters] = useState<JournalFilters>({});
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | ''>('');
  const [selectedChild, setSelectedChild] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/child');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const newFilters: JournalFilters = {};
    if (selectedCategory) newFilters.category = selectedCategory;
    if (selectedChild) newFilters.childId = selectedChild;

    fetchEntries(newFilters);
  }, [selectedCategory, selectedChild]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const categories = [
    { value: '', label: 'All', emoji: '📚' },
    { value: 'win', label: 'Wins', emoji: '🎉' },
    { value: 'challenge', label: 'Challenges', emoji: '💪' },
    { value: 'behavior', label: 'Behavior', emoji: '🎭' },
    { value: 'emotion', label: 'Emotions', emoji: '💝' },
    { value: 'milestone', label: 'Milestones', emoji: '🌟' },
    { value: 'discipline', label: 'Discipline', emoji: '🎯' },
  ];

  const getCategoryColor = (category: JournalCategory): string => {
    const colors: Record<JournalCategory, string> = {
      win: '#A8E6CF',
      challenge: '#FFD93D',
      behavior: '#FF6B6B',
      emotion: '#E1BEE7',
      milestone: '#FFF9C4',
      discipline: '#B2DFDB',
    };
    return colors[category];
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-2xl transition-transform hover:scale-110"
              >
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  Journal
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>
            <Link
              href="/journal/new"
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg flex items-center gap-2"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              <span className="text-xl">+</span>
              <span className="hidden sm:inline">New Entry</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Filters */}
        <div className="mb-8 animate-fade-in-up">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {/* Category filter */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                Filter by type
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value as any)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                    style={{
                      backgroundColor: selectedCategory === cat.value ? 'var(--parent-primary)' : 'var(--parent-card)',
                      color: selectedCategory === cat.value ? 'white' : 'var(--parent-text)',
                      border: `1px solid ${selectedCategory === cat.value ? 'var(--parent-primary)' : 'var(--parent-border)'}`,
                    }}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Child filter */}
            <div>
              <label htmlFor="child-filter" className="block text-sm font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                Filter by child
              </label>
              <select
                id="child-filter"
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full px-4 py-3 rounded-lg transition-all"
                style={{
                  border: '1.5px solid var(--parent-border)',
                  backgroundColor: 'var(--parent-card)',
                  color: 'var(--parent-text)',
                }}
                disabled={childrenLoading}
              >
                <option value="">All children</option>
                {children.map((child) => (
                  <option key={child.childId} value={child.childId}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Entries List */}
        {entriesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 spinner"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="parent-card p-12 text-center paper-texture animate-fade-in-up">
            <div className="text-6xl mb-4 opacity-40">📝</div>
            <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
              {selectedCategory || selectedChild ? 'No entries match your filters' : 'No journal entries yet'}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
              {selectedCategory || selectedChild ? 'Try adjusting your filters' : 'Start capturing your parenting journey'}
            </p>
            {!selectedCategory && !selectedChild && (
              <Link
                href="/journal/new"
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                Write your first entry
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            {entries.map((entry, index) => (
              <JournalEntryCard
                key={entry.entryId}
                entry={entry}
                children={children}
                categoryColor={getCategoryColor(entry.category)}
                formatDate={formatDate}
                animationDelay={`${index * 0.05}s`}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface JournalEntryCardProps {
  entry: JournalEntry;
  children: any[];
  categoryColor: string;
  formatDate: (timestamp: any) => string;
  animationDelay: string;
}

function JournalEntryCard({ entry, children, categoryColor, formatDate, animationDelay }: JournalEntryCardProps) {
  const router = useRouter();
  const childName = children.find((c) => c.childId === entry.childId)?.name;

  const categoryEmoji: Record<JournalCategory, string> = {
    win: '🎉',
    challenge: '💪',
    behavior: '🎭',
    emotion: '💝',
    milestone: '🌟',
    discipline: '🎯',
  };

  const stressEmoji = ['😌', '😊', '😐', '😰', '😫'][entry.context.stressLevel - 1] || '😐';
  const timeEmoji = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙',
  }[entry.context.timeOfDay];

  return (
    <button
      onClick={() => router.push(`/journal/${entry.entryId}`)}
      className="parent-card p-6 text-left w-full hover:shadow-lg transition-all duration-300 group animate-fade-in-up"
      style={{ animationDelay }}
    >
      <div className="flex items-start gap-4">
        {/* Category indicator */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: categoryColor }}
        >
          {categoryEmoji[entry.category]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--parent-accent)' }}>
                  {formatDate(entry.createdAt)}
                </span>
                {childName && (
                  <>
                    <span style={{ color: 'var(--parent-text-light)' }}>•</span>
                    <span className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      {childName}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm capitalize" style={{ color: 'var(--parent-text-light)' }}>
                {entry.category.replace('_', ' ')}
              </p>
            </div>

            {/* Context indicators */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-lg" title={entry.context.timeOfDay}>
                {timeEmoji}
              </span>
              <span className="text-lg" title={`Stress level: ${entry.context.stressLevel}/5`}>
                {stressEmoji}
              </span>
            </div>
          </div>

          {/* Entry text preview */}
          <p
            className="text-base leading-relaxed line-clamp-2"
            style={{ color: 'var(--parent-text)' }}
          >
            {entry.text}
          </p>

          {/* Media indicators */}
          {(entry.photoUrls?.length || entry.voiceNoteUrl) && (
            <div className="flex items-center gap-3 mt-3">
              {entry.photoUrls && entry.photoUrls.length > 0 && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--parent-text-light)' }}>
                  📷 {entry.photoUrls.length} {entry.photoUrls.length === 1 ? 'photo' : 'photos'}
                </span>
              )}
              {entry.voiceNoteUrl && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--parent-text-light)' }}>
                  🎤 Voice note
                </span>
              )}
            </div>
          )}

          {/* AI insight indicator */}
          {entry.aiAnalysis && (
            <div className="mt-3 flex items-center gap-2">
              <div
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: '#E8F5E9',
                  color: 'var(--parent-accent)',
                }}
              >
                ✨ AI Insights Available
              </div>
            </div>
          )}
        </div>

        {/* Arrow */}
        <svg
          className="w-5 h-5 transition-transform group-hover:translate-x-1 flex-shrink-0"
          style={{ color: 'var(--parent-primary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
