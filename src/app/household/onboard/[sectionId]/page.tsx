'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHouseholdManual } from '@/hooks/useHouseholdManual';
import { isDemoUser, isDemoMode } from '@/utils/demo';
import {
  HouseholdSectionId,
  HOUSEHOLD_SECTION_META,
} from '@/types/household-workbook';
import {
  getHouseholdSection,
  HouseholdOnboardingQuestion,
} from '@/config/household-onboarding-questions';
import {
  TechnicalCard,
  TechnicalButton,
} from '@/components/technical';
import AIContentReview from '@/components/household/AIContentReview';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

type WizardStep = 'questions' | 'generating' | 'review' | 'complete';

interface ContentItem {
  id: string;
  type: 'string' | 'non-negotiable' | 'zone' | 'contact' | 'ritual' | 'card';
  value: string | Record<string, any>;
  label?: string;
}

export default function SectionOnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = params.sectionId as HouseholdSectionId;

  const { user, loading: authLoading } = useAuth();
  const { manual, loading: manualLoading, updateManual } = useHouseholdManual(user?.familyId);

  const [currentStep, setCurrentStep] = useState<WizardStep>('questions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [generatedContent, setGeneratedContent] = useState<ContentItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Check for demo mode
  useEffect(() => {
    const demo = isDemoMode() || isDemoUser(user);
    setIsDemo(demo);
  }, [user]);

  // Get section config
  const section = getHouseholdSection(sectionId);
  const sectionMeta = HOUSEHOLD_SECTION_META[sectionId];

  // Load saved answers from localStorage
  useEffect(() => {
    if (!user?.familyId || !sectionId) return;

    const savedAnswers = localStorage.getItem(`household-onboard-${user.familyId}-${sectionId}`);
    if (savedAnswers) {
      try {
        setAnswers(JSON.parse(savedAnswers));
      } catch (err) {
        console.error('Failed to load saved answers:', err);
      }
    }
  }, [user?.familyId, sectionId]);

  // Save answers to localStorage
  useEffect(() => {
    if (!user?.familyId || !sectionId || Object.keys(answers).length === 0) return;
    localStorage.setItem(
      `household-onboard-${user.familyId}-${sectionId}`,
      JSON.stringify(answers)
    );
  }, [answers, user?.familyId, sectionId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Handle answer submission
  const handleAnswer = useCallback((questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  // Navigate to next question
  const handleNext = useCallback(() => {
    if (!section) return;

    if (currentQuestionIndex < section.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All questions answered - generate content or save directly
      if (section.aiGenerationEnabled) {
        setCurrentStep('generating');
        generateContent();
      } else {
        // For non-AI sections (like pulse), save directly
        saveAnswersDirectly();
      }
    }
  }, [currentQuestionIndex, section]);

  // Navigate to previous question
  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Skip current question
  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  // Generate AI content
  const generateContent = async () => {
    setIsGenerating(true);
    setError(null);

    // In demo mode, use fallback content directly (skip expensive API call)
    if (isDemo) {
      const demoContent = generateDemoFallbackContent(sectionId, answers);
      setGeneratedContent(demoContent);
      setCurrentStep('review');
      setIsGenerating(false);
      return;
    }

    try {
      const generateFunction = httpsCallable(functions, 'generateHouseholdSectionContent');
      const result = await generateFunction({
        familyId: user?.familyId,
        sectionId,
        answers,
        householdName: manual?.householdName,
        members: manual?.members || [],
      });

      const data = result.data as { items: ContentItem[] };
      setGeneratedContent(data.items || []);
      setCurrentStep('review');
    } catch (err: any) {
      console.error('Error generating content:', err);
      // Fallback to manual content creation
      setError('Could not generate AI content. You can still enter content manually.');
      setCurrentStep('questions');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save answers directly (for non-AI sections like pulse)
  const saveAnswersDirectly = async () => {
    if (!manual || !sectionId) return;

    try {
      // Transform answers into section-specific data structure
      const sectionData = transformAnswersToSectionData(sectionId, answers);

      await updateManual({
        [getSectionFieldName(sectionId)]: sectionData,
        onboardingProgress: {
          completedSections: [
            ...(manual.onboardingProgress?.completedSections || []).filter(s => s !== sectionId),
            sectionId
          ],
          lastSectionCompleted: sectionId,
        }
      });

      // Clear localStorage
      localStorage.removeItem(`household-onboard-${user?.familyId}-${sectionId}`);

      setCurrentStep('complete');
    } catch (err) {
      console.error('Error saving answers:', err);
      setError('Failed to save. Please try again.');
    }
  };

  // Handle approving AI-generated content
  const handleApproveContent = async (items: ContentItem[]) => {
    if (!manual || !sectionId) return;

    try {
      const sectionData = transformItemsToSectionData(sectionId, items);

      await updateManual({
        [getSectionFieldName(sectionId)]: sectionData,
        onboardingProgress: {
          completedSections: [
            ...(manual.onboardingProgress?.completedSections || []).filter(s => s !== sectionId),
            sectionId
          ],
          lastSectionCompleted: sectionId,
        }
      });

      // Clear localStorage
      localStorage.removeItem(`household-onboard-${user?.familyId}-${sectionId}`);

      setCurrentStep('complete');
    } catch (err) {
      console.error('Error saving content:', err);
      setError('Failed to save. Please try again.');
    }
  };

  // Handle regenerating content
  const handleRejectContent = () => {
    setCurrentStep('generating');
    generateContent();
  };

  // Handle editing a content item
  const handleEditContent = (itemId: string, newValue: any) => {
    setGeneratedContent((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, value: newValue } : item
      )
    );
  };

  // Loading state
  if (authLoading || manualLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 uppercase tracking-wider">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Invalid section
  if (!section || !sectionMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <TechnicalCard shadowSize="lg" className="p-8 text-center max-w-md">
          <h2 className="font-mono font-bold text-xl text-slate-800 mb-4">
            Section Not Found
          </h2>
          <p className="text-slate-600 mb-6">
            The section &quot;{sectionId}&quot; does not exist.
          </p>
          <TechnicalButton variant="primary" onClick={() => router.push('/household')}>
            BACK TO HOUSEHOLD
          </TechnicalButton>
        </TechnicalCard>
      </div>
    );
  }

  const currentQuestion = section.questions[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / section.questions.length) * 100);

  // Complete screen
  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <TechnicalCard shadowSize="lg" className="max-w-lg w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="font-mono font-bold text-2xl text-slate-800 mb-4">
            {sectionMeta.name} Complete!
          </h1>
          <p className="text-slate-600 mb-8">
            Your {sectionMeta.name.toLowerCase()} has been saved to your household manual.
          </p>
          <div className="flex gap-4 justify-center">
            <TechnicalButton
              variant="primary"
              onClick={() => router.push('/household')}
            >
              VIEW MANUAL
            </TechnicalButton>
            <TechnicalButton
              variant="outline"
              onClick={() => router.push('/household/onboard')}
            >
              CONTINUE SETUP
            </TechnicalButton>
          </div>
        </TechnicalCard>
      </div>
    );
  }

  // Review screen
  if (currentStep === 'review') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <AIContentReview
            sectionName={sectionMeta.name}
            items={generatedContent}
            onApprove={handleApproveContent}
            onReject={handleRejectContent}
            onEdit={handleEditContent}
            isLoading={isGenerating}
          />
        </div>
      </div>
    );
  }

  // Generating screen
  if (currentStep === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <TechnicalCard shadowSize="lg" className="max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mx-auto mb-6" />
          <h1 className="font-mono font-bold text-2xl text-slate-800 mb-4">
            Generating {sectionMeta.name}...
          </h1>
          <p className="text-slate-600">
            Our AI is creating personalized content based on your answers.
          </p>
        </TechnicalCard>
      </div>
    );
  }

  // Questions screen
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Progress bar */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-mono text-sm font-bold text-slate-800">
                {sectionMeta.name}
              </span>
              <span className="font-mono text-xs text-slate-500 ml-2">
                Layer {sectionMeta.layer}
              </span>
            </div>
            <span className="font-mono text-sm text-slate-600">
              {currentQuestionIndex + 1} / {section.questions.length}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2">
            <div
              className="bg-amber-500 h-2 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <TechnicalCard shadowSize="lg" className="p-8">
            {/* Question */}
            <h2 className="text-xl font-medium text-slate-800 mb-2">
              {currentQuestion.question}
            </h2>
            {currentQuestion.helperText && (
              <p className="text-sm text-slate-500 mb-6">
                {currentQuestion.helperText}
              </p>
            )}

            {/* Answer input based on question type */}
            <div className="mb-8">
              <QuestionInput
                question={currentQuestion}
                value={answers[currentQuestion.id]}
                onChange={(value) => handleAnswer(currentQuestion.id, value)}
                demoMode={isDemo}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 p-3 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <div>
                {currentQuestionIndex > 0 && (
                  <TechnicalButton variant="outline" onClick={handleBack}>
                    ← BACK
                  </TechnicalButton>
                )}
              </div>
              <div className="flex gap-2">
                {!currentQuestion.required && (
                  <TechnicalButton variant="outline" onClick={handleSkip}>
                    SKIP
                  </TechnicalButton>
                )}
                <TechnicalButton
                  variant="primary"
                  onClick={handleNext}
                  disabled={currentQuestion.required && !answers[currentQuestion.id]}
                >
                  {currentQuestionIndex === section.questions.length - 1
                    ? section.aiGenerationEnabled
                      ? 'GENERATE'
                      : 'SAVE'
                    : 'NEXT →'}
                </TechnicalButton>
              </div>
            </div>
          </TechnicalCard>

          {/* Cancel link */}
          <div className="text-center mt-4">
            <button
              onClick={() => router.push('/household')}
              className="font-mono text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel and return to manual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Question input component
