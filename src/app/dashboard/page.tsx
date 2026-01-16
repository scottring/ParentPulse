'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

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

        {/* Primary Actions - Large Cards */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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
          </button>
        </div>

        {/* Secondary Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <FeatureCard
            icon="💡"
            title="Knowledge"
            description="Your parenting library"
            color="#FFF9C4"
          />
          <FeatureCard
            icon="🎮"
            title="Chip Economy"
            description="Tasks & rewards"
            color="#E1BEE7"
          />
          <FeatureCard
            icon="🤖"
            title="AI Insights"
            description="Patterns & suggestions"
            color="#B2DFDB"
          />
          <FeatureCard
            icon="⚙️"
            title="Settings"
            description="Family preferences"
            color="#CFD8DC"
          />
        </div>

        {/* Recent Activity Section */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
              Recent Activity
            </h3>
            <button
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--parent-accent)' }}
            >
              View all
            </button>
          </div>

          <div className="parent-card p-12 text-center paper-texture">
            <div className="text-6xl mb-4 opacity-40">📝</div>
            <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
              No entries yet
            </p>
            <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
              Start journaling to see your parenting journey unfold here
            </p>
          </div>
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
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <button className="parent-card p-6 text-left hover:shadow-lg transition-all duration-300 group">
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
    </button>
  );
}
