import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { DateBand } from '@/components/journal-spread/DateBand';

describe('DateBand', () => {
  it('renders when given a Date object', () => {
    // Monday April 14 2025 00:00:00 UTC
    const date = new Date('2025-04-14T12:00:00');
    render(<DateBand date={date} />);
    // Should contain the month name and day
    expect(screen.getByText(/april/i)).toBeInTheDocument();
    expect(screen.getByText(/14/)).toBeInTheDocument();
  });

  it('renders when given a Firebase Timestamp', () => {
    // 2025-04-14 12:00:00 UTC
    const ts = Timestamp.fromDate(new Date('2025-04-14T12:00:00'));
    render(<DateBand date={ts} />);
    expect(screen.getByText(/april/i)).toBeInTheDocument();
    expect(screen.getByText(/14/)).toBeInTheDocument();
  });

  it('formats the date as "Weekday, Month Day" (e.g. "Monday, April 14")', () => {
    // Use a known Monday: April 14, 2025
    const date = new Date(2025, 3, 14, 12, 0, 0); // month is 0-indexed
    render(<DateBand date={date} />);
    const el = screen.getByText(/monday, april 14/i);
    expect(el).toBeInTheDocument();
  });

  it('includes the weekday name', () => {
    const date = new Date(2025, 3, 14, 12, 0, 0); // Monday
    render(<DateBand date={date} />);
    expect(screen.getByText(/monday/i)).toBeInTheDocument();
  });

  it('renders the date-band css class', () => {
    const date = new Date(2025, 3, 14, 12, 0, 0);
    const { container } = render(<DateBand date={date} />);
    expect(container.querySelector('.date-band')).toBeInTheDocument();
  });
});
