'use client';
/* ================================================================
   /kid/[personId] — kid mode

   The parent-handoff screen. Adult opens the route from a "moment
   with [kid]" row, hands the screen to the kid, the kid taps emojis
   / talks / picks where in the body / optionally picks a relationship
   target — and hits "All done." The contribution saves as a journal
   entry attributed to the kid (subjectType='child_proxy').

   Mock: docs/journal-first-redesign/kid-mode.html v2.1
   ================================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { usePerson } from '@/hooks/usePerson';
import { MicButton } from '@/components/voice/MicButton';
import { T } from '@/components/journal-first/tokens';

/* ─── Vocabularies ─── */
const KID_FEELINGS_SELF = [
  { face: '😀', word: 'happy' },
  { face: '😌', word: 'calm' },
  { face: '😴', word: 'tired' },
  { face: '😟', word: 'worried' },
  { face: '😢', word: 'sad' },
  { face: '😠', word: 'mad' },
  { face: '🤔', word: 'unsure' },
  { face: '😎', word: 'good' },
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

function partOfDay(d: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = d.getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
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
    gridTemplateColumns: 'repeat(4, 1fr)',
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
};

export default function KidModePage() {
  const params = useParams<{ personId: string }>();
  const personId = params?.personId;
  const router = useRouter();
  const { user } = useAuth();
  const { people } = usePerson();
  const { createEntry, saving } = useJournal();

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

  // ─── State ───
  const [selfFeelings, setSelfFeelings] = useState<string[]>([]);
  const [bodySpots, setBodySpots] = useState<string[]>([]);
  const [voiceText, setVoiceText] = useState('');
  const [relTargetId, setRelTargetId] = useState<string | null>(null);
  const [relFeelings, setRelFeelings] = useState<string[]>([]);
  const [relVoice, setRelVoice] = useState('');
  const [showRel, setShowRel] = useState(true);
  // 'editing' = the input form, 'saved' = the "anyone else?" picker.
  // Letting the parent batch sibling check-ins without bouncing home.
  const [phase, setPhase] = useState<'editing' | 'saved'>('editing');
  const [doneIds, setDoneIds] = useState<string[]>([]);

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

  // Pre-select relationship target as the first sibling if there is one,
  // else the first family member.
  useEffect(() => {
    if (relTargetId === null && familyForRel.length > 0) {
      setRelTargetId(familyForRel[0].id);
    }
  }, [familyForRel, relTargetId]);

  // All hooks must run unconditionally and in the same order on every
  // render — so these useMemos sit above the early loading-return.
  const relTargetName = useMemo(() => {
    const t = familyForRel.find((p) => p.id === relTargetId);
    return t?.label ?? '';
  }, [familyForRel, relTargetId]);

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

  const handleDone = async () => {
    if (saving) return;
    if (!user?.familyId) return;
    try {
      const parts: string[] = [];
      if (voiceText.trim()) parts.push(voiceText.trim());
      if (selfFeelings.length > 0) {
        parts.push(`[${kid.name}: ${selfFeelings.join(', ')}]`);
      }
      if (bodySpots.length > 0) {
        parts.push(`[felt in: ${bodySpots.join(', ')}]`);
      }
      if (showRel && relTargetId && relFeelings.length > 0) {
        parts.push(`[about ${relTargetName}: ${relFeelings.join(', ')}]`);
      }
      if (showRel && relTargetId && relVoice.trim()) {
        parts.push(relVoice.trim());
      }

      const body = parts.join('\n\n') || `[${kid.name} did a check-in]`;

      // Mentions: the kid themselves, plus the rel target if present
      const mentions: string[] = [kid.personId];
      if (showRel && relTargetId) mentions.push(relTargetId);

      const tags = [
        'kid-mode',
        'check-in',
        ...(selfFeelings.length ? [`feel-self:${selfFeelings.join(',')}`] : []),
        ...(bodySpots.length ? [`body:${bodySpots.join(',')}`] : []),
        ...(showRel && relTargetId && relFeelings.length
          ? [`feel-rel:${relFeelings.join(',')}`]
          : []),
      ];

      // Structured kid check-in payload — same shape as adult, with
      // `kind: 'child'` and the body-map spots if any.
      const checkIn = (selfFeelings.length > 0 || bodySpots.length > 0 || relFeelings.length > 0)
        ? {
            kind: 'child' as const,
            timeOfDay: partOfDay(today),
            selfFeelings,
            ...(bodySpots.length > 0 ? { bodySpots } : {}),
            ...(showRel && relTargetId && relFeelings.length > 0
              ? { relFeelings, withPersonIds: [relTargetId] }
              : {}),
          }
        : undefined;

      await createEntry({
        text: body,
        category: 'moment',
        personMentions: mentions,
        // Default: visible to whole family for kid contributions, since
        // the parent is sitting with the kid and the entry is the kid's
        // voice — sharing it broadly is the spirit of the multi-perspective
        // model. (Adults can change visibility later from the entry page.)
        sharedWithUserIds: [],
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
                    onClick={() => router.push(`/kid/${k.personId}`)}
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

        {/* Voice */}
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
            <p style={sx.voiceCopy}>
              {voiceText
                ? <em style={{ fontStyle: 'italic', color: T.ink }}>&ldquo;{voiceText}&rdquo;</em>
                : <em style={{ fontStyle: 'italic' }}>Tap and tell me about your morning.</em>}
            </p>
          </div>
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

        {/* Relationship step — optional, parent-led */}
        {showRel && familyForRel.length > 0 && (
          <>
            <div style={sx.divider} aria-hidden="true" />
            <section style={sx.section}>
              <span style={sx.label}>If you want — about someone</span>
              <div style={sx.relTargets}>
                {familyForRel.map((p) => {
                  const on = relTargetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRelTargetId(p.id)}
                      style={{ ...sx.relChipBase, ...(on ? sx.relChipOn : null) }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p style={sx.relQuestion}>
                How are you feeling about <em style={{ fontStyle: 'italic', color: T.ink }}>{relTargetName}</em>?
              </p>
              <div style={sx.feelings}>
                {KID_FEELINGS_REL.map((f) => {
                  const on = relFeelings.includes(f.word);
                  return (
                    <button
                      key={f.word}
                      type="button"
                      onClick={() => setRelFeelings((prev) => toggle(prev, f.word))}
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
                    setRelVoice((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed));
                  }}
                />
                <p style={sx.voiceCopy}>
                  {relVoice
                    ? <em style={{ fontStyle: 'italic', color: T.ink }}>&ldquo;{relVoice}&rdquo;</em>
                    : <em style={{ fontStyle: 'italic' }}>Tap and tell me about {relTargetName} if you want.</em>}
                </p>
              </div>
              <button
                type="button"
                style={sx.relSkip}
                onClick={() => {
                  setShowRel(false);
                  setRelFeelings([]);
                  setRelVoice('');
                }}
              >
                Skip this part
              </button>
            </section>
          </>
        )}

        {/* Done */}
        <div style={sx.doneRow}>
          <button
            type="button"
            onClick={handleDone}
            disabled={saving}
            style={{
              ...sx.done,
              background: T.ink,
              borderColor: T.ink,
              opacity: saving ? 0.6 : 1,
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
