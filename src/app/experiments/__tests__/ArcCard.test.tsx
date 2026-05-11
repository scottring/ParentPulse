import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GrowthArc } from '@/types/growth-arc';
import type { GrowthItem } from '@/types/growth';

// Stub the Firebase singleton + auth context so importing page.tsx
// (which transitively pulls @/lib/firebase via useGrowthFeed and
// AuthContext) doesn't blow up on missing env vars in unit tests.
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  auth: {},
  functions: {},
  storage: {},
  app: {},
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useGrowthFeed', () => ({
  useGrowthFeed: () => ({ arcGroups: [], loading: false }),
}));

// next/link in tests: render a plain <a> so the IntersectionObserver
// prefetch path inside the real Link never runs (happy-dom's IO mock
// from setup isn't a constructor and the real Link crashes on it).
vi.mock('next/link', () => ({
  default: ({
    href,
    style,
    children,
    'aria-label': ariaLabel,
  }: {
    href: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    'aria-label'?: string;
  }) => (
    <a href={href} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

describe('ArcCard', () => {
  const arc: GrowthArc = {
    arcId: 'arc-1',
    title: 'Test arc',
    domain: 'connection',
    currentPhase: 'awareness',
    completedItemCount: 0,
    totalItemCount: 4,
    phases: [],
  } as unknown as GrowthArc;

  it('renders the whole card as a link to /experiments/[growthItemId] when an active item exists', async () => {
    const { ArcCard } = await import('@/app/experiments/page');
    const activeItem = {
      growthItemId: 'item-7',
      arcId: 'arc-1',
      title: 'A small thing',
    } as unknown as GrowthItem;
    render(<ArcCard arc={arc} progress={0} activeItems={[activeItem]} />);
    const link = screen.getByRole('link', { name: /next moment in Test arc/i });
    expect(link).toHaveAttribute('href', '/experiments/item-7');
  });

  it('renders the card as a non-clickable div when no active items exist', async () => {
    const { ArcCard } = await import('@/app/experiments/page');
    render(<ArcCard arc={arc} progress={0} activeItems={[] as GrowthItem[]} />);
    // No link role — the card is visible but inert.
    expect(screen.queryByRole('link')).toBeNull();
    // The title still renders.
    expect(screen.getByText(/Test arc/i)).toBeInTheDocument();
  });
});
