'use client';

import Link from 'next/link';
import type { UserRole } from '@/hooks/useDashboard';
import { scoreToRelationshipPhrase, computeDataConfidence } from '@/lib/climate-engine';
import { scoreToColor } from '@/lib/scoring-engine';
import { computeAge } from '@/utils/age';
import type { GrowthItemType, GrowthFeedback } from '@/types/growth';

const TYPE_LABELS: Partial<Record<GrowthItemType, string>> = {
  micro_activity: 'Activity',
  conversation_guide: 'Conversation',
  reflection_prompt: 'Reflection',
  assessment_prompt: 'Check-in',
  journaling: 'Journal',
  mindfulness: 'Mindfulness',
  partner_exercise: 'Together',
  solo_deep_dive: 'Deep Dive',
  repair_ritual: 'Repair',
  gratitude_practice: 'Gratitude',
};

interface RelationshipCardProps {
  role: UserRole;
  variant: 'spouse' | 'child';
  demoQ?: string;
  onReact?: (itemId: string, reaction: string, forUserId?: string) => void;
  currentUserId?: string;
  currentUserName?: string;
}

export function RelationshipCard({
  role, variant, demoQ = '', onReact, currentUserId, currentUserName,
}: RelationshipCardProps) {
  const person = role.otherPerson;
  const age = person.age || (person.dateOfBirth ? computeAge(person.dateOfBirth) : null);

  const avgScore = role.assessments.length > 0
    ? role.assessments.reduce((sum, a) => sum + a.currentScore, 0) / role.assessments.length
    : 0;
  const healthPhrase = scoreToRelationshipPhrase(avgScore, role.domain);
  const healthColor = avgScore > 0 ? scoreToColor(avgScore) : '#ccc';
  const confidence = computeDataConfidence(role, demoQ);
  const todayItem = role.todayItems[0] || null;

  const narrativeSnippet = variant === 'spouse' && role.narrative
    ? role.narrative.length > 140 ? role.narrative.slice(0, 137) + '...' : role.narrative
    : null;

  const isCouple = todayItem?.relationalLevel === 'couple';
  const spouseUserId = person.linkedUserId || null;
  const feedbackByUser = todayItem?.feedbackByUser || {};
  const currentUserDone = currentUserId ? !!feedbackByUser[currentUserId] : false;
  const spouseDone = spouseUserId ? !!feedbackByUser[spouseUserId] : false;

  return (
    <div className="glass-card weather-card overflow-hidden">
      <div className="p-5 sm:p-6">

        {/* Top row: name + score */}
        <div className="flex items-start justify-between">
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-parent-display)',
                fontSize: '20px',
                fontWeight: 500,
                color: 'var(--parent-text)',
                letterSpacing: '-0.01em',
              }}
            >
              {person.name}
            </h2>
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--parent-text-light)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {variant === 'spouse' ? 'Spouse' : age !== null ? `Age ${age}` : 'Child'}
            </span>
          </div>

          {/* Qualitative health badge */}
          {avgScore > 0 && (
            <div
              className="px-3 py-1 rounded-full"
              style={{
                background: `${healthColor}15`,
                border: `1px solid ${healthColor}25`,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-parent-body)',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: healthColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {healthPhrase}
              </span>
            </div>
          )}
        </div>

        {/* Health phrase */}
        <div className="flex items-center gap-2 mt-2.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: healthColor, boxShadow: `0 0 8px ${healthColor}50` }}
          />
          <span
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '13px',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--parent-text)',
            }}
          >
            {healthPhrase}
          </span>
        </div>

        {/* Narrative */}
        {narrativeSnippet && (
          <p
            className="mt-3"
            style={{
              fontFamily: 'var(--font-parent-body)',
              fontSize: '12.5px',
              lineHeight: 1.65,
              color: 'var(--parent-text-light)',
            }}
          >
            {narrativeSnippet}
          </p>
        )}

        {/* Confidence bar — styled as a thin atmospheric gauge */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-[3px] rounded-full overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.05)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${confidence.percentage}%`,
                  background: `linear-gradient(90deg, ${healthColor}90, ${healthColor})`,
                  transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--parent-text-light)',
                letterSpacing: '0.02em',
              }}
            >
              {confidence.assessed}/{confidence.total}
            </span>
          </div>

          {confidence.needsTopUp && (
            <Link
              href={confidence.topUpHref}
              className="inline-block mt-2 text-[11px] hover:opacity-70"
              style={{
                fontFamily: 'var(--font-parent-body)',
                fontWeight: 500,
                color: healthColor,
              }}
            >
              {confidence.topUpLabel} &rarr;
            </Link>
          )}
        </div>

        {/* Today's growth item */}
        {todayItem && (
          <div
            className="mt-4 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <Link
              href={`/growth/${todayItem.growthItemId}`}
              className="block px-4 py-3.5 hover:bg-white/20 group"
            >
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5 group-hover:scale-110 transition-transform">{todayItem.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: healthColor,
                      }}
                    >
                      {TYPE_LABELS[todayItem.type] || todayItem.type}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '10px',
                        color: 'var(--parent-text-light)',
                      }}
                    >
                      {todayItem.estimatedMinutes}m
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--parent-text)',
                      lineHeight: 1.4,
                    }}
                  >
                    {todayItem.title}
                  </p>
                  {todayItem.body && (
                    <p
                      className="mt-1"
                      style={{
                        fontFamily: 'var(--font-parent-body)',
                        fontSize: '12px',
                        color: 'var(--parent-text-light)',
                        lineHeight: 1.5,
                      }}
                    >
                      {todayItem.body.length > 80 ? todayItem.body.slice(0, 77) + '...' : todayItem.body}
                    </p>
                  )}
                </div>
              </div>
            </Link>

            {/* Quick reactions */}
            {todayItem.status !== 'completed' && onReact && (
              <div className="px-4 pb-3">
                {isCouple && currentUserId ? (
                  <div className="space-y-1.5 ml-8">
                    <PersonRow
                      name={currentUserName || 'You'}
                      done={currentUserDone}
                      fb={currentUserId ? feedbackByUser[currentUserId] : undefined}
                      onReact={(r) => onReact(todayItem.growthItemId, r, currentUserId)}
                      color={healthColor}
                    />
                    {spouseUserId && (
                      <PersonRow
                        name={person.name}
                        done={spouseDone}
                        fb={feedbackByUser[spouseUserId]}
                        onReact={(r) => onReact(todayItem.growthItemId, r, spouseUserId)}
                        color={healthColor}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2 ml-8">
                    <ReactionBtn label="Did it" onClick={() => onReact(todayItem.growthItemId, 'tried_it')} />
                    <ReactionBtn label="Later" onClick={() => onReact(todayItem.growthItemId, 'not_now')} muted />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PersonRow({ name, done, fb, onReact, color }: {
  name: string; done: boolean; fb?: GrowthFeedback;
  onReact: (r: string) => void; color: string;
}) {
  const label = fb?.reaction === 'tried_it' ? 'Done' : fb?.reaction === 'loved_it' ? 'Loved' : fb?.reaction === 'not_now' ? 'Later' : null;
  return (
    <div className="flex items-center gap-2.5">
      <span
        style={{
          fontFamily: 'var(--font-parent-body)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--parent-text)',
          width: '56px',
        }}
      >
        {name.split(' ')[0]}
      </span>
      {done ? (
        <span
          className="text-[10px] font-medium px-2.5 py-1 rounded-full"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: fb?.reaction === 'not_now' ? 'rgba(0,0,0,0.04)' : `${color}18`,
            color: fb?.reaction === 'not_now' ? 'var(--parent-text-light)' : color,
          }}
        >
          {label}
        </span>
      ) : (
        <div className="flex gap-1.5">
          <ReactionBtn label="Did it" onClick={() => onReact('tried_it')} />
          <ReactionBtn label="Later" onClick={() => onReact('not_now')} muted />
        </div>
      )}
    </div>
  );
}

function ReactionBtn({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[11px] hover:scale-105 active:scale-95"
      style={{
        fontFamily: 'var(--font-parent-body)',
        fontWeight: 500,
        background: muted ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(0,0,0,0.05)',
        color: muted ? 'var(--parent-text-light)' : 'var(--parent-text)',
        transition: 'transform 0.15s, background 0.15s',
      }}
    >
      {label}
    </button>
  );
}
