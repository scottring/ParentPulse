'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { useChipEconomy } from '@/hooks/useChipEconomy';

export default function ChipEconomyPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { children, loading: childrenLoading } = useChildren();
  const { tasks, rewards, awardChips, loading: economyLoading } = useChipEconomy();
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [chipAmount, setChipAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl transition-transform hover:scale-110">
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  Chip Economy
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Tasks & rewards system
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
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Children Overview */}
        {!childrenLoading && children.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
            {children.map((child, index) => (
              <div
                key={child.userId}
                className="parent-card p-6 hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--parent-primary)' }}>
                    {child.avatarUrl ? (
                      <img src={child.avatarUrl} alt={child.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        👤
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                      {child.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">🎮</span>
                      <span className="font-bold text-xl" style={{ color: 'var(--parent-secondary)' }}>
                        {child.chipBalance || 0}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                        chips
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedChild(child.userId);
                      setShowAwardModal(true);
                    }}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                    style={{
                      backgroundColor: 'var(--parent-accent)',
                      color: 'white'
                    }}
                  >
                    Award Chips
                  </button>
                  <button
                    onClick={() => router.push(`/chip-economy/history/${child.userId}`)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                    style={{
                      border: '1px solid var(--parent-border)',
                      color: 'var(--parent-text)'
                    }}
                  >
                    History
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8 animate-fade-in-up" style={{ animationDelay: children.length > 0 ? '0.2s' : '0s' }}>
          {/* Tasks */}
          <div className="parent-card p-8 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#E8F5E9' }}>
                ✅
              </div>
              <svg
                className="w-6 h-6 transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--parent-primary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="parent-heading text-2xl mb-2" style={{ color: 'var(--parent-text)' }}>
              Manage Tasks
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--parent-text-light)' }}>
              Create tasks and chores that children can complete to earn chips
            </p>
            <button
              onClick={() => router.push('/chip-economy/tasks')}
              className="text-sm font-medium"
              style={{ color: 'var(--parent-accent)' }}
            >
              View Tasks →
            </button>
          </div>

          {/* Rewards */}
          <div className="parent-card p-8 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#FFF3E0' }}>
                🎁
              </div>
              <svg
                className="w-6 h-6 transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--parent-secondary)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="parent-heading text-2xl mb-2" style={{ color: 'var(--parent-text)' }}>
              Manage Rewards
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--parent-text-light)' }}>
              Set up rewards that children can redeem with their earned chips
            </p>
            <button
              onClick={() => router.push('/chip-economy/rewards')}
              className="text-sm font-medium"
              style={{ color: 'var(--parent-accent)' }}
            >
              View Rewards →
            </button>
          </div>
        </div>

        {/* How It Works / Getting Started */}
        <div className="parent-card p-8 paper-texture animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="parent-heading text-2xl mb-6" style={{ color: 'var(--parent-text)' }}>
            How the Chip Economy Works
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                style={{ backgroundColor: '#E8F5E9' }}>
                1️⃣
              </div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                Create Tasks
              </h4>
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Set up chores, behaviors, or achievements with chip values
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                style={{ backgroundColor: '#FFF3E0' }}>
                2️⃣
              </div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                Children Earn
              </h4>
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Kids complete tasks and earn chips tracked automatically
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                style={{ backgroundColor: '#E1BEE7' }}>
                3️⃣
              </div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
                Redeem Rewards
              </h4>
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Kids spend chips on rewards you've set up
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 rounded-xl" style={{ backgroundColor: 'var(--parent-bg)' }}>
            <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
              <span>💡</span>
              <span>Getting Started Tips</span>
            </h4>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--parent-text-light)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--parent-accent)' }}>•</span>
                <span>Start simple with 3-5 tasks your children already do regularly</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--parent-accent)' }}>•</span>
                <span>Make rewards achievable but not too easy (10-50 chips)</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--parent-accent)' }}>•</span>
                <span>Include both material rewards (toys, treats) and experiences (movie night, extra screen time)</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--parent-accent)' }}>•</span>
                <span>Adjust chip values based on task difficulty and time commitment</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Award Chips Modal */}
      {showAwardModal && selectedChild && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAwardModal(false)}
        >
          <div
            className="parent-card max-w-md w-full p-6 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="parent-heading text-2xl mb-4" style={{ color: 'var(--parent-accent)' }}>
              Award Chips
            </h3>

            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: 'var(--parent-text)' }}>
                Awarding chips to: <strong>{children.find(c => c.userId === selectedChild)?.name}</strong>
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amount = parseInt(chipAmount);
                if (isNaN(amount) || amount <= 0) {
                  alert('Please enter a valid chip amount');
                  return;
                }

                try {
                  await awardChips(selectedChild, amount, undefined, reason.trim() || 'Manual award');
                  setShowAwardModal(false);
                  setSelectedChild(null);
                  setChipAmount('');
                  setReason('');
                } catch (err) {
                  console.error('Error awarding chips:', err);
                  alert('Failed to award chips. Please try again.');
                }
              }}
            >
              <div className="mb-4">
                <label className="block mb-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                    Number of Chips *
                  </span>
                </label>
                <input
                  type="number"
                  value={chipAmount}
                  onChange={(e) => setChipAmount(e.target.value)}
                  placeholder="e.g., 5"
                  className="w-full p-3 rounded-lg text-sm"
                  style={{
                    border: '1px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)'
                  }}
                  min="1"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block mb-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                    Reason
                  </span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Helped with dishes, good behavior"
                  className="w-full p-3 rounded-lg text-sm"
                  style={{
                    border: '1px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)'
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'var(--parent-accent)' }}
                >
                  Award Chips
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAwardModal(false);
                    setSelectedChild(null);
                    setChipAmount('');
                    setReason('');
                  }}
                  className="py-3 px-6 rounded-lg font-semibold transition-all hover:shadow-md"
                  style={{
                    border: '1px solid var(--parent-border)',
                    color: 'var(--parent-text)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
