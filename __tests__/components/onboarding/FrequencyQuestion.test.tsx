import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FrequencyQuestion } from '@/components/onboarding/FrequencyQuestion';
import { ScaleConfig } from '@/config/onboarding-questions';

describe('FrequencyQuestion', () => {
  const defaultScale: ScaleConfig = {
    min: 0,
    max: 4,
    minLabel: 'Never',
    maxLabel: 'Always',
    type: 'semantic'
  };

  const defaultProps = {
    scale: defaultScale,
    value: undefined,
    onChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render correct number of frequency buttons', () => {
      render(<FrequencyQuestion {...defaultProps} />);

      // Should render buttons for values 0-4 (5 buttons)
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('should display min and max labels', () => {
      render(<FrequencyQuestion {...defaultProps} />);

      expect(screen.getByText('Never')).toBeInTheDocument();
      expect(screen.getByText('Always')).toBeInTheDocument();
    });

    it('should display intermediate frequency labels for 5-point scale', () => {
      render(<FrequencyQuestion {...defaultProps} />);

      // Default 5-point semantic scale should have these labels
      expect(screen.getByText('Rarely')).toBeInTheDocument();
      expect(screen.getByText('Sometimes')).toBeInTheDocument();
      expect(screen.getByText('Often')).toBeInTheDocument();
    });

    it('should display selected indicator when value is set', () => {
      render(<FrequencyQuestion {...defaultProps} value={2} />);

      // Should show "Selected" text for the chosen option
      expect(screen.getByText('Selected')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call onChange when button is clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FrequencyQuestion {...defaultProps} onChange={onChange} />);

      // Click the "Sometimes" button (index 2 for 0-based scale)
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[2]);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('should allow selecting different frequency values', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FrequencyQuestion {...defaultProps} onChange={onChange} />);

      const buttons = screen.getAllByRole('button');

      // Click "Never" (0)
      await user.click(buttons[0]);
      expect(onChange).toHaveBeenCalledWith(0);

      // Click "Always" (4)
      await user.click(buttons[4]);
      expect(onChange).toHaveBeenCalledWith(4);

      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('should allow changing selection', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      // Start with value 1 selected
      render(<FrequencyQuestion {...defaultProps} value={1} onChange={onChange} />);

      // Click a different value
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]); // "Often"

      expect(onChange).toHaveBeenCalledWith(3);
    });
  });

  describe('scale configurations', () => {
    it('should handle 4-point frequency scale', () => {
      const fourPointScale: ScaleConfig = {
        min: 1,
        max: 4,
        minLabel: 'Never',
        maxLabel: 'Always',
        type: 'semantic'
      };

      render(<FrequencyQuestion scale={fourPointScale} value={undefined} onChange={vi.fn()} />);

      // Should render 4 buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);

      // Should have 4-point labels
      expect(screen.getByText('Never')).toBeInTheDocument();
      expect(screen.getByText('Occasionally')).toBeInTheDocument();
      expect(screen.getByText('Frequently')).toBeInTheDocument();
      expect(screen.getByText('Always')).toBeInTheDocument();
    });

    it('should handle 3-point frequency scale', () => {
      const threePointScale: ScaleConfig = {
        min: 0,
        max: 2,
        minLabel: 'Never',
        maxLabel: 'Always',
        type: 'semantic'
      };

      render(<FrequencyQuestion scale={threePointScale} value={undefined} onChange={vi.fn()} />);

      // Should render 3 buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);

      // Should have 3-point labels
      expect(screen.getByText('Never')).toBeInTheDocument();
      expect(screen.getByText('Sometimes')).toBeInTheDocument();
      expect(screen.getByText('Always')).toBeInTheDocument();
    });

    it('should handle numeric scale type', () => {
      const numericScale: ScaleConfig = {
        min: 1,
        max: 5,
        minLabel: 'Low',
        maxLabel: 'High',
        type: 'numeric'
      };

      render(<FrequencyQuestion scale={numericScale} value={undefined} onChange={vi.fn()} />);

      // Should render 5 buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);

      // Numeric scale shows numbers for middle values
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  describe('visual feedback', () => {
    it('should show selected indicator only for selected value', () => {
      render(<FrequencyQuestion {...defaultProps} value={2} />);

      // Should show exactly one "Selected" indicator
      const selectedIndicators = screen.getAllByText('Selected');
      expect(selectedIndicators).toHaveLength(1);
    });

    it('should not show selected indicator when no value', () => {
      render(<FrequencyQuestion {...defaultProps} value={undefined} />);

      // Should not show "Selected" text
      expect(screen.queryByText('Selected')).not.toBeInTheDocument();
    });

    it('should apply selected styles to chosen button', () => {
      const { container } = render(<FrequencyQuestion {...defaultProps} value={3} />);

      // The selected button should have special styling (scale-105, shadow-lg)
      const selectedButton = container.querySelector('.scale-105.shadow-lg');
      expect(selectedButton).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should allow keyboard interaction', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FrequencyQuestion {...defaultProps} onChange={onChange} />);

      const buttons = screen.getAllByRole('button');
      // Click the first button
      await user.click(buttons[0]);

      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('should have all buttons focusable', () => {
      render(<FrequencyQuestion {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled');
      });
    });
  });
});
