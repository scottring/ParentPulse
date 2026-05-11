'use client';
/* ================================================================
   /people — the People list, replacing the old /manual Family
   Summary. Each row links into a person's redesigned Manual at
   /people/[personId]. Matches the Stitch "People" design.
   ================================================================ */

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePerson } from '@/hooks/usePerson';
import type { Person, RelationshipType } from '@/types/person-manual';

export default function PeoplePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { people, loading: peopleLoading } = usePerson();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Sort: self first, then by relationship priority (spouse, child, parent, etc.)
  const sorted = useMemo(() => {
    const priority: Record<string, number> = {
      self: 0, spouse: 1, child: 2, sibling: 3,
      elderly_parent: 4, friend: 5, professional: 6, other: 7,
    };
    return [...people].sort((a, b) => {
      const pa = priority[a.relationshipType ?? 'other'] ?? 9;
      const pb = priority[b.relationshipType ?? 'other'] ?? 9;
      if (pa !== pb) return pa - pb;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [people]);

  if (authLoading || peopleLoading) {
    return <main style={appStyle}><div style={pageStyle}><p style={loadingStyle}>Opening…</p></div></main>;
  }
  if (!user) return null;

  return (
    <main style={appStyle}>
      <div style={pageStyle}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>People</h1>
          <p style={ledeStyle}>
            The stewards of our shared story. Each manual is a vessel for wisdom and memory.
          </p>
        </header>
        <hr style={ruleStyle} aria-hidden />

        {sorted.length === 0 ? (
          <p style={emptyStyle}>
            <em>No one in your family yet.</em> Add your first family member to start.
            <br />
            <Link href="/people/new" style={ctaInlineStyle}>Add someone ⟶</Link>
          </p>
        ) : (
          <ul style={listStyle}>
            {sorted.map((p) => <PersonRow key={p.personId} person={p} />)}
          </ul>
        )}

        <BuildingLegacyCard />
      </div>
    </main>
  );
}

function PersonRow({ person }: { person: Person }) {
  const hasOpenThreads = useHasOpenThreads(person.personId);
  const initials = (person.name ?? '?').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const role = relationshipLabel(person.relationshipType);
  return (
    <li>
      <Link href={`/people/${person.personId}`} style={rowLinkStyle}>
        <span style={avatarWrapStyle}>
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatarUrl} alt="" style={avatarImageStyle} />
          ) : (
            <span style={avatarInitialsStyle}>{initials || '?'}</span>
          )}
          {hasOpenThreads && <span aria-hidden style={statusDotStyle} />}
        </span>
        <span style={rowMetaStyle}>
          <span style={rowNameStyle}>{person.name}</span>
          <span style={rowRoleStyle}>{role}</span>
        </span>
      </Link>
    </li>
  );
}

/** Returns true if this person has any open journal threads waiting.
 *
 * v1: always returns false. `useSettledMentions` tracks settled
 * *entry* IDs for the current user, not per-person open threads —
 * the existing hooks don't expose a per-person "waiting on you"
 * signal yet. Wired here so we can light up the amber dot later
 * without restructuring the row. The dot is an advisory polish
 * detail, not a blocker. */
function useHasOpenThreads(_personId: string): boolean {
  return false;
}

function relationshipLabel(rt: RelationshipType | string | undefined): string {
  const map: Record<string, string> = {
    self: 'You',
    spouse: 'Partner',
    child: 'Child',
    sibling: 'Sibling',
    elderly_parent: 'Parent',
    friend: 'Friend',
    professional: 'Professional',
    other: 'Person',
  };
  if (!rt) return 'PERSON';
  return (map[rt as string] ?? String(rt)).toUpperCase();
}

