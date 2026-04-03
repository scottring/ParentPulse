'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useGrowthFeed } from '@/hooks/useGrowthFeed';
import { usePerson } from '@/hooks/usePerson';
import MainLayout from '@/components/layout/MainLayout';
import { EXERCISE_TYPES } from '@/config/exercise-types';
import type { GrowthItem, FeedbackReaction, ImpactRating } from '@/types/growth';

const DEPTH_COLORS = {
  light: { bg: 'rgba(124,144,130,0.08)', text: '#7C9082', border: 'rgba(124,144,130,0.2)' },
  moderate: { bg: 'rgba(212,165,116,0.08)', text: '#D4A574', border: 'rgba(212,165,116,0.2)' },
  deep: { bg: 'rgba(45,95,93,0.08)', text: '#2D5F5D', border: 'rgba(45,95,93,0.2)' },
};

const IMPACT_LABELS: { value: ImpactRating; label: string; description: string }[] = [
  { value: 1, label: 'Slight', description: 'I noticed something small' },
  { value: 2, label: 'Noticeable', description: 'Something shifted for me' },
  { value: 3, label: 'Breakthrough', description: 'This was a real moment' },
];

export default function GrowthItemWorkspace({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { submitFeedback } = useGrowthFeed();
  const { people } = usePerson();

  const [item, setItem] = useState<GrowthItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'exercise' | 'reflect' | 'complete'>('exercise');
  const [selectedReaction, setSelectedReaction] = useState<FeedbackReaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-person notes for couple exercises
  const [myNote, setMyNote] = useState('');
  const [partnerNote, setPartnerNote] = useState('');

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

  // Derive participant info from the actual target people on the item
  const selfPerson = people.find((p) => p.linkedUserId === user?.userId);
  const myName = selfPerson?.name || user?.name || 'You';

  // Find the other participant(s) — people named in targetPersonNames who aren't the current user
  const otherParticipants = item ? (item.targetPersonNames || [])
    .filter((name) => name !== myName)
    .map((name) => {
      const person = people.find((p) => p.name === name);
      return { name, userId: person?.linkedUserId || null };
    }) : [];

  // Show per-person reflections when there are 2+ named participants
  const isMultiPerson = (item?.targetPersonNames?.length || 0) >= 2;
  const otherPerson = otherParticipants[0] || null;

  const handleComplete = useCallback(async (reaction: FeedbackReaction, impact?: ImpactRating) => {
    if (!item || submitting || !user?.userId) return;
    setSubmitting(true);
    setSelectedReaction(reaction);
    try {
      // Submit current user's feedback
      await submitFeedback(item.growthItemId, reaction, impact, myNote || undefined, user.userId);

      // If multi-person exercise and the other person has a linked account + note, submit theirs too
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

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--parent-primary)' }} />
        </div>
      </MainLayout>
    );
  }

  if (!item) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}>
            Exercise not found.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-sm underline"
            style={{ color: 'var(--parent-primary)' }}
          >
            Back to dashboard
          </button>
        </div>
      </MainLayout>
    );
  }

  const typeDef = EXERCISE_TYPES[item.type];
  const depth = item.depthTier || typeDef?.depth || 'light';
  const depthStyle = DEPTH_COLORS[depth];
  const isAlreadyDone = item.status === 'completed' || item.status === 'skipped';
  const reflectionLabel = getReflectionLabel(item.type);
  const reflectionPrompt = getReflectionPrompt(item.type);

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">

        {/* Back link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm mb-6 flex items-center gap-1.5 hover:underline"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
        >
          &larr; Dashboard
        </button>

        {/* Header card */}
        <div
          className="rounded-2xl overflow-hidden mb-6"
          style={{ background: 'white', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
        >
          <div style={{ height: '4px', background: depthStyle.text }} />
          <div className="px-6 py-6">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: depthStyle.bg, color: depthStyle.text, border: `1px solid ${depthStyle.border}` }}
              >
                {typeDef?.emoji} {typeDef?.label || item.type}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--parent-text-light)' }}
              >
                ~{item.estimatedMinutes} min
              </span>
              {item.targetPersonNames.length > 0 && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--parent-text-light)' }}
                >
                  with {item.targetPersonNames.join(' & ')}
                </span>
              )}
            </div>
            <h1
              className="text-xl font-semibold leading-snug mb-1"
              style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
            >
              {item.emoji} {item.title}
            </h1>
          </div>
        </div>

        {/* ===== EXERCISE STEP ===== */}
        {step === 'exercise' && !isAlreadyDone && (
          <div className="space-y-4">
            {/* Exercise content */}
            <div
              className="rounded-2xl px-6 py-5"
              style={{ background: 'white', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
            >
              <ExerciseContent item={item} />
            </div>

            {/* Reflection area — per-person for couple, single for individual */}
            {isMultiPerson && otherPerson ? (
              <>
                {/* Person 1: Current user */}
                <ReflectionCard
                  name={myName}
                  label={reflectionLabel}
                  prompt={reflectionPrompt}
                  value={myNote}
                  onChange={setMyNote}
                  accent={DEPTH_COLORS.moderate.text}
                />
                {/* Person 2: The other participant */}
                <ReflectionCard
                  name={otherPerson.name}
                  label={reflectionLabel}
                  prompt={getPartnerReflectionPrompt(item.type, otherPerson.name)}
                  value={partnerNote}
                  onChange={setPartnerNote}
                  accent={DEPTH_COLORS.moderate.text}
                />
              </>
            ) : (
              <div
                className="rounded-2xl px-6 py-5"
                style={{ background: 'white', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
              >
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
                >
                  {reflectionLabel}
                </h3>
                <p
                  className="text-xs mb-3"
                  style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
                >
                  {reflectionPrompt}
                </p>
                <textarea
                  value={myNote}
                  onChange={(e) => setMyNote(e.target.value)}
                  placeholder="Write anything that comes to mind..."
                  rows={4}
                  className="w-full text-sm rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2"
                  style={{
                    fontFamily: 'var(--font-parent-body)',
                    background: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    border: '1px solid var(--parent-border)',
                  }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('reflect')}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white hover:opacity-90"
                style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
              >
                {isMultiPerson ? 'We did this' : 'I did this'}
              </button>
              <button
                onClick={() => handleComplete('not_now')}
                disabled={submitting}
                className="px-5 py-3 rounded-xl text-sm font-medium hover:opacity-80 disabled:opacity-40"
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  color: 'var(--parent-text-light)',
                  background: 'white',
                  border: '1px solid var(--parent-border)',
                }}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* ===== REFLECT STEP ===== */}
        {step === 'reflect' && (
          <div
            className="rounded-2xl px-6 py-6"
            style={{ background: 'white', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
          >
            <h3
              className="text-base font-semibold mb-1"
              style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
            >
              How did that land?
            </h3>
            <p
              className="text-sm mb-5"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
            >
              This helps us learn what works for {isMultiPerson ? 'you both' : 'you'}.
            </p>

            <div className="space-y-2">
              {IMPACT_LABELS.map(({ value, label, description }) => (
                <button
                  key={value}
                  onClick={() => handleComplete('tried_it', value)}
                  disabled={submitting}
                  className="w-full text-left px-4 py-3 rounded-xl hover:scale-[1.01] disabled:opacity-40"
                  style={{
                    background: 'var(--parent-bg)',
                    border: '1px solid var(--parent-border)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                >
                  <span
                    className="text-sm font-medium block"
                    style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-xs"
                    style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
                  >
                    {description}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleComplete('loved_it', 3)}
              disabled={submitting}
              className="w-full mt-4 py-3 rounded-xl text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-accent)' }}
            >
              This was a real moment
            </button>
          </div>
        )}

        {/* ===== COMPLETE STEP ===== */}
        {(step === 'complete' || isAlreadyDone) && (
          <div
            className="rounded-2xl px-6 py-8 text-center"
            style={{ background: 'white', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
          >
            <div className="text-3xl mb-3">
              {selectedReaction === 'loved_it' ? '\u2764\uFE0F' :
               selectedReaction === 'not_now' ? '\uD83D\uDD52' :
               '\u2705'}
            </div>
            <h3
              className="text-base font-semibold mb-1"
              style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
            >
              {selectedReaction === 'not_now' ? 'Saved for later' :
               isAlreadyDone ? 'Already completed' :
               'Nice work'}
            </h3>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
            >
              {selectedReaction === 'not_now'
                ? "We'll bring this back in a couple days."
                : 'Every small step matters.'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90"
              style={{ fontFamily: 'var(--font-parent-body)', background: 'var(--parent-primary)' }}
            >
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ===== Per-person reflection card =====

function ReflectionCard({
  name,
  label,
  prompt,
  value,
  onChange,
  accent,
}: {
  name: string;
  label: string;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', boxShadow: 'var(--shadow-soft)', border: '1px solid var(--parent-border)' }}
    >
      {/* Person name tab */}
      <div
        className="px-6 py-2 flex items-center gap-2"
        style={{ background: `${accent}10`, borderBottom: '1px solid var(--parent-border)' }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: accent }}
        />
        <span
          className="text-xs font-semibold"
          style={{ fontFamily: 'var(--font-parent-heading)', color: accent }}
        >
          {name}&rsquo;s reflection
        </span>
      </div>

      <div className="px-6 py-4">
        <h3
          className="text-sm font-semibold mb-1"
          style={{ fontFamily: 'var(--font-parent-heading)', color: 'var(--parent-text)' }}
        >
          {label}
        </h3>
        <p
          className="text-xs mb-3"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
        >
          {prompt}
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write anything that comes to mind..."
          rows={3}
          className="w-full text-sm rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: 'var(--parent-bg)',
            color: 'var(--parent-text)',
            border: '1px solid var(--parent-border)',
          }}
        />
      </div>
    </div>
  );
}

// ===== Exercise content by type =====

function ExerciseContent({ item }: { item: GrowthItem }) {
  const type = item.type;
  const bodySteps = item.body.match(/\d+[\.\)]\s/g) ? item.body.split(/(?=\d+[\.\)]\s)/) : null;

  return (
    <div>
      {(type === 'partner_exercise' || type === 'conversation_guide' || type === 'repair_ritual') && (
        <div
          className="flex items-center gap-2 mb-3 pb-3"
          style={{ borderBottom: '1px solid var(--parent-border)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--parent-text-light)' }}>
            {type === 'partner_exercise' ? 'Do this with your partner' :
             type === 'conversation_guide' ? 'Have this conversation together' :
             'A guided reconnection exercise'}
          </span>
        </div>
      )}

      {type === 'mindfulness' && (
        <div
          className="flex items-center gap-2 mb-3 pb-3"
          style={{ borderBottom: '1px solid var(--parent-border)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--parent-text-light)' }}>
            Find a quiet moment. {item.estimatedMinutes} minutes.
          </span>
        </div>
      )}

      {bodySteps ? (
        <ol className="space-y-3">
          {bodySteps.filter(Boolean).map((s, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5"
                style={{ background: 'var(--parent-bg)', color: 'var(--parent-text-light)' }}
              >
                {i + 1}
              </span>
              <p
                className="text-sm leading-relaxed flex-1"
                style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
              >
                {s.replace(/^\d+[\.\)]\s*/, '').trim()}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p
          className="text-sm leading-relaxed"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
        >
          {item.body}
        </p>
      )}

      {item.alternatives && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--parent-border)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--parent-text-light)' }}>
            Want a different version?
          </p>
          <div className="flex gap-2">
            {item.alternatives.light && item.depthTier !== 'light' && (
              <DepthPill label="Lighter" minutes={item.alternatives.light.estimatedMinutes} depth="light" />
            )}
            {item.alternatives.deep && item.depthTier !== 'deep' && (
              <DepthPill label="Go deeper" minutes={item.alternatives.deep.estimatedMinutes} depth="deep" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DepthPill({ label, minutes, depth }: { label: string; minutes: number; depth: 'light' | 'moderate' | 'deep' }) {
  const style = DEPTH_COLORS[depth];
  return (
    <span
      className="text-xs px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {label} (~{minutes}m)
    </span>
  );
}

// ===== Reflection prompts =====

function getReflectionLabel(type: string): string {
  switch (type) {
    case 'conversation_guide':
    case 'partner_exercise': return 'How did it go?';
    case 'reflection_prompt':
    case 'journaling':
    case 'solo_deep_dive': return 'Your reflection';
    case 'repair_ritual': return 'What shifted?';
    case 'mindfulness': return 'What did you notice?';
    case 'gratitude_practice': return 'What came up?';
    default: return 'Any thoughts?';
  }
}

function getReflectionPrompt(type: string): string {
  switch (type) {
    case 'conversation_guide': return 'What surprised you? Was there a moment that felt important?';
    case 'partner_exercise': return 'What did you learn about each other? Anything unexpected?';
    case 'reflection_prompt': return 'Write whatever comes to mind. There are no wrong answers.';
    case 'journaling': return 'Let yourself think on paper. Stream of consciousness is fine.';
    case 'repair_ritual': return 'Did something soften? What felt different afterward?';
    case 'mindfulness': return 'Any sensations, thoughts, or feelings that stood out?';
    case 'gratitude_practice': return 'Why does this matter to you right now?';
    case 'solo_deep_dive': return 'What insight are you taking away? What do you want to try?';
    default: return 'Jot down anything worth remembering. This is just for you.';
  }
}

function getPartnerReflectionPrompt(type: string, name: string): string {
  switch (type) {
    case 'conversation_guide': return `What stood out to ${name}? What did they notice?`;
    case 'partner_exercise': return `What was ${name}'s experience? What did they say?`;
    case 'repair_ritual': return `How did ${name} feel afterward? Did something shift for them?`;
    default: return `What did ${name} think? Capture their perspective here.`;
  }
}
