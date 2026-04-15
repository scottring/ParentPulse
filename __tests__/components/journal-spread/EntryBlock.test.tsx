import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { EntryBlock } from '@/components/journal-spread/EntryBlock';
import type { Entry } from '@/types/entry';

const baseEntry: Entry = {
  id: 'e1',
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: 'Dinner was loud tonight.',
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.now(),
};

describe('EntryBlock', () => {
  it('renders the entry content', () => {
    render(<EntryBlock entry={baseEntry} />);
    expect(screen.getByText('Dinner was loud tonight.')).toBeInTheDocument();
  });

  it('shows a kicker label appropriate for the type', () => {
    render(<EntryBlock entry={{ ...baseEntry, type: 'synthesis' }} />);
    expect(screen.getByText(/synthesis/i)).toBeInTheDocument();
  });

  it('applies a distinct className per entry type', () => {
    const { container, rerender } = render(<EntryBlock entry={baseEntry} />);
    const writtenClasses = container.firstElementChild?.className ?? '';
    rerender(<EntryBlock entry={{ ...baseEntry, type: 'synthesis' }} />);
    const synthesisClasses = container.firstElementChild?.className ?? '';
    expect(writtenClasses).not.toEqual(synthesisClasses);
  });
});
