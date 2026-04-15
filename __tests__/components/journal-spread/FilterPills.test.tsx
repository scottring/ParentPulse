import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPills } from '@/components/journal-spread/FilterPills';

describe('FilterPills', () => {
  const people = [
    { id: 'p1', name: 'Sarah' },
    { id: 'p2', name: 'Liam' },
  ];

  it('renders a pill per person plus Everyone and Syntheses', () => {
    render(
      <FilterPills
        people={people}
        active={{ kind: 'everyone' }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Everyone')).toBeInTheDocument();
    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('Liam')).toBeInTheDocument();
    expect(screen.getByText('Syntheses')).toBeInTheDocument();
  });

  it('marks the active pill', () => {
    render(
      <FilterPills
        people={people}
        active={{ kind: 'person', personId: 'p1' }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Sarah').closest('button')?.className).toContain('active');
  });

  it('calls onChange when a pill is clicked', () => {
    const onChange = vi.fn();
    render(
      <FilterPills
        people={people}
        active={{ kind: 'everyone' }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('Liam'));
    expect(onChange).toHaveBeenCalledWith({ kind: 'person', personId: 'p2' });
    fireEvent.click(screen.getByText('Syntheses'));
    expect(onChange).toHaveBeenCalledWith({ kind: 'syntheses' });
  });
});
