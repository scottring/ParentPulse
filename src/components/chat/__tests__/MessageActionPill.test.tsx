import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageActionPill } from '../MessageActionPill';

describe('MessageActionPill', () => {
  it('calls onFlag when Flag for is clicked', () => {
    const onFlag = vi.fn();
    render(<MessageActionPill onFlag={onFlag} />);
    fireEvent.click(screen.getByRole('button', { name: /Flag for/i }));
    expect(onFlag).toHaveBeenCalled();
  });
});
