'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { usePerson } from '@/hooks/usePerson';
import Navigation from '@/components/layout/Navigation';
import SideNav from '@/components/layout/SideNav';
import { EXERCISE_TYPES } from '@/config/exercise-types';
import type { GrowthItem, GrowthItemType, FeedbackReaction, ImpactRating } from '@/types/growth';

// ================================================================
// Types
// ================================================================
type Step = 'brief' | 'doing' | 'reflect' | 'complete';
type PerformanceMode = 'writing' | 'timer' | 'steps' | 'story' | 'default';

// ================================================================
// Helpers
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

function romanMinutes(n: number): string {
  if (n <= 20) return toRoman(n).toUpperCase();
  return String(n);
}

function getPerformanceMode(type: GrowthItemType): PerformanceMode {
  switch (type) {
    case 'journaling':
    case 'reflection_prompt':
    case 'solo_deep_dive':
    case 'gratitude_practice':
      return 'writing';
    case 'mindfulness':
    case 'micro_activity':
      return 'timer';
    case 'conversation_guide':
    case 'partner_exercise':
    case 'repair_ritual':
      return 'steps';
    case 'illustrated_story':
      return 'story';
    default:
      return 'default';
  }
}

function parseSteps(body: string): string[] {
  if (!body.match(/\d+[\.\)]\s/)) return [];
  return body
    .split(/(?=\d+[\.\)]\s)/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean);
}

const IMPACT_LABELS: { value: ImpactRating; label: string; description: string }[] = [
  { value: 1, label: 'Something small', description: 'I noticed a flicker' },
  { value: 2, label: 'Something shifted', description: 'I felt it land' },
  { value: 3, label: 'A real moment', description: 'Something opened up' },
];

const EXERCISE_LABELS: Record<string, string> = {
  micro_activity: 'A brief practice',
  conversation_guide: 'A conversation',
  reflection_prompt: 'A reflection',
  assessment_prompt: 'A small assessment',
  journaling: 'A journal entry',
  mindfulness: 'A moment of stillness',
  partner_exercise: 'A practice for two',
  solo_deep_dive: 'A longer sit',
  repair_ritual: 'A repair',
  gratitude_practice: 'A gratitude',
  illustrated_story: 'A story',
  weekly_arc: 'A weekly arc',
  progress_snapshot: 'A progress note',
};

