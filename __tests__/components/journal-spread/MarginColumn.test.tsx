import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { MarginColumn } from '@/components/journal-spread/MarginColumn';
import type { Entry } from '@/types/entry';

const entry = (over: Partial<Entry>): Entry => ({
  id: 'x',
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: 'x',
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.now(),
  ...over,
});

describe('MarginColumn', () => {
  it('renders external tags, skipping internal/sentinel tags', () => {
    render(
      <MarginColumn
        side="right"
        entries={[
          entry({
            id: 't1',
            tags: ['curiosity', '_visibility:family', 'connection'],
          }),
        ]}
      />
    );
    expect(screen.getByText('#curiosity')).toBeInTheDocument();
    expect(screen.getByText('#connection')).toBeInTheDocument();
    expect(screen.queryByText(/visibility/)).not.toBeInTheDocument();
  });

  it('renders nothing for entries with no margin data (no placeholder)', () => {
    const { container } = render(
      <MarginColumn side="left" entries={[entry({ id: 'p' })]} />
    );
    expect(container.querySelector('.item')).toBeNull();
  });

  it('renders synthesized date for synthesis entries', () => {
    const s: Entry = entry({
      id: 's1',
      type: 'synthesis',
      author: { kind: 'system' },
      sourceEntryIds: ['e1'],
      createdAt: Timestamp.fromMillis(Date.UTC(2026, 3, 14)), // Apr 14 UTC
    });
    render(<MarginColumn side="left" entries={[s]} />);
    expect(screen.getByText(/synthesized/i)).toBeInTheDocument();
  });
});
