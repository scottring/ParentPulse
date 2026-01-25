# Relish Implementation Guide
## Practical Step-by-Step with Code Examples

---

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      YEAR GOAL (Volume)                         │
│  "Emotional Regulation & Family Harmony" (365 days)             │
│                                                                  │
│  Baseline Spider:                    Target Spider:              │
│       Layer 1: 4/10                       Layer 1: 8/10         │
│       Layer 2: 3/10                       Layer 2: 7/10         │
│       ...                                 ...                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
        │   QUARTER 1   │ │   QUARTER 2   │ │   QUARTER 3   │
        │ Recognize &   │ │ Using         │ │ Family-wide   │
        │ Name Feelings │ │ Strategies    │ │ Integration   │
        │  (90 days)    │ │  (90 days)    │ │  (90 days)    │
        └───────────────┘ └───────────────┘ └───────────────┘
                │
        ┌───────┼───────┬───────┐
        │       │       │       │
        ▼       ▼       ▼       ▼
    ┌──────┐ ┌──────┐ ┌──────┐
    │Month1│ │Month2│ │Month3│
    │Emotion│ │Daily │ │Family│
    │Vocab │ │Practice│ │Support│
    └──────┘ └──────┘ └──────┘
        │
        ├─────┬─────┬─────┬─────┐
        │     │     │     │     │
        ▼     ▼     ▼     ▼     ▼
    ┌────┐┌────┐┌────┐┌────┐  ← WEEKLY WORKBOOKS
    │Wk1 ││Wk2 ││Wk3 ││Wk4 │    (What families use)
    └────┘└────┘└────┘└────┘
        │
        ├──┬──┬──┬──┬──┬──┬──┐
        │  │  │  │  │  │  │  │
        ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼  ← DAILY
       Mon Tue Wed Thu Fri Sat Sun

FEEDBACK LOOP:
Weekly Assessment → Updates Month → Informs Quarter → Adjusts Year
```

---

## Step-by-Step Implementation

### Step 1: Extend PersonManual Schema

**File:** `/src/types/person-manual.ts`

```typescript
// ADD THIS to existing PersonManual interface:

export interface PersonManual {
  // ... existing fields ...

  // NEW: Manual type
  manualType?: 'child' | 'adult' | 'marriage' | 'family';

  // NEW: For marriage manuals
  partnerIds?: string[];

  // NEW: For family manuals
  householdId?: string;
}

// EXTEND existing Trigger interface:
export interface Trigger {
  id: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  context?: string;
  typicalResponse?: string;
  relatedPatternIds: string[];
  createdAt: Timestamp;

  // NEW: Layer classification
  layerId: LayerId;
}

// EXTEND existing Strategy (whatWorks) interface:
export interface Strategy {
  id: string;
  description: string;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  timesUsed: number;
  notes?: string;
  createdAt: Timestamp;

  // NEW: Layer mapping
  layerId: LayerId; // Which layer does this address?
  targetLayerIds: LayerId[]; // Which layers does this impact?
}

// EXTEND existing Boundary interface:
export interface Boundary {
  id: string;
  description: string;
  category: 'immovable' | 'negotiable' | 'preference';
  rationale?: string;
  createdAt: Timestamp;

  // NEW: Boundaries are always Layer 3
  layerId: 3;
}
```

**Migration Script:**

```typescript
// /scripts/migrateManuals.ts

import { db } from '../src/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migratePersonManuals() {
  const manualsRef = collection(db, 'person_manuals');
  const snapshot = await getDocs(manualsRef);

  for (const docSnap of snapshot.docs) {
    const manual = docSnap.data();

    // Add default layer IDs to existing content
    const updatedTriggers = manual.triggers?.map((trigger: any) => ({
      ...trigger,
      layerId: inferLayerFromTrigger(trigger) // AI or rule-based
    }));

    const updatedStrategies = manual.whatWorks?.map((strategy: any) => ({
      ...strategy,
      layerId: inferLayerFromStrategy(strategy),
      targetLayerIds: [strategy.layerId] // Default: affects same layer
    }));

    const updatedBoundaries = manual.boundaries?.map((boundary: any) => ({
      ...boundary,
      layerId: 3 // Boundaries are always Layer 3
    }));

    await updateDoc(doc(db, 'person_manuals', docSnap.id), {
      triggers: updatedTriggers,
      whatWorks: updatedStrategies,
      boundaries: updatedBoundaries,
      manualType: 'child', // Default for existing manuals
      updatedAt: new Date()
    });

    console.log(`Migrated manual: ${manual.childInfo?.name}`);
  }
}