// ================================================================
// Main page
// ================================================================
export default function GrowthItemWorkspace({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { submitFeedback } = useGrowthFeed();
  const { people } = usePerson();

  const [item, setItem] = useState<GrowthItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('brief');
  const [selectedReaction, setSelectedReaction] = useState<FeedbackReaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [myNote, setMyNote] = useState('');
  const [partnerNote, setPartnerNote] = useState('');

  // Story-specific reaction state
  const [storyRating, setStoryRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [storyEmoji, setStoryEmoji] = useState<string>('');
  const [storyComment, setStoryComment] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!itemId) return;

    (async () => {
      const snap = await getDoc(doc(firestore, 'growth_items', itemId));
      if (snap.exists()) {
        setItem({ ...snap.data(), growthItemId: snap.id } as GrowthItem);
      }
      setLoading(false);
    })();
  }, [itemId, user, authLoading, router]);

  const myName = user?.name?.split(' ')[0] || 'You';
  const otherParticipants = item ? (item.targetPersonNames || [])
    .filter((name) => name !== myName)
    .map((name) => {
      const person = people.find((p) => p.name === name);
      return { name, userId: person?.linkedUserId || null };
    }) : [];

  const isMultiPerson = (item?.targetPersonNames?.length || 0) >= 2;
  const otherPerson = otherParticipants[0] || null;

  const handleComplete = useCallback(async (reaction: FeedbackReaction, impact?: ImpactRating) => {
    if (!item || submitting || !user?.userId) return;
    setSubmitting(true);
    setSelectedReaction(reaction);
    try {
      await submitFeedback(item.growthItemId, reaction, impact, myNote || undefined, user.userId);
      if (isMultiPerson && otherPerson?.userId && partnerNote.trim()) {
        await submitFeedback(item.growthItemId, reaction, impact, partnerNote, otherPerson.userId);
      }
      setStep('complete');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmitting(false);
    }
  }, [item, myNote, partnerNote, submitFeedback, submitting, user?.userId, isMultiPerson, otherPerson?.userId]);

  // Handler for story reactions — saves the kid's reaction on the item,
  // marks the item complete, and writes a progress note to the kid's manual
  // so the reaction becomes raw material for the next synthesis.
  const handleStoryReaction = useCallback(async () => {
    if (!item || submitting || !user?.userId || storyRating === null) return;
    setSubmitting(true);
    try {
      const now = Timestamp.now();
      const kidPersonId = item.targetPersonIds?.[0];
      const kidName = item.targetPersonNames?.[0] || 'them';
      const storyContent = (item as unknown as { storyContent?: { title?: string } }).storyContent;
      const storyTitle = storyContent?.title || item.title;

      // 1. Update the growth item with kidReaction and mark complete
      await updateDoc(doc(firestore, 'growth_items', item.growthItemId), {
        kidReaction: {
          rating: storyRating,
          emoji: storyEmoji,
          comment: storyComment.trim() || null,
          reactedAt: now,
          capturedBy: user.userId,
        },
        status: 'completed',
        statusUpdatedAt: now,
      });

      // 2. Write a progress note to the kid's manual
      if (kidPersonId) {
        const category: 'improvement' | 'insight' | 'concern' =
          storyRating >= 4 ? 'improvement'
            : storyRating <= 2 ? 'concern'
            : 'insight';

        const noteBody = storyComment.trim()
          ? `Read "${storyTitle}" with ${kidName}. Reaction: ${storyEmoji}. Said: "${storyComment.trim()}"`
          : `Read "${storyTitle}" with ${kidName}. Reaction: ${storyEmoji}.`;

        const manualQuery = query(
          collection(firestore, 'person_manuals'),
          where('personId', '==', kidPersonId),
        );
        const manualSnap = await getDocs(manualQuery);
        if (!manualSnap.empty) {
          await updateDoc(manualSnap.docs[0].ref, {
            progressNotes: arrayUnion({
              id: `story-${item.growthItemId}-${Date.now()}`,
              date: now,
              note: noteBody,
              category,
              addedBy: user.userId,
            }),
            updatedAt: now,
          });
        }
      }

      setStep('complete');
    } catch (err) {
      console.error('Failed to save story reaction:', err);
    } finally {
      setSubmitting(false);
    }
  }, [item, submitting, user?.userId, storyRating, storyEmoji, storyComment]);

  if (authLoading || loading) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-loading">Turning to the page&hellip;</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="relish-page">
        <Navigation />
        <SideNav />
        <div className="pt-[64px]">
          <div className="press-binder">
            <div className="press-empty" style={{ padding: '80px 20px' }}>
              <p className="press-empty-title">This page is missing from the volume.</p>
              <p className="press-empty-body">The practice may have been removed or expired.</p>
              <button
                onClick={() => router.push('/workbook')}
                className="press-link"
                style={{ background: 'transparent', cursor: 'pointer' }}
              >
                Return to the workbook
                <span className="arrow">⟶</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAlreadyDone = item.status === 'completed' || item.status === 'skipped';
  const performanceMode = getPerformanceMode(item.type);

  // If already done when the user lands, skip straight to the complete view
  if (isAlreadyDone && step === 'brief') {
    return <CompleteView item={item} isAlreadyDone onReturn={() => router.push('/workbook')} />;
  }

  return (
    <div className="relish-page">
      <Navigation />
      <SideNav />

      <div className="pt-[64px] pb-24">
        {step === 'brief' && (
          <BriefView
            item={item}
            onBegin={() => setStep('doing')}
            onAlreadyDid={() => setStep('reflect')}
            onDefer={() => handleComplete('not_now')}
            submitting={submitting}
          />
        )}

        {step === 'doing' && (
          <DoingView
            item={item}
            mode={performanceMode}
            myNote={myNote}
            setMyNote={setMyNote}
            onDone={() => setStep('reflect')}
            onBack={() => setStep('brief')}
          />
        )}

        {step === 'reflect' && (
          <ReflectView
            item={item}
            myName={myName}
            otherPerson={otherPerson}
            isMultiPerson={isMultiPerson}
            myNote={myNote}
            setMyNote={setMyNote}
            partnerNote={partnerNote}
            setPartnerNote={setPartnerNote}
            performanceMode={performanceMode}
            submitting={submitting}
            onRate={(impact) => handleComplete('tried_it', impact)}
            onSkipRating={() => handleComplete('loved_it', 3)}
            storyRating={storyRating}
            setStoryRating={setStoryRating}
            storyEmoji={storyEmoji}
            setStoryEmoji={setStoryEmoji}
            storyComment={storyComment}
            setStoryComment={setStoryComment}
            onSaveStoryReaction={handleStoryReaction}
          />
        )}

        {step === 'complete' && (
          <CompleteView
            item={item}
            isAlreadyDone={false}
            selectedReaction={selectedReaction}
            onReturn={() => router.push('/workbook')}
          />
        )}
      </div>
    </div>
  );
}

