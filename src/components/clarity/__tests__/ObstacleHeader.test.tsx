import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ObstacleHeader } from '../ObstacleHeader';

describe('ObstacleHeader', () => {
  it('renders title when set', () => {
    render(<ObstacleHeader title="the wrestling thing" status="clarifying" />);
    expect(screen.getByRole('heading')).toHaveTextContent('the wrestling thing');
  });

  it('renders placeholder when title is empty', () => {
    render(<ObstacleHeader title="" status="fresh" />);
    expect(screen.getByRole('heading')).toHaveTextContent(/A new obstacle/i);
  });

  it('renders status pill', () => {
    render(<ObstacleHeader title="x" status="clarifying" />);
    expect(screen.getByText(/clarifying/i)).toBeInTheDocument();
  });
});