function inferLayerFromTrigger(trigger: any): LayerId {
  // Rule-based classification
  const desc = trigger.description.toLowerCase();

  if (desc.includes('transition') || desc.includes('noise') || desc.includes('sensory')) {
    return 1; // Inputs & Triggers
  }
  if (desc.includes('understand') || desc.includes('interpret') || desc.includes('emotion')) {
    return 2; // Processing
  }
  // ... more rules

  return 1; // Default to Layer 1
}
```

### Step 2: Create Goal Hierarchy Types

**File:** `/src/types/goal-hierarchy.ts` (NEW)

```typescript
import { Timestamp } from 'firebase/firestore';
import { LayerId } from './person-manual';

// 6-Layer Assessment
export interface LayerAssessment {
  layerId: LayerId;
  layerName: string;
  currentScore: number; // 1-10
  baseline: number;
  target: number;
  confidence: 'emerging' | 'consistent' | 'validated';
  lastUpdated: Timestamp;
  evidence: string[];
  notes?: string;
}

export interface SpiderAssessment {
  assessmentId: string;
  personId: string;
  goalVolumeId?: string;
  timeframe: 'annual' | 'quarterly' | 'monthly' | 'weekly';
  period: string; // "2026", "2026-Q1", "2026-01", "2026-W03"
  layers: LayerAssessment[]; // Always 6 items
  assessedAt: Timestamp;
  assessedBy: string;
  overallProgress: number; // 0-100
  familyId: string;
}

// Year Goal (Volume)
export interface GoalVolume {
  volumeId: string;
  personId: string;
  familyId: string;

  title: string;
  description: string;

  startDate: Timestamp;
  endDate: Timestamp;
  durationQuarters: 1 | 2 | 3 | 4;

  baselineAssessmentId: string; // Link to SpiderAssessment
  targetAssessmentId: string;

  dailyMinutes: 15 | 30 | 45;
  status: 'draft' | 'active' | 'completed' | 'paused' | 'archived';

  quarterlyMilestoneIds: string[];

  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

// Quarter Focus (Milestone)
export interface QuarterlyMilestone {
  milestoneId: string;
  volumeId: string;
  personId: string;
  familyId: string;

  title: string;
  description: string;
  quarterNumber: 1 | 2 | 3 | 4;

  startDate: Timestamp;
  endDate: Timestamp;

  targetAssessmentId: string;
  monthlyFocusIds: string[];

  status: 'pending' | 'active' | 'completed';
  completedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Monthly Focus
export interface MonthlyFocus {
  focusId: string;
  milestoneId: string;
  volumeId: string;
  personId: string;
  familyId: string;

  title: string;
  description: string;
  monthNumber: 1 | 2 | 3;

  startDate: Timestamp;
  endDate: Timestamp;

  primaryLayerIds: LayerId[]; // Which layers are we emphasizing?
  targetAssessmentId: string;

  weeklyWorkbookIds: string[]; // Links to existing parent_workbooks