// ================================================================
// BRIEF VIEW — the opening page
// ================================================================
function BriefView({
  item,
  onBegin,
  onAlreadyDid,
  onDefer,
  submitting,
}: {
  item: GrowthItem;
  onBegin: () => void;
  onAlreadyDid: () => void;
  onDefer: () => void;
  submitting: boolean;
}) {
  const typeDef = EXERCISE_TYPES[item.type];
  const minutes = item.estimatedMinutes || 0;
  const forWhom = item.assignedToUserName?.split(' ')[0] || 'you';
  const about = item.targetPersonNames?.join(' & ');
  const exerciseLabel = EXERCISE_LABELS[item.type] || typeDef?.label || 'A practice';
  const level =
    item.relationalLevel === 'couple' ? 'A practice for two'
      : item.relationalLevel === 'family' ? 'A family practice'
      : 'Individual';
  const fromChat = Boolean(
    (item as unknown as { sourceChatSessionId?: string }).sourceChatSessionId,
  );
  const router = useRouter();

  return (
    <div className="press-binder" style={{ maxWidth: 952 }}>

      {/* Running header */}
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>The Workbook</span>
        <span className="sep">·</span>
        <span>A practice</span>
      </div>

      {/* Back link */}
      <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 18 }}>
        <button
          onClick={() => router.push('/workbook')}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          ⟵ Return to the workbook
        </button>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', paddingBottom: 6 }}>
        <span className="press-chapter-label" style={{ display: 'block', textAlign: 'center' }}>
          {exerciseLabel}
        </span>
      </div>
      <h1 className="press-binder-title" style={{ textAlign: 'center', fontSize: 'clamp(36px, 5vw, 48px)' }}>
        {item.title}
      </h1>

      {/* Meta line */}
      <p
        className="press-meta-line"
        style={{ textAlign: 'center', marginTop: 18, marginBottom: 10 }}
      >
        {romanMinutes(minutes)} minutes
        {about && (
          <>
            <span className="dot">·</span>
            about <span className="press-sc">{about}</span>
          </>
        )}
        <span className="dot">·</span>
        for <span className="press-sc">{forWhom}</span>
        <span className="dot">·</span>
        {level}
      </p>

      {fromChat && (
        <p
          className="press-marginalia"
          style={{ textAlign: 'center', fontSize: 13, marginBottom: 8 }}
        >
          drawn from a conversation with the manual
        </p>
      )}

      <div className="press-asterism" aria-hidden="true" style={{ margin: '22px 0 20px' }} />

      {/* The briefing body — special handling for stories */}
      <div style={{ padding: '0 20px 32px' }}>
        {item.type === 'illustrated_story' ? (
          <p
            className="press-body-italic"
            style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto', fontSize: 17 }}
          >
            A short story to read aloud with {about || 'them'} — five
            minutes, together. When you&rsquo;re done, you&rsquo;ll be
            asked how it landed.
          </p>
        ) : (
          <p className="press-body" style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
            {item.body.length > 280
              ? item.body.slice(0, 280).trim() + '…'
              : item.body}
          </p>
        )}
      </div>

      <hr className="press-rule" style={{ width: '60%', margin: '0 auto 32px' }} />

      {/* Primary action — begin */}
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <button
          onClick={onBegin}
          className="press-link"
          style={{
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 22,
          }}
        >
          {item.type === 'illustrated_story' ? 'Open the story' : 'Begin this practice'}
          <span className="arrow">⟶</span>
        </button>
      </div>

      {/* Secondary actions */}
      <div
        style={{
          textAlign: 'center',
          paddingTop: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <button
          onClick={onAlreadyDid}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          I already did this — skip to reflection
        </button>
        <button
          onClick={onDefer}
          disabled={submitting}
          className="press-marginalia"
          style={{
            background: 'transparent',
            border: 0,
            cursor: submitting ? 'wait' : 'pointer',
            fontSize: 13,
            color: '#7A6E5C',
            opacity: submitting ? 0.5 : 1,
          }}
        >
          not this time — bring it back later
        </button>
      </div>

      <div className="press-fleuron mt-12">❦</div>
    </div>
  );
}

// ================================================================
// DOING VIEW — the performance phase, adapts to type
// ================================================================
function DoingView({
  item,
  mode,
  myNote,
  setMyNote,
  onDone,
  onBack,
}: {
  item: GrowthItem;
  mode: PerformanceMode;
  myNote: string;
  setMyNote: (v: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  if (mode === 'writing') {
    return <WritingPerformance item={item} myNote={myNote} setMyNote={setMyNote} onDone={onDone} onBack={onBack} />;
  }
  if (mode === 'timer') {
    return <TimerPerformance item={item} onDone={onDone} onBack={onBack} />;
  }
  if (mode === 'steps') {
    return <StepsPerformance item={item} onDone={onDone} onBack={onBack} />;
  }
  if (mode === 'story') {
    return <StoryPerformance item={item} onDone={onDone} onBack={onBack} />;
  }
  return <DefaultPerformance item={item} onDone={onDone} onBack={onBack} />;
}

// ================================================================
// WRITING PERFORMANCE — a proper writing surface
// ================================================================
function WritingPerformance({
  item,
  myNote,
  setMyNote,
  onDone,
  onBack,
}: {
  item: GrowthItem;
  myNote: string;
  setMyNote: (v: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const wordCount = myNote.trim() ? myNote.trim().split(/\s+/).length : 0;
  const elapsedMinutes = Math.floor(elapsed / 60);

  return (
    <div className="press-binder" style={{ maxWidth: 1008 }}>

      {/* Running header */}
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>In the writing</span>
        <span className="sep">·</span>
        <span>{item.title}</span>
      </div>

      {/* Back link */}
      <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 16 }}>
        <button
          onClick={onBack}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          ⟵ Back to the briefing
        </button>
      </div>

      {/* Title + prompt */}
      <div style={{ padding: '0 56px' }}>
        <span className="press-chapter-label">The prompt</span>
        <p
          className="press-body-italic mt-2"
          style={{ fontSize: 16, color: '#5C5347', lineHeight: 1.55 }}
        >
          {item.body}
        </p>
      </div>

      <hr className="press-rule" style={{ margin: '28px 56px', width: 'auto' }} />

      {/* The writing surface — large, editorial */}
      <div style={{ padding: '0 56px 20px' }}>
        <textarea
          ref={textareaRef}
          value={myNote}
          onChange={(e) => setMyNote(e.target.value)}
          placeholder="Let yourself think on paper&hellip;"
          rows={14}
          className="w-full focus:outline-none"
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 19,
            fontStyle: 'italic',
            color: '#3A3530',
            background: 'transparent',
            border: 0,
            lineHeight: 1.55,
            resize: 'none',
            padding: '8px 2px',
            letterSpacing: '0.002em',
            minHeight: 380,
          }}
        />
      </div>

      {/* Word count + elapsed time — marginalia */}
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '0 56px 20px' }}
      >
        <p className="press-marginalia" style={{ fontSize: 13 }}>
          {wordCount > 0 ? (
            <>
              {toRoman(wordCount).toLowerCase()} words &middot; {elapsedMinutes === 0 ? 'just begun' : `${toRoman(elapsedMinutes).toLowerCase()} min in`}
            </>
          ) : (
            'blank page'
          )}
        </p>
        <p className="press-marginalia" style={{ fontSize: 14, color: '#7A6E5C' }}>
          autosaved as you go
        </p>
      </div>

      <hr className="press-rule" style={{ margin: '0 56px 24px', width: 'auto' }} />

      {/* Action */}
      <div style={{ textAlign: 'center', padding: '0 20px' }}>
        <button
          onClick={onDone}
          className="press-link"
          style={{
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 18,
            opacity: wordCount === 0 ? 0.5 : 1,
          }}
        >
          I&rsquo;ve written what I need
          <span className="arrow">⟶</span>
        </button>
      </div>

      <div className="press-fleuron mt-10">❦</div>
    </div>
  );
}

