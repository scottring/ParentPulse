'use client';
/* ================================================================
   journal-first / Home — the new cold-open writing surface.

   This is Phase A of the React rebuild. Mocks live at:
     docs/journal-first-redesign/iris-morning.html
     docs/journal-first-redesign/scott-evening.html

   Time-of-day adaptive: morning/afternoon → "morning" view (compact
   writing area + "A moment is there" before the feed); evening/night
   → "evening" view (writing area is the centerpiece, "What happened
   today" follows).

   Inline styles only, no styled-jsx — avoiding the documented
   styled-jsx scoping bug (see feedback_styled_jsx_pattern memory).

   Phase A scope:
     - Unified check-in card with multi-select PersonTabs
     - Moments list responsive to selected kids (morning view)
     - Real timeline of recent entries (Phase B will refine)
     - Save commits one entry containing personal feelings,
       relationship feelings + targets, and any written text.
   ================================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import { usePerson } from '@/hooks/usePerson';
import { usePrivacyLock } from '@/hooks/usePrivacyLock';
import { MicButton } from '@/components/voice/MicButton';
import { PinSetupModal } from '@/components/privacy/PinSetupModal';
import { mastheadImageFor } from '@/config/stock-imagery';
import { T } from './tokens';

/* ───────────────────────────────────────────────────────────────
   Feeling vocabularies — different for personal vs. relationship.
   ─────────────────────────────────────────────────────────────── */
// Core-five up front + the rest behind a "More…" toggle. Keeps the
// surface calm while preserving the full vocabulary. The first five
// items in each list are core; the rest are revealed on expand.
type Feeling = { face: string; word: string };
const FEELINGS_SELF_MORNING: Feeling[] = [
  // Core
  { face: '🙂', word: 'good' },
  { face: '😌', word: 'calm' },
  { face: '😴', word: 'tired' },
  { face: '😟', word: 'worried' },
  { face: '😞', word: 'low' },
  // More
  { face: '😎', word: 'steady' },
  { face: '😢', word: 'sad' },
  { face: '😫', word: 'stressed' },
  { face: '😠', word: 'frustrated' },
  { face: '🤔', word: 'unsure' },
];
const FEELINGS_SELF_EVENING: Feeling[] = [
  { face: '🙂', word: 'good' },
  { face: '😌', word: 'settled' },
  { face: '😴', word: 'tired' },
  { face: '😟', word: 'worried' },
  { face: '😞', word: 'low' },
  { face: '🙏', word: 'grateful' },
  { face: '😔', word: 'heavy' },
  { face: '😫', word: 'stressed' },
  { face: '😠', word: 'frustrated' },
  { face: '🤔', word: 'thinking' },
];
const FEELINGS_REL: Feeling[] = [
  { face: '🙂', word: 'good' },
  { face: '😌', word: 'steady' },
  { face: '😴', word: 'tired' },
  { face: '😟', word: 'worried' },
  { face: '😔', word: 'distant' },
  { face: '💛', word: 'tender' },
  { face: '😫', word: 'stressed' },
  { face: '😠', word: 'frustrated' },
  { face: '🤔', word: 'unsure' },
];
const CORE_COUNT = 5;

/* ───────────────────────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────────────────────── */
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function partOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

