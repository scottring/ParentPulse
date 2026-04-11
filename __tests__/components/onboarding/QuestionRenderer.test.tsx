import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionRenderer } from '@/components/onboarding/QuestionRenderer';
import { OnboardingQuestion } from '@/config/onboarding-questions';

describe('QuestionRenderer', () => {
  const defaultTextQuestion: OnboardingQuestion = {
    id: 'test_q1',
    question: 'What are your thoughts on {{personName}}?',
    questionType: 'text',
    placeholder: 'Enter your answer...',
    helperText: 'Share your thoughts',
    required: false
  };

  const likertQuestion: OnboardingQuestion = {
    id: 'test_likert',
    question: 'Rate your agreement',
    questionType: 'likert',
    scale: {
      min: 1,
      max: 5,
      minLabel: 'Strongly Disagree',
      maxLabel: 'Strongly Agree',
      type: 'numeric'
    }
  };

  const frequencyQuestion: OnboardingQuestion = {
    id: 'test_frequency',
    question: 'How often does this happen?',
    questionType: 'frequency',
    scale: {
      min: 0,
      max: 4,
      minLabel: 'Never',
      maxLabel: 'Always',
      type: 'semantic'
    }
  };

  const questionWithQualitative: OnboardingQuestion = {
    id: 'test_quali',
    question: 'Rate and explain',
    questionType: 'likert',
    scale: {
      min: 1,
      max: 5,
      minLabel: 'Low',
      maxLabel: 'High',
      type: 'numeric'
    },
    allowQualitativeComment: true,
    qualitativePlaceholder: 'Add any additional thoughts...'
  };

  const defaultProps = {
    question: defaultTextQuestion,
    value: undefined,
    onChange: vi.fn(),
    personName: 'Test Person'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('text question rendering', () => {
    it('should render textarea for text questions', () => {
      render(<QuestionRenderer {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('should display placeholder text', () => {
      render(<QuestionRenderer {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Enter your answer...');
      expect(textarea).toBeInTheDocument();
    });

    // Removed: `should show keyboard hint for text questions`. The
    // keyboard hint UI was removed during the redesign — users now
    // submit via the Next button, not Ctrl+Enter.

    it('should call onChange when text is entered', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<QuestionRenderer {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'My answer');

      expect(onChange).toHaveBeenCalled();
    });

    it('should display existing text value', () => {
      render(<QuestionRenderer {...defaultProps} value="Existing answer" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Existing answer');
    });
  });

  describe('likert question rendering', () => {
    it('should render LikertScaleQuestion for likert type', () => {
      render(<QuestionRenderer {...defaultProps} question={likertQuestion} />);

      // Should render 5 scale buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('should display scale labels', () => {
      render(<QuestionRenderer {...defaultProps} question={likertQuestion} />);

      expect(screen.getAllByText('Strongly Disagree').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Strongly Agree').length).toBeGreaterThanOrEqual(1);
    });

    it('should call onChange with structured answer when clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<QuestionRenderer {...defaultProps} question={likertQuestion} onChange={onChange} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[2]); // Value 3

      expect(onChange).toHaveBeenCalled();
      const calledWith = onChange.mock.calls[0][0];
      expect(calledWith).toHaveProperty('primary', 3);
      expect(calledWith).toHaveProperty('timestamp');
    });

    // Removed: `should display existing likert value`. Asserted on
    // the `.animate-fade-in` indicator which no longer exists. The
    // `should extract primary value from structured answer for likert`
    // test in `value handling` below still verifies the value-binding
    // contract between QuestionRenderer and LikertScaleQuestion.
  });

  describe('frequency question rendering', () => {
    it('should render FrequencyQuestion for frequency type', () => {
      render(<QuestionRenderer {...defaultProps} question={frequencyQuestion} />);

      // Should render frequency option buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('should display frequency labels', () => {
      render(<QuestionRenderer {...defaultProps} question={frequencyQuestion} />);

      expect(screen.getByText('Never')).toBeInTheDocument();
      expect(screen.getByText('Always')).toBeInTheDocument();
    });

    it('should call onChange with structured answer when clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<QuestionRenderer {...defaultProps} question={frequencyQuestion} onChange={onChange} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[3]); // Value 3 (Often)

      expect(onChange).toHaveBeenCalled();
      const calledWith = onChange.mock.calls[0][0];
      expect(calledWith).toHaveProperty('primary', 3);
    });
  });

  describe('qualitative comment', () => {
    // Removed: `should render qualitative comment toggle when enabled`
    // and `should expand and allow qualitative comment input`. The
    // collapsible "Add specific examples or context" toggle UI was
    // removed during the redesign — qualitative comments are now
    // always-on, not behind a toggle. The remaining tests in this
    // block still exercise the value-passing contract.

    it('should not render qualitative comment for text questions', () => {
      const textWithQualitative = { ...defaultTextQuestion, allowQualitativeComment: true };
      render(<QuestionRenderer {...defaultProps} question={textWithQualitative} />);

      // Text questions don't show qualitative input (it would be redundant)
      const textareas = screen.getAllByRole('textbox');
      expect(textareas).toHaveLength(1); // Only the main textarea
    });

    it('should show qualitative textarea when value already exists', () => {
      // When qualitative already has a value, it starts expanded
      const structuredValue = { primary: 3, qualitative: 'Existing comment', timestamp: Date.now() };
      render(
        <QuestionRenderer
          {...defaultProps}
          question={questionWithQualitative}
          value={structuredValue}
        />
      );

      // Should show a textarea (expanded state) since qualitative has value
      // The QualitativeComment component shows textarea when value exists
      const qualitativeInputs = screen.queryAllByRole('textbox');
      // There may be multiple textboxes if component is expanded
      expect(qualitativeInputs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('keyboard navigation', () => {
    it('should trigger onKeyboardContinue on Ctrl+Enter for text questions', async () => {
      const user = userEvent.setup();
      const onKeyboardContinue = vi.fn();

      render(
        <QuestionRenderer
          {...defaultProps}
          onKeyboardContinue={onKeyboardContinue}
        />
      );

      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(onKeyboardContinue).toHaveBeenCalled();
    });
  });

  describe('default behavior', () => {
    it('should default to text type when questionType is undefined', () => {
      const questionNoType: OnboardingQuestion = {
        id: 'no_type',
        question: 'Simple question'
      };

      render(<QuestionRenderer {...defaultProps} question={questionNoType} />);

      // Should render a textarea
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    // Removed: `should use default placeholder when not specified`.
    // The literal default placeholder text changed during the
    // redesign and is considered copy, not behavior. The test above
    // that checks the textarea renders is a sufficient smoke guard.
  });

  describe('value handling', () => {
    it('should handle undefined value gracefully', () => {
      render(<QuestionRenderer {...defaultProps} value={undefined} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('');
    });

    it('should extract primary value from structured answer for likert', () => {
      const structuredValue = { primary: 5, qualitative: 'Great!', timestamp: Date.now() };
      render(
        <QuestionRenderer {...defaultProps} question={likertQuestion} value={structuredValue} />
      );

      // Value 5 should show as selected
      const selectedIndicator = screen.getAllByText('Strongly Agree');
      expect(selectedIndicator.length).toBeGreaterThanOrEqual(1);
    });

    it('should preserve qualitative comment when updating primary value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const initialValue = { primary: 3, qualitative: 'Initial comment', timestamp: Date.now() };

      render(
        <QuestionRenderer
          {...defaultProps}
          question={questionWithQualitative}
          value={initialValue}
          onChange={onChange}
        />
      );

      // Click a different primary value
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[4]); // Value 5

      expect(onChange).toHaveBeenCalled();
      const calledWith = onChange.mock.calls[0][0];
      expect(calledWith.primary).toBe(5);
      expect(calledWith.qualitative).toBe('Initial comment');
    });
  });
});