// ================================================================
// TIMER PERFORMANCE — a countdown that holds you through it
// ================================================================
function TimerPerformance({
  item,
  onDone,
  onBack,
}: {
  item: GrowthItem;
  onDone: () => void;
  onBack: () => void;
}) {
  const totalSeconds = (item.estimatedMinutes || 1) * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = 1 - remaining / totalSeconds;

  // Editorial phrasing of time remaining
  const timePhrase = remaining === 0
    ? 'the time has passed'
    : minutes === 0
      ? `${seconds} second${seconds !== 1 ? 's' : ''} remain`
      : minutes === 1 && seconds === 0
        ? 'one minute remains'
        : `${toRoman(minutes).toLowerCase()}${seconds > 0 ? ` ${String(seconds).padStart(2, '0')}` : ''} min remain`;

  return (
    <div className="press-binder" style={{ maxWidth: 952 }}>

      {/* Running header */}
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>In the practice</span>
        <span className="sep">·</span>
        <span>{item.title}</span>
      </div>

      {/* Back link */}
      <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 18 }}>
        <button
          onClick={onBack}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          ⟵ Back to the briefing
        </button>
      </div>

      {/* Instruction — always visible */}
      <div
        style={{
          padding: '24px 56px',
          borderTop: '1px solid rgba(200,190,172,0.5)',
          borderBottom: '1px solid rgba(200,190,172,0.5)',
          background: 'rgba(247,245,240,0.6)',
        }}
      >
        <span className="press-chapter-label">What to do</span>
        <p
          className="press-body-italic mt-2"
          style={{ fontSize: 16, color: '#3A3530', lineHeight: 1.55 }}
        >
          {item.body}
        </p>
      </div>

      {/* The timer — editorial, no digital-clock feel */}
      <div
        style={{
          textAlign: 'center',
          padding: '60px 20px 40px',
        }}
      >
        <span className="press-chapter-label" style={{ display: 'block', textAlign: 'center' }}>
          {!running && remaining === totalSeconds
            ? 'when you are ready'
            : remaining === 0
              ? 'time is up'
              : 'currently'}
        </span>
        <h2
          className="press-display-lg"
          style={{
            fontSize: 'clamp(56px, 9vw, 88px)',
            fontStyle: 'italic',
            margin: '20px 0 14px',
            letterSpacing: '-0.02em',
          }}
        >
          {timePhrase}
        </h2>

        {/* Progress as a thin horizontal rule */}
        <div
          style={{
            maxWidth: 420,
            margin: '30px auto 0',
            position: 'relative',
            height: 1,
            background: 'rgba(200,190,172,0.5)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: 1,
              width: `${progress * 100}%`,
              background: '#7C9082',
              transition: running ? 'width 1s linear' : 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div
        className="flex items-baseline justify-center"
        style={{ gap: 32, padding: '20px 20px 28px' }}
      >
        {!running && remaining > 0 && (
          <button
            onClick={() => setRunning(true)}
            className="press-link"
            style={{
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            {remaining === totalSeconds ? 'Begin the timer' : 'Resume'}
            <span className="arrow">⟶</span>
          </button>
        )}
        {running && remaining > 0 && (
          <button
            onClick={() => setRunning(false)}
            className="press-link-sm"
            style={{ background: 'transparent', cursor: 'pointer' }}
          >
            Pause
          </button>
        )}
        <button
          onClick={onDone}
          className={remaining === 0 ? 'press-link' : 'press-link-sm'}
          style={{
            background: 'transparent',
            cursor: 'pointer',
            fontSize: remaining === 0 ? 20 : 15,
          }}
        >
          {remaining === 0 ? "I'm done" : 'Finish early'}
          {remaining === 0 && <span className="arrow">⟶</span>}
        </button>
      </div>

      <hr className="press-rule-short" style={{ margin: '8px auto 12px' }} />

      <div className="press-fleuron">❦</div>
    </div>
  );
}

// ================================================================
// STEPS PERFORMANCE — multi-step conversation/partner exercises
// ================================================================
function StepsPerformance({
  item,
  onDone,
  onBack,
}: {
  item: GrowthItem;
  onDone: () => void;
  onBack: () => void;
}) {
  const steps = parseSteps(item.body);
  const [current, setCurrent] = useState(0);

  // If the body has no numbered steps, fall back to default
  if (steps.length === 0) {
    return <DefaultPerformance item={item} onDone={onDone} onBack={onBack} />;
  }

  const isLast = current === steps.length - 1;
  const isFirst = current === 0;

  return (
    <div className="press-binder" style={{ maxWidth: 952 }}>

      {/* Running header */}
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>In the conversation</span>
        <span className="sep">·</span>
        <span>{item.title}</span>
      </div>

      {/* Back link */}
      <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 18 }}>
        <button
          onClick={onBack}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          ⟵ Back to the briefing
        </button>
      </div>

      {/* Step indicator — row of hairlines */}
      <div
        className="flex gap-1.5"
        style={{ padding: '0 56px 28px' }}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 1.5,
              background: i <= current ? '#7C9082' : 'rgba(200,190,172,0.5)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Step label */}
      <div style={{ textAlign: 'center', paddingBottom: 12 }}>
        <span className="press-chapter-label">
          Prompt {toRoman(current + 1)} of {toRoman(steps.length)}
        </span>
      </div>

      {/* The current step — large, readable */}
      <div
        style={{
          padding: '40px 56px 50px',
          minHeight: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          className="press-body"
          style={{
            fontSize: 'clamp(22px, 3vw, 28px)',
            lineHeight: 1.4,
            textAlign: 'center',
            maxWidth: 540,
            fontFamily: 'var(--font-parent-display)',
            fontStyle: 'italic',
            color: '#3A3530',
          }}
        >
          {steps[current]}
        </p>
      </div>

      <hr className="press-rule" style={{ margin: '0 56px 24px', width: 'auto' }} />

      {/* Navigation */}
      <div
        className="flex items-baseline justify-between"
        style={{ padding: '0 56px 28px' }}
      >
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={isFirst}
          className="press-link-sm"
          style={{
            background: 'transparent',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.3 : 1,
          }}
        >
          ⟵ Previous
        </button>

        {!isLast ? (
          <button
            onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
            className="press-link"
            style={{
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            Next prompt
            <span className="arrow">⟶</span>
          </button>
        ) : (
          <button
            onClick={onDone}
            className="press-link"
            style={{
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            We&rsquo;ve completed this
            <span className="arrow">⟶</span>
          </button>
        )}
      </div>

      <div className="press-fleuron">❦</div>
    </div>
  );
}

// ================================================================
// STORY PERFORMANCE — the reading surface for illustrated stories
// A parent opens this, reads the story aloud with their child, and then
// moves to the reflect phase to capture the child's reaction.
// ================================================================
function StoryPerformance({
  item,
  onDone,
  onBack,
}: {
  item: GrowthItem;
  onDone: () => void;
  onBack: () => void;
}) {
  const storyContent = (item as unknown as { storyContent?: {
    title: string;
    paragraphs: string[];
    openingLine?: string;
  } }).storyContent;
  const childName = item.targetPersonNames?.[0] || 'them';

  // Fallback: if for some reason storyContent isn't populated, split the
  // item.body on blank lines so we still render something.
  const title = storyContent?.title || item.title;
  const paragraphs: string[] = storyContent?.paragraphs && storyContent.paragraphs.length > 0
    ? storyContent.paragraphs
    : item.body.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <div className="press-binder" style={{ maxWidth: 896 }}>

      {/* Running header — "a story for [childName]" */}
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>A story</span>
        <span className="sep">·</span>
        <span>for {childName}</span>
      </div>

      {/* Back link */}
      <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 18 }}>
        <button
          onClick={onBack}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          ⟵ Back to the briefing
        </button>
      </div>

      {/* Opening ornament */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-parent-display)',
          fontSize: 20,
          color: '#8C8070',
          letterSpacing: '0.4em',
          marginBottom: 18,
        }}
        aria-hidden="true"
      >
        ❦ · ❦ · ❦
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--font-parent-display)',
          fontSize: 'clamp(36px, 5vw, 52px)',
          fontWeight: 300,
          fontStyle: 'italic',
          color: '#3A3530',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          padding: '0 24px',
          marginBottom: 12,
        }}
      >
        {title}
      </h1>

      {/* A small label */}
      <p
        className="press-marginalia"
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#7A6E5C',
          marginBottom: 8,
        }}
      >
        — read aloud, together —
      </p>

      {/* Asterism break before the story body */}
      <div className="press-asterism" aria-hidden="true" style={{ margin: '22px 0 28px' }} />

      {/* The story body — editorial Cormorant italic with drop cap on first para */}
      <div style={{ padding: '0 32px 32px' }}>
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className={i === 0 ? 'press-drop-cap' : ''}
            style={{
              fontFamily: 'var(--font-parent-display)',
              fontSize: 19,
              fontWeight: 400,
              fontStyle: 'italic',
              color: '#3A3530',
              lineHeight: 1.55,
              letterSpacing: '0.002em',
              marginBottom: 18,
              textAlign: i === 0 ? 'left' : 'justify',
              hyphens: 'auto',
            }}
          >
            {para}
          </p>
        ))}
      </div>

      {/* Closing ornament */}
      <div className="press-fleuron" style={{ fontSize: 18, marginTop: 8 }}>
        ❦
      </div>
      <p
        className="press-marginalia"
        style={{ textAlign: 'center', fontSize: 14, marginTop: 4, fontStyle: 'italic' }}
      >
        — the end —
      </p>

      <hr className="press-rule" style={{ margin: '36px 56px 24px', width: 'auto' }} />

      {/* Move on to the reaction capture */}
      <div style={{ textAlign: 'center', padding: '0 20px 40px' }}>
        <button
          onClick={onDone}
          className="press-link"
          style={{
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          How did {childName} take it?
          <span className="arrow">⟶</span>
        </button>
      </div>
    </div>
  );
}

