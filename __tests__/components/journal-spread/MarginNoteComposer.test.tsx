import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarginNoteComposer } from '@/components/journal-spread/MarginNoteComposer';

describe('MarginNoteComposer', () => {
  it('commits trimmed content on Enter', async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={onCommit}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    await user.type(input, '  hello  ');
    await user.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('hello');
  });

  it('cancels on Escape without committing', async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="right"
        initialValue=""
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'nevermind');
    await user.keyboard('{Escape}');
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('blocks input past 80 chars', async () => {
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, 'a'.repeat(85));
    expect(input.value.length).toBe(80);
  });

  it('does not commit on Enter when empty', async () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
    const input = screen.getByRole('textbox');
    input.focus();
    await user.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows counter at 60+, amber at 75+', async () => {
    const user = userEvent.setup();
    render(
      <MarginNoteComposer
        side="left"
        initialValue=""
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const input = screen.getByRole('textbox');
    await user.type(input, 'a'.repeat(60));
    expect(screen.getByText(/60.*80/)).toBeInTheDocument();
    await user.type(input, 'a'.repeat(15));
    const counter = screen.getByText(/75.*80/);
    expect(counter).toBeInTheDocument();
    expect(counter.className).toMatch(/amber/);
  });
});
