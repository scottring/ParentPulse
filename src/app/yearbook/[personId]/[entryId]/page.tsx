'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEntries } from '@/hooks/useEntries';
import { EntryCard } from '@/components/entry/EntryCard';

export default function EntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const personId = params.personId as string;
  const entryId = params.entryId as string;

  const { entries, loading: entriesLoading, updateEntry, completeEntry } = useEntries({
    personId,
  });

  const entry = entries.find(e => e.entryId === entryId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || entriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-stone-500 mb-4">Entry not found.</p>
          <button
            onClick={() => router.push(`/yearbook/${personId}`)}
            className="text-sm text-stone-600 underline hover:text-stone-800"
          >
            Back to yearbook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push(`/yearbook/${personId}`)}
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Yearbook
        </button>

        {/* Entry */}
        <EntryCard
          entry={entry}
          personId={personId}
          onUpdate={async (eid, updates) => {
            await updateEntry(eid, updates);
          }}
        />

        {/* Actions */}
        {entry.lifecycle === 'active' && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => completeEntry(entryId)}
              className="px-4 py-2.5 bg-stone-900 text-white text-sm rounded-xl hover:bg-stone-800 transition-colors"
            >
              Mark complete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