// ================================================================
// DEFAULT PERFORMANCE — instruction held large with a done button
// ================================================================
function DefaultPerformance({
  item,
  onDone,
  onBack,
}: {
  item: GrowthItem;
  onDone: () => void;
  onBack: () => void;
}) {
  return (
    <div className="press-binder" style={{ maxWidth: 952 }}>

      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>In the practice</span>
        <span className="sep">·</span>
        <span>{item.title}</span>
      </div>

      <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 18 }}>
        <button
          onClick={onBack}
          className="press-link-sm"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          ⟵ Back to the briefing
        </button>
      </div>

      {/* Instruction — large editorial body */}
      <div style={{ padding: '20px 56px 40px' }}>
        <span
          className="press-chapter-label"
          style={{ display: 'block', textAlign: 'center', marginBottom: 20 }}
        >
          What to do
        </span>
        <p
          className="press-body press-drop-cap"
          style={{ fontSize: 18 }}
        >
          {item.body}
        </p>
      </div>

      <hr className="press-rule" style={{ margin: '0 56px 24px', width: 'auto' }} />

      <div style={{ textAlign: 'center', padding: '0 20px 28px' }}>
        <button
          onClick={onDone}
          className="press-link"
          style={{
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          I&rsquo;ve done this
          <span className="arrow">⟶</span>
        </button>
      </div>

      <div className="press-fleuron">❦</div>
    </div>
  );
}

