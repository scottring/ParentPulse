'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { useChildren } from '@/hooks/useChildren';
import { JournalCategory } from '@/types';

export default function NewJournalEntryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createEntry } = useJournal();
  const { children, loading: childrenLoading } = useChildren();

  const [text, setText] = useState('');
  const [category, setCategory] = useState<JournalCategory>('challenge');
  const [childId, setChildId] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');
  const [stressLevel, setStressLevel] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/child');
    }
  }, [user, authLoading, router]);

  // Auto-detect time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('morning');
    else if (hour < 17) setTimeOfDay('afternoon');
    else if (hour < 21) setTimeOfDay('evening');
    else setTimeOfDay('night');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!text.trim()) {
      setError('Please write something in your journal entry');
      return;
    }

    try {
      setLoading(true);
      await createEntry({
        text: text.trim(),
        category,
        childId: childId || undefined,
        context: {
          timeOfDay,
          stressLevel,
        },
      });
      router.push('/journal');
    } catch (err: any) {
      setError(err.message || 'Failed to create journal entry');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const categories: { value: JournalCategory; label: string; emoji: string; color: string }[] = [
    { value: 'win', label: 'Win', emoji: '🎉', color: '#A8E6CF' },
    { value: 'challenge', label: 'Challenge', emoji: '💪', color: '#FFD93D' },
    { value: 'behavior', label: 'Behavior', emoji: '🎭', color: '#FF6B6B' },
    { value: 'emotion', label: 'Emotion', emoji: '💝', color: '#E1BEE7' },
    { value: 'milestone', label: 'Milestone', emoji: '🌟', color: '#FFF9C4' },
    { value: 'discipline', label: 'Discipline', emoji: '🎯', color: '#B2DFDB' },
  ];

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                href="/journal"
                className="text-2xl transition-transform hover:scale-110"
              >
                ←
              </Link>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                New Journal Entry
              </h1>
            </div>
            <div className="text-3xl animate-float">📖</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8 animate-fade-in-up">
          <p className="text-sm mb-2" style={{ color: 'var(--parent-secondary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h2 className="parent-heading text-3xl sm:text-4xl mb-3" style={{ color: 'var(--parent-text)' }}>
            What's on your mind?
          </h2>
          <p className="text-lg" style={{ color: 'var(--parent-text-light)' }}>
            Capture a moment, challenge, or win from your parenting journey
          </p>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-lg animate-fade-in-up"
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B'
            }}
          >
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Main text area */}
          <div className="parent-card p-8 paper-texture">
            <label htmlFor="text" className="block text-lg font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
              Your Entry
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="w-full px-0 py-2 bg-transparent resize-none focus:outline-none transition-all"
              style={{
                color: 'var(--parent-text)',
                fontSize: '18px',
                lineHeight: '1.8',
                fontFamily: 'var(--font-parent-body)',
              }}
              placeholder="Write freely... What happened? How did you feel? What did you learn?"
              disabled={loading}
            />
            <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--parent-border)' }}>
              <span className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                {text.length} characters
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                  style={{
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text-light)',
                    border: '1px solid var(--parent-border)'
                  }}
                  disabled={loading}
                >
                  📷 Photo
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                  style={{
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text-light)',
                    border: '1px solid var(--parent-border)'
                  }}
                  disabled={loading}
                >
                  🎤 Voice
                </button>
              </div>
            </div>
          </div>

          {/* Category selection */}
          <div className="parent-card p-8">
            <label className="block text-lg font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
              What kind of entry is this?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className="p-4 rounded-xl text-left transition-all hover:scale-105"
                  style={{
                    backgroundColor: category === cat.value ? cat.color : 'var(--parent-bg)',
                    border: `2px solid ${category === cat.value ? cat.color : 'var(--parent-border)'}`,
                    opacity: category === cat.value ? 1 : 0.7,
                  }}
                  disabled={loading}
                >
                  <div className="text-3xl mb-2">{cat.emoji}</div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                    {cat.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Child selection */}
            <div className="parent-card p-6">
              <label htmlFor="child" className="block text-sm font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
                About which child?
              </label>
              <select
                id="child"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg transition-all"
                style={{
                  border: '1.5px solid var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)',
                }}
                disabled={loading || childrenLoading}
              >
                <option value="">General / All children</option>
                {children.map((child) => (
                  <option key={child.childId} value={child.childId}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time of day */}
            <div className="parent-card p-6">
              <label htmlFor="time" className="block text-sm font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
                Time of day
              </label>
              <select
                id="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg transition-all"
                style={{
                  border: '1.5px solid var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)',
                }}
                disabled={loading}
              >
                <option value="morning">🌅 Morning</option>
                <option value="afternoon">☀️ Afternoon</option>
                <option value="evening">🌆 Evening</option>
                <option value="night">🌙 Night</option>
              </select>
            </div>
          </div>

          {/* Stress level */}
          <div className="parent-card p-6">
            <label className="block text-sm font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
              How stressed were you? ({stressLevel}/5)
            </label>
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: 'var(--parent-text-light)' }}>Calm</span>
              <input
                type="range"
                min="1"
                max="5"
                value={stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--parent-primary)' }}
                disabled={loading}
              />
              <span className="text-sm" style={{ color: 'var(--parent-text-light)' }}>Stressed</span>
            </div>
            <div className="mt-3 text-center text-3xl">
              {stressLevel <= 2 ? '😌' : stressLevel === 3 ? '😐' : stressLevel === 4 ? '😰' : '😫'}
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-4">
            <Link
              href="/journal"
              className="px-8 py-4 rounded-lg font-semibold transition-all hover:shadow-md flex-1 text-center"
              style={{
                border: '1.5px solid var(--parent-border)',
                color: 'var(--parent-text-light)',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="px-8 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              style={{
                backgroundColor: 'var(--parent-accent)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                'Save Entry'
              )}
            </button>
          </div>
        </form>

        {/* Helper text */}
        <div
          className="mt-8 p-6 rounded-2xl animate-fade-in-up"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
            animationDelay: '0.2s'
          }}
        >
          <p className="text-sm text-center" style={{ color: 'var(--parent-text-light)' }}>
            💡 AI will analyze your entry and provide personalized insights based on your knowledge base
          </p>
        </div>
      </main>
    </div>
  );
}
