'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useManual } from '@/hooks/useManual';
import { DomainSection } from '@/components/manual/LayerSection';
import { DOMAIN_NAMES, DOMAIN_ORDER } from '@/types/manual';
import type { DomainId } from '@/types/user';

export default function ManualDomainPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading: manualsLoading, getManual } = useManual();

  const manualId = params.manualId as string;
  const domainId = params.layerId as DomainId;
  const manual = getManual(manualId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || manualsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-stone-400">Loading...</div>
      </div>
    );
  }

  if (!manual || !DOMAIN_ORDER.includes(domainId)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-stone-500 mb-4">
            {!manual ? 'Manual not found.' : 'Invalid domain.'}
          </p>
          <button
            onClick={() => router.push(manual ? `/manual/${manualId}` : '/bookshelf')}
            className="text-sm text-stone-600 underline hover:text-stone-800"
          >
            {manual ? 'Back to manual' : 'Back to bookshelf'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push(`/manual/${manualId}`)}
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.22 8.53a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          {manual.title}
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900 heading">{DOMAIN_NAMES[domainId]}</h1>
          <p className="text-stone-500 text-sm mt-1">{manual.title}</p>
        </div>

        <DomainSection
          domainId={domainId}
          data={manual.domains[domainId] as any}
          isExpanded={true}
        />
      </div>
    </div>
  );
}
