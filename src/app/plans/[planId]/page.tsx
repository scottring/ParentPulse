'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStrategicPlans } from '@/hooks/useStrategicPlans';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS, StrategicPlan, User } from '@/types';
import Link from 'next/link';

export default function PlanViewPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const { user, loading: authLoading } = useAuth();
  const { pausePlan, resumePlan, completePlan, loading: actionLoading } = useStrategicPlans();

  const [plan, setPlan] = useState<StrategicPlan | null>(null);
  const [child, setChild] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!planId || !user?.familyId) return;

    const fetchPlan = async () => {
      setLoading(true);
      try {
        const planDoc = await getDoc(doc(firestore, COLLECTIONS.STRATEGIC_PLANS, planId));
        if (planDoc.exists()) {
          const planData = {planId: planDoc.id, ...planDoc.data()} as StrategicPlan;
          setPlan(planData);

          // Fetch child details
          const childDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, planData.childId));
          if (childDoc.exists()) {
            setChild({userId: childDoc.id, ...childDoc.data()} as User);
          }
        }
      } catch (error) {
        console.error('Error fetching plan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, user?.familyId]);

  const handlePause = async () => {
    if (!plan || !confirm('Are you sure you want to pause this plan? Daily actions will stop being generated.')) return;
    try {
      await pausePlan(plan.planId);
      window.location.reload(); // Refresh to show updated status
    } catch (error) {
      console.error('Error pausing plan:', error);
      alert('Failed to pause plan. Please try again.');
    }
  };

  const handleResume = async () => {
    if (!plan) return;
    try {
      await resumePlan(plan.planId);
      window.location.reload(); // Refresh to show updated status
    } catch (error) {
      console.error('Error resuming plan:', error);
      alert('Failed to resume plan. Please try again.');
    }
  };

  const handleComplete = async () => {
    if (!plan || !confirm('Mark this plan as complete? This will end daily action generation.')) return;
    try {
      await completePlan(plan.planId);
      router.push('/plans');
    } catch (error) {
      console.error('Error completing plan:', error);
      alert('Failed to complete plan. Please try again.');
    }
  };

  const calculateProgress = () => {
    if (!plan || !plan.startDate) return 0;
    const start = plan.startDate.toDate();
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.round((daysPassed / plan.duration) * 100), 100);
  };

  const getCurrentWeek = () => {
    if (!plan || !plan.startDate) return 1;
    const start = plan.startDate.toDate();
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.ceil(daysPassed / 7), Math.ceil(plan.duration / 7));
  };

  const getCurrentPhase = () => {
    const currentWeek = getCurrentWeek();
    return plan?.phases.find(p => currentWeek >= p.weekStart && currentWeek <= p.weekEnd);
  };

  const getUpcomingMilestones = () => {
    const currentWeek = getCurrentWeek();
    return plan?.milestones.filter(m => m.targetWeek >= currentWeek && !m.achieved).slice(0, 3) || [];
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  if (!plan || !child) {
    return (
      <div className="min-h-screen parent-page">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4" style={{color: 'var(--parent-text)'}}>Plan not found</h1>
          <Link href="/plans" className="text-blue-600 hover:underline">Return to plans</Link>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();
  const currentWeek = getCurrentWeek();
  const currentPhase = getCurrentPhase();
  const upcomingMilestones = getUpcomingMilestones();

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)'}}>
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🎯</div>
            <div className="flex-1">
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{color: 'var(--parent-accent)'}}>
                {plan.title}
              </h1>
              <p className="text-sm mt-1" style={{color: 'var(--parent-text-light)'}}>
                {child.name} • Week {currentWeek} of {Math.ceil(plan.duration / 7)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/plans"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
                style={{border: '1px solid var(--parent-border)', color: 'var(--parent-text)'}}
              >
                ← All Plans
              </Link>
              {plan.status === 'active' && (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  style={{border: '1px solid var(--parent-border)', color: 'var(--parent-text)'}}
                >
                  Pause
                </button>
              )}
              {plan.status === 'paused' && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  style={{backgroundColor: 'var(--parent-accent)', color: 'white'}}
                >
                  Resume
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2" style={{color: 'var(--parent-text-light)'}}>
              <span>Progress</span>
              <span>{progress}% Complete</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{backgroundColor: 'var(--parent-bg)'}}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{width: `${progress}%`, backgroundColor: 'var(--parent-accent)'}}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Current Phase */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Phase */}
            {currentPhase && (
              <div className="parent-card p-8 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: 'var(--parent-accent)'}}>
                    {plan.phases.indexOf(currentPhase) + 1}
                  </div>
                  <div>
                    <h2 className="parent-heading text-xl" style={{color: 'var(--parent-text)'}}>
                      Current Phase: {currentPhase.title}
                    </h2>
                    <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>
                      Weeks {currentPhase.weekStart}-{currentPhase.weekEnd} • {currentPhase.focus}
                    </p>
                  </div>
                </div>
                <p className="mb-6" style={{color: 'var(--parent-text)'}}>
                  {currentPhase.description}
                </p>

                {/* Current Activities */}
                <div>
                  <h3 className="font-semibold mb-4" style={{color: 'var(--parent-text)'}}>
                    This Week's Activities:
                  </h3>
                  <div className="space-y-3">
                    {currentPhase.activities.map((activity) => (
                      <div key={activity.activityId} className="p-4 rounded-lg border" style={{borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)'}}>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h4 className="font-medium" style={{color: 'var(--parent-text)'}}>{activity.title}</h4>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: 'white', border: '1px solid var(--parent-border)'}}>
                              {activity.frequency.replace('_', ' ')}
                            </span>
                            <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: 'white', border: '1px solid var(--parent-border)'}}>
                              ~{activity.estimatedMinutes} min
                            </span>
                          </div>
                        </div>
                        <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>{activity.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* All Phases Overview */}
            <div className="parent-card p-8">
              <h2 className="parent-heading text-xl mb-6" style={{color: 'var(--parent-text)'}}>
                All Phases
              </h2>
              <div className="space-y-4">
                {plan.phases.map((phase, index) => {
                  const isCurrentPhase = phase === currentPhase;
                  const isPastPhase = currentWeek > phase.weekEnd;

                  return (
                    <div
                      key={phase.phaseId}
                      className="p-4 rounded-lg border transition-all"
                      style={{
                        borderColor: isCurrentPhase ? 'var(--parent-accent)' : 'var(--parent-border)',
                        backgroundColor: isCurrentPhase ? 'var(--parent-bg)' : isPastPhase ? 'white' : 'white',
                        opacity: isPastPhase ? 0.6 : 1
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{
                          backgroundColor: isCurrentPhase ? 'var(--parent-accent)' : isPastPhase ? '#10b981' : 'var(--parent-border)',
                          color: isCurrentPhase || isPastPhase ? 'white' : 'var(--parent-text)'
                        }}>
                          {isPastPhase ? '✓' : index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm" style={{color: 'var(--parent-text)'}}>
                            {phase.title}
                            {isCurrentPhase && <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{backgroundColor: 'var(--parent-accent)', color: 'white'}}>Current</span>}
                          </h3>
                          <p className="text-xs" style={{color: 'var(--parent-text-light)'}}>
                            Weeks {phase.weekStart}-{phase.weekEnd}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Milestones */}
            <div className="parent-card p-6">
              <h3 className="font-semibold mb-4" style={{color: 'var(--parent-text)'}}>
                Upcoming Milestones
              </h3>
              {upcomingMilestones.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMilestones.map((milestone) => (
                    <div key={milestone.milestoneId} className="p-3 rounded-lg" style={{backgroundColor: 'var(--parent-bg)'}}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">🎖️</span>
                        <div>
                          <p className="font-medium text-sm" style={{color: 'var(--parent-text)'}}>{milestone.title}</p>
                          <p className="text-xs" style={{color: 'var(--parent-text-light)'}}>Week {milestone.targetWeek}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>
                  All milestones achieved! 🎉
                </p>
              )}
            </div>

            {/* Plan Stats */}
            <div className="parent-card p-6">
              <h3 className="font-semibold mb-4" style={{color: 'var(--parent-text)'}}>
                Plan Overview
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm" style={{color: 'var(--parent-text-light)'}}>Target Challenge</span>
                  <span className="text-sm font-medium" style={{color: 'var(--parent-text)'}}>{plan.targetChallenge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{color: 'var(--parent-text-light)'}}>Duration</span>
                  <span className="text-sm font-medium" style={{color: 'var(--parent-text)'}}>{plan.duration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{color: 'var(--parent-text-light)'}}>Phases</span>
                  <span className="text-sm font-medium" style={{color: 'var(--parent-text)'}}>{plan.phases.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{color: 'var(--parent-text-light)'}}>Total Milestones</span>
                  <span className="text-sm font-medium" style={{color: 'var(--parent-text)'}}>{plan.milestones.length}</span>
                </div>
                {plan.startDate && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{color: 'var(--parent-text-light)'}}>Started</span>
                    <span className="text-sm font-medium" style={{color: 'var(--parent-text)'}}>
                      {plan.startDate.toDate().toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="parent-card p-6">
              <h3 className="font-semibold mb-4" style={{color: 'var(--parent-text)'}}>
                Plan Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{backgroundColor: 'var(--parent-accent)', color: 'white'}}
                >
                  Mark as Complete
                </button>
                <Link
                  href={`/plans/review/${plan.planId}`}
                  className="block w-full py-2 px-4 rounded-lg text-sm font-medium transition-all text-center"
                  style={{border: '1px solid var(--parent-border)', color: 'var(--parent-text)'}}
                >
                  View Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
