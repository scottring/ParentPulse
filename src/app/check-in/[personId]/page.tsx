'use client';
/* ================================================================
   /check-in/[personId] — bedtime check-in (card-led)

   Two cards alternate per kid:
   - Parent Reflection: parent enters one specific observation about
     the kid today; kid responds to it.
   - High / Low / Buffalo: parent goes first with three short
     answers; kid follows with three of their own, with parent's
     matching answer quoted above each kid slot for modeling.

   Parent's turn is the first visible step. "Pass to [Kid]" gates the
   kid's turn. Existing share picker + sibling next-up picker +
   optional emoji/body/share sprinkles stay accessible below.

   Spec: docs/superpowers/specs/2026-05-13-bedtime-checkin-cards-design.md
   Plan: docs/superpowers/plans/2026-05-13-bedtime-checkin-cards.md
   ================================================================ */

import { useEffect, useMemo, useState } from 'react';
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
import type {
  BedtimeCardKind,
  BedtimeParentTurn,
  BedtimeKidTurn,
} from '@/types/journal';
import { pickCard, CARD_ROTATION } from '@/lib/check-in/pickCard';
import { getLastBedtimeCard } from '@/lib/check-in/getLastBedtimeCard';
import { composeBedtimeBody } from '@/lib/check-in/composeBedtimeBody';
import { CARD_BY_KIND, renderPlaceholder } from '@/lib/check-in/cards';

const SELF_FEELINGS = [
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
] as const;

