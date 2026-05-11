'use client';
/* ================================================================
   /check-in/[personId] — kid mode

   The parent-handoff screen. Adult opens the route from a "moment
   with [kid]" row, hands the screen to the kid, the kid taps emojis
   / talks / picks where in the body / optionally picks a relationship
   target — and hits "All done." The contribution saves as a journal
   entry attributed to the kid (subjectType='child_proxy').

   Mock: docs/journal-first-redesign/kid-mode.html v2.1
   ================================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { MicButton } from '@/components/voice/MicButton';
import { T } from '@/components/journal-first/tokens';
import { firestore } from '@/lib/firebase';
import type { CoupleRitual } from '@/types/couple-ritual';
import type { Person } from '@/types/person-manual';

/* ─── Vocabularies ─── */
const KID_FEELINGS_SELF = [
  { face: '😀', word: 'happy' },
  { face: '😢', word: 'sad' },
  { face: '😠', word: 'mad' },
  { face: '😟', word: 'worried' },
  { face: '😴', word: 'tired' },
  { face: '😌', word: 'calm' },
  { face: '🦁', word: 'brave' },
  { face: '🤪', word: 'silly' },
  { face: '🤫', word: 'quiet' },
  { face: '🤔', word: 'thinking' },
  { face: '🎉', word: 'excited' },
  { face: '💛', word: 'loved' },
];
const KID_FEELINGS_REL = [
  { face: '😀', word: 'happy' },
  { face: '💛', word: 'love' },
  { face: '🤗', word: 'close' },
  { face: '😟', word: 'worried' },
  { face: '😢', word: 'sad' },
  { face: '😠', word: 'mad' },
  { face: '😴', word: 'far' },
  { face: '🤔', word: 'unsure' },
];