// ================================================================
// STORY REACTION VIEW — captures the kid's emoji + comment after a story
// ================================================================
const STORY_EMOJI_SCALE: Array<{
  rating: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  label: string;
}> = [
  { rating: 1, emoji: '😕', label: 'confused' },
  { rating: 2, emoji: '😐', label: 'meh' },
  { rating: 3, emoji: '🙂', label: 'okay' },
  { rating: 4, emoji: '😄', label: 'loved it' },
  { rating: 5, emoji: '🤔', label: 'made them think' },
];

function StoryReactionView({
  item,
  storyRating,
  setStoryRating,
  storyEmoji,
  setStoryEmoji,
  storyComment,
  setStoryComment,
  submitting,
  onSave,
}: {
  item: GrowthItem;
  storyRating: 1 | 2 | 3 | 4 | 5 | null;
  setStoryRating: (r: 1 | 2 | 3 | 4 | 5) => void;
  storyEmoji: string;
  setStoryEmoji: (e: string) => void;
  storyComment: string;
  setStoryComment: (c: string) => void;
  submitting: boolean;
  onSave: () => void;
}) {
  const childName = item.targetPersonNames?.[0] || 'them';

  const handleSelect = (rating: 1 | 2 | 3 | 4 | 5, emoji: string) => {
    setStoryRating(rating);
    setStoryEmoji(emoji);
  };

  return (
    <div className="press-binder" style={{ maxWidth: 896 }}>

      {/* Running header */}
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>After the story</span>
        <span className="sep">·</span>
        <span>for {childName}</span>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 8 }}>
        <span className="press-chapter-label">What stayed with {childName}?</span>
      </div>
      <h2
        className="press-display-md"
        style={{
          textAlign: 'center',
          marginTop: 12,
          marginBottom: 8,
          fontSize: 'clamp(28px, 4vw, 36px)',
        }}
      >
        How did it land?
      </h2>
      <p
        className="press-marginalia"
        style={{
          textAlign: 'center',
          fontSize: 13,
          marginBottom: 24,
          maxWidth: 380,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Ask {childName} how the story felt. Tap the face that fits
        best, together.
      </p>

      <hr className="press-rule-short" style={{ margin: '0 auto 32px' }} />

      {/* Emoji scale */}
      <div
        className="flex items-end justify-center"
        style={{ gap: 14, padding: '0 20px 28px', flexWrap: 'wrap' }}
      >
        {STORY_EMOJI_SCALE.map(({ rating, emoji, label }) => {
          const isSelected = storyRating === rating;
          return (
            <button
              key={rating}
              onClick={() => handleSelect(rating, emoji)}
              className="flex flex-col items-center transition-all"
              style={{
                background: 'transparent',
                border: 0,
                padding: 12,
                cursor: 'pointer',
                opacity: storyRating === null || isSelected ? 1 : 0.4,
                transform: isSelected ? 'translateY(-6px) scale(1.15)' : 'none',
                transition: 'all 0.25s ease',
              }}
              aria-label={label}
            >
              <span
                style={{
                  fontSize: isSelected ? 56 : 46,
                  filter: isSelected ? 'none' : 'grayscale(0.25)',
                  transition: 'all 0.25s ease',
                  lineHeight: 1,
                }}
              >
                {emoji}
              </span>
              <span
                className="press-marginalia"
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: isSelected ? '#2D5F5D' : '#746856',
                  fontStyle: 'italic',
                  transition: 'color 0.25s ease',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Optional comment */}
      <div style={{ padding: '24px 56px 12px' }}>
        <span className="press-chapter-label" style={{ display: 'block' }}>
          What did {childName} say?
        </span>
        <p
          className="press-marginalia"
          style={{ fontSize: 12, marginBottom: 10, marginTop: 4 }}
        >
          Optional. A word, a sentence, a question they asked — whatever
          stayed with them.
        </p>
        <textarea
          value={storyComment}
          onChange={(e) => setStoryComment(e.target.value)}
          placeholder={`Anything ${childName} said about the story…`}
          rows={3}
          className="w-full focus:outline-none"
          style={{
            fontFamily: 'var(--font-parent-display)',
            fontSize: 17,
            fontStyle: 'italic',
            color: '#3A3530',
            background: 'transparent',
            border: 0,
            borderBottom: '1px solid rgba(200, 190, 172, 0.6)',
            padding: '10px 2px 12px',
            resize: 'none',
            lineHeight: 1.55,
          }}
        />
      </div>

      <hr className="press-rule" style={{ margin: '24px 56px 20px', width: 'auto' }} />

      {/* Save action */}
      <div style={{ textAlign: 'center', padding: '16px 20px 28px' }}>
        <button
          onClick={onSave}
          disabled={submitting || storyRating === null}
          className="press-link"
          style={{
            background: 'transparent',
            cursor: submitting || storyRating === null ? 'not-allowed' : 'pointer',
            opacity: submitting || storyRating === null ? 0.4 : 1,
            fontSize: 18,
          }}
        >
          {submitting ? 'Saving…' : 'Keep this reaction'}
          {!submitting && <span className="arrow">⟶</span>}
        </button>
        <p
          className="press-marginalia"
          style={{ fontSize: 11, marginTop: 10, color: '#7A6E5C' }}
        >
          {childName}&rsquo;s reaction becomes part of their volume.
        </p>
      </div>

      <div className="press-fleuron">❦</div>
    </div>
  );
}

// ================================================================
// REFLECT VIEW — the rating step
// ================================================================
function ReflectView({
  item,
  myName,
  otherPerson,
  isMultiPerson,
  myNote,
  setMyNote,
  partnerNote,
  setPartnerNote,
  performanceMode,
  submitting,
  onRate,
  onSkipRating,
  storyRating,
  setStoryRating,
  storyEmoji,
  setStoryEmoji,
  storyComment,
  setStoryComment,
  onSaveStoryReaction,
}: {
  item: GrowthItem;
  myName: string;
  otherPerson: { name: string; userId: string | null } | null;
  isMultiPerson: boolean;
  myNote: string;
  setMyNote: (v: string) => void;
  partnerNote: string;
  setPartnerNote: (v: string) => void;
  performanceMode: PerformanceMode;
  submitting: boolean;
  onRate: (impact: ImpactRating) => void;
  onSkipRating: () => void;
  storyRating: 1 | 2 | 3 | 4 | 5 | null;
  setStoryRating: (r: 1 | 2 | 3 | 4 | 5) => void;
  storyEmoji: string;
  setStoryEmoji: (e: string) => void;
  storyComment: string;
  setStoryComment: (c: string) => void;
  onSaveStoryReaction: () => void;
}) {
  // Story mode branches to a completely different reaction UI
  if (performanceMode === 'story') {
    return (
      <StoryReactionView
        item={item}
        storyRating={storyRating}
        setStoryRating={setStoryRating}
        storyEmoji={storyEmoji}
        setStoryEmoji={setStoryEmoji}
        storyComment={storyComment}
        setStoryComment={setStoryComment}
        submitting={submitting}
        onSave={onSaveStoryReaction}
      />
    );
  }

  // For writing mode the note was already captured during the doing phase,
  // so we only show the reflection textarea for non-writing modes.
  const showReflectionField = performanceMode !== 'writing';

  return (
    <div className="press-binder" style={{ maxWidth: 952 }}>

      {/* Running header */}
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>What remained</span>
        <span className="sep">·</span>
        <span>{item.title}</span>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', paddingTop: 20, paddingBottom: 10 }}>
        <span className="press-chapter-label">Looking back</span>
      </div>
      <h2
        className="press-display-md"
        style={{ textAlign: 'center', marginTop: 10, marginBottom: 8, fontSize: 'clamp(28px, 4vw, 36px)' }}
      >
        How did it land?
      </h2>
      <p
        className="press-marginalia"
        style={{ textAlign: 'center', fontSize: 13, marginBottom: 28 }}
      >
        A single word on how much it moved for {isMultiPerson ? 'you both' : 'you'}.
      </p>

      <hr className="press-rule-short" style={{ margin: '0 auto 28px' }} />

      {/* Optional short reflection note (for non-writing modes) */}
      {showReflectionField && (
        <div style={{ padding: '0 56px 28px' }}>
          {isMultiPerson && otherPerson ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <ReflectionFieldPress
                name={myName}
                value={myNote}
                onChange={setMyNote}
              />
              <ReflectionFieldPress
                name={otherPerson.name}
                value={partnerNote}
                onChange={setPartnerNote}
              />
            </div>
          ) : (
            <ReflectionFieldPress
              name={null}
              value={myNote}
              onChange={setMyNote}
            />
          )}
          <hr className="press-rule" style={{ marginTop: 28 }} />
        </div>
      )}

      {/* Rating options */}
      <div style={{ padding: '0 56px' }}>
        <span
          className="press-chapter-label"
          style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}
        >
          Rate what happened
        </span>
        {IMPACT_LABELS.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => onRate(value)}
            disabled={submitting}
            className="block w-full text-left py-5"
            style={{
              background: 'transparent',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.4 : 1,
              borderBottom: '1px solid rgba(200,190,172,0.5)',
              transition: 'padding 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.paddingLeft = '10px')}
            onMouseLeave={(e) => (e.currentTarget.style.paddingLeft = '0')}
          >
            <span
              className="press-chapter-label"
              style={{ marginBottom: 6 }}
            >
              {toRoman(value)}.
            </span>
            <div
              className="press-display-sm"
              style={{ fontStyle: 'italic', fontSize: 20 }}
            >
              {label}
            </div>
            <p
              className="press-marginalia"
              style={{ marginTop: 4, fontSize: 14 }}
            >
              {description}
            </p>
          </button>
        ))}
      </div>

      {/* Skip */}
      <div style={{ textAlign: 'center', paddingTop: 28 }}>
        <button
          onClick={onSkipRating}
          disabled={submitting}
          className="press-link-sm"
          style={{
            background: 'transparent',
            cursor: submitting ? 'wait' : 'pointer',
            opacity: submitting ? 0.5 : 1,
          }}
        >
          Skip the rating
        </button>
      </div>

      <div className="press-fleuron mt-10">❦</div>
    </div>
  );
}

