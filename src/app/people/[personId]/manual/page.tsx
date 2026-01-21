'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { AddTriggerModal } from '@/components/manual/AddTriggerModal';
import { AddStrategyModal } from '@/components/manual/AddStrategyModal';
import { AddBoundaryModal } from '@/components/manual/AddBoundaryModal';
import { SelfWorthAssessmentModal } from '@/components/manual/SelfWorthAssessmentModal';
import MainLayout from '@/components/layout/MainLayout';

type ContentTab = 'overview' | 'triggers' | 'strategies' | 'boundaries' | 'patterns';

export default function ManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const {
    manual,
    loading: manualLoading,
    addTrigger,
    deleteTrigger,
    addStrategy,
    deleteStrategy,
    addBoundary,
    deleteBoundary,
    deletePattern,
    deleteManual
  } = usePersonManual(personId);
  const [activeTab, setActiveTab] = useState<ContentTab>('overview');

  // Modal states
  const [showAddTrigger, setShowAddTrigger] = useState(false);
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [showAddBoundary, setShowAddBoundary] = useState(false);
  const [showSelfWorthAssessment, setShowSelfWorthAssessment] = useState(false);
  const [strategyType, setStrategyType] = useState<'whatWorks' | 'whatDoesntWork'>('whatWorks');

  // Delete confirmation states
  const [deletingTrigger, setDeletingTrigger] = useState<string | null>(null);
  const [deletingStrategy, setDeletingStrategy] = useState<{ id: string; type: 'whatWorks' | 'whatDoesntWork' } | null>(null);
  const [deletingBoundary, setDeletingBoundary] = useState<string | null>(null);
  const [deletingPattern, setDeletingPattern] = useState<string | null>(null);
  const [showDeleteManual, setShowDeleteManual] = useState(false);
  const [isDeletingManual, setIsDeletingManual] = useState(false);
  const [hasBeenDeleted, setHasBeenDeleted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // If no manual exists, redirect to create page (but not if we just deleted it)
  useEffect(() => {
    if (!manualLoading && !manual && person && !isDeletingManual && !hasBeenDeleted) {
      router.push(`/people/${personId}/create-manual`);
    }
  }, [manual, manualLoading, person, personId, router, isDeletingManual, hasBeenDeleted]);

  if (authLoading || personLoading || manualLoading || !user || !person || !manual) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="manual-spinner"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING MANUAL...</p>
        </div>
        <style jsx>{`
          .manual-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #1e293b;
            border-top-color: #d97706;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleDeleteManual = async () => {
    if (!manual) return;

    setIsDeletingManual(true);
    setHasBeenDeleted(true);
    try {
      await deleteManual(manual.manualId);
      // Redirect to people page after successful deletion
      router.push('/people');
    } catch (err) {
      console.error('Failed to delete manual:', err);
      alert('Failed to delete manual. Please try again.');
      setIsDeletingManual(false);
      setHasBeenDeleted(false);
    }
  };

  const tabs: Array<{ id: ContentTab; label: string; icon: string; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'triggers', label: 'Triggers', icon: '⚡', count: manual.triggers?.length || 0 },
    { id: 'strategies', label: 'What Works', icon: '✨', count: manual.whatWorks?.length || 0 },
    { id: 'boundaries', label: 'Boundaries', icon: '🛡️', count: manual.boundaries?.length || 0 },
    { id: 'patterns', label: 'Patterns', icon: '🔍', count: manual.emergingPatterns?.length || 0 },
  ];

  return (
    <MainLayout>
      <div className="relative">
      {/* Technical Header */}
      <header className="relative border-b-4 border-slate-800 bg-white shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex items-start gap-6">
            <Link
              href="/dashboard"
              className="mt-2 font-mono text-2xl font-bold text-slate-800 hover:text-amber-600 transition-colors"
              data-testid="back-to-dashboard"
            >
              ←
            </Link>

            <div>
              <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-3">
                TECHNICAL DOCUMENTATION
              </div>

              <div className="flex items-center gap-4 mb-2">
                <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-900">
                  {person.name}'s Operating Manual
                </h1>
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border-2 border-amber-600 font-mono text-xs font-bold">
                  <span className="text-slate-600">VERSION</span>
                  <span className="text-amber-600">{manual.version}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs text-slate-600">
                <span>MANUAL ID: {personId.slice(0, 12).toUpperCase()}</span>
                <span>•</span>
                <span>LAST UPDATED: {manual.updatedAt.toDate().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Ask Coach Button */}
      <Link
        href={`/people/${personId}/coach`}
        className="fixed bottom-8 right-8 z-50 px-6 py-4 border-4 border-amber-600 bg-amber-50 font-mono text-sm font-bold text-amber-900 hover:bg-amber-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(217,119,6,1)] hover:shadow-[6px_6px_0px_0px_rgba(217,119,6,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
        data-testid="ask-coach-button"
      >
        🤖 ASK COACH
      </Link>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Quick Actions Section */}
        <div className="mb-12">
          <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
            QUICK ACTIONS
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href={`/people/${personId}/workbook`}
              className="px-6 py-4 border-2 border-emerald-600 bg-emerald-50 font-mono text-sm font-bold text-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(5,150,105,1)] flex items-center gap-3"
              data-testid="weekly-workbook-button"
            >
              <span className="text-2xl">📅</span>
              <div>
                <div>WEEKLY WORKBOOK</div>
                <div className="text-xs font-normal opacity-75">View parent goals & activities</div>
              </div>
            </Link>

            <button
              onClick={() => setShowSelfWorthAssessment(true)}
              className="px-6 py-4 border-2 border-purple-600 bg-purple-50 font-mono text-sm font-bold text-purple-900 hover:bg-purple-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(147,51,234,1)] flex items-center gap-3 text-left"
              data-testid="self-worth-assessment-button"
            >
              <span className="text-2xl">{(manual as any).assessmentScores?.selfWorth ? '🔄' : '➕'}</span>
              <div>
                <div>{(manual as any).assessmentScores?.selfWorth ? 'UPDATE' : 'ADD'} SELF-WORTH</div>
                <div className="text-xs font-normal opacity-75">Assess self-worth indicators</div>
              </div>
            </button>

            <Link
              href={`/people/${personId}/manual/onboard`}
              className="px-6 py-4 border-2 border-blue-600 bg-blue-50 font-mono text-sm font-bold text-blue-900 hover:bg-blue-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(37,99,235,1)] flex items-center gap-3"
              data-testid="redo-onboarding-button"
            >
              <span className="text-2xl">📝</span>
              <div>
                <div>RE-DO ONBOARDING</div>
                <div className="text-xs font-normal opacity-75">Retake baseline questionnaire</div>
              </div>
            </Link>

            <button
              onClick={() => setShowDeleteManual(true)}
              className="px-6 py-4 border-2 border-red-600 bg-red-50 font-mono text-sm font-bold text-red-900 hover:bg-red-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(220,38,38,1)] flex items-center gap-3 text-left"
              data-testid="delete-manual-button"
            >
              <span className="text-2xl">🗑️</span>
              <div>
                <div>DELETE MANUAL</div>
                <div className="text-xs font-normal opacity-75">Permanently remove this manual</div>
              </div>
            </button>
          </div>
        </div>

        {/* Technical Specification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Stat 1: Triggers */}
          <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="triggers-stat">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-red-600">
              1
            </div>
            <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
              SPECIFICATION
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold font-mono text-red-600">
                {manual.totalTriggers || 0}
              </div>
              <div className="font-mono text-sm text-slate-600">
                TRIGGERS<br/>DOCUMENTED
              </div>
            </div>
          </div>

          {/* Stat 2: Strategies */}
          <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="strategies-stat">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-green-600">
              2
            </div>
            <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
              SPECIFICATION
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold font-mono text-green-700">
                {manual.totalStrategies || 0}
              </div>
              <div className="font-mono text-sm text-slate-600">
                EFFECTIVE<br/>STRATEGIES
              </div>
            </div>
          </div>

          {/* Stat 3: Boundaries */}
          <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="boundaries-stat">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
              3
            </div>
            <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
              SPECIFICATION
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold font-mono text-amber-600">
                {manual.totalBoundaries || 0}
              </div>
              <div className="font-mono text-sm text-slate-600">
                BOUNDARIES<br/>ESTABLISHED
              </div>
            </div>
          </div>

          {/* Stat 4: Patterns */}
          <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="patterns-stat">
            <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-blue-600">
              4
            </div>
            <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
              SPECIFICATION
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold font-mono text-blue-700">
                {manual.emergingPatterns?.length || 0}
              </div>
              <div className="font-mono text-sm text-slate-600">
                PATTERNS<br/>IDENTIFIED
              </div>
            </div>
          </div>
        </div>

        {/* Technical Section Navigation */}
        <div className="mb-8">
          <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-4">
            SECTION NAVIGATOR
          </div>
          <div className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3 font-mono font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-2 px-2 py-1 text-xs font-bold ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Section Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Narrative Manual - The Story of This Person */}
              <div className="relative bg-white border-4 border-slate-800 p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-8">
                  OPERATING MANUAL: NARRATIVE GUIDE
                </div>

                <div className="prose prose-slate max-w-none">
                  {/* Introduction */}
                  <div className="mb-10">
                    <h2 className="font-mono text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                      <span className="text-amber-600">§1.</span> Understanding {person.name}
                    </h2>

                    {manual.coreInfo?.strengths && manual.coreInfo.strengths.length > 0 && (
                      <p className="font-mono text-base leading-relaxed text-slate-700 mb-4">
                        {person.name} is {manual.coreInfo.strengths.slice(0, 3).join(', ').toLowerCase()}
                        {manual.coreInfo.interests && manual.coreInfo.interests.length > 0 && (
                          <>, with a deep passion for {manual.coreInfo.interests[0].toLowerCase()}</>
                        )}.
                        {manual.coreInfo.strengths.length > 0 && (
                          <> Their core strengths include {manual.coreInfo.strengths.join(', ').toLowerCase()}.</>
                        )}
                      </p>
                    )}

                    {manual.coreInfo?.sensoryNeeds && manual.coreInfo.sensoryNeeds.length > 0 && (
                      <p className="font-mono text-base leading-relaxed text-slate-700 mb-4">
                        <span className="font-bold text-amber-600">Sensory Profile:</span> {person.name} experiences the world in a unique way. {manual.coreInfo.sensoryNeeds.join('. ')}. Understanding these sensory needs is essential for creating an environment where they can thrive.
                      </p>
                    )}

                    {manual.coreInfo?.notes && (
                      <p className="font-mono text-base leading-relaxed text-slate-700 italic border-l-4 border-amber-600 pl-4">
                        {manual.coreInfo.notes}
                      </p>
                    )}
                  </div>

                  {/* Triggers Section */}
                  {manual.triggers && manual.triggers.length > 0 && (
                    <div className="mb-10">
                      <h2 className="font-mono text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="text-red-600">§2.</span> Understanding Their Challenges
                      </h2>

                      <p className="font-mono text-base leading-relaxed text-slate-700 mb-6">
                        Like everyone, {person.name} has situations that are particularly challenging. We've documented {manual.triggers.length} key trigger{manual.triggers.length > 1 ? 's' : ''} that can lead to dysregulation or distress. Understanding these patterns helps you anticipate challenges and respond with compassion rather than frustration.
                      </p>

                      {/* Significant Triggers */}
                      {manual.triggers.filter(t => t.severity === 'significant').length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-mono text-lg font-bold text-red-600 mb-3 uppercase tracking-wide">
                            ⚠ Critical Challenges
                          </h3>
                          {manual.triggers.filter(t => t.severity === 'significant').map((trigger, idx) => (
                            <div key={trigger.id} className="mb-6 p-4 bg-red-50 border-l-4 border-red-600">
                              <h4 className="font-mono font-bold text-base text-slate-900 mb-2">
                                {idx + 1}. {trigger.description}
                              </h4>
                              <p className="font-mono text-sm leading-relaxed text-slate-700 mb-3">
                                <span className="font-bold">Context:</span> {trigger.context}
                              </p>
                              <p className="font-mono text-sm leading-relaxed text-slate-700 mb-3">
                                <span className="font-bold">What You'll See:</span> {trigger.typicalResponse}
                              </p>
                              {trigger.deescalationStrategy && (
                                <p className="font-mono text-sm leading-relaxed text-amber-800 bg-amber-50 p-3 border border-amber-600">
                                  <span className="font-bold">→ What Works:</span> {trigger.deescalationStrategy}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Moderate Triggers */}
                      {manual.triggers.filter(t => t.severity === 'moderate').length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-mono text-lg font-bold text-yellow-700 mb-3 uppercase tracking-wide">
                            Moderate Challenges
                          </h3>
                          {manual.triggers.filter(t => t.severity === 'moderate').slice(0, 3).map((trigger, idx) => (
                            <div key={trigger.id} className="mb-4">
                              <p className="font-mono text-sm leading-relaxed text-slate-700">
                                <span className="font-bold text-yellow-700">•</span> <span className="font-bold">{trigger.description}:</span> {trigger.context} {trigger.deescalationStrategy && `→ ${trigger.deescalationStrategy}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Strategies Section */}
                  {manual.whatWorks && manual.whatWorks.length > 0 && (
                    <div className="mb-10">
                      <h2 className="font-mono text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="text-green-600">§3.</span> What Actually Works
                      </h2>

                      <p className="font-mono text-base leading-relaxed text-slate-700 mb-6">
                        Through careful observation and documentation, we've identified {manual.whatWorks.length} proven strateg{manual.whatWorks.length > 1 ? 'ies' : 'y'} that consistently help {person.name} regulate, connect, and thrive. These are your tools—use them.
                      </p>

                      {/* High-effectiveness strategies (4-5 rating) */}
                      {manual.whatWorks.filter(s => s.effectiveness >= 4).length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-mono text-lg font-bold text-green-700 mb-3 uppercase tracking-wide">
                            ★ Most Effective Strategies
                          </h3>
                          {manual.whatWorks.filter(s => s.effectiveness >= 4).map((strategy, idx) => (
                            <div key={strategy.id} className="mb-5 p-4 bg-green-50 border-l-4 border-green-600">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-mono font-bold text-base text-slate-900">
                                  {idx + 1}. {strategy.description}
                                </h4>
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white font-mono text-xs font-bold">
                                  {'★'.repeat(strategy.effectiveness)}
                                </div>
                              </div>
                              <p className="font-mono text-sm leading-relaxed text-slate-700 mb-2">
                                {strategy.context}
                              </p>
                              {strategy.notes && (
                                <p className="font-mono text-xs leading-relaxed text-slate-600 italic">
                                  Note: {strategy.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Moderate-effectiveness strategies (2-3 rating) */}
                      {manual.whatWorks.filter(s => s.effectiveness >= 2 && s.effectiveness < 4).length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-mono text-lg font-bold text-slate-700 mb-3 uppercase tracking-wide">
                            Other Helpful Strategies
                          </h3>
                          <ul className="space-y-2">
                            {manual.whatWorks.filter(s => s.effectiveness >= 2 && s.effectiveness < 4).slice(0, 5).map((strategy) => (
                              <li key={strategy.id} className="font-mono text-sm leading-relaxed text-slate-700">
                                <span className="text-green-600 font-bold">→</span> <span className="font-bold">{strategy.description}:</span> {strategy.context}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Boundaries Section */}
                  {manual.boundaries && manual.boundaries.length > 0 && (
                    <div className="mb-10">
                      <h2 className="font-mono text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="text-amber-600">§4.</span> Essential Boundaries
                      </h2>

                      <p className="font-mono text-base leading-relaxed text-slate-700 mb-6">
                        Boundaries aren't restrictions—they're the framework that creates safety and predictability. We've established {manual.boundaries.length} key boundar{manual.boundaries.length > 1 ? 'ies' : 'y'} that help {person.name} feel secure and understood.
                      </p>

                      {/* Immovable boundaries */}
                      {manual.boundaries.filter(b => b.category === 'immovable').length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-mono text-lg font-bold text-red-700 mb-3 uppercase tracking-wide">
                            Non-Negotiable Boundaries
                          </h3>
                          {manual.boundaries.filter(b => b.category === 'immovable').map((boundary, idx) => (
                            <div key={boundary.id} className="mb-4 p-4 bg-red-50 border-l-4 border-red-600">
                              <h4 className="font-mono font-bold text-base text-slate-900 mb-2">
                                {idx + 1}. {boundary.description}
                              </h4>
                              {boundary.context && (
                                <p className="font-mono text-sm leading-relaxed text-slate-700 mb-2">
                                  {boundary.context}
                                </p>
                              )}
                              {boundary.consequences && (
                                <p className="font-mono text-sm leading-relaxed text-red-800">
                                  <span className="font-bold">If violated:</span> {boundary.consequences}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Negotiable boundaries */}
                      {manual.boundaries.filter(b => b.category === 'negotiable').length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-mono text-lg font-bold text-slate-700 mb-3 uppercase tracking-wide">
                            Flexible Boundaries
                          </h3>
                          <ul className="space-y-2">
                            {manual.boundaries.filter(b => b.category === 'negotiable').slice(0, 5).map((boundary) => (
                              <li key={boundary.id} className="font-mono text-sm leading-relaxed text-slate-700">
                                <span className="text-yellow-600 font-bold">•</span> {boundary.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Patterns Section */}
                  {manual.emergingPatterns && manual.emergingPatterns.length > 0 && (
                    <div className="mb-10">
                      <h2 className="font-mono text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="text-blue-600">§5.</span> Observed Patterns
                      </h2>

                      <p className="font-mono text-base leading-relaxed text-slate-700 mb-6">
                        Over time, we've identified {manual.emergingPatterns.length} recurring pattern{manual.emergingPatterns.length > 1 ? 's' : ''} in {person.name}'s behavior and responses. These patterns help predict needs and prevent escalation.
                      </p>

                      <div className="space-y-4">
                        {manual.emergingPatterns.slice(0, 5).map((pattern, idx) => (
                          <div key={pattern.id} className="p-4 bg-blue-50 border-l-4 border-blue-600">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-mono font-bold text-base text-slate-900">
                                {idx + 1}. {pattern.description}
                              </h4>
                              <span className={`px-2 py-1 font-mono text-xs font-bold ${
                                pattern.confidence === 'validated' ? 'bg-green-600 text-white' :
                                pattern.confidence === 'consistent' ? 'bg-blue-600 text-white' :
                                'bg-slate-600 text-white'
                              }`}>
                                {pattern.confidence.toUpperCase()}
                              </span>
                            </div>
                            <p className="font-mono text-sm leading-relaxed text-slate-700">
                              <span className="font-bold">Frequency:</span> {pattern.frequency}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Self-Worth Section */}
                  {manual.coreInfo?.selfWorthInsights && manual.coreInfo.selfWorthInsights.length > 0 && (
                    <div className="mb-10">
                      <h2 className="font-mono text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                        <span className="text-purple-600">§6.</span> Self-Worth & Inner World
                      </h2>

                      {(manual as any).assessmentScores?.selfWorth && (
                        <div className="mb-4 p-4 border-2 border-purple-600 bg-purple-50">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm font-bold text-slate-700">Current Assessment:</span>
                            <span className={`px-3 py-1 font-mono text-sm font-bold ${
                              (manual as any).assessmentScores.selfWorth.category === 'high' ? 'bg-green-600 text-white' :
                              (manual as any).assessmentScores.selfWorth.category === 'moderate' ? 'bg-yellow-500 text-slate-900' :
                              'bg-red-600 text-white'
                            }`}>
                              {(manual as any).assessmentScores.selfWorth.category.toUpperCase()} ({(manual as any).assessmentScores.selfWorth.totalScore}/24)
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {manual.coreInfo.selfWorthInsights.map((insight, idx) => (
                          <p key={idx} className="font-mono text-sm leading-relaxed text-slate-700 pl-4 border-l-2 border-purple-400">
                            {insight}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Closing */}
                  <div className="mt-12 pt-8 border-t-2 border-slate-300">
                    <p className="font-mono text-sm leading-relaxed text-slate-600 italic">
                      This manual is a living document (v{manual.version}), last updated {manual.lastEditedAt.toDate().toLocaleDateString()}.
                      As you learn more about {person.name}, continue adding triggers, strategies, and insights using the tabs above.
                      The more complete this manual becomes, the more effective you'll be at supporting {person.name}'s growth and wellbeing.
                    </p>
                  </div>

                  {/* Empty state */}
                  {!manual.triggers?.length && !manual.whatWorks?.length && !manual.boundaries?.length && (
                    <div className="text-center py-16">
                      <div className="inline-block px-6 py-3 bg-amber-50 border-4 border-amber-600 font-mono text-sm text-amber-800 mb-6">
                        ⚠ MANUAL INCOMPLETE
                      </div>
                      <p className="font-mono text-base text-slate-700 mb-4">
                        This manual doesn't yet contain enough information to provide a narrative guide.
                      </p>
                      <p className="font-mono text-sm text-slate-600">
                        Use the tabs above to add triggers, strategies, and boundaries, then return here to see {person.name}'s complete story.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'triggers' && (
            <div className="space-y-6">
              {/* Add Trigger Button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setShowAddTrigger(true)}
                  className="px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-red-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="add-trigger-button"
                >
                  + ADD TRIGGER
                </button>
              </div>

              {manual.triggers && manual.triggers.length > 0 ? (
                manual.triggers.map((trigger, index) => (
                  <div key={trigger.id} className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="trigger-card">
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-red-600">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`px-3 py-1 font-mono text-xs font-bold ${
                          trigger.severity === 'significant' ? 'bg-red-600 text-white' :
                          trigger.severity === 'moderate' ? 'bg-yellow-500 text-slate-900' :
                          'bg-green-600 text-white'
                        }`}
                      >
                        {trigger.severity.toUpperCase()}
                      </div>
                    </div>

                    <h4 className="font-mono font-bold text-lg mb-4 text-slate-900">
                      {trigger.description}
                    </h4>

                    <div className="space-y-3 mb-4">
                      <div>
                        <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Context:</span>
                        <p className="font-mono text-sm text-slate-700 mt-1">{trigger.context}</p>
                      </div>

                      <div>
                        <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Typical Response:</span>
                        <p className="font-mono text-sm text-slate-700 mt-1">{trigger.typicalResponse}</p>
                      </div>

                      {trigger.deescalationStrategy && (
                        <div>
                          <span className="font-mono text-xs text-amber-600 uppercase tracking-wider font-bold">Recommended Action:</span>
                          <p className="font-mono text-sm text-slate-700 mt-1">{trigger.deescalationStrategy}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-mono text-xs text-slate-500">
                        DOCUMENTED: {trigger.identifiedDate.toDate().toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeletingTrigger(trigger.id)}
                          className="px-3 py-1 border-2 border-red-300 bg-white font-mono text-xs text-red-600 hover:border-red-600 transition-all"
                          data-testid="delete-trigger-button"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative bg-amber-50 border-4 border-amber-600 p-16 text-center shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-6">
                    NO DATA FOUND
                  </div>
                  <p className="font-mono text-sm text-slate-700">
                    No triggers have been documented in this manual yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'strategies' && (
            <div className="space-y-6">
              {/* Add Strategy Button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setShowAddStrategy(true)}
                  className="px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-green-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="add-strategy-button"
                >
                  + ADD STRATEGY
                </button>
              </div>

              {manual.whatWorks && manual.whatWorks.length > 0 ? (
                manual.whatWorks.map((strategy, index) => (
                  <div key={strategy.id} className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="strategy-card">
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-green-600">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border-2 border-green-600 font-mono text-xs font-bold">
                        <span className="text-slate-600">EFFECTIVENESS:</span>
                        <span className="text-green-700">{strategy.effectiveness}/5</span>
                      </div>
                    </div>

                    <h4 className="font-mono font-bold text-lg mb-4 text-slate-900">
                      {strategy.description}
                    </h4>

                    <div className="space-y-3 mb-4">
                      <div>
                        <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Application Context:</span>
                        <p className="font-mono text-sm text-slate-700 mt-1">{strategy.context}</p>
                      </div>

                      {strategy.notes && (
                        <div>
                          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Technical Notes:</span>
                          <p className="font-mono text-sm text-slate-700 mt-1">{strategy.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-4 font-mono text-xs text-slate-500">
                        <span>SOURCE: {strategy.sourceType.replace('_', ' ').toUpperCase()}</span>
                        <span>•</span>
                        <span>ADDED: {strategy.addedDate.toDate().toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeletingStrategy({ id: strategy.id, type: 'whatWorks' })}
                          className="px-3 py-1 border-2 border-red-300 bg-white font-mono text-xs text-red-600 hover:border-red-600 transition-all"
                          data-testid="delete-strategy-button"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative bg-amber-50 border-4 border-amber-600 p-16 text-center shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-6">
                    NO DATA FOUND
                  </div>
                  <p className="font-mono text-sm text-slate-700">
                    No strategies have been documented in this manual yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'boundaries' && (
            <div className="space-y-6">
              {/* Add Boundary Button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setShowAddBoundary(true)}
                  className="px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="add-boundary-button"
                >
                  + ADD BOUNDARY
                </button>
              </div>

              {manual.boundaries && manual.boundaries.length > 0 ? (
                manual.boundaries.map((boundary, index) => (
                  <div key={boundary.id} className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="boundary-card">
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`px-3 py-1 font-mono text-xs font-bold ${
                          boundary.category === 'immovable' ? 'bg-red-600 text-white' :
                          boundary.category === 'negotiable' ? 'bg-yellow-500 text-slate-900' :
                          'bg-blue-600 text-white'
                        }`}
                      >
                        {boundary.category.toUpperCase()}
                      </div>
                    </div>

                    <h4 className="font-mono font-bold text-lg mb-4 text-slate-900">
                      {boundary.description}
                    </h4>

                    <div className="space-y-3 mb-4">
                      {boundary.context && (
                        <div>
                          <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Context:</span>
                          <p className="font-mono text-sm text-slate-700 mt-1">{boundary.context}</p>
                        </div>
                      )}

                      {boundary.consequences && (
                        <div>
                          <span className="font-mono text-xs text-red-600 uppercase tracking-wider font-bold">If Violated:</span>
                          <p className="font-mono text-sm text-slate-700 mt-1">{boundary.consequences}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-mono text-xs text-slate-500">
                        ESTABLISHED: {boundary.addedDate.toDate().toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeletingBoundary(boundary.id)}
                          className="px-3 py-1 border-2 border-red-300 bg-white font-mono text-xs text-red-600 hover:border-red-600 transition-all"
                          data-testid="delete-boundary-button"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative bg-amber-50 border-4 border-amber-600 p-16 text-center shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-6">
                    NO DATA FOUND
                  </div>
                  <p className="font-mono text-sm text-slate-700">
                    No boundaries have been documented in this manual yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="space-y-6">
              {/* Add Pattern Button - Patterns are AI-generated, so just show info */}
              <div className="flex justify-end mb-6">
                <div className="px-6 py-3 bg-blue-50 border-2 border-blue-600 font-mono text-xs text-blue-700">
                  ℹ️ PATTERNS ARE AUTO-IDENTIFIED BY AI
                </div>
              </div>

              {manual.emergingPatterns && manual.emergingPatterns.length > 0 ? (
                manual.emergingPatterns.map((pattern, index) => (
                  <div key={pattern.id} className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" data-testid="pattern-card">
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-blue-600">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`px-3 py-1 font-mono text-xs font-bold ${
                          pattern.confidence === 'validated' ? 'bg-green-600 text-white' :
                          pattern.confidence === 'consistent' ? 'bg-blue-600 text-white' :
                          'bg-slate-600 text-white'
                        }`}
                      >
                        {pattern.confidence.toUpperCase()}
                      </div>
                    </div>

                    <h4 className="font-mono font-bold text-lg mb-4 text-slate-900">
                      {pattern.description}
                    </h4>

                    <div className="space-y-3 mb-4">
                      <div>
                        <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">Frequency:</span>
                        <p className="font-mono text-sm text-slate-700 mt-1">{pattern.frequency}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <div className="flex flex-wrap gap-2 font-mono text-xs text-slate-500">
                        <span>FIRST: {pattern.firstObserved.toDate().toLocaleDateString()}</span>
                        <span>•</span>
                        <span>LAST: {pattern.lastObserved.toDate().toLocaleDateString()}</span>
                        <span>•</span>
                        <span>BY: {pattern.identifiedBy}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeletingPattern(pattern.id)}
                          className="px-3 py-1 border-2 border-red-300 bg-white font-mono text-xs text-red-600 hover:border-red-600 transition-all"
                          data-testid="delete-pattern-button"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative bg-amber-50 border-4 border-amber-600 p-16 text-center shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-6">
                    NO DATA FOUND
                  </div>
                  <p className="font-mono text-sm text-slate-700">
                    No patterns have been identified in this manual yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AddTriggerModal
        isOpen={showAddTrigger}
        onClose={() => setShowAddTrigger(false)}
        onSave={async (triggerData) => {
          if (!manual?.manualId) return;
          await addTrigger(manual.manualId, triggerData);
          setShowAddTrigger(false);
        }}
        personName={person.name}
      />

      <AddStrategyModal
        isOpen={showAddStrategy}
        onClose={() => setShowAddStrategy(false)}
        onSave={async (strategyData) => {
          if (!manual?.manualId) return;
          await addStrategy(manual.manualId, {
            ...strategyData,
            effectiveness: strategyData.effectiveness as 1 | 2 | 3 | 4 | 5,
            sourceType: 'discovered'
          }, 'whatWorks');
          setShowAddStrategy(false);
        }}
        personName={person.name}
        type="works"
      />

      <AddBoundaryModal
        isOpen={showAddBoundary}
        onClose={() => setShowAddBoundary(false)}
        onSave={async (boundaryData) => {
          if (!manual?.manualId) return;
          await addBoundary(manual.manualId, boundaryData);
          setShowAddBoundary(false);
        }}
        personName={person.name}
      />

      {manual.manualId && manual.relationshipType && (
        <SelfWorthAssessmentModal
          isOpen={showSelfWorthAssessment}
          onClose={() => setShowSelfWorthAssessment(false)}
          personId={personId}
          personName={person.name}
          manualId={manual.manualId}
          relationshipType={manual.relationshipType}
        />
      )}

      {/* Delete Confirmation Modals */}
      {deletingTrigger && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setDeletingTrigger(null)}
        >
          <div
            className="relative bg-white border-4 border-red-600 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block px-3 py-1 bg-red-600 text-white font-mono text-xs mb-6">
              ⚠ CONFIRM DELETE
            </div>
            <h3 className="font-mono text-2xl font-bold mb-4 text-red-600">
              Delete Trigger?
            </h3>
            <p className="font-mono text-sm text-slate-700 mb-6">
              This will permanently remove this trigger from the manual.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTrigger(null)}
                className="flex-1 px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!manual?.manualId) return;
                  await deleteTrigger(manual.manualId, deletingTrigger);
                  setDeletingTrigger(null);
                }}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700 transition-all"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingStrategy && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setDeletingStrategy(null)}
        >
          <div
            className="relative bg-white border-4 border-red-600 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block px-3 py-1 bg-red-600 text-white font-mono text-xs mb-6">
              ⚠ CONFIRM DELETE
            </div>
            <h3 className="font-mono text-2xl font-bold mb-4 text-red-600">
              Delete Strategy?
            </h3>
            <p className="font-mono text-sm text-slate-700 mb-6">
              This will permanently remove this strategy from the manual.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingStrategy(null)}
                className="flex-1 px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!manual?.manualId) return;
                  await deleteStrategy(manual.manualId, deletingStrategy.id, deletingStrategy.type);
                  setDeletingStrategy(null);
                }}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700 transition-all"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingBoundary && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setDeletingBoundary(null)}
        >
          <div
            className="relative bg-white border-4 border-red-600 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block px-3 py-1 bg-red-600 text-white font-mono text-xs mb-6">
              ⚠ CONFIRM DELETE
            </div>
            <h3 className="font-mono text-2xl font-bold mb-4 text-red-600">
              Delete Boundary?
            </h3>
            <p className="font-mono text-sm text-slate-700 mb-6">
              This will permanently remove this boundary from the manual.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingBoundary(null)}
                className="flex-1 px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  if (!manual?.manualId) return;
                  await deleteBoundary(manual.manualId, deletingBoundary);
                  setDeletingBoundary(null);
                }}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700 transition-all"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Manual Confirmation Modal */}
      {showDeleteManual && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => !isDeletingManual && setShowDeleteManual(false)}
        >
          <div
            className="relative bg-white border-4 border-red-600 p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(220,38,38,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-slate-800"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-slate-800"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-slate-800"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-slate-800"></div>

            <div className="inline-block px-3 py-1 bg-red-600 text-white font-mono text-xs mb-6">
              ⚠ CRITICAL WARNING
            </div>
            <h3 className="font-mono text-2xl font-bold mb-2 text-red-600">
              Delete Entire Manual?
            </h3>
            <p className="font-mono text-sm text-slate-900 mb-4">
              You are about to permanently delete <strong>{person.name}&apos;s Operating Manual</strong>.
            </p>
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-600">
              <p className="font-mono text-xs text-red-700 mb-2">
                ⚠ THIS WILL DELETE:
              </p>
              <ul className="font-mono text-xs text-red-700 space-y-1 list-disc list-inside">
                <li>{manual.triggers?.length || 0} Triggers</li>
                <li>{manual.whatWorks?.length || 0} Strategies</li>
                <li>{manual.boundaries?.length || 0} Boundaries</li>
                <li>{manual.emergingPatterns?.length || 0} Patterns</li>
                <li>All progress notes and assessments</li>
              </ul>
            </div>
            <p className="font-mono text-xs text-slate-600 mb-6">
              This action CANNOT be undone. The person record will remain, but all manual content will be permanently destroyed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => !isDeletingManual && setShowDeleteManual(false)}
                className="flex-1 px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-700 hover:border-slate-800 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                disabled={isDeletingManual}
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteManual}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-mono text-xs font-bold hover:bg-red-700 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                disabled={isDeletingManual}
              >
                {isDeletingManual ? 'DELETING...' : 'DELETE MANUAL'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}
