'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useManual } from '@/hooks/useManual';
import { useConversation } from '@/hooks/useConversation';
import { ConversationView } from '@/components/onboarding/ConversationView';
import { DomainRefreshReview } from '@/components/manual/DomainRefreshReview';
import { DOMAIN_NAMES, DOMAIN_ORDER } from '@/types/manual';
import type { DomainId } from '@/types/user';

type Phase = 'conversation' | 'review' | 'done';

export default function RefreshDomainPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { manuals, loading: manualsLoading, getManual, updateDomain } = useManual();
  const conversation = useConversation();

  const manualId = params.manualId as string;
  const domainIdParam = params.domainId as string;
  const domainId = DOMAIN_ORDER.includes(domainIdParam as DomainId)
    ? (domainIdParam as DomainId)
    : null;

  const manual = getManual(manualId);
  const [phase, setPhase] = useState<Phase>('conversation');
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Start the refresh conversation once data is ready
  useEffect(() => {
    if (started || !manual || !domainId || !user) return;
    setStarted(true);

    const currentData = manual.domains[domainId] as unknown as Record<string, unknown>;
    conversation.startRefreshConversation(domainId, user.familyId, currentData);
  }, [manual, domainId, user, started, conversation]);

  // Watch for synthesis completion
  useEffect(() => {
    if (conversation.lastResponse?.type === 'synthesis' && phase === 'conversation') {
      setPhase('review');
    }
  }, [conversation.lastResponse, phase]);

  const handleSendMessage = useCallback((message: string) => {
    conversation.sendMessage(message);
  }, [conversation]);

  const handleApprove = useCallback(async (editedData?: Record<string, unknown>) => {
    if (!domainId || !manual) return;
    setSaving(true);

    try {
      const data = editedData ?? conversation.lastResponse?.structuredData;
      if (data && data[domainId]) {
        await updateDomain(manualId, domainId, data[domainId] as Record<string, unknown>, 'refresh');
      }
      setPhase('done');
    } catch (err) {
      console.error('Failed to save refresh:', err);
    } finally {
      setSaving(false);
    }
  }, [domainId, manual, manualId, updateDomain, conversation.lastResponse]);

  if (authLoading || !user || manualsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  if (!manual || !domainId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-stone-500 mb-4">
            {!manual ? 'Manual not found.' : 'Invalid domain.'}
          </p>
          <button
            onClick={() => router.push('/bookshelf')}
            className="text-sm text-stone-600 underline hover:text-stone-800"
          >
            Back to bookshelf
          </button>
        </div>
      </div>
    );
  }

  // Done phase
  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-emerald-600">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-stone-900 heading mb-2">
            {DOMAIN_NAMES[domainId]} updated
          </h2>
          <p className="text-stone-500 mb-8">
            Your manual now reflects where your family is today.
          </p>
          <button
            onClick={() => router.push(`/manual/${manualId}`)}
            className="w-full py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 font-medium"
          >
            Back to manual
          </button>
        </div>
      </div>
    );
  }

  // Review phase
  if (phase === 'review' && conversation.lastResponse?.structuredData) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setPhase('conversation')}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-6 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
            Back to conversation
          </button>

          <div className="mb-6">
            <p className="text-xs text-stone-400 uppercase tracking-wider">Refreshing</p>
            <h1 className="text-2xl font-bold text-stone-900 heading">{DOMAIN_NAMES[domainId]}</h1>
          </div>

          <DomainRefreshReview
            domainId={domainId}
            summary={conversation.lastResponse.message}
            structuredData={conversation.lastResponse.structuredData}
            onApprove={handleApprove}
            isLoading={saving}
          />
        </div>
      </div>
    );
  }

  // Conversation phase
  return (
    <div className="h-screen flex flex-col bg-stone-50">
      <div className="border-b border-stone-200 bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/manual/${manualId}`)}
            className="text-stone-400 hover:text-stone-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wider">Refreshing</p>
            <h1 className="text-base font-semibold text-stone-900 heading">{DOMAIN_NAMES[domainId]}</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full">
        <ConversationView
          turns={conversation.turns}
          isLoading={conversation.isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
