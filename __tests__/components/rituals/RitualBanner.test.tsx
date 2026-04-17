import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const useCoupleRitualMock = vi.fn();
const useSpouseMock = vi.fn();
const stateMock = vi.fn();

vi.mock('@/hooks/useCoupleRitual', () => ({
  useCoupleRitual: () => useCoupleRitualMock(),
}));
vi.mock('@/hooks/useSpouse', () => ({
  useSpouse: () => useSpouseMock(),
}));
vi.mock('@/lib/rituals/isInWindow', () => ({
  ritualBannerState: (...args: unknown[]) => stateMock(...args),
}));
vi.mock('next/link', () => ({
  default: ({ href, style, children }: { href: string; style?: React.CSSProperties; children: React.ReactNode }) => (
    <a href={href} style={style}>{children}</a>
  ),
}));

import RitualBanner from '@/components/rituals/RitualBanner';

describe('RitualBanner', () => {
  it('renders nothing when state is hidden', () => {
    useCoupleRitualMock.mockReturnValue({ ritual: { id: 'r', startTimeLocal: '20:00' }, loading: false });
    useSpouseMock.mockReturnValue({ spouseName: 'Iris' });
    stateMock.mockReturnValue('hidden');
    const { container } = render(<RitualBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders pre-window message with spouse name', () => {
    useCoupleRitualMock.mockReturnValue({ ritual: { id: 'r', startTimeLocal: '20:00' }, loading: false });
    useSpouseMock.mockReturnValue({ spouseName: 'Iris' });
    stateMock.mockReturnValue('preWindow');
    render(<RitualBanner />);
    expect(screen.getByText(/Iris/)).toBeInTheDocument();
    expect(screen.getByText(/tonight/i)).toBeInTheDocument();
  });

  it('renders in-window start CTA', () => {
    useCoupleRitualMock.mockReturnValue({ ritual: { id: 'r', startTimeLocal: '20:00' }, loading: false });
    useSpouseMock.mockReturnValue({ spouseName: 'Iris' });
    stateMock.mockReturnValue('inWindow');
    render(<RitualBanner />);
    expect(screen.getByText(/start together/i)).toBeInTheDocument();
  });
});
