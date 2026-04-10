'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface SelfWorthAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  manualId: string;
  relationshipType: string;
}

interface SelfWorthAnswers {
  [questionId: string]: {
    primary: number;
    qualitative?: string;
  };
}

const SELF_WORTH_QUESTIONS = [
  {
    id: 'sw_global',
    question: 'On the whole, {{personName}} is satisfied with themselves',
    domain: 'Global Self-Worth'
  },
  {
    id: 'sw_qualities',
    question: '{{personName}} feels that they have a number of good qualities',
    domain: 'Self-Perception'
  },
  {
    id: 'sw_efficacy',
    question: '{{personName}} is able to do things as well as most other people',
    domain: 'Self-Efficacy'
  },
  {
    id: 'sw_acceptance',
    question: '{{personName}} takes a positive attitude toward themselves',
    domain: 'Self-Acceptance'
  },
  {
    id: 'sw_social',
    question: "{{personName}} feels they're a person of worth, at least on an equal plane with others",
    domain: 'Social Competence'
  },
  {
    id: 'sw_physical',
    question: '{{personName}} feels comfortable with their body and physical abilities',
    domain: 'Physical Competence'
  }
];

export function SelfWorthAssessmentModal({
  isOpen,
  onClose,
  personId,
  personName,
  manualId,
  relationshipType
}: SelfWorthAssessmentModalProps) {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<SelfWorthAnswers>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = SELF_WORTH_QUESTIONS[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];
  const isLastQuestion = currentQuestionIndex === SELF_WORTH_QUESTIONS.length - 1;
  const allQuestionsAnswered = SELF_WORTH_QUESTIONS.every(q => answers[q.id]?.primary);

  const handleScoreChange = (score: number) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        ...currentAnswer,
        primary: score
      }
    });
  };

  const handleQualitativeChange = (text: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: {
        ...currentAnswer,
        qualitative: text || undefined
      }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < SELF_WORTH_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!allQuestionsAnswered || !user) {
      setError('Please answer all questions before submitting');
      return;
    }

    setSaving(true);
    setGenerating(true);
    setError(null);

    try {
      // Call Cloud Function to generate insights
      const generateContentFunction = httpsCallable(functions, 'generateInitialManualContent');

      const wizardAnswers = {
        self_worth: answers
      };

      const result = await generateContentFunction({
        familyId: user.familyId,
        personId,
        personName,
        relationshipType,
        answers: wizardAnswers
      });

      const data = result.data as any;

      if (!data.success || !data.content) {
        throw new Error(data.error || 'Failed to generate content');
      }

      // Calculate self-worth scores
      const totalScore = Object.values(answers).reduce((sum, ans) => sum + ans.primary, 0);
      const averageScore = totalScore / SELF_WORTH_QUESTIONS.length;
      const category = totalScore < 13 ? 'area_for_growth' : totalScore < 19 ? 'developing' : 'area_of_strength';

      const selfWorthScores = {
        items: Object.entries(answers).reduce((acc, [qId, ans]) => {
          const question = SELF_WORTH_QUESTIONS.find(q => q.id === qId);
          acc[qId] = {
            score: ans.primary,
            qualitative: ans.qualitative,
            domain: question?.domain || 'Unknown'
          };
          return acc;
        }, {} as any),
        totalScore,
        averageScore,
        category,
        questionCount: SELF_WORTH_QUESTIONS.length
      };

      // Update manual with self-worth data
      const manualRef = doc(firestore, 'person_manuals', manualId);

      const updates: any = {
        updatedAt: Timestamp.now(),
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId
      };

      // Add assessment scores
      updates['assessmentScores.selfWorth'] = selfWorthScores;

      // Add self-worth insights to coreInfo if they exist
      if (data.content.coreInfo?.selfWorthInsights) {
        updates['coreInfo.selfWorthInsights'] = data.content.coreInfo.selfWorthInsights;
      }

      await updateDoc(manualRef, updates);

      // Reset and close
      setAnswers({});
      setCurrentQuestionIndex(0);
      onClose();
    } catch (err) {
      console.error('Error saving self-worth assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to save portrait');
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div
        className="relative glass-card-strong p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-block px-3 py-1 rounded-full text-white mb-4" style={{ backgroundColor: '#7C9082', fontFamily: 'var(--font-parent-body)', fontSize: '17px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
              Self-worth portrait (RSES)
            </div>
            <h2 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '39px', fontWeight: 400, color: '#3A3530' }}>
              Self-Worth Portrait for {personName}
            </h2>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5C5347' }} className="mt-2">
              Question {currentQuestionIndex + 1} of {SELF_WORTH_QUESTIONS.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-3xl transition-colors hover:opacity-70"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#6B6254' }}
            disabled={saving}
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: '#7C9082',
                width: `${((currentQuestionIndex + 1) / SELF_WORTH_QUESTIONS.length) * 100}%`
              }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <div className="glass-card p-8 rounded-2xl">
            <div className="inline-block px-3 py-1 rounded-full text-white mb-4" style={{ backgroundColor: '#7C9082', fontFamily: 'var(--font-parent-body)', fontSize: '17px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
              {currentQuestion.domain}
            </div>
            <h3 style={{ fontFamily: 'var(--font-parent-display)', fontSize: '33px', fontWeight: 400, color: '#3A3530' }} className="mb-6">
              {currentQuestion.question.replace('{{personName}}', personName)}
            </h3>

            {/* Likert Scale */}
            <div className="space-y-3">
              <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5C5347' }} className="mb-4">
                How much do you agree with this statement?
              </p>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 1, label: 'Strongly Disagree' },
                  { value: 2, label: 'Disagree' },
                  { value: 3, label: 'Agree' },
                  { value: 4, label: 'Strongly Agree' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleScoreChange(option.value)}
                    className="p-4 text-left rounded-2xl transition-all"
                    style={{
                      fontFamily: 'var(--font-parent-body)',
                      fontSize: '19px',
                      fontWeight: 500,
                      ...(currentAnswer?.primary === option.value
                        ? { backgroundColor: '#7C9082', color: 'white', border: '1px solid #7C9082' }
                        : { background: 'rgba(255,255,255,0.5)', color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)' })
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Qualitative Comment */}
            {currentAnswer?.primary && (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.4)' }}>
                <label style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5C5347' }} className="block mb-2">
                  Optional: Add any additional context or notes
                </label>
                <textarea
                  value={currentAnswer.qualitative || ''}
                  onChange={(e) => handleQualitativeChange(e.target.value)}
                  placeholder="e.g., This varies depending on..."
                  className="w-full px-4 py-3 rounded-xl focus:outline-none"
                  style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#3A3530', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.5)' }}
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0 || saving}
            className="px-6 py-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', fontWeight: 500, color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            Previous
          </button>

          <div className="flex gap-3">
            {!isLastQuestion ? (
              <button
                onClick={handleNext}
                disabled={!currentAnswer?.primary || saving}
                className="px-6 py-3 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', fontWeight: 500, backgroundColor: '#7C9082' }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allQuestionsAnswered || saving}
                className="px-8 py-3 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', fontWeight: 500, backgroundColor: '#7C9082' }}
              >
                {generating ? 'Generating insights...' : saving ? 'Saving...' : 'Complete assessment'}
              </button>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {SELF_WORTH_QUESTIONS.map((_, idx) => (
            <div
              key={idx}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                ...(answers[SELF_WORTH_QUESTIONS[idx].id]?.primary
                  ? { backgroundColor: '#7C9082' }
                  : idx === currentQuestionIndex
                  ? { background: 'white', border: '2px solid #7C9082' }
                  : { background: 'rgba(138,128,120,0.3)' })
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
