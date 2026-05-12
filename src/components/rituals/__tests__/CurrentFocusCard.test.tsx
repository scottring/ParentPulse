import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}));

describe('CurrentFocusCard', () => {
  it('renders the focus title + experiment label when an item is active', async () => {
    const { CurrentFocusCard } = await import('@/components/rituals/CurrentFocusCard');
    render(
      <CurrentFocusCard
        focus={{
          title: 'Morning Reflection',
          body: 'Take 3 minutes to write one thing you appreciate.',
          experimentLabel: 'Gratitude experiment',
          actionHref: '/experiments/exp-1',
        }}
      />,
    );
    expect(screen.getByText(/Current Focus/i)).toBeInTheDocument();
    expect(screen.getByText(/Morning Reflection/i)).toBeInTheDocument();
    expect(screen.getByText(/Gratitude experiment/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Complete Action/i })).toHaveAttribute('href', '/experiments/exp-1');
  });

  it('renders nothing when focus is null', async () => {
    const { CurrentFocusCard } = await import('@/components/rituals/CurrentFocusCard');
    const { container } = render(<CurrentFocusCard focus={null} />);
    expect(container.firstChild).toBeNull();
  });
});
