'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useInterventionHistory } from '@/hooks/useIntervention';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
  SectionHeader,
} from '@/components/technical';
import { InterventionCard } from '@/components/intervention';

export default function InterventionHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { interventions, loading: historyLoading } = useInterventionHistory(user?.familyId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || historyLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 uppercase tracking-wider">
            Loading history...
          </p>
        </div>
      </div>
    );
  }

  // Group by status
  const activeInterventions = interventions.filter((i) => i.status === 'active');
  const stabilizedInterventions = interventions.filter((i) => i.status === 'stabilized');
  const resolvedInterventions = interventions.filter((i) => i.status === 'resolved');

  // Calculate stats
  const totalResolved = resolvedInterventions.length;
  const avgResolutionTime = 'N/A'; // TODO: Calculate actual average
  const suggestionsApproved = interventions.reduce((sum, i) => sum + i.suggestionsApproved, 0);
  const suggestionsTotal = interventions.reduce((sum, i) => sum + i.suggestionsTotal, 0);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <nav className="border-b-2 border-slate-800 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/intervention"
            className="font-mono text-sm text-slate-600 hover:text-slate-800"
          >
            &larr; INTERVENTION CENTER
          </Link>
          <TechnicalLabel variant="subtle" color="slate" size="sm">
            HISTORY
          </TechnicalLabel>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Stats overview */}
        <TechnicalCard shadowSize="md" className="p-4">
          <div className="grid grid-cols-4 divide-x-2 divide-slate-200">
            <div className="text-center px-4">
              <div className="font-mono text-3xl font-bold text-slate-800">
                {interventions.length}
              </div>
              <div className="font-mono text-xs text-slate-500 uppercase">
                Total
              </div>
            </div>
            <div className="text-center px-4">
              <div className="font-mono text-3xl font-bold text-green-600">
                {totalResolved}
              </div>
              <div className="font-mono text-xs text-slate-500 uppercase">
                Resolved
              </div>
            </div>
            <div className="text-center px-4">
              <div className="font-mono text-3xl font-bold text-amber-600">
                {activeInterventions.length + stabilizedInterventions.length}
              </div>
              <div className="font-mono text-xs text-slate-500 uppercase">
                Open
              </div>
            </div>
            <div className="text-center px-4">
              <div className="font-mono text-3xl font-bold text-slate-800">
                {suggestionsTotal > 0 ? Math.round((suggestionsApproved / suggestionsTotal) * 100) : 0}%
              </div>
              <div className="font-mono text-xs text-slate-500 uppercase">
                Suggestions Used
              </div>
            </div>
          </div>
        </TechnicalCard>

        {/* Active */}
        {activeInterventions.length > 0 && (
          <section>
            <SectionHeader
              title="ACTIVE"
              subtitle={`${activeInterventions.length} intervention${activeInterventions.length !== 1 ? 's' : ''}`}
              className="mb-4"
            />
            <div className="space-y-3">
              {activeInterventions.map((intervention) => (
                <InterventionCard
                  key={intervention.interventionId}
                  intervention={intervention}
                />
              ))}
            </div>
          </section>
        )}

        {/* Stabilized */}
        {stabilizedInterventions.length > 0 && (
          <section>
            <SectionHeader
              title="STABILIZED"
              subtitle={`${stabilizedInterventions.length} intervention${stabilizedInterventions.length !== 1 ? 's' : ''}`}
              className="mb-4"
            />
            <div className="space-y-3">
              {stabilizedInterventions.map((intervention) => (
                <InterventionCard
                  key={intervention.interventionId}
                  intervention={intervention}
                />
              ))}
            </div>
          </section>
        )}

        {/* Resolved */}
        {resolvedInterventions.length > 0 && (
          <section>
            <SectionHeader
              title="RESOLVED"
              subtitle={`${resolvedInterventions.length} intervention${resolvedInterventions.length !== 1 ? 's' : ''}`}
              className="mb-4"
            />
            <div className="space-y-3">
              {resolvedInterventions.map((intervention) => (
                <InterventionCard
                  key={intervention.interventionId}
                  intervention={intervention}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {interventions.length === 0 && (
          <TechnicalCard shadowSize="sm" className="p-8 text-center">
            <p className="font-mono text-sm text-slate-400">
              No intervention history yet.
            </p>
          </TechnicalCard>
        )}
      </main>
    </div>
  );
}
