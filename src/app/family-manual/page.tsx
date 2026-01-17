'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useFamilyManual } from '@/hooks/useFamilyManual';

type TabType = 'rules' | 'values' | 'routines' | 'traditions';

export default function FamilyManualPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { familyManual, loading: manualLoading, createFamilyManual } = useFamilyManual();
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || manualLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  // If no manual exists, show creation screen
  if (!familyManual) {
    const handleCreate = async () => {
      setIsCreating(true);
      try {
        await createFamilyManual();
      } catch (err) {
        console.error('Failed to create family manual:', err);
        alert('Failed to create family manual. Please try again.');
        setIsCreating(false);
      }
    };

    return (
      <div className="min-h-screen parent-page">
        {/* Header */}
        <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl transition-transform hover:scale-110">
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  Family Manual
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Shared family content
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-3xl mx-auto px-6 lg:px-8 py-12">
          <div className="parent-card p-8 lg:p-12 text-center animate-fade-in-up">
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center text-5xl"
              style={{ backgroundColor: '#E3F2FD' }}
            >
              🏠
            </div>

            <h2 className="parent-heading text-3xl mb-4" style={{ color: 'var(--parent-text)' }}>
              Create Your Family Manual
            </h2>

            <p className="text-base mb-8 leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--parent-text-light)' }}>
              The Family Manual is where you document the shared foundation of your family life —
              house rules, core values, daily routines, and cherished traditions.
            </p>

            <div className="text-left mb-10 max-w-md mx-auto space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">🏠</div>
                <div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                    House Rules & Consequences
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    Non-negotiable rules, enforcement guidelines, and clear consequences
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">💫</div>
                <div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                    Family Values & Mission
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    Core values that define your family and how you live them daily
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">🔄</div>
                <div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                    Routines & Rhythms
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    Daily, weekly, and seasonal rhythms that bring structure and peace
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">🎉</div>
                <div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                    Traditions & Celebrations
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    Special rituals and celebrations that make your family unique
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-8 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {isCreating ? 'Creating Family Manual...' : 'Create Family Manual'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Manual exists - show content
  const tabs = [
    { id: 'rules' as TabType, label: 'House Rules', emoji: '🏠', count: familyManual.houseRules.length },
    { id: 'values' as TabType, label: 'Values', emoji: '💫', count: familyManual.familyValues.length },
    { id: 'routines' as TabType, label: 'Routines', emoji: '🔄', count: familyManual.routines.length },
    { id: 'traditions' as TabType, label: 'Traditions', emoji: '🎉', count: familyManual.traditions.length }
  ];

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-2xl transition-transform hover:scale-110">
              ←
            </Link>
            <div>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                Family Manual
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                Last updated {familyManual.updatedAt.toDate().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-current'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ color: activeTab === tab.id ? 'var(--parent-accent)' : 'var(--parent-text)' }}
              >
                <span className="mr-2">{tab.emoji}</span>
                {tab.label}
                <span className="ml-2 text-xs opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {activeTab === 'rules' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                  House Rules & Consequences
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Non-negotiable rules that keep our family running smoothly
                </p>
              </div>
              <button
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
                disabled
              >
                + Add Rule
              </button>
            </div>

            {familyManual.houseRules.length === 0 ? (
              <div className="parent-card p-12 text-center">
                <div className="text-6xl mb-4 opacity-40">🏠</div>
                <h3 className="parent-heading text-xl mb-2" style={{ color: 'var(--parent-text)' }}>
                  No House Rules Yet
                </h3>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Add house rules to document the non-negotiables in your family
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {familyManual.houseRules.map((rule, index) => (
                  <div key={rule.id} className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                            {rule.rule}
                          </h4>
                          {rule.nonNegotiable && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">
                              Non-negotiable
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                          <strong>Why:</strong> {rule.reasoning}
                        </p>
                        <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                          <strong>Consequences:</strong> {rule.consequences}
                        </p>
                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--parent-text-light)' }}>
                          <span>Applies to: {rule.appliesTo}</span>
                          <span>Added: {rule.addedDate.toDate().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'values' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                  Family Values & Mission
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  The core values that define who we are as a family
                </p>
              </div>
              <button
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
                disabled
              >
                + Add Value
              </button>
            </div>

            {familyManual.familyValues.length === 0 ? (
              <div className="parent-card p-12 text-center">
                <div className="text-6xl mb-4 opacity-40">💫</div>
                <h3 className="parent-heading text-xl mb-2" style={{ color: 'var(--parent-text)' }}>
                  No Family Values Yet
                </h3>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Document the values that guide your family's decisions and actions
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {familyManual.familyValues.map((value, index) => (
                  <div key={value.id} className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <h4 className="font-semibold text-lg mb-2" style={{ color: 'var(--parent-accent)' }}>
                      {value.value}
                    </h4>
                    <p className="text-sm mb-3" style={{ color: 'var(--parent-text)' }}>
                      {value.description}
                    </p>
                    <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                      <strong>How we show it:</strong> {value.howWeShowIt}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                      Added: {value.addedDate.toDate().toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'routines' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                  Routines & Rhythms
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  The daily, weekly, and seasonal patterns that bring structure to our lives
                </p>
              </div>
              <button
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
                disabled
              >
                + Add Routine
              </button>
            </div>

            {familyManual.routines.length === 0 ? (
              <div className="parent-card p-12 text-center">
                <div className="text-6xl mb-4 opacity-40">🔄</div>
                <h3 className="parent-heading text-xl mb-2" style={{ color: 'var(--parent-text)' }}>
                  No Routines Yet
                </h3>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Add routines to capture the rhythms that keep your family in sync
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {familyManual.routines.map((routine, index) => (
                  <div key={routine.id} className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                            {routine.title}
                          </h4>
                          <span className="text-xs px-3 py-1 rounded-full capitalize" style={{ backgroundColor: 'var(--parent-bg)', border: '1px solid var(--parent-border)' }}>
                            {routine.frequency}
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                          {routine.description}
                        </p>
                        <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                          <strong>When:</strong> {routine.timing}
                        </p>
                        {routine.steps && routine.steps.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>Steps:</p>
                            <ol className="text-sm space-y-1 ml-4 list-decimal" style={{ color: 'var(--parent-text-light)' }}>
                              {routine.steps.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'traditions' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                  Traditions & Celebrations
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  The special rituals and celebrations that make your family unique
                </p>
              </div>
              <button
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
                disabled
              >
                + Add Tradition
              </button>
            </div>

            {familyManual.traditions.length === 0 ? (
              <div className="parent-card p-12 text-center">
                <div className="text-6xl mb-4 opacity-40">🎉</div>
                <h3 className="parent-heading text-xl mb-2" style={{ color: 'var(--parent-text)' }}>
                  No Traditions Yet
                </h3>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Document the traditions and celebrations that bring your family together
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {familyManual.traditions.map((tradition, index) => (
                  <div key={tradition.id} className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <h4 className="font-semibold text-lg mb-2" style={{ color: 'var(--parent-accent)' }}>
                      {tradition.title}
                    </h4>
                    <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                      <strong>Occasion:</strong> {tradition.occasion}
                    </p>
                    <p className="text-sm mb-2" style={{ color: 'var(--parent-text)' }}>
                      {tradition.description}
                    </p>
                    <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                      <strong>How we celebrate:</strong> {tradition.howWeCelebrate}
                    </p>
                    <p className="text-sm mb-3 italic" style={{ color: 'var(--parent-text-light)' }}>
                      "{tradition.significance}"
                    </p>
                    <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                      Added: {tradition.addedDate.toDate().toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coming Soon Notice */}
        <div
          className="mt-12 p-8 rounded-2xl text-center animate-fade-in-up"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
            animationDelay: '0.2s'
          }}
        >
          <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
            💡 <strong>Coming Soon:</strong> Add, edit, and manage family manual content directly from this page.
          </p>
        </div>
      </main>
    </div>
  );
}
