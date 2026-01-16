'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { useDailyActions } from '@/hooks/useDailyActions';
import { JournalCategory, JournalEntry, DailyAction } from '@/types';
import { useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { entries, loading: entriesLoading } = useJournal();
  const { pendingActions, completedActions, loading: actionsLoading, completeAction, skipAction } = useDailyActions();
  const [completingAction, setCompletingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const currentDate = new Date();
  const greeting = currentDate.getHours() < 12 ? 'Good morning' : currentDate.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🌱</div>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                ParentPulse
              </h1>
            </div>
            <button
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
              style={{
                color: 'var(--parent-text-light)',
                border: '1px solid var(--parent-border)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--parent-bg)';
                e.currentTarget.style.color = 'var(--parent-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--parent-text-light)';
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Welcome Section with Animation */}
        <div className="mb-12 animate-fade-in-up">
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--parent-secondary)' }}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h2 className="parent-heading text-4xl sm:text-5xl lg:text-6xl mb-3" style={{ color: 'var(--parent-text)' }}>
            {greeting}, {user.name}
          </h2>
          <p className="text-lg" style={{ color: 'var(--parent-text-light)' }}>
            What would you like to focus on today?
          </p>
        </div>

        {/* Today's Action Items from AI */}
        {!actionsLoading && pendingActions.length > 0 && (
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">✨</div>
                <h3 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                  Today's Focus
                </h3>
              </div>
              <span className="text-sm px-3 py-1 rounded-full" style={{
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-accent)',
                border: '1px solid var(--parent-primary)'
              }}>
                {pendingActions.length} {pendingActions.length === 1 ? 'action' : 'actions'}
              </span>
            </div>
            <div className="space-y-3">
              {pendingActions.map((action, index) => (
                <ActionItemCard
                  key={action.actionId}
                  action={action}
                  onComplete={async () => {
                    setCompletingAction(action.actionId);
                    try {
                      await completeAction(action.actionId);
                    } finally {
                      setCompletingAction(null);
                    }
                  }}
                  onSkip={async () => {
                    setCompletingAction(action.actionId);
                    try {
                      await skipAction(action.actionId);
                    } finally {
                      setCompletingAction(null);
                    }
                  }}
                  isProcessing={completingAction === action.actionId}
                  animationDelay={`${0.05 + index * 0.03}s`}
                />
              ))}
            </div>
            {completedActions.length > 0 && (
              <div className="mt-4 text-center">
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  🎉 {completedActions.length} {completedActions.length === 1 ? 'action' : 'actions'} completed today!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Primary Actions - Large Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Journal Card */}
          <Link href="/journal/new" className="parent-card p-8 text-left hover:shadow-lg transition-all duration-300 group block">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#E8F5E9' }}
              >
                📖
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
              Today's Journal
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--parent-text-light)' }}>
              Capture a moment, challenge, or win from your parenting day. Let AI help you reflect and discover patterns.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--parent-accent)' }}>
              <span>Start writing</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </Link>

          {/* AI Coach Card */}
          <Link href="/coach" className="parent-card p-8 text-left hover:shadow-lg transition-all duration-300 group block">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#E3F2FD' }}
              >
                💬
              </div>
              <svg
                className="w-6 h-6 transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--parent-accent)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="parent-heading text-2xl mb-2" style={{ color: 'var(--parent-text)' }}>
              AI Parenting Coach
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--parent-text-light)' }}>
              Ask questions about your journey. I know your journal entries, saved articles, and what's worked for you before.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--parent-accent)' }}>
              <span>Start chatting</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </Link>

          {/* Children Card */}
          <Link href="/children" className="parent-card p-8 text-left hover:shadow-lg transition-all duration-300 group block">
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#FFF3E0' }}
              >
                👨‍👩‍👧‍👦
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
              Your Children
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--parent-text-light)' }}>
              Add children to your family, review their daily check-ins, and manage the chip economy to encourage growth.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--parent-accent)' }}>
              <span>Manage family</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Secondary Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <FeatureCard
            icon="💡"
            title="Knowledge"
            description="Your parenting library"
            color="#FFF9C4"
            comingSoon={true}
          />
          <FeatureCard
            icon="🎮"
            title="Chip Economy"
            description="Tasks & rewards"
            color="#E1BEE7"
            comingSoon={true}
          />
          <FeatureCard
            icon="🤖"
            title="AI Insights"
            description="Patterns & suggestions"
            color="#B2DFDB"
            comingSoon={true}
          />
          <FeatureCard
            icon="⚙️"
            title="Settings"
            description="Family preferences"
            color="#CFD8DC"
            comingSoon={true}
          />
        </div>

        {/* Recent Activity Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
              Recent Activity
            </h3>
            <Link
              href="/journal"
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--parent-accent)' }}
            >
              View all
            </Link>
          </div>

          {entriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 spinner"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="parent-card p-12 text-center paper-texture">
              <div className="text-6xl mb-4 opacity-40">📝</div>
              <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
                No entries yet
              </p>
              <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Start journaling to see your parenting journey unfold here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.slice(0, 3).map((entry, index) => (
                <RecentActivityCard
                  key={entry.entryId}
                  entry={entry}
                  animationDelay={`${0.3 + index * 0.05}s`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Motivational Quote Section */}
        <div
          className="mt-12 p-8 rounded-2xl text-center animate-fade-in-up"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
            animationDelay: '0.4s'
          }}
        >
          <p className="parent-heading text-xl sm:text-2xl mb-2" style={{ color: 'var(--parent-accent)' }}>
            "The days are long, but the years are short"
          </p>
          <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
            Every moment matters. Take time to reflect and be present.
          </p>
        </div>
      </main>
    </div>
  );
}

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  href?: string;
  comingSoon?: boolean;
}

