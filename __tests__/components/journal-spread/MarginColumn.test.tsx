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
  it('renders source count for synthesis entries with sourceEntryIds', () => {
    render(
      <MarginColumn
        side="left"
        entries={[
          entry({
            id: 's1',
            type: 'synthesis',
            author: { kind: 'system' },
            sourceEntryIds: ['e1', 'e2', 'e3'],
          }),
        ]}
      />
    );
    expect(screen.getByText(/from 3 entries/)).toBeInTheDocument();
  });

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

  it('emits an empty-height placeholder when an entry has no margin data', () => {
    const { container } = render(
      <MarginColumn side="left" entries={[entry({ id: 'p' })]} />
    );
    expect(container.querySelector('.item-empty')).toBeTruthy();
  });
});
