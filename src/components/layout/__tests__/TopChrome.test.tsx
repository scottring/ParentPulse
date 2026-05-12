import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const mockPathname = vi.fn();
const mockPush = vi.fn();
const mockLogout = vi.fn();
const mockUser = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser(),
    logout: mockLogout,
  }),
}));

describe('TopChrome', () => {
  beforeEach(() => {
    cleanup();
    mockPathname.mockReset();
    mockPush.mockReset();
    mockLogout.mockReset();
    mockUser.mockReset();
  });

  it('renders the Relish wordmark routing to home on an authed route', async () => {
    mockPathname.mockReturnValue('/');
    mockUser.mockReturnValue({ userId: 'u1', name: 'Scott Kaufman' });
    const { TopChrome } = await import('@/components/layout/TopChrome');
    render(<TopChrome />);
    const wordmark = screen.getByRole('link', { name: /relish/i });
    expect(wordmark).toHaveAttribute('href', '/');
  });

  it('shows the first name on the pip', async () => {
    mockPathname.mockReturnValue('/');
    mockUser.mockReturnValue({ userId: 'u1', name: 'Scott Kaufman' });
    const { TopChrome } = await import('@/components/layout/TopChrome');
    render(<TopChrome />);
    expect(screen.getByRole('button', { name: /Scott/i })).toBeInTheDocument();
  });

  it('opens menu on pip click with Settings + Log out only', async () => {
    mockPathname.mockReturnValue('/');
    mockUser.mockReturnValue({ userId: 'u1', name: 'Scott Kaufman' });
    const { TopChrome } = await import('@/components/layout/TopChrome');
    render(<TopChrome />);
    fireEvent.click(screen.getByRole('button', { name: /Scott/i }));
    expect(screen.getByRole('menuitem', { name: /Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Log out/i })).toBeInTheDocument();
    // The dropdown should NOT include People / Archive / Therapy etc.
    expect(screen.queryByRole('menuitem', { name: /People/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /Archive/i })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: /Therapy/i })).toBeNull();
  });

  it('returns null on /login', async () => {
    mockPathname.mockReturnValue('/login');
    mockUser.mockReturnValue({ userId: 'u1', name: 'Scott Kaufman' });
    const { TopChrome } = await import('@/components/layout/TopChrome');
    const { container } = render(<TopChrome />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on /check-in/[personId] (kid mode has its own Exit-to-parent button)', async () => {
    mockPathname.mockReturnValue('/check-in/abc');
    mockUser.mockReturnValue({ userId: 'u1', name: 'Scott Kaufman' });
    const { TopChrome } = await import('@/components/layout/TopChrome');
    const { container } = render(<TopChrome />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when there is no signed-in user', async () => {
    mockPathname.mockReturnValue('/');
    mockUser.mockReturnValue(null);
    const { TopChrome } = await import('@/components/layout/TopChrome');
    const { container } = render(<TopChrome />);
    expect(container.firstChild).toBeNull();
  });
});
