import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';

vi.mock('@/components/voice/MicButton', () => ({
  MicButton: () => null,
}));

import { MarginColumn, MarginItem } from '@/components/journal-spread/MarginColumn';
import type { Entry } from '@/types/entry';
import type { MarginNote } from '@/types/marginNote';

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

describe('MarginItem', () => {
  const mkNote = (over: Partial<MarginNote>): MarginNote => ({
    id: 'n1',
    familyId: 'f1',
    journalEntryId: 'x',
    authorUserId: 'u1',
    content: 'scribble',
    createdAt: Timestamp.now(),
    visibleToUserIds: ['u1'],
    sharedWithUserIds: [],
    ...over,
  });

  const baseProps = {
    currentUserId: 'u1',
    resolveUserName: (_uid: string) => 'Me',
    onCreateNote: async () => 'new-id',
  };

  it('renders user notes above tags', () => {
    const e = entry({
      id: 'x',
      tags: ['curiosity'],
    });
    const { container } = render(
      <MarginItem
        entry={e}
        side="left"
        notes={[mkNote({ content: 'yes this' })]}
        {...baseProps}
      />
    );
    const text = container.textContent ?? '';
    expect(text.indexOf('yes this')).toBeLessThan(text.indexOf('curiosity'));
  });

  it('shows composer trigger for annotatable entries when viewer can see the entry', () => {
    const e = entry({ id: 'x', type: 'written', visibleToUserIds: ['u1'] });
    render(
      <MarginItem entry={e} side="left" notes={[]} {...baseProps} />
    );
    expect(
      screen.getByRole('button', { name: /add margin note/i })
    ).toBeInTheDocument();
  });

  it('hides composer trigger for non-annotatable entry types', () => {
    const e = entry({ id: 'x', type: 'synthesis', visibleToUserIds: ['u1'] });
    render(
      <MarginItem entry={e} side="left" notes={[]} {...baseProps} />
    );
    expect(
      screen.queryByRole('button', { name: /add margin note/i })
    ).toBeNull();
  });

  it('clicking composer trigger switches to the composer', async () => {
    const e = entry({ id: 'x', type: 'written', visibleToUserIds: ['u1'] });
    const user = userEvent.setup();
    render(
      <MarginItem entry={e} side="left" notes={[]} {...baseProps} />
    );
    await user.click(screen.getByRole('button', { name: /add margin note/i }));
    expect(screen.getByRole('textbox', { name: /margin note/i })).toBeInTheDocument();
  });
});