  status: 'pending' | 'active' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Step 3: Create React Hooks

**File:** `/src/hooks/useGoalVolume.ts` (NEW)

```typescript
import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GoalVolume } from '@/types/goal-hierarchy';
import { useAuth } from '@/contexts/AuthContext';

export function useGoalVolume(volumeId?: string) {
  const [volume, setVolume] = useState<GoalVolume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!volumeId) {
      setLoading(false);
      return;
    }

    const fetchVolume = async () => {
      try {
        const docRef = doc(db, 'goal_volumes', volumeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setVolume({ volumeId: docSnap.id, ...docSnap.data() } as GoalVolume);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchVolume();
  }, [volumeId]);

  return { volume, loading, error };
}

export function usePersonGoalVolumes(personId: string) {
  const [volumes, setVolumes] = useState<GoalVolume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVolumes = async () => {
      const q = query(
        collection(db, 'goal_volumes'),
        where('personId', '==', personId),
        where('status', 'in', ['active', 'draft']),
        orderBy('startDate', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        volumeId: doc.id,
        ...doc.data()
      })) as GoalVolume[];

      setVolumes(data);
      setLoading(false);
    };

    fetchVolumes();
  }, [personId]);

  return { volumes, loading };
}

export function useCreateGoalVolume() {
  const { currentUser, activeFamily } = useAuth();

  const createVolume = async (data: {
    personId: string;
    title: string;
    description: string;
    durationQuarters: 1 | 2 | 3 | 4;
    dailyMinutes: 15 | 30 | 45;
    baselineAssessment: SpiderAssessment;
    targetAssessment: Partial<SpiderAssessment>;
  }) => {
    // 1. Create spider assessments
    const baselineRef = await addDoc(collection(db, 'spider_assessments'), {
      ...data.baselineAssessment,
      assessedAt: Timestamp.now(),
      assessedBy: currentUser!.uid,
      familyId: activeFamily!.id
    });

    const targetRef = await addDoc(collection(db, 'spider_assessments'), {
      ...data.targetAssessment,
      assessedAt: Timestamp.now(),
      assessedBy: currentUser!.uid,
      familyId: activeFamily!.id
    });

    // 2. Create volume
    const startDate = Timestamp.now();
    const endDate = Timestamp.fromDate(
      new Date(startDate.toDate().setMonth(
        startDate.toDate().getMonth() + (data.durationQuarters * 3)
      ))
    );

    const volumeRef = await addDoc(collection(db, 'goal_volumes'), {
      personId: data.personId,
      familyId: activeFamily!.id,
      title: data.title,
      description: data.description,
      startDate,
      endDate,
      durationQuarters: data.durationQuarters,
      baselineAssessmentId: baselineRef.id,
      targetAssessmentId: targetRef.id,
      dailyMinutes: data.dailyMinutes,
      status: 'draft',
      quarterlyMilestoneIds: [],
      createdAt: Timestamp.now(),
      createdBy: currentUser!.uid,
      updatedAt: Timestamp.now()
    });

    // 3. Generate quarterly milestones via Cloud Function
    // (This would call AI to break down year into quarters)

    return volumeRef.id;
  };

  return { createVolume };
}
```

### Step 4: Spider Diagram Component

**File:** `/src/components/visualizations/SpiderDiagram.tsx` (NEW)

```typescript
import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { SpiderAssessment } from '@/types/goal-hierarchy';
import { LAYERS } from '@/types/person-manual';

interface SpiderDiagramProps {
  baseline?: SpiderAssessment;
  current: SpiderAssessment;
  target?: SpiderAssessment;
  height?: number;
}

export function SpiderDiagram({
  baseline,
  current,
  target,
  height = 400
}: SpiderDiagramProps) {
  // Transform data for recharts
  const data = current.layers.map((layer) => {
    const baselineLayer = baseline?.layers.find(l => l.layerId === layer.layerId);
    const targetLayer = target?.layers.find(l => l.layerId === layer.layerId);

    return {
      layer: LAYERS[layer.layerId].userFacingName,
      baseline: baselineLayer?.currentScore || 0,
      current: layer.currentScore,
      target: targetLayer?.target || 10,
      fullMark: 10
    };
  });

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />

          <PolarAngleAxis
            dataKey="layer"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />

          {baseline && (
            <Radar
              name="Baseline"
              dataKey="baseline"
              stroke="#9ca3af"
              fill="#9ca3af"
              fillOpacity={0.2}
            />
          )}

          <Radar
            name="Current"
            dataKey="current"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.5}
            strokeWidth={2}
          />

          {target && (
            <Radar
              name="Target"
              dataKey="target"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.1}
              strokeDasharray="5 5"
            />
          )}

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Layer details below chart */}
      <div className="mt-6 space-y-3">
        {current.layers.map((layer) => {
          const baselineScore = baseline?.layers.find(l => l.layerId === layer.layerId)?.currentScore;
          const change = baselineScore ? layer.currentScore - baselineScore : 0;

          return (
            <div key={layer.layerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{LAYERS[layer.layerId].userFacingName}</h4>
                <p className="text-xs text-gray-600">{LAYERS[layer.layerId].description}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {layer.currentScore}/10
                  </div>
                  {change !== 0 && (
                    <div className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {change > 0 ? '+' : ''}{change} from baseline
                    </div>
                  )}
                </div>

                <div className="w-16 h-16">
                  <svg viewBox="0 0 36 36" className="circular-progress">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeDasharray={`${layer.currentScore * 10} ${100 - layer.currentScore * 10}`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Step 5: Goal Creation Wizard

**File:** `/src/components/goals/GoalVolumeWizard.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { PersonManual } from '@/types/person-manual';
import { SpiderAssessment, LayerAssessment } from '@/types/goal-hierarchy';
import { LAYERS } from '@/types/person-manual';
import { useCreateGoalVolume } from '@/hooks/useGoalVolume';

interface GoalVolumeWizardProps {
  manual: PersonManual;
  onComplete: (volumeId: string) => void;
}

export function GoalVolumeWizard({ manual, onComplete }: GoalVolumeWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationQuarters: 4 as 1 | 2 | 3 | 4,
    dailyMinutes: 30 as 15 | 30 | 45,
    layerScores: {} as Record<number, { baseline: number; target: number }>
  });

