'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePersonById, usePerson } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { useFamily } from '@/hooks/useFamily';
import { ManualChat } from '@/components/manual/ManualChat';
import { useEquivalentManualIds } from '@/hooks/useEquivalentManualIds';
import { isKidObserverEligible, computeAge } from '@/utils/age';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';

// ================================================================
// Roman numeral helper
// ================================================================
function toRoman(n: number): string {
  if (n < 1) return '';
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let num = n;
  for (const [value, numeral] of map) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

function spellCount(n: number): string {
  const names = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return n >= 0 && n <= 10 ? names[n] : String(n);
}

// ================================================================
// Main page
// ================================================================
export function ManualPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { people } = usePerson();
  const equivalentManualIds = useEquivalentManualIds(personId, people);
  const { contributions, loading: contribLoading } = useContribution(manual?.manualId, equivalentManualIds);
  const { inviteParent } = useFamily();

  const [showMenu, setShowMenu] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const loading = authLoading || personLoading || manualLoading || contribLoading;
  const isSelf = person?.linkedUserId === user?.userId;
  const selfContributions = contributions.filter((c) => c.perspectiveType === 'self');
  const observerContributions = contributions.filter((c) => c.perspectiveType === 'observer');

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      await inviteParent(inviteEmail.trim());
      setInviteSent(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, inviteParent]);

  if (loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Opening the volume&hellip;</div>
        </div>
      </div>
    );
  }

  if (!user || !person || !manual) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-binder">
            <div className="press-empty" style={{ padding: '80px 20px' }}>
              <p className="press-empty-title">This volume is missing.</p>
              <p className="press-empty-body">
                The manual may have been archived or is still being prepared.
              </p>
              <Link href="/family-manual" className="press-link">
                Return to the family manual
                <span className="arrow">⟶</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const age = person.dateOfBirth ? computeAge(person.dateOfBirth) : null;
  const synth = manual.synthesizedContent;
  const topGap = synth?.gaps?.[0] || null;

  // Top strategies sorted by effectiveness
  const topStrategies = [...(manual.whatWorks || [])]
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 4);

  // Top triggers sorted by severity
  const topTriggers = [...(manual.triggers || [])]
    .sort((a, b) => {
      const ord = { significant: 0, moderate: 1, mild: 2 };
      return (ord[a.severity] ?? 3) - (ord[b.severity] ?? 3);
    })
    .slice(0, 3);

  // Strengths
  const strengths = manual.coreInfo?.strengths?.slice(0, 6) || [];

  // Patterns
  const patterns = (manual.emergingPatterns || []).slice(0, 3);

  // Perspective count
  const perspectiveCount =
    (selfContributions.length > 0 ? 1 : 0) +
    observerContributions.map((c) => c.contributorName).filter((n, i, a) => a.indexOf(n) === i).length;

  // Relationship label
  const relationshipLabel =
    person.relationshipType === 'self' ? 'Self'
      : person.relationshipType === 'spouse' ? `Partner${age !== null ? ` · age ${toRoman(age).toLowerCase()}` : ''}`
      : person.relationshipType === 'child' && age !== null ? `Child · age ${toRoman(age).toLowerCase()}`
      : person.relationshipType === 'elderly_parent' ? 'Parent'
      : person.relationshipType === 'sibling' ? 'Sibling'
      : person.relationshipType === 'friend' ? 'Friend'
      : 'Of the family';

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        <div className="relish-container" style={{ maxWidth: 1120 }}>

          {/* The volume */}
          <div className="press-volume mt-8 relative overflow-hidden">

            {/* Running header */}
            <div className="press-running-header">
              <span>The Family Manual</span>
              <span className="sep">·</span>
              <span>{person.name}</span>
            </div>

            {/* Back link + menu — in a thin strip */}
            <div
              className="flex items-center justify-between px-14 pt-2 pb-4"
              style={{ borderBottom: '1px solid rgba(200,190,172,0.4)' }}
            >
              <Link
                href="/family-manual"
                className="press-link-sm"
              >
                ⟵ Return to the family manual
              </Link>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="press-link-sm"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                >
                  Contribute ⟶
                </button>
                {showMenu && (
                  <DropdownMenu
                    personId={personId}
                    person={person}
                    isSelf={isSelf}
                    selfContributions={selfContributions}
                    observerContributions={observerContributions}
                    people={people}
                    contributions={contributions}
                    user={user}
                    setShowMenu={setShowMenu}
                    setShowInvite={setShowInvite}
                  />
                )}
              </div>
            </div>

            {/* Two-page spread */}
            <div className="spread-container relative">
              <div className="press-gutter" aria-hidden="true" />

              {/* ============ LEFT PAGE — Identity + Overview ============ */}
              <div className="press-page-left" style={{ minHeight: 620 }}>

                {/* Name as big italic display */}
                <span className="press-chapter-label">Volume on</span>
                <h1
                  className="press-display-lg mt-2 mb-1"
                  style={{ fontSize: 'clamp(40px, 5vw, 54px)' }}
                >
                  {person.name}
                </h1>

                <p
                  className="press-marginalia"
                  style={{ marginBottom: 18 }}
                >
                  {relationshipLabel}
                  {perspectiveCount > 0 && (
                    <> &middot; {spellCount(perspectiveCount)} {perspectiveCount === 1 ? 'perspective' : 'perspectives'} kept</>
                  )}
                </p>

                <hr className="press-rule" />

                {/* Invite form */}
                {showInvite && !inviteSent && (
                  <div className="mt-5 mb-6">
                    <InviteForm
                      person={person}
                      inviteEmail={inviteEmail}
                      setInviteEmail={setInviteEmail}
                      inviting={inviting}
                      handleInvite={handleInvite}
                      inviteError={inviteError}
                      setShowInvite={setShowInvite}
                    />
                  </div>
                )}
                {inviteSent && (
                  <p className="press-body-italic mt-5 mb-6" style={{ fontSize: 14 }}>
                    An invitation has been sent to <span className="press-sc">{inviteEmail}</span>.
                  </p>
                )}

                {/* Overview */}
                {synth?.overview ? (
                  <div className="mt-6">
                    <p className="press-body press-drop-cap" style={{ fontSize: 17 }}>
                      {synth.overview}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <p className="press-body-italic" style={{ fontSize: 16 }}>
                      No overview yet. The synthesis gathers as
                      perspectives are added to this volume.
                    </p>
                  </div>
                )}

                {/* Strengths as italic running phrase */}
                {strengths.length > 0 && (
                  <>
                    <div className="press-fleuron mt-8 mb-4">❦</div>
                    <span className="press-chapter-label">In their nature</span>
                    <p
                      className="press-body-italic mt-2"
                      style={{ fontSize: 17, lineHeight: 1.55 }}
                    >
                      {strengths.slice(0, -1).map((s, i) => (
                        <span key={i}>{s.toLowerCase()}, </span>
                      ))}
                      {strengths.length > 1 && <span>and </span>}
                      <span>{strengths[strengths.length - 1].toLowerCase()}.</span>
                    </p>
                  </>
                )}

                {/* The gap — where perspectives differ */}
                {topGap && (
                  <>
                    <div className="press-fleuron mt-8 mb-4">❦</div>
                    <span className="press-chapter-label">Where perspectives differ</span>
                    <h3
                      className="press-display-sm mt-2"
                      style={{ fontSize: 19, marginBottom: 10 }}
                    >
                      {topGap.topic}
                    </h3>
                    {topGap.selfPerspective && (
                      <blockquote
                        className="press-body-italic"
                        style={{
                          fontSize: 14,
                          marginBottom: 10,
                          paddingLeft: 18,
                          borderLeft: '1px solid rgba(124,144,130,0.5)',
                        }}
                      >
                        <span
                          className="press-chapter-label"
                          style={{ fontSize: 8, display: 'block', marginBottom: 3 }}
                        >
                          In their own words
                        </span>
                        &ldquo;{topGap.selfPerspective}&rdquo;
                      </blockquote>
                    )}
                    {topGap.observerPerspective && (
                      <blockquote
                        className="press-body-italic"
                        style={{
                          fontSize: 14,
                          paddingLeft: 18,
                          borderLeft: '1px solid rgba(196,162,101,0.5)',
                        }}
                      >
                        <span
                          className="press-chapter-label"
                          style={{ fontSize: 8, display: 'block', marginBottom: 3 }}
                        >
                          From the outside
                        </span>
                        &ldquo;{topGap.observerPerspective}&rdquo;
                      </blockquote>
                    )}
                  </>
                )}

                {/* Folio */}
                <div
                  style={{
                    position: 'absolute',
                    left: 56,
                    bottom: 76,
                    pointerEvents: 'none',
                  }}
                  className="press-folio"
                >
                  i
                </div>
              </div>

              {/* ============ RIGHT PAGE — Working Chapters ============ */}
              <div className="press-page-right" style={{ minHeight: 620 }}>

                {/* Chapter: What works */}
                <span className="press-chapter-label">Chapter I</span>
                <h2 className="press-display-md mt-1 mb-4">What works</h2>

                {topStrategies.length > 0 ? (
                  <div>
                    {topStrategies.map((s, i) => (
                      <div
                        key={s.id}
                        style={{
                          paddingBottom: 16,
                          marginBottom: 16,
                          borderBottom: i === topStrategies.length - 1
                            ? 'none'
                            : '1px solid rgba(200,190,172,0.4)',
                        }}
                      >
                        <p
                          className="press-body"
                          style={{ fontSize: 16, textAlign: 'left' }}
                        >
                          {s.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="press-body-italic" style={{ fontSize: 14 }}>
                    Not yet written. This chapter fills itself as you
                    and others contribute observations.
                  </p>
                )}

                {/* Chapter: Handle with care */}
                <div className="press-fleuron mt-10 mb-6">❦</div>
                <span className="press-chapter-label">Chapter II</span>
                <h2 className="press-display-md mt-1 mb-4">Handle with care</h2>

                {topTriggers.length > 0 ? (
                  <div>
                    {topTriggers.map((t, i) => (
                      <div
                        key={t.id}
                        style={{
                          paddingBottom: 16,
                          marginBottom: 16,
                          borderBottom: i === topTriggers.length - 1 && !patterns.length
                            ? 'none'
                            : '1px solid rgba(200,190,172,0.4)',
                        }}
                      >
                        <p
                          className="press-body"
                          style={{ fontSize: 16, textAlign: 'left', marginBottom: 6 }}
                        >
                          {t.description}
                        </p>
                        {t.deescalationStrategy && (
                          <p
                            className="press-marginalia"
                            style={{ fontSize: 13 }}
                          >
                            <em>{t.deescalationStrategy}</em>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="press-body-italic" style={{ fontSize: 14 }}>
                    Not yet written.
                  </p>
                )}

                {/* Chapter: Patterns (if any) */}
                {patterns.length > 0 && (
                  <>
                    <div className="press-fleuron mt-10 mb-6">❦</div>
                    <span className="press-chapter-label">Chapter III</span>
                    <h2 className="press-display-md mt-1 mb-4">Patterns observed</h2>
                    <div>
                      {patterns.map((p, i) => (
                        <div
                          key={p.id}
                          style={{
                            paddingBottom: 14,
                            marginBottom: 14,
                            borderBottom: i === patterns.length - 1
                              ? 'none'
                              : '1px solid rgba(200,190,172,0.4)',
                          }}
                        >
                          <p
                            className="press-body"
                            style={{ fontSize: 16, textAlign: 'left' }}
                          >
                            {p.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Folio */}
                <div
                  style={{
                    position: 'absolute',
                    right: 56,
                    bottom: 76,
                    pointerEvents: 'none',
                  }}
                  className="press-folio"
                >
                  ii
                </div>
              </div>
            </div>

            {/* Chat section — below the spread, full width, editorial */}
            <div
              style={{
                borderTop: '1px solid rgba(200,190,172,0.6)',
                background: '#F2F0EB',
                padding: '32px 56px 36px',
                borderRadius: '0 0 3px 3px',
              }}
            >
              {!chatOpen ? (
                <div style={{ textAlign: 'center' }}>
                  <span className="press-chapter-label">A question</span>
                  <h3
                    className="press-display-sm mt-2 mb-4"
                    style={{ fontSize: 20 }}
                  >
                    Ask this manual anything
                  </h3>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="press-link"
                    style={{
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 17,
                    }}
                  >
                    Open the conversation
                    <span className="arrow">⟶</span>
                  </button>
                  <p
                    className="press-marginalia mt-4"
                    style={{ fontSize: 13, textAlign: 'center' }}
                  >
                    A companion grounded in everything above. Your own
                    words feed back into the volume.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="press-chapter-label">
                      Ask the manual
                    </span>
                    <button
                      onClick={() => setChatOpen(false)}
                      className="press-link-sm"
                      style={{ background: 'transparent', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  </div>
                  <ManualChat
                    personId={personId}
                    personName={person.name}
                    manual={manual}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// Dropdown menu — restyled as a quiet italic list
// ================================================================
interface DropdownMenuProps {
  personId: string;
  person: {
    personId: string;
    name: string;
    canSelfContribute?: boolean;
    relationshipType?: string;
    linkedUserId?: string;
  };
  isSelf: boolean;
  selfContributions: Array<{ contributorId?: string }>;
  observerContributions: Array<{ contributorId?: string }>;
  people: Array<{
    personId: string;
    name: string;
    relationshipType?: string;
    dateOfBirth?: { toDate: () => Date } | Date;
  }>;
  contributions: Array<{
    relationshipToSubject?: string;
    contributorName?: string;
    status?: string;
  }>;
  user: { userId: string };
  setShowMenu: (v: boolean) => void;
  setShowInvite: (v: boolean) => void;
}

function DropdownMenu({
  personId, person, isSelf, selfContributions, observerContributions,
  people, contributions, user, setShowMenu, setShowInvite,
}: DropdownMenuProps) {
  const itemStyle: React.CSSProperties = {
    display: 'block',
    padding: '12px 20px',
    fontFamily: 'var(--font-parent-display)',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#3A3530',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(200,190,172,0.3)',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
  };

  return (
    <div
      className="absolute right-0 top-full mt-2 w-72 rounded z-10"
      style={{
        background: '#FAF8F3',
        border: '1px solid rgba(200,190,172,0.6)',
        boxShadow: '0 8px 32px rgba(60,48,28,0.12)',
      }}
    >
      {isSelf && (
        <Link
          href={`/people/${personId}/manual/self-onboard`}
          style={itemStyle}
          onClick={() => setShowMenu(false)}
        >
          {selfContributions.length > 0 ? 'Revise your perspective' : 'Add your own perspective'}
        </Link>
      )}
      {!isSelf && (
        <Link
          href={`/people/${personId}/manual/onboard`}
          style={itemStyle}
          onClick={() => setShowMenu(false)}
        >
          {observerContributions.some((c) => c.contributorId === user.userId)
            ? 'Revise your observations'
            : 'Add your observations'}
        </Link>
      )}
      {person.canSelfContribute && person.relationshipType === 'child' && (
        <Link
          href={`/people/${personId}/manual/kid-session`}
          style={itemStyle}
          onClick={() => setShowMenu(false)}
        >
          Let {person.name} add their voice
        </Link>
      )}
      {!person.linkedUserId && person.canSelfContribute && person.relationshipType !== 'child' && (
        <button
          onClick={() => { setShowInvite(true); setShowMenu(false); }}
          style={itemStyle}
        >
          Invite {person.name}
        </button>
      )}
      {people
        .filter((p) =>
          p.relationshipType === 'child' &&
          p.personId !== personId &&
          p.dateOfBirth &&
          isKidObserverEligible(p.dateOfBirth as Date),
        )
        .map((kid) => {
          const kidContrib = contributions.find(
            (c) => c.relationshipToSubject === 'child-observer' &&
            c.contributorName === kid.name,
          );
          return (
            <Link
              key={kid.personId}
              href={`/people/${personId}/manual/kid-observer-session?observer=${kid.personId}`}
              style={itemStyle}
              onClick={() => setShowMenu(false)}
            >
              {kidContrib?.status === 'complete'
                ? `${kid.name}'s observations (revise)`
                : kidContrib?.status === 'draft'
                ? `${kid.name}'s observations (continue)`
                : `Let ${kid.name} observe ${person.name}`}
            </Link>
          );
        })
      }
    </div>
  );
}

// ================================================================
// Invite form — minimal, inline
// ================================================================
interface InviteFormProps {
  person: { name: string };
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviting: boolean;
  handleInvite: () => void;
  inviteError: string | null;
  setShowInvite: (v: boolean) => void;
}

function InviteForm({
  person, inviteEmail, setInviteEmail, inviting, handleInvite, inviteError, setShowInvite,
}: InviteFormProps) {
  return (
    <div
      style={{
        padding: '18px 20px',
        borderTop: '1px solid rgba(200,190,172,0.5)',
        borderBottom: '1px solid rgba(200,190,172,0.5)',
      }}
    >
      <p className="press-body-italic mb-3" style={{ fontSize: 14 }}>
        Invite {person.name} to add their own perspective.
      </p>
      <div className="flex gap-2 items-baseline">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder={`${person.name.toLowerCase()}@…`}
          className="flex-1 focus:outline-none"
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 15,
            fontStyle: 'italic',
            color: '#3A3530',
            background: 'transparent',
            border: 0,
            borderBottom: '1px solid rgba(200,190,172,0.6)',
            padding: '6px 2px',
          }}
        />
        <button
          onClick={handleInvite}
          disabled={inviting || !inviteEmail.trim()}
          className="press-link-sm"
          style={{
            background: 'transparent',
            cursor: inviting ? 'wait' : 'pointer',
            opacity: inviting ? 0.5 : 1,
          }}
        >
          {inviting ? 'Sending…' : 'Send ⟶'}
        </button>
        <button
          onClick={() => setShowInvite(false)}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
      {inviteError && (
        <p
          className="press-marginalia mt-2"
          style={{ color: '#C08070', fontSize: 13 }}
        >
          {inviteError}
        </p>
      )}
    </div>
  );
}
