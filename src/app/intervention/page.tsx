'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useIntervention, useActiveInterventions } from '@/hooks/useIntervention';
import { useHouseholdManual } from '@/hooks/useHouseholdManual';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
  SectionHeader,
} from '@/components/technical';
import { InterventionWizard, InterventionCard } from '@/components/intervention';
import { InterventionSeverity } from '@/types/intervention';

export default function InterventionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createIntervention } = useIntervention(undefined);
  const { interventions, loading: interventionsLoading } = useActiveInterventions(user?.familyId);
  const { manual } = useHouseholdManual(user?.familyId);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || interventionsLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 uppercase tracking-wider">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const activeInterventions = interventions.filter((i) => i.status === 'active');
  const stabilizedInterventions = interventions.filter((i) => i.status === 'stabilized');

  const handleCreateIntervention = async (data: {
    title: string;
    description: string;
    whatHappened: string;
    severity: InterventionSeverity;
    personId?: string;
    personName?: string;
    environmentalFactors: string[];
  }) => {
    const interventionId = await createIntervention(data);
    router.push(`/intervention/${interventionId}`);
  };

  // Get family members from manual or create empty list
  const familyMembers = manual?.members.map((m) => ({
    personId: m.personId,
    name: m.name,
  })) || [];

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="border-b-2 border-red-600 bg-red-600">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 flex items-center justify-center">
              <span className="text-xl font-bold text-white">!</span>
            </div>
            <div>
              <h1 className="font-mono font-bold text-xl text-white uppercase tracking-wider">
                INTERVENTION CENTER
              </h1>
              <p className="font-mono text-xs text-white/80">
                Emergency crisis management
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="font-mono text-sm text-white/80 hover:text-white"
          >
            &larr; DASHBOARD
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Show wizard or main content */}
        {showWizard ? (
          <InterventionWizard
            familyMembers={familyMembers}
            onSubmit={handleCreateIntervention}
            onCancel={() => setShowWizard(false)}
          />
        ) : (
          <div className="space-y-8">
            {/* Quick action: Start new intervention */}
            <TechnicalCard
              badge="!"
              badgeColor="red"
              cornerBrackets
              shadowSize="lg"
              className="p-6 border-red-200 bg-red-50"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="font-mono font-bold text-xl text-slate-800 mb-2">
                    REPORT AN INCIDENT
                  </h2>
                  <p className="text-slate-600 mb-4">
                    Something unexpected happened? Log it here to get support, track what works,
                    and update your manual with new insights.
                  </p>
                  <TechnicalButton
                    variant="danger"
                    onClick={() => setShowWizard(true)}
                  >
                    START INTERVENTION
                  </TechnicalButton>
                </div>
              </div>
            </TechnicalCard>

            {/* Active interventions */}
            {activeInterventions.length > 0 && (
              <section>
                <SectionHeader
                  title="ACTIVE INTERVENTIONS"
                  subtitle="Incidents requiring attention"
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

            {/* Stabilized interventions */}
            {stabilizedInterventions.length > 0 && (
              <section>
                <SectionHeader
                  title="STABILIZED"
                  subtitle="Incidents that have been addressed but not yet resolved"
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

            {/* No active interventions */}
            {activeInterventions.length === 0 && stabilizedInterventions.length === 0 && (
              <TechnicalCard shadowSize="sm" className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl text-green-600">\u2713</span>
                </div>
                <h3 className="font-mono font-bold text-lg text-slate-800 mb-2">
                  ALL CLEAR
                </h3>
                <p className="text-slate-600">
                  No active interventions. That&apos;s a good sign!
                </p>
              </TechnicalCard>
            )}

            {/* Quick links */}
            <div className="flex flex-wrap gap-4 pt-8 border-t border-slate-200">
              <TechnicalButton
                variant="secondary"
                onClick={() => router.push('/intervention/history')}
              >
                VIEW HISTORY
              </TechnicalButton>
              <TechnicalButton
                variant="outline"
                onClick={() => router.push('/household')}
              >
                HOUSEHOLD MANUAL
              </TechnicalButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
