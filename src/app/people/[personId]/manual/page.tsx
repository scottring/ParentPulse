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

            <div className="flex-1">
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
                <Link
                  href={`/people/${personId}/workbook`}
                  className="px-4 py-2 border-2 border-emerald-600 bg-emerald-50 font-mono text-xs font-bold text-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(5,150,105,1)]"
                  data-testid="weekly-workbook-button"
                >
                  📅 WEEKLY WORKBOOK
                </Link>
                <Link
                  href={`/people/${personId}/coach`}
                  className="px-4 py-2 border-2 border-amber-600 bg-amber-50 font-mono text-xs font-bold text-amber-900 hover:bg-amber-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(217,119,6,1)]"
                  data-testid="ask-coach-button"
                >
                  🤖 ASK COACH
                </Link>
                <button
                  onClick={() => setShowSelfWorthAssessment(true)}
                  className="px-4 py-2 border-2 border-purple-600 bg-purple-50 font-mono text-xs font-bold text-purple-900 hover:bg-purple-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(147,51,234,1)]"
                  data-testid="self-worth-assessment-button"
                >
                  {(manual as any).assessmentScores?.selfWorth ? '🔄 UPDATE' : '➕ ADD'} SELF-WORTH
                </button>
                <Link
                  href={`/people/${personId}/manual/onboard`}
                  className="px-4 py-2 border-2 border-slate-800 bg-white font-mono text-xs font-bold text-slate-800 hover:bg-slate-800 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="edit-manual-button"
                >
                  EDIT MANUAL
                </Link>
                <button
                  onClick={() => setShowDeleteManual(true)}
                  className="px-4 py-2 border-2 border-red-600 bg-red-50 font-mono text-xs font-bold text-red-900 hover:bg-red-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(220,38,38,1)]"
                  data-testid="delete-manual-button"
                >
                  🗑️ DELETE MANUAL
                </button>
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

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12">
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
              {/* Core Information Section */}
              <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-6">
                  SECTION 1: CORE INFORMATION
                </div>

                {manual.coreInfo?.sensoryNeeds && manual.coreInfo.sensoryNeeds.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-mono font-bold text-sm text-amber-600 mb-3 uppercase tracking-wider">
                      Sensory Requirements
                    </h4>
                    <ul className="space-y-2">
                      {manual.coreInfo.sensoryNeeds.map((need, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="font-mono text-slate-400 flex-shrink-0">[{String(idx + 1).padStart(2, '0')}]</span>
                          <span className="font-mono text-sm text-slate-700">{need}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {manual.coreInfo?.interests && manual.coreInfo.interests.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-mono font-bold text-sm text-amber-600 mb-3 uppercase tracking-wider">
                      Primary Interests
                    </h4>
                    <ul className="space-y-2">
                      {manual.coreInfo.interests.map((interest, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="font-mono text-slate-400 flex-shrink-0">[{String(idx + 1).padStart(2, '0')}]</span>
                          <span className="font-mono text-sm text-slate-700">{interest}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {manual.coreInfo?.strengths && manual.coreInfo.strengths.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-mono font-bold text-sm text-amber-600 mb-3 uppercase tracking-wider">
                      Core Strengths
                    </h4>
                    <ul className="space-y-2">
                      {manual.coreInfo.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="font-mono text-slate-400 flex-shrink-0">[{String(idx + 1).padStart(2, '0')}]</span>
                          <span className="font-mono text-sm text-slate-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {manual.coreInfo?.selfWorthInsights && manual.coreInfo.selfWorthInsights.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-mono font-bold text-sm text-purple-600 uppercase tracking-wider">
                        Self-Worth Insights
                      </h4>
                      {(manual as any).assessmentScores?.selfWorth && (
                        <span className={`px-2 py-1 font-mono text-xs font-bold ${
                          (manual as any).assessmentScores.selfWorth.category === 'high' ? 'bg-green-100 text-green-700 border border-green-600' :
                          (manual as any).assessmentScores.selfWorth.category === 'moderate' ? 'bg-yellow-100 text-yellow-700 border border-yellow-600' :
                          'bg-red-100 text-red-700 border border-red-600'
                        }`}>
                          {(manual as any).assessmentScores.selfWorth.category.toUpperCase()} ({(manual as any).assessmentScores.selfWorth.totalScore}/24)
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {manual.coreInfo.selfWorthInsights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="font-mono text-purple-400 flex-shrink-0">[{String(idx + 1).padStart(2, '0')}]</span>
                          <span className="font-mono text-sm text-slate-700">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {manual.coreInfo?.notes && (
                  <div>
                    <h4 className="font-mono font-bold text-sm text-amber-600 mb-3 uppercase tracking-wider">
                      Additional Notes
                    </h4>
                    <p className="font-mono text-sm text-slate-700 leading-relaxed">{manual.coreInfo.notes}</p>
                  </div>
                )}

                {(!manual.coreInfo || Object.values(manual.coreInfo).every(v => !v || (Array.isArray(v) && v.length === 0))) && (
                  <div className="text-center py-12">
                    <div className="inline-block px-4 py-2 bg-amber-50 border-2 border-amber-600 font-mono text-xs text-amber-700 mb-4">
                      NO DATA AVAILABLE
                    </div>
                    <p className="font-mono text-sm text-slate-600">
                      No core information has been documented yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Summary Section */}
              <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-6">
                  SECTION 2: DOCUMENT SUMMARY
                </div>

                <div className="grid sm:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-mono font-bold text-sm text-amber-600 mb-4 uppercase tracking-wider">
                      Content Overview
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">TRIGGERS:</span>
                        <span className="text-slate-900 font-bold">{manual.totalTriggers || 0}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">STRATEGIES:</span>
                        <span className="text-slate-900 font-bold">{manual.totalStrategies || 0}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">BOUNDARIES:</span>
                        <span className="text-slate-900 font-bold">{manual.totalBoundaries || 0}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">PATTERNS:</span>
                        <span className="text-slate-900 font-bold">{manual.emergingPatterns?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-mono font-bold text-sm text-amber-600 mb-4 uppercase tracking-wider">
                      Document Metadata
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">VERSION:</span>
                        <span className="text-slate-900 font-bold">{manual.version}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">CREATED:</span>
                        <span className="text-slate-900">{manual.createdAt.toDate().toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">LAST EDIT:</span>
                        <span className="text-slate-900">{manual.lastEditedAt.toDate().toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between font-mono text-sm">
                        <span className="text-slate-500">STATUS:</span>
                        <span className="text-green-700 font-bold">OPERATIONAL</span>
                      </div>
                    </div>
                  </div>
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
