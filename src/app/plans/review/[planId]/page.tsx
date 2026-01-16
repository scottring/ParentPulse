'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStrategicPlans } from '@/hooks/useStrategicPlans';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS, StrategicPlan, User } from '@/types';
import Link from 'next/link';

export default function PlanReviewPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const { user, loading: authLoading } = useAuth();
  const { approvePlan, requestChanges, loading: actionLoading } = useStrategicPlans();

  const [plan, setPlan] = useState<StrategicPlan | null>(null);
  const [child, setChild] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

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
          if (planData.childId) {
            const childDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, planData.childId));
            if (childDoc.exists()) {
              setChild({userId: childDoc.id, ...childDoc.data()} as User);
            }
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

  const handleApprove = async () => {
    if (!plan) return;
    try {
      await approvePlan(plan.planId, approvalNotes || undefined);
      router.push(`/plans/${plan.planId}`);
    } catch (error) {
      console.error('Error approving plan:', error);
      alert('Failed to approve plan. Please try again.');
    }
  };

  const handleRequestChanges = async () => {
    if (!plan || !feedback.trim()) return;
    try {
      await requestChanges(plan.planId, feedback);
      router.push('/plans');
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const hasUserApproved = plan && user ? plan.parentApprovals[user.userId]?.approved === true : false;
  const hasUserRequestedChanges = plan && user ? plan.parentApprovals[user.userId]?.approved === false : false;
  const approvalCount = plan ? Object.values(plan.parentApprovals).filter(a => a.approved).length : 0;
  const requiredCount = plan?.approvalRequired.length || 0;

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

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)'}}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">📋</div>
            <div className="flex-1">
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{color: 'var(--parent-accent)'}}>
                Review Strategic Plan
              </h1>
              <p className="text-sm mt-1" style={{color: 'var(--parent-text-light)'}}>
                {child.name}'s {plan.duration}-Day Plan
              </p>
            </div>
            <Link
              href="/plans"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
              style={{border: '1px solid var(--parent-border)', color: 'var(--parent-text)'}}
            >
              ← Back to Plans
            </Link>
          </div>
        </div>
      </header>

      {/* Approval Status Banner */}
      {(hasUserApproved || hasUserRequestedChanges) && (
        <div className="max-w-5xl mx-auto px-6 lg:px-8 mt-6">
          <div className="parent-card p-6" style={{borderLeft: hasUserApproved ? '4px solid #10b981' : '4px solid #f59e0b'}}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{hasUserApproved ? '✅' : '⚠️'}</span>
              <div>
                <h3 className="font-semibold" style={{color: 'var(--parent-text)'}}>
                  {hasUserApproved ? 'You approved this plan' : 'You requested changes'}
                </h3>
                <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>
                  {hasUserApproved
                    ? `Waiting for ${requiredCount - approvalCount} more ${requiredCount - approvalCount === 1 ? 'approval' : 'approvals'}`
                    : 'Feedback submitted - plan will need to be regenerated'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        {/* Plan Overview */}
        <div className="parent-card p-8 mb-8 animate-fade-in-up">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-1">
              <h2 className="parent-heading text-3xl mb-3" style={{color: 'var(--parent-text)'}}>
                {plan.title}
              </h2>
              <p className="text-lg mb-4" style={{color: 'var(--parent-text-light)'}}>
                {plan.description}
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full text-sm" style={{backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)'}}>
                  🎯 {plan.targetChallenge}
                </span>
                <span className="px-3 py-1 rounded-full text-sm" style={{backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)'}}>
                  📅 {plan.duration} days
                </span>
                <span className="px-3 py-1 rounded-full text-sm" style={{backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)'}}>
                  📊 {plan.phases.length} phases
                </span>
                <span className="px-3 py-1 rounded-full text-sm" style={{backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)'}}>
                  🎖️ {plan.milestones.length} milestones
                </span>
              </div>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="p-6 rounded-lg" style={{backgroundColor: 'var(--parent-bg)'}}>
            <h3 className="font-semibold mb-2 flex items-center gap-2" style={{color: 'var(--parent-text)'}}>
              <span>🤖</span> Why this plan?
            </h3>
            <p className="text-sm whitespace-pre-wrap" style={{color: 'var(--parent-text-light)'}}>
              {plan.aiReasoning}
            </p>
          </div>
        </div>

        {/* Phases */}
        <div className="mb-8">
          <h2 className="parent-heading text-2xl mb-6" style={{color: 'var(--parent-text)'}}>
            Plan Phases
          </h2>
          <div className="space-y-6">
            {plan.phases.map((phase, index) => (
              <div key={phase.phaseId} className="parent-card p-6 animate-fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold" style={{backgroundColor: 'var(--parent-accent)', color: 'white'}}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--parent-text)'}}>
                      {phase.title}
                    </h3>
                    <p className="text-sm mb-2" style={{color: 'var(--parent-text-light)'}}>
                      Weeks {phase.weekStart}-{phase.weekEnd} • Focus: {phase.focus}
                    </p>
                    <p className="mb-4" style={{color: 'var(--parent-text)'}}>
                      {phase.description}
                    </p>

                    {/* Activities */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm" style={{color: 'var(--parent-text)'}}>Activities:</h4>
                      {phase.activities.map((activity, actIndex) => (
                        <div key={activity.activityId} className="p-4 rounded-lg border" style={{borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)'}}>
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h5 className="font-medium" style={{color: 'var(--parent-text)'}}>{activity.title}</h5>
                            <div className="flex gap-2 flex-shrink-0">
                              <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: 'white', border: '1px solid var(--parent-border)'}}>
                                {activity.frequency.replace('_', ' ')}
                              </span>
                              <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: 'white', border: '1px solid var(--parent-border)'}}>
                                ~{activity.estimatedMinutes} min
                              </span>
                            </div>
                          </div>
                          <p className="text-sm mb-3" style={{color: 'var(--parent-text-light)'}}>{activity.description}</p>

                          {activity.requiredResources.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-2" style={{color: 'var(--parent-text)'}}>Required resources:</p>
                              <div className="space-y-1">
                                {activity.requiredResources.map((resource, resIndex) => (
                                  <div key={resIndex} className="text-xs flex items-center gap-2" style={{color: 'var(--parent-text-light)'}}>
                                    <span>•</span>
                                    <span>{resource.name} ({resource.type})</span>
                                    {resource.cost && <span className="px-1.5 py-0.5 rounded text-xs" style={{backgroundColor: 'var(--parent-bg)'}}>{resource.cost}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Success Criteria */}
                    <div className="mt-4 p-3 rounded-lg" style={{backgroundColor: 'var(--parent-bg)'}}>
                      <h4 className="font-medium text-sm mb-2" style={{color: 'var(--parent-text)'}}>Success looks like:</h4>
                      <ul className="space-y-1">
                        {phase.successCriteria.map((criteria, critIndex) => (
                          <li key={critIndex} className="text-sm flex items-start gap-2" style={{color: 'var(--parent-text-light)'}}>
                            <span>✓</span>
                            <span>{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div className="mb-8">
          <h2 className="parent-heading text-2xl mb-6" style={{color: 'var(--parent-text)'}}>
            Milestones
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {plan.milestones.map((milestone, index) => (
              <div key={milestone.milestoneId} className="parent-card p-6 animate-fade-in-up" style={{animationDelay: `${index * 0.05}s`}}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎖️</span>
                  <div>
                    <h3 className="font-semibold mb-1" style={{color: 'var(--parent-text)'}}>
                      {milestone.title}
                    </h3>
                    <p className="text-sm mb-2" style={{color: 'var(--parent-text-light)'}}>
                      Week {milestone.targetWeek}
                    </p>
                    <p className="text-sm" style={{color: 'var(--parent-text)'}}>
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Actions */}
        {!hasUserApproved && !hasUserRequestedChanges && (
          <div className="parent-card p-8">
            <h2 className="parent-heading text-2xl mb-6" style={{color: 'var(--parent-text)'}}>
              Ready to approve?
            </h2>

            {!showFeedbackForm ? (
              <div className="space-y-4">
                {/* Optional approval notes */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--parent-text)'}}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border"
                    style={{borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)'}}
                    placeholder="Any thoughts or adjustments you'd like to note..."
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
                    style={{backgroundColor: 'var(--parent-accent)'}}
                  >
                    {actionLoading ? 'Approving...' : '✓ Approve Plan'}
                  </button>
                  <button
                    onClick={() => setShowFeedbackForm(true)}
                    className="px-6 py-3 rounded-lg font-semibold transition-all"
                    style={{border: '1.5px solid var(--parent-border)', color: 'var(--parent-text)'}}
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--parent-text)'}}>
                    What would you like to change? *
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border"
                    style={{borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-bg)'}}
                    placeholder="Please be specific about what you'd like adjusted..."
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleRequestChanges}
                    disabled={!feedback.trim() || actionLoading}
                    className="flex-1 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
                    style={{backgroundColor: 'var(--parent-secondary)'}}
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                  <button
                    onClick={() => setShowFeedbackForm(false)}
                    className="px-6 py-3 rounded-lg font-semibold transition-all"
                    style={{border: '1.5px solid var(--parent-border)', color: 'var(--parent-text)'}}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
