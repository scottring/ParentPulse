'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import MainLayout from '@/components/layout/MainLayout';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { family, inviteParent, removeInvite } = useFamily();

  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyInsights, setWeeklyInsights] = useState(true);
  const [saving, setSaving] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING SETTINGS...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <header className="mb-12">
          <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            <div className="flex items-start gap-6">
              <Link href="/dashboard" className="mt-2 font-mono text-3xl font-bold text-slate-800 hover:text-amber-600 transition-colors">
                ←
              </Link>

              <div className="flex-1">
                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-3">
                  SYSTEM CONFIGURATION
                </div>

                <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-900 mb-2">
                  Settings
                </h1>

                <p className="font-mono text-sm text-slate-600">
                  CONFIGURE SYSTEM PARAMETERS AND USER PREFERENCES
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
