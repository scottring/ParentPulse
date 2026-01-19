'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { useChildren } from '@/hooks/useChildren';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { JournalEntry, JournalCategory } from '@/types';

export default function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { updateEntry } = useJournal();
  const { children } = useChildren();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [text, setText] = useState('');
  const [category, setCategory] = useState<JournalCategory>('win');
  const [childId, setChildId] = useState('');
  const [stressLevel, setStressLevel] = useState(3);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/child');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const entryDoc = await getDoc(doc(firestore, 'journal_entries', id));

        if (!entryDoc.exists()) {
          setError('Journal entry not found');
          return;
        }

        const entryData = {
          entryId: entryDoc.id,
          ...entryDoc.data(),
        } as JournalEntry;

        setEntry(entryData);
        setText(entryData.text);
        setCategory(entryData.category);
        setChildId(entryData.childId || '');
        setStressLevel(entryData.context.stressLevel);
        setTimeOfDay(entryData.context.timeOfDay);
      } catch (err: any) {
        console.error('Error fetching entry:', err);
        setError(err.message || 'Failed to load journal entry');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEntry();
    }
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setError('Please write something in your journal');
      return;
    }

    if (!childId) {
      setError('Please select a child');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await updateEntry(id, {
        text: text.trim(),
        category,
        childId,
        context: {
          stressLevel,
          timeOfDay,
        },
      });

      router.push(`/journal/${id}`);
    } catch (err: any) {
      console.error('Error updating entry:', err);
      setError(err.message || 'Failed to update journal entry');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  if (error && !entry) {
    return (
      <div className="min-h-screen parent-page">
        <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
          <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6">
            <Link
              href="/journal"
              className="text-2xl transition-transform hover:scale-110 inline-block"
            >
              ←
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 lg:px-8 py-12">
          <div className="parent-card p-12 text-center">
            <div className="text-6xl mb-4">😕</div>
            <p className="text-lg mb-6" style={{ color: 'var(--parent-text)' }}>
              {error}
            </p>
            <Link
              href="/journal"
              className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              Back to Journal
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const categories = [
    { value: 'win', label: 'Win', emoji: '🎉', desc: 'Something went well' },
    { value: 'challenge', label: 'Challenge', emoji: '💪', desc: 'A difficult moment' },
    { value: 'behavior', label: 'Behavior', emoji: '🎭', desc: 'Behavior observation' },
    { value: 'emotion', label: 'Emotion', emoji: '💝', desc: 'Emotional moment' },
    { value: 'milestone', label: 'Milestone', emoji: '🌟', desc: 'A special achievement' },
    { value: 'discipline', label: 'Discipline', emoji: '🎯', desc: 'Discipline situation' },
  ];

  const stressEmojis = ['😌', '😊', '😐', '😰', '😫'];

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/journal/${id}`}
              className="text-2xl transition-transform hover:scale-110"
            >
              ←
            </Link>
            <div>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                Edit Journal Entry
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                Update your journal entry
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error message */}
          {error && (
            <div
              className="p-4 rounded-lg text-sm"
              style={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                border: '1px solid #FCA5A5'
              }}
            >
              {error}
            </div>
          )}

          {/* Journal text */}
          <div className="parent-card p-6 animate-fade-in-up">
            <label htmlFor="text" className="block mb-3">
              <span className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                What happened? *
              </span>
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write about what happened today..."
              rows={8}
              className="w-full p-4 rounded-lg resize-none"
              style={{
                border: '1.5px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)',
                fontFamily: 'var(--font-parent-body)',
              }}
              required
            />
          </div>

          {/* Category selection */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <label className="block mb-4">
              <span className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                Category *
              </span>
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value as JournalCategory)}
                  className="p-4 rounded-xl text-left transition-all hover:shadow-md"
                  style={{
                    backgroundColor: category === cat.value ? 'var(--parent-primary)' : 'var(--parent-bg)',
                    color: category === cat.value ? 'white' : 'var(--parent-text)',
                    border: `2px solid ${category === cat.value ? 'var(--parent-primary)' : 'var(--parent-border)'}`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="font-semibold">{cat.label}</span>
                  </div>
                  <p
                    className="text-sm ml-10"
                    style={{
                      color: category === cat.value ? 'rgba(255, 255, 255, 0.9)' : 'var(--parent-text-light)'
                    }}
                  >
                    {cat.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Child selection */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <label htmlFor="child" className="block mb-3">
              <span className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                Which child? *
              </span>
            </label>
            <select
              id="child"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full p-4 rounded-lg"
              style={{
                border: '1.5px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)',
              }}
              required
            >
              <option value="">Select a child</option>
              {children.map((child) => (
                <option key={child.childId} value={child.childId}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          {/* Context */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--parent-text)' }}>
              Context
            </h3>

            {/* Time of day */}
            <div className="mb-4">
              <label className="block mb-2">
                <span className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Time of day
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'morning', emoji: '🌅', label: 'Morning' },
                  { value: 'afternoon', emoji: '☀️', label: 'Afternoon' },
                  { value: 'evening', emoji: '🌆', label: 'Evening' },
                  { value: 'night', emoji: '🌙', label: 'Night' },
                ].map((time) => (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() => setTimeOfDay(time.value as any)}
                    className="p-3 rounded-lg text-center transition-all hover:shadow-md"
                    style={{
                      backgroundColor: timeOfDay === time.value ? 'var(--parent-secondary)' : 'var(--parent-bg)',
                      color: timeOfDay === time.value ? 'white' : 'var(--parent-text)',
                      border: `1.5px solid ${timeOfDay === time.value ? 'var(--parent-secondary)' : 'var(--parent-border)'}`,
                    }}
                  >
                    <div className="text-2xl mb-1">{time.emoji}</div>
                    <div className="text-xs font-medium">{time.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stress level */}
            <div>
              <label className="block mb-2">
                <span className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Your stress level: {stressEmojis[stressLevel - 1]}
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--parent-border)',
                }}
              />
              <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--parent-text-light)' }}>
                <span>1 - Calm</span>
                <span>5 - Very stressed</span>
              </div>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-4 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 px-8 rounded-lg font-semibold text-white text-lg transition-all hover:shadow-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {saving ? 'Saving...' : 'Update Entry'}
            </button>
            <Link
              href={`/journal/${id}`}
              className="py-4 px-8 rounded-lg font-semibold text-lg transition-all hover:shadow-md text-center"
              style={{
                border: '1.5px solid var(--parent-border)',
                color: 'var(--parent-text)',
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
