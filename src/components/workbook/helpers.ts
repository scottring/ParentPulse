import type { GrowthItem } from '@/types/growth';

// Reading-vs-practice split. Illustrated stories and progress
// snapshots are "reads" — everything else is a "do."
const READING_TYPES = new Set(['illustrated_story', 'progress_snapshot']);

export function isReading(item: GrowthItem): boolean {
  return READING_TYPES.has(item.type);
}

export const TYPE_LABELS: Record<string, string> = {
  reflection_prompt: 'A reflection',
  micro_activity: 'A small thing',
  conversation_guide: 'A conversation',
  partner_exercise: 'A partner exercise',
  solo_deep_dive: 'A longer sit',
  repair_ritual: 'A repair',
  gratitude_practice: 'A gratitude',
  illustrated_story: 'A story to read',
  weekly_arc: 'A weekly arc',
  progress_snapshot: 'A progress note',
};

export const PHASE_LABELS: Record<string, string> = {
  awareness: 'Awareness',
  practice: 'Practice',
  integration: 'Integration',
};

// Pick the single practice to surface in the featured hero slot.
// Prefer gap-sourced items (they came from an assessment gap), then
// items that expire soonest, then shortest. Readings fall through only
// if there are literally no practices waiting.
export function pickTodayFocus(items: GrowthItem[]): GrowthItem | null {
  if (items.length === 0) return null;
  const practices = items.filter((i) => !isReading(i));
  const pool = practices.length > 0 ? practices : items;
  const ranked = [...pool].sort((a, b) => {
    const aGap = a.sourceInsightType === 'gap' ? 1 : 0;
    const bGap = b.sourceInsightType === 'gap' ? 1 : 0;
    if (aGap !== bGap) return bGap - aGap;
    const aExp =
      a.expiresAt?.toDate?.()?.getTime() || Number.MAX_SAFE_INTEGER;
    const bExp =
      b.expiresAt?.toDate?.()?.getTime() || Number.MAX_SAFE_INTEGER;
    if (aExp !== bExp) return aExp - bExp;
    return (a.estimatedMinutes || 999) - (b.estimatedMinutes || 999);
  });
  return ranked[0];
}

// Start-of-week, Monday 00:00 local time. Used to filter "kept this
// week" entries so they match the current issue.
export function weekStart(d: Date = new Date()): Date {
  const day = d.getDay(); // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Spell out small integers for the arc "Day three of ten" line.
export function spellNumber(n: number): string {
  const names = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
    'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  ];
  return n >= 0 && n <= 20 ? names[n] : String(n);
}