  const { createVolume } = useCreateGoalVolume();

  const handleSubmit = async () => {
    // Build spider assessments
    const baselineAssessment: Omit<SpiderAssessment, 'assessmentId' | 'assessedAt' | 'assessedBy' | 'familyId'> = {
      personId: manual.id,
      timeframe: 'annual',
      period: new Date().getFullYear().toString(),
      layers: Object.entries(formData.layerScores).map(([layerId, scores]) => ({
        layerId: parseInt(layerId) as LayerId,
        layerName: LAYERS[parseInt(layerId) as LayerId].userFacingName,
        currentScore: scores.baseline,
        baseline: scores.baseline,
        target: scores.target,
        confidence: 'emerging',
        lastUpdated: Timestamp.now(),
        evidence: []
      })),
      overallProgress: 0
    };

    const targetAssessment = {
      ...baselineAssessment,
      layers: baselineAssessment.layers.map(layer => ({
        ...layer,
        currentScore: layer.target
      })),
      overallProgress: 100
    };

    const volumeId = await createVolume({
      personId: manual.id,
      title: formData.title,
      description: formData.description,
      durationQuarters: formData.durationQuarters,
      dailyMinutes: formData.dailyMinutes,
      baselineAssessment: baselineAssessment as SpiderAssessment,
      targetAssessment
    });

    onComplete(volumeId);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Step 1: What's the main goal? */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              What's your main goal with {manual.childInfo?.name} this year?
            </h2>
            <p className="text-gray-600">
              Think about the one thing that would make the biggest difference in your relationship.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Goal Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Emotional Regulation & Family Harmony"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Why this goal?</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What do you hope will change?"
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Time Commitment</label>
              <select
                value={formData.dailyMinutes}
                onChange={(e) => setFormData({ ...formData, dailyMinutes: parseInt(e.target.value) as 15 | 30 | 45 })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300"
              >
                <option value={15}>15 minutes/day</option>
                <option value={30}>30 minutes/day</option>
                <option value={45}>45 minutes/day</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Duration</label>
              <select
                value={formData.durationQuarters}
                onChange={(e) => setFormData({ ...formData, durationQuarters: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300"
              >
                <option value={1}>3 months (1 quarter)</option>
                <option value={2}>6 months (2 quarters)</option>
                <option value={3}>9 months (3 quarters)</option>
                <option value={4}>12 months (full year)</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!formData.title || !formData.description}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 2: Baseline assessment */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Where are you now?
            </h2>
            <p className="text-gray-600">
              Rate how things are going in each area right now (1 = struggling, 10 = thriving)
            </p>
          </div>

          {([1, 2, 3, 4, 5, 6] as LayerId[]).map((layerId) => (
            <div key={layerId} className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-1">{LAYERS[layerId].userFacingName}</h3>
              <p className="text-sm text-gray-600 mb-3">{LAYERS[layerId].description}</p>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Current:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.layerScores[layerId]?.baseline || 5}
                  onChange={(e) => setFormData({
                    ...formData,
                    layerScores: {
                      ...formData.layerScores,
                      [layerId]: {
                        baseline: parseInt(e.target.value),
                        target: formData.layerScores[layerId]?.target || 8
                      }
                    }
                  })}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-blue-600 w-12 text-center">
                  {formData.layerScores[layerId]?.baseline || 5}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">Target:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.layerScores[layerId]?.target || 8}
                  onChange={(e) => setFormData({
                    ...formData,
                    layerScores: {
                      ...formData.layerScores,
                      [layerId]: {
                        baseline: formData.layerScores[layerId]?.baseline || 5,
                        target: parseInt(e.target.value)
                      }
                    }
                  })}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-green-600 w-12 text-center">
                  {formData.layerScores[layerId]?.target || 8}
                </span>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Create Goal →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 6: Workbook Integration

**File:** `/src/components/workbook/WorkbookJourneySection.tsx` (NEW)

```typescript
import React from 'react';
import { useGoalVolume } from '@/hooks/useGoalVolume';
import { useMonthlyFocus } from '@/hooks/useMonthlyFocus';
import { ParentWorkbook } from '@/types/parent-workbook';

interface WorkbookJourneySectionProps {
  workbook: ParentWorkbook;
}

export function WorkbookJourneySection({ workbook }: WorkbookJourneySectionProps) {
  const monthlyFocusId = workbook.monthlyFocusId; // NEW field to add
  const { focus } = useMonthlyFocus(monthlyFocusId);
  const { volume } = useGoalVolume(focus?.volumeId);

  if (!focus || !volume) {
    return null;
  }

  return (
    <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
      <h2 className="text-sm uppercase tracking-wide text-blue-600 font-semibold mb-3">
        📍 Your Journey
      </h2>

      <div className="space-y-2">
        <div>
          <span className="text-sm text-gray-600">Year Goal:</span>
          <span className="ml-2 font-semibold">{volume.title}</span>
        </div>

        <div>
          <span className="text-sm text-gray-600">This Quarter:</span>
          <span className="ml-2 font-semibold">{focus.milestone?.title}</span>
        </div>

        <div>
          <span className="text-sm text-gray-600">This Month:</span>
          <span className="ml-2 font-semibold">{focus.title}</span>
        </div>

        <div>
          <span className="text-sm text-gray-600">This Week:</span>
          <span className="ml-2 font-semibold">{workbook.theme || 'Practice daily strategies'}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-sm text-gray-700 italic">
          "{focus.description}"
        </p>
      </div>
    </div>
  );
}
```

---

## Cloud Function: Generate Goal from Manual

**File:** `/functions/src/ai/generateGoalVolume.ts` (NEW)

```typescript
import * as functions from 'firebase-functions';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '../config/firebase';

interface GenerateGoalVolumeInput {
  manualId: string;
  userIntent: string; // "I want to work on emotional regulation"
  durationQuarters: 1 | 2 | 3 | 4;
}

export const generateGoalVolume = functions.https.onCall(async (data: GenerateGoalVolumeInput, context) => {
  // 1. Fetch manual
  const manualDoc = await db.collection('person_manuals').doc(data.manualId).get();
  const manual = manualDoc.data();

  // 2. Build prompt for Claude
  const prompt = `You are an expert in child development and behavior change planning.

MANUAL CONTEXT:
Child: ${manual.childInfo.name}, age ${manual.childInfo.age}

Common Triggers:
${manual.triggers.map((t: any) => `- ${t.description} (severity: ${t.severity}/5)`).join('\n')}

What Works:
${manual.whatWorks.map((s: any) => `- ${s.description} (effectiveness: ${s.effectiveness}/5)`).join('\n')}

USER INTENT:
${data.userIntent}

TASK:
Create a ${data.durationQuarters}-quarter goal plan broken down into:
1. Year Goal: Overall objective
2. Quarterly Milestones: ${data.durationQuarters} progressive focuses
3. For each milestone: 6-layer target scores (1-10)

Output JSON:
{
  "yearGoal": {
    "title": "...",
    "description": "...",
    "baselineScores": { "1": 4, "2": 3, ... },
    "targetScores": { "1": 8, "2": 7, ... }
  },
  "quarterlyMilestones": [
    {
      "quarter": 1,
      "title": "...",
      "description": "...",
      "primaryLayers": [1, 2],
      "targetScores": { "1": 6, "2": 5, ... }
    },
    ...
  ]
}`;

  // 3. Call Claude
  const anthropic = new Anthropic({
    apiKey: functions.config().anthropic.api_key
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  const content = response.content[0].text;
  const goalPlan = JSON.parse(content);

  // 4. Create Firestore documents
  // (Implementation similar to useCreateGoalVolume hook)

  return { success: true, goalPlan };
});
```

---

## Next Immediate Steps

1. **Start with data model migration** (Step 1)
2. **Create goal hierarchy types** (Step 2)
3. **Build spider diagram** (Step 4)
4. **Test goal creation wizard** (Step 5)
5. **Integrate into workbook** (Step 6)

Then move to AI generation in Month 3.

---

## Questions to Clarify

1. **Should weekly assessments be required or optional?**
   - Required: Forces reflection, better data
   - Optional: Less pressure, more sustainable

2. **How aggressive should gap detection be?**
   - Gentle: One gap-filling prompt per week max
   - Moderate: 2-3 prompts per week
   - Aggressive: Daily gap-filling opportunities

3. **Spider diagram in workbook - where?**
   - Top of workbook (see progress first)
   - End of reflection (reward for completing)
   - Separate "Progress" page

4. **Layer language - keep technical or fully friendly?**
   - Technical: "Layer 1: Inputs & Triggers"
   - Friendly: "What's Hard"
   - Hybrid: "What's Hard (Layer 1: Inputs & Triggers)"

Let me know and I'll refine the implementation!
