'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useYearbook } from '@/hooks/useYearbook';
import { useEntries } from '@/hooks/useEntries';
import { useManual } from '@/hooks/useManual';
import { YearbookView } from '@/components/yearbook/YearbookView';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export default function YearbookPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const personId = params.personId as string;

  const { getYearbookForPerson, getOrCreateYearbook, loading: yearbookLoading } = useYearbook();
  const { manuals } = useManual();
  const [yearbookId, setYearbookId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const yearbook = yearbookId ? undefined : getYearbookForPerson(personId);
  const activeYearbookId = yearbookId || yearbook?.yearbookId;

  const { entries, loading: entriesLoading, updateEntry } = useEntries(
    activeYearbookId ? { yearbookId: activeYearbookId } : { personId }
  );

  // Ensure yearbook exists
  useEffect(() => {
    if (!yearbookLoading && !yearbook && user) {
      getOrCreateYearbook(personId).then(setYearbookId);
    }
  }, [yearbookLoading, yearbook, user, personId, getOrCreateYearbook]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const handleGenerate = useCallback(async () => {
    if (!activeYearbookId || !user) return;
    setIsGenerating(true);
    try {
      const generateFn = httpsCallable(functions, 'generateYearbookContent');
      const householdManual = manuals.find(m => m.type === 'household');
      await generateFn({
        familyId: user.familyId,
        personId,
        yearbookId: activeYearbookId,
        manualId: householdManual?.manualId,
      });
    } catch (err) {
      console.error('Failed to generate content:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [activeYearbookId, user, personId, manuals]);

  const handleUpdateEntry = useCallback(async (entryId: string, updates: Partial<any>) => {
    await updateEntry(entryId, updates);
  }, [updateEntry]);

  if (authLoading || !user || yearbookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  const activeYearbook = yearbook || (activeYearbookId ? {
    yearbookId: activeYearbookId,
    familyId: user.familyId,
    personId,
    year: new Date().getFullYear(),
    chapters: [],
    createdAt: new Date(),
  } : null);

  if (!activeYearbook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Setting up yearbook...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push('/bookshelf')}
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Bookshelf
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900 heading">Yearbook</h1>
          <p className="text-stone-500 text-sm">Stories, activities, and reflections</p>
        </div>

        {/* Yearbook content */}
        <YearbookView
          yearbook={activeYearbook}
          entries={entries}
          personId={personId}
          onUpdateEntry={handleUpdateEntry}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}
