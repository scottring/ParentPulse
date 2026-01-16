'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStrategicPlans } from '@/hooks/useStrategicPlans';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS, StrategicPlan, User } from '@/types';
import Link from 'next/link';

export default function PlansPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { plans, loading, fetchFamilyPlans } = useStrategicPlans();

  const [childrenMap, setChildrenMap] = useState<Map<string, User>>(new Map());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'pending_approval' | 'completed'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.familyId) {
      fetchFamilyPlans(selectedFilter === 'all' ? undefined : selectedFilter as any);
    }
  }, [user?.familyId, selectedFilter]);

  useEffect(() => {
    if (plans.length === 0) return;

    const fetchChildren = async () => {
      const map = new Map<string, User>();
      const uniqueChildIds = [...new Set(plans.map(p => p.childId).filter((id): id is string => id !== undefined))];

      for (const childId of uniqueChildIds) {
        const childDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, childId));
        if (childDoc.exists()) {
          map.set(childId, {userId: childDoc.id, ...childDoc.data()} as User);
        }
      }

      setChildrenMap(map);
    };

    fetchChildren();
  }, [plans]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return {label: 'Active', color: '#10b981', bgColor: '#d1fae5'};
      case 'pending_approval':
        return {label: 'Pending Approval', color: '#f59e0b', bgColor: '#fef3c7'};
      case 'completed':
        return {label: 'Completed', color: '#6366f1', bgColor: '#e0e7ff'};
      case 'paused':
        return {label: 'Paused', color: '#6b7280', bgColor: '#f3f4f6'};
      default:
        return {label: status, color: '#6b7280', bgColor: '#f3f4f6'};
    }
  };

  const activePlans = plans.filter(p => p.status === 'active');
  const pendingPlans = plans.filter(p => p.status === 'pending_approval');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)'}}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-4xl hover:scale-110 transition-transform">
                🌱
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{color: 'var(--parent-accent)'}}>
                  Strategic Plans
                </h1>
                <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>
                  Long-term plans for your children's growth
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
              style={{
                color: 'var(--parent-text-light)',
                border: '1px solid var(--parent-border)'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Summary Cards */}
        {!loading && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="parent-card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{backgroundColor: '#d1fae5'}}>
                  ✅
                </div>
                <div>
                  <p className="text-3xl font-bold" style={{color: 'var(--parent-text)'}}>{activePlans.length}</p>
                  <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>Active Plans</p>
                </div>
              </div>
            </div>

            <div className="parent-card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{backgroundColor: '#fef3c7'}}>
                  ⏳
                </div>
                <div>
                  <p className="text-3xl font-bold" style={{color: 'var(--parent-text)'}}>{pendingPlans.length}</p>
                  <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>Awaiting Approval</p>
                </div>
              </div>
            </div>

            <div className="parent-card p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{backgroundColor: '#e0e7ff'}}>
                  🎯
                </div>
                <div>
                  <p className="text-3xl font-bold" style={{color: 'var(--parent-text)'}}>{plans.length}</p>
                  <p className="text-sm" style={{color: 'var(--parent-text-light)'}}>Total Plans</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{borderColor: 'var(--parent-border)'}}>
          {[
            {value: 'all', label: 'All Plans'},
            {value: 'active', label: 'Active'},
            {value: 'pending_approval', label: 'Pending'},
            {value: 'completed', label: 'Completed'}
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value as any)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                color: selectedFilter === filter.value ? 'var(--parent-accent)' : 'var(--parent-text-light)',
                borderBottom: selectedFilter === filter.value ? '2px solid var(--parent-accent)' : 'none'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-16 h-16 spinner"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && plans.length === 0 && (
          <div className="parent-card p-12 text-center">
            <div className="text-6xl mb-4 opacity-40">📋</div>
            <p className="text-lg mb-2" style={{color: 'var(--parent-text)'}}>
              No strategic plans yet
            </p>
            <p className="text-sm mb-6" style={{color: 'var(--parent-text-light)'}}>
              Create a child profile first, then generate a strategic plan from their profile page
            </p>
            <Link
              href="/children"
              className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
              style={{backgroundColor: 'var(--parent-accent)'}}
            >
              Go to Children
            </Link>
          </div>
        )}

        {/* Plans List */}
        {!loading && plans.length > 0 && (
          <div className="grid gap-6">
            {plans.map((plan, index) => {
              const child = plan.childId ? childrenMap.get(plan.childId) : undefined;
              const statusBadge = getStatusBadge(plan.status);
              const progress = plan.startDate && plan.status === 'active'
                ? Math.min(
                    Math.round(
                      ((new Date().getTime() - plan.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24)) /
                      plan.duration * 100
                    ),
                    100
                  )
                : 0;

              return (
                <Link
                  key={plan.planId}
                  href={plan.status === 'pending_approval' ? `/plans/review/${plan.planId}` : `/plans/${plan.planId}`}
                  className="parent-card p-6 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="flex items-start gap-6">
                    {/* Child Avatar */}
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0" style={{backgroundColor: 'var(--parent-primary)'}}>
                      {child?.avatarUrl ? (
                        <img src={child.avatarUrl} alt={child.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          👤
                        </div>
                      )}
                    </div>

                    {/* Plan Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="parent-heading text-xl mb-1" style={{color: 'var(--parent-text)'}}>
                            {plan.title}
                          </h3>
                          <p className="text-sm mb-2" style={{color: 'var(--parent-text-light)'}}>
                            {child?.name} • {plan.duration} days
                          </p>
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: statusBadge.bgColor,
                            color: statusBadge.color
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </div>

                      <p className="mb-4" style={{color: 'var(--parent-text)'}}>
                        {plan.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 rounded text-xs" style={{backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)'}}>
                          🎯 {plan.targetChallenge}
                        </span>
                        <span className="px-2 py-1 rounded text-xs" style={{backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)'}}>
                          📊 {plan.phases.length} phases
                        </span>
                        <span className="px-2 py-1 rounded text-xs" style={{backgroundColor: 'var(--parent-bg)', color: 'var(--parent-text)'}}>
                          🎖️ {plan.milestones.length} milestones
                        </span>
                      </div>

                      {/* Progress Bar (for active plans) */}
                      {plan.status === 'active' && (
                        <div>
                          <div className="flex justify-between text-xs mb-1" style={{color: 'var(--parent-text-light)'}}>
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{backgroundColor: 'var(--parent-bg)'}}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{width: `${progress}%`, backgroundColor: 'var(--parent-accent)'}}
                            />
                          </div>
                        </div>
                      )}

                      {/* Pending Approval Info */}
                      {plan.status === 'pending_approval' && (
                        <div className="flex items-center gap-2 p-3 rounded-lg" style={{backgroundColor: '#fef3c7'}}>
                          <span>⚠️</span>
                          <span className="text-sm font-medium" style={{color: '#92400e'}}>
                            Awaiting {plan.approvalRequired.length} parent {plan.approvalRequired.length === 1 ? 'approval' : 'approvals'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
