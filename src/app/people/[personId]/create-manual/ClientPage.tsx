'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import { RelationshipType } from '@/types/person-manual';
import { computeAge, isKidSessionEligible, isKidObserverEligible } from '@/utils/age';

// ================================================================
// Relationship options — editorial phrasing
// ================================================================
const RELATIONSHIP_OPTIONS: Array<{
  type: RelationshipType;
  label: string;
  description: string;
}> = [
  { type: 'child', label: 'A child', description: 'Your son, daughter, or a child you parent' },
  { type: 'spouse', label: 'A partner', description: 'Your spouse, husband, wife, or companion' },
  { type: 'elderly_parent', label: 'A parent', description: 'A mother, father, or grandparent you care for' },
  { type: 'sibling', label: 'A sibling', description: 'Your brother or sister' },
  { type: 'friend', label: 'A friend', description: 'A close friend, chosen family' },
  { type: 'professional', label: 'A colleague', description: 'A professional or working relationship' },
  { type: 'other', label: 'Another', description: 'Someone outside these categories' },
];

// ================================================================
// Main page
// ================================================================
export function CreateManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading, updatePerson } = usePersonById(personId);
  const { manual, createManual, loading: manualLoading } = usePersonManual(personId);
  const [selectedType, setSelectedType] = useState<RelationshipType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showWhatsNext, setShowWhatsNext] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Pre-select relationship type if already set
  useEffect(() => {
    if (person?.relationshipType && person.relationshipType !== 'self' && selectedType === null) {
      setSelectedType(person.relationshipType);
    }
  }, [person, selectedType]);

  // If manual already exists, redirect to manual view
  useEffect(() => {
    if (manual && !manualLoading && !showWhatsNext) {
      router.push(`/people/${personId}/manual`);
    }
  }, [manual, manualLoading, personId, router, showWhatsNext]);

  if (authLoading || personLoading || !user || !person) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Preparing the page&hellip;</div>
        </div>
      </div>
    );
  }

  const effectiveType = selectedType || 'other';
  const personAge = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const isChildType = effectiveType === 'child';
  const kidSessionOk = person.dateOfBirth ? isKidSessionEligible(person.dateOfBirth) : isChildType;
  const kidObserverOk = person.dateOfBirth ? isKidObserverEligible(person.dateOfBirth) : false;

  const handleCreateManual = async () => {
    setIsCreating(true);
    try {
      const manualId = await createManual(personId, person.name, effectiveType);

      const canSelfContribute = ['spouse', 'child', 'sibling', 'friend'].includes(effectiveType);
      await updatePerson({
        relationshipType: effectiveType,
        hasManual: true,
        manualId,
        canSelfContribute,
      });

      setShowWhatsNext(true);
    } catch (err) {
      console.error('Failed to create manual:', err);
      alert('Failed to create manual. Please try again.');
      setIsCreating(false);
    }
  };

  // ==============================================================
  // What's Next screen after manual creation
  // ==============================================================
  if (showWhatsNext) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />

        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 640 }}>

            {/* Running header */}
            <div className="press-running-header" style={{ paddingTop: 28 }}>
              <span>A new volume</span>
              <span className="sep">·</span>
              <span>Welcomed into the library</span>
            </div>

            {/* Title */}
            <div className="press-binder-head">
              <span className="press-chapter-label">The volume is open</span>
              <h1 className="press-binder-title mt-2" style={{ fontSize: 'clamp(42px, 5vw, 56px)' }}>
                {person.name}&rsquo;s volume
              </h1>
              <p className="press-binder-sub">
                The pages are blank. They fill as perspectives are
                added — yours, theirs, and anyone else&rsquo;s who knows
                them.
              </p>
            </div>

            {/* Age context for kids */}
            {isChildType && personAge !== null && (
              <div style={{ textAlign: 'center', padding: '0 40px 20px' }}>
                <p className="press-marginalia" style={{ fontSize: 13 }}>
                  {person.name} is {personAge} years old
                  {kidObserverOk && ' — old enough for their own sessions and for observing other members of the family'}
                  {!kidObserverOk && kidSessionOk && ' — old enough for a kid-friendly session with gentle prompts'}
                  {!kidSessionOk && ' — a bit young to fill their own pages, but you can begin from your own observations'}
                </p>
              </div>
            )}

            <hr className="press-rule-short" style={{ margin: '0 auto 28px' }} />

            {/* The actions — listed as press chapter entries */}
            <div style={{ padding: '0 48px 32px' }}>
              <div className="press-chapter-label" style={{ textAlign: 'center', marginBottom: 24 }}>
                Three ways to begin
              </div>

              {/* Primary: your observations */}
              <WizardAction
                number="I"
                title={`Write your observations of ${person.name}`}
                body="Start from what you already know. You'll answer a handful of questions about them — their triggers, what works, what doesn't."
                href={`/people/${personId}/manual/onboard`}
                primary
              />

              {/* Kid self-session */}
              {isChildType && kidSessionOk && (
                <WizardAction
                  number="II"
                  title={`Let ${person.name} add their voice`}
                  body="A gentle session with age-appropriate prompts. Sit with them as they answer in their own words."
                  href={`/people/${personId}/manual/kid-session`}
                />
              )}

              {/* Spouse/friend/sibling invite */}
              {['spouse', 'friend', 'sibling'].includes(effectiveType) && (
                <WizardAction
                  number="II"
                  title={`Invite ${person.name} to contribute`}
                  body="Send an invitation so they can add their own perspective directly. Both views will be synthesized together."
                  href={`/people/${personId}/manual`}
                />
              )}

              {/* Skip for now */}
              <WizardAction
                number="III"
                title="Set it aside for later"
                body="The volume waits. You can return anytime to add perspectives and begin filling the pages."
                href="/manual"
                muted
              />
            </div>

            <div className="press-fleuron mt-6">❦</div>

            <p
              className="press-marginalia mt-6"
              style={{ textAlign: 'center', fontSize: 14, color: '#7A6E5C' }}
            >
              A volume is a living document. Pages can always be
              added, revised, or contributed to by others.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // Relationship picker (initial screen)
  // ==============================================================
  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="press-binder" style={{ maxWidth: 680 }}>

          {/* Running header */}
          <div className="press-running-header" style={{ paddingTop: 28 }}>
            <span>Begin a new volume</span>
            <span className="sep">·</span>
            <span>Chapter 1: the relationship</span>
          </div>

          {/* Back link */}
          <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 12 }}>
            <Link href="/people" className="press-link-sm">
              ⟵ Return to the index
            </Link>
          </div>

          {/* Title */}
          <div className="press-binder-head">
            <span className="press-chapter-label">A volume for</span>
            <h1 className="press-binder-title mt-2" style={{ fontSize: 'clamp(40px, 5vw, 54px)' }}>
              {person.name}
            </h1>
            <p className="press-binder-sub">
              Who are they to you? This tells the volume what kinds
              of questions to ask.
            </p>
          </div>

          <hr className="press-rule-short" style={{ margin: '0 auto 12px' }} />

          {/* Relationship options list */}
          <div style={{ padding: '20px 48px 32px' }}>
            {RELATIONSHIP_OPTIONS.map((option, idx) => (
              <button
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                className="w-full text-left py-5"
                style={{
                  background: 'transparent',
                  border: 0,
                  borderBottom: idx === RELATIONSHIP_OPTIONS.length - 1
                    ? 'none'
                    : '1px solid rgba(200,190,172,0.4)',
                  cursor: 'pointer',
                  transition: 'padding-left 0.2s ease',
                  paddingLeft: effectiveType === option.type ? 14 : 0,
                }}
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className="press-chapter-label"
                    style={{
                      flexShrink: 0,
                      color: effectiveType === option.type ? '#2D5F5D' : '#7A6E5C',
                      width: 24,
                    }}
                  >
                    {String.fromCharCode(96 + idx + 1)}.
                  </span>
                  <div className="flex-1">
                    <h3
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: 20,
                        fontStyle: 'italic',
                        color: effectiveType === option.type ? '#3A3530' : '#5C5347',
                        fontWeight: effectiveType === option.type ? 500 : 400,
                        lineHeight: 1.2,
                        margin: 0,
                      }}
                    >
                      {option.label}
                    </h3>
                    <p
                      className="press-marginalia mt-1"
                      style={{ fontSize: 14 }}
                    >
                      {option.description}
                    </p>
                  </div>
                  {effectiveType === option.type && (
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontStyle: 'italic',
                        color: '#7C9082',
                        fontSize: 17,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <hr className="press-rule" />

          {/* Actions */}
          <div
            style={{
              padding: '24px 48px 40px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Link
              href="/people"
              className="press-link-sm"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreateManual}
              disabled={isCreating || !selectedType}
              className="press-link"
              style={{
                background: 'transparent',
                cursor: isCreating || !selectedType ? 'not-allowed' : 'pointer',
                opacity: isCreating || !selectedType ? 0.4 : 1,
              }}
            >
              {isCreating ? 'Opening the volume…' : 'Open the volume'}
              {!isCreating && <span className="arrow">⟶</span>}
            </button>
          </div>

          <div className="press-fleuron">❦</div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Wizard action — a chapter-style linked card
// ================================================================
function WizardAction({
  number,
  title,
  body,
  href,
  primary = false,
  muted = false,
}: {
  number: string;
  title: string;
  body: string;
  href: string;
  primary?: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block w-full"
      style={{
        textDecoration: 'none',
        color: 'inherit',
        padding: '22px 0',
        borderBottom: '1px solid rgba(200,190,172,0.4)',
        opacity: muted ? 0.75 : 1,
        transition: 'padding-left 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.paddingLeft = '10px';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.paddingLeft = '0';
      }}
    >
      <div className="flex items-baseline gap-4">
        <span
          className="press-chapter-label"
          style={{
            width: 30,
            flexShrink: 0,
            color: primary ? '#2D5F5D' : '#6B6254',
          }}
        >
          {number}.
        </span>
        <div className="flex-1">
          <h3
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: primary ? 22 : 19,
              fontStyle: 'italic',
              fontWeight: primary ? 500 : 400,
              color: '#3A3530',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {title}
          </h3>
          <p
            className="press-marginalia mt-2"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            {body}
          </p>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 15,
            color: primary ? '#2D5F5D' : '#6B6254',
            flexShrink: 0,
          }}
        >
          ⟶
        </span>
      </div>
    </Link>
  );
}
