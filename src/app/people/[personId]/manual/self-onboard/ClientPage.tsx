'use client';

import { use, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AssessmentShell from '@/components/shared/AssessmentShell';
import { useAuth } from '@/context/AuthContext';
import { usePersonById } from '@/hooks/usePerson';
import { usePersonManual } from '@/hooks/usePersonManual';
import { useContribution } from '@/hooks/useContribution';
import { getSelfOnboardingSections } from '@/config/self-questions';
import { OnboardingSection } from '@/config/onboarding-questions';
import { QuestionAnswer } from '@/types/onboarding';
import { QuestionRenderer } from '@/components/onboarding/QuestionRenderer';
import { getDemoAnswer } from '@/config/demo-answers';
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

export function SelfOnboardPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isDemo = useMemo(() => {
    if (user?.isDemo) return true;
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('demo') === 'true';
    return false;
  }, [user?.isDemo]);
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
  const [previousAnswers, setPreviousAnswers] = useState<Record<string, any> | null>(null);

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

  // Route guard: this page is for adults filling out their OWN
  // self-perspective. Children belong on /kid-session — even if their
  // DOB isn't recorded, since `relationshipType === 'child'` is
  // enough to know they don't belong here. Anyone else who explicitly
  // can't self-contribute gets bounced back to the manual view.
  useEffect(() => {
    if (personLoading || !person) return;
    if (person.relationshipType === 'child') {
      router.replace(`/people/${personId}/manual/kid-session`);
      return;
    }
    if (person.canSelfContribute === false) {
      router.replace(`/people/${personId}/manual`);
    }
  }, [person, personLoading, personId, router]);

  // Load existing draft from Firestore on mount
  useEffect(() => {
    if (!manual || !user || draftLoaded) return;

    (async () => {
      // Scope to relationshipToSubject='self' so we don't accidentally
      // match a child-session draft (same perspectiveType, different
      // relationshipToSubject) living on the same manual.
      const draft = await findDraft(manual.manualId, 'self', 'self');
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
        if (data.answers) {
          setAnswers(data.answers);
          // Snapshot current answers for revision history
          setPreviousAnswers(JSON.parse(JSON.stringify(data.answers)));
        }
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
      await completeDraft(id, manual.manualId, previousAnswers ?? undefined);
      setIsComplete(true);

      // Trigger dimension assessment scoring in the background
      try {
        const seedAssessments = httpsCallable(functions, 'seedDimensionAssessments');
        await seedAssessments({});
      } catch (assessErr) {
        console.warn('Assessment scoring after onboarding failed (non-critical):', assessErr);
      }
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
    router.push('/dashboard');
  };

  const handleFillAll = useCallback(() => {
    const filled: Record<string, Record<string, QuestionAnswer>> = { ...answers };
    for (const section of sections) {
      if (!filled[section.sectionId]) filled[section.sectionId] = {};
      for (const q of section.questions) {
        const demo = getDemoAnswer(q.id, 'self');
        if (demo !== undefined) {
          filled[section.sectionId][q.id] = demo;
        }
      }
    }
    setAnswers(filled);
    setSaveStatus('unsaved');
  }, [answers, sections]);

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
        router.push('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, personId, router]);

  // --- Loading ---
  if (authLoading || personLoading || manualLoading || !draftLoaded) {
    return (
      <div className="relish-page">
        <div className="press-loading">Opening your volume&hellip;</div>
      </div>
    );
  }

  if (!user || !person || !manual) {
    return (
      <div className="relish-page">
        <div className="press-loading">Unable to open the volume.</div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 560 }}>
            <div className="press-empty" style={{ padding: '80px 20px' }}>
              <span className="press-chapter-label" style={{ display: 'block', textAlign: 'center' }}>
                Kept
              </span>
              <h2 className="press-empty-title mt-4" style={{ fontSize: 31 }}>
                Your perspective is saved.
              </h2>
              <p className="press-empty-body">
                Returning to your volume&hellip;
              </p>
              <div className="press-fleuron" style={{ fontSize: 17 }}>❦</div>
            </div>
          </div>
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
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 680 }}>

            {/* Running header */}
            <div className="press-running-header" style={{ paddingTop: 28 }}>
              <span>{person?.name ? `${person.name}'s volume` : 'Your volume'}</span>
              <span className="sep">·</span>
              <span>Your own perspective</span>
            </div>

            {/* Back link */}
            <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 12 }}>
              <button
                onClick={() => router.push(`/people/${personId}/manual`)}
                className="press-link-sm"
                style={{ background: 'transparent', cursor: 'pointer' }}
              >
                ⟵ Return to the volume
              </button>
            </div>

            {/* Title */}
            <div className="press-binder-head">
              <span className="press-chapter-label">Your own words</span>
              <h1 className="press-binder-title mt-2">
                How would you like to begin?
              </h1>
              <p className="press-binder-sub">
                Two ways to bring your perspective into the volume.
              </p>
            </div>

            <hr className="press-rule-short" style={{ margin: '0 auto 20px' }} />

            {/* Two options as chapter entries */}
            <div style={{ padding: '20px 48px 32px' }}>
              {/* Upload documents option */}
              <button
                onClick={() => setMode('upload')}
                className="w-full text-left py-6"
                style={{
                  background: 'transparent',
                  border: 0,
                  borderBottom: '1px solid rgba(200,190,172,0.4)',
                  cursor: 'pointer',
                  transition: 'padding-left 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.paddingLeft = '10px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.paddingLeft = '0'; }}
              >
                <div className="flex items-baseline gap-4">
                  <span className="press-chapter-label" style={{ width: 30, flexShrink: 0 }}>1.</span>
                  <div className="flex-1">
                    <h3
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: 20,
                        fontStyle: 'italic',
                        fontWeight: 500,
                        color: '#3A3530',
                        lineHeight: 1.2,
                        margin: 0,
                      }}
                    >
                      {hasExistingAnswers ? 'Add more from your documents' : 'Upload your own documents'}
                    </h3>
                    <p className="press-marginalia mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {hasExistingAnswers
                        ? 'Bring therapy notes, journal entries, or letters. The system reads them and fills in what\'s missing — your answers stay as they are.'
                        : 'Bring therapy notes, journal entries, or letters. The system reads them and drafts answers for you to review before keeping.'}
                    </p>
                    <p className="press-marginalia mt-1" style={{ fontSize: 13, color: '#7A6E5C' }}>
                      PDF, text, or images · read in passing, never stored
                    </p>
                  </div>
                  <span style={{ color: '#6B6254', fontSize: 15 }}>⟶</span>
                </div>
              </button>

              {/* Answer directly option */}
              <button
                onClick={() => setMode('questionnaire')}
                className="w-full text-left py-6"
                style={{
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  transition: 'padding-left 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.paddingLeft = '10px'; }}
                onMouseLeave={(e) => { e.currentTarget.style.paddingLeft = '0'; }}
              >
                <div className="flex items-baseline gap-4">
                  <span className="press-chapter-label" style={{ width: 30, flexShrink: 0 }}>2.</span>
                  <div className="flex-1">
                    <h3
                      style={{
                        fontFamily: 'var(--font-parent-display)',
                        fontSize: 20,
                        fontStyle: 'italic',
                        fontWeight: 500,
                        color: '#3A3530',
                        lineHeight: 1.2,
                        margin: 0,
                      }}
                    >
                      {hasExistingAnswers ? 'Continue answering by hand' : 'Answer by hand, at your own pace'}
                    </h3>
                    <p className="press-marginalia mt-2" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {hasExistingAnswers
                        ? 'Pick up where you left off. Each answer is saved the moment you keep it.'
                        : 'A handful of questions, thought through at your own pace. Autosaved as you go.'}
                    </p>
                    <p className="press-marginalia mt-1" style={{ fontSize: 13, color: '#7A6E5C' }}>
                      sixteen questions · about ten minutes
                    </p>
                  </div>
                  <span style={{ color: '#2D5F5D', fontSize: 15 }}>⟶</span>
                </div>
              </button>
            </div>

            <div className="press-fleuron">❦</div>
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
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 680 }}>
            <div className="press-running-header" style={{ paddingTop: 28 }}>
              <span>Your own perspective</span>
              <span className="sep">·</span>
              <span>From documents</span>
            </div>

            <div style={{ textAlign: 'center', paddingTop: 14, paddingBottom: 12 }}>
              <button
                onClick={() => setMode('choose')}
                className="press-link-sm"
                style={{ background: 'transparent', cursor: 'pointer' }}
              >
                ⟵ Choose a different way
              </button>
            </div>

            <div className="press-binder-head">
              <span className="press-chapter-label">From documents</span>
              <h1 className="press-binder-title mt-2" style={{ fontSize: 'clamp(36px, 5vw, 48px)' }}>
                Bring your own words
              </h1>
              <p className="press-binder-sub">
                The system will read what you share and draft answers
                for you to keep, revise, or discard.
              </p>
            </div>

            <hr className="press-rule-short" style={{ margin: '0 auto 28px' }} />

            {processingError && (
              <div style={{ padding: '0 48px 20px' }}>
                <p
                  className="press-marginalia"
                  style={{
                    fontSize: 13,
                    color: '#C08070',
                    padding: '14px 18px',
                    borderLeft: '2px solid rgba(192,128,112,0.5)',
                    background: 'rgba(192,128,112,0.05)',
                  }}
                >
                  — {processingError}
                </p>
              </div>
            )}

            <div style={{ padding: '0 48px 40px' }}>
              <DocumentUploader onProcess={handleDocumentProcess} processing={false} />
            </div>

            <div className="press-fleuron">❦</div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // MODE: PROCESSING
  // ==============================================
  if (mode === 'processing') {
    return (
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
          <div className="press-binder" style={{ maxWidth: 560 }}>
            <div className="press-empty" style={{ padding: '100px 20px' }}>
              <span className="press-chapter-label" style={{ display: 'block', textAlign: 'center' }}>
                Reading
              </span>
              <h2 className="press-empty-title mt-4" style={{ fontSize: 31 }}>
                Reading your documents
              </h2>
              <p className="press-empty-body" style={{ fontStyle: 'italic' }}>
                {PROCESSING_MESSAGES[processingMessageIndex]}
              </p>
              <p className="press-marginalia" style={{ fontSize: 13, color: '#7A6E5C', maxWidth: 320, margin: '20px auto 0' }}>
                Read in passing and discarded immediately after. This
                may take up to a minute.
              </p>
              <div className="press-fleuron mt-10" style={{ fontSize: 17 }}>❦</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // MODE: CONFLICTS (conflict resolution)
  // ==============================================
  if (mode === 'conflicts') {
    const conflictBtnStyle = { fontFamily: 'var(--font-parent-body)', fontSize: '19px', fontWeight: 500 } as const;
    return (
      <div className="relish-page">
        <div className="pt-[64px] pb-24">
        <div className="press-binder" style={{ maxWidth: 820 }}>
          <div className="press-running-header" style={{ paddingTop: 28 }}>
            <span>Your own perspective</span>
            <span className="sep">·</span>
            <span>Two readings to reconcile</span>
          </div>

          <div className="press-binder-head">
            <span className="press-chapter-label">Review</span>
            <h1 className="press-binder-title mt-2" style={{ fontSize: 'clamp(36px, 5vw, 46px)' }}>
              Some answers already exist
            </h1>
            <p className="press-binder-sub">
              For each question below, choose which version to keep —
              what you wrote, or what was drawn from your documents.
            </p>
          </div>

          <hr className="press-rule-short" style={{ margin: '0 auto 28px' }} />

          <div style={{ padding: '0 48px' }}>

          <div className="space-y-8">
            {conflicts.map((conflict) => {
              const key = `${conflict.sectionId}:${conflict.questionId}`;
              const resolution = conflictResolutions[key];

              return (
                <div key={key} className="glass-card-strong p-6" style={{ border: '1px solid rgba(255,255,255,0.4)' }}>
                  <h3 style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', fontWeight: 600, color: '#3A3530', marginBottom: '16px' }}>
                    {conflict.questionText}
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.4)' }}>
                      <div style={{ ...conflictBtnStyle, color: '#5F564B', marginBottom: '8px' }}>
                        YOUR CURRENT ANSWER
                      </div>
                      <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5C5347' }}>
                        {conflict.manualAnswer}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(124,144,130,0.08)', border: '1px solid rgba(124,144,130,0.2)' }}>
                      <div style={{ ...conflictBtnStyle, color: '#7C9082', marginBottom: '8px' }}>
                        EXTRACTED FROM DOCUMENTS
                      </div>
                      <p style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5C5347' }}>
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
                      className="px-4 py-2 rounded-full transition-all"
                      style={{
                        ...conflictBtnStyle,
                        backgroundColor: resolution?.resolution === 'keep' ? '#3A3530' : 'rgba(255,255,255,0.3)',
                        color: resolution?.resolution === 'keep' ? 'white' : '#5C5347',
                        border: resolution?.resolution === 'keep' ? '1px solid #3A3530' : '1px solid rgba(255,255,255,0.4)',
                      }}
                    >
                      Keep mine
                    </button>
                    <button
                      onClick={() =>
                        setConflictResolutions((prev) => ({
                          ...prev,
                          [key]: { resolution: 'extracted', value: conflict.aiAnswer },
                        }))
                      }
                      className="px-4 py-2 rounded-full transition-all"
                      style={{
                        ...conflictBtnStyle,
                        backgroundColor: resolution?.resolution === 'extracted' ? '#7C9082' : 'rgba(255,255,255,0.3)',
                        color: resolution?.resolution === 'extracted' ? 'white' : '#5C5347',
                        border: resolution?.resolution === 'extracted' ? '1px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                      }}
                    >
                      Use extracted
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
                      className="px-4 py-2 rounded-full transition-all"
                      style={{
                        ...conflictBtnStyle,
                        backgroundColor: resolution?.resolution === 'merge' ? '#7C9082' : 'rgba(255,255,255,0.3)',
                        color: resolution?.resolution === 'merge' ? 'white' : '#5C5347',
                        border: resolution?.resolution === 'merge' ? '1px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                      }}
                    >
                      Merge both
                    </button>
                    <button
                      onClick={() =>
                        setConflictResolutions((prev) => ({
                          ...prev,
                          [key]: { resolution: 'custom', value: '' },
                        }))
                      }
                      className="px-4 py-2 rounded-full transition-all"
                      style={{
                        ...conflictBtnStyle,
                        backgroundColor: resolution?.resolution === 'custom' ? '#7C9082' : 'rgba(255,255,255,0.3)',
                        color: resolution?.resolution === 'custom' ? 'white' : '#5C5347',
                        border: resolution?.resolution === 'custom' ? '1px solid #7C9082' : '1px solid rgba(255,255,255,0.4)',
                      }}
                    >
                      Write my own
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
                      className="w-full px-4 py-3 rounded-lg focus:outline-none transition-colors"
                      style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#5C5347', border: '1px solid rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.4)', resize: 'vertical' }}
                    />
                  )}

                  {/* Resolution indicator */}
                  {resolution && (
                    <div className="mt-2 text-xs" style={{ fontFamily: 'var(--font-parent-body)', color: '#7C9082' }}>
                      &#10003; Resolved
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          </div>

          {/* Apply button row */}
          <hr className="press-rule" style={{ marginTop: 32, marginBottom: 24 }} />
          <div style={{ padding: '0 48px 40px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <button
              onClick={() => setMode('choose')}
              className="press-link-sm"
              style={{ background: 'transparent', cursor: 'pointer' }}
            >
              ⟵ Back
            </button>
            <button
              onClick={applyConflictResolutions}
              disabled={!allConflictsResolved}
              className="press-link"
              style={{
                background: 'transparent',
                cursor: allConflictsResolved ? 'pointer' : 'not-allowed',
                opacity: allConflictsResolved ? 1 : 0.4,
              }}
            >
              {allConflictsResolved
                ? 'Apply and continue'
                : `Resolve all (${Object.keys(conflictResolutions).length}/${conflicts.length})`}
              {allConflictsResolved && <span className="arrow">⟶</span>}
            </button>
          </div>

          <div className="press-fleuron">❦</div>
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

  const demoBanner = isDemo ? (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '12px 18px',
        borderLeft: '2px solid rgba(124,144,130,0.5)',
        background: 'rgba(124,144,130,0.05)',
      }}
    >
      <p className="press-marginalia" style={{ fontSize: 13 }}>
        <span className="press-sc" style={{ fontSize: 13 }}>DEMO</span> &nbsp;
        Answering as{' '}
        <strong style={{ color: '#3A3530', fontStyle: 'normal', fontWeight: 500 }}>{user.name}</strong>
        {' '}· about{' '}
        <strong style={{ color: '#2D5F5D', fontStyle: 'normal', fontWeight: 500 }}>yourself</strong>
      </p>
      <button
        type="button"
        onClick={handleFillAll}
        className="press-link-sm"
        style={{ background: 'transparent', cursor: 'pointer' }}
      >
        Fill all ⟶
      </button>
    </div>
  ) : null;

  const navigation = (
    <div
      className="flex items-baseline justify-between mt-10 pt-6"
      style={{ borderTop: '1px solid rgba(200,190,172,0.4)' }}
    >
      <div className="flex items-baseline gap-6">
        {(currentSectionIndex > 0 || currentQuestionIndex > 0) && (
          <button
            onClick={handlePrevious}
            className="press-link-sm"
            style={{ background: 'transparent', cursor: 'pointer' }}
          >
            ⟵ Previous
          </button>
        )}
        {(currentSectionIndex > 0 || currentQuestionIndex > 0) && (
          <button
            onClick={() => { setCurrentSectionIndex(0); setCurrentQuestionIndex(0); }}
            className="press-marginalia"
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              fontSize: 13,
              color: '#7A6E5C',
            }}
          >
            back to the first page
          </button>
        )}
      </div>
      <button
        onClick={handleNext}
        disabled={isSubmitting}
        className="press-link"
        style={{
          background: 'transparent',
          cursor: isSubmitting ? 'wait' : 'pointer',
          opacity: isSubmitting ? 0.5 : 1,
          fontSize: 17,
        }}
      >
        {isSubmitting
          ? 'Saving…'
          : isLastQuestion
          ? 'Complete the chapter'
          : 'Next'}
        {!isSubmitting && <span className="arrow">⟶</span>}
      </button>
    </div>
  );

  const aiIndicator = isAiGenerated ? (
    <div
      className="mb-5"
      style={{
        padding: '12px 18px',
        borderLeft: '2px solid rgba(124,144,130,0.5)',
        background: 'rgba(124,144,130,0.05)',
      }}
    >
      <p className="press-marginalia" style={{ fontSize: 14 }}>
        — this answer was drafted from your documents. Review and revise as you wish.
      </p>
    </div>
  ) : null;

  return (
    <AssessmentShell
      phase="assess"
      personName={user.name}
      sectionName={currentSection.sectionName}
      sectionDescription={currentSection.sectionDescription}
      flowLabel={`${person?.name ? person.name.toUpperCase() + '\u2019S MANUAL' : 'SELF-ONBOARDING'}`}
      flowTitle="Your Own Perspective"
      accentColor="amber"
      currentSection={currentSectionIndex}
      totalSections={sections.length}
      currentQuestion={currentQuestionIndex}
      totalQuestions={totalQuestions}
      answeredQuestions={answeredQuestions}
      saveStatus={saveStatus}
      onSaveAndExit={handleSaveAndExit}
      canSkip={!!currentSection.skippable}
      onSkipSection={() => {
        if (currentSectionIndex < sections.length - 1) {
          setCurrentSectionIndex((i) => i + 1);
          setCurrentQuestionIndex(0);
        } else {
          handleSubmit();
        }
      }}
      firstQuestionHint="Keep it brief — this is a living document, not a test. You can come back anytime to expand, edit, or add new thoughts. Your progress saves automatically."
      demoBannerSlot={demoBanner}
      navigationSlot={navigation}
    >
      <div>
        {aiIndicator}

        <h2
          className="press-display-md"
          style={{ fontSize: 'clamp(26px, 3vw, 32px)', marginBottom: 12, lineHeight: 1.2 }}
        >
          {currentQuestion.question}
        </h2>
        {currentQuestion.helperText && (
          <p
            className="press-body-italic"
            style={{ fontSize: 14, marginBottom: 28, color: '#5F564B' }}
          >
            {currentQuestion.helperText}
          </p>
        )}

        <QuestionRenderer
          question={currentQuestion}
          value={currentAnswer}
          onChange={(value) => handleAnswer(currentQuestion.id, value)}
          personName={user.name}
          onKeyboardContinue={handleNext}
          isDemo={isDemo}
          demoPerspective="self"
        />

        {/* Visibility toggle */}
        {currentAnswer && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.3)' }}>
            <button
              onClick={() => toggleVisibility(currentSection.sectionId, currentQuestion.id)}
              className="flex items-center gap-2 text-xs transition-colors group"
              style={{ fontFamily: 'var(--font-parent-body)' }}
            >
              {currentVisibility === 'visible' ? (
                <>
                  <span style={{ color: '#6B6254' }}>&#128065;</span>
                  <span style={{ color: '#5F564B' }}>
                    Visible to family
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#7C9082' }}>&#128274;</span>
                  <span style={{ color: '#7C9082', fontWeight: 600 }}>
                    Private to me only
                  </span>
                </>
              )}
            </button>
            {currentVisibility === 'private' && (
              <p className="mt-1 ml-6" style={{ fontFamily: 'var(--font-parent-body)', fontSize: '19px', color: '#6B6254' }}>
                This answer won't appear in your manual or be shared with anyone.
              </p>
            )}
          </div>
        )}
      </div>
    </AssessmentShell>
  );
}