const sx = {
  app: {
    minHeight: '100vh',
    background: T.creamWarm,
    color: T.ink,
    fontFamily: T.serif,
    paddingBottom: 80,
  } as CSSProperties,
  exitBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 24px',
    borderBottom: '1px solid rgba(120, 100, 70, 0.10)',
    background: T.cream,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  } as CSSProperties,
  exitButton: {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: T.text5,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  } as CSSProperties,
  masthead: {
    textAlign: 'center' as const,
    padding: '26px 28px 14px',
    maxWidth: 720,
    margin: '0 auto',
  } as CSSProperties,
  mastheadLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: T.text5,
    textTransform: 'uppercase' as const,
  } as CSSProperties,
  mastheadKid: {
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontWeight: 400,
    fontSize: 30,
    color: T.ink,
    marginTop: 6,
    lineHeight: 1.05,
  } as CSSProperties,
  fleuron: {
    fontSize: 16,
    color: T.ruleStrong,
    marginTop: 6,
  } as CSSProperties,
  card: {
    maxWidth: 720,
    margin: '8px auto 18px',
    padding: '28px 26px 24px',
    background: T.paper,
    border: `1px solid ${T.rule}`,
    borderRadius: 14,
  } as CSSProperties,
  cardLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as CSSProperties,
  cardLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: T.text5,
    textTransform: 'uppercase' as const,
  } as CSSProperties,
  changeCardLink: {
    background: 'transparent',
    border: 'none',
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.18em',
    color: T.text5,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '2px 0',
  } as CSSProperties,
  cardTitle: {
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontWeight: 400,
    fontSize: 28,
    lineHeight: 1.15,
    color: T.ink,
    margin: '10px 0 8px',
  } as CSSProperties,
  cardSubtitle: {
    fontFamily: T.serif,
    fontSize: 14,
    color: T.text4,
    lineHeight: 1.5,
    margin: 0,
  } as CSSProperties,
  turnSection: {
    maxWidth: 720,
    margin: '0 auto 14px',
    padding: '0 24px',
  } as CSSProperties,
  turnLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  } as CSSProperties,
  voiceRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  } as CSSProperties,
  textarea: {
    flex: 1,
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 1.4,
    color: T.ink,
    background: T.paper,
    border: `1px solid ${T.ruleSoft}`,
    borderRadius: 8,
    padding: '12px 14px',
    resize: 'none',
    outline: 'none',
    minHeight: 76,
  } as CSSProperties,
  passRow: {
    textAlign: 'center' as const,
    marginTop: 12,
  } as CSSProperties,
  passButton: {
    display: 'inline-block',
    padding: '11px 22px',
    borderRadius: 999,
    background: 'transparent',
    border: `1.5px solid ${T.ruleStrong}`,
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: T.text3,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
  } as CSSProperties,
  divider: {
    height: 1,
    background: T.ruleSoft,
    margin: '20px auto',
    maxWidth: 720,
  } as CSSProperties,
  parentQuote: {
    padding: '14px 16px',
    background: 'rgba(120, 100, 70, 0.06)',
    borderLeft: `2px solid ${T.ruleStrong}`,
    borderRadius: 4,
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontSize: 16,
    color: T.text3,
    marginBottom: 12,
  } as CSSProperties,
  doneRow: {
    textAlign: 'center' as const,
    padding: '8px 24px 32px',
  } as CSSProperties,
  done: {
    display: 'inline-block',
    padding: '14px 28px',
    borderRadius: 999,
    background: T.ink,
    color: T.paper,
    fontFamily: T.sans,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    border: `1px solid ${T.ink}`,
    cursor: 'pointer',
  } as CSSProperties,
  ritualChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: 999,
    background: 'rgba(120, 100, 70, 0.08)',
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: T.text3,
    marginTop: 8,
  } as CSSProperties,
  banner: {
    maxWidth: 720,
    margin: '0 auto 14px',
    padding: '12px 16px',
    background: '#FBEEE6',
    border: `1px solid ${T.ember}`,
    borderRadius: 10,
    fontFamily: T.sans,
    fontSize: 13,
    color: T.text3,
    lineHeight: 1.4,
  } as CSSProperties,
  bannerInfo: {
    maxWidth: 720,
    margin: '0 auto 14px',
    padding: '10px 14px',
    background: T.warmRow,
    border: `1px solid ${T.ruleSoft}`,
    borderRadius: 10,
    fontFamily: T.sans,
    fontSize: 12,
    color: T.text4,
    lineHeight: 1.4,
  } as CSSProperties,
  copyButton: {
    display: 'inline-block',
    marginLeft: 10,
    padding: '6px 14px',
    borderRadius: 999,
    background: 'transparent',
    border: `1.5px solid ${T.ember}`,
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: T.ember,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
  } as CSSProperties,
  hlbStack: { display: 'flex', flexDirection: 'column' as const, gap: 10 } as CSSProperties,
  hlbSlotLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: T.text5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  } as CSSProperties,
  hlbInputRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  } as CSSProperties,
  hlbTextarea: {
    flex: 1,
    fontFamily: T.serif,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 1.4,
    color: T.ink,
    background: T.paper,
    border: `1px solid ${T.ruleSoft}`,
    borderRadius: 8,
    padding: '10px 12px',
    resize: 'none',
    outline: 'none',
    minHeight: 48,
  } as CSSProperties,
  hlbQuote: {
    padding: '8px 12px',
    background: 'rgba(120, 100, 70, 0.06)',
    borderLeft: `2px solid ${T.ruleStrong}`,
    borderRadius: 4,
    fontFamily: T.serif,
    fontStyle: 'italic' as const,
    fontSize: 13,
    color: T.text4,
    marginBottom: 4,
  } as CSSProperties,
  sprinkleSection: {
    maxWidth: 720,
    margin: '0 auto 14px',
    padding: '14px 24px',
    background: 'rgba(120, 100, 70, 0.04)',
    borderRadius: 10,
  } as CSSProperties,
  sprinkleLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.22em',
    color: T.text5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  } as CSSProperties,
  chipRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  } as CSSProperties,
  chipBase: {
    padding: '8px 14px',
    borderRadius: 999,
    background: T.paper,
    border: `1px solid ${T.ruleSoft}`,
    fontFamily: T.serif,
    fontSize: 14,
    color: T.text3,
    cursor: 'pointer',
  } as CSSProperties,
  chipOn: {
    background: T.warmRow2,
    borderColor: T.amber,
    color: T.ink,
  } as CSSProperties,
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 12,
  } as CSSProperties,
  emojiTile: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '12px 4px',
    borderRadius: 12,
    background: T.cream,
    border: `1px solid ${T.ruleSoft}`,
    cursor: 'pointer',
    fontFamily: T.sans,
    fontSize: 11,
    color: T.text4,
  } as CSSProperties,
  emojiTileOn: {
    background: T.warmRow2,
    borderColor: T.amber,
    color: T.ink,
  } as CSSProperties,
  emojiFace: { fontSize: 28, lineHeight: 1 } as CSSProperties,
  shareRow: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap' as const,
    marginTop: 12,
  } as CSSProperties,
  avatarChip: {
    all: 'unset',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
  } as CSSProperties,
  avatarCircle: {
    position: 'relative' as const,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(120, 100, 70, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as CSSProperties,
  avatarFallback: {
    fontFamily: T.serif,
    fontSize: 18,
    color: T.text3,
  } as CSSProperties,
  avatarLabel: {
    fontFamily: T.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    color: T.text4,
  } as CSSProperties,
  selectedDot: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: T.sage,
    color: 'white',
    fontSize: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${T.paper}`,
  } as CSSProperties,
};

export default function KidModePage() {
  const params = useParams<{ personId: string }>();
  const personId = params?.personId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const ritualId = searchParams?.get('ritualId') ?? null;
  const { user } = useAuth();
  const { people } = usePerson();
  const { createEntry, saving } = useJournal();

  const kid = useMemo(
    () => people.find((p) => p.personId === personId),
    [people, personId],
  );

  // Ritual chip (when launched from a scheduled couple_ritual).
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

  // Card rotation. Fetch the kid's most recent bedtime card once and
  // compute today's card. Override is applied on top.
  const [cardOverride, setCardOverride] = useState<BedtimeCardKind | null>(null);
  const [lastCard, setLastCard] = useState<BedtimeCardKind | null>(null);
  const [lastCardLoaded, setLastCardLoaded] = useState(false);
  useEffect(() => {
    if (!user?.familyId || !kid) return;
    let cancelled = false;
    getLastBedtimeCard(user.familyId, kid.personId)
      .then((c) => {
        if (cancelled) return;
        setLastCard(c);
        setLastCardLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLastCardLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.familyId, kid]);
  const card: BedtimeCardKind = useMemo(
    () => pickCard(lastCard, cardOverride ?? undefined),
    [lastCard, cardOverride],
  );
  const cardDef = CARD_BY_KIND[card];

  // Parent + kid turn state.
  const [parentTurn, setParentTurn] = useState<BedtimeParentTurn>({
    userId: user?.userId ?? '',
  });
  useEffect(() => {
    if (user?.userId && !parentTurn.userId) {
      setParentTurn((prev) => ({ ...prev, userId: user.userId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);
  const [kidTurn, setKidTurn] = useState<BedtimeKidTurn>({});
  const [phase, setPhase] = useState<'parent' | 'kid' | 'saved'>('parent');

  // Save errors surface visibly in-page so a failed Firestore write
  // never looks like the Done button is broken. Cleared on retry.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<number | null>(null);

  // Dynamic parent name from the auth user, falling back to "Parent".
  const parentFirstName = useMemo(() => {
    const n = user?.name?.trim();
    if (n) return n.split(' ')[0];
    return 'Parent';
  }, [user?.name]);

  // Sibling next-up picker uses the existing sessionStorage marker.
  const [doneIds, setDoneIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('kid-mode:done');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setDoneIds(Array.isArray(ids) ? ids : []);
    } catch {
      setDoneIds([]);
    }
  }, [phase]);
  const otherKids = useMemo(() => {
    if (!kid) return [] as Array<{ personId: string; name: string; done: boolean }>;
    return people
      .filter((p) => p.relationshipType === 'child' && p.personId !== kid.personId)
      .map((p) => ({
        personId: p.personId,
        name: p.name,
        done: doneIds.includes(p.personId),
      }));
  }, [people, kid, doneIds]);
  const remainingKids = useMemo(
    () => otherKids.filter((k) => !k.done),
    [otherKids],
  );

  // Share picker — adults in the household who'll see this entry.
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
        avatarUrl: (p as Person & { avatarUrl?: string }).avatarUrl,
      }));
  }, [people, kid?.personId]);
  const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
  useEffect(() => {
    if (sharedWithUserIds.length === 0 && adults.length > 0) {
      setSharedWithUserIds(adults.map((a) => a.userId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults]);

  // Optional sprinkles — emoji feelings, body spots, and the share
  // picker, accessed via collapsed chips below the card.
  const [selfFeelings, setSelfFeelings] = useState<string[]>([]);
  const [bodySpots, setBodySpots] = useState<string[]>([]);

  // Restore an in-progress draft for this kid (saved locally before
  // any successful Firestore write). Runs once after kid loads. Drafts
  // older than 24h are ignored — bedtime sessions don't span days.
  useEffect(() => {
    if (!kid?.personId || hasRestoredDraft) return;
    try {
      const raw = localStorage.getItem(`bedtime-draft:${kid.personId}`);
      if (!raw) {
        setHasRestoredDraft(true);
        return;
      }
      const draft = JSON.parse(raw) as {
        savedAt?: number;
        card?: BedtimeCardKind;
        parentTurn?: BedtimeParentTurn;
        kidTurn?: BedtimeKidTurn;
        selfFeelings?: string[];
        bodySpots?: string[];
        sharedWithUserIds?: string[];
      };
      if (
        typeof draft.savedAt !== 'number' ||
        Date.now() - draft.savedAt > 24 * 60 * 60 * 1000
      ) {
        try { localStorage.removeItem(`bedtime-draft:${kid.personId}`); } catch {}
        setHasRestoredDraft(true);
        return;
      }
      if (draft.card) setCardOverride(draft.card);
      if (draft.parentTurn) setParentTurn(draft.parentTurn);
      if (draft.kidTurn) {
        setKidTurn(draft.kidTurn);
        // If the kid already wrote anything, advance past the parent gate.
        const kidHasAny = Object.values(draft.kidTurn).some(
          (v) => typeof v === 'string' && v.trim().length > 0,
        );
        if (kidHasAny) setPhase('kid');
      }
      if (draft.selfFeelings) setSelfFeelings(draft.selfFeelings);
      if (draft.bodySpots) setBodySpots(draft.bodySpots);
      if (draft.sharedWithUserIds) setSharedWithUserIds(draft.sharedWithUserIds);
      setDraftRestoredAt(draft.savedAt);
    } catch {
      // Corrupted draft — drop it.
      try { localStorage.removeItem(`bedtime-draft:${kid.personId}`); } catch {}
    }
    setHasRestoredDraft(true);
  }, [kid?.personId, hasRestoredDraft]);
  const [openSprinkle, setOpenSprinkle] = useState<
    'feelings' | 'body' | 'share' | null
  >(null);
  const toggleSelfFeeling = (word: string) =>
    setSelfFeelings((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  const toggleBodySpot = (id: string) =>
    setBodySpots((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  const toggleShared = (userId: string) =>
    setSharedWithUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );

  // Autosave the in-progress check-in to localStorage every ~600ms of
  // idle, so a save failure or tab loss never costs us the data. Only
  // writes when there's actually content to preserve.
  useEffect(() => {
    if (!kid?.personId || !hasRestoredDraft) return;
    const hasAny =
      Object.values(parentTurn).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      ) ||
      Object.values(kidTurn).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      ) ||
      selfFeelings.length > 0 ||
      bodySpots.length > 0;
    if (!hasAny) return;
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(
          `bedtime-draft:${kid.personId}`,
          JSON.stringify({
            savedAt: Date.now(),
            card,
            parentTurn,
            kidTurn,
            selfFeelings,
            bodySpots,
            sharedWithUserIds,
          }),
        );
      } catch {
        // Storage full / private mode — don't block typing.
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [
    kid?.personId,
    hasRestoredDraft,
    card,
    parentTurn,
    kidTurn,
    selfFeelings,
    bodySpots,
    sharedWithUserIds,
  ]);

  if (!kid || !lastCardLoaded) {
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

  const kidFirstName = kid.name.split(' ')[0];

  // Change-card handler with confirmation. Cycles to the next card in
  // the rotation; with three cards a single click is enough most of
  // the time. If the parent wants the third option, click twice.
  const handleChangeCard = () => {
    const idx = CARD_ROTATION.indexOf(card);
    const other: BedtimeCardKind =
      CARD_ROTATION[(idx + 1) % CARD_ROTATION.length];
    const hasContent =
      Object.values(parentTurn).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      ) ||
      Object.values(kidTurn).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      );
    if (hasContent) {
      const ok = window.confirm(
        `Switch to ${CARD_BY_KIND[other].title}? You'll start over.`,
      );
      if (!ok) return;
      setParentTurn({ userId: user?.userId ?? '' });
      setKidTurn({});
    }
    setCardOverride(other);
    setPhase('parent');
  };

  // Pass-to-kid with soft confirm when parent turn is empty.
  const handlePass = () => {
    const parentHasAny = Object.values(parentTurn).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );
    if (!parentHasAny) {
      const ok = window.confirm(
        `${parentFirstName} hasn't said anything yet — pass to ${kidFirstName}?`,
      );
      if (!ok) return;
    }
    setPhase('kid');
  };

  const handleDone = async () => {
    if (saving) return;
    setSaveError(null);
    if (!user?.familyId || !user?.userId) {
      setSaveError(
        'Not signed in (or session expired). Refresh the page and try again — your work is saved locally.',
      );
      return;
    }
    try {
      const body = composeBedtimeBody({
        kidName: kidFirstName,
        parentName: parentFirstName,
        card,
        parentTurn,
        kidTurn,
      });
      const tags = ['kid-mode', 'check-in', 'bedtime', `card:${card}`];
      await createEntry({
        text: body,
        category: 'moment',
        personMentions: [kid.personId],
        sharedWithUserIds,
        subjectType: 'child_proxy',
        subjectPersonId: kid.personId,
        tags,
        checkIn: {
          kind: 'child-bedtime',
          timeOfDay: 'night',
          selfFeelings,
          ...(bodySpots.length > 0 ? { bodySpots } : {}),
          card,
          parentTurn,
          kidTurn,
        },
      });
      try {
        const raw = sessionStorage.getItem('kid-mode:done');
        const existing = raw ? (JSON.parse(raw) as string[]) : [];
        const next = Array.from(new Set([...existing, kid.personId]));
        sessionStorage.setItem('kid-mode:done', JSON.stringify(next));
      } catch {
        // sessionStorage disabled; not fatal.
      }
      // Successful write — clear the local draft.
      try {
        localStorage.removeItem(`bedtime-draft:${kid.personId}`);
      } catch {
        // ignore
      }
      setPhase('saved');
    } catch (e) {
      console.error('Bedtime check-in save failed:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSaveError(
        `Save failed: ${msg}. Your work is saved on this device — try again, or use Copy text below to save manually.`,
      );
    }
  };

  // Copy the composed body to clipboard so the user has a manual
  // recovery path when Firestore saves are failing.
  const handleCopyText = async () => {
    const body = composeBedtimeBody({
      kidName: kidFirstName,
      parentName: parentFirstName,
      card,
      parentTurn,
      kidTurn,
    });
    try {
      await navigator.clipboard.writeText(body);
      setSaveError(`Copied to clipboard. Paste it into a desktop journal entry.`);
    } catch {
      // Clipboard blocked — fall back to a prompt the user can copy from.
      window.prompt('Copy this text:', body);
    }
  };

  // ─── Render ───

  if (phase === 'saved') {
    return (
      <main style={sx.app}>
        <div style={sx.exitBar}>
          <Link href="/" style={sx.exitButton}>
            <span aria-hidden style={{ marginRight: 8 }}>✕</span>
            Exit to parent journal
          </Link>
        </div>
        <div style={sx.masthead}>
          <div style={sx.mastheadLabel}>Saved</div>
          <div style={sx.mastheadKid}>{kidFirstName}.</div>
          <div style={sx.fleuron}>❦</div>
        </div>
        <div style={sx.card}>
          <p style={{ ...sx.cardSubtitle, fontSize: 18, color: T.ink }}>
            {remainingKids.length > 0 ? 'Anyone else right now?' : 'That’s everyone.'}
          </p>
          {otherKids.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
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
                    color: k.done ? T.text5 : T.ink,
                    cursor: k.done ? 'default' : 'pointer',
                    opacity: k.done ? 0.7 : 1,
                  }}
                >
                  {k.done ? '✓ ' : ''}{k.name}
                </button>
              ))}
            </div>
          )}
        </div>
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
    );
  }

  return (
    <main style={sx.app}>
      <div style={sx.exitBar}>
        <Link href="/" style={sx.exitButton}>
          <span aria-hidden style={{ marginRight: 8 }}>✕</span>
          Exit to parent journal
        </Link>
      </div>

      <div style={sx.masthead}>
        <div style={sx.mastheadLabel}>Bedtime check-in</div>
        <div style={sx.mastheadKid}>
          {kidFirstName} <span style={{ opacity: 0.5 }}>·</span>{' '}
          <span style={{ opacity: 0.6 }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long' })}
          </span>
        </div>
        <div style={sx.fleuron}>❦</div>
        {ritualDoc && (
          <div style={sx.ritualChip}>
            <span aria-hidden style={{ marginRight: 6 }}>📅</span>
            Scheduled ritual
          </div>
        )}
      </div>

      <div style={sx.card}>
        <div style={sx.cardLabelRow}>
          <div style={sx.cardLabel}>{cardDef.label}</div>
          <button type="button" onClick={handleChangeCard} style={sx.changeCardLink}>
            Change card
          </button>
        </div>
        <h2 style={sx.cardTitle}>{cardDef.title}</h2>
        <p style={sx.cardSubtitle}>{cardDef.subtitle}</p>
      </div>

      {/* Parent turn — Parent Reflection card. H/L/B is added in the next commit. */}
      {(card === 'parent-reflection' || card === 'externalized-worry') && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.sageDeep }}>
            {parentFirstName}&rsquo;s turn
          </div>
          <div style={sx.voiceRow}>
            <MicButton
              size="md"
              onTranscript={(t) => {
                const trimmed = t.trim();
                if (!trimmed) return;
                setParentTurn((prev) => ({
                  ...prev,
                  observation: prev.observation?.trim()
                    ? `${prev.observation.trim()} ${trimmed}`
                    : trimmed,
                  voiceText: prev.voiceText?.trim()
                    ? `${prev.voiceText.trim()} ${trimmed}`
                    : trimmed,
                }));
              }}
            />
            <textarea
              value={parentTurn.observation ?? ''}
              onChange={(e) =>
                setParentTurn((prev) => ({ ...prev, observation: e.target.value }))
              }
              placeholder={renderPlaceholder(
                cardDef.parent.slots[0].placeholder,
                kidFirstName,
              )}
              rows={3}
              style={sx.textarea}
              disabled={phase !== 'parent'}
            />
          </div>
          {phase === 'parent' && (
            <div style={sx.passRow}>
              <button type="button" onClick={handlePass} style={sx.passButton}>
                ↓ Pass to {kidFirstName}
              </button>
            </div>
          )}
        </div>
      )}

      {card === 'high-low-buffalo' && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.sageDeep }}>
            {parentFirstName}&rsquo;s turn
          </div>
          <div style={sx.hlbStack}>
            {(['high', 'low', 'buffalo'] as const).map((slot) => (
              <div key={`p-${slot}`}>
                <div style={sx.hlbSlotLabel}>
                  {slot === 'high' ? 'High' : slot === 'low' ? 'Low' : 'Buffalo'}
                </div>
                <div style={sx.hlbInputRow}>
                  <MicButton
                    size="sm"
                    onTranscript={(t) => {
                      const trimmed = t.trim();
                      if (!trimmed) return;
                      setParentTurn((prev) => ({
                        ...prev,
                        [slot]: prev[slot]?.trim()
                          ? `${prev[slot]?.trim()} ${trimmed}`
                          : trimmed,
                      }));
                    }}
                  />
                  <textarea
                    value={parentTurn[slot] ?? ''}
                    onChange={(e) =>
                      setParentTurn((prev) => ({ ...prev, [slot]: e.target.value }))
                    }
                    placeholder={
                      cardDef.parent.slots.find((s) => s.key === slot)?.placeholder ?? ''
                    }
                    rows={2}
                    style={sx.hlbTextarea}
                    disabled={phase !== 'parent'}
                  />
                </div>
              </div>
            ))}
          </div>
          {phase === 'parent' && (
            <div style={sx.passRow}>
              <button type="button" onClick={handlePass} style={sx.passButton}>
                ↓ Pass to {kidFirstName}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={sx.divider} aria-hidden="true" />

      {/* Kid turn — appears when phase is 'kid' */}
      {(card === 'parent-reflection' || card === 'externalized-worry') && phase === 'kid' && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.text5 }}>
            {kidFirstName}&rsquo;s turn
          </div>
          {parentTurn.observation?.trim() && (
            <div style={sx.parentQuote}>
              {parentFirstName} said: &ldquo;{parentTurn.observation.trim()}&rdquo;
            </div>
          )}
          <div style={sx.voiceRow}>
            <MicButton
              size="md"
              onTranscript={(t) => {
                const trimmed = t.trim();
                if (!trimmed) return;
                setKidTurn((prev) => ({
                  ...prev,
                  response: prev.response?.trim()
                    ? `${prev.response.trim()} ${trimmed}`
                    : trimmed,
                  voiceText: prev.voiceText?.trim()
                    ? `${prev.voiceText.trim()} ${trimmed}`
                    : trimmed,
                }));
              }}
            />
            <textarea
              value={kidTurn.response ?? ''}
              onChange={(e) =>
                setKidTurn((prev) => ({ ...prev, response: e.target.value }))
              }
              placeholder={renderPlaceholder(
                cardDef.kid.slots[0].placeholder,
                kidFirstName,
              )}
              rows={3}
              style={sx.textarea}
            />
          </div>
        </div>
      )}

      {card === 'high-low-buffalo' && phase === 'kid' && (
        <div style={sx.turnSection}>
          <div style={{ ...sx.turnLabel, color: T.text5 }}>
            {kidFirstName}&rsquo;s turn
          </div>
          <div style={sx.hlbStack}>
            {(['high', 'low', 'buffalo'] as const).map((slot) => (
              <div key={`k-${slot}`}>
                <div style={sx.hlbSlotLabel}>
                  {slot === 'high' ? 'High' : slot === 'low' ? 'Low' : 'Buffalo'}
                </div>
                {parentTurn[slot]?.trim() && (
                  <div style={sx.hlbQuote}>
                    {parentFirstName}: &ldquo;{parentTurn[slot]?.trim()}&rdquo;
                  </div>
                )}
                <div style={sx.hlbInputRow}>
                  <MicButton
                    size="sm"
                    onTranscript={(t) => {
                      const trimmed = t.trim();
                      if (!trimmed) return;
                      setKidTurn((prev) => ({
                        ...prev,
                        [slot]: prev[slot]?.trim()
                          ? `${prev[slot]?.trim()} ${trimmed}`
                          : trimmed,
                      }));
                    }}
                  />
                  <textarea
                    value={kidTurn[slot] ?? ''}
                    onChange={(e) =>
                      setKidTurn((prev) => ({ ...prev, [slot]: e.target.value }))
                    }
                    placeholder={
                      cardDef.kid.slots.find((s) => s.key === slot)?.placeholder ?? ''
                    }
                    rows={2}
                    style={sx.hlbTextarea}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional sprinkles — feelings / body / share */}
      <div style={sx.sprinkleSection}>
        <div style={sx.sprinkleLabel}>
          Want to add?{' '}
          <span style={{ fontWeight: 500, letterSpacing: '0.06em' }}>
            (skip if you want)
          </span>
        </div>
        <div style={sx.chipRow}>
          <button
            type="button"
            onClick={() =>
              setOpenSprinkle(openSprinkle === 'feelings' ? null : 'feelings')
            }
            style={{
              ...sx.chipBase,
              ...(selfFeelings.length > 0 ? sx.chipOn : null),
            }}
          >
            + a feeling
            {selfFeelings.length > 0 ? ` · ${selfFeelings.length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setOpenSprinkle(openSprinkle === 'body' ? null : 'body')}
            style={{
              ...sx.chipBase,
              ...(bodySpots.length > 0 ? sx.chipOn : null),
            }}
          >
            + where in your body
            {bodySpots.length > 0 ? ` · ${bodySpots.length}` : ''}
          </button>
          {adults.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setOpenSprinkle(openSprinkle === 'share' ? null : 'share')
              }
              style={sx.chipBase}
            >
              Share with…
            </button>
          )}
        </div>

        {openSprinkle === 'feelings' && (
          <div style={sx.emojiGrid}>
            {SELF_FEELINGS.map((f) => {
              const on = selfFeelings.includes(f.word);
              return (
                <button
                  key={f.word}
                  type="button"
                  onClick={() => toggleSelfFeeling(f.word)}
                  style={{ ...sx.emojiTile, ...(on ? sx.emojiTileOn : null) }}
                >
                  <span style={sx.emojiFace}>{f.face}</span>
                  <span>{f.word}</span>
                </button>
              );
            })}
          </div>
        )}

        {openSprinkle === 'body' && (
          <div
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}
          >
            {['head', 'throat', 'chest', 'tummy', 'arms', 'legs'].map((id) => {
              const on = bodySpots.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleBodySpot(id)}
                  style={{ ...sx.chipBase, ...(on ? sx.chipOn : null) }}
                >
                  {id}
                </button>
              );
            })}
          </div>
        )}

        {openSprinkle === 'share' && adults.length > 0 && (
          <div style={sx.shareRow}>
            {adults.map((a) => {
              const selected = sharedWithUserIds.includes(a.userId);
              return (
                <button
                  key={a.userId}
                  type="button"
                  onClick={() => toggleShared(a.userId)}
                  style={sx.avatarChip}
                  aria-pressed={selected}
                >
                  <span style={sx.avatarCircle}>
                    {a.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatarUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={sx.avatarFallback}>
                        {(a.name[0] ?? '?').toUpperCase()}
                      </span>
                    )}
                    {selected && (
                      <span aria-hidden style={sx.selectedDot}>
                        ✓
                      </span>
                    )}
                  </span>
                  <span style={sx.avatarLabel}>
                    {a.name.split(' ')[0].toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {draftRestoredAt !== null && !saveError && (
        <div style={sx.bannerInfo}>
          ↻ Restored your in-progress check-in from earlier. Edit if you want, then tap Done.
        </div>
      )}
      {saveError && (
        <div style={sx.banner}>
          {saveError}
          <button type="button" onClick={handleCopyText} style={sx.copyButton}>
            Copy text
          </button>
        </div>
      )}

      {/* Done — always available when in parent or kid phase. Soft-confirm on empty parent is handled in handlePass. */}
      {(phase === 'kid' || phase === 'parent') && (
        <div style={sx.doneRow}>
          <button
            type="button"
            onClick={handleDone}
            disabled={saving}
            style={{ ...sx.done, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Done — Goodnight'}
          </button>
        </div>
      )}
    </main>
  );
}
