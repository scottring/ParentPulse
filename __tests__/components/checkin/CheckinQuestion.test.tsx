import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../setup/test-utils';
import { CheckinQuestion } from '@/components/checkin/CheckinQuestion';
import { createMockManual } from '../../setup/mocks/fixtures/manual';

describe('CheckinQuestion', () => {
  const mockManual = createMockManual();
  const mockOnSubmit = vi.fn();

  it('renders the manual title', () => {
    render(<CheckinQuestion manual={mockManual} onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Our Family Manual')).toBeDefined();
  });

  it('renders all 5 rating options', () => {
    render(<CheckinQuestion manual={mockManual} onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Disconnected')).toBeDefined();
    expect(screen.getByText('Drifting')).toBeDefined();
    expect(screen.getByText('Okay')).toBeDefined();
    expect(screen.getByText('Aligned')).toBeDefined();
    expect(screen.getByText('Thriving')).toBeDefined();
  });

  it('disables the Next button when no rating is selected', () => {
    render(<CheckinQuestion manual={mockManual} onSubmit={mockOnSubmit} />);
    const nextButton = screen.getByText('Next');
    expect(nextButton.getAttribute('disabled')).not.toBeNull();
  });

  it('enables the Next button after selecting a rating', async () => {
    const { user } = render(<CheckinQuestion manual={mockManual} onSubmit={mockOnSubmit} />);
    await user.click(screen.getByText('Aligned'));
    const nextButton = screen.getByText('Next');
    expect(nextButton.getAttribute('disabled')).toBeNull();
  });

  it('calls onSubmit with rating when Next is clicked', async () => {
    const { user } = render(<CheckinQuestion manual={mockManual} onSubmit={mockOnSubmit} />);
    await user.click(screen.getByText('Thriving'));
    await user.click(screen.getByText('Next'));
    expect(mockOnSubmit).toHaveBeenCalledWith('', 5, undefined);
  });

  it('shows drift notes option for low ratings', async () => {
    const { user } = render(<CheckinQuestion manual={mockManual} onSubmit={mockOnSubmit} />);
    await user.click(screen.getByText('Drifting'));
    expect(screen.getByText('Notice any drift? (optional)')).toBeDefined();
  });

  it('does not show drift notes for high ratings', async () => {
    const { user } = render(<CheckinQuestion manual={mockManual} onSubmit={mockOnSubmit} />);
    await user.click(screen.getByText('Thriving'));
    expect(screen.queryByText('Notice any drift? (optional)')).toBeNull();
  });
});
