import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/privacy/PinKeypad', () => ({
  PinKeypad: ({ title }: { title: string }) => <div data-testid="pin-keypad">{title}</div>,
}));

describe('BriefIdleLock', () => {
  it('renders nothing when not locked and no warning', async () => {
    const { BriefIdleLock } = await import('@/components/therapy/BriefIdleLock');
    const { container } = render(
      <BriefIdleLock locked={false} warningActive={false} onUnlock={async () => true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a warning chip when warningActive is true', async () => {
    const { BriefIdleLock } = await import('@/components/therapy/BriefIdleLock');
    render(<BriefIdleLock locked={false} warningActive={true} onUnlock={async () => true} />);
    expect(screen.getByText(/locking soon/i)).toBeInTheDocument();
  });

  it('renders the PIN keypad overlay when locked', async () => {
    const { BriefIdleLock } = await import('@/components/therapy/BriefIdleLock');
    render(<BriefIdleLock locked={true} warningActive={false} onUnlock={async () => true} />);
    expect(screen.getByTestId('pin-keypad')).toBeInTheDocument();
  });
});