function seasonOf(d: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

function isEveningish(t: TimeOfDay): boolean {
  return t === 'evening' || t === 'night' || t === 'afternoon';
}

function greetingFor(t: TimeOfDay, name: string): string {
  switch (t) {
    case 'morning': return `Good morning, ${name}.`;
    case 'afternoon': return `Good afternoon, ${name}.`;
    case 'evening': return `Good evening, ${name}.`;
    case 'night': return `Still up, ${name}.`;
  }
}

function dateLine(d: Date, t: TimeOfDay): string {
  const wk = d.toLocaleDateString('en-US', { weekday: 'long' });
  const md = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const tod = t.charAt(0).toUpperCase() + t.slice(1);
  return `${wk} · ${md} · ${tod}`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function relativeWhen(d: Date | null): string {
  if (!d) return '';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const day = 86400000;
  if (diffMs < day) return 'today';
  if (diffMs < 2 * day) return 'yesterday';
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} days ago`;
  if (diffMs < 30 * day) return `${Math.floor(diffMs / (7 * day))} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ───────────────────────────────────────────────────────────────
   Style objects (typed CSSProperties so TS catches typos)
   ─────────────────────────────────────────────────────────────── */
const sx = {
  app: {
    minHeight: '100vh',
    background: T.cream,
    color: T.ink,
    fontFamily: T.serif,
  } as CSSProperties,
  page: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '212px 28px 80px',
  } as CSSProperties,
  /* Fixed banner — seasonal image band + paper strip with wordmark/name. */
  banner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  } as CSSProperties,
  bannerImage: {
    height: 140,
    backgroundSize: 'cover',
    backgroundPosition: 'center 38%',
    backgroundRepeat: 'no-repeat',
    borderBottom: `1px solid ${T.ruleSoft}`,
  } as CSSProperties,
  bannerStrip: {
    background: T.paper,
    borderBottom: `1px solid ${T.ruleSoft}`,
    display: 'flex',
    alignItems: 'center',
  } as CSSProperties,
  bannerInner: {
    width: '100%',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  } as CSSProperties,
  wordmark: {
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: 22,
    letterSpacing: '-0.01em',
    color: T.ink,
    textDecoration: 'none',
  } as CSSProperties,
  who: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: T.text4,
  } as CSSProperties,
  whoPip: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: T.sage,
  } as CSSProperties,

  greetingBlock: {
    paddingTop: 80,
    paddingBottom: 32,
  } as CSSProperties,
  greeting: {
    fontFamily: T.serif,
    fontWeight: 400,
    fontSize: 'clamp(32px, 5vw, 36px)',
    lineHeight: 1.05,
    letterSpacing: '-0.018em',
    color: T.ink,
    margin: '0 0 12px',
  } as CSSProperties,
  greetingEm: { fontStyle: 'italic' } as CSSProperties,
  dateline: {
    fontFamily: T.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: T.text4,
    opacity: 0.78,
    margin: 0,
  } as CSSProperties,

  eyebrow: {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: T.text5,
    opacity: 0.85,
    margin: '0 0 12px',
  } as CSSProperties,

  card: {
    background: T.paper,
    border: `1px solid ${T.rule}`,
    borderRadius: 12,
    padding: '24px 24px 20px',
    transition: `box-shadow 200ms ${T.ease}, background 240ms ${T.ease}`,
  } as CSSProperties,
  cardWarm: {
    boxShadow: '0 1px 2px rgba(60,50,40,0.04), 0 8px 24px rgba(201,168,76,0.08)',
  } as CSSProperties,

  ckPrompt: {
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: 17,
    color: T.ink,
    margin: '0 0 10px',
  } as CSSProperties,

  withRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    margin: '16px 0 10px',
  } as CSSProperties,
  withLabel: {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: T.text5,
    flexShrink: 0,
  } as CSSProperties,
  personTabs: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  } as CSSProperties,

  pills: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  } as CSSProperties,

  extraRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  } as CSSProperties,
  extra: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontSize: 16,
    color: T.ink,
    padding: '6px 0',
    borderBottom: `1px solid ${T.ruleSoft}`,
    transition: `border-color 140ms ${T.ease}`,
  } as CSSProperties,

  moments: { margin: 0, padding: 0, listStyle: 'none' } as CSSProperties,
  momentBody: {
    fontFamily: T.serif,
    fontSize: 17,
    color: T.inkSoft,
    transition: `color 140ms ${T.ease}`,
  } as CSSProperties,
  momentArrow: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: T.text5,
    transition: `transform 160ms ${T.ease}, color 140ms ${T.ease}`,
  } as CSSProperties,

  timeline: { margin: 0, padding: 0, listStyle: 'none' } as CSSProperties,
  tlMeta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: T.text5,
    marginBottom: 6,
  } as CSSProperties,
  tlBullet: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: T.ember,
  } as CSSProperties,
  tlQuote: {
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 1.5,
    color: T.ink,
    margin: 0,
  } as CSSProperties,

  write: {
    padding: '24px 22px 18px',
    background: T.paper,
    border: `1px solid ${T.ruleStrong}`,
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(60,50,40,0.04), 0 4px 14px rgba(60,50,40,0.04)',
    transition: `border-color 160ms ${T.ease}, box-shadow 160ms ${T.ease}`,
  } as CSSProperties,
  writeNudge: {
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: T.text4,
    margin: '0 0 10px',
  } as CSSProperties,
  writeTextarea: {
    width: '100%',
    minHeight: 200,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    resize: 'none' as const,
    overflow: 'hidden',
    fontFamily: T.serif,
    fontSize: 18,
    lineHeight: 1.6,
    color: T.ink,
    display: 'block',
  } as CSSProperties,
  writeFoot: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTop: `1px solid ${T.ruleSoft}`,
  } as CSSProperties,
  whoSees: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: T.text4,
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 999,
    border: `1px solid ${T.ruleSoft}`,
    background: 'transparent',
    transition: `all 140ms ${T.ease}`,
  } as CSSProperties,
  save: {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: T.paper,
    background: T.leather,
    border: `1px solid ${T.leather}`,
    padding: '10px 20px',
    borderRadius: 999,
    cursor: 'pointer',
    transition: `transform 140ms ${T.ease}, background 140ms ${T.ease}, filter 140ms ${T.ease}`,
  } as CSSProperties,

  tail: {
    marginTop: 56,
    textAlign: 'center' as const,
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: T.text5,
  } as CSSProperties,
  tailLink: {
    color: T.text4,
    textDecoration: 'none',
    borderBottom: `1px solid ${T.rule}`,
    paddingBottom: 2,
  } as CSSProperties,
};

/* ───────────────────────────────────────────────────────────────
   Sub-components
   ─────────────────────────────────────────────────────────────── */

function PersonTab({
  name,
  on,
  onClick,
}: {
  name: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        border: `1px solid ${on ? T.leather : T.ruleSoft}`,
        background: on ? T.leather : 'transparent',
        fontFamily: T.sans,
        fontSize: 12,
        fontWeight: 500,
        color: on ? T.paper : T.text3,
        cursor: 'pointer',
        transition: `all 140ms ${T.ease}`,
      }}
    >
      {name}
    </button>
  );
}

/* ─── Pill: text primary, emoji a quiet accent. Dims when something
       else is selected and this one isn't (selection-gravity). ─── */