function BuildingLegacyCard() {
  return (
    <section style={legacyCardStyle} aria-label="Building the Legacy">
      <div style={legacyTextColStyle}>
        <span aria-hidden style={legacyGlyphStyle}>📖</span>
        <h2 style={legacyTitleStyle}>Building the Legacy</h2>
        <p style={legacyBodyStyle}>
          Manuals are collaborative volumes. Share questions with family members to deepen the record of their lives.
        </p>
      </div>
      <div style={legacyActionsColStyle}>
        <Link href="/settings#people" style={legacyActionStyle}>
          Invite New Member <span aria-hidden style={{ marginLeft: 6 }}>+</span>
        </Link>
        <button type="button" disabled style={legacyActionDisabledStyle} title="Coming soon">
          Export Family Tree <span aria-hidden style={{ marginLeft: 6 }}>⤓</span>
        </button>
      </div>
    </section>
  );
}

const appStyle: CSSProperties = { minHeight: '100vh', background: 'var(--r-cream, #F7F5F0)' };
const pageStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '64px 32px 96px' };
const loadingStyle: CSSProperties = { fontFamily: 'var(--r-serif, Georgia, serif)', fontStyle: 'italic', color: 'var(--r-text-4, #6B6254)' };
const headerStyle: CSSProperties = { marginBottom: 28 };
const titleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontWeight: 400,
  fontSize: 'clamp(36px, 5vw, 48px)',
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 10px',
};
const ledeStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontSize: 17,
  lineHeight: 1.55,
  color: 'var(--r-text-3, #5C5347)',
  margin: 0,
  maxWidth: '58ch',
};
const ruleStyle: CSSProperties = { border: 0, borderTop: '1px solid rgba(120, 100, 70, 0.12)', margin: '0 0 28px' };
const emptyStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 16,
  color: 'var(--r-text-3, #5C5347)',
  padding: '24px 0',
};
const ctaInlineStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--r-ink, #2B2620)',
  textDecoration: 'none',
  marginTop: 12,
  display: 'inline-block',
};
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };
const rowLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  padding: '14px 0',
  borderBottom: '1px solid rgba(120, 100, 70, 0.08)',
  textDecoration: 'none',
  color: 'inherit',
};
const avatarWrapStyle: CSSProperties = {
  position: 'relative',
  width: 56,
  height: 56,
  borderRadius: '50%',
  overflow: 'hidden',
  flex: 'none',
  background: 'rgba(120, 100, 70, 0.10)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const avatarImageStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const avatarInitialsStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 18,
  color: 'var(--r-text-3, #5C5347)',
};
const statusDotStyle: CSSProperties = {
  position: 'absolute',
  bottom: 2,
  right: 2,
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: '#D4A872',
  border: '2px solid var(--r-cream, #F7F5F0)',
};
const rowMetaStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const rowNameStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontSize: 22,
  color: 'var(--r-ink, #2B2620)',
};
const rowRoleStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.22em',
  color: 'var(--r-text-4, #6B6254)',
};
const legacyCardStyle: CSSProperties = {
  marginTop: 56,
  padding: '24px 28px',
  background: 'rgba(120, 100, 70, 0.06)',
  border: '1px solid rgba(120, 100, 70, 0.14)',
  borderRadius: 8,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 32,
  alignItems: 'center',
};
const legacyTextColStyle: CSSProperties = {};
const legacyGlyphStyle: CSSProperties = { fontSize: 18, marginRight: 6 };
const legacyTitleStyle: CSSProperties = {
  fontFamily: 'var(--r-serif, Georgia, serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 22,
  color: 'var(--r-ink, #2B2620)',
  margin: '0 0 6px',
};
const legacyBodyStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 14,
  lineHeight: 1.55,
  color: 'var(--r-text-3, #5C5347)',
  margin: 0,
  maxWidth: '52ch',
};
const legacyActionsColStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' };
const legacyActionStyle: CSSProperties = {
  fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--r-ink, #2B2620)',
  textDecoration: 'none',
};
const legacyActionDisabledStyle: CSSProperties = {
  ...legacyActionStyle,
  background: 'transparent',
  border: 'none',
  cursor: 'not-allowed',
  color: 'var(--r-text-5, #8A7B5F)',
  opacity: 0.6,
  padding: 0,
};
