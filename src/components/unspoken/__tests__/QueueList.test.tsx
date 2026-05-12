import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { JournalEntry } from '@/types/journal';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}));

describe('QueueList', () => {
  const entry: JournalEntry = {
    entryId: 'e1',
    authorId: 'u1',
    text: 'The weight of silence in the dining room.',
    createdAt: { toDate: () => new Date('2024-10-24T00:00:00Z') } as any,
    unspoken: true,
  } as JournalEntry;

  it('renders a row per entry with title and date', async () => {
    const { QueueList } = await import('@/components/unspoken/QueueList');
    render(<QueueList entries={[entry]} />);
    expect(screen.getByText(/weight of silence/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /weight of silence/i })).toHaveAttribute('href', '/journal/e1');
  });

  it('renders an empty state when no entries', async () => {
    const { QueueList } = await import('@/components/unspoken/QueueList');
    render(<QueueList entries={[]} />);
    expect(screen.getByText(/nothing held here yet/i)).toBeInTheDocument();
  });
});
