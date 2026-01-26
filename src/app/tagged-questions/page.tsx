'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { TaggedQuestionsWidget } from '@/components/onboarding/TaggedQuestionsWidget';
import { useTaggedQuestions } from '@/hooks/useTaggedQuestions';

export default function TaggedQuestionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { questionsForMe, questionsITagged, loading, pendingCount } = useTaggedQuestions();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Header */}
      <header className="border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] py-6">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            href="/people"
            className="inline-flex items-center gap-2 font-mono text-sm text-slate-600 hover:text-slate-800 mb-4"
          >
            ← Back to People
          </Link>
          <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-3">
            COLLABORATIVE INPUT
          </div>
          <h1 className="font-mono text-3xl font-bold text-slate-900">
            Tagged Questions
          </h1>
          <p className="font-mono text-sm text-slate-600 mt-2">
            Questions that family members have tagged you to answer
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Questions for me */}
        <section className="mb-12">
          {pendingCount > 0 ? (
            <TaggedQuestionsWidget />
          ) : (
            <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 text-center">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="font-mono font-bold text-lg text-slate-800 mb-2">
                All caught up!
              </h3>
              <p className="font-mono text-sm text-slate-600">
                No questions waiting for your input right now.
              </p>
            </div>
          )}
        </section>

        {/* Questions I tagged */}
        {questionsITagged.length > 0 && (
          <section>
            <h2 className="font-mono font-bold text-lg text-slate-800 mb-4">
              Questions You Tagged ({questionsITagged.length})
            </h2>
            <div className="space-y-3">
              {questionsITagged.map((q) => (
                <div
                  key={q.tagId}
                  className={`bg-white border-2 p-4 ${
                    q.status === 'answered'
                      ? 'border-green-600'
                      : q.status === 'dismissed'
                      ? 'border-slate-300'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm text-slate-600 mb-1">
                        Tagged {q.taggedUserName} • About {q.personName}
                      </p>
                      <p className="font-mono font-bold text-slate-800">
                        {q.questionText}
                      </p>
                      {q.status === 'answered' && q.taggedAnswer && (
                        <div className="mt-2 p-2 bg-green-50 rounded">
                          <p className="font-mono text-xs text-green-600 uppercase tracking-wider">
                            {q.taggedUserName}'s answer:
                          </p>
                          <p className="font-mono text-sm text-slate-700 mt-1">
                            {typeof q.taggedAnswer === 'string'
                              ? q.taggedAnswer
                              : (q.taggedAnswer as any)?.primary?.toString() || ''}
                          </p>
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 font-mono text-xs font-bold ${
                        q.status === 'answered'
                          ? 'bg-green-100 text-green-700'
                          : q.status === 'dismissed'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {q.status === 'answered'
                        ? '✓ Answered'
                        : q.status === 'dismissed'
                        ? 'Dismissed'
                        : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
