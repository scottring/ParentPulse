import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';
import { UserMarginNote } from '@/components/journal-spread/UserMarginNote';
import type { MarginNote } from '@/types/marginNote';

const base: MarginNote = {
  id: 'n1',
  familyId: 'f1',
  journalEntryId: 'e1',
  authorUserId: 'u-note',
  content: 'reread this',
  createdAt: Timestamp.now(),
  visibleToUserIds: ['u-note', 'u-entry'],
  sharedWithUserIds: ['u-entry'],
};

describe('UserMarginNote', () => {
  it('renders content', () => {
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
      />
    );
    expect(screen.getByText('reread this')).toBeInTheDocument();
  });

  it('shows attribution when note author differs from entry author', () => {
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
      />
    );
    expect(screen.getByText(/— M\./)).toBeInTheDocument();
  });

  it('hides attribution when note is self-authored on your own entry', () => {
    render(
      <UserMarginNote
        note={{ ...base, authorUserId: 'u-entry' }}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
      />
    );
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it('is not tap-to-edit for viewers who are not the author', async () => {
    const onStartEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-entry"
        side="left"
        authorName="Miriam"
        onStartEdit={onStartEdit}
      />
    );
    await user.click(screen.getByText('reread this'));
    expect(onStartEdit).not.toHaveBeenCalled();
  });

  it('is tap-to-edit for the author', async () => {
    const onStartEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <UserMarginNote
        note={base}
        entryAuthorUserId="u-entry"
        currentUserId="u-note"
        side="left"
        authorName="Miriam"
        onStartEdit={onStartEdit}
      />
    );
    await user.click(screen.getByText('reread this'));
    expect(onStartEdit).toHaveBeenCalled();
  });
});