function FeatureCard({ icon, title, description, color, href, comingSoon }: FeatureCardProps) {
  const content = (
    <>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <h4 className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
        {title}
      </h4>
      <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
        {description}
      </p>
      {comingSoon && (
        <span className="inline-block mt-2 text-xs px-2 py-1 rounded" style={{
          backgroundColor: 'var(--parent-bg)',
          color: 'var(--parent-text-light)',
          border: '1px solid var(--parent-border)'
        }}>
          Coming Soon
        </span>
      )}
    </>
  );

  if (href && !comingSoon) {
    return (
      <Link href={href} className="parent-card p-6 text-left hover:shadow-lg transition-all duration-300 group block">
        {content}
      </Link>
    );
  }

  return (
    <div className="parent-card p-6 text-left transition-all duration-300 group" style={{ opacity: comingSoon ? 0.6 : 1 }}>
      {content}
    </div>
  );
}

interface RecentActivityCardProps {
  entry: JournalEntry;
  animationDelay: string;
}

function RecentActivityCard({ entry, animationDelay }: RecentActivityCardProps) {
  const router = useRouter();

  const categoryEmoji: Record<JournalCategory, string> = {
    win: '🎉',
    challenge: '💪',
    behavior: '🎭',
    emotion: '💝',
    milestone: '🌟',
    discipline: '🎯',
  };

  const getCategoryColor = (category: JournalCategory): string => {
    const colors: Record<JournalCategory, string> = {
      win: '#A8E6CF',
      challenge: '#FFD93D',
      behavior: '#FF6B6B',
      emotion: '#E1BEE7',
      milestone: '#FFF9C4',
      discipline: '#B2DFDB',
    };
    return colors[category];
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      }
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={() => router.push(`/journal/${entry.entryId}`)}
      className="parent-card p-6 text-left w-full hover:shadow-lg transition-all duration-300 group animate-fade-in-up"
      style={{ animationDelay }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: getCategoryColor(entry.category) }}
        >
          {categoryEmoji[entry.category]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: 'var(--parent-accent)' }}>
              {formatDate(entry.createdAt)}
            </span>
            <span className="text-sm capitalize" style={{ color: 'var(--parent-text-light)' }}>
              • {entry.category}
            </span>
          </div>
          <p className="text-base leading-relaxed line-clamp-2" style={{ color: 'var(--parent-text)' }}>
            {entry.text}
          </p>
        </div>
        <svg
          className="w-5 h-5 transition-transform group-hover:translate-x-1 flex-shrink-0"
          style={{ color: 'var(--parent-primary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

interface ActionItemCardProps {
  action: DailyAction;
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
  isProcessing: boolean;
  animationDelay: string;
}

function ActionItemCard({ action, onComplete, onSkip, isProcessing, animationDelay }: ActionItemCardProps) {
  const priorityColors = {
    low: { bg: '#E3F2FD', border: '#90CAF9', text: '#1976D2' },
    medium: { bg: '#FFF9C4', border: '#FFD54F', text: '#F57C00' },
    high: { bg: '#FFEBEE', border: '#EF9A9A', text: '#C62828' },
  };

  const colors = priorityColors[action.priority];

  return (
    <div
      className="parent-card p-6 animate-fade-in-up"
      style={{
        animationDelay,
        borderLeft: `4px solid ${colors.border}`,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              {action.title}
            </h4>
            <span
              className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            >
              {action.priority}
            </span>
          </div>

          <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--parent-text-light)' }}>
            {action.description}
          </p>

          <div className="flex items-center gap-4 text-xs mb-3" style={{ color: 'var(--parent-text-light)' }}>
            <span className="flex items-center gap-1">
              ⏱️ {action.estimatedMinutes} min
            </span>
            {action.relatedJournalEntries.length > 0 && (
              <span className="flex items-center gap-1">
                📖 Based on {action.relatedJournalEntries.length} journal {action.relatedJournalEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>

          <details className="group">
            <summary className="text-xs cursor-pointer text-left list-none" style={{ color: 'var(--parent-accent)' }}>
              <span className="hover:underline">Why this matters</span>
            </summary>
            <p className="mt-2 text-xs leading-relaxed pl-4 border-l-2" style={{
              color: 'var(--parent-text-light)',
              borderColor: 'var(--parent-border)'
            }}>
              {action.reasoning}
            </p>
          </details>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onComplete}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{
              backgroundColor: 'var(--parent-accent)',
              color: 'white',
            }}
          >
            {isProcessing ? '...' : '✓ Done'}
          </button>
          <button
            onClick={onSkip}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{
              border: '1px solid var(--parent-border)',
              color: 'var(--parent-text-light)',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
