'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ChildPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'child') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center child-page">
        <div className="w-20 h-20 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--child-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen child-page p-6 sm:p-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-5xl animate-bounce-gentle">🌈</div>
          <h1 className="child-heading text-3xl sm:text-4xl" style={{ color: 'var(--child-primary)' }}>
            Hi {user.name}!
          </h1>
        </div>
        <button
          onClick={logout}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ backgroundColor: 'var(--child-card)', boxShadow: 'var(--shadow-medium)' }}
        >
          <span className="text-2xl">👋</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Welcome Message */}
        <div
          className="child-card p-8 mb-6 text-center animate-fade-in-up"
          style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFEB99 100%)' }}
        >
          <div className="text-6xl mb-4 animate-float">✨</div>
          <h2 className="child-heading text-3xl mb-2" style={{ color: 'var(--child-text)' }}>
            You're doing AWESOME!
          </h2>
          <p className="text-lg" style={{ color: 'var(--child-text)' }}>
            What would you like to do today?
          </p>
        </div>

        {/* Main Actions Grid */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {/* Check-In Button */}
          <button
            className="child-card p-8 hover:scale-105 transition-all duration-300 animate-fade-in-up group"
            style={{
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF9999 100%)',
              animationDelay: '0.1s'
            }}
          >
            <div className="text-6xl mb-4 group-hover:animate-bounce-gentle">😊</div>
            <h3 className="child-heading text-3xl mb-2 text-white">
              Check-In
            </h3>
            <p className="text-white text-lg">
              Tell us how you're feeling!
            </p>
          </button>

          {/* Chip Tracker Button */}
          <button
            className="child-card p-8 hover:scale-105 transition-all duration-300 animate-fade-in-up group"
            style={{
              background: 'linear-gradient(135deg, #4ECDC4 0%, #7FE5DE 100%)',
              animationDelay: '0.2s'
            }}
          >
            <div className="text-6xl mb-4 group-hover:animate-bounce-gentle">🎮</div>
            <h3 className="child-heading text-3xl mb-2 text-white">
              My Chips
            </h3>
            <p className="text-white text-lg">
              See your awesome points!
            </p>
          </button>
        </div>

        {/* Fun Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            icon="⭐"
            value="0"
            label="Stars"
            color="linear-gradient(135deg, #FFD93D 0%, #FFEB99 100%)"
            delay="0.3s"
          />
          <StatCard
            icon="🎯"
            value="0"
            label="Goals"
            color="linear-gradient(135deg, #A8E6CF 0%, #C8F0DC 100%)"
            delay="0.4s"
          />
          <StatCard
            icon="🏆"
            value="0"
            label="Wins"
            color="linear-gradient(135deg, #E1BEE7 0%, #EDD5F0 100%)"
            delay="0.5s"
          />
        </div>

        {/* Encouragement Card */}
        <div
          className="child-card p-8 text-center animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, #A8E6CF 0%, #C8F0DC 100%)',
            animationDelay: '0.6s'
          }}
        >
          <div className="text-5xl mb-4">🌟</div>
          <p className="child-heading text-2xl mb-2" style={{ color: 'var(--child-text)' }}>
            "You are brave, you are kind, you are amazing!"
          </p>
          <p className="text-lg" style={{ color: 'var(--child-text)' }}>
            Keep being YOU! 💪
          </p>
        </div>

        {/* Fun Decorative Elements */}
        <div className="mt-12 grid grid-cols-4 gap-4 text-center opacity-60">
          <div className="text-4xl animate-float">🎈</div>
          <div className="text-4xl animate-float" style={{ animationDelay: '0.5s' }}>🌸</div>
          <div className="text-4xl animate-float" style={{ animationDelay: '1s' }}>🦋</div>
          <div className="text-4xl animate-float" style={{ animationDelay: '1.5s' }}>⚡</div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  value: string;
  label: string;
  color: string;
  delay: string;
}

function StatCard({ icon, value, label, color, delay }: StatCardProps) {
  return (
    <div
      className="child-card p-6 text-center hover:scale-110 transition-all duration-300 cursor-pointer animate-fade-in-up"
      style={{
        background: color,
        animationDelay: delay
      }}
    >
      <div className="text-4xl mb-2">{icon}</div>
      <div className="child-heading text-3xl mb-1 text-white">{value}</div>
      <div className="text-sm text-white font-semibold">{label}</div>
    </div>
  );
}
