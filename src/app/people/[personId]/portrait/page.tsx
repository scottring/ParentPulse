'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { useRoleSection } from '@/hooks/useRoleSection';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import { PortraitHeader } from '@/components/portrait/PortraitHeader';
import { SynthesisCards } from '@/components/portrait/SynthesisCards';
import { PerspectivePanel } from '@/components/portrait/PerspectivePanel';
import Link from 'next/link';

export default function PortraitPage() {
  const params = useParams();
  const personId = params.personId as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { people } = usePerson();
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { contributions } = useContribution();
  const { roleSections } = useRoleSection(personId);

  const [activeSection, setActiveSection] = useState<'synthesis' | 'perspectives' | 'roles'>('synthesis');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const person = people.find((p) => p.personId === personId);
  const personContribs = contributions.filter((c) => c.personId === personId);

  if (authLoading || manualLoading) {
    return (
      <>
        <Navigation />
        <SideNav />
        <div className="min-h-screen pt-[60px] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent border-gray-300" />
        </div>
      </>
    );
  }

  if (!person || !manual) {
    return (
      <>
        <Navigation />
        <SideNav />
        <div className="min-h-screen pt-[60px] flex items-center justify-center">
          <div className="text-center space-y-3">
            <p style={{ fontFamily: 'var(--font-parent-body)', color: '#7C7468' }}>
              No portrait data found for this person.
            </p>
            <Link
              href="/people"
              className="text-[13px] text-[#7C9082] hover:underline"
              style={{ fontFamily: 'var(--font-parent-body)' }}
            >
              Back to People
            </Link>
          </div>
        </div>
      </>
    );
  }

  const synth = manual.synthesizedContent;
  const patterns = manual.emergingPatterns ?? [];
  const progressNotes = manual.progressNotes ?? [];

  const tabs = [
    { key: 'synthesis', label: 'Synthesis' },
    { key: 'perspectives', label: 'Perspectives' },
    { key: 'roles', label: `Roles (${roleSections.length})` },
  ] as const;

  return (
    <>
      <Navigation />
      <SideNav />

      <div className="min-h-screen pt-[60px] pb-20" style={{ background: '#FAF8F5' }}>
        <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8">

          {/* Header */}
          <PortraitHeader person={person} manual={manual} />

          {/* Overview */}
          {synth?.overview && (
            <p
              className="mt-5"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '14px',
                color: '#5C5347',
                lineHeight: 1.7,
                fontStyle: 'italic',
              }}
            >
              {synth.overview}
            </p>
          )}

          {/* Tab navigation */}
          <div className="flex gap-1 mt-8 mb-6 border-b" style={{ borderColor: 'rgba(138,128,120,0.1)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className="text-[12px] px-4 py-2.5 transition-all relative"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontWeight: activeSection === tab.key ? 600 : 400,
                  color: activeSection === tab.key ? '#3A3530' : '#9ca3af',
                }}
              >
                {tab.label}
                {activeSection === tab.key && (
                  <div
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: '#7C9082' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeSection === 'synthesis' && synth && (
            <SynthesisCards
              alignments={synth.alignments ?? []}
              gaps={synth.gaps ?? []}
              blindSpots={synth.blindSpots ?? []}
              crossReferences={synth.crossReferences}
            />
          )}

          {activeSection === 'synthesis' && !synth && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(138,128,120,0.2)' }}
            >
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#7C7468' }}>
                No synthesis yet. Add more perspectives to generate insights.
              </p>
            </div>
          )}

          {activeSection === 'perspectives' && (
            <PerspectivePanel contributions={personContribs} />
          )}

          {activeSection === 'roles' && (
            <div className="space-y-3">
              {roleSections.length === 0 && (
                <div
                  className="rounded-xl p-8 text-center"
                  style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(138,128,120,0.2)' }}
                >
                  <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '13px', color: '#7C7468' }}>
                    No role sections yet.
                  </p>
                </div>
              )}
              {roleSections.map((role) => (
                <div
                  key={role.roleSectionId}
                  className="glass-card rounded-xl p-5"
                >
                  <h4
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#3A3530',
                    }}
                  >
                    {role.roleTitle}
                  </h4>
                  {role.roleOverview && (
                    <p
                      className="mt-2 text-[12px]"
                      style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347', lineHeight: 1.6 }}
                    >
                      {role.roleOverview}
                    </p>
                  )}

                  {/* Strengths */}
                  {role.strengths.length > 0 && (
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {role.strengths.map((s, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(22,163,74,0.06)', color: '#166534', fontFamily: 'var(--font-parent-body)' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Challenges */}
                  {role.challenges.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {role.challenges.map((c, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(217,119,6,0.06)', color: '#92400e', fontFamily: 'var(--font-parent-body)' }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Triggers count + strategies count */}
                  <div className="mt-3 flex gap-4 text-[11px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}>
                    {role.triggers.length > 0 && <span>{role.triggers.length} triggers</span>}
                    {role.whatWorks.length > 0 && <span>{role.whatWorks.length} strategies</span>}
                    {role.emergingPatterns.length > 0 && <span>{role.emergingPatterns.length} patterns</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Patterns & Progress (always visible below tabs) */}
          {(patterns.length > 0 || progressNotes.length > 0) && (
            <div className="mt-8 space-y-4">
              <div
                className="h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)' }}
              />

              {patterns.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#3A3530',
                      marginBottom: '8px',
                    }}
                  >
                    Emerging Patterns
                  </h3>
                  <div className="space-y-2">
                    {patterns.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg p-3 flex items-start gap-2"
                        style={{ background: 'rgba(0,0,0,0.02)' }}
                      >
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 font-medium"
                          style={{
                            background: p.confidence === 'validated' ? 'rgba(22,163,74,0.08)' : p.confidence === 'consistent' ? 'rgba(217,119,6,0.08)' : 'rgba(156,163,175,0.1)',
                            color: p.confidence === 'validated' ? '#166534' : p.confidence === 'consistent' ? '#92400e' : '#6b7280',
                          }}
                        >
                          {p.confidence}
                        </span>
                        <div>
                          <span className="text-[12px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#3A3530' }}>
                            {p.description}
                          </span>
                          <span className="block text-[10px] mt-0.5" style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}>
                            {p.frequency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {progressNotes.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-parent-display)',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#3A3530',
                      marginBottom: '8px',
                    }}
                  >
                    Progress Notes
                  </h3>
                  <div className="space-y-2">
                    {progressNotes.slice(0, 10).map((n) => (
                      <div key={n.id} className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                            style={{
                              fontFamily: 'var(--font-parent-body)',
                              background: n.category === 'improvement' ? 'rgba(22,163,74,0.06)' : n.category === 'concern' ? 'rgba(220,38,38,0.06)' : 'rgba(124,144,130,0.06)',
                              color: n.category === 'improvement' ? '#166534' : n.category === 'concern' ? '#991b1b' : '#5C5347',
                            }}
                          >
                            {n.category}
                          </span>
                          <span className="text-[10px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}>
                            {n.date?.toDate?.()?.toLocaleDateString?.() ?? ''}
                          </span>
                        </div>
                        <p className="text-[12px]" style={{ fontFamily: 'var(--font-parent-body)', color: '#5C5347', lineHeight: 1.5 }}>
                          {n.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation back */}
          <div className="mt-8 flex items-center gap-4">
            <Link
              href={`/people/${personId}/manual`}
              className="text-[12px] px-4 py-2 rounded-full transition-all hover:opacity-80"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontWeight: 500,
                color: '#5C5347',
                border: '1px solid rgba(138,128,120,0.2)',
              }}
            >
              Chat with manual
            </Link>
            <Link
              href="/people"
              className="text-[12px] hover:underline"
              style={{ fontFamily: 'var(--font-parent-body)', color: '#9ca3af' }}
            >
              Back to People
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