function Pill({
  face,
  word,
  on,
  dim,
  onClick,
}: {
  face: string;
  word: string;
  on: boolean;
  dim: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        background: on ? T.warmTint : T.cream,
        border: `1px solid ${on ? T.amber : T.ruleSoft}`,
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: 500,
        color: on ? T.ink : T.text3,
        cursor: 'pointer',
        opacity: dim ? 0.45 : 1,
        transform: on ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 200ms ease-out, transform 140ms ease-out, background 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out',
      }}
    >
      <span>{word}</span>
      <span
        aria-hidden="true"
        style={{
          fontSize: 13,
          lineHeight: 1,
          opacity: on ? 1 : 0.7,
          marginLeft: 2,
        }}
      >
        {face}
      </span>
    </button>
  );
}

/* ─── PillGroup: core-five up front, "More…" reveals the rest inline.
       Selection-gravity applied to unselected pills once any are on. ─── */
function PillGroup({
  options,
  selected,
  onToggle,
  ariaLabel,
}: {
  options: Feeling[];
  selected: string[];
  onToggle: (word: string) => void;
  ariaLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const core = options.slice(0, CORE_COUNT);
  const more = options.slice(CORE_COUNT);
  const visible = expanded ? options : core;
  const anySelected = selected.length > 0;

  // If any selected feeling lives in the "more" set, auto-expand so the
  // user sees their selection without hunting for it.
  useEffect(() => {
    if (!expanded && selected.some((w) => more.some((o) => o.word === w))) {
      setExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
    >
      {visible.map((f) => {
        const on = selected.includes(f.word);
        return (
          <Pill
            key={f.word}
            face={f.face}
            word={f.word}
            on={on}
            dim={anySelected && !on}
            onClick={() => onToggle(f.word)}
          />
        );
      })}
      {more.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: T.text5,
            padding: '8px 8px',
          }}
        >
          {expanded ? 'Show fewer' : 'More…'}
        </button>
      )}
    </div>
  );
}

function MomentRow({
  name,
  featured,
  dim,
  done,
  href,
}: {
  name: string;
  featured: boolean;
  dim: boolean;
  done: boolean;
  href: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <li>
      <Link
        href={href}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 12px',
          margin: '0 -12px',
          borderBottom: `1px solid ${T.ruleSoft}`,
          borderRadius: 4,
          textDecoration: 'none',
          color: 'inherit',
          background: featured
            ? T.warmRow2
            : hover
              ? T.warmRow
              : 'transparent',
          opacity: done ? 0.55 : dim ? 0.78 : 1,
          transition: `background 160ms ${T.ease}, opacity 200ms ${T.ease}`,
        }}
      >
        <span style={{ ...sx.momentBody, color: hover || featured ? T.ink : T.inkSoft }}>
          {done && (
            <span
              aria-hidden="true"
              style={{
                color: T.sageDeep,
                marginRight: 8,
                fontSize: 14,
              }}
            >
              ✓
            </span>
          )}
          A moment with <em style={{ color: T.ink, fontStyle: 'italic' }}>{name}</em>
          {done && (
            <span
              style={{
                marginLeft: 10,
                fontFamily: T.sans,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: T.sageDeep,
              }}
            >
              done
            </span>
          )}
        </span>
        <span
          style={{
            ...sx.momentArrow,
            color: hover ? T.ink : T.text5,
            transform: hover ? 'translateX(4px)' : 'translateX(0)',
          }}
        >
          {done ? 'Open again →' : 'Open →'}
        </span>
      </Link>
    </li>
  );
}

/* ───────────────────────────────────────────────────────────────
   Main component
   ─────────────────────────────────────────────────────────────── */
