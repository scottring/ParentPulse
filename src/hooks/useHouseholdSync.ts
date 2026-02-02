'use client';

import { useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { COLLECTIONS } from '@/types';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';
import type {
  HouseholdManual,
  HouseholdTrigger,
  HouseholdStrategy,
  HouseholdBoundary,
} from '@/types/household-workbook';

// ==================== Types ====================

interface IndividualManualInsights {
  personId: string;
  personName: string;
  triggers: Array<{ description: string; severity: string }>;
  strategies: Array<{ description: string; effectiveness: number }>;
  boundaries: Array<{ description: string; category: string }>;
}

interface SyncResult {
  success: boolean;
  message: string;
  itemsSynced?: number;
  errors?: string[];
}

interface AggregatedInsights {
  commonTriggers: Array<{
    description: string;
    affectedCount: number;
    affectedNames: string[];
    severity: string;
  }>;
  effectiveStrategies: Array<{
    description: string;
    usedByCount: number;
    usedByNames: string[];
    avgEffectiveness: number;
  }>;
  conflictingNeeds: Array<{
    description: string;
    persons: string[];
    conflict: string;
  }>;
}

interface UseHouseholdSyncReturn {
  // Pull from individual → household
  pullInsightsFromIndividuals: (householdManual: HouseholdManual) => Promise<AggregatedInsights>;
  applyInsightsToHousehold: (
    householdManual: HouseholdManual,
    insights: AggregatedInsights
  ) => Promise<SyncResult>;

  // Push from household → individuals
  propagateBoundaryToIndividuals: (
    boundary: HouseholdBoundary,
    targetPersonIds: string[]
  ) => Promise<SyncResult>;
  propagateRoutineToIndividuals: (
    routineName: string,
    routineDescription: string,
    targetPersonIds: string[]
  ) => Promise<SyncResult>;

  // State
  isSyncing: boolean;
  lastSyncError: string | null;
}

// ==================== Hook ====================

export function useHouseholdSync(): UseHouseholdSyncReturn {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  /**
   * Fetch insights from all individual manuals in the family
   */
  const fetchIndividualInsights = useCallback(
    async (familyId: string): Promise<IndividualManualInsights[]> => {
      const insights: IndividualManualInsights[] = [];

      // Fetch child manuals
      const childManualsQuery = query(
        collection(firestore, COLLECTIONS.CHILD_MANUALS),
        where('familyId', '==', familyId)
      );
      const childSnapshot = await getDocs(childManualsQuery);

      childSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        insights.push({
          personId: data.personId,
          personName: data.childName || 'Unknown',
          triggers: (data.triggers || []).map((t: any) => ({
            description: t.description,
            severity: t.severity || 'medium',
          })),
          strategies: (data.strategies || []).map((s: any) => ({
            description: s.description,
            effectiveness: s.effectiveness || 3,
          })),
          boundaries: (data.boundaries || []).map((b: any) => ({
            description: b.description,
            category: b.category || 'negotiable',
          })),
        });
      });

      // Could also fetch marriage_manuals, family_manuals here...

      return insights;
    },
    []
  );

  /**
   * Pull and aggregate insights from individual manuals
   */
  const pullInsightsFromIndividuals = useCallback(
    async (householdManual: HouseholdManual): Promise<AggregatedInsights> => {
      setIsSyncing(true);
      setLastSyncError(null);

      try {
        const individualInsights = await fetchIndividualInsights(householdManual.familyId);

        // Aggregate common triggers
        const triggerMap = new Map<string, {
          description: string;
          affectedNames: string[];
          severities: string[];
        }>();

        individualInsights.forEach((person) => {
          person.triggers.forEach((trigger) => {
            const key = trigger.description.toLowerCase().trim();
            if (triggerMap.has(key)) {
              const existing = triggerMap.get(key)!;
              existing.affectedNames.push(person.personName);
              existing.severities.push(trigger.severity);
            } else {
              triggerMap.set(key, {
                description: trigger.description,
                affectedNames: [person.personName],
                severities: [trigger.severity],
              });
            }
          });
        });

        const commonTriggers = Array.from(triggerMap.values())
          .filter((t) => t.affectedNames.length > 1)
          .map((t) => ({
            description: t.description,
            affectedCount: t.affectedNames.length,
            affectedNames: t.affectedNames,
            severity: getMostFrequent(t.severities) || 'medium',
          }))
          .sort((a, b) => b.affectedCount - a.affectedCount);

        // Aggregate effective strategies
        const strategyMap = new Map<string, {
          description: string;
          usedByNames: string[];
          effectiveness: number[];
        }>();

        individualInsights.forEach((person) => {
          person.strategies.forEach((strategy) => {
            const key = strategy.description.toLowerCase().trim();
            if (strategyMap.has(key)) {
              const existing = strategyMap.get(key)!;
              existing.usedByNames.push(person.personName);
              existing.effectiveness.push(strategy.effectiveness);
            } else {
              strategyMap.set(key, {
                description: strategy.description,
                usedByNames: [person.personName],
                effectiveness: [strategy.effectiveness],
              });
            }
          });
        });

        const effectiveStrategies = Array.from(strategyMap.values())
          .map((s) => ({
            description: s.description,
            usedByCount: s.usedByNames.length,
            usedByNames: s.usedByNames,
            avgEffectiveness:
              s.effectiveness.reduce((a, b) => a + b, 0) / s.effectiveness.length,
          }))
          .filter((s) => s.avgEffectiveness >= 4 || s.usedByCount > 1)
          .sort((a, b) => b.avgEffectiveness - a.avgEffectiveness);

        // Identify conflicting needs (boundaries that might conflict)
        const conflictingNeeds: AggregatedInsights['conflictingNeeds'] = [];

        // Look for opposite preferences (simplified conflict detection)
        const noiseRelated = individualInsights.filter((p) =>
          p.triggers.some((t) =>
            t.description.toLowerCase().includes('noise') ||
            t.description.toLowerCase().includes('loud')
          )
        );
        const quietRelated = individualInsights.filter((p) =>
          p.boundaries.some((b) =>
            b.description.toLowerCase().includes('quiet') ||
            b.description.toLowerCase().includes('silence')
          )
        );

        if (noiseRelated.length > 0 && quietRelated.length > 0) {
          const noiseSensitive = noiseRelated.map((p) => p.personName);
          const needsQuiet = quietRelated.map((p) => p.personName);
          const allAffected = [...new Set([...noiseSensitive, ...needsQuiet])];

          if (allAffected.length > 1) {
            conflictingNeeds.push({
              description: 'Noise sensitivity vs. activity needs',
              persons: allAffected,
              conflict:
                'Some family members are sensitive to noise while others may need space for louder activities',
            });
          }
        }

        return {
          commonTriggers,
          effectiveStrategies,
          conflictingNeeds,
        };
      } catch (err) {
        console.error('Error pulling insights:', err);
        setLastSyncError('Failed to pull insights from individual manuals');
        return {
          commonTriggers: [],
          effectiveStrategies: [],
          conflictingNeeds: [],
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [fetchIndividualInsights]
  );

  /**
   * Apply aggregated insights to household manual
   */
  const applyInsightsToHousehold = useCallback(
    async (
      householdManual: HouseholdManual,
      insights: AggregatedInsights
    ): Promise<SyncResult> => {
      setIsSyncing(true);
      setLastSyncError(null);

      try {
        const now = Timestamp.now();
        const newTriggers: HouseholdTrigger[] = [];
        const newStrategies: HouseholdStrategy[] = [];

        // Add common triggers that don't already exist
        insights.commonTriggers.forEach((trigger) => {
          const exists = householdManual.triggers.some(
            (t) => t.description.toLowerCase() === trigger.description.toLowerCase()
          );
          if (!exists) {
            newTriggers.push({
              triggerId: `trigger-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              description: trigger.description,
              context: `Affects: ${trigger.affectedNames.join(', ')}`,
              layerId: 1,
              severity: trigger.severity as 'low' | 'medium' | 'high' | 'critical',
              affectsPersons: trigger.affectedNames,
              source: 'intervention',
              createdAt: now,
              updatedAt: now,
            });
          }
        });

        // Add effective strategies that don't already exist
        insights.effectiveStrategies.forEach((strategy) => {
          const exists = householdManual.strategies.some(
            (s) => s.description.toLowerCase() === strategy.description.toLowerCase()
          );
          if (!exists) {
            newStrategies.push({
              strategyId: `strategy-sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              description: strategy.description,
              howToUse: `Works well for: ${strategy.usedByNames.join(', ')}`,
              layerId: 4,
              effectiveness: Math.round(strategy.avgEffectiveness) as 1 | 2 | 3 | 4 | 5,
              source: 'intervention',
              createdAt: now,
              updatedAt: now,
            });
          }
        });

        // Update household manual
        if (newTriggers.length > 0 || newStrategies.length > 0) {
          const docRef = doc(firestore, COLLECTIONS.HOUSEHOLD_MANUALS, householdManual.manualId);
          await updateDoc(docRef, {
            triggers: [...householdManual.triggers, ...newTriggers],
            strategies: [...householdManual.strategies, ...newStrategies],
            updatedAt: now,
          });
        }

        return {
          success: true,
          message: `Synced ${newTriggers.length} triggers and ${newStrategies.length} strategies`,
          itemsSynced: newTriggers.length + newStrategies.length,
        };
      } catch (err) {
        console.error('Error applying insights:', err);
        setLastSyncError('Failed to apply insights to household manual');
        return {
          success: false,
          message: 'Failed to apply insights',
          errors: [String(err)],
        };
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  /**
   * Propagate a household boundary to individual child manuals
   */
  const propagateBoundaryToIndividuals = useCallback(
    async (
      boundary: HouseholdBoundary,
      targetPersonIds: string[]
    ): Promise<SyncResult> => {
      if (!user) {
        return { success: false, message: 'Must be signed in' };
      }

      setIsSyncing(true);
      setLastSyncError(null);

      try {
        const errors: string[] = [];
        let synced = 0;

        for (const personId of targetPersonIds) {
          try {
            // Find the child manual for this person
            const manualQuery = query(
              collection(firestore, COLLECTIONS.CHILD_MANUALS),
              where('personId', '==', personId)
            );
            const snapshot = await getDocs(manualQuery);

            if (!snapshot.empty) {
              const manualDoc = snapshot.docs[0];
              const now = Timestamp.now();

              // Add boundary to child manual
              await updateDoc(manualDoc.ref, {
                boundaries: arrayUnion({
                  boundaryId: `boundary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  description: boundary.description,
                  rationale: `Household rule: ${boundary.rationale || 'Set at household level'}`,
                  layerId: boundary.layerId,
                  category: boundary.category,
                  source: 'household',
                  createdAt: now,
                  updatedAt: now,
                }),
                updatedAt: now,
              });
              synced++;
            }
          } catch (err) {
            errors.push(`Failed to update manual for ${personId}`);
          }
        }

        return {
          success: errors.length === 0,
          message: `Propagated boundary to ${synced} individual manuals`,
          itemsSynced: synced,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (err) {
        console.error('Error propagating boundary:', err);
        setLastSyncError('Failed to propagate boundary');
        return {
          success: false,
          message: 'Failed to propagate boundary',
          errors: [String(err)],
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [user]
  );

  /**
   * Propagate a household routine to individual manuals
   */
  const propagateRoutineToIndividuals = useCallback(
    async (
      routineName: string,
      routineDescription: string,
      targetPersonIds: string[]
    ): Promise<SyncResult> => {
      if (!user) {
        return { success: false, message: 'Must be signed in' };
      }

      setIsSyncing(true);
      setLastSyncError(null);

      try {
        const errors: string[] = [];
        let synced = 0;

        for (const personId of targetPersonIds) {
          try {
            const manualQuery = query(
              collection(firestore, COLLECTIONS.CHILD_MANUALS),
              where('personId', '==', personId)
            );
            const snapshot = await getDocs(manualQuery);

            if (!snapshot.empty) {
              const manualDoc = snapshot.docs[0];
              const now = Timestamp.now();

              // Add as a strategy referencing the household routine
              await updateDoc(manualDoc.ref, {
                strategies: arrayUnion({
                  strategyId: `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  description: `Follow household routine: ${routineName}`,
                  howToUse: routineDescription,
                  layerId: 3,
                  effectiveness: 4,
                  source: 'household',
                  createdAt: now,
                  updatedAt: now,
                }),
                updatedAt: now,
              });
              synced++;
            }
          } catch (err) {
            errors.push(`Failed to update manual for ${personId}`);
          }
        }

        return {
          success: errors.length === 0,
          message: `Propagated routine to ${synced} individual manuals`,
          itemsSynced: synced,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (err) {
        console.error('Error propagating routine:', err);
        setLastSyncError('Failed to propagate routine');
        return {
          success: false,
          message: 'Failed to propagate routine',
          errors: [String(err)],
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [user]
  );

  return {
    pullInsightsFromIndividuals,
    applyInsightsToHousehold,
    propagateBoundaryToIndividuals,
    propagateRoutineToIndividuals,
    isSyncing,
    lastSyncError,
  };
}

// ==================== Helper Functions ====================

function getMostFrequent(arr: string[]): string | undefined {
  const counts = new Map<string, number>();
  arr.forEach((item) => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });

  let maxCount = 0;
  let mostFrequent: string | undefined;
  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = item;
    }
  });

  return mostFrequent;
}

export default useHouseholdSync;
