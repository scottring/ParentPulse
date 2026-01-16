'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useChipEconomy } from '@/hooks/useChipEconomy';

export default function RewardsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { rewards, addReward, deleteReward, loading: rewardsLoading } = useChipEconomy();
  const [showAddModal, setShowAddModal] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [chipCost, setChipCost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addReward({
        name: rewardName.trim(),
        description: rewardDescription.trim() || undefined,
        chipCost: parseInt(chipCost),
      });

      setShowAddModal(false);
      setRewardName('');
      setRewardDescription('');
      setChipCost('');
    } catch (err) {
      console.error('Error adding reward:', err);
      alert('Failed to add reward. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) {
      return;
    }

    try {
      await deleteReward(rewardId);
    } catch (err) {
      console.error('Error deleting reward:', err);
      alert('Failed to delete reward. Please try again.');
    }
  };

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
              <Link href="/chip-economy" className="text-2xl transition-transform hover:scale-110">
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  Manage Rewards
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Rewards children can redeem with chips
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
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Add Reward Button */}
        <div className="mb-8 animate-fade-in-up">
          <button
            onClick={() => setShowAddModal(true)}
            className="parent-card p-6 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group w-full"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: '#FFF3E0' }}>
              <span className="text-2xl">+</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                Add New Reward
              </div>
              <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Create a reward for children to redeem
              </div>
            </div>
          </button>
        </div>

        {/* Rewards List */}
        {!rewardsLoading && rewards.length > 0 && (
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {rewards.map((reward, index) => (
              <div
                key={reward.rewardId}
                className="parent-card p-6 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                        {reward.name}
                      </h3>
                    </div>

                    {reward.description && (
                      <p className="text-sm mb-3" style={{ color: 'var(--parent-text-light)' }}>
                        {reward.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎁</span>
                      <span className="font-bold text-lg" style={{ color: 'var(--parent-secondary)' }}>
                        {reward.chipCost}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                        chips
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteReward(reward.rewardId)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                    style={{
                      backgroundColor: '#FEE2E2',
                      color: '#C62828',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!rewardsLoading && rewards.length === 0 && (
          <div className="parent-card p-12 text-center paper-texture animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="text-6xl mb-4 opacity-40">🎁</div>
            <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
              No rewards created yet
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
              Create your first reward that children can work towards
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              Add Your First Reward
            </button>
          </div>
        )}
      </main>

      {/* Add Reward Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="parent-card max-w-md w-full p-6 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="parent-heading text-2xl mb-4" style={{ color: 'var(--parent-accent)' }}>
              Add New Reward
            </h3>

            <form onSubmit={handleAddReward}>
              <div className="mb-4">
                <label className="block mb-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                    Reward Name *
                  </span>
                </label>
                <input
                  type="text"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  placeholder="e.g., Extra screen time"
                  className="w-full p-3 rounded-lg text-sm"
                  style={{
                    border: '1px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)'
                  }}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block mb-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                    Description
                  </span>
                </label>
                <textarea
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder="Optional details about the reward"
                  rows={3}
                  className="w-full p-3 rounded-lg text-sm"
                  style={{
                    border: '1px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)'
                  }}
                />
              </div>

              <div className="mb-6">
                <label className="block mb-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                    Chip Cost *
                  </span>
                </label>
                <input
                  type="number"
                  value={chipCost}
                  onChange={(e) => setChipCost(e.target.value)}
                  placeholder="e.g., 10"
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

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
                  style={{ backgroundColor: 'var(--parent-accent)' }}
                >
                  {saving ? 'Adding...' : 'Add Reward'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setRewardName('');
                    setRewardDescription('');
                    setChipCost('');
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