const BODY_PARTS = [
  // [id, label, shape, attrs]
  { id: 'head',   shape: 'circle', attrs: { cx: 70, cy: 28, r: 20 } },
  { id: 'throat', shape: 'rect',   attrs: { x: 62, y: 46, width: 16, height: 14, rx: 3 } },
  { id: 'chest',  shape: 'rect',   attrs: { x: 46, y: 60, width: 48, height: 40, rx: 8 } },
  { id: 'tummy',  shape: 'rect',   attrs: { x: 48, y: 100, width: 44, height: 36, rx: 8 } },
  { id: 'arm-l',  shape: 'rect',   attrs: { x: 22, y: 64, width: 20, height: 58, rx: 9 } },
  { id: 'arm-r',  shape: 'rect',   attrs: { x: 98, y: 64, width: 20, height: 58, rx: 9 } },
  { id: 'hand-l', shape: 'circle', attrs: { cx: 32, cy: 132, r: 9 } },
  { id: 'hand-r', shape: 'circle', attrs: { cx: 108, cy: 132, r: 9 } },
  { id: 'leg-l',  shape: 'rect',   attrs: { x: 52, y: 138, width: 16, height: 50, rx: 7 } },
  { id: 'leg-r',  shape: 'rect',   attrs: { x: 72, y: 138, width: 16, height: 50, rx: 7 } },
] as const;

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function partOfDay(d: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = d.getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

function ritualNameFor(r: CoupleRitual): string {
  if (r.cadence === 'weekly' && typeof r.dayOfWeek === 'number') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[r.dayOfWeek]} Ritual`;
  }
  return 'Scheduled Ritual';
}

// v1 fallback for the 3-avatar share picker. Proper Mama Stacy / Papa
// labels will come from a future settings flow that lets parents
// customize `relationshipRole` per person.
function roleLabelFor(p: Person): string {
  if ((p as unknown as { relationshipRole?: string }).relationshipRole) {
    return ((p as unknown as { relationshipRole: string }).relationshipRole).toUpperCase();
  }
  if (p.relationshipType === 'spouse') return 'PARENT';
  return (p.relationshipType ?? 'PERSON').toUpperCase();
}

/* ─── Style objects ─── */
const sx = {
  app: {
    minHeight: '100vh',
    background: T.cream,
    color: T.ink,
    fontFamily: T.serif,
    paddingBottom: 80,
  } as CSSProperties,
  top: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '28px 28px 0',
    maxWidth: 720,
    margin: '0 auto',
  } as CSSProperties,
  topName: {
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: 26,
    color: T.ink,
    letterSpacing: '-0.005em',
  } as CSSProperties,
  topGlyph: {
    width: 28,
    height: 28,
    color: T.ember,
    opacity: 0.85,
  } as CSSProperties,
  card: {
    maxWidth: 720,
    margin: '28px auto 0',
    padding: '40px 36px 32px',
    background: T.paper,
    border: `1px solid ${T.rule}`,
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 32,
    transition: `box-shadow 240ms ${T.ease}`,
  } as CSSProperties,
  greet: {
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontWeight: 400,
    fontSize: 38,
    lineHeight: 1.05,
    letterSpacing: '-0.01em',
    color: T.ink,
    margin: '0 0 6px',
  } as CSSProperties,
  question: {
    fontFamily: T.serif,
    fontWeight: 400,
    fontSize: 28,
    lineHeight: 1.2,
    color: T.inkSoft,
    margin: 0,
  } as CSSProperties,
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  } as CSSProperties,
  label: {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: T.text5,
  } as CSSProperties,
  feelings: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  } as CSSProperties,
  feelBase: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    padding: '18px 6px 14px',
    border: '1.5px solid',
    borderRadius: 16,
    cursor: 'pointer',
    transition: `transform 140ms ${T.ease}, background 140ms ${T.ease}, border-color 140ms ${T.ease}`,
    background: T.cream,
    borderColor: T.ruleSoft,
  } as CSSProperties,
  feelOn: {
    background: T.warmTint,
    borderColor: T.amber,
    transform: 'scale(1.03)',
  } as CSSProperties,
  feelFace: { fontSize: 44, lineHeight: 1 } as CSSProperties,
  feelWord: {
    fontFamily: T.sans,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: T.text4,
  } as CSSProperties,
  voiceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  } as CSSProperties,
  voiceCopy: {
    fontFamily: T.serif,
    fontSize: 20,
    color: T.text3,
    margin: 0,
  } as CSSProperties,
  bodyRow: {
    display: 'flex',
    gap: 18,
    alignItems: 'flex-start',
  } as CSSProperties,
  bodyCopy: { flex: 1, paddingTop: 8 } as CSSProperties,
  bodyCopyH: {
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontWeight: 400,
    fontSize: 22,
    color: T.ink,
    margin: '0 0 4px',
  } as CSSProperties,
  bodyCopyP: {
    fontFamily: T.serif,
    fontSize: 15,
    lineHeight: 1.4,
    color: T.text4,
    margin: 0,
  } as CSSProperties,
  body: { width: 140, height: 200, flexShrink: 0 } as CSSProperties,
  divider: { height: 1, background: T.ruleSoft, margin: '8px 0' } as CSSProperties,
  relTargets: { display: 'flex', gap: 6, flexWrap: 'wrap' as const } as CSSProperties,
  relChipBase: {
    padding: '9px 16px',
    borderRadius: 999,
    border: '1.5px solid',
    fontFamily: T.sans,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all 140ms ${T.ease}`,
    background: T.paper,
    borderColor: T.ruleSoft,
    color: T.text3,
  } as CSSProperties,
  relChipOn: {
    background: T.sageTint,
    borderColor: T.sage,
    color: T.sageDeep,
  } as CSSProperties,
  relQuestion: {
    fontFamily: T.serif,
    fontWeight: 400,
    fontSize: 22,
    lineHeight: 1.2,
    color: T.inkSoft,
    margin: 0,
  } as CSSProperties,
  relSkip: {
    alignSelf: 'flex-start' as const,
    background: 'transparent',
    border: 'none',
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: T.text5,
    cursor: 'pointer',
    padding: '6px 0',
    transition: `color 140ms ${T.ease}`,
  } as CSSProperties,
  doneRow: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 8,
  } as CSSProperties,
  done: {
    fontFamily: T.sans,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: T.paper,
    background: T.ink,
    border: `1px solid ${T.ink}`,
    padding: '16px 36px',
    borderRadius: 999,
    cursor: 'pointer',
    transition: `transform 160ms ${T.ease}, background 160ms ${T.ease}`,
  } as CSSProperties,
  exitBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '18px 28px',
    borderBottom: '1px solid rgba(120, 100, 70, 0.10)',
    background: 'var(--r-cream-deep, #F1EDEB)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  } as CSSProperties,
  exitButton: {
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: 'var(--r-text-3, #5C5347)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  } as CSSProperties,
  ritualChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 999,
    background: 'rgba(120, 100, 70, 0.08)',
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'var(--r-text-3, #5C5347)',
    marginTop: 12,
  } as CSSProperties,
  shareSection: { marginTop: 36, marginBottom: 24 } as CSSProperties,
  shareLabel: {
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: 'var(--r-text-4, #6B6254)',
    margin: '0 0 14px',
  } as CSSProperties,
  shareRow: {
    display: 'flex',
    gap: 18,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  } as CSSProperties,
  avatarWrap: {
    position: 'relative' as const,
    width: 56,
    height: 56,
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'rgba(120, 100, 70, 0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  } as CSSProperties,
  avatarFallback: {
    fontFamily: 'var(--r-serif, Georgia, serif)',
    fontSize: 22,
    color: 'var(--r-text-3, #5C5347)',
  } as CSSProperties,
  avatarLabel: {
    fontFamily: 'var(--r-sans, -apple-system, sans-serif)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: 'var(--r-text-3, #5C5347)',
  } as CSSProperties,
  selectedDot: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--r-sage, #7C9082)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    border: '2px solid var(--r-cream, #F7F5F0)',
  } as CSSProperties,
};

