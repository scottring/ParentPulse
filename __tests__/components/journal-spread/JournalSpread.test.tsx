import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { JournalSpread } from '@/components/journal-spread/JournalSpread';
import type { Entry } from '@/types/entry';

// Mock MicButton (transitively imported via MarginNoteComposer) so tests
// don't need real Firebase env vars.
vi.mock('@/components/voice/MicButton', () => ({
  MicButton: () => null,
}));

// Mock hooks that transitively import @/lib/firebase so the test
// environment doesn't need real Firebase env vars.
vi.mock('@/hooks/useMarginNotes', () => ({
  useMarginNotesForJournalEntries: () => ({
    notesByEntry: new Map(),
    loading: false,
    error: null,
  }),
  useMarginNoteMutations: () => ({
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    saving: false,
    error: null,
  }),
}));

vi.mock('@/hooks/usePeopleMap', () => ({
  usePeopleMap: () => ({ byId: {}, nameOf: (id: string) => id, loading: false }),
}));

const make = (i: number): Entry => ({
  id: `e${i}`,
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: `entry-${i}`,
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.fromMillis(1_700_000_000_000 - i * 1000),
});

describe('JournalSpread', () => {
  const baseProps = {
    familyName: 'Kaufman',
    volumeLabel: 'Volume IV · Spring',
    dateRangeLabel: 'April 14',
    members: [{ id: 'u1', name: 'Scott' }],
    people: [{ id: 'p1', name: 'Liam' }],
    onCapture: vi.fn(),
  };

  it('renders an entry block for each visible entry', () => {
    const entries = Array.from({ length: 4 }, (_, i) => make(i));
    render(<JournalSpread {...baseProps} entries={entries} />);
    expect(screen.getByText('entry-0')).toBeInTheDocument();
    expect(screen.getByText('entry-3')).toBeInTheDocument();
  });

  it('shows + Add an entry button', () => {
    render(<JournalSpread {...baseProps} entries={[]} />);
    expect(screen.getByRole('button', { name: /add an entry/i })).toBeInTheDocument();
  });

  it('invokes onCapture when + Add is clicked', () => {
    const onCapture = vi.fn();
    render(<JournalSpread {...baseProps} entries={[]} onCapture={onCapture} />);
    fireEvent.click(screen.getByRole('button', { name: /add an entry/i }));
    expect(onCapture).toHaveBeenCalled();
  });

  it('renders empty-state copy when there are no entries', () => {
    render(<JournalSpread {...baseProps} entries={[]} />);
    expect(screen.getByText(/quiet day/i)).toBeInTheDocument();
  });
});
