'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useRoleSections } from '@/hooks/useRoleSection';
import { RoleType, RoleSection } from '@/types/person-manual';

export default function ManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { roleSections, loading: sectionsLoading } = useRoleSections(manual?.manualId);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // If no manual exists, redirect to create page
  useEffect(() => {
    if (!manualLoading && !manual && person) {
      router.push(`/people/${personId}/create-manual`);
    }
  }, [manual, manualLoading, person, personId, router]);

  if (authLoading || personLoading || manualLoading || !user || !person || !manual) {
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
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <Link href="/people" className="text-2xl transition-transform hover:scale-110 mt-1">
                ←
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                    {person.name}'s Operating Manual
                  </h1>
                  <span
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: 'var(--parent-bg)',
                      color: 'var(--parent-accent)',
                      border: '1px solid var(--parent-primary)'
                    }}
                  >
                    v{manual.version}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Last updated {manual.updatedAt.toDate().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up">
          <div className="parent-card p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎭</div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--parent-text)' }}>
                  {roleSections.length}
                </p>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Role {roleSections.length === 1 ? 'Section' : 'Sections'}
                </p>
              </div>
            </div>
          </div>

          <div className="parent-card p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚡</div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--parent-accent)' }}>
                  {roleSections.reduce((sum, section) => sum + section.triggers.length, 0)}
                </p>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Known Triggers
                </p>
              </div>
            </div>
          </div>

          <div className="parent-card p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✨</div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--parent-secondary)' }}>
                  {roleSections.reduce((sum, section) => sum + section.whatWorks.length, 0)}
                </p>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Effective Strategies
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Role Section Button */}
        <div className="flex justify-between items-center mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
            Role Sections
          </h2>
          <button
            onClick={() => setShowAddRoleModal(true)}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg flex items-center gap-2"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            <span className="text-xl">+</span>
            <span>Add Role Section</span>
          </button>
        </div>

        {/* Role Sections */}
        {sectionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 spinner"></div>
          </div>
        ) : roleSections.length === 0 ? (
          <div className="parent-card p-12 text-center paper-texture animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-6xl mb-4 opacity-40">🎭</div>
            <h3 className="parent-heading text-2xl mb-3" style={{ color: 'var(--parent-text)' }}>
              No Role Sections Yet
            </h3>
            <p className="text-base mb-6 max-w-md mx-auto" style={{ color: 'var(--parent-text-light)' }}>
              Create role sections to capture context-specific information about {person.name}.
              For example: "{user.name} as Parent to {person.name}" or "{person.name} as Student".
            </p>
            <button
              onClick={() => setShowAddRoleModal(true)}
              className="px-8 py-4 rounded-lg font-semibold text-white transition-all hover:shadow-lg inline-flex items-center gap-2"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              <span className="text-2xl">+</span>
              <span>Add First Role Section</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {roleSections.map((section, index) => (
              <RoleSectionCard
                key={section.roleSectionId}
                section={section}
                personName={person.name}
                animationDelay={`${0.2 + index * 0.05}s`}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Role Modal - Coming Soon */}
      {showAddRoleModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddRoleModal(false)}
        >
          <div
            className="parent-card p-8 max-w-md w-full animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="parent-heading text-2xl mb-4" style={{ color: 'var(--parent-text)' }}>
              Add Role Section
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
              This feature is coming soon! For now, use the demo page at <code>/demo</code> to add role sections.
            </p>
            <button
              onClick={() => setShowAddRoleModal(false)}
              className="w-full px-4 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RoleSectionCardProps {
  section: RoleSection;
  personName: string;
  animationDelay: string;
}

function RoleSectionCard({ section, personName, animationDelay }: RoleSectionCardProps) {
  const router = useRouter();

  const roleTypeEmojis: Record<RoleType, string> = {
    parent: '👨‍👩‍👧',
    child: '👶',
    spouse: '💑',
    sibling: '👫',
    friend: '🤝',
    professional: '💼',
    caregiver: '🩺',
    pet_owner: '🐾',
    other: '👤'
  };

  const roleTypeColors: Record<RoleType, string> = {
    parent: '#E8F5E9',
    child: '#FFF3E0',
    spouse: '#FCE4EC',
    sibling: '#E3F2FD',
    friend: '#FFF9C4',
    professional: '#E0F2F1',
    caregiver: '#F3E5F5',
    pet_owner: '#FFEBEE',
    other: '#F5F5F5'
  };

  return (
    <button
      onClick={() => router.push(`/people/${section.manualId.split('_')[0]}/roles/${section.roleSectionId}`)}
      className="parent-card p-6 text-left w-full hover:shadow-lg transition-all duration-300 group animate-fade-in-up"
      style={{ animationDelay }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: roleTypeColors[section.roleType] }}
        >
          {roleTypeEmojis[section.roleType]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              {section.roleTitle}
            </h3>
            <span
              className="text-xs px-2 py-1 rounded-full capitalize"
              style={{
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text-light)',
                border: '1px solid var(--parent-border)'
              }}
            >
              {section.roleType}
            </span>
          </div>

          <p className="text-sm mb-3" style={{ color: 'var(--parent-text-light)' }}>
            {section.roleDescription || `${personName} in this role`}
          </p>

          {/* Contributors */}
          {section.contributorNames.length > 0 && (
            <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'var(--parent-text-light)' }}>
              <span>👥</span>
              <span>Contributors: {section.contributorNames.join(', ')}</span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-1" style={{ color: 'var(--parent-text-light)' }}>
              <span>⚡</span>
              <span>{section.triggers.length} triggers</span>
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--parent-text-light)' }}>
              <span>✨</span>
              <span>{section.whatWorks.length} works</span>
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--parent-text-light)' }}>
              <span>🚫</span>
              <span>{section.whatDoesntWork.length} doesn't work</span>
            </div>
          </div>
        </div>

        <svg
          className="w-6 h-6 transition-transform group-hover:translate-x-1 flex-shrink-0 mt-1"
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
