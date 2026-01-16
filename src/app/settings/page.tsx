'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyInsights, setWeeklyInsights] = useState(true);
  const [saving, setSaving] = useState(false);

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
                  Settings
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Manage your account and preferences
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
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
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
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                  Manage Children
                </div>
                <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Add, edit, or remove children from your family
                </div>
              </div>
              <Link
                href="/children"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--parent-accent)',
                  color: 'white'
                }}
              >
                Manage
              </Link>
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
      </main>
    </div>
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
