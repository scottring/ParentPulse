import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlaggedForMeCard } from '../FlaggedForMeCard';
import type { MessageFlag } from '@/types/flag';

vi.mock('@/lib/flags', () => ({
  markFlagSeen: vi.fn().mockResolvedValue(undefined),
  respondToFlag: vi.fn().mockResolvedValue(undefined),
}));
import { markFlagSeen, respondToFlag } from '@/lib/flags';

const baseFlag: MessageFlag = {
  flagId: 'f1',
  fromUserId: 'scott',
  toUserId: 'iris',
  chatKind: 'coach',
  chatId: 'c1',
  messageId: 'm1',
  senderRole: 'assistant',
  quoteText: 'he waited until bedtime to say it',
  note: 'Read this — I think this is what is going on at dinners.',
  needsRealReply: true,
  status: 'open',
  createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } as never,
};

describe('FlaggedForMeCard (collapsed)', () => {
  it('renders title with sender name and a Needs reply pill when needsRealReply=true', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    expect(screen.getByText(/Scott flagged/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs reply/i)).toBeInTheDocument();
  });

  it('does not show the pill when needsRealReply=false', () => {
    render(
      <FlaggedForMeCard
        flag={{ ...baseFlag, needsRealReply: false }}
        senderDisplayName="Scott"
      />,
    );
    expect(screen.queryByText(/Needs reply/i)).not.toBeInTheDocument();
  });

  it('renders quote excerpt as the subtitle', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    expect(screen.getByText(/he waited until bedtime/i)).toBeInTheDocument();
  });
});

describe('FlaggedForMeCard (expanded)', () => {
  it('calls markFlagSeen with the flag id on first expand', async () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    expect(markFlagSeen).toHaveBeenCalledWith('f1', { currentStatus: 'open' });
  });

  it('shows the note + quote when expanded', async () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    expect(await screen.findByText(/Read this/)).toBeInTheDocument();
  });

  it('emoji buttons are hidden when needsRealReply is true', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    expect(screen.queryByRole('button', { name: '🫶' })).not.toBeInTheDocument();
  });

  it('clicking an emoji on a non-needsReply flag calls respondToFlag', () => {
    render(
      <FlaggedForMeCard
        flag={{ ...baseFlag, needsRealReply: false }}
        senderDisplayName="Scott"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    fireEvent.click(screen.getByRole('button', { name: '🫶' }));
    expect(respondToFlag).toHaveBeenCalledWith('f1', { kind: 'emoji', value: '🫶' });
  });

  it('Send button submits the text reply', () => {
    render(<FlaggedForMeCard flag={baseFlag} senderDisplayName="Scott" />);
    fireEvent.click(screen.getByRole('button', { name: /Scott flagged/i }));
    const input = screen.getByPlaceholderText(/Write Scott back/);
    fireEvent.change(input, { target: { value: 'Got it. Lets talk tonight.' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));
    expect(respondToFlag).toHaveBeenCalledWith('f1', {
      kind: 'reply',
      value: 'Got it. Lets talk tonight.',
    });
  });
});
