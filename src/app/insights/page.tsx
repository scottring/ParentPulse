'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useDailyActions } from '@/hooks/useDailyActions';
import { useInsights } from '@/hooks/useInsights';

export default function AIInsightsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { completedActions } = useDailyActions();
  const { insights, loading: insightsLoading, dismissInsight } = useInsights();
  const [selectedType, setSelectedType] = useState<string>('');

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
                  AI Insights
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Patterns & personalized guidance
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
        {/* Stats Overview */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up">
          <StatCard
            icon="📊"
            value={completedActions.length}
            label="Actions Completed"
            color="#E8F5E9"
          />
          <StatCard
            icon="📈"
            value={insights.filter(i => i.type === 'pattern').length}
            label="Patterns Detected"
            color="#E3F2FD"
          />
          <StatCard
            icon="💡"
            value={insights.length}
            label="Active Insights"
            color="#FFF9C4"
          />
        </div>

        {/* Filter Tabs */}
        {insights.length > 0 && (
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex flex-wrap gap-2">
              {[
                { value: '', label: 'All', emoji: '🔍' },
                { value: 'pattern', label: 'Patterns', emoji: '🔁' },
                { value: 'recommendation', label: 'Recommendations', emoji: '💡' },
                { value: 'summary', label: 'Summaries', emoji: '📊' },
                { value: 'progress', label: 'Progress', emoji: '📈' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
                  style={{
                    backgroundColor: selectedType === type.value ? 'var(--parent-primary)' : 'var(--parent-card)',
                    color: selectedType === type.value ? 'white' : 'var(--parent-text)',
                    border: `1px solid ${selectedType === type.value ? 'var(--parent-primary)' : 'var(--parent-border)'}`,
                  }}
                >
                  {type.emoji} {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Insight Categories */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <InsightCard
            icon="🔄"
            title="Pattern Detection"
            description="AI analyzes your journal entries to identify recurring themes, challenges, and behaviors"
            color="#E8F5E9"
          />
          <InsightCard
            icon="🎯"
            title="Personalized Recommendations"
            description="Get specific strategies based on your experiences and knowledge base"
            color="#FFF3E0"
          />
          <InsightCard
            icon="📅"
            title="Weekly Summaries"
            description="Comprehensive weekly reviews of your parenting journey and progress"
            color="#E1BEE7"
          />
          <InsightCard
            icon="📈"
            title="Progress Tracking"
            description="Visualize your growth as a parent over time with trend analysis"
            color="#B2DFDB"
          />
        </div>

        {/* Insights List */}
        {insightsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 spinner"></div>
          </div>
        ) : insights.length === 0 ? (
          <div className="parent-card p-12 text-center paper-texture animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-6xl mb-4 opacity-40">🤖</div>
            <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
              Building Your Insights Profile
            </p>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--parent-text-light)' }}>
              As you continue journaling and completing actions, AI will begin detecting patterns and generating personalized insights.
              Keep journaling consistently for the best results.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/journal/new"
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                Write Journal Entry
              </Link>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 rounded-lg font-semibold transition-all hover:shadow-lg"
                style={{
                  border: '1px solid var(--parent-border)',
                  color: 'var(--parent-text)'
                }}
              >
                View Today's Actions
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {insights
              .filter(i => !selectedType || i.type === selectedType)
              .map((insight, index) => (
                <div
                  key={insight.insightId}
                  className="parent-card p-6 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl flex-shrink-0">
                      {{
                        pattern: '🔁',
                        recommendation: '💡',
                        summary: '📊',
                        progress: '📈',
                      }[insight.type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                              {insight.title}
                            </h3>
                            <span
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: insight.priority === 'high' ? '#FEE2E2' :
                                                 insight.priority === 'medium' ? '#FEF3C7' : '#DBEAFE',
                                color: insight.priority === 'high' ? '#991B1B' :
                                       insight.priority === 'medium' ? '#92400E' : '#1E3A8A',
                              }}
                            >
                              {insight.priority === 'high' ? '🔴 High' :
                               insight.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
                            </span>
                          </div>
                          <p className="text-xs capitalize" style={{ color: 'var(--parent-text-light)' }}>
                            {insight.type} • {insight.timeframe.start.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {insight.timeframe.end.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>

                        <button
                          onClick={() => dismissInsight(insight.insightId)}
                          className="px-3 py-1 rounded text-xs font-medium transition-all hover:shadow-md"
                          style={{
                            backgroundColor: 'var(--parent-bg)',
                            color: 'var(--parent-text-light)',
                            border: '1px solid var(--parent-border)',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>

                      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--parent-text)' }}>
                        {insight.description}
                      </p>

                      {insight.category && (
                        <div className="flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: 'var(--parent-bg)',
                              color: 'var(--parent-secondary)',
                            }}
                          >
                            {insight.category}
                          </span>
                          {insight.relatedEntryIds.length > 0 && (
                            <span className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                              Based on {insight.relatedEntryIds.length} {insight.relatedEntryIds.length === 1 ? 'entry' : 'entries'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* How Insights Work */}
        <div
          className="mt-12 p-8 rounded-2xl animate-fade-in-up"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
            animationDelay: '0.3s'
          }}
        >
          <h3 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-accent)' }}>
            How AI Insights Work
          </h3>
          <div className="space-y-4 text-sm" style={{ color: 'var(--parent-text-light)' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">1️⃣</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>Data Collection:</strong>
                <p className="mt-1">AI analyzes your journal entries, completed actions, and saved knowledge items</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">2️⃣</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>Pattern Recognition:</strong>
                <p className="mt-1">Identifies recurring themes, triggers, successful strategies, and areas for growth</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">3️⃣</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>Knowledge Integration:</strong>
                <p className="mt-1">Connects your experiences with research-backed strategies from your knowledge base</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">4️⃣</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>Personalized Guidance:</strong>
                <p className="mt-1">Generates specific, actionable recommendations tailored to your unique situation</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(124, 144, 130, 0.1)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
              💡 Pro Tip: Consistent journaling = Better insights
            </p>
            <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
              The more you journal and complete actions, the more accurate and helpful your insights become.
              Aim for 3-4 entries per week for optimal pattern detection.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <div className="parent-card p-6 text-center hover:shadow-lg transition-all duration-300">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold mb-1" style={{ color: 'var(--parent-accent)' }}>
        {value}
      </div>
      <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
        {label}
      </div>
    </div>
  );
}

interface InsightCardProps {
  icon: string;
  title: string;
  description: string;
  color: string;
}

function InsightCard({ icon, title, description, color }: InsightCardProps) {
  return (
    <div className="parent-card p-6 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-2" style={{ color: 'var(--parent-text)' }}>
            {title}
          </h4>
          <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