function QuestionInput({
  question,
  value,
  onChange,
  demoMode = false,
}: {
  question: HouseholdOnboardingQuestion;
  value: any;
  onChange: (value: any) => void;
  demoMode?: boolean;
}) {
  switch (question.questionType) {
    case 'text':
      return (
        <div className="relative">
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full p-3 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800 resize-none"
            rows={4}
          />
          {/* Use placeholder button for demo mode */}
          {demoMode && question.placeholder && (
            <button
              type="button"
              onClick={() => onChange(question.placeholder)}
              className="absolute bottom-3 right-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-mono font-bold rounded shadow-sm transition-all opacity-70 hover:opacity-100"
              title="Use placeholder text"
            >
              USE PLACEHOLDER
            </button>
          )}
        </div>
      );

    case 'rating':
      return (
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => onChange(rating)}
              className={`w-14 h-14 border-2 font-mono text-lg font-bold transition-all ${
                value === rating
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-slate-300 hover:border-slate-400 text-slate-600'
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
      );

    case 'yes_no':
      return (
        <div className="flex gap-4 justify-center">
          {[
            { val: true, label: 'Yes' },
            { val: false, label: 'No' },
          ].map(({ val, label }) => (
            <button
              key={label}
              onClick={() => onChange(val)}
              className={`px-8 py-4 border-2 font-mono font-bold uppercase transition-all ${
                value === val
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-slate-300 hover:border-slate-400 text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      );

    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {question.options?.map((option) => (
            <button
              key={String(option.value)}
              onClick={() => onChange(option.value)}
              className={`w-full p-4 border-2 text-left transition-all ${
                value === option.value
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="font-medium text-slate-800">{option.label}</span>
              {option.description && (
                <span className="block text-sm text-slate-500 mt-1">
                  {option.description}
                </span>
              )}
            </button>
          ))}
        </div>
      );

    case 'checkbox':
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {question.options?.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={String(option.value)}
                onClick={() => {
                  if (isSelected) {
                    onChange(selectedValues.filter((v: any) => v !== option.value));
                  } else {
                    if (question.maxSelections && selectedValues.length >= question.maxSelections) {
                      return;
                    }
                    onChange([...selectedValues, option.value]);
                  }
                }}
                className={`w-full p-4 border-2 text-left transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {isSelected && '✓'}
                  </div>
                  <div>
                    <span className="font-medium text-slate-800">{option.label}</span>
                    {option.description && (
                      <span className="block text-sm text-slate-500 mt-1">
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {question.minSelections && selectedValues.length < question.minSelections && (
            <p className="text-sm text-amber-600 mt-2">
              Select at least {question.minSelections}
            </p>
          )}
          {question.maxSelections && (
            <p className="text-sm text-slate-500 mt-2">
              Select up to {question.maxSelections} ({selectedValues.length} selected)
            </p>
          )}
        </div>
      );

    case 'day_picker':
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return (
        <div className="flex gap-2 justify-center flex-wrap">
          {days.map((day, index) => (
            <button
              key={day}
              onClick={() => onChange(index)}
              className={`w-14 h-14 border-2 font-mono text-sm font-bold transition-all ${
                value === index
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-slate-300 hover:border-slate-400 text-slate-600'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="w-full p-3 border-2 border-slate-300 font-mono text-sm focus:outline-none focus:border-slate-800"
        />
      );
  }
}

// Helper functions for transforming data

function getSectionFieldName(sectionId: HouseholdSectionId): string {
  const fieldMap: Record<HouseholdSectionId, string> = {
    home_charter: 'homeCharter',
    sanctuary_map: 'sanctuaryMap',
    village_wiki: 'villageWiki',
    roles_rituals: 'rolesAndRituals',
    communication_rhythm: 'communicationRhythm',
    household_pulse: 'householdPulse',
  };
  return fieldMap[sectionId];
}

function transformAnswersToSectionData(sectionId: HouseholdSectionId, answers: Record<string, any>): any {
  // Transform raw answers into section-specific data structures
  // This is used for non-AI sections like household_pulse

  switch (sectionId) {
    case 'household_pulse':
      return {
        currentAssessment: {
          assessmentId: `assessment-${Date.now()}`,
          assessedAt: new Date(),
          assessedBy: 'user',
          dimensions: {
            clarity: {
              dimensionId: 'clarity',
              label: 'Clarity',
              description: 'How clear are roles, rules, and expectations',
              score: answers.pulse_clarity || 3,
            },
            restoration: {
              dimensionId: 'restoration',
              label: 'Restoration',
              description: 'How well does your home support rest and recovery',
              score: answers.pulse_restoration || 3,
            },
            efficiency: {
              dimensionId: 'efficiency',
              label: 'Efficiency',
              description: 'How smoothly do daily routines run',
              score: answers.pulse_efficiency || 3,
            },
            connection: {
              dimensionId: 'connection',
              label: 'Connection',
              description: 'How connected does your family feel',
              score: answers.pulse_connection || 3,
            },
          },
          overallScore: Math.round(
            ((answers.pulse_clarity || 3) +
              (answers.pulse_restoration || 3) +
              (answers.pulse_efficiency || 3) +
              (answers.pulse_connection || 3)) / 4
          ),
        },
        assessmentHistory: [],
      };

    default:
      return answers;
  }
}

function transformItemsToSectionData(sectionId: HouseholdSectionId, items: ContentItem[]): any {
  // Transform AI-generated content items into section-specific data structures
  // Implementation depends on the section type and expected structure

  const now = new Date();

  switch (sectionId) {
    case 'home_charter':
      return {
        familyMission: items.find(i => i.label === 'Mission')?.value || '',
        nonNegotiables: items
          .filter(i => i.type === 'non-negotiable')
          .map(i => {
            const base: Record<string, any> = {
              id: i.id,
              value: typeof i.value === 'string' ? i.value : (i.value as any).value || '',
              source: 'ai',
              createdAt: now,
            };
            // Only add description if it exists (Firestore doesn't accept undefined)
            if (typeof i.value === 'object' && (i.value as any).description) {
              base.description = (i.value as any).description;
            }
            return base;
          }),
        desiredFeelings: items
          .find(i => i.label === 'Desired Feelings')?.value as string[] || [],
        coreValues: items
          .find(i => i.label === 'Core Values')?.value as string[] || [],
        updatedAt: now,
      };

    case 'sanctuary_map':
      return {
        lightAudit: items.filter(i => i.type === 'string' && i.label?.includes('Light')).map(i => ({
          id: i.id,
          type: 'light',
          location: 'General',
          description: String(i.value || ''),
          quality: 'needs-improvement',
          source: 'ai',
          createdAt: now,
        })),
        soundAudit: items.filter(i => i.type === 'string' && i.label?.includes('Sound')).map(i => ({
          id: i.id,
          type: 'sound',
          location: 'General',
          description: String(i.value || ''),
          quality: 'needs-improvement',
          source: 'ai',
          createdAt: now,
        })),
        zones: items.filter(i => i.type === 'zone').map(i => ({
          name: (i.value as any)?.name || '',
          purpose: (i.value as any)?.purpose || '',
          location: (i.value as any)?.location || '',
          id: i.id,
          source: 'ai',
          createdAt: now,
        })),
        updatedAt: now,
      };

    case 'village_wiki':
      return {
        contacts: items.filter(i => i.type === 'contact').map(i => ({
          id: i.id,
          name: (i.value as any)?.name || '',
          role: (i.value as any)?.role || '',
          phone: (i.value as any)?.phone || '',
          source: 'ai',
          createdAt: now,
        })),
        updatedAt: now,
      };

    case 'roles_rituals':
      return {
        rituals: items.filter(i => i.type === 'ritual').map(i => ({
          id: i.id,
          name: (i.value as any)?.name || '',
          frequency: (i.value as any)?.frequency || 'daily',
          description: (i.value as any)?.description || '',
          source: 'ai',
          createdAt: now,
        })),
        updatedAt: now,
      };

    case 'communication_rhythm':
      return {
        rhythms: items.filter(i => i.type === 'card').map(i => ({
          id: i.id,
          name: (i.value as any)?.name || '',
          frequency: (i.value as any)?.frequency || 'weekly',
          description: (i.value as any)?.description || '',
          source: 'ai',
          createdAt: now,
        })),
        updatedAt: now,
      };

    default:
      // Filter out any undefined values from items before saving
      const cleanItems = items.map(item => ({
        id: item.id,
        type: item.type,
        label: item.label || '',
        value: item.value || '',
      }));
      return { items: cleanItems, updatedAt: now };
  }
}

// Generate demo fallback content for demo mode (skips API call)
function generateDemoFallbackContent(sectionId: HouseholdSectionId, answers: Record<string, any>): ContentItem[] {
  const now = Date.now();

  switch (sectionId) {
    case 'home_charter':
      return [
        {
          id: `demo-mission-${now}`,
          type: 'string',
          label: 'Mission',
          value: answers.family_values || 'To create a home filled with kindness, curiosity, and perseverance where every family member feels valued and supported.',
        },
        {
          id: `demo-nn-1-${now}`,
          type: 'non-negotiable',
          label: 'Non-Negotiable',
          value: 'We speak to each other with respect, even when frustrated.',
        },
        {
          id: `demo-nn-2-${now}`,
          type: 'non-negotiable',
          label: 'Non-Negotiable',
          value: 'Everyone contributes to household responsibilities.',
        },
        {
          id: `demo-nn-3-${now}`,
          type: 'non-negotiable',
          label: 'Non-Negotiable',
          value: 'We make time for family connection every day.',
        },
        {
          id: `demo-values-${now}`,
          type: 'string',
          label: 'Core Values',
          value: ['Kindness', 'Curiosity', 'Perseverance'],
        },
        {
          id: `demo-feelings-${now}`,
          type: 'string',
          label: 'Desired Feelings',
          value: ['Safe', 'Connected', 'Supported', 'Joyful'],
        },
      ];

    case 'sanctuary_map':
      return [
        {
          id: `demo-zone-1-${now}`,
          type: 'zone',
          label: 'Calm Zone',
          value: {
            name: 'Reading Nook',
            purpose: 'Quiet reflection and decompression',
            location: 'Living room corner',
          },
        },
        {
          id: `demo-zone-2-${now}`,
          type: 'zone',
          label: 'Activity Zone',
          value: {
            name: 'Play Area',
            purpose: 'Active play and creativity',
            location: 'Family room',
          },
        },
      ];

    case 'village_wiki':
      return [
        {
          id: `demo-contact-1-${now}`,
          type: 'contact',
          label: 'Emergency Contact',
          value: {
            name: 'Grandma Smith',
            role: 'Emergency backup',
            phone: '(555) 123-4567',
          },
        },
        {
          id: `demo-contact-2-${now}`,
          type: 'contact',
          label: 'Support Contact',
          value: {
            name: 'Neighbor Jane',
            role: 'Backup pickup',
            phone: '(555) 987-6543',
          },
        },
      ];

    case 'roles_rituals':
      return [
        {
          id: `demo-ritual-1-${now}`,
          type: 'ritual',
          label: 'Morning Ritual',
          value: {
            name: 'Morning Huddle',
            frequency: 'daily',
            description: 'Quick family check-in before starting the day',
          },
        },
        {
          id: `demo-ritual-2-${now}`,
          type: 'ritual',
          label: 'Evening Ritual',
          value: {
            name: 'Gratitude Circle',
            frequency: 'daily',
            description: 'Share one thing we\'re grateful for at dinner',
          },
        },
      ];

    case 'communication_rhythm':
      return [
        {
          id: `demo-rhythm-1-${now}`,
          type: 'card',
          label: 'Weekly Check-in',
          value: {
            name: 'Sunday Planning',
            frequency: 'weekly',
            description: 'Review the week ahead and assign tasks',
          },
        },
      ];

    default:
      return [
        {
          id: `demo-default-${now}`,
          type: 'string',
          label: 'Demo Content',
          value: 'This is demo content for the ' + sectionId + ' section.',
        },
      ];
  }
}
