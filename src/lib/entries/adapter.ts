import type { Entry, EntrySubject } from '@/types/entry';
import type { JournalEntry } from '@/types/journal';
import type { Contribution, SynthesizedContent, SynthesizedInsight } from '@/types/person-manual';
import type { GrowthItem, GrowthItemType } from '@/types/growth';

/**
 * Convert a legacy JournalEntry into the unified Entry shape.
 *
 * If the journal entry carries a non-self subject, emit type 'observation';
 * otherwise 'written'. Type-inference during the migration stays purely
 * structural — no content analysis here.
 */
export function journalEntryToEntry(j: JournalEntry): Entry {
  const subjects: EntrySubject[] = [];
  if (j.subjectPersonId && j.subjectType && j.subjectType !== 'self') {
    subjects.push({ kind: 'person', personId: j.subjectPersonId });
  }

  return {
    id: j.entryId,
    familyId: j.familyId,
    type: subjects.length > 0 ? 'observation' : 'written',
    author: { kind: 'person', personId: j.authorId },
    subjects,
    content: j.text,
    tags: j.tags ?? [],
    visibleToUserIds: j.visibleToUserIds ?? [],
    sharedWithUserIds: j.sharedWithUserIds ?? [],
    createdAt: j.createdAt,
  };
}

/**
 * Convert a Contribution's answers into prompt + reflection entry pairs.
 *
 * Each non-empty answer emits:
 *   - a 'prompt' entry (authored by system) carrying the question key
 *   - a 'reflection' entry (authored by the contributor) with the answer text,
 *     anchored to the prompt.
 *
 * Question-prose lookup is deferred to a later plan; for now the prompt
 * content is a placeholder derived from the question key.
 */
export function contributionToEntries(c: Contribution): Entry[] {
  const out: Entry[] = [];
  for (const [questionKey, answerValue] of Object.entries(c.answers ?? {})) {
    const answer = typeof answerValue === 'string' ? answerValue : String(answerValue ?? '');
    if (!answer.trim()) continue;

    const [sectionId] = questionKey.split('.');
    const promptId = `${c.contributionId}:${questionKey}:prompt`;
    const reflectionId = `${c.contributionId}:${questionKey}:reflection`;

    const subjects: EntrySubject[] = [{ kind: 'person', personId: c.personId }];
    const tags = questionKey.includes('.') ? [sectionId] : [];

    out.push({
      id: promptId,
      familyId: c.familyId,
      type: 'prompt',
      author: { kind: 'system' },
      subjects,
      content: `(question: ${questionKey})`,
      tags,
      visibleToUserIds: [c.contributorId],
      sharedWithUserIds: [],
      createdAt: c.createdAt,
    });

    out.push({
      id: reflectionId,
      familyId: c.familyId,
      type: 'reflection',
      author: { kind: 'person', personId: c.contributorId },
      subjects,
      content: answer,
      anchorEntryId: promptId,
      tags,
      visibleToUserIds: [c.contributorId],
      sharedWithUserIds: [],
      createdAt: c.createdAt,
    });
  }
  return out;
}

/**
 * Helper to format insights into text.
 *
 * Each insight is formatted as "topic: synthesis" if both are present.
 * If only one is present, use that. Empty lines are filtered out.
 * Results are joined with newlines.
 */
function insightsToText(insights: SynthesizedInsight[] | undefined): string {
  if (!insights || insights.length === 0) return '';
  return insights
    .map((i) => {
      const topic = i.topic || '';
      const synthesis = i.synthesis || '';
      if (topic && synthesis) {
        return `${topic}: ${synthesis}`;
      }
      return topic || synthesis || '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Convert SynthesizedContent (multi-perspective synthesis results) into Entry records.
 *
 * Emits one Entry per non-empty content bucket (overview, alignments, gaps, blindSpots).
 * Each entry is type 'synthesis', authored by system, attributed to the person (or family if null).
 */
export function synthesizedContentToEntries(args: {
  familyId: string;
  manualId: string;
  personId: string | null; // null = family-level synthesis
  synth: SynthesizedContent;
}): Entry[] {
  const { familyId, manualId, personId, synth } = args;
  const subjects: EntrySubject[] =
    personId === null
      ? [{ kind: 'family' }]
      : [{ kind: 'person', personId }];
  const createdAt = synth.lastSynthesizedAt;

  const buckets: Array<{ key: string; content: string }> = [
    { key: 'overview', content: synth.overview ?? '' },
    { key: 'alignments', content: insightsToText(synth.alignments) },
    { key: 'gaps', content: insightsToText(synth.gaps) },
    { key: 'blindSpots', content: insightsToText(synth.blindSpots) },
  ];

  return buckets
    .filter((b) => b.content.trim().length > 0)
    .map((b) => ({
      id: `${manualId}:synthesis:${b.key}`,
      familyId,
      type: 'synthesis' as const,
      author: { kind: 'system' as const },
      subjects,
      content: b.content,
      tags: [b.key],
      visibleToUserIds: [],
      sharedWithUserIds: [],
      createdAt,
    }));
}

/**
 * Convert a GrowthItem into an Entry.
 *
 * Type mapping:
 *   - status === 'completed' → 'activity' (regardless of original type)
 *   - type ∈ {'reflection_prompt', 'assessment_prompt', 'journaling'} → 'prompt'
 *   - otherwise → 'nudge'
 *
 * Subject: if targetPersonIds is non-empty, use the first one; otherwise [].
 * Content: concatenate title and body with newline separation, filtering empty parts.
 * Tags: [g.type] (preserves the original growth-item type).
 * ArchivedAt: set to createdAt if status ∈ {'expired','skipped'}, otherwise undefined.
 */
const PROMPT_TYPES: GrowthItemType[] = [
  'reflection_prompt',
  'assessment_prompt',
  'journaling',
];

export function growthItemToEntry(g: GrowthItem): Entry {
  let entryType: Entry['type'];
  if (g.status === 'completed') {
    entryType = 'activity';
  } else if (PROMPT_TYPES.includes(g.type)) {
    entryType = 'prompt';
  } else {
    entryType = 'nudge';
  }

  // Subject: use the first targetPersonId if available.
  const subjects: EntrySubject[] =
    g.targetPersonIds && g.targetPersonIds.length > 0
      ? [{ kind: 'person', personId: g.targetPersonIds[0] }]
      : [];

  // Content: concatenate title + body, only including non-empty parts.
  const title = g.title ?? '';
  const body = g.body ?? '';
  const content = [title, body].filter(Boolean).join('\n\n');

  return {
    id: g.growthItemId,
    familyId: g.familyId,
    type: entryType,
    author: { kind: 'system' },
    subjects,
    content,
    tags: [g.type],
    visibleToUserIds: [],
    sharedWithUserIds: [],
    createdAt: g.createdAt,
    archivedAt:
      g.status === 'expired' || g.status === 'skipped' ? g.createdAt : undefined,
  };
}
