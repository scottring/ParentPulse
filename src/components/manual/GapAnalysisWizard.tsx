'use client';

import { useState, useCallback, useMemo } from 'react';
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { usePersonManual } from '@/hooks/usePersonManual';
import type { RelationshipType } from '@/types/person-manual';

interface GapAnalysisWizardProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  manual: any;
  gaps: string[];
}

// Relationship-aware question configurations
function getGapQuestions(relationshipType: RelationshipType | undefined, personName: string) {
  // Determine pronouns and context based on relationship
  const isChild = relationshipType === 'child';
  const isSelf = relationshipType === 'self';
  const isElderly = relationshipType === 'elderly_parent';
  const isSpouse = relationshipType === 'spouse';

  const they = isSelf ? 'you' : 'they';
  const them = isSelf ? 'you' : 'them';
  const their = isSelf ? 'your' : 'their';
  const They = isSelf ? 'You' : 'They';
  const name = isSelf ? 'you' : personName;

  return {
    Triggers: {
      title: 'Understanding Triggers',
      questions: [
        {
          id: 'trigger1',
          question: isSelf
            ? 'What situation most often leads to stress or difficult moments for you?'
            : `What situation most often leads to difficult moments for ${personName}?`,
          placeholder: isChild
            ? 'e.g., Transitions between activities, being told "no", sensory overload...'
            : isSelf
            ? 'e.g., Work deadlines, family conflicts, feeling overwhelmed, lack of sleep...'
            : isElderly
            ? 'e.g., Changes in routine, health concerns, technology frustration, feeling rushed...'
            : 'e.g., Stress at work, miscommunication, feeling unheard, time pressure...',
          type: 'textarea' as const,
        },
        {
          id: 'trigger1_context',
          question: 'When does this typically happen?',
          placeholder: isChild
            ? 'e.g., After school, during homework, at bedtime...'
            : isSelf
            ? 'e.g., Monday mornings, end of day, during busy seasons...'
            : 'e.g., During conversations about money, when tired, in social situations...',
          type: 'text' as const,
        },
        {
          id: 'trigger1_severity',
          question: 'How intense is the reaction usually?',
          type: 'select' as const,
          options: ['Minor - brief upset or frustration', 'Moderate - needs time or support to recover', 'Significant - major impact on mood or day'],
          placeholder: '',
        },
        {
          id: 'trigger1_helps',
          question: isSelf
            ? 'What helps you when this happens?'
            : `What helps ${personName} when this happens?`,
          placeholder: isChild
            ? 'e.g., Giving a 5-minute warning, offering choices, quiet space...'
            : isSelf
            ? 'e.g., Taking a walk, deep breathing, talking it through, alone time...'
            : 'e.g., Active listening, giving space, physical comfort, distraction...',
          type: 'textarea' as const,
        },
      ],
    },
    Strategies: {
      title: 'What Works',
      questions: [
        {
          id: 'strategy1',
          question: isSelf
            ? 'What approach helps you manage difficult moments?'
            : `What approach consistently helps in difficult moments with ${personName}?`,
          placeholder: isChild
            ? 'e.g., Getting down to their eye level and speaking softly...'
            : isSelf
            ? 'e.g., Stepping away for 5 minutes, journaling, calling a friend...'
            : isSpouse
            ? 'e.g., Using "I feel" statements, taking a break before responding...'
            : 'e.g., Staying calm, validating feelings first, offering options...',
          type: 'textarea' as const,
        },
        {
          id: 'strategy1_when',
          question: isSelf ? 'When do you use this strategy?' : 'When do you use this strategy?',
          placeholder: isChild
            ? 'e.g., When they start to escalate, during transitions...'
            : 'e.g., When tension rises, during disagreements, when feeling stuck...',
          type: 'text' as const,
        },
        {
          id: 'strategy2',
          question: isSelf
            ? 'What calming technique works best for you?'
            : `What calming technique works best for ${personName}?`,
          placeholder: isChild
            ? 'e.g., Deep breathing together, physical activity, quiet time...'
            : isSelf
            ? 'e.g., Meditation, exercise, music, being in nature...'
            : 'e.g., Quiet conversation, physical touch, giving space, humor...',
          type: 'textarea' as const,
        },
        {
          id: 'strategy3',
          question: isSelf
            ? 'What type of positive reinforcement or motivation works for you?'
            : `What positive reinforcement resonates most with ${personName}?`,
          placeholder: isChild
            ? 'e.g., Specific praise, sticker charts, quality time...'
            : isSelf
            ? 'e.g., Tracking progress, celebrating small wins, rewards...'
            : 'e.g., Words of affirmation, quality time, acts of service...',
          type: 'textarea' as const,
        },
      ],
    },
    Boundaries: {
      title: 'Important Boundaries',
      questions: [
        {
          id: 'boundary1',
          question: isSelf
            ? 'What is one non-negotiable boundary you need to maintain?'
            : `What is one non-negotiable boundary for ${personName}?`,
          placeholder: isChild
            ? 'e.g., No hitting, must hold hands in parking lots...'
            : isSelf
            ? 'e.g., No work emails after 8pm, protected morning routine...'
            : isSpouse
            ? 'e.g., No name-calling during arguments, respect for alone time...'
            : 'e.g., Respect for privacy, honoring commitments...',
          type: 'textarea' as const,
        },
        {
          id: 'boundary1_why',
          question: 'Why is this boundary important?',
          placeholder: 'e.g., Safety concern, mental health, family value, personal need...',
          type: 'text' as const,
        },
        {
          id: 'boundary2',
          question: isSelf
            ? 'What flexible boundary do you try to maintain?'
            : `What flexible boundary exists for ${personName}?`,
          placeholder: isChild
            ? 'e.g., Screen time limits, bedtime on weekends...'
            : isSelf
            ? 'e.g., Exercise schedule, social commitments...'
            : 'e.g., Household responsibilities, communication frequency...',
          type: 'textarea' as const,
        },
        {
          id: 'boundary2_consequence',
          question: 'What happens when this boundary is crossed?',
          placeholder: isChild
            ? 'e.g., Natural consequences, loss of privilege, time out...'
            : 'e.g., Need to have a conversation, take space, reassess...',
          type: 'text' as const,
        },
      ],
    },
    Strengths: {
      title: 'Recognizing Strengths',
      questions: [
        {
          id: 'strength1',
          question: isSelf
            ? 'What is your greatest strength?'
            : `What is ${personName}'s greatest strength?`,
          placeholder: 'e.g., Creativity, empathy, persistence, humor, problem-solving...',
          type: 'text' as const,
        },
        {
          id: 'strength2',
          question: isSelf ? 'What comes naturally to you?' : `What comes naturally to ${personName}?`,
          placeholder: 'e.g., Connecting with people, staying organized, thinking creatively...',
          type: 'text' as const,
        },
        {
          id: 'strength3',
          question: isSelf
            ? 'What do others often compliment you about?'
            : `What do others often compliment about ${personName}?`,
          placeholder: 'e.g., Their kindness, their energy, their thoughtfulness, their skills...',
          type: 'text' as const,
        },
      ],
    },
    Interests: {
      title: 'Discovering Interests',
      questions: [
        {
          id: 'interest1',
          question: isSelf
            ? 'What do you love to do most?'
            : `What does ${personName} love to do most?`,
          placeholder: isChild
            ? 'e.g., Drawing, playing outside, building Legos, reading...'
            : 'e.g., Reading, cooking, sports, creative projects, being outdoors...',
          type: 'text' as const,
        },
        {
          id: 'interest2',
          question: isSelf
            ? 'What topic could you talk about for hours?'
            : `What topic could ${personName} talk about for hours?`,
          placeholder: 'e.g., History, technology, sports, travel, current events...',
          type: 'text' as const,
        },
        {
          id: 'interest3',
          question: isSelf
            ? 'What activity helps you feel calm and centered?'
            : `What activity helps ${personName} feel calm and centered?`,
          placeholder: 'e.g., Music, exercise, creating art, being in nature, meditation...',
          type: 'text' as const,
        },
      ],
    },
  };
}

