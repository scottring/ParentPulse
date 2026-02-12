'use client';

import Link from 'next/link';
import type { Entry } from '@/types/entry';
import { DOMAIN_NAMES } from '@/types/manual';
import { StoryEntry } from './StoryEntry';
import { ChecklistEntry } from './ChecklistEntry';
import { GoalEntry } from './GoalEntry';
import { ReflectionEntry } from './ReflectionEntry';
import { DiscussionEntry } from './DiscussionEntry';
import { ActivityEntry } from './ActivityEntry';
import { MilestoneEntry } from './MilestoneEntry';

interface EntryCardProps {
  entry: Entry;
  personId: string;
  onUpdate?: (entryId: string, updates: Partial<Entry>) => void;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  story: '\u{1F4D6}',
  checklist: '\u{2705}',
  goal: '\u{1F3AF}',
  reflection: '\u{1F4AD}',
  discussion: '\u{1F4AC}',
  activity: '\u{1F3A8}',
  milestone: '\u{2B50}',
  insight: '\u{1F4A1}',
  task: '\u{1F4CB}',
};

const TYPE_LABELS: Record<string, string> = {
  story: 'Story',
  checklist: 'Checklist',
  goal: 'Goal',
  reflection: 'Reflection',
  discussion: 'Discussion',
  activity: 'Activity',
  milestone: 'Milestone',
  insight: 'Insight',
  task: 'Task',
};

export function EntryCard({ entry, personId, onUpdate, compact }: EntryCardProps) {
  const icon = TYPE_ICONS[entry.type] || '';
  const label = TYPE_LABELS[entry.type] || entry.type;

  if (compact) {
    return (
      <Link
        href={`/yearbook/${personId}/${entry.entryId}`}
        className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-300 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-stone-800 truncate">{entry.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</span>
              <span className="text-stone-200">|</span>
              <span className="text-[10px] text-stone-400">{DOMAIN_NAMES[entry.domain]}</span>
            </div>
          </div>
          {entry.lifecycle === 'completed' && (
            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">Done</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-100">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-stone-900 heading">{entry.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-400 uppercase tracking-wider">{label}</span>
              <span className="text-stone-200">|</span>
              <span className="text-xs text-stone-400">{DOMAIN_NAMES[entry.domain]}</span>
              {entry.lifecycle !== 'active' && (
                <>
                  <span className="text-stone-200">|</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    entry.lifecycle === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-50 text-stone-400'
                  }`}>{entry.lifecycle}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <EntryContentRenderer entry={entry} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function EntryContentRenderer({ entry, onUpdate }: { entry: Entry; onUpdate?: EntryCardProps['onUpdate'] }) {
  const content = entry.content;
  if (!content) return <p className="text-sm text-stone-400">No content yet.</p>;

  switch (content.kind) {
    case 'story':
      return <StoryEntry content={content} />;
    case 'checklist':
      return (
        <ChecklistEntry
          content={content}
          onToggle={onUpdate ? (itemId, checked) => {
            const items = content.items.map(item =>
              item.id === itemId ? { ...item, checked } : item
            );
            onUpdate(entry.entryId, { content: { ...content, items } });
          } : undefined}
        />
      );
    case 'goal':
      return <GoalEntry content={content} />;
    case 'reflection':
      return <ReflectionEntry content={content} />;
    case 'discussion':
      return <DiscussionEntry content={content} />;
    case 'activity':
      return <ActivityEntry content={content} />;
    case 'milestone':
      return <MilestoneEntry content={content} />;
    case 'insight':
      return (
        <div>
          <p className="text-sm text-stone-600 leading-relaxed">{content.body}</p>
          {content.source && (
            <p className="text-xs text-stone-400 mt-2">Source: {content.source}</p>
          )}
        </div>
      );
    case 'task':
      return (
        <div className="flex items-start gap-3">
          <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 ${
            content.completed ? 'bg-stone-900 border-stone-900 text-white' : 'border-stone-300'
          }`}>
            {content.completed && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className={`text-sm ${content.completed ? 'text-stone-400 line-through' : 'text-stone-600'}`}>
            {content.description}
          </p>
        </div>
      );
    default:
      return <pre className="text-xs text-stone-500">{JSON.stringify(content, null, 2)}</pre>;
  }
}
