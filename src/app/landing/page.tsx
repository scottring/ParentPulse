'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  User,
  BookOpen,
  TrendingUp,
  Zap,
  Target,
  BarChart3,
  Shield,
  NotebookPen,
  Sparkles,
  Users,
  Heart,
  Handshake,
  Briefcase,
  GraduationCap,
  UserCircle
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8F0' }}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Full-width banner - replaces traditional header */}
        <div className="w-full mb-12 animate-fade-in-up">
          <Image
            src="/relish banner 04b.png"
            alt="Relish - The Operating Manual for Relationships"
            width={1920}
            height={500}
            className="w-full h-auto"
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Hero headline */}
          <div className="text-center max-w-3xl mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight" style={{ fontFamily: 'Crimson Pro, serif' }}>
              The People You Love
              <br />
              <span className="text-amber-600">Deserve a Manual</span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed mb-8">
              Create personalized operating guides for understanding and supporting
              the important people in your life—children, spouses, friends, and family.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-slate-800 text-white font-mono text-base font-bold uppercase tracking-wider border-2 border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-600 hover:border-amber-600 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                Start Building Your Manual →
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-slate-800 font-mono text-base font-bold uppercase tracking-wider border-2 border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Trust badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="font-mono text-xs text-slate-600 uppercase tracking-wider">
                Private • Secure • Family-Focused
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 bg-white border-2 border-slate-800 mb-4">
              <span className="font-mono text-xs font-bold text-amber-600 uppercase tracking-widest">
                Getting Started
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Crimson Pro, serif' }}>
              How It Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Three simple steps to create personalized relationship manuals
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '01',
                title: 'Add People',
                description: 'Create profiles for the important people in your life—children, spouse, friends, elderly parents, anyone you want to understand better.',
                icon: User
              },
              {
                number: '02',
                title: 'Build Their Manual',
                description: 'Document triggers, effective strategies, boundaries, patterns, and strengths. Our AI helps organize your insights into actionable guides.',
                icon: BookOpen
              },
              {
                number: '03',
                title: 'Track & Grow',
                description: 'Get weekly action plans, log progress notes, and watch your understanding deepen over time with AI-generated insights.',
                icon: TrendingUp
              }
            ].map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={step.number}
                  className="bg-white border-4 border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 relative animate-fade-in-up"
                  style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                >
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-600"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-600"></div>

                  {/* Step number badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-16 h-16 bg-slate-800 border-2 border-amber-600 flex items-center justify-center">
                      <IconComponent className="w-8 h-8 text-amber-600" strokeWidth={2.5} />
                    </div>
                    <div className="font-mono text-4xl font-bold text-amber-600">
                      {step.number}
                    </div>
                  </div>

                  <h3 className="font-mono text-xl font-bold text-slate-900 uppercase tracking-wider mb-3">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Bottom corner accents */}
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-600"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-600"></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative bg-white border-t-4 border-b-4 border-slate-800">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 bg-amber-600 border-2 border-slate-800 mb-4">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">
                Core Modules
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Crimson Pro, serif' }}>
              What's Inside Each Manual
            </h2>
          </div>

          {/* Feature grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                module: 'MODULE 01',
                title: 'Triggers & Strategies',
                description: 'Document what causes stress and overwhelm, typical responses, severity levels, and proven de-escalation strategies. Know what actually works.',
                icon: Zap
              },
              {
                module: 'MODULE 02',
                title: 'Weekly Action Plans',
                description: 'AI-generated parent behavior goals based on your manual content. Focus on what YOU can change, with daily check-ins and reflection.',
                icon: Target
              },
              {
                module: 'MODULE 03',
                title: 'Pattern Analysis',
                description: 'Track recurring behavioral and situational patterns over time. Identify what triggers emerge, when they happen, and how to prepare.',
                icon: BarChart3
              },
              {
                module: 'MODULE 04',
                title: 'Boundaries & Needs',
                description: 'Categorize boundaries as immovable, negotiable, or preference. Document sensory needs, interests, and core strengths.',
                icon: Shield
              },
              {
                module: 'MODULE 05',
                title: 'Progress Notes',
                description: 'Timestamped observations and updates. Watch how your understanding evolves and celebrate growth over time.',
                icon: NotebookPen
              },
              {
                module: 'MODULE 06',
                title: "What Works & What Doesn't",
                description: 'Rate strategies by effectiveness (1-5 scale). Build a living reference of approaches to use and avoid.',
                icon: Sparkles
              }
            ].map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.module}
                  className="flex items-start gap-4 p-6 bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <div className="w-16 h-16 bg-slate-800 flex items-center justify-center shrink-0 border-2 border-amber-600">
                    <IconComponent className="w-9 h-9 text-amber-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-1">
                      {feature.module}
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who Is This For Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 bg-white border-2 border-slate-800 mb-4">
              <span className="font-mono text-xs font-bold text-amber-600 uppercase tracking-widest">
                Relationship Types
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Crimson Pro, serif' }}>
              Create Manuals For...
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { type: 'Children', icon: Users },
              { type: 'Spouse/Partner', icon: Heart },
              { type: 'Elderly Parents', icon: UserCircle },
              { type: 'Friends', icon: Handshake },
              { type: 'Siblings', icon: Users },
              { type: 'Professional', icon: Briefcase },
              { type: 'Students', icon: GraduationCap },
              { type: 'Anyone Important', icon: Heart }
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.type}
                  className="p-6 bg-white border-2 border-slate-800 text-center hover:bg-amber-50 transition-colors"
                >
                  <div className="flex justify-center mb-3">
                    <IconComponent className="w-10 h-10 text-slate-800" strokeWidth={2} />
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900 uppercase">
                    {item.type}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative bg-slate-800 border-t-4 border-b-4 border-slate-900">
        <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-amber-600"></div>
        <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-amber-600"></div>
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-amber-600"></div>
        <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-amber-600"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block px-4 py-1 bg-amber-600 border-2 border-amber-700 mb-6">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">
              Ready to Begin?
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Crimson Pro, serif' }}>
            Start Building Your
            <br />
            Relationship Library Today
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join families creating deeper understanding through personalized operating manuals.
            Free to start, always private and secure.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="px-10 py-5 bg-white text-slate-900 font-mono text-lg font-bold uppercase tracking-wider border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,0.3)] active:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-[4px] active:translate-y-[4px] transition-all"
            >
              Create Free Account →
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-mono text-xs text-white/70 uppercase tracking-wider">
              No Credit Card Required • Private & Secure
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t-4 border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <Image
                src="/Relish-logo.png"
                alt="Relish"
                width={40}
                height={40}
                className="object-contain"
              />
              <div>
                <div className="font-mono text-lg font-bold text-slate-900">
                  Relish
                </div>
                <div className="font-mono text-xs text-slate-500">
                  The Operating Manual for Relationships
                </div>
              </div>
            </div>

            <div className="flex gap-6">
              <Link href="/login" className="font-mono text-sm text-slate-600 hover:text-amber-600">
                Sign In
              </Link>
              <Link href="/register" className="font-mono text-sm text-slate-600 hover:text-amber-600">
                Register
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t-2 border-slate-200 text-center">
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider">
              © 2026 Relish • Operating Manual System • All Rights Reserved
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