export function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const { createEntry, saving } = useJournal();
  const { entries: allEntries } = useJournalEntries();
  const { people } = usePerson();
  const privacyLock = usePrivacyLock();

  const today = useMemo(() => new Date(), []);
  const tod = partOfDay(today);
  const evening = isEveningish(tod);

  const firstName = user?.name?.split(' ')[0] ?? 'friend';
  const greeting = greetingFor(tod, firstName);

  // Family roster (excluding self)
  const family = useMemo(
    () => people.filter((p) => p.linkedUserId !== user?.userId),
    [people, user?.userId],
  );
  const kids = useMemo(
    () => family.filter((p) => p.relationshipType === 'child'),
    [family],
  );
  // Person tabs include all family + group options
  const tabNames = useMemo(() => {
    const names = family.map((p) => p.name);
    return [...names, 'the kids', 'the family'];
  }, [family]);

  // Selection state — multi-select
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selfFeelings, setSelfFeelings] = useState<string[]>([]);
  const [relFeelings, setRelFeelings] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Visibility picker — same presets as CaptureSheet (just-me / partner / family).
  // Default to 'just-me' on a fresh load; remembered default would slot in here.
  type VisibilityPreset = 'just-me' | 'partner' | 'family';
  const [visibility, setVisibility] = useState<VisibilityPreset>('just-me');
  const [visOpen, setVisOpen] = useState(false);
  const visRef = useRef<HTMLDivElement>(null);

  // Writing-as picker — defaults to 'self' (you), can switch to a
  // child for parent-on-behalf-of-kid entries (subjectType=child_proxy).
  // The about + visible-to chips also live here so the writing area
  // has full per-entry parity with CaptureSheet/the mock.
  const [writingAsId, setWritingAsId] = useState<string | null>(null); // null = self
  const [asOpen, setAsOpen] = useState(false);
  const asRef = useRef<HTMLDivElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDivElement>(null);

  const writingAsLabel = useMemo(() => {
    if (!writingAsId) return 'You';
    return family.find((p) => p.personId === writingAsId)?.name.split(' ')[0] ?? 'You';
  }, [writingAsId, family]);
  const aboutLabel = useMemo(() => {
    if (selectedNames.length === 0) return 'no one';
    if (selectedNames.length === 1) return selectedNames[0];
    if (selectedNames.length === 2) return `${selectedNames[0]} & ${selectedNames[1]}`;
    return `${selectedNames.length} people`;
  }, [selectedNames]);

  // PIN-gate state — shows PinSetupModal on first private save without a PIN.
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Local draft — anything the user has typed/picked but not yet saved.
  // Persists in localStorage with a short debounce so a reload, tab
  // close, or accidental nav doesn't lose work. Cleared after a
  // successful save. The indicator below the Save button tells the
  // user when a draft has been saved locally.
  const DRAFT_KEY = 'jh-draft:v1';
  const [draftIndicator, setDraftIndicator] = useState<'idle' | 'saved'>('idle');
  const draftHydrated = useRef(false);

  // Kids who've already had a check-in this browser session — read
  // from sessionStorage. Refreshes when the tab regains focus so
  // returning from /kid/[id] picks up the new state without a manual
  // reload.
  const [kidsDoneThisSession, setKidsDoneThisSession] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        const raw = sessionStorage.getItem('kid-mode:done');
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        setKidsDoneThisSession(Array.isArray(ids) ? ids : []);
      } catch {
        setKidsDoneThisSession([]);
      }
    };
    read();
    document.addEventListener('visibilitychange', read);
    window.addEventListener('focus', read);
    return () => {
      document.removeEventListener('visibilitychange', read);
      window.removeEventListener('focus', read);
    };
  }, []);

  // Share candidates = adult family members with linked accounts (excludes self).
  const shareCandidates = useMemo(
    () => family.filter((p) => Boolean(p.linkedUserId)).map((p) => ({
      userId: p.linkedUserId as string,
      name: p.name,
    })),
    [family],
  );
  const partner = shareCandidates[0] ?? null;

  // Close popovers on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (visOpen && visRef.current && !visRef.current.contains(t)) setVisOpen(false);
      if (asOpen && asRef.current && !asRef.current.contains(t)) setAsOpen(false);
      if (aboutOpen && aboutRef.current && !aboutRef.current.contains(t)) setAboutOpen(false);
    };
    if (visOpen || asOpen || aboutOpen) {
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }
  }, [visOpen, asOpen, aboutOpen]);

  // Hydrate any in-progress draft from localStorage on first mount.
  // This MUST run before the "pre-select default person" effect, so
  // any saved selectedNames in the draft win over the default.
  useEffect(() => {
    if (draftHydrated.current) return;
    draftHydrated.current = true;
    try {
      const raw = window.localStorage?.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        text?: string;
        selfFeelings?: string[];
        relFeelings?: string[];
        selectedNames?: string[];
      };
      if (typeof draft.text === 'string') setText(draft.text);
      if (Array.isArray(draft.selfFeelings)) setSelfFeelings(draft.selfFeelings);
      if (Array.isArray(draft.relFeelings)) setRelFeelings(draft.relFeelings);
      if (Array.isArray(draft.selectedNames)) setSelectedNames(draft.selectedNames);
    } catch {
      // localStorage disabled or corrupted; not fatal.
    }
  }, []);

  // Persist draft on any change. Debounced so we don't pummel
  // localStorage on every keystroke. Shows a brief "Draft saved
  // locally" indicator so the user can trust the autosave.
  useEffect(() => {
    if (!draftHydrated.current) return;
    const t = setTimeout(() => {
      try {
        const draft = { text, selfFeelings, relFeelings, selectedNames };
        // Skip the write entirely if the draft is empty — keeps
        // localStorage clean for fresh-load users.
        const empty =
          !text.trim() &&
          selfFeelings.length === 0 &&
          relFeelings.length === 0;
        if (empty) {
          window.localStorage?.removeItem(DRAFT_KEY);
          setDraftIndicator('idle');
        } else {
          window.localStorage?.setItem(DRAFT_KEY, JSON.stringify(draft));
          setDraftIndicator('saved');
        }
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(t);
  }, [text, selfFeelings, relFeelings, selectedNames]);

  // Pre-select a default person if none picked once family loads.
  // Morning → first kid (if any). Evening → first non-kid adult (partner).
  useEffect(() => {
    if (selectedNames.length === 0 && family.length > 0) {
      const candidate = evening
        ? family.find((p) => p.relationshipType !== 'child')?.name
        : kids[0]?.name;
      if (candidate) setSelectedNames([candidate]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.length]);

  const toggleSelected = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };
  const toggleSelfFeel = (word: string) => {
    setSelfFeelings((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  };
  const toggleRelFeel = (word: string) => {
    setRelFeelings((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  };

  // Joined names for prompt copy
  const joined = joinNames(selectedNames);

  // Selected kids → which moment rows feature, in markup order
  const selectedKidNames = useMemo(
    () => selectedNames.filter((n) => kids.some((k) => k.name === n)),
    [selectedNames, kids],
  );

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, [text]);

  // Recent entries for the timeline (top 3 visible at decreasing opacity)
  const recent = useMemo(() => allEntries.slice(0, 3), [allEntries]);

  // ────────── "Small thing" nudge ──────────
  // Quietest possible pattern-driven suggestion. v1 picks the kid who's
  // had the longest gap since the last entry mentioning them — only
  // shown if the gap is > 5 days, so the nudge feels meaningful, not
  // naggy. Future: layer in waiting open-thread, recently-stressed
  // relationships, etc. — using the structured checkIn field.
  const nudge = useMemo<{ name: string } | null>(() => {
    if (kids.length === 0 || allEntries.length === 0) return null;
    const now = Date.now();
    const gaps = kids.map((k) => {
      // First (most recent) entry mentioning this kid
      const last = allEntries.find((e) => e.personMentions?.includes(k.personId));
      const lastTime = last?.createdAt?.toMillis?.() ?? 0;
      const daysSince = lastTime > 0 ? (now - lastTime) / 86400000 : Infinity;
      return { kid: k, daysSince };
    });
    gaps.sort((a, b) => b.daysSince - a.daysSince);
    const top = gaps[0];
    if (!top || top.daysSince < 5) return null;
    return { name: top.kid.name };
  }, [kids, allEntries]);

  const hasAnyContent =
    text.trim().length > 0 ||
    selfFeelings.length > 0 ||
    (relFeelings.length > 0 && selectedNames.length > 0);

  // Resolve visibility preset → sharedWithUserIds
  const resolveSharedWithUserIds = (): string[] => {
    if (visibility === 'just-me') return [];
    if (visibility === 'partner' && partner) return [partner.userId];
    if (visibility === 'family') return shareCandidates.map((c) => c.userId);
    return [];
  };

  const handleSave = async () => {
    if (!hasAnyContent || saving) return;

    // PIN-gate: if going private and no PIN set yet, prompt setup first.
    const goingPrivate = visibility === 'just-me';
    if (goingPrivate && !privacyLock.loading && !privacyLock.pinIsSet) {
      setPendingSave(true);
      setShowPinSetup(true);
      return;
    }

    setError(null);
    try {
      const selectedPersonIds = selectedNames
        .map((n) => family.find((p) => p.name === n)?.personId)
        .filter((id): id is string => Boolean(id));

      const parts: string[] = [];
      if (text.trim()) parts.push(text.trim());
      if (selfFeelings.length > 0) {
        parts.push(`[${tod} check-in: ${selfFeelings.join(', ')}]`);
      }
      if (relFeelings.length > 0 && selectedNames.length > 0) {
        parts.push(`[about ${joinNames(selectedNames)}: ${relFeelings.join(', ')}]`);
      }
      const body = parts.join('\n\n');
      if (!body) return;

      const tags = [
        'journal-first',
        ...(selfFeelings.length ? [`feel-self:${selfFeelings.join(',')}`] : []),
        ...(relFeelings.length ? [`feel-rel:${relFeelings.join(',')}`] : []),
        ...(selectedNames.length ? [`with:${selectedNames.join(',')}`] : []),
      ];

      // Structured payload — duplicates what's in tags, but shaped so
      // the synthesis layer can query without parsing strings.
      const groupKey: 'kids' | 'family' | null =
        selectedNames.includes('the family')
          ? 'family'
          : selectedNames.includes('the kids')
            ? 'kids'
            : null;
      const realPersonNames = selectedNames.filter(
        (n) => n !== 'the family' && n !== 'the kids',
      );
      const realPersonIds = realPersonNames
        .map((n) => family.find((p) => p.name === n)?.personId)
        .filter((id): id is string => Boolean(id));

      const checkIn = (selfFeelings.length > 0 || relFeelings.length > 0)
        ? {
            kind: (relFeelings.length > 0 ? 'self+rel' : 'self') as 'self' | 'self+rel',
            timeOfDay: tod,
            selfFeelings,
            ...(relFeelings.length > 0 ? { relFeelings } : {}),
            ...(realPersonIds.length > 0 ? { withPersonIds: realPersonIds } : {}),
            ...(groupKey ? { withGroupKey: groupKey } : {}),
          }
        : undefined;

      // If "writing as" is set to a child, the entry is a parent
      // proxy (same model CaptureSheet uses for kid entries from
      // adult sessions).
      const writingAsChild = writingAsId && family.find((p) => p.personId === writingAsId);
      const proxyMention = writingAsChild ? [writingAsId] : [];
      const allMentions = Array.from(new Set([...selectedPersonIds, ...proxyMention]));

      const entryId = await createEntry({
        text: body,
        category: 'reflection',
        personMentions: allMentions,
        sharedWithUserIds: resolveSharedWithUserIds(),
        tags,
        ...(writingAsChild
          ? { subjectType: 'child_proxy' as const, subjectPersonId: writingAsId }
          : { subjectType: 'self' as const }),
        ...(checkIn ? { checkIn } : {}),
      });

      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1100);
      // Reset state but stay on page — user can keep going
      setText('');
      setSelfFeelings([]);
      setRelFeelings([]);
      // Saved → draft is no longer needed.
      try { window.localStorage?.removeItem(DRAFT_KEY); } catch {}
      setDraftIndicator('idle');
      // Optional: navigate to the entry detail
      // router.push(`/journal/${entryId}`);
      void entryId;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // ─── Render ───
  const selfFeelings_def = evening ? FEELINGS_SELF_EVENING : FEELINGS_SELF_MORNING;
  const writeNudgeText =
    selectedNames.length === 0
      ? <em>Whoever&rsquo;s on your mind.</em>
      : <>About <em style={{ color: T.text3, fontStyle: 'italic' }}>{joined}</em>, maybe.</>;
  const relPromptText =
    selectedNames.length === 0
      ? <span style={{ color: T.text5 }}>Pick who, above.</span>
      : <>How are things with <em style={{ fontStyle: 'italic' }}>{joined}</em>?</>;
  const writePrompt = evening
    ? <em style={{ color: T.ink, fontStyle: 'italic' }}>What&rsquo;s worth keeping from today?</em>
    : null;

  return (
    <main style={sx.app}>

      {/* Fixed banner — seasonal image band + thin paper strip. No
          functionality; visual anchor only. */}
      <header style={sx.banner}>
        <div
          style={{
            ...sx.bannerImage,
            backgroundImage: `linear-gradient(180deg, rgba(20,16,12,0.15) 0%, rgba(20,16,12,0) 40%, rgba(245,240,232,0.35) 82%, rgba(245,240,232,0.62) 100%), url('${mastheadImageFor(seasonOf(today))}')`,
          }}
          aria-hidden="true"
        />
        <div style={sx.bannerStrip}>
          <div style={sx.bannerInner}>
            <Link href="/" style={sx.wordmark}>Relish</Link>
            <span style={sx.who}>
              <span style={sx.whoPip} />
              {firstName}
            </span>
          </div>
        </div>
      </header>

      <div style={sx.page}>

        {/* Greeting */}
        <section style={sx.greetingBlock}>
          <h1 style={sx.greeting}>
            {greeting.split(', ')[0]}, <em style={sx.greetingEm}>{firstName}.</em>
          </h1>
          <p style={sx.dateline}>{dateLine(today, tod)}</p>
        </section>

        {/* Unified check-in card */}
        <section style={{ marginTop: 28 }}>
          <p style={sx.eyebrow}>Your check-in</p>
          <div style={{ ...sx.card, ...((selfFeelings.length + relFeelings.length) > 0 ? sx.cardWarm : {}) }}>
            <p style={sx.ckPrompt}>
              {evening ? 'How is the day landing?' : 'How are you arriving?'}
            </p>
            <PillGroup
              ariaLabel="How you're arriving"
              options={selfFeelings_def}
              selected={selfFeelings}
              onToggle={toggleSelfFeel}
            />

            {tabNames.length > 0 && (
              <div style={sx.withRow}>
                <span style={sx.withLabel}>With:</span>
                <div style={sx.personTabs}>
                  {tabNames.map((n) => (
                    <PersonTab
                      key={n}
                      name={n}
                      on={selectedNames.includes(n)}
                      onClick={() => toggleSelected(n)}
                    />
                  ))}
                </div>
              </div>
            )}

            <p style={sx.ckPrompt}>{relPromptText}</p>
            <PillGroup
              ariaLabel="How the relationship feels"
              options={FEELINGS_REL}
              selected={relFeelings}
              onToggle={toggleRelFeel}
            />

          </div>
        </section>

        {/* "Small thing" nudge — only when warranted, never streaks/guilt. */}
        {nudge && (
          <section style={{ marginTop: 32 }}>
            <p style={sx.eyebrow}>A small thing</p>
            <div
              style={{
                padding: '14px 18px',
                background: T.paperWarm,
                border: `1px solid rgba(201,134,76,0.18)`,
                borderLeft: `2px solid ${T.ember}`,
                borderRadius: 6,
                fontFamily: T.serif,
                fontStyle: 'italic',
                fontSize: 16,
                color: T.inkSoft,
              }}
            >
              <em style={{ color: T.ink, fontStyle: 'italic' }}>{nudge.name}</em> hasn&rsquo;t had a moment in a while.
            </div>
          </section>
        )}

        {/* "A moment is there" — visible at all times of day so kid
            mode is reachable in evening too. The moment-with-X rows
            are the primary way to enter kid mode for a child. */}
        {kids.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <p style={sx.eyebrow}>A moment is there</p>
            <ul style={sx.moments}>
              {/* Featured kids (in markup order), then non-featured */}
              {[
                ...kids.filter((k) => selectedKidNames.includes(k.name)),
                ...kids.filter((k) => !selectedKidNames.includes(k.name)),
              ].map((k) => (
                <MomentRow
                  key={k.personId}
                  name={k.name}
                  featured={selectedKidNames.includes(k.name)}
                  dim={selectedKidNames.length > 0 && !selectedKidNames.includes(k.name)}
                  done={kidsDoneThisSession.includes(k.personId)}
                  href={`/kid/${k.personId}`}
                />
              ))}
            </ul>
          </section>
        )}

        {/* Timeline of recent entries */}
        {recent.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <p style={sx.eyebrow}>{evening ? 'What happened today' : 'What came in'}</p>
            <ul style={sx.timeline}>
              {recent.map((entry, i) => {
                const opacity = i === 0 ? 1 : i === 1 ? 0.85 : 0.7;
                const when = entry.createdAt?.toDate?.() ?? null;
                const author = entry.authorId === user?.userId
                  ? 'You'
                  : people.find((p) => p.linkedUserId === entry.authorId)?.name ?? 'Someone';
                return (
                  <li key={entry.entryId} style={{ marginBottom: 14, opacity }}>
                    <Link
                      href={`/journal/${entry.entryId}`}
                      style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <span style={sx.tlMeta}>
                        <span style={sx.tlBullet} />
                        {author} · {relativeWhen(when)}
                      </span>
                      <p style={sx.tlQuote}>
                        &ldquo;{(entry.text || '').slice(0, 180)}
                        {(entry.text || '').length > 180 ? '…' : ''}&rdquo;
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Ask the book — one chip per family member. Routes into the
            existing /coach surface with personId so the AI is scoped
            to that person's entries + manual. */}
        {family.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <p style={sx.eyebrow}>Ask the book</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {family.map((p) => {
                const first = p.name.split(' ')[0];
                return (
                  <Link
                    key={p.personId}
                    href={`/coach?personId=${p.personId}&name=${encodeURIComponent(first)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      borderRadius: 999,
                      border: `1px solid ${T.ruleSoft}`,
                      background: T.paper,
                      textDecoration: 'none',
                      color: T.ink,
                      fontFamily: T.serif,
                      fontSize: 16,
                      transition: `border-color 140ms ${T.ease}, background 140ms ${T.ease}`,
                    }}
                  >
                    About <em style={{ fontStyle: 'italic' }}>{first}</em>
                    <span
                      style={{
                        fontFamily: T.sans,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: T.text5,
                        marginLeft: 2,
                      }}
                    >
                      Ask →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Writing area */}
        <section style={{ marginTop: 56 }}>
          <p style={sx.eyebrow}>
            {evening ? 'Write' : 'If you want to put something down'}
          </p>
          <div style={sx.write}>
            {writePrompt && (
              <p
                style={{
                  fontFamily: T.serif,
                  fontStyle: 'italic',
                  fontSize: 17,
                  color: T.text4,
                  margin: '0 0 8px',
                }}
              >
                {writePrompt}
              </p>
            )}
            <p style={sx.writeNudge}>{writeNudgeText}</p>
            <div style={{ position: 'relative' }}>
              <textarea
                ref={taRef}
                style={sx.writeTextarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={evening
                  ? "The cursor is here. Write whatever — a line, a paragraph, a thing that happened."
                  : "Just a line, if it's there."}
              />
              {/* Voice mic — sits in the bottom-right of the textarea so
                  it doesn't crowd the writing surface but is always within
                  reach. Tap, speak, the transcript appends to the text. */}
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ pointerEvents: 'auto' }}>
                  <MicButton
                    size="sm"
                    onTranscript={(transcript) => {
                      const t = transcript.trim();
                      if (!t) return;
                      setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t));
                      taRef.current?.focus();
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ ...sx.writeFoot, gap: 8, flexWrap: 'wrap' }}>
              {/* As — defaults to "You". Switch to a child for parent-
                  on-behalf-of-kid entries (CaptureSheet's child-proxy). */}
              <div ref={asRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={sx.whoSees}
                  onClick={() => { setAsOpen((v) => !v); setVisOpen(false); setAboutOpen(false); }}
                  aria-expanded={asOpen}
                  aria-haspopup="menu"
                >
                  As · {writingAsLabel} ▾
                </button>
                {asOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 6px)',
                      left: 0,
                      minWidth: 200,
                      background: T.paper,
                      border: `1px solid ${T.rule}`,
                      borderRadius: 8,
                      boxShadow: '0 4px 18px rgba(60,50,40,0.10)',
                      padding: 4,
                      zIndex: 60,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setWritingAsId(null); setAsOpen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 12px', border: 'none',
                        background: writingAsId === null ? T.warmRow2 : 'transparent',
                        borderRadius: 6, cursor: 'pointer',
                        fontFamily: T.serif, fontSize: 16, color: T.ink,
                      }}
                    >
                      Yourself
                      <span style={{ display: 'block', marginTop: 2, fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text5 }}>
                        {firstName}
                      </span>
                    </button>
                    {kids.length === 0 && (
                      <p style={{ padding: '10px 12px', margin: 0, fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: T.text5 }}>
                        Add a child in <Link href="/manual" style={{ color: T.ink }}>People</Link> to write on their behalf.
                      </p>
                    )}
                    {kids.map((c) => (
                      <button
                        key={c.personId}
                        type="button"
                        onClick={() => { setWritingAsId(c.personId); setAsOpen(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 12px', border: 'none',
                          background: writingAsId === c.personId ? T.warmRow2 : 'transparent',
                          borderRadius: 6, cursor: 'pointer',
                          fontFamily: T.serif, fontSize: 16, color: T.ink,
                        }}
                      >
                        {c.name}
                        <span style={{ display: 'block', marginTop: 2, fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text5 }}>
                          writing on their behalf
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* About — same multi-select as the With: tabs above; this
                  chip is just a second access point for the same state. */}
              <div ref={aboutRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={sx.whoSees}
                  onClick={() => { setAboutOpen((v) => !v); setVisOpen(false); setAsOpen(false); }}
                  aria-expanded={aboutOpen}
                  aria-haspopup="menu"
                >
                  About · {aboutLabel} ▾
                </button>
                {aboutOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 6px)',
                      left: 0,
                      minWidth: 200,
                      background: T.paper,
                      border: `1px solid ${T.rule}`,
                      borderRadius: 8,
                      boxShadow: '0 4px 18px rgba(60,50,40,0.10)',
                      padding: 4,
                      zIndex: 60,
                    }}
                  >
                    {tabNames.length === 0 && (
                      <p style={{ padding: '10px 12px', margin: 0, fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: T.text5 }}>
                        No one in your family yet — add someone in <Link href="/manual" style={{ color: T.ink }}>People</Link>.
                      </p>
                    )}
                    {tabNames.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleSelected(n)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          background: selectedNames.includes(n) ? T.warmRow2 : 'transparent',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontFamily: T.serif,
                          fontSize: 16,
                          color: T.ink,
                        }}
                      >
                        <span>{n}</span>
                        <span style={{ color: T.sageDeep }}>
                          {selectedNames.includes(n) ? '✓' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility picker — opens a small popover with the three presets. */}
              <div ref={visRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={sx.whoSees}
                  onClick={() => { setVisOpen((v) => !v); setAsOpen(false); setAboutOpen(false); }}
                  aria-expanded={visOpen}
                  aria-haspopup="menu"
                >
                  Visible to ·{' '}
                  {visibility === 'just-me'
                    ? 'Just you'
                    : visibility === 'partner' && partner
                      ? `You and ${partner.name.split(' ')[0]}`
                      : visibility === 'family'
                        ? `Family (${shareCandidates.length})`
                        : 'Just you'}
                  {' '}▾
                </button>
                {visOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 6px)',
                      left: 0,
                      minWidth: 220,
                      background: T.paper,
                      border: `1px solid ${T.rule}`,
                      borderRadius: 8,
                      boxShadow: '0 4px 18px rgba(60,50,40,0.10)',
                      padding: 4,
                      zIndex: 60,
                    }}
                  >
                    {[
                      { key: 'just-me' as const, label: 'Just you', meta: 'private — only you read this' },
                      ...(partner ? [{ key: 'partner' as const, label: `You and ${partner.name.split(' ')[0]}`, meta: 'both of you read it' }] : []),
                      ...(shareCandidates.length > 0 ? [{ key: 'family' as const, label: `Family (${shareCandidates.length})`, meta: shareCandidates.map((c) => c.name.split(' ')[0]).join(', ') }] : []),
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => { setVisibility(opt.key); setVisOpen(false); }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          border: 'none',
                          background: visibility === opt.key ? T.warmRow2 : 'transparent',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontFamily: T.serif,
                          fontSize: 16,
                          color: T.ink,
                        }}
                      >
                        <span style={{ display: 'block' }}>{opt.label}</span>
                        <span
                          style={{
                            display: 'block',
                            marginTop: 2,
                            fontFamily: T.sans,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: T.text5,
                          }}
                        >
                          {opt.meta}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasAnyContent || saving}
                style={{
                  ...sx.save,
                  background: showSaved ? T.sageDeep : T.leather,
                  borderColor: showSaved ? T.sageDeep : T.leather,
                  opacity: !hasAnyContent || saving ? 0.5 : 1,
                  cursor: !hasAnyContent || saving ? 'default' : 'pointer',
                }}
              >
                {showSaved ? 'Saved' : saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {/* Plain-language explainer + draft indicator. The
                explainer makes the unified-card behavior obvious
                (everything saves together); the indicator tells the
                user their work is safe across reloads. */}
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: T.serif,
                fontStyle: 'italic',
                fontSize: 13,
                color: T.text5,
              }}
            >
              <span>
                Your check-in, this line, and the writing all save together.
              </span>
              {draftIndicator === 'saved' && !showSaved && (
                <span
                  style={{
                    fontFamily: T.sans,
                    fontStyle: 'normal',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: T.sage,
                    paddingLeft: 12,
                    flexShrink: 0,
                  }}
                  title="Your draft is kept on this device until you save."
                >
                  Draft kept
                </span>
              )}
            </div>
            {error && (
              <p style={{ marginTop: 8, fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: '#8C4A3E' }}>
                {error}
              </p>
            )}
          </div>
        </section>

        {/* Tail link */}
        <p style={sx.tail}>
          <Link href="/archive" style={sx.tailLink}>Everything written ↗</Link>
        </p>

      </div>

      {/* PIN-gate: prompted on first private save without a configured PIN. */}
      {showPinSetup && (
        <PinSetupModal
          onComplete={async (pin) => {
            await privacyLock.setupPin(pin);
            setShowPinSetup(false);
            if (pendingSave) {
              setPendingSave(false);
              setTimeout(() => { void handleSave(); }, 0);
            }
          }}
          onCancel={() => {
            setShowPinSetup(false);
            setPendingSave(false);
          }}
        />
      )}
    </main>
  );
}