// ================================================================
// Reflection field — a quiet labeled textarea, no card chrome
// ================================================================
function ReflectionFieldPress({
  name,
  value,
  onChange,
}: {
  name: string | null;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      {name && (
        <div className="press-chapter-label" style={{ marginBottom: 8 }}>
          {name}&rsquo;s reflection
        </div>
      )}
      <p
        className="press-marginalia"
        style={{ marginBottom: 10, fontSize: 14 }}
      >
        {name ? `What did ${name} notice?` : 'What did you notice?'}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write anything that stayed with you&hellip;"
        rows={3}
        className="w-full focus:outline-none"
        style={{
          fontFamily: 'var(--font-parent-display)',
          fontSize: 16,
          fontStyle: 'italic',
          color: '#3A3530',
          background: 'transparent',
          border: 0,
          borderBottom: '1px solid rgba(200,190,172,0.6)',
          padding: '10px 2px',
          resize: 'none',
          lineHeight: 1.55,
        }}
      />
    </div>
  );
}

// ================================================================
// COMPLETE VIEW — the final page
// ================================================================
function CompleteView({
  item,
  isAlreadyDone,
  selectedReaction,
  onReturn,
}: {
  item: GrowthItem;
  isAlreadyDone: boolean;
  selectedReaction?: FeedbackReaction | null;
  onReturn: () => void;
}) {
  void item;
  return (
    <div className="press-binder" style={{ maxWidth: 952 }}>
      <div className="press-running-header" style={{ paddingTop: 28 }}>
        <span>The Workbook</span>
        <span className="sep">·</span>
        <span>Kept</span>
      </div>

      <div style={{ padding: '60px 20px 30px', textAlign: 'center' }}>
        <span className="press-chapter-label" style={{ display: 'block', textAlign: 'center' }}>
          {selectedReaction === 'not_now' ? 'Set aside' : isAlreadyDone ? 'Already kept' : 'Kept'}
        </span>
        <h2
          className="press-display-lg"
          style={{ marginTop: 16, fontSize: 'clamp(36px, 5vw, 48px)' }}
        >
          {selectedReaction === 'not_now'
            ? 'Gently tucked away'
            : isAlreadyDone
              ? 'This practice is behind you'
              : 'Well done'}
        </h2>
        <p
          className="press-body-italic"
          style={{
            textAlign: 'center',
            marginTop: 20,
            maxWidth: 420,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {selectedReaction === 'not_now'
            ? 'The workbook will bring it back in a few days.'
            : 'Small keepings accumulate. Come back tomorrow for the next page.'}
        </p>

        <div className="press-asterism" aria-hidden="true" style={{ margin: '32px 0 24px' }} />

        <button
          onClick={onReturn}
          className="press-link"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          Return to the workbook
          <span className="arrow">⟶</span>
        </button>

        <div className="press-fleuron mt-12">❦</div>
      </div>
    </div>
  );
}
