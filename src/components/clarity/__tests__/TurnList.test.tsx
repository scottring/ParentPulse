import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TurnList } from '../TurnList';
import type { Move } from '@/types/obstacle';
import { Timestamp } from 'firebase/firestore';

function makeMove(overrides: Partial<Move>): Move {
  return {
    id: 'm',
    type: 'clarity-session',
    at: Timestamp.now(),
    byUserId: 'u',
    payload: { role: 'user', content: 'hi' },
    ...overrides,
  } as Move;
}

describe('TurnList', () => {
  it('renders user and assistant turns', () => {
    const moves: Move[] = [
      makeMove({ id: 'm1', payload: { role: 'user', content: 'I need to talk to her.' } }),
      makeMove({
        id: 'm2',
        payload: { role: 'assistant', content: 'That sounds heavy.\n\nHave you said it out loud?' },
      }),
    ];
    render(<TurnList moves={moves} />);
    expect(screen.getByText(/I need to talk to her/i)).toBeInTheDocument();
    expect(screen.getByText(/Have you said it out loud/i)).toBeInTheDocument();
  });

  it('does not render prescription moves as turns', () => {
    const moves: Move[] = [
      makeMove({
        id: 'p1',
        type: 'prescription',
        payload: { shape: 'atomic', body: 'Ask her...', executed: false },
      }),
    ];
    render(<TurnList moves={moves} />);
    expect(screen.queryByText(/Ask her\.\.\./)).not.toBeInTheDocument();
  });

  it('renders empty state with no moves', () => {
    render(<TurnList moves={[]} />);
    // Empty list is still valid — no assertion needed beyond not crashing.
    expect(document.body).toBeTruthy();
  });
});
