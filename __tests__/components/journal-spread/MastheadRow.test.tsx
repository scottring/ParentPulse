import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MastheadRow } from '@/components/journal-spread/MastheadRow';

describe('MastheadRow', () => {
  it('renders family name as heading', () => {
    render(
      <MastheadRow
        familyName="Kaufman"
        volumeLabel="Volume IV · Spring"
        dateRangeLabel="April 14"
        members={[
          { id: 'u1', name: 'Scott' },
          { id: 'u2', name: 'Rachel' },
          { id: 'u3', name: 'Liam' },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: /the kaufman family/i })).toBeInTheDocument();
  });

  it('renders volume label and date', () => {
    render(
      <MastheadRow
        familyName="Kaufman"
        volumeLabel="Volume IV · Spring"
        dateRangeLabel="April 14"
        members={[]}
      />
    );
    expect(screen.getByText(/Volume IV/i)).toBeInTheDocument();
    expect(screen.getByText(/April 14/)).toBeInTheDocument();
  });
});
