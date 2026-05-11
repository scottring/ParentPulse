import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const mockPathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

// next/link in tests: render a plain <a> so the IntersectionObserver
// prefetch path inside the real Link never runs (jsdom's IO mock from
// setup isn't a constructor and the real Link crashes on it).
vi.mock('next/link', () => ({
  default: ({
    href,
    style,
    children,
    'aria-current': ariaCurrent,
    'aria-label': ariaLabel,
    'data-rail-item': dataRailItem,
  }: {
    href: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    'aria-current'?: 'page' | undefined;
    'aria-label'?: string;
    'data-rail-item'?: string;
  }) => (
    <a
      href={href}
      style={style}
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      data-rail-item={dataRailItem}
    >
      {children}
    </a>
  ),
}));

describe('LeftRail', () => {
  beforeEach(() => {
    cleanup();
    mockPathname.mockReset();
  });

  it('renders every canonical rail item as a link when on an authed route', async () => {
    mockPathname.mockReturnValue('/manual');
    const { LeftRail } = await import('@/components/layout/LeftRail');
    render(<LeftRail />);
    ['Journal', 'People', 'Therapy', 'Rituals', 'Experiments', 'Unspoken', 'Archive'].forEach((label) => {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    });
  });

  it('marks the active route link with aria-current=page', async () => {
    mockPathname.mockReturnValue('/manual');
    const { LeftRail } = await import('@/components/layout/LeftRail');
    render(<LeftRail />);
    const peopleLink = screen.getByRole('link', { name: /People/i });
    expect(peopleLink).toHaveAttribute('aria-current', 'page');
    const journalLink = screen.getByRole('link', { name: /Journal/i });
    expect(journalLink).not.toHaveAttribute('aria-current');
  });

  it('treats nested routes as active for their parent (e.g. /experiments/foo → Experiments)', async () => {
    mockPathname.mockReturnValue('/experiments/arc-1');
    const { LeftRail } = await import('@/components/layout/LeftRail');
    render(<LeftRail />);
    const exp = screen.getByRole('link', { name: /Experiments/i });
    expect(exp).toHaveAttribute('aria-current', 'page');
  });

  it('returns null on /login', async () => {
    mockPathname.mockReturnValue('/login');
    const { LeftRail } = await import('@/components/layout/LeftRail');
    const { container } = render(<LeftRail />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on /check-in/[personId]', async () => {
    mockPathname.mockReturnValue('/check-in/abc');
    const { LeftRail } = await import('@/components/layout/LeftRail');
    const { container } = render(<LeftRail />);
    expect(container.firstChild).toBeNull();
  });
});