const avatarChipStyle = (selected: boolean): CSSProperties => ({
  all: 'unset',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  opacity: selected ? 1 : 0.6,
  transition: 'opacity 140ms ease',
});

export default function KidModePage() {
  const params = useParams<{ personId: string }>();
  const personId = params?.personId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const ritualId = searchParams?.get('ritualId') ?? null;
  const { user } = useAuth();
  const { people } = usePerson();
  const { createEntry, saving } = useJournal();

  // When the page is launched from a scheduled ritual, surface a small
  // chip with the ritual's name so the kid + parent know which sit-down
  // this check-in belongs to. Absent for ad-hoc check-ins.
  const [ritualDoc, setRitualDoc] = useState<CoupleRitual | null>(null);
  useEffect(() => {
    if (!ritualId) {
      setRitualDoc(null);
      return;
    }
    const unsub = onSnapshot(doc(firestore, 'couple_rituals', ritualId), (snap) => {
      if (snap.exists()) setRitualDoc({ ...(snap.data() as CoupleRitual), id: snap.id });
    });
    return () => unsub();
  }, [ritualId]);

  const kid = useMemo(
    () => people.find((p) => p.personId === personId),
    [people, personId],
  );

  const today = useMemo(() => new Date(), []);
  const tod = partOfDay(today);
  const morning = tod === 'morning';

  // Family roster — for the relationship target chips. Adults visible
  // as Mom/Dad based on relationshipType when known; siblings by name.
  const familyForRel = useMemo(() => {
    if (!kid || !user) return [] as Array<{ id: string; label: string }>;
    return people
      .filter((p) => p.personId !== kid.personId)
      .map((p) => {
        // Show Mom/Dad for spouse-type adults — kid-friendly labels
        if (p.relationshipType === 'spouse' || p.linkedUserId) {
          // Heuristic: if the person has a linkedUserId, they're an
          // adult in the household. We can't reliably know "Mom" vs
          // "Dad"; for v1 just use first name. Real labeling comes
          // from a future per-kid relationship-label field.
          return { id: p.personId, label: p.name.split(' ')[0] };
        }
        return { id: p.personId, label: p.name.split(' ')[0] };
      });
  }, [people, kid, user]);

  // Adults in the household — the audience options for the share
  // picker below. We exclude the kid themselves and anyone without a
  // linkedUserId (since they can't actually see the entry yet).
  const adults = useMemo(() => {
    return people
      .filter(
        (p) =>
          p.linkedUserId &&
          p.relationshipType !== 'child' &&
          p.personId !== kid?.personId,
      )
      .map((p) => ({
        personId: p.personId,
        userId: p.linkedUserId!,
        name: p.name,
        avatarUrl: p.avatarUrl,
        role: roleLabelFor(p),
      }));
  }, [people, kid?.personId]);

  // ─── State ───
  const [selfFeelings, setSelfFeelings] = useState<string[]>([]);
  const [bodySpots, setBodySpots] = useState<string[]>([]);
  const [voiceText, setVoiceText] = useState('');
  // Multi-target relationship state — per-person feelings + voice
  // held in memory so the kid can move between people during one
  // session. `selectedRelIds` is the set of chips currently selected;
  // feelings/voice the kid enters fan out to every selected person
  // simultaneously. Per-person data still persists in relTargetMap so
  // earlier-round answers stick around when a person is deselected.
  type RelState = { feelings: string[]; voice: string };
  const [relTargetMap, setRelTargetMap] = useState<Record<string, RelState>>({});
  const [selectedRelIds, setSelectedRelIds] = useState<string[]>([]);
  const [groupVoice, setGroupVoice] = useState('');
  const [showRel, setShowRel] = useState(true);
  // 'editing' = the input form, 'saved' = the "anyone else?" picker.
  // Letting the parent batch sibling check-ins without bouncing home.
  const [phase, setPhase] = useState<'editing' | 'saved'>('editing');
  const [doneIds, setDoneIds] = useState<string[]>([]);

  // Share picker — which adults will see this kid's check-in. Defaults
  // to every linked adult in the family; the kid (or the parent helping)
  // can deselect individuals or toggle Everyone.
  const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
  useEffect(() => {
    if (sharedWithUserIds.length === 0 && adults.length > 0) {
      setSharedWithUserIds(adults.map((a) => a.userId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults]);
  const toggleShared = (userId: string) => {
    setSharedWithUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };
  const toggleEveryone = () => {
    const allUserIds = adults.map((a) => a.userId);
    const allSelected = allUserIds.every((id) => sharedWithUserIds.includes(id));
    setSharedWithUserIds(allSelected ? [] : allUserIds);
  };
  const everyoneSelected =
    adults.length > 0 && adults.every((a) => sharedWithUserIds.includes(a.userId));

  // Read the session list of already-done kids on mount + after save.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('kid-mode:done');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setDoneIds(Array.isArray(ids) ? ids : []);
    } catch {
      setDoneIds([]);
    }
  }, [phase]);

  // Start with no chips selected — the kid taps to pick. Empty-state
  // copy below invites them in.

  // When the selection changes, seed groupVoice from the new selection
  // if every selected person has the same stored voice text. If they
  // diverge, keep whatever the kid was just typing — anything they
  // type next will overwrite all selected persons.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedRelIds.length === 0) {
      setGroupVoice('');
      return;
    }
    const voices = selectedRelIds.map((id) => relTargetMap[id]?.voice ?? '');
    const allSame = voices.every((v) => v === voices[0]);
    if (allSame) setGroupVoice(voices[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRelIds.join(',')]);

  // All hooks must run unconditionally and in the same order on every
  // render — so these useMemos sit above the early loading-return.
  const selectedRelNames = useMemo(() => {
    return selectedRelIds
      .map((id) => familyForRel.find((p) => p.id === id)?.label)
      .filter((x): x is string => Boolean(x));
  }, [familyForRel, selectedRelIds]);

  // Feeling is "active" iff every currently-selected person has it set.
  const sharedFeelings = useMemo(() => {
    if (selectedRelIds.length === 0) return [] as string[];
    const sets = selectedRelIds.map((id) => new Set(relTargetMap[id]?.feelings ?? []));
    return KID_FEELINGS_REL
      .map((f) => f.word)
      .filter((word) => sets.every((s) => s.has(word)));
  }, [selectedRelIds, relTargetMap]);

  const otherKidsMemo = useMemo(() => {
    if (!kid) return [] as Array<{ personId: string; name: string; done: boolean }>;
    return people
      .filter((p) => p.relationshipType === 'child' && p.personId !== kid.personId)
      .map((p) => ({
        personId: p.personId,
        name: p.name,
        done: doneIds.includes(p.personId),
      }));
  }, [people, kid, doneIds]);
  const remainingKidsMemo = useMemo(
    () => otherKidsMemo.filter((k) => !k.done),
    [otherKidsMemo],
  );

  if (!kid) {
    return (
      <main style={sx.app}>
        <p
          style={{
            fontFamily: T.serif,
            fontStyle: 'italic',
            fontSize: 19,
            color: T.text4,
            textAlign: 'center',
            paddingTop: 120,
          }}
        >
          Opening…
        </p>
      </main>
    );
  }

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  // Aliases that callers below use unchanged.
  const otherKids = otherKidsMemo;
  const remainingKids = remainingKidsMemo;

  // Helpers for the multi-selected relationship targets.
  const toggleRelTarget = (id: string) => {
    setSelectedRelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  // Toggling a feeling fans out across every currently-selected person:
  // if the feeling is in the intersection (shown active), strip it from
  // each; otherwise add it to each.
  const toggleRelFeeling = (word: string) => {
    if (selectedRelIds.length === 0) return;
    const isActive = sharedFeelings.includes(word);
    setRelTargetMap((prev) => {
      const next = { ...prev };
      for (const id of selectedRelIds) {
        const existing = next[id] ?? { feelings: [], voice: '' };
        const feelings = isActive
          ? existing.feelings.filter((w) => w !== word)
          : Array.from(new Set([...existing.feelings, word]));
        next[id] = { ...existing, feelings };
      }
      return next;
    });
  };
  // Voice text is shared across the current selection during the
  // current edit — typing fans the same text into every selected
  // person's row.
  const setGroupVoiceAndFanOut = (text: string) => {
    setGroupVoice(text);
    if (selectedRelIds.length === 0) return;
    setRelTargetMap((prev) => {
      const next = { ...prev };
      for (const id of selectedRelIds) {
        const existing = next[id] ?? { feelings: [], voice: '' };
        next[id] = { ...existing, voice: text };
      }
      return next;
    });
  };
  const targetHasContent = (id: string): boolean => {
    const s = relTargetMap[id];
    return Boolean(s && (s.feelings.length > 0 || s.voice.trim().length > 0));
  };
  // All targets the kid actually said something about (for save).
  const populatedRelTargets = familyForRel
    .filter((t) => targetHasContent(t.id))
    .map((t) => ({
      personId: t.id,
      feelings: relTargetMap[t.id]?.feelings ?? [],
      voice: relTargetMap[t.id]?.voice ?? '',
    }));

  const handleDone = async () => {
    if (saving) return;
    if (!user?.familyId) return;
    try {
      // Body = only what was actually spoken or written. Per-target
      // voice transcripts are tagged with the target's name so a
      // future reader can tell whose feelings the line belongs to.
      const parts: string[] = [];
      if (voiceText.trim()) parts.push(voiceText.trim());
      if (showRel) {
        for (const t of populatedRelTargets) {
          if (t.voice && t.voice.trim()) {
            const label = familyForRel.find((p) => p.id === t.personId)?.label ?? 'them';
            parts.push(`About ${label}: ${t.voice.trim()}`);
          }
        }
      }
      const body = parts.join('\n\n') || `${kid.name} did a check-in.`;

      // Mentions: the kid plus every target the kid said something about.
      const targetIds = showRel ? populatedRelTargets.map((t) => t.personId) : [];
      const mentions: string[] = Array.from(new Set([kid.personId, ...targetIds]));

      const allRelFeelings = showRel
        ? Array.from(new Set(populatedRelTargets.flatMap((t) => t.feelings)))
        : [];

      const tags = [
        'kid-mode',
        'check-in',
        ...(selfFeelings.length ? [`feel-self:${selfFeelings.join(',')}`] : []),
        ...(bodySpots.length ? [`body:${bodySpots.join(',')}`] : []),
        ...(allRelFeelings.length ? [`feel-rel:${allRelFeelings.join(',')}`] : []),
      ];

      // Structured kid check-in. relTargets carries per-person feelings;
      // legacy single-target fields (relFeelings, withPersonIds) are
      // populated only when there's exactly one target so older readers
      // still see the data they expect.
      const hasAnything =
        selfFeelings.length > 0 ||
        bodySpots.length > 0 ||
        (showRel && populatedRelTargets.length > 0);
      const checkIn = hasAnything
        ? {
            kind: 'child' as const,
            timeOfDay: partOfDay(today),
            selfFeelings,
            ...(bodySpots.length > 0 ? { bodySpots } : {}),
            ...(showRel && populatedRelTargets.length > 0
              ? { relTargets: populatedRelTargets }
              : {}),
            // Back-compat: legacy single-target shape when exactly one target
            ...(showRel && populatedRelTargets.length === 1
              ? {
                  relFeelings: populatedRelTargets[0].feelings,
                  withPersonIds: [populatedRelTargets[0].personId],
                }
              : {}),
          }
        : undefined;

      await createEntry({
        text: body,
        category: 'moment',
        personMentions: mentions,
        // Visibility comes from the share picker (Mama / Papa /
        // Everyone). Defaults to every linked adult; the kid + parent
        // can narrow before saving.
        sharedWithUserIds: sharedWithUserIds,
        subjectType: 'child_proxy',
        subjectPersonId: kid.personId,
        tags,
        ...(checkIn ? { checkIn } : {}),
      });

      // Mark this kid done for the current session so siblings shown
      // in the next-up picker (and on /) can be styled accordingly.
      try {
        const raw = sessionStorage.getItem('kid-mode:done');
        const existing = raw ? (JSON.parse(raw) as string[]) : [];
        const next = Array.from(new Set([...existing, kid.personId]));
        sessionStorage.setItem('kid-mode:done', JSON.stringify(next));
      } catch {
        // sessionStorage disabled; not fatal
      }

      setPhase('saved');
    } catch (e) {
      console.error('Kid-mode save failed:', e);
    }
  };

  // ─── Render ───
  return (
    <main style={sx.app}>
      {/* Exit affordance — only adult-visible chrome on the kid page,
          replaces the previously-hidden global rail. */}
      <div style={sx.exitBar}>
        <Link href="/" style={sx.exitButton}>
          <span aria-hidden style={{ marginRight: 8 }}>✕</span>
          Exit to parent journal
        </Link>
      </div>
      {/* Top strip — name + sun glyph; intentionally minimal so the
          kid sees one clear thing on screen. */}
      <div style={sx.top}>
        <span style={sx.topName}>{kid.name}</span>
        <svg
          style={sx.topGlyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {morning ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </>
          ) : (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          )}
        </svg>
      </div>

      {phase === 'saved' ? (
        /* Saved + next-up picker. Lets parents batch sibling check-ins
           without bouncing back to the home page first. */
        <main style={sx.card}>
          <header>
            <h1 style={sx.greet}>
              Saved, <em style={{ fontStyle: 'italic' }}>{kid.name}.</em>
            </h1>
            <p style={sx.question}>
              {remainingKids.length > 0 ? 'Anyone else right now?' : 'That’s everyone.'}
            </p>
          </header>

          {otherKids.length > 0 && (
            <section style={sx.section}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {otherKids.map((k) => (
                  <button
                    key={k.personId}
                    type="button"
                    onClick={() => router.push(`/check-in/${k.personId}`)}
                    disabled={k.done}
                    style={{
                      padding: '14px 22px',
                      borderRadius: 999,
                      border: `1.5px solid ${k.done ? T.ruleSoft : T.rule}`,
                      background: k.done ? T.cream : T.paper,
                      fontFamily: T.sans,
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color: k.done ? T.text5 : T.ink,
                      cursor: k.done ? 'default' : 'pointer',
                      opacity: k.done ? 0.7 : 1,
                      transition: `all 140ms ${T.ease}`,
                    }}
                  >
                    {k.done ? '✓ ' : ''}{k.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div style={sx.doneRow}>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                ...sx.done,
                background: remainingKids.length === 0 ? T.sageDeep : T.ink,
                borderColor: remainingKids.length === 0 ? T.sageDeep : T.ink,
              }}
            >
              {remainingKids.length === 0 ? 'All done' : 'Done for now'}
            </button>
          </div>
        </main>
      ) : (
      <main style={sx.card}>
        <header>
          <h1 style={sx.greet}>
            Hi <em style={{ fontStyle: 'italic' }}>{kid.name}.</em>
          </h1>
          {ritualDoc && (
            <div style={sx.ritualChip}>
              <span aria-hidden style={{ marginRight: 6 }}>📅</span>
              {ritualNameFor(ritualDoc)}
            </div>
          )}
          <p style={sx.question}>
            {morning ? 'How are you feeling this morning?' : 'How are you feeling?'}
          </p>
        </header>

        {/* Feelings */}
        <section style={sx.section}>
          <span style={sx.label}>Pick what fits</span>
          <div style={sx.feelings}>
            {KID_FEELINGS_SELF.map((f) => {
              const on = selfFeelings.includes(f.word);
              return (
                <button
                  key={f.word}
                  type="button"
                  onClick={() => setSelfFeelings((prev) => toggle(prev, f.word))}
                  style={{
                    ...sx.feelBase,
                    ...(on ? sx.feelOn : null),
                  }}
                >
                  <span style={sx.feelFace}>{f.face}</span>
                  <span
                    style={{
                      ...sx.feelWord,
                      color: on ? T.ink : T.text4,
                    }}
                  >
                    {f.word}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Voice — editable transcript so the parent can trim their
            own prompting out before saving. */}
        <section style={sx.section}>
          <span style={sx.label}>or talk</span>
          <div style={sx.voiceRow}>
            <MicButton
              size="md"
              onTranscript={(t) => {
                const trimmed = t.trim();
                if (!trimmed) return;
                setVoiceText((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed));
              }}
            />
            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Tap and tell me something."
              rows={3}
              style={{
                flex: 1,
                fontFamily: T.serif,
                fontStyle: 'italic',
                fontSize: 18,
                lineHeight: 1.4,
                color: T.ink,
                background: T.cream,
                border: `1px solid ${T.ruleSoft}`,
                borderRadius: 8,
                padding: '10px 12px',
                resize: 'none',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = T.rule; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = T.ruleSoft; }}
            />
          </div>
          {voiceText.trim().length > 0 && (
            <p
              style={{
                margin: '6px 0 0',
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 500,
                color: T.text5,
              }}
            >
              You can edit what was heard — trim out anything that wasn't <em style={{ fontStyle: 'italic' }}>{kid.name}</em>.
            </p>
          )}
        </section>

        {/* Body map */}
        <section style={sx.section}>
          <span style={sx.label}>Where do you feel it? (you can skip)</span>
          <div style={sx.bodyRow}>
            <svg style={sx.body} viewBox="0 0 140 200" role="img" aria-label="Body map">
              {BODY_PARTS.map((p) => {
                const on = bodySpots.includes(p.id);
                const fill = on ? T.emberTint : T.ruleSoft;
                const stroke = on ? T.ember : T.rule;
                const onClick = () => setBodySpots((prev) => toggle(prev, p.id));
                if (p.shape === 'circle') {
                  return (
                    <circle
                      key={p.id}
                      cx={p.attrs.cx}
                      cy={p.attrs.cy}
                      r={p.attrs.r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1.2}
                      style={{ cursor: 'pointer', transition: 'fill 160ms' }}
                      onClick={onClick}
                    />
                  );
                }
                return (
                  <rect
                    key={p.id}
                    x={p.attrs.x}
                    y={p.attrs.y}
                    width={p.attrs.width}
                    height={p.attrs.height}
                    rx={p.attrs.rx}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.2}
                    style={{ cursor: 'pointer', transition: 'fill 160ms' }}
                    onClick={onClick}
                  />
                );
              })}
            </svg>
            <div style={sx.bodyCopy}>
              <h3 style={sx.bodyCopyH}>Anywhere?</h3>
              <p style={sx.bodyCopyP}>
                Tap a part of the body if a feeling lives there. Or skip — that&rsquo;s okay too.
              </p>
            </div>
          </div>
        </section>

        {/* Relationship step — multi-target. Each chip holds its own
            feelings + voice in memory; tap a chip to switch which one
            the editor below applies to. Chips with logged content
            show a small sage dot. */}
        {showRel && familyForRel.length > 0 && (
          <>
            <div style={sx.divider} aria-hidden="true" />
            <section style={sx.section}>
              <span style={sx.label}>If you want — about someone (you can pick more than one)</span>
              <div style={sx.relTargets}>
                {familyForRel.map((p) => {
                  const isActive = selectedRelIds.includes(p.id);
                  const hasContent = targetHasContent(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleRelTarget(p.id)}
                      style={{
                        ...sx.relChipBase,
                        ...(isActive ? sx.relChipOn : null),
                        position: 'relative',
                      }}
                    >
                      {p.label}
                      {hasContent && !isActive && (
                        <span
                          aria-hidden="true"
                          style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: T.sage,
                            marginLeft: 6,
                            verticalAlign: 'middle',
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedRelIds.length === 0 ? (
                <p
                  style={{
                    ...sx.relQuestion,
                    fontStyle: 'italic',
                    color: T.text4,
                  }}
                >
                  Tap a name above to get started — you can tap more than one.
                </p>
              ) : (
                <>
                  <p style={sx.relQuestion}>
                    How are you feeling about{' '}
                    <em style={{ fontStyle: 'italic', color: T.ink }}>{joinNames(selectedRelNames)}</em>?
                  </p>
                  <div style={sx.feelings}>
                    {KID_FEELINGS_REL.map((f) => {
                      const on = sharedFeelings.includes(f.word);
                      return (
                        <button
                          key={f.word}
                          type="button"
                          onClick={() => toggleRelFeeling(f.word)}
                          style={{ ...sx.feelBase, ...(on ? sx.feelOn : null) }}
                        >
                          <span style={sx.feelFace}>{f.face}</span>
                          <span style={{ ...sx.feelWord, color: on ? T.ink : T.text4 }}>{f.word}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={sx.voiceRow}>
                    <MicButton
                      size="md"
                      onTranscript={(t) => {
                        const trimmed = t.trim();
                        if (!trimmed) return;
                        const nextVoice = groupVoice.trim()
                          ? `${groupVoice.trim()} ${trimmed}`
                          : trimmed;
                        setGroupVoiceAndFanOut(nextVoice);
                      }}
                    />
                    <textarea
                      value={groupVoice}
                      onChange={(e) => setGroupVoiceAndFanOut(e.target.value)}
                      placeholder={
                        selectedRelNames.length === 1
                          ? `Tap and tell me about ${selectedRelNames[0]} if you want.`
                          : 'Tap and tell me something.'
                      }
                      rows={3}
                      style={{
                        flex: 1,
                        fontFamily: T.serif,
                        fontStyle: 'italic',
                        fontSize: 18,
                        lineHeight: 1.4,
                        color: T.ink,
                        background: T.cream,
                        border: `1px solid ${T.ruleSoft}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        resize: 'none',
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = T.rule; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = T.ruleSoft; }}
                    />
                  </div>
                </>
              )}
              {populatedRelTargets.length > 1 && (
                <p
                  style={{
                    margin: '6px 0 0',
                    fontFamily: T.sans,
                    fontSize: 11,
                    fontWeight: 500,
                    color: T.text5,
                  }}
                >
                  You&rsquo;ve said something about{' '}
                  {populatedRelTargets
                    .map((t) => familyForRel.find((p) => p.id === t.personId)?.label)
                    .filter(Boolean)
                    .join(', ')}
                  . Tap any chip to add more or change what you said.
                </p>
              )}
              <button
                type="button"
                style={sx.relSkip}
                onClick={() => {
                  setShowRel(false);
                  setRelTargetMap({});
                  setSelectedRelIds([]);
                  setGroupVoice('');
                }}
              >
                Skip this part
              </button>
            </section>
          </>
        )}

        {/* Share picker — choose which adults see this check-in. */}
        {adults.length > 0 && (
          <section style={sx.shareSection}>
            <p style={sx.shareLabel}>Share with…</p>
            <div style={sx.shareRow}>
              {adults.map((a) => {
                const selected = sharedWithUserIds.includes(a.userId);
                return (
                  <button
                    key={a.userId}
                    type="button"
                    onClick={() => toggleShared(a.userId)}
                    style={avatarChipStyle(selected)}
                    aria-pressed={selected}
                  >
                    <span style={sx.avatarWrap}>
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt="" style={sx.avatarImg} />
                      ) : (
                        <span style={sx.avatarFallback}>{(a.name[0] ?? '?').toUpperCase()}</span>
                      )}
                      {selected && (
                        <span aria-hidden style={sx.selectedDot}>✓</span>
                      )}
                    </span>
                    <span style={sx.avatarLabel}>{a.role}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={toggleEveryone}
                style={avatarChipStyle(everyoneSelected)}
                aria-pressed={everyoneSelected}
              >
                <span style={{ ...sx.avatarWrap, background: 'rgba(120, 100, 70, 0.18)' }}>
                  <span aria-hidden style={{ fontSize: 18 }}>👥</span>
                </span>
                <span style={sx.avatarLabel}>EVERYONE</span>
              </button>
            </div>
          </section>
        )}

        {/* Done */}
        <div style={sx.doneRow}>
          <button
            type="button"
            onClick={handleDone}
            disabled={saving || (adults.length > 0 && sharedWithUserIds.length === 0)}
            style={{
              ...sx.done,
              background: T.ink,
              borderColor: T.ink,
              opacity:
                saving || (adults.length > 0 && sharedWithUserIds.length === 0) ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'All done'}
          </button>
        </div>
      </main>
      )}
    </main>
  );
}
