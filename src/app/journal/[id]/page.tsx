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

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { deleteEntry } = useJournal();
  const { children } = useChildren();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

        setEntry({
          entryId: entryDoc.id,
          ...entryDoc.data(),
        } as JournalEntry);
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

  const handleDelete = async () => {
    if (!entry) return;

    try {
      setDeleting(true);
      await deleteEntry(entry.entryId);
      router.push('/journal');
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry');
      setDeleting(false);
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

  if (!entry) return null;

  const childName = children.find((c) => c.childId === entry.childId)?.name;

  const categoryInfo: Record<JournalCategory, { emoji: string; label: string; color: string }> = {
    win: { emoji: '🎉', label: 'Win', color: '#A8E6CF' },
    challenge: { emoji: '💪', label: 'Challenge', color: '#FFD93D' },
    behavior: { emoji: '🎭', label: 'Behavior', color: '#FF6B6B' },
    emotion: { emoji: '💝', label: 'Emotion', color: '#E1BEE7' },
    milestone: { emoji: '🌟', label: 'Milestone', color: '#FFF9C4' },
    discipline: { emoji: '🎯', label: 'Discipline', color: '#B2DFDB' },
  };

  const category = categoryInfo[entry.category];
  const stressEmoji = ['😌', '😊', '😐', '😰', '😫'][entry.context.stressLevel - 1] || '😐';
  const timeEmoji = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙',
  }[entry.context.timeOfDay];

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
                Journal Entry
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/journal/${entry.entryId}/edit`)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)',
                  border: '1px solid var(--parent-border)'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  border: '1px solid #FCA5A5'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Entry metadata */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: category.color }}
            >
              {category.emoji}
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--parent-secondary)' }}>
                {entry.createdAt.toDate().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--parent-text-light)' }}>
                <span>{category.label}</span>
                {childName && (
                  <>
                    <span>•</span>
                    <span>{childName}</span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  {timeEmoji} {entry.context.timeOfDay}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {stressEmoji} Stress: {entry.context.stressLevel}/5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Entry text */}
        <div className="parent-card p-8 mb-6 paper-texture animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <p
            className="text-lg leading-relaxed whitespace-pre-wrap"
            style={{
              color: 'var(--parent-text)',
              fontFamily: 'var(--font-parent-body)',
            }}
          >
            {entry.text}
          </p>
        </div>

        {/* Photos */}
        {entry.photoUrls && entry.photoUrls.length > 0 && (
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
              Photos
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {entry.photoUrls.map((url, index) => (
                <div key={index} className="parent-card overflow-hidden rounded-xl">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice note */}
        {entry.voiceNoteUrl && (
          <div className="parent-card p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
              Voice Note
            </h3>
            <audio controls className="w-full">
              <source src={entry.voiceNoteUrl} type="audio/webm" />
              <source src={entry.voiceNoteUrl} type="audio/mp4" />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* AI Analysis */}
        {entry.aiAnalysis ? (
          <div className="parent-card p-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">✨</div>
              <h3 className="text-2xl parent-heading" style={{ color: 'var(--parent-accent)' }}>
                AI Insights
              </h3>
            </div>

            {/* Summary */}
            {entry.aiAnalysis.summary && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                  Summary
                </h4>
                <p className="leading-relaxed" style={{ color: 'var(--parent-text-light)' }}>
                  {entry.aiAnalysis.summary}
                </p>
              </div>
            )}

            {/* Sentiment */}
            {entry.aiAnalysis.sentiment && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                  Sentiment
                </h4>
                <div
                  className="inline-block px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: entry.aiAnalysis.sentiment === 'positive' ? '#E8F5E9' :
                                    entry.aiAnalysis.sentiment === 'negative' ? '#FEE2E2' : '#FFF9C4',
                    color: entry.aiAnalysis.sentiment === 'positive' ? '#2D5F5D' :
                           entry.aiAnalysis.sentiment === 'negative' ? '#991B1B' : '#B8956F',
                  }}
                >
                  {entry.aiAnalysis.sentiment.charAt(0).toUpperCase() + entry.aiAnalysis.sentiment.slice(1)}
                </div>
              </div>
            )}

            {/* Suggested strategies */}
            {entry.aiAnalysis.suggestedStrategies && entry.aiAnalysis.suggestedStrategies.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
                  Suggested Strategies
                </h4>
                <ul className="space-y-2">
                  {entry.aiAnalysis.suggestedStrategies.map((strategy, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm leading-relaxed"
                      style={{ color: 'var(--parent-text-light)' }}
                    >
                      <span style={{ color: 'var(--parent-accent)' }}>•</span>
                      <span>{strategy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related knowledge */}
            {entry.aiAnalysis.relatedKnowledgeIds && entry.aiAnalysis.relatedKnowledgeIds.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
                  Related Knowledge
                </h4>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  {entry.aiAnalysis.relatedKnowledgeIds.length} relevant {entry.aiAnalysis.relatedKnowledgeIds.length === 1 ? 'item' : 'items'} from your knowledge base
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className="parent-card p-8 text-center animate-fade-in-up"
            style={{
              backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
              animationDelay: '0.3s'
            }}
          >
            <div className="text-5xl mb-3">🤖</div>
            <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
              AI analysis will be generated automatically for this entry
            </p>
          </div>
        )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="parent-card p-8 max-w-md w-full animate-fade-in-up">
              <h3 className="text-2xl parent-heading mb-4" style={{ color: 'var(--parent-text)' }}>
                Delete Entry?
              </h3>
              <p className="mb-6" style={{ color: 'var(--parent-text-light)' }}>
                Are you sure you want to delete this journal entry? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all hover:shadow-md"
                  style={{
                    border: '1px solid var(--parent-border)',
                    color: 'var(--parent-text)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
                  style={{
                    backgroundColor: '#DC2626',
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
