'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildProfile } from '@/hooks/useChildProfile';
import { useStrategicPlans } from '@/hooks/useStrategicPlans';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS, User } from '@/types';
import Link from 'next/link';

export default function ChildProfilePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params.childId as string;
  const newProfile = searchParams.get('newProfile');

  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useChildProfile(childId);
  const { generatePlan, planExists, loading: planLoading } = useStrategicPlans();

  const [child, setChild] = useState<User | null>(null);
  const [showSuccess, setShowSuccess] = useState(!!newProfile);
  const [existingPlan, setExistingPlan] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);

  useEffect(() => {
    if (!childId || !user?.familyId) return;

    const fetchChild = async () => {
      const childDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, childId));
      if (childDoc.exists()) {
        setChild({ userId: childDoc.id, ...childDoc.data() } as User);
      }
    };

    fetchChild();
  }, [childId, user?.familyId]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  useEffect(() => {
    if (!childId) return;

    const checkForPlan = async () => {
      setCheckingPlan(true);
      const hasPlan = await planExists(childId, 'active');
      const hasPending = await planExists(childId, 'pending_approval');
      setExistingPlan(hasPlan || hasPending);
      setCheckingPlan(false);
    };

    checkForPlan();
  }, [childId, planExists]);

  const handleGeneratePlan = async () => {
    if (!childId) return;

    if (!confirm(`Generate a strategic plan for ${child?.name}? This will create a personalized 30-90 day plan based on their profile.`)) {
      return;
    }

    try {
      const newPlan = await generatePlan(childId);
      if (newPlan) {
        router.push(`/plans/review/${newPlan.planId}`);
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate plan. Please try again.');
    }
  };

  if (authLoading || profileLoading || !child) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen parent-page flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--parent-text)' }}>
            No Profile Found
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--parent-text-light)' }}>
            {child.name} doesn't have a profile yet.
          </p>
          <Link
            href={`/children/onboard/${childId}`}
            className="inline-block px-6 py-3 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
          >
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/children"
                className="text-2xl hover:opacity-70"
                style={{ color: 'var(--parent-text-light)' }}
              >
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  {child.name}'s Profile
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Operating Manual • Version {profile.version}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/children/onboard/${childId}`)}
              className="px-4 py-2 rounded-lg border transition-colors text-sm"
              style={{ borderColor: 'var(--parent-border)', color: 'var(--parent-text)' }}
            >
              Edit Profile
            </button>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {showSuccess && (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div
            className="p-4 rounded-lg flex items-center gap-3 animate-fade-in-up"
            style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}
          >
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-semibold">Profile Created!</div>
              <div className="text-sm">
                {child.name}'s operating manual is ready. A strategic plan will be generated soon.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Challenges Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--parent-text)' }}>
            Current Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {profile.challenges.map((challenge) => (
              <div key={challenge.id} className="parent-card p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg capitalize" style={{ color: 'var(--parent-text)' }}>
                    {challenge.category.replace('_', ' ')}
                  </h3>
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: challenge.severity === 'significant' ? '#FFEBEE' : challenge.severity === 'moderate' ? '#FFF9C4' : '#E3F2FD',
                      color: challenge.severity === 'significant' ? '#C62828' : challenge.severity === 'moderate' ? '#F57C00' : '#1976D2'
                    }}
                  >
                    {challenge.severity}
                  </span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--parent-text-light)' }}>
                  {challenge.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {challenge.diagnosed && (
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'var(--parent-primary)', color: 'white' }}
                    >
                      Diagnosed
                    </span>
                  )}
                  {challenge.professionalSupport && (
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ backgroundColor: 'var(--parent-secondary)', color: 'white' }}
                    >
                      Professional Support
                    </span>
                  )}
                </div>
                {challenge.notes && (
                  <p className="text-sm mt-3 italic" style={{ color: 'var(--parent-text-light)' }}>
                    Note: {challenge.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Strengths & Interests */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--parent-text)' }}>
            Strengths & Interests
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="parent-card p-6">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
                Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.strengths.map((strength, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>

            <div className="parent-card p-6">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
                Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="parent-card p-6 mt-4">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
              Learning Style
            </h3>
            <p className="text-base capitalize" style={{ color: 'var(--parent-text-light)' }}>
              {profile.learningStyle.replace('-', '/')}
            </p>
          </div>
        </section>

        {/* School Info */}
        {profile.schoolInfo && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--parent-text)' }}>
              School & Environment
            </h2>
            <div className="parent-card p-6">
              {profile.schoolInfo.grade && (
                <div className="mb-4">
                  <span className="font-semibold" style={{ color: 'var(--parent-text)' }}>Grade: </span>
                  <span style={{ color: 'var(--parent-text-light)' }}>{profile.schoolInfo.grade}</span>
                </div>
              )}
              {profile.schoolInfo.specialServices && profile.schoolInfo.specialServices.length > 0 && (
                <div className="mb-4">
                  <div className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>Special Services:</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.schoolInfo.specialServices.map((service, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded text-sm"
                        style={{ backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)' }}
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.schoolInfo.iepOrFiveOFour && (
                <div>
                  <span
                    className="px-3 py-1 rounded text-sm"
                    style={{ backgroundColor: 'var(--parent-primary)', color: 'white' }}
                  >
                    IEP or 504 Plan
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* What Works */}
        {profile.whatWorks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--parent-text)' }}>
              What Works
            </h2>
            <div className="space-y-3">
              {profile.whatWorks.map((strategy) => (
                <div key={strategy.id} className="parent-card p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold flex-1" style={{ color: 'var(--parent-text)' }}>
                      {strategy.description}
                    </h3>
                    <div className="flex gap-1 ml-4">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="text-lg"
                          style={{
                            color: i < strategy.effectiveness ? 'var(--parent-accent)' : 'var(--parent-border)'
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  {strategy.context && (
                    <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      {strategy.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* What Doesn't Work */}
        {profile.whatDoesntWork.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--parent-text)' }}>
              What Doesn't Work
            </h2>
            <div className="space-y-3">
              {profile.whatDoesntWork.map((strategy) => (
                <div key={strategy.id} className="parent-card p-6">
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                    {strategy.description}
                  </h3>
                  {strategy.context && (
                    <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      {strategy.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Generate Plan CTA */}
        <div className="mt-12 p-8 rounded-lg text-center" style={{ backgroundColor: 'var(--parent-bg)' }}>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--parent-text)' }}>
            {existingPlan ? 'Strategic Plan Active' : 'Ready for a Strategic Plan?'}
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--parent-text-light)' }}>
            {existingPlan
              ? `${child.name} has an active or pending strategic plan.`
              : `Based on ${child.name}'s profile, we can create a personalized 30-90 day strategic plan to address their challenges.`
            }
          </p>
          {existingPlan ? (
            <Link
              href="/plans"
              className="inline-block px-8 py-3 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
            >
              View Strategic Plans →
            </Link>
          ) : (
            <button
              onClick={handleGeneratePlan}
              disabled={planLoading || checkingPlan}
              className="px-8 py-3 rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--parent-accent)', color: 'white' }}
            >
              {planLoading ? 'Generating Plan...' : checkingPlan ? 'Loading...' : '✨ Generate Strategic Plan'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
