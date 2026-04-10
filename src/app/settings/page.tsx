'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import MainLayout from '@/components/layout/MainLayout';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { DomainWeights, DEFAULT_DOMAIN_WEIGHTS } from '@/types/ring-scores';
import { scoreToColor } from '@/lib/scoring-engine';
import { EngagementMode } from '@/types/growth';
import { ENGAGEMENT_PRESETS } from '@/types/user-preferences';
import AIUsageSection from '@/components/settings/AIUsageSection';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { family, inviteParent, removeInvite } = useFamily();

  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyInsights, setWeeklyInsights] = useState(true);
  const [saving, setSaving] = useState(false);

  // Engagement mode state
  const [engagementMode, setEngagementMode] = useState<EngagementMode>(
    (user as any)?.growthPreferences?.engagementMode || 'moderate',
  );
  const [engagementSaving, setEngagementSaving] = useState(false);

  // Domain weight state
  const [weights, setWeights] = useState<DomainWeights>(DEFAULT_DOMAIN_WEIGHTS);
  const [weightsSaving, setWeightsSaving] = useState(false);

  const handleWeightChange = useCallback((domain: keyof DomainWeights, value: number) => {
    setWeights((prev) => {
      const otherDomains = (Object.keys(prev) as (keyof DomainWeights)[])
        .filter((d) => d !== domain);
      const remaining = 1 - value;
      const otherTotal = otherDomains.reduce((sum, d) => sum + prev[d], 0);

      const next = { ...prev, [domain]: value };
      if (otherTotal > 0) {
        for (const d of otherDomains) {
          next[d] = (prev[d] / otherTotal) * remaining;
        }
      } else {
        for (const d of otherDomains) {
          next[d] = remaining / otherDomains.length;
        }
      }
      return next;
    });
  }, []);

  const handleSaveWeights = useCallback(async () => {
    if (!user) return;
    setWeightsSaving(true);
    try {
      await updateDoc(doc(firestore, 'users', user.userId), {
        'settings.domainWeights': weights,
      });
    } catch (err) {
      console.error('Failed to save weights:', err);
    } finally {
      setWeightsSaving(false);
    }
  }, [user, weights]);

  const handleResetWeights = useCallback(() => {
    setWeights(DEFAULT_DOMAIN_WEIGHTS);
  }, []);

  const handleSaveEngagement = useCallback(async (mode: EngagementMode) => {
    if (!user) return;
    setEngagementMode(mode);
    setEngagementSaving(true);
    try {
      await updateDoc(doc(firestore, 'users', user.userId), {
        'growthPreferences.engagementMode': mode,
        'growthPreferences.dailyItemTarget': ENGAGEMENT_PRESETS[mode].dailyItemTarget,
      });
    } catch (err) {
      console.error('Failed to save engagement mode:', err);
    } finally {
      setEngagementSaving(false);
    }
  }, [user]);

  // Invitation state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement settings save to Firestore
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    try {
      setInviteLoading(true);
      await inviteParent(inviteEmail);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveInvite = async (email: string) => {
    if (confirm(`Remove invitation for ${email}?`)) {
      try {
        await removeInvite(email);
      } catch (err: any) {
        alert(err.message || 'Failed to remove invitation');
      }
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7C9082]/20 border-t-[#7C9082] rounded-full animate-spin"></div>
          <p className="mt-4 text-sm" style={{ fontFamily: 'var(--font-parent-body)', color: '#5F564B' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="relative mx-auto px-4 sm:px-6 py-6" style={{ maxWidth: 1440 }}>
        {/* Page Header */}
        <header className="mb-6">
          <div
            className="relative rounded-2xl p-5"
            style={{
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(124,144,130,0.15)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-start gap-6">
              <Link href="/dashboard" className="mt-2 text-3xl transition-colors" style={{ color: '#3A3530' }}>
                &#8592;
              </Link>

              <div className="flex-1">
                <h1
                  className="mb-2"
                  style={{
                    fontFamily: 'var(--font-parent-display)',
                    fontSize: '44px',
                    fontWeight: 400,
                    color: '#3A3530',
                  }}
                >
                  Settings
                </h1>

                <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5F564B' }}>
                  Configure your preferences
                </p>
              </div>
            </div>
          </div>
        </header>
        {/* Account Section */}
        <div className="mb-8 animate-fade-in-up">
          <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Account
          </h2>
          <div className="parent-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Name
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  {user.name}
                </div>
              </div>
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text)'
                }}
              >
                Edit
              </button>
            </div>

            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Email
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  {user.email}
                </div>
              </div>
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text)'
                }}
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Password
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  •••••••••
                </div>
              </div>
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text)'
                }}
              >
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Notifications
          </h2>
          <div className="parent-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  All Notifications
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Enable or disable all notifications
                </div>
              </div>
              <ToggleSwitch
                enabled={notifications}
                onChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Daily Journal Reminder
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Reminder to write in your journal each day
                </div>
              </div>
              <ToggleSwitch
                enabled={dailyReminder && notifications}
                onChange={setDailyReminder}
                disabled={!notifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Weekly Insights Email
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Receive weekly AI-generated insights via email
                </div>
              </div>
              <ToggleSwitch
                enabled={weeklyInsights && notifications}
                onChange={setWeeklyInsights}
                disabled={!notifications}
              />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Preferences
          </h2>
          <div className="parent-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Theme
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Parent theme (soft earth tones)
                </div>
              </div>
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--parent-accent)',
                  color: 'white'
                }}
              >
                Active
              </button>
            </div>

            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Daily Actions Generation
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  AI generates actions at 9 PM daily
                </div>
              </div>
              <ToggleSwitch enabled={true} onChange={() => {}} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Timezone
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Pacific Time (US & Canada)
                </div>
              </div>
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text)'
                }}
              >
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Relationship Health Weights */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Health Score Weights
          </h2>
          <div className="parent-card p-6 space-y-6">
            <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
              Adjust how much each domain contributes to your overall health score.
              The three weights must total 100%.
            </p>

            {([
              { key: 'self' as const, label: 'Self', desc: 'Personal wellbeing & emotional regulation' },
              { key: 'couple' as const, label: 'Spouse', desc: 'Marriage/partnership health' },
              { key: 'parent_child' as const, label: 'Parent', desc: 'Parenting relationship health' },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                      {label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                      {desc}
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--parent-text)' }}>
                    {Math.round(weights[key] * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(weights[key] * 100)}
                  onChange={(e) => handleWeightChange(key, Number(e.target.value) / 100)}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--parent-accent) ${Math.round(weights[key] * 100)}%, #e0e0e0 ${Math.round(weights[key] * 100)}%)`,
                  }}
                />
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--parent-border)' }}>
              <button
                onClick={handleResetWeights}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text-light)',
                }}
              >
                Reset to Equal (33/33/33)
              </button>
              <button
                onClick={handleSaveWeights}
                disabled={weightsSaving}
                className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                {weightsSaving ? 'Saving...' : 'Save Weights'}
              </button>
            </div>
          </div>
        </div>

        {/* Growth Engagement Mode */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.27s' }}>
          <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Growth Engagement
          </h2>
          <div className="parent-card p-6">
            <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
              Choose how much growth work you want each day. You can always adjust
              the depth of individual activities from the dashboard.
            </p>

            <div className="space-y-3">
              {(['light', 'moderate', 'deep'] as EngagementMode[]).map((mode) => {
                const preset = ENGAGEMENT_PRESETS[mode];
                const isActive = engagementMode === mode;

                return (
                  <button
                    key={mode}
                    onClick={() => handleSaveEngagement(mode)}
                    disabled={engagementSaving}
                    className="w-full text-left p-4 rounded-lg transition-all"
                    style={{
                      background: isActive ? 'var(--parent-accent)' + '15' : 'transparent',
                      border: `2px solid ${isActive ? 'var(--parent-accent)' : 'var(--parent-border)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div
                          className="font-semibold text-sm"
                          style={{ color: isActive ? 'var(--parent-accent)' : 'var(--parent-text)' }}
                        >
                          {preset.label}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--parent-text-light)' }}>
                          {preset.description}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold" style={{ color: 'var(--parent-text-light)' }}>
                          ~{preset.minutesPerDay} min/day
                        </div>
                        {isActive && (
                          <span
                            className="text-xs font-bold"
                            style={{ color: 'var(--parent-accent)' }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Usage & Cost */}
        <AIUsageSection />

        {/* Family Section */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Family
          </h2>
          <div className="parent-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Manage People
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Add, edit, or remove people and their manuals
                </div>
              </div>
              <Link
                href="/people"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--parent-accent)',
                  color: 'white'
                }}
              >
                Manage
              </Link>
            </div>

            {/* Family Members Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                    Family Members
                  </div>
                  <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    {family?.members?.length || 1} member{(family?.members?.length || 1) !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                  style={{
                    border: '1px solid var(--parent-accent)',
                    color: 'var(--parent-accent)'
                  }}
                >
                  + Invite Member
                </button>
              </div>

              {/* Invite Form */}
              {showInviteForm && (
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--parent-bg)' }}>
                  <form onSubmit={handleInvite} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="family@example.com"
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          border: '1.5px solid var(--parent-border)',
                          backgroundColor: 'white',
                          color: 'var(--parent-text)'
                        }}
                        disabled={inviteLoading}
                      />
                    </div>

                    {inviteError && (
                      <div className="text-sm p-2 rounded" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                        {inviteError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={inviteLoading || !inviteEmail}
                        className="px-4 py-2 rounded-lg font-medium text-white transition-all hover:shadow-md disabled:opacity-50"
                        style={{ backgroundColor: 'var(--parent-accent)' }}
                      >
                        {inviteLoading ? 'Sending...' : 'Send Invite'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowInviteForm(false);
                          setInviteEmail('');
                          setInviteError(null);
                        }}
                        className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
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
              )}

              {/* Pending Invites */}
              {family?.pendingInvites && family.pendingInvites.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium" style={{ color: 'var(--parent-text-light)' }}>
                    Pending Invitations
                  </div>
                  {family.pendingInvites.map((invite) => (
                    <div
                      key={invite.email}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--parent-bg)' }}
                    >
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--parent-text)' }}>
                          {invite.email}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                          Invited {invite.sentAt.toDate().toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveInvite(invite.email)}
                        className="text-sm px-3 py-1 rounded transition-all hover:shadow-md"
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#991B1B'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data & Privacy Section */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Data & Privacy
          </h2>
          <div className="parent-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--parent-border)' }}>
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Export Data
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Download all your journal entries and data
                </div>
              </div>
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text)'
                }}
              >
                Export
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ color: '#C62828' }}>
                  Delete Account
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Permanently delete your account and all data
                </div>
              </div>
              <button
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: '#C62828',
                  border: '1px solid #EF9A9A'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ enabled, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: enabled ? 'var(--parent-accent)' : '#E0E0E0'
      }}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
