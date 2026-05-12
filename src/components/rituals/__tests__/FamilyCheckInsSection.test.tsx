import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}));

describe('FamilyCheckInsSection', () => {
  const checkIn: any = {
    id: 'r1',
    targetType: 'family-checkin',
    targetPersonId: 'liam',
    cadence: 'weekly',
    dayOfWeek: 0,
    startTimeLocal: '17:00',
    durationMinutes: 15,
    status: 'active',
  };

  it('renders a row per check-in with begin link', async () => {
    const { FamilyCheckInsSection } = await import('@/components/rituals/FamilyCheckInsSection');
    render(<FamilyCheckInsSection checkIns={[checkIn]} kidNames={{ liam: 'Liam' }} />);
    expect(screen.getByText(/with Liam/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /begin/i })).toHaveAttribute('href', '/check-in/liam?ritualId=r1');
  });

  it('renders an empty add-new card when no check-ins', async () => {
    const { FamilyCheckInsSection } = await import('@/components/rituals/FamilyCheckInsSection');
    render(<FamilyCheckInsSection checkIns={[]} kidNames={{}} />);
    expect(screen.getByRole('link', { name: /set up a family check-in/i })).toHaveAttribute('href', '/rituals/family/setup');
  });
});
