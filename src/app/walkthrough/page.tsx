'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { TechnicalButton, TechnicalCard } from '@/components/technical';
import {
  PlayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  TrashIcon,
  EyeIcon,
  SparklesIcon,
  BookOpenIcon,
  UserGroupIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import type { OnboardingProgress, LayerOnboardingStatus } from '@/types/onboarding-progress';
import type { PersonManual } from '@/types/person-manual';
import type { LayerId } from '@/types/assessment';

// ==================== Constants ====================

const WALKTHROUGH_PERSON_ID = 'walkthrough-emma';
const WALKTHROUGH_MANUAL_ID = 'walkthrough-emma-manual';
const WALKTHROUGH_PROGRESS_ID = `progress-${WALKTHROUGH_MANUAL_ID}`;

const DEMO_PERSON_DATA = {
  personId: WALKTHROUGH_PERSON_ID,
  personName: 'Emma',
  relationship: 'child' as const,
  dateOfBirth: Timestamp.fromDate(new Date('2017-03-15')),
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const DEMO_MANUAL_DATA = {
  manualId: WALKTHROUGH_MANUAL_ID,
  personId: WALKTHROUGH_PERSON_ID,
  personName: 'Emma',
  familyId: '', // Will be set from user
  relationshipType: 'child' as const,
  version: 1,
  lastEditedAt: Timestamp.now(),
  lastEditedBy: 'walkthrough-user',
  coreInfo: {
    sensoryNeeds: ['Prefers dim lighting', 'Sensitive to loud noises'],
    interests: ['Drawing', 'Animals', 'Building blocks'],
    strengths: ['Creative', 'Empathetic', 'Curious'],
  },
  triggers: [
    {
      id: 'trig-1',
      description: 'Loud unexpected noises',
      context: 'Especially in crowded places',
      typicalResponse: 'Covers ears, may cry or run away',
      severity: 'significant' as const,
      identifiedDate: Timestamp.now(),
      identifiedBy: 'walkthrough-user',
      confirmedBy: [],
    },
    {
      id: 'trig-2',
      description: 'Hunger combined with tiredness',
      context: 'Usually late afternoon',
      typicalResponse: 'Becomes irritable and oppositional',
      severity: 'moderate' as const,
      identifiedDate: Timestamp.now(),
      identifiedBy: 'walkthrough-user',
      confirmedBy: [],
    },
    {
      id: 'trig-3',
      description: 'Sudden transitions without warning',
      context: 'Moving between activities',
      typicalResponse: 'Protests loudly, may have meltdown',
      severity: 'significant' as const,
      identifiedDate: Timestamp.now(),
      identifiedBy: 'walkthrough-user',
      confirmedBy: [],
    },
  ],
  whatWorks: [
    {
      id: 'strat-1',
      description: '5-minute countdown warnings before transitions',
      context: 'Any time we need to switch activities',
      effectiveness: 5 as const,
      addedDate: Timestamp.now(),
      addedBy: 'walkthrough-user',
      sourceType: 'discovered' as const,
    },
    {
      id: 'strat-2',
      description: 'Quiet corner time when overwhelmed',
      context: 'When showing signs of overstimulation',
      effectiveness: 4 as const,
      addedDate: Timestamp.now(),
      addedBy: 'walkthrough-user',
      sourceType: 'discovered' as const,
    },
  ],
  whatDoesntWork: [
    {
      id: 'avoid-1',
      description: 'Rushing her when she is processing',
      context: 'Transitions or emotional moments',
      effectiveness: 1 as const,
      addedDate: Timestamp.now(),
      addedBy: 'walkthrough-user',
      sourceType: 'discovered' as const,
    },
  ],
  boundaries: [
    {
      id: 'bound-1',
      description: 'Bedtime at 8pm on school nights',
      category: 'immovable' as const,
      context: 'Non-negotiable for sleep health',
      addedDate: Timestamp.now(),
      addedBy: 'walkthrough-user',
    },
  ],
  emergingPatterns: [],
  progressNotes: [],
  totalTriggers: 3,
  totalStrategies: 3,
  totalBoundaries: 1,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

// ==================== Journey Stage Presets ====================

type JourneyStage =
  | 'not_started'
  | 'l6_in_progress'
  | 'l6_complete'
  | 'halfway'
  | 'almost_done'
  | 'ready_to_graduate'
  | 'graduated';

interface StageConfig {
  name: string;
  description: string;
  icon: React.ReactNode;
  completedLayers: LayerId[];
  currentLayer: LayerId;
  overallPercentage: number;
  graduated: boolean;
}

const STAGE_CONFIGS: Record<JourneyStage, StageConfig> = {
  not_started: {
    name: 'Fresh Start',
    description: 'Journey just beginning, no progress yet',
    icon: <PlayIcon className="w-5 h-5" />,
    completedLayers: [],
    currentLayer: 6,
    overallPercentage: 0,
    graduated: false,
  },
  l6_in_progress: {
    name: 'Values In Progress',
    description: 'Working on L6 (Values & Principles)',
    icon: <SparklesIcon className="w-5 h-5" />,
    completedLayers: [],
    currentLayer: 6,
    overallPercentage: 8,
    graduated: false,
  },
  l6_complete: {
    name: 'Foundation Set',
    description: 'L6 complete, starting L5',
    icon: <CheckCircleIcon className="w-5 h-5" />,
    completedLayers: [6],
    currentLayer: 5,
    overallPercentage: 17,
    graduated: false,
  },
  halfway: {
    name: 'Halfway There',
    description: '3 layers complete (L6, L5, L4)',
    icon: <BookOpenIcon className="w-5 h-5" />,
    completedLayers: [6, 5, 4],
    currentLayer: 3,
    overallPercentage: 50,
    graduated: false,
  },
  almost_done: {
    name: 'Almost Done',
    description: '5 layers complete, just L1 remaining',
    icon: <UserGroupIcon className="w-5 h-5" />,
    completedLayers: [6, 5, 4, 3, 2],
    currentLayer: 1,
    overallPercentage: 83,
    graduated: false,
  },
  ready_to_graduate: {
    name: 'Ready to Graduate',
    description: 'All 6 layers complete, graduation available',
    icon: <SparklesIcon className="w-5 h-5" />,
    completedLayers: [6, 5, 4, 3, 2, 1],
    currentLayer: 1,
    overallPercentage: 100,
    graduated: false,
  },
  graduated: {
    name: 'Living Document',
    description: 'Fully graduated, living document mode',
    icon: <CheckCircleIcon className="w-5 h-5" />,
    completedLayers: [6, 5, 4, 3, 2, 1],
    currentLayer: 1,
    overallPercentage: 100,
    graduated: true,
  },
};

// ==================== Helper Functions ====================

function createLayerStatus(
  layerId: LayerId,
  isComplete: boolean,
  isInProgress: boolean
): LayerOnboardingStatus {
  const layerNames: Record<LayerId, string> = {
    1: 'Inputs & Triggers',
    2: 'Processing & Co-Regulation',
    3: 'Memory & Structure',
    4: 'Execution & Strategies',
    5: 'Outputs & Growth',
    6: 'Values & Principles',
  };

  const requiredRespondents = layerId === 1 || layerId === 4
    ? ['parent', 'self'] as const
    : ['parent'] as const;

  if (isComplete) {
    return {
      layerId,
      layerName: layerNames[layerId],
      status: 'complete',
      requiredItems: 3,
      completedItems: 3,
      contentPercentage: 100,
      requiredRespondents: [...requiredRespondents],
      completedRespondents: [...requiredRespondents],
      perspectivePercentage: 100,
      synthesisStatus: 'complete',
      startedAt: Timestamp.now(),
      completedAt: Timestamp.now(),
    };
  }

  if (isInProgress) {
    return {
      layerId,
      layerName: layerNames[layerId],
      status: 'in_progress',
      requiredItems: 3,
      completedItems: 1,
      contentPercentage: 33,
      requiredRespondents: [...requiredRespondents],
      completedRespondents: ['parent'],
      perspectivePercentage: 50,
      synthesisStatus: 'pending',
      startedAt: Timestamp.now(),
    };
  }

  return {
    layerId,
    layerName: layerNames[layerId],
    status: 'not_started',
    requiredItems: 3,
    completedItems: 0,
    contentPercentage: 0,
    requiredRespondents: [...requiredRespondents],
    completedRespondents: [],
    perspectivePercentage: 0,
    synthesisStatus: 'pending',
  };
}

function createProgressForStage(
  stage: JourneyStage,
  familyId: string
): OnboardingProgress {
  const config = STAGE_CONFIGS[stage];
  const layerOrder: LayerId[] = [6, 5, 4, 3, 2, 1];

  const layers: Record<number, LayerOnboardingStatus> = {};
  for (const layerId of layerOrder) {
    const isComplete = config.completedLayers.includes(layerId);
    const isInProgress = !isComplete && layerId === config.currentLayer;
    layers[layerId] = createLayerStatus(layerId, isComplete, isInProgress);
  }

  // Create milestone states based on stage
  const milestones = [
    {
      milestoneId: 'first-layer',
      name: 'Foundation Set',
      description: 'Values layer (L6) complete',
      icon: '🏛️',
      achievedAt: config.completedLayers.includes(6) ? Timestamp.now() : undefined,
      celebrationShown: config.completedLayers.includes(6),
    },
    {
      milestoneId: 'halfway',
      name: 'Halfway There',
      description: '3 of 6 layers complete',
      icon: '🌗',
      achievedAt: config.completedLayers.length >= 3 ? Timestamp.now() : undefined,
      celebrationShown: config.completedLayers.length >= 3,
    },
    {
      milestoneId: 'multi-perspective',
      name: 'Many Eyes',
      description: 'Multiple perspectives collected',
      icon: '👀',
      achievedAt: config.completedLayers.length >= 2 ? Timestamp.now() : undefined,
      celebrationShown: config.completedLayers.length >= 2,
    },
    {
      milestoneId: 'strategies-complete',
      name: 'Toolbox Ready',
      description: 'Strategies layer (L4) complete',
      icon: '🧰',
      achievedAt: config.completedLayers.includes(4) ? Timestamp.now() : undefined,
      celebrationShown: config.completedLayers.includes(4),
    },
    {
      milestoneId: 'triggers-complete',
      name: 'Self-Aware',
      description: 'Triggers layer (L1) complete',
      icon: '🔔',
      achievedAt: config.completedLayers.includes(1) ? Timestamp.now() : undefined,
      celebrationShown: config.completedLayers.includes(1),
    },
    {
      milestoneId: 'graduation',
      name: 'Ready to Breathe',
      description: 'All 6 layers complete',
      icon: '🎉',
      achievedAt: config.graduated ? Timestamp.now() : undefined,
      celebrationShown: config.graduated,
    },
  ];

  return {
    progressId: WALKTHROUGH_PROGRESS_ID,
    manualId: WALKTHROUGH_MANUAL_ID,
    manualType: 'person',
    personId: WALKTHROUGH_PERSON_ID,
    familyId,
    startedAt: Timestamp.now(),
    graduatedAt: config.graduated ? Timestamp.now() : undefined,
    layers,
    currentLayer: config.currentLayer,
    completedLayers: config.completedLayers,
    overallPercentage: config.overallPercentage,
    milestones,
    lastActivityAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

// ==================== Main Component ====================

export default function WalkthroughPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentStage, setCurrentStage] = useState<JourneyStage | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check current state
  useEffect(() => {
    async function checkState() {
      if (!user) return;

      setLoading(true);
      try {
        const progressRef = doc(firestore, 'onboarding_progress', WALKTHROUGH_PROGRESS_ID);
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const data = progressSnap.data() as OnboardingProgress;

          // Determine current stage based on data
          if (data.graduatedAt) {
            setCurrentStage('graduated');
          } else if (data.completedLayers.length === 6) {
            setCurrentStage('ready_to_graduate');
          } else if (data.completedLayers.length === 5) {
            setCurrentStage('almost_done');
          } else if (data.completedLayers.length === 3) {
            setCurrentStage('halfway');
          } else if (data.completedLayers.length === 1) {
            setCurrentStage('l6_complete');
          } else if (data.overallPercentage > 0) {
            setCurrentStage('l6_in_progress');
          } else {
            setCurrentStage('not_started');
          }
        } else {
          setCurrentStage(null);
        }
      } catch (err) {
        console.error('Error checking state:', err);
      } finally {
        setLoading(false);
      }
    }

    checkState();
  }, [user]);

  // Initialize walkthrough data
  const initializeWalkthrough = async () => {
    if (!user) return;

    setActionLoading(true);
    setMessage(null);

    try {
      // Create person document
      const personData = {
        ...DEMO_PERSON_DATA,
        familyId: user.familyId,
      };
      await setDoc(doc(firestore, 'people', WALKTHROUGH_PERSON_ID), personData);

      // Create manual document
      const manualData = {
        ...DEMO_MANUAL_DATA,
        familyId: user.familyId,
      };
      await setDoc(doc(firestore, 'person_manuals', WALKTHROUGH_MANUAL_ID), manualData);

      // Create initial progress (not started)
      const progress = createProgressForStage('not_started', user.familyId);
      await setDoc(doc(firestore, 'onboarding_progress', WALKTHROUGH_PROGRESS_ID), progress);

      setCurrentStage('not_started');
      setMessage({ type: 'success', text: 'Walkthrough initialized! Emma is ready.' });
    } catch (err) {
      console.error('Error initializing:', err);
      setMessage({ type: 'error', text: 'Failed to initialize walkthrough' });
    } finally {
      setActionLoading(false);
    }
  };

  // Set journey to specific stage
  const setJourneyStage = async (stage: JourneyStage) => {
    if (!user) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const progress = createProgressForStage(stage, user.familyId);
      await setDoc(doc(firestore, 'onboarding_progress', WALKTHROUGH_PROGRESS_ID), progress);

      setCurrentStage(stage);
      setMessage({ type: 'success', text: `Journey set to: ${STAGE_CONFIGS[stage].name}` });
    } catch (err) {
      console.error('Error setting stage:', err);
      setMessage({ type: 'error', text: 'Failed to set journey stage' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete all walkthrough data
  const deleteWalkthrough = async () => {
    if (!user) return;

    setActionLoading(true);
    setMessage(null);

    try {
      await deleteDoc(doc(firestore, 'onboarding_progress', WALKTHROUGH_PROGRESS_ID));
      await deleteDoc(doc(firestore, 'person_manuals', WALKTHROUGH_MANUAL_ID));
      await deleteDoc(doc(firestore, 'people', WALKTHROUGH_PERSON_ID));

      setCurrentStage(null);
      setMessage({ type: 'success', text: 'Walkthrough data deleted' });
    } catch (err) {
      console.error('Error deleting:', err);
      setMessage({ type: 'error', text: 'Failed to delete walkthrough data' });
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <TechnicalCard shadowSize="md" className="max-w-md w-full p-6 text-center">
          <BeakerIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="font-mono text-xl font-bold text-slate-800 mb-2">
            Walkthrough Mode
          </h1>
          <p className="font-mono text-sm text-slate-600 mb-4">
            Please sign in to access the walkthrough controls.
          </p>
          <TechnicalButton variant="primary" onClick={() => router.push('/login')}>
            Sign In
          </TechnicalButton>
        </TechnicalCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <TechnicalCard shadowSize="md" className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <BeakerIcon className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="font-mono text-xl font-bold text-slate-800">
                Walkthrough Control Panel
              </h1>
              <p className="font-mono text-sm text-slate-500">
                Test and explore the onboarding journey flow
              </p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 mb-4 font-mono text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Current State */}
          <div className="bg-slate-100 p-4 border border-slate-200">
            <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-2">
              Current State
            </p>
            {currentStage ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 border-2 border-amber-400 flex items-center justify-center">
                  {STAGE_CONFIGS[currentStage].icon}
                </div>
                <div>
                  <p className="font-mono font-bold text-slate-800">
                    {STAGE_CONFIGS[currentStage].name}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {STAGE_CONFIGS[currentStage].description}
                  </p>
                </div>
              </div>
            ) : (
              <p className="font-mono text-sm text-slate-600">
                No walkthrough data. Click &quot;Initialize&quot; to start.
              </p>
            )}
          </div>
        </TechnicalCard>

        {/* Quick Actions */}
        <TechnicalCard shadowSize="sm" className="p-4">
          <h2 className="font-mono text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {!currentStage ? (
              <TechnicalButton
                variant="primary"
                onClick={initializeWalkthrough}
                disabled={actionLoading}
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Initialize Walkthrough
              </TechnicalButton>
            ) : (
              <>
                <TechnicalButton
                  variant="primary"
                  onClick={() => router.push(`/people/${WALKTHROUGH_PERSON_ID}/manual/onboard/journey`)}
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  View Journey
                </TechnicalButton>
                <TechnicalButton
                  variant="outline"
                  onClick={() => router.push(`/people/${WALKTHROUGH_PERSON_ID}/manual`)}
                >
                  <BookOpenIcon className="w-4 h-4 mr-2" />
                  View Manual
                </TechnicalButton>
                <TechnicalButton
                  variant="outline"
                  onClick={deleteWalkthrough}
                  disabled={actionLoading}
                  className="text-red-600 border-red-300 hover:border-red-500"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete All
                </TechnicalButton>
              </>
            )}
          </div>
        </TechnicalCard>

        {/* Stage Controls */}
        {currentStage && (
          <TechnicalCard shadowSize="sm" className="p-4">
            <h2 className="font-mono text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
              Set Journey Stage
            </h2>
            <p className="font-mono text-xs text-slate-500 mb-4">
              Click any stage to instantly set the journey to that point. The progress document
              in Firestore will be updated accordingly.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(STAGE_CONFIGS) as JourneyStage[]).map((stage) => {
                const config = STAGE_CONFIGS[stage];
                const isActive = currentStage === stage;

                return (
                  <button
                    key={stage}
                    onClick={() => setJourneyStage(stage)}
                    disabled={actionLoading}
                    className={`p-4 text-left border-2 transition-all ${
                      isActive
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 flex items-center justify-center ${
                          isActive
                            ? 'bg-amber-200 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-bold text-sm text-slate-800">
                          {config.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500 truncate">
                          {config.description}
                        </p>
                      </div>
                      {isActive && (
                        <CheckCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${config.overallPercentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        {config.overallPercentage}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </TechnicalCard>
        )}

        {/* Firestore Document Info */}
        <TechnicalCard shadowSize="sm" className="p-4">
          <h2 className="font-mono text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            Firestore Documents
          </h2>
          <p className="font-mono text-xs text-slate-500 mb-4">
            The walkthrough uses these documents. You can also edit them directly in Firebase Console.
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="p-2 bg-slate-100 border border-slate-200">
              <span className="text-slate-500">people/</span>
              <span className="text-amber-600 font-bold">{WALKTHROUGH_PERSON_ID}</span>
            </div>
            <div className="p-2 bg-slate-100 border border-slate-200">
              <span className="text-slate-500">person_manuals/</span>
              <span className="text-amber-600 font-bold">{WALKTHROUGH_MANUAL_ID}</span>
            </div>
            <div className="p-2 bg-slate-100 border border-slate-200">
              <span className="text-slate-500">onboarding_progress/</span>
              <span className="text-amber-600 font-bold">{WALKTHROUGH_PROGRESS_ID}</span>
              <span className="text-green-600 ml-2">(← Key document for journey state)</span>
            </div>
          </div>
        </TechnicalCard>

        {/* Instructions */}
        <TechnicalCard shadowSize="sm" className="p-4 bg-blue-50 border-blue-200">
          <h2 className="font-mono text-sm font-bold text-blue-800 uppercase tracking-wider mb-3">
            How to Use
          </h2>
          <ol className="space-y-2 font-mono text-xs text-blue-700">
            <li>
              <strong>1.</strong> Click &quot;Initialize Walkthrough&quot; to create demo data for Emma
            </li>
            <li>
              <strong>2.</strong> Use &quot;View Journey&quot; to see the onboarding journey UI at the current stage
            </li>
            <li>
              <strong>3.</strong> Use the stage buttons to jump to any point in the journey
            </li>
            <li>
              <strong>4.</strong> Test the flow by setting to &quot;Ready to Graduate&quot; and clicking Graduate
            </li>
            <li>
              <strong>5.</strong> Set to &quot;Living Document&quot; to see the post-graduation state
            </li>
            <li>
              <strong>6.</strong> Use &quot;Delete All&quot; to clean up and start fresh
            </li>
          </ol>
        </TechnicalCard>
      </div>
    </div>
  );
}
