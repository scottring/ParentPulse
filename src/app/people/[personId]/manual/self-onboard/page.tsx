'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { progressColor } from '@/utils/progress-color';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { getSelfOnboardingSections } from '@/config/self-questions';
import { OnboardingSection } from '@/config/onboarding-questions';
import { QuestionAnswer } from '@/types/onboarding';
import { QuestionRenderer } from '@/components/onboarding/QuestionRenderer';
import { DocumentUploader } from '@/components/onboarding/DocumentUploader';
import { TopicCategory } from '@/types/person-manual';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

// --- Types for document upload flow ---
type PageMode = 'choose' | 'upload' | 'processing' | 'conflicts' | 'questionnaire';

interface AnswerConflict {
  sectionId: string;
  questionId: string;
  questionText: string;
  manualAnswer: string;
  aiAnswer: string;
}

type ConflictResolution = 'keep' | 'extracted' | 'merge' | 'custom';

interface ResolvedConflict {
  resolution: ConflictResolution;
  value: string;
}

// --- Processing status messages ---
const PROCESSING_MESSAGES = [
  'Reading your documents...',
  'Extracting insights...',
  'Mapping to questions...',
  'Preparing your draft...',
];

export default function SelfOnboardPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { person, loading: personLoading } = usePersonById(personId);
  const { manual, loading: manualLoading } = usePersonManual(personId);
  const { saveDraft, completeDraft, findDraft } = useContribution();

  const [sections] = useState<OnboardingSection[]>(getSelfOnboardingSections());
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, QuestionAnswer>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');

  // --- Document upload state ---
  const [mode, setMode] = useState<PageMode>('choose');
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // --- Conflict resolution state ---
  const [conflicts, setConflicts] = useState<AnswerConflict[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, ResolvedConflict>>({});
  const [pendingMergedAnswers, setPendingMergedAnswers] = useState<Record<string, Record<string, QuestionAnswer>>>({});
  const [pendingAiFields, setPendingAiFields] = useState<Record<string, string[]>>({});
  const [pendingSensitiveFields, setPendingSensitiveFields] = useState<Array<{ sectionId: string; questionId: string }>>([]);

  // --- Per-answer visibility state ---
  const [answerVisibility, setAnswerVisibility] = useState<Record<string, Record<string, 'visible' | 'private'>>>({});
  const [aiGeneratedFields, setAiGeneratedFields] = useState<Record<string, string[]>>({});

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef(answers);
  const sectionIndexRef = useRef(currentSectionIndex);
  const questionIndexRef = useRef(currentQuestionIndex);
  const visibilityRef = useRef(answerVisibility);
  const aiFieldsRef = useRef(aiGeneratedFields);
  answersRef.current = answers;
  sectionIndexRef.current = currentSectionIndex;
  questionIndexRef.current = currentQuestionIndex;
  visibilityRef.current = answerVisibility;
  aiFieldsRef.current = aiGeneratedFields;

  // Load existing draft from Firestore on mount
  useEffect(() => {
    if (!manual || !user || draftLoaded) return;

    (async () => {
      const draft = await findDraft(manual.manualId, 'self');
      if (draft) {
        setDraftId(draft.contributionId);
        if (draft.answers) setAnswers(draft.answers);
        if (draft.draftProgress) {
          setCurrentSectionIndex(draft.draftProgress.sectionIndex);
          setCurrentQuestionIndex(draft.draftProgress.questionIndex);
        }
        if (draft.answerVisibility) setAnswerVisibility(draft.answerVisibility);
        if (draft.aiGeneratedFields) setAiGeneratedFields(draft.aiGeneratedFields);
        setDraftLoaded(true);
        // Always show the gateway — user can upload docs to augment existing answers or continue directly
        setMode('choose');
        return;
      }

      // No draft — check for a completed contribution to resume from
      const { query: fsQuery, collection: fsCollection, where, getDocs } = await import('firebase/firestore');
      const { firestore } = await import('@/lib/firebase');
      const { PERSON_MANUAL_COLLECTIONS } = await import('@/types/person-manual');
      const q = fsQuery(
        fsCollection(firestore, PERSON_MANUAL_COLLECTIONS.CONTRIBUTIONS),
        where('familyId', '==', user.familyId),
        where('manualId', '==', manual.manualId),
        where('contributorId', '==', user.userId),
        where('perspectiveType', '==', 'self'),
        where('status', '==', 'complete')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0];
        const data = existing.data();
        if (data.answers) setAnswers(data.answers);
        if (data.answerVisibility) setAnswerVisibility(data.answerVisibility);
        setDraftId(existing.id);
        setMode('questionnaire');
      }
      setDraftLoaded(true);
    })();
  }, [manual, user, draftLoaded, findDraft]);

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = Object.values(answers).reduce(
    (sum, sectionAnswers) => sum + Object.keys(sectionAnswers).length,
    0
  );

  // Immediate save
  const saveNow = useCallback(async () => {
    if (!manual || !person) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setSaveStatus('saving');
    try {
      const id = await saveDraft({
        manualId: manual.manualId,
        personId: person.personId,
        perspectiveType: 'self',
        relationshipToSubject: 'self',
        answers: answersRef.current,
        sectionIndex: sectionIndexRef.current,
        questionIndex: questionIndexRef.current,
        answerVisibility: visibilityRef.current,
        aiGeneratedFields: aiFieldsRef.current,
      });
      setDraftId(id);
      setSaveStatus('saved');
      return id;
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      return null;
    }
  }, [manual, person, saveDraft]);

  // Debounced save
  const triggerDebouncedSave = useCallback(() => {
    if (!manual || !person) return;
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNow();
    }, 1500);
  }, [manual, person, saveNow]);

  // Auto-save when answers or visibility change
  useEffect(() => {
    if (mode === 'questionnaire' && answeredQuestions > 0 && draftLoaded) {
      triggerDebouncedSave();
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [answers, answerVisibility, answeredQuestions, draftLoaded, mode, triggerDebouncedSave]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Rotate processing messages
  useEffect(() => {
    if (mode !== 'processing') return;
    const interval = setInterval(() => {
      setProcessingMessageIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleAnswer = useCallback((questionId: string, value: QuestionAnswer) => {
    setAnswers((prev) => ({
      ...prev,
      [currentSection.sectionId]: {
        ...prev[currentSection.sectionId],
        [questionId]: value,
      },
    }));
    // Clear AI-generated indicator when user edits
    setAiGeneratedFields((prev) => {
      const sectionFields = prev[currentSection.sectionId];
      if (!sectionFields?.includes(questionId)) return prev;
      const updated = sectionFields.filter((id) => id !== questionId);
      if (updated.length === 0) {
        const { [currentSection.sectionId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [currentSection.sectionId]: updated };
    });
  }, [currentSection?.sectionId]);

  const handleNext = useCallback(() => {
    if (!currentSection) return;
    saveNow();

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
  }, [currentQuestionIndex, currentSectionIndex, currentSection, sections.length, saveNow]);

  const handlePrevious = useCallback(() => {
    saveNow();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((i) => i - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentSectionIndex((i) => i - 1);
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  }, [currentQuestionIndex, currentSectionIndex, sections, saveNow]);

  const handleSubmit = async () => {
    if (!user || !manual || !person) return;
    setIsSubmitting(true);
    try {
      const id = await saveNow();
      if (!id) throw new Error('Save failed before completion');
      await completeDraft(id, manual.manualId);
      setIsComplete(true);
    } catch (err) {
      console.error('Failed to save self-onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (manual && person && answeredQuestions > 0) {
      await saveNow();
    }
    router.push(`/people/${personId}/manual`);
  };

  // Toggle answer visibility
  const toggleVisibility = useCallback((sectionId: string, questionId: string) => {
    setAnswerVisibility((prev) => {
      const current = prev[sectionId]?.[questionId] || 'visible';
      const next = current === 'visible' ? 'private' : 'visible';
      return {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [questionId]: next,
        },
      };
    });
  }, []);

  // --- Document upload processing ---
  const handleDocumentProcess = useCallback(async (
    files: Array<{ name: string; mimeType: string; base64Data: string }>
  ) => {
    if (!person) return;
    setMode('processing');
    setProcessingError(null);
    setProcessingMessageIndex(0);

    try {
      const extractFn = httpsCallable(functions, 'extractDraftFromDocuments');
      const result = await extractFn({
        personId: person.personId,
        personName: person.name,
        files,
      });

      const data = result.data as {
        success: boolean;
        answers: Record<string, Record<string, string | null>>;
        populatedFields: Record<string, string[]>;
        sensitiveFields: Array<{ sectionId: string; questionId: string }>;
      };

      if (!data.success) {
        throw new Error('Extraction failed');
      }

      // Build clean AI answers (strip nulls)
      const aiAnswers: Record<string, Record<string, string>> = {};
      for (const [sectionId, sectionAnswers] of Object.entries(data.answers)) {
        for (const [qId, answer] of Object.entries(sectionAnswers)) {
          if (answer !== null && answer !== undefined) {
            if (!aiAnswers[sectionId]) aiAnswers[sectionId] = {};
            aiAnswers[sectionId][qId] = answer;
          }
        }
      }

      // Detect conflicts: fields where both manual and AI answers exist
      const detectedConflicts: AnswerConflict[] = [];
      const merged: Record<string, Record<string, QuestionAnswer>> = {};
      const newAiFields: Record<string, string[]> = {};

      // Deep copy existing answers
      for (const [sid, sa] of Object.entries(answers)) {
        merged[sid] = { ...sa };
      }

      for (const [sectionId, sectionAiAnswers] of Object.entries(aiAnswers)) {
        if (!merged[sectionId]) merged[sectionId] = {};
        if (!newAiFields[sectionId]) newAiFields[sectionId] = [];

        for (const [qId, aiAnswer] of Object.entries(sectionAiAnswers)) {
          const existingAnswer = answers[sectionId]?.[qId];
          const existingStr = typeof existingAnswer === 'string' ? existingAnswer : '';

          if (existingStr.trim()) {
            // Conflict — both exist
            const question = sections
              .find((s) => s.sectionId === sectionId)
              ?.questions.find((q) => q.id === qId);
            detectedConflicts.push({
              sectionId,
              questionId: qId,
              questionText: question?.question || qId,
              manualAnswer: existingStr,
              aiAnswer,
            });
          } else {
            // No conflict — AI fills blank field
            merged[sectionId][qId] = aiAnswer;
            newAiFields[sectionId].push(qId);
          }
        }
      }

      // Clean empty arrays from newAiFields
      for (const key of Object.keys(newAiFields)) {
        if (newAiFields[key].length === 0) delete newAiFields[key];
      }

      if (detectedConflicts.length > 0) {
        // Show conflict resolution screen
        setConflicts(detectedConflicts);
        setConflictResolutions({});
        setPendingMergedAnswers(merged);
        setPendingAiFields(newAiFields);
        setPendingSensitiveFields(data.sensitiveFields);
        setMode('conflicts');
      } else {
        // No conflicts — apply directly
        setAnswers(merged);
        setAiGeneratedFields((prev) => {
          const combined = { ...prev };
          for (const [sid, fields] of Object.entries(newAiFields)) {
            combined[sid] = [...(combined[sid] || []), ...fields];
          }
          return combined;
        });
        // Auto-set sensitive fields to private
        setAnswerVisibility((prev) => {
          const updated = { ...prev };
          for (const { sectionId, questionId } of data.sensitiveFields) {
            if (!updated[sectionId]) updated[sectionId] = {};
            updated[sectionId][questionId] = 'private';
          }
          return updated;
        });
        setCurrentSectionIndex(0);
        setCurrentQuestionIndex(0);
        setMode('questionnaire');
      }
    } catch (err: any) {
      console.error('Document processing failed:', err);
      setProcessingError(err.message || 'Something went wrong. Please try again.');
      setMode('upload');
    }
  }, [person, answers, sections]);

  // Apply conflict resolutions and enter questionnaire
  const applyConflictResolutions = useCallback(() => {
    const merged = { ...pendingMergedAnswers };
    const aiFields = { ...pendingAiFields };

    for (const conflict of conflicts) {
      const key = `${conflict.sectionId}:${conflict.questionId}`;
      const resolution = conflictResolutions[key];
      if (!resolution) continue;

      if (!merged[conflict.sectionId]) merged[conflict.sectionId] = {};

      switch (resolution.resolution) {
        case 'keep':
          // Keep manual answer — already in merged from deep copy
          break;
        case 'extracted':
          merged[conflict.sectionId][conflict.questionId] = conflict.aiAnswer;
          if (!aiFields[conflict.sectionId]) aiFields[conflict.sectionId] = [];
          aiFields[conflict.sectionId].push(conflict.questionId);
          break;
        case 'merge':
        case 'custom':
          merged[conflict.sectionId][conflict.questionId] = resolution.value;
          break;
      }
    }

    setAnswers(merged);
    setAiGeneratedFields((prev) => {
      const combined = { ...prev };
      for (const [sid, fields] of Object.entries(aiFields)) {
        combined[sid] = [...(combined[sid] || []), ...fields];
      }
      return combined;
    });
    // Auto-set sensitive fields to private
    setAnswerVisibility((prev) => {
      const updated = { ...prev };
      for (const { sectionId, questionId } of pendingSensitiveFields) {
        if (!updated[sectionId]) updated[sectionId] = {};
        updated[sectionId][questionId] = 'private';
      }
      return updated;
    });
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setMode('questionnaire');
  }, [conflicts, conflictResolutions, pendingMergedAnswers, pendingAiFields, pendingSensitiveFields]);

  const allConflictsResolved = conflicts.every(
    (c) => conflictResolutions[`${c.sectionId}:${c.questionId}`]
  );

  // Redirect after completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.push(`/people/${personId}/manual`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, personId, router]);

  // --- Loading ---
  if (authLoading || personLoading || manualLoading || !draftLoaded) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !person || !manual) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <p className="font-mono text-slate-600">Unable to load. Please try again.</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">&#10003;</div>
          <h2 className="font-mono font-bold text-2xl text-slate-800">YOUR PERSPECTIVE IS SAVED</h2>
          <p className="font-mono text-slate-600">Redirecting to your manual...</p>
        </div>
      </div>
    );
  }

  // ==============================================
  // MODE: CHOOSE (gateway)
  // ==============================================
  if (mode === 'choose') {
    const hasExistingAnswers = answeredQuestions > 0;
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <span className="font-mono text-xs text-amber-600 font-bold tracking-wider">
              SELF-ONBOARDING
            </span>
            <h1 className="font-mono font-bold text-2xl text-slate-800 mt-2">
              Tell Us About Yourself
            </h1>
            <p className="font-mono text-sm text-slate-500 mt-2">
              Choose how you'd like to get started
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload documents option */}
            <button
              onClick={() => setMode('upload')}
              className="p-6 border-2 border-slate-200 bg-white text-left hover:border-amber-500 transition-all group"
            >
              <div className="text-2xl mb-3">&#128196;</div>
              <h3 className="font-mono font-bold text-lg text-slate-800 mb-2">
                {hasExistingAnswers ? 'Add More from Documents' : 'Upload Personal Documents'}
              </h3>
              <p className="font-mono text-sm text-slate-500 mb-4">
                {hasExistingAnswers
                  ? 'Upload therapy notes, journal entries, or other documents to fill in remaining questions. Your existing answers are preserved.'
                  : 'Upload therapy notes, journal entries, or other personal documents. AI will extract answers for you to review and edit.'}
              </p>
              <div className="font-mono text-xs text-slate-400">
                PDF, TXT, images &middot; Processed securely, never stored
              </div>
            </button>

            {/* Answer directly option */}
            <button
              onClick={() => setMode('questionnaire')}
              className="p-6 border-2 border-slate-200 bg-white text-left hover:border-amber-500 transition-all group"
            >
              <div className="text-2xl mb-3">&#9997;</div>
              <h3 className="font-mono font-bold text-lg text-slate-800 mb-2">
                {hasExistingAnswers ? 'Continue Answering' : 'Answer Questions Directly'}
              </h3>
              <p className="font-mono text-sm text-slate-500 mb-4">
                {hasExistingAnswers
                  ? 'Pick up where you left off and continue filling in your answers.'
                  : 'Answer each question yourself at your own pace. You can save and return anytime.'}
              </p>
              <div className="font-mono text-xs text-slate-400">
                16 questions &middot; ~10 minutes &middot; Auto-saves
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => router.push(`/people/${personId}/manual`)}
              className="font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              &larr; BACK TO MANUAL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // MODE: UPLOAD
  // ==============================================
  if (mode === 'upload') {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => setMode('choose')}
              className="text-slate-400 hover:text-slate-800 transition-colors"
            >
              <span className="text-xl">&larr;</span>
            </button>
            <div>
              <span className="font-mono text-xs text-amber-600 font-bold tracking-wider">
                UPLOAD DOCUMENTS
              </span>
              <h1 className="font-mono font-bold text-lg text-slate-800">
                Upload Personal Documents
              </h1>
            </div>
          </div>

          {processingError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200">
              <p className="font-mono text-sm text-red-700">{processingError}</p>
            </div>
          )}

          <DocumentUploader onProcess={handleDocumentProcess} processing={false} />
        </div>
      </div>
    );
  }

  // ==============================================
  // MODE: PROCESSING
  // ==============================================
  if (mode === 'processing') {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full mx-auto" />
          <div>
            <h2 className="font-mono font-bold text-xl text-slate-800 mb-2">
              Processing Your Documents
            </h2>
            <p className="font-mono text-sm text-slate-500 animate-pulse">
              {PROCESSING_MESSAGES[processingMessageIndex]}
            </p>
          </div>
          <p className="font-mono text-xs text-slate-400 max-w-md">
            Your documents are being read securely and will be discarded immediately after processing.
            This may take up to a minute.
          </p>
        </div>
      </div>
    );
  }

  // ==============================================
  // MODE: CONFLICTS (conflict resolution)
  // ==============================================
  if (mode === 'conflicts') {
    return (
      <div className="min-h-screen bg-[#FFF8F0]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="mb-8">
            <span className="font-mono text-xs text-amber-600 font-bold tracking-wider">
              REVIEW CONFLICTS
            </span>
            <h1 className="font-mono font-bold text-xl text-slate-800 mt-2">
              Some questions already have answers
            </h1>
            <p className="font-mono text-sm text-slate-500 mt-2">
              For each question below, choose how to handle the overlap between your existing answer
              and what was extracted from your documents.
            </p>
          </div>

          <div className="space-y-8">
            {conflicts.map((conflict) => {
              const key = `${conflict.sectionId}:${conflict.questionId}`;
              const resolution = conflictResolutions[key];

              return (
                <div key={key} className="border-2 border-slate-200 bg-white p-6">
                  <h3 className="font-mono font-bold text-sm text-slate-800 mb-4">
                    {conflict.questionText}
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <div className="p-4 bg-slate-50 border border-slate-200">
                      <div className="font-mono text-xs text-slate-500 font-bold mb-2">
                        YOUR CURRENT ANSWER
                      </div>
                      <p className="font-mono text-sm text-slate-700">
                        {conflict.manualAnswer}
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200">
                      <div className="font-mono text-xs text-amber-600 font-bold mb-2">
                        EXTRACTED FROM DOCUMENTS
                      </div>
                      <p className="font-mono text-sm text-slate-700">
                        {conflict.aiAnswer}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() =>
                        setConflictResolutions((prev) => ({
                          ...prev,
                          [key]: { resolution: 'keep', value: conflict.manualAnswer },
                        }))
                      }
                      className={`px-4 py-2 font-mono text-xs font-bold border-2 transition-all ${
                        resolution?.resolution === 'keep'
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-500'
                      }`}
                    >
                      KEEP MINE
                    </button>
                    <button
                      onClick={() =>
                        setConflictResolutions((prev) => ({
                          ...prev,
                          [key]: { resolution: 'extracted', value: conflict.aiAnswer },
                        }))
                      }
                      className={`px-4 py-2 font-mono text-xs font-bold border-2 transition-all ${
                        resolution?.resolution === 'extracted'
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-amber-400'
                      }`}
                    >
                      USE EXTRACTED
                    </button>
                    <button
                      onClick={() =>
                        setConflictResolutions((prev) => ({
                          ...prev,
                          [key]: {
                            resolution: 'merge',
                            value: `${conflict.manualAnswer}\n\n${conflict.aiAnswer}`,
                          },
                        }))
                      }
                      className={`px-4 py-2 font-mono text-xs font-bold border-2 transition-all ${
                        resolution?.resolution === 'merge'
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      MERGE BOTH
                    </button>
                    <button
                      onClick={() =>
                        setConflictResolutions((prev) => ({
                          ...prev,
                          [key]: { resolution: 'custom', value: '' },
                        }))
                      }
                      className={`px-4 py-2 font-mono text-xs font-bold border-2 transition-all ${
                        resolution?.resolution === 'custom'
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-green-400'
                      }`}
                    >
                      WRITE MY OWN
                    </button>
                  </div>

                  {/* Editable area for merge/custom */}
                  {(resolution?.resolution === 'merge' || resolution?.resolution === 'custom') && (
                    <textarea
                      value={resolution.value}
                      onChange={(e) =>
                        setConflictResolutions((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], value: e.target.value },
                        }))
                      }
                      placeholder={
                        resolution.resolution === 'custom'
                          ? 'Write your own answer...'
                          : 'Edit the merged answer...'
                      }
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-slate-200 font-mono text-sm text-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
                      style={{ resize: 'vertical' }}
                    />
                  )}

                  {/* Resolution indicator */}
                  {resolution && (
                    <div className="mt-2 font-mono text-xs text-green-600">
                      &#10003; Resolved
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Apply button */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => setMode('choose')}
              className="px-6 py-3 border-2 border-slate-300 bg-white font-mono font-bold text-slate-600 hover:border-slate-500 transition-all"
            >
              &larr; BACK
            </button>
            <button
              onClick={applyConflictResolutions}
              disabled={!allConflictsResolved}
              className="flex-1 px-6 py-3 border-2 border-slate-800 bg-slate-800 text-white font-mono font-bold hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allConflictsResolved
                ? 'APPLY & CONTINUE TO REVIEW'
                : `RESOLVE ALL CONFLICTS (${Object.keys(conflictResolutions).length}/${conflicts.length})`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // MODE: QUESTIONNAIRE (existing flow + visibility toggle + AI indicators)
  // ==============================================
  const isLastQuestion =
    currentSectionIndex === sections.length - 1 &&
    currentQuestionIndex === currentSection.questions.length - 1;

  const currentAnswer = answers[currentSection.sectionId]?.[currentQuestion.id];
  const currentVisibility = answerVisibility[currentSection.sectionId]?.[currentQuestion.id] || 'visible';
  const isAiGenerated = aiGeneratedFields[currentSection.sectionId]?.includes(currentQuestion.id);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="border-b-2 border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAndExit}
                className="text-slate-400 hover:text-slate-800 transition-colors"
                title="Back to manual"
              >
                <span className="text-xl">&larr;</span>
              </button>
              <div>
              <span className="font-mono text-xs text-amber-600 font-bold tracking-wider">
                SELF-ONBOARDING
              </span>
              <h1 className="font-mono font-bold text-lg text-slate-800">
                Tell Us About Yourself
              </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-mono text-xs text-slate-500 flex items-center justify-end gap-2">
                  <span>{answeredQuestions} / {totalQuestions} ANSWERED</span>
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    saveStatus === 'saved' ? 'bg-green-500' :
                    saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
                    saveStatus === 'error' ? 'bg-red-500' :
                    'bg-amber-400'
                  }`} title={
                    saveStatus === 'saved' ? 'All changes saved' :
                    saveStatus === 'saving' ? 'Saving...' :
                    saveStatus === 'error' ? 'Save failed — will retry' :
                    'Unsaved changes'
                  } />
                </div>
                <div className="w-32 h-2 bg-slate-200 mt-1">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(answeredQuestions / totalQuestions) * 100}%`,
                      backgroundColor: progressColor(answeredQuestions / totalQuestions),
                    }}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveAndExit}
                className="px-4 py-2 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-600 hover:border-slate-800 hover:text-slate-800 transition-all"
              >
                SAVE &amp; EXIT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section indicator */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-6">
          {sections.map((section, i) => (
            <div
              key={section.sectionId}
              className={`h-1 flex-1 ${
                i <= currentSectionIndex ? 'bg-amber-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-amber-600 font-bold tracking-wider">
          {currentSection.sectionName.toUpperCase()}
        </span>
        <p className="font-mono text-sm text-slate-500 mt-1">
          {currentSection.sectionDescription}
        </p>
        {currentSectionIndex === 0 && currentQuestionIndex === 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200">
            <p className="font-mono text-xs text-amber-800">
              Keep it brief — this is a living document, not a test. You can come back anytime to expand, edit, or add new thoughts. Your progress saves automatically.
            </p>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="border-2 border-slate-200 bg-white p-8">
          {/* AI-generated indicator */}
          {isAiGenerated && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#9679;</span>
              <p className="font-mono text-xs text-amber-700">
                This answer was drafted from your uploaded documents. Review and edit as needed.
              </p>
            </div>
          )}

          {/* Question text */}
          <h2 className="font-mono font-bold text-lg text-slate-800 mb-2">
            {currentQuestion.question}
          </h2>
          {currentQuestion.helperText && (
            <p className="font-mono text-sm text-slate-500 mb-6">
              {currentQuestion.helperText}
            </p>
          )}

          <QuestionRenderer
            question={currentQuestion}
            value={currentAnswer}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
            personName={user.name}
            onKeyboardContinue={handleNext}
          />

          {/* Visibility toggle */}
          {currentAnswer && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => toggleVisibility(currentSection.sectionId, currentQuestion.id)}
                className="flex items-center gap-2 font-mono text-xs transition-colors group"
              >
                {currentVisibility === 'visible' ? (
                  <>
                    <span className="text-slate-400 group-hover:text-slate-600">&#128065;</span>
                    <span className="text-slate-500 group-hover:text-slate-700">
                      Visible to family
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-500">&#128274;</span>
                    <span className="text-amber-600 font-bold">
                      Private to me only
                    </span>
                  </>
                )}
              </button>
              {currentVisibility === 'private' && (
                <p className="font-mono text-xs text-slate-400 mt-1 ml-6">
                  This answer won't appear in your manual or be shared with anyone.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          {(currentSectionIndex > 0 || currentQuestionIndex > 0) && (
            <>
              <button
                onClick={() => { setCurrentSectionIndex(0); setCurrentQuestionIndex(0); }}
                className="px-4 py-3 border-2 border-slate-300 bg-white font-mono text-xs font-bold text-slate-500 hover:border-slate-800 hover:text-slate-700 transition-all"
              >
                &laquo; START
              </button>
              <button
                onClick={handlePrevious}
                className="px-6 py-3 border-2 border-slate-300 bg-white font-mono font-bold text-slate-700 hover:border-slate-800 transition-all"
              >
                &larr; PREVIOUS
              </button>
            </>
          )}
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-6 py-3 border-2 border-slate-800 bg-slate-800 text-white font-mono font-bold hover:bg-slate-700 transition-all disabled:opacity-50 ml-auto"
          >
            {isSubmitting
              ? 'SAVING...'
              : isLastQuestion
              ? 'COMPLETE'
              : 'NEXT \u2192'}
          </button>
        </div>

        {/* Skip section */}
        {currentSection.skippable && currentQuestionIndex === 0 && (
          <button
            onClick={() => {
              if (currentSectionIndex < sections.length - 1) {
                setCurrentSectionIndex((i) => i + 1);
                setCurrentQuestionIndex(0);
              } else {
                handleSubmit();
              }
            }}
            className="mt-4 font-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            SKIP THIS SECTION &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