export function GapAnalysisWizard({ isOpen, onClose, personId, personName, manual, gaps }: GapAnalysisWizardProps) {
  const [currentGapIndex, setCurrentGapIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [savedGaps, setSavedGaps] = useState<string[]>([]);

  const { addTrigger, addStrategy, addBoundary, updateManual } = usePersonManual(personId);

  // Get relationship-aware questions
  const GAP_QUESTIONS = useMemo(
    () => getGapQuestions(manual?.relationshipType, personName),
    [manual?.relationshipType, personName]
  );

  const currentGap = gaps[currentGapIndex];
  const gapConfig = currentGap ? GAP_QUESTIONS[currentGap as keyof typeof GAP_QUESTIONS] : null;
  const currentQuestion = gapConfig?.questions[currentQuestionIndex];
  const totalQuestions = gapConfig?.questions.length || 0;

  const handleAnswer = (value: string) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const saveCurrentGapAnswers = async (): Promise<boolean> => {
    if (!manual?.manualId || !currentGap) return false;

    // Check if we have any answers for this gap
    const gapAnswerKeys = gapConfig?.questions.map(q => q.id) || [];
    const hasAnswers = gapAnswerKeys.some(key => answers[key]?.trim());
    if (!hasAnswers) return false;

    setIsSaving(true);

    try {
      switch (currentGap) {
        case 'Triggers': {
          const triggerDesc = answers.trigger1;
          if (triggerDesc?.trim()) {
            await addTrigger(manual.manualId, {
              description: triggerDesc,
              context: answers.trigger1_context || '',
              severity: answers.trigger1_severity?.includes('Significant') ? 'significant' :
                       answers.trigger1_severity?.includes('Moderate') ? 'moderate' : 'mild',
              typicalResponse: 'Added via gap analysis',
              deescalationStrategy: answers.trigger1_helps || '',
            });
            setSavedGaps(prev => [...prev, 'Triggers']);
          }
          break;
        }
        case 'Strategies': {
          const strategies = [
            { desc: answers.strategy1, context: answers.strategy1_when },
            { desc: answers.strategy2, context: 'Calming technique' },
            { desc: answers.strategy3, context: 'Positive reinforcement' },
          ].filter(s => s.desc?.trim());

          for (const strategy of strategies) {
            await addStrategy(manual.manualId, {
              description: strategy.desc!,
              context: strategy.context || '',
              effectiveness: 4 as 1 | 2 | 3 | 4 | 5,
              sourceType: 'discovered',
            }, 'whatWorks');
          }
          if (strategies.length > 0) {
            setSavedGaps(prev => [...prev, 'Strategies']);
          }
          break;
        }
        case 'Boundaries': {
          const boundaries = [
            { desc: answers.boundary1, context: answers.boundary1_why, category: 'immovable' },
            { desc: answers.boundary2, context: 'Flexible boundary', category: 'negotiable', consequences: answers.boundary2_consequence },
          ].filter(b => b.desc?.trim());

          for (const boundary of boundaries) {
            await addBoundary(manual.manualId, {
              description: boundary.desc!,
              context: boundary.context || '',
              category: boundary.category as 'immovable' | 'negotiable' | 'preference',
              consequences: boundary.consequences || '',
            });
          }
          if (boundaries.length > 0) {
            setSavedGaps(prev => [...prev, 'Boundaries']);
          }
          break;
        }
        case 'Strengths': {
          const strengths = [answers.strength1, answers.strength2, answers.strength3].filter(s => s?.trim());
          if (strengths.length > 0) {
            const existingStrengths = manual.coreInfo?.strengths || [];
            await updateManual(manual.manualId, {
              coreInfo: {
                ...manual.coreInfo,
                strengths: [...existingStrengths, ...strengths],
              },
            });
            setSavedGaps(prev => [...prev, 'Strengths']);
          }
          break;
        }
        case 'Interests': {
          const interests = [answers.interest1, answers.interest2, answers.interest3].filter(s => s?.trim());
          if (interests.length > 0) {
            const existingInterests = manual.coreInfo?.interests || [];
            await updateManual(manual.manualId, {
              coreInfo: {
                ...manual.coreInfo,
                interests: [...existingInterests, ...interests],
              },
            });
            setSavedGaps(prev => [...prev, 'Interests']);
          }
          break;
        }
      }
      return true;
    } catch (err) {
      console.error('Error saving gap answers:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = useCallback(async () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // Next question in current gap
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentGapIndex < gaps.length - 1) {
      // Save current gap's answers and move to next gap
      await saveCurrentGapAnswers();
      setCurrentGapIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      // All done - save final gap and complete
      await saveCurrentGapAnswers();
      setIsComplete(true);
    }
  }, [currentQuestionIndex, totalQuestions, currentGapIndex, gaps.length]);

  const goPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentGapIndex > 0) {
      setCurrentGapIndex(prev => prev - 1);
      const prevGap = gaps[currentGapIndex - 1];
      const prevConfig = GAP_QUESTIONS[prevGap as keyof typeof GAP_QUESTIONS];
      setCurrentQuestionIndex((prevConfig?.questions.length || 1) - 1);
    }
  };

  const handleSaveAndExit = async () => {
    // Save any answers we have for the current gap
    await saveCurrentGapAnswers();
    handleClose();
  };

  const handleClose = () => {
    setCurrentGapIndex(0);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsComplete(false);
    setSavedGaps([]);
    onClose();
  };

  if (!isOpen) return null;

  // Completion screen
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-2 border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-300">
            <CheckIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-3">
            Manual Updated!
          </h2>
          <p className="text-slate-600 mb-4">
            Great job! You've added new content to {manual?.relationshipType === 'self' ? 'your' : `${personName}'s`} manual.
          </p>
          {savedGaps.length > 0 && (
            <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-500 mb-2">Sections updated:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {savedGaps.map(gap => (
                  <span key={gap} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!gapConfig || !currentQuestion) {
    return null;
  }

  const overallProgress = gaps.length > 0
    ? ((currentGapIndex * totalQuestions + currentQuestionIndex + 1) / (gaps.length * totalQuestions)) * 100
    : 0;

  const answeredInCurrentGap = gapConfig.questions.filter(q => answers[q.id]?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200">
        {/* Header with exit option */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center border border-amber-200">
              <SparklesIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">
                Section {currentGapIndex + 1} of {gaps.length}: {currentGap}
              </p>
              <h3 className="font-semibold text-slate-800">{gapConfig.title}</h3>
            </div>
          </div>
          <button
            onClick={handleSaveAndExit}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Save progress and exit"
          >
            <XMarkIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Save & Exit</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Question content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
            {answeredInCurrentGap > 0 && (
              <p className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {answeredInCurrentGap} answered
              </p>
            )}
          </div>
          <h4 className="text-lg font-medium text-slate-800 mb-4">
            {currentQuestion.question}
          </h4>

          {currentQuestion.type === 'textarea' && (
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none"
            />
          )}

          {currentQuestion.type === 'text' && (
            <input
              type="text"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
            />
          )}

          {currentQuestion.type === 'select' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className={`w-full px-4 py-3 border rounded-xl text-left transition-all ${
                    answers[currentQuestion.id] === option
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Skip hint */}
          <p className="mt-3 text-xs text-slate-400">
            You can skip questions - just click Next. Your answered questions will be saved.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <button
            onClick={goPrev}
            disabled={currentGapIndex === 0 && currentQuestionIndex === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-slate-100"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {/* Skip button */}
            {!answers[currentQuestion.id]?.trim() && (
              <button
                onClick={goNext}
                disabled={isSaving}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
              >
                Skip
              </button>
            )}

            <button
              onClick={goNext}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                'Saving...'
              ) : currentGapIndex === gaps.length - 1 && currentQuestionIndex === totalQuestions - 1 ? (
                <>
                  Complete
                  <CheckIcon className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
