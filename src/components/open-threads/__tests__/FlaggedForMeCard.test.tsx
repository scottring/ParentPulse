import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlaggedForMeCard } from '../FlaggedForMeCard';
import type { MessageFlag } from '@/types/flag';

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
