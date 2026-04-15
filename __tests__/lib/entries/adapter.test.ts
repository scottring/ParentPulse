import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { journalEntryToEntry, contributionToEntries, synthesizedContentToEntries } from '@/lib/entries/adapter';
import type { JournalEntry } from '@/types/journal';
import type { Contribution, SynthesizedContent } from '@/types/person-manual';

describe('journalEntryToEntry', () => {
  const testTime = Timestamp.now();

  const baseJournal: JournalEntry = {
    entryId: 'j1',
    familyId: 'f1',
    authorId: 'u1',
    text: 'Dinner was loud tonight.',
    category: 'moment',
    tags: ['dinner'],
    visibleToUserIds: ['u1'],
    sharedWithUserIds: [],
    createdAt: testTime,
    personMentions: [],
  } as JournalEntry;

  it('maps a self-authored entry to written', () => {
    const e = journalEntryToEntry(baseJournal);
    expect(e.id).toBe('j1');
    expect(e.type).toBe('written');
    expect(e.author).toEqual({ kind: 'person', personId: 'u1' });
    expect(e.subjects.length).toBe(0);
    expect(e.content).toBe('Dinner was loud tonight.');
    expect(e.tags).toEqual(['dinner']);
  });

  it('maps an entry about another person to observation', () => {
    const j: JournalEntry = {
      ...baseJournal,
      entryId: 'j2',
      subjectPersonId: 'p-liam',
      subjectType: 'child_proxy',
    } as JournalEntry;
    const e = journalEntryToEntry(j);
    expect(e.type).toBe('observation');
    expect(e.subjects).toEqual([{ kind: 'person', personId: 'p-liam' }]);
  });

  it('preserves visibility fields verbatim', () => {
    const j: JournalEntry = {
      ...baseJournal,
      visibleToUserIds: ['u1', 'u2'],
      sharedWithUserIds: ['u2'],
    };
    const e = journalEntryToEntry(j);
    expect(e.visibleToUserIds).toEqual(['u1', 'u2']);
    expect(e.sharedWithUserIds).toEqual(['u2']);
  });

  it('preserves createdAt timestamp', () => {
    const e = journalEntryToEntry(baseJournal);
    expect(e.createdAt).toBe(testTime);
  });
});

describe('contributionToEntries', () => {
  const testTime = Timestamp.now();
  const contribution: Contribution = {
    contributionId: 'c1',
    manualId: 'm1',
    personId: 'p-liam',
    familyId: 'f1',
    contributorId: 'u1',
    contributorName: 'Scott',
    perspectiveType: 'observer',
    relationshipToSubject: 'parent',
    topicCategory: 'triggers',
    answers: {
      'childhood.firstMemory': 'Riding bikes.',
      'values.whatMatters': 'Honesty.',
    },
    status: 'complete',
    createdAt: testTime,
    updatedAt: testTime,
  };

  it('emits two entries per answer (prompt + reflection)', () => {
    const entries = contributionToEntries(contribution);
    expect(entries.length).toBe(4);
    const prompts = entries.filter((e) => e.type === 'prompt');
    const reflections = entries.filter((e) => e.type === 'reflection');
    expect(prompts.length).toBe(2);
    expect(reflections.length).toBe(2);
  });

  it('anchors each reflection to its prompt', () => {
    const entries = contributionToEntries(contribution);
    const reflections = entries.filter((e) => e.type === 'reflection');
    for (const r of reflections) {
      expect(r.anchorEntryId).toBeDefined();
      const anchor = entries.find((e) => e.id === r.anchorEntryId);
      expect(anchor?.type).toBe('prompt');
    }
  });

  it('attributes prompts to system and reflections to the contributor', () => {
    const entries = contributionToEntries(contribution);
    const prompt = entries.find((e) => e.type === 'prompt');
    const reflection = entries.find((e) => e.type === 'reflection');
    expect(prompt?.author).toEqual({ kind: 'system' });
    expect(reflection?.author).toEqual({ kind: 'person', personId: 'u1' });
  });

  it('sets subject to the person the contribution is about', () => {
    const entries = contributionToEntries(contribution);
    for (const e of entries) {
      expect(e.subjects).toEqual([{ kind: 'person', personId: 'p-liam' }]);
    }
  });

  it('preserves answer content verbatim in reflection', () => {
    const entries = contributionToEntries(contribution);
    const contents = entries
      .filter((e) => e.type === 'reflection')
      .map((e) => e.content);
    expect(contents).toContain('Riding bikes.');
    expect(contents).toContain('Honesty.');
  });

  it('skips empty or missing answers', () => {
    const c: Contribution = {
      ...contribution,
      answers: { 'a.b': '', 'c.d': '   ', 'e.f': 'Real answer.' },
    };
    const entries = contributionToEntries(c);
    expect(entries.filter((e) => e.type === 'reflection').length).toBe(1);
  });

  it('produces empty tags for dot-free question keys', () => {
    const c: Contribution = {
      ...contribution,
      answers: { 'nodot': 'some answer' },
    };
    const entries = contributionToEntries(c);
    const reflection = entries.find((e) => e.type === 'reflection');
    expect(reflection?.tags).toEqual([]);
  });
});

describe('synthesizedContentToEntries', () => {
  const testTime = Timestamp.now();

  const synth: SynthesizedContent = {
    overview: 'Liam is curious and persistent.',
    alignments: [{ id: 'a1', topic: 'persistence', synthesis: 'Both see persistence', selfPerspective: '...', observerPerspective: '...' }],
    gaps: [],
    blindSpots: [{ id: 'b1', topic: 'fatigue', synthesis: 'Underestimates fatigue', selfPerspective: '...', observerPerspective: '...' }],
    lastSynthesizedAt: testTime,
  } as SynthesizedContent;

  it('emits one entry per non-empty bucket, skipping empty ones', () => {
    const entries = synthesizedContentToEntries({
      familyId: 'f1',
      manualId: 'm1',
      personId: 'p-liam',
      synth,
    });
    expect(entries.length).toBe(3);
    expect(entries.every((e) => e.type === 'synthesis')).toBe(true);
    expect(entries.every((e) => e.author.kind === 'system')).toBe(true);
  });

  it('attributes entries to the person subject', () => {
    const entries = synthesizedContentToEntries({
      familyId: 'f1',
      manualId: 'm1',
      personId: 'p-liam',
      synth,
    });
    for (const e of entries) {
      expect(e.subjects).toEqual([{ kind: 'person', personId: 'p-liam' }]);
    }
  });

  it('supports family-level syntheses', () => {
    const entries = synthesizedContentToEntries({
      familyId: 'f1',
      manualId: 'm-family',
      personId: null,
      synth,
    });
    for (const e of entries) {
      expect(e.subjects).toEqual([{ kind: 'family' }]);
    }
  });
});
