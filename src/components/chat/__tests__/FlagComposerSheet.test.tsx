import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlagComposerSheet } from '../FlagComposerSheet';

vi.mock('@/lib/flags', () => ({
  createFlag: vi.fn().mockResolvedValue('new-flag-id'),
}));
import { createFlag } from '@/lib/flags';

const baseProps = {
  open: true,
  quoteText: 'he waited until bedtime to say it',
  chatKind: 'coach' as const,
  chatId: 'c1',
  messageId: 'm1',
  senderRole: 'assistant' as const,
  fromUserId: 'scott',
  defaultRecipient: { userId: 'iris', displayName: 'Iris' },
  onClose: vi.fn(),
};

describe('FlagComposerSheet', () => {
  it('renders the quote and a default recipient chip', () => {
    render(<FlagComposerSheet {...baseProps} />);
    expect(screen.getByText(/he waited until bedtime/)).toBeInTheDocument();
    expect(screen.getByText('Iris')).toBeInTheDocument();
  });

  it('submits createFlag with current form state', async () => {
    render(<FlagComposerSheet {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/Note/i), {
      target: { value: 'look at this' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Flag for Iris/i }));
    await waitFor(() => expect(createFlag).toHaveBeenCalled());
    expect(createFlag).toHaveBeenCalledWith(expect.objectContaining({
      fromUserId: 'scott',
      toUserId: 'iris',
      chatKind: 'coach',
      chatId: 'c1',
      messageId: 'm1',
      senderRole: 'assistant',
      quoteText: 'he waited until bedtime to say it',
      note: 'look at this',
      needsRealReply: false,
    }));
  });

  it('passes needsRealReply=true when toggle is on', async () => {
    render(<FlagComposerSheet {...baseProps} />);
    fireEvent.click(screen.getByRole('switch', { name: /Needs a real reply/i }));
    fireEvent.click(screen.getByRole('button', { name: /Flag for Iris/i }));
    await waitFor(() => expect(createFlag).toHaveBeenCalled());
    expect(createFlag).toHaveBeenCalledWith(expect.objectContaining({
      needsRealReply: true,
    }));
  });
});
