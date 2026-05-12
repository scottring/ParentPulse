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
import { useSearchParams } from 'next/navigation';
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

/* Simplified single feeling vocabulary used on the journal home. */
const SIMPLE_FEELINGS = ['Grateful', 'Quiet', 'Tired', 'Connected', 'Reflective'] as const;

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

function dateLine(d: Date): string {
  const wk = d.toLocaleDateString('en-US', { weekday: 'long' });
  const md = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${wk}, ${md}`;
}

function dateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* Deterministic fallback illustration per kid when no avatarUrl is set —
   different kids get different images so the cards don't all look the same. */
const KID_FALLBACK_IMAGES = [
  '/illustrations/02-Parent-kid-eye-level.png',
  '/illustrations/06-child-journaling.png',
  '/illustrations/08-child-in-bed.png',
  '/illustrations/14-heart-speech-bubble.png',
] as const;

function kidFallbackImage(personId: string): string {
  let hash = 0;
  for (let i = 0; i < personId.length; i++) hash = (hash * 31 + personId.charCodeAt(i)) | 0;
  return KID_FALLBACK_IMAGES[Math.abs(hash) % KID_FALLBACK_IMAGES.length];
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
    padding: '28px 28px 80px',
  } as CSSProperties,
  /* Seasonal banner — image band only. The wordmark + user-menu
     strip moved to the global TopChrome (root layout), so this is
     now a static in-flow visual anchor at the top of the page. */
  banner: {
    position: 'relative',
  } as CSSProperties,
  bannerImage: {
    height: 140,
    backgroundSize: 'cover',
    backgroundPosition: 'center 38%',
    backgroundRepeat: 'no-repeat',
    borderBottom: `1px solid ${T.ruleSoft}`,
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

  write: {
    padding: '24px 22px 18px',
    background: T.paper,
    border: `1px solid ${T.ruleStrong}`,
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(60,50,40,0.04), 0 4px 14px rgba(60,50,40,0.04)',
    transition: `border-color 160ms ${T.ease}, box-shadow 160ms ${T.ease}`,
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
};

/* ───────────────────────────────────────────────────────────────
   Main component
   ─────────────────────────────────────────────────────────────── */
export function Home() {
  const { user } = useAuth();
  const { createEntry, saving } = useJournal();
  const { entries: allEntries } = useJournalEntries();
  const { people } = usePerson();
  const privacyLock = usePrivacyLock();
  const searchParams = useSearchParams();

  const today = useMemo(() => new Date(), []);
  const tod = partOfDay(today);

  const firstName = user?.name?.split(' ')[0] ?? 'friend';

  // Family roster (excluding self)
  const family = useMemo(
    () => people.filter((p) => p.linkedUserId !== user?.userId),
    [people, user?.userId],
  );
  const kids = useMemo(
    () => family.filter((p) => p.relationshipType === 'child'),
    [family],
  );
  // About-picker options — family members + group shortcuts.
  const tabNames = useMemo(() => {
    const names = family.map((p) => p.name);
    return [...names, 'the kids', 'the family'];
  }, [family]);

  // Selection state — multi-select
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selfFeelings, setSelfFeelings] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feelingsOpen, setFeelingsOpen] = useState(true);
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
  // returning from /check-in/[id] picks up the new state without a manual
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
  useEffect(() => {
    if (draftHydrated.current) return;
    draftHydrated.current = true;
    try {
      const raw = window.localStorage?.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        text?: string;
        selfFeelings?: string[];
        selectedNames?: string[];
      };
      if (typeof draft.text === 'string') setText(draft.text);
      if (Array.isArray(draft.selfFeelings)) setSelfFeelings(draft.selfFeelings);
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
        const draft = { text, selfFeelings, selectedNames };
        const empty = !text.trim() && selfFeelings.length === 0;
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
  }, [text, selfFeelings, selectedNames]);

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

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, [text]);

  // NEW ENTRY button (rail) routes here with ?focus=write. Focus the
  // textarea, then strip the query param so subsequent loads stay clean.
  useEffect(() => {
    if (searchParams?.get('focus') === 'write') {
      taRef.current?.focus();
      taRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  // Recent entries for the timeline (top 3 visible at decreasing opacity)
  const recent = useMemo(() => allEntries.slice(0, 3), [allEntries]);

  // Group recent entries into Recent Echoes — by subject: child → Self → Relationships.
  type EchoGroup = { label: string; entries: typeof recent };
  const echoGroups = useMemo<EchoGroup[]>(() => {
    const groups: Record<string, typeof recent> = {};
    for (const entry of recent) {
      const mentions = entry.personMentions ?? [];
      const firstChildMention = mentions.find((id) =>
        kids.some((k) => k.personId === id),
      );
      let key: string | null = null;
      if (firstChildMention) {
        const kid = kids.find((k) => k.personId === firstChildMention);
        key = `About ${kid?.name ?? 'a child'}`;
      } else if ((entry.subjectType ?? 'self') === 'self' && mentions.length === 0) {
        key = 'Self';
      } else if (mentions.length > 0) {
        key = 'Relationships';
      }
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }
    return Object.entries(groups).map(([label, entries]) => ({ label, entries }));
  }, [recent, kids]);

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
    text.trim().length > 0 || selfFeelings.length > 0;

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

      const tags = [
        'journal-first',
        ...(selfFeelings.length ? [`feel-self:${selfFeelings.join(',')}`] : []),
        ...(selectedNames.length ? [`with:${selectedNames.join(',')}`] : []),
      ];

      // Structured payload — feelings + targets live here. The body
      // text holds only what the user wrote; no need to mirror these
      // as bracket annotations.
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

      const checkIn = selfFeelings.length > 0
        ? {
            kind: 'self' as const,
            timeOfDay: tod,
            selfFeelings,
            ...(realPersonIds.length > 0 ? { withPersonIds: realPersonIds } : {}),
            ...(groupKey ? { withGroupKey: groupKey } : {}),
          }
        : undefined;

      // Body = user-written text only. Empty is fine if feelings are
      // picked — the structured checkIn alone is a valid entry.
      const body = text.trim();
      if (!body && !checkIn) return;

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

  return (
    <main style={sx.app}>

      {/* Seasonal image band — visual anchor at the top of the journal. */}
      <header style={sx.banner}>
        <div
          style={{
            ...sx.bannerImage,
            backgroundImage: `linear-gradient(180deg, rgba(20,16,12,0.15) 0%, rgba(20,16,12,0) 40%, rgba(245,240,232,0.35) 82%, rgba(245,240,232,0.62) 100%), url('${mastheadImageFor(seasonOf(today))}')`,
          }}
          aria-hidden="true"
        />
      </header>

      <div style={sx.page}>

        {/* Masthead — dateline · name · optional nudge subtitle. */}
        <section style={sx.greetingBlock}>
          <p style={sx.dateline}>{dateLine(today).toUpperCase()}</p>
          <h1 style={{ ...sx.greeting, fontStyle: 'normal', marginTop: 8 }}>
            {user?.name ?? firstName}
          </h1>
          {nudge && (
            <p style={{
              fontFamily: T.serif,
              fontStyle: 'italic',
              fontSize: 16,
              color: T.text4,
              margin: '6px 0 0',
            }}>
              {nudge.name} hasn&rsquo;t had a moment in a while
            </p>
          )}
        </section>

        {/* Writing card — the only card on this page. */}
        <section style={{ marginTop: 28 }}>
          <div style={sx.write}>
            <p style={{
              fontFamily: T.serif,
              fontStyle: 'italic',
              fontSize: 17,
              color: T.text4,
              margin: '0 0 12px',
            }}>
              What remains from today?
            </p>

            <div style={{ position: 'relative' }}>
              <textarea
                ref={taRef}
                style={sx.writeTextarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
              />
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
                      const tx = transcript.trim();
                      if (!tx) return;
                      setText((prev) => (prev.trim() ? `${prev.trim()} ${tx}` : tx));
                      taRef.current?.focus();
                    }}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: 0, borderTop: `1px solid ${T.ruleSoft}`, margin: '20px 0' }} aria-hidden />

            {/* Three pickers inline */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Writing-as picker */}
              <div ref={asRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={sx.whoSees}
                  onClick={() => { setAsOpen((v) => !v); setVisOpen(false); setAboutOpen(false); }}
                  aria-expanded={asOpen}
                  aria-haspopup="menu"
                >
                  Writing as · {writingAsLabel} ▾
                </button>
                {asOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
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

              {/* About picker */}
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
                      top: 'calc(100% + 6px)',
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

              {/* Visibility picker */}
              <div ref={visRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={sx.whoSees}
                  onClick={() => { setVisOpen((v) => !v); setAsOpen(false); setAboutOpen(false); }}
                  aria-expanded={visOpen}
                  aria-haspopup="menu"
                >
                  Who can see ·{' '}
                  {visibility === 'just-me'
                    ? 'Just me'
                    : visibility === 'partner' && partner
                      ? partner.name.split(' ')[0]
                      : visibility === 'family'
                        ? `Family (${shareCandidates.length})`
                        : 'Just me'}
                  {' '}▾
                </button>
                {visOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
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
                      { key: 'just-me' as const, label: 'Just me', meta: 'private — only you read this' },
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
            </div>

            <hr style={{ border: 0, borderTop: `1px solid ${T.ruleSoft}`, margin: '20px 0' }} aria-hidden />

            {/* Collapsible feelings */}
            <button
              type="button"
              onClick={() => setFeelingsOpen((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: T.text5,
              }}
              aria-expanded={feelingsOpen}
            >
              How are you feeling?
              <span aria-hidden style={{ marginLeft: 2 }}>{feelingsOpen ? '▾' : '▸'}</span>
            </button>
            {feelingsOpen && (
              <div
                role="group"
                aria-label="How are you feeling?"
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}
              >
                {SIMPLE_FEELINGS.map((f) => {
                  const on = selfFeelings.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleSelfFeel(f)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        background: on ? T.warmTint : 'transparent',
                        border: `1px solid ${on ? T.amber : T.ruleSoft}`,
                        fontFamily: T.sans,
                        fontSize: 13,
                        fontWeight: 500,
                        color: on ? T.ink : T.text3,
                        cursor: 'pointer',
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom-right Keep button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 20, gap: 12 }}>
              {draftIndicator === 'saved' && !showSaved && (
                <span
                  style={{
                    fontFamily: T.sans,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: T.sage,
                  }}
                  title="Your draft is kept on this device until you save."
                >
                  Draft kept
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasAnyContent || saving}
                style={{
                  ...sx.save,
                  padding: '10px 22px',
                  fontSize: 11,
                  background: showSaved ? T.sageDeep : T.leather,
                  borderColor: showSaved ? T.sageDeep : T.leather,
                  opacity: !hasAnyContent || saving ? 0.5 : 1,
                  cursor: !hasAnyContent || saving ? 'default' : 'pointer',
                }}
              >
                {showSaved ? 'KEPT' : saving ? 'KEEPING…' : 'KEEP'}
              </button>
            </div>
            {error && (
              <p style={{ marginTop: 8, fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: '#8C4A3E' }}>
                {error}
              </p>
            )}
          </div>
        </section>

        {/* Focusing On — one card per child, side-by-side. */}
        {kids.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: kids.length > 1 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
              gap: 20,
            }}>
              {kids.map((k) => {
                const done = kidsDoneThisSession.includes(k.personId);
                return (
                  <Link
                    key={k.personId}
                    href={`/check-in/${k.personId}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '20px 22px 0',
                      background: T.paper,
                      border: `1px solid ${T.ruleSoft}`,
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: 'inherit',
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: done ? 0.72 : 1,
                    }}
                  >
                    <span style={{
                      fontFamily: T.sans,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: T.text5,
                      marginBottom: 6,
                    }}>
                      Focusing on
                    </span>
                    <h3 style={{
                      fontFamily: T.serif,
                      fontSize: 22,
                      fontWeight: 500,
                      color: T.ink,
                      margin: '0 0 14px',
                    }}>
                      {k.name}
                    </h3>
                    <div
                      style={{
                        height: 140,
                        margin: '0 -22px',
                        backgroundImage: `url('${k.avatarUrl ?? kidFallbackImage(k.personId)}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      aria-hidden
                    />
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: 18,
                        right: 22,
                        fontFamily: T.sans,
                        fontSize: 14,
                        color: T.text5,
                      }}
                    >
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Echoes — flat list, no per-group headings. */}
        {echoGroups.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 18,
            }}>
              <h2 style={{
                fontFamily: T.serif,
                fontStyle: 'italic',
                fontSize: 22,
                fontWeight: 500,
                color: T.ink,
                margin: 0,
              }}>
                Recent Echoes
              </h2>
              <Link
                href="/archive"
                style={{
                  fontFamily: T.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: T.text4,
                  textDecoration: 'none',
                }}
              >
                View All
              </Link>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {echoGroups.flatMap((group) =>
                group.entries.map((entry) => {
                  const when = entry.createdAt?.toDate?.() ?? null;
                  const body = entry.text || '';
                  return (
                    <li key={entry.entryId} style={{ marginBottom: 22 }}>
                      <Link
                        href={`/journal/${entry.entryId}`}
                        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                      >
                        <p style={{
                          fontFamily: T.sans,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: T.text5,
                          margin: '0 0 6px',
                        }}>
                          {when ? dateShort(when) : ''} · {group.label}
                        </p>
                        <p style={{
                          fontFamily: T.serif,
                          fontSize: 16,
                          lineHeight: 1.5,
                          color: T.ink,
                          margin: 0,
                        }}>
                          {body.slice(0, 140)}{body.length > 140 ? '…' : ''}
                        </p>
                      </Link>
                    </li>
                  );
                }),
              )}
            </ul>
          </section>
        )}

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
