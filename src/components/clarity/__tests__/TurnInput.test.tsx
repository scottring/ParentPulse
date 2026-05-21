import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnInput } from '../TurnInput';

describe('TurnInput', () => {
  it('shows fresh-obstacle prompt when status=fresh', () => {
    render(<TurnInput status="fresh" sending={false} onSend={() => {}} />);
    const ta = screen.getByPlaceholderText(/What's getting in the way/i);
    expect(ta).toBeInTheDocument();
  });

  it('shows ongoing prompt when status=clarifying', () => {
    render(<TurnInput status="clarifying" sending={false} onSend={() => {}} />);
    expect(screen.getByPlaceholderText(/Keep going/i)).toBeInTheDocument();
  });

  it('calls onSend with the trimmed message when Send is clicked', () => {
    const onSend = vi.fn();
    render(<TurnInput status="clarifying" sending={false} onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: '  hello  ' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('disables send button while sending', () => {
    render(<TurnInput status="clarifying" sending={true} onSend={() => {}} />);
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });

  it('does not call onSend when textarea is empty', () => {
    const onSend = vi.fn();
    render(<TurnInput status="clarifying" sending={false} onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends on Cmd/Ctrl+Enter', () => {
    const onSend = vi.fn();
    render(<TurnInput status="clarifying" sending={false} onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'hello' } });
    fireEvent.keyDown(ta, { key: 'Enter', metaKey: true });
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('does not send on plain Enter', () => {
    const onSend = vi.fn();
    render(<TurnInput status="clarifying" sending={false} onSend={onSend} />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'hello' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });
});
