/**
 * Hook to save AI-generated relationship manual content to Firestore
 */

import { useState } from 'react';
import { doc, updateDoc, getDoc, Timestamp, increment } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

// Type for AI-generated relationship manual content
export interface GeneratedRelationshipManualContent {
  relationshipOverview: string;
  sharedGoals: Array<{
    title: string;
    description: string;
    category: string;
    timeline?: string;
    milestones?: string[];
  }>;
  rituals: Array<{
    title: string;
    description: string;
    frequency: string;
    timing?: string;
    significance: string;
  }>;
  traditions: Array<{
    title: string;
    description: string;
    occasion: string;
    howWeCelebrate: string;
    yearStarted?: number;
  }>;
  conflictPatterns: Array<{
    pattern: string;
    triggerSituations: string[];
    typicalOutcome: string;
    whatHelps: string[];
    whatMakesWorse: string[];
    severity: 'minor' | 'moderate' | 'significant';
  }>;
  connectionStrategies: Array<{
    strategy: string;
    context: string;
    effectiveness: 1 | 2 | 3 | 4 | 5;
    notes?: string;
  }>;
  importantMilestones: Array<{
    title: string;
    description: string;
    date: string;
    significance: string;
  }>;
}

export function useSaveRelationshipContent() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const saveContent = async (
    relationshipId: string,
    content: GeneratedRelationshipManualContent
  ): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setSaving(true);
    setError(null);

    try {
      const relationshipRef = doc(firestore, 'relationship_manuals', relationshipId);
      const now = Timestamp.now();

      // Map AI-generated content to Firestore structure
      // Add IDs, timestamps, and user attribution to each item

      const sharedGoals = content.sharedGoals.map((goal, index) => ({
        goalId: `goal_${Date.now()}_${index}`,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        timeline: goal.timeline || '',
        milestones: goal.milestones || [],
        status: 'active' as const,
        addedDate: now,
        addedBy: user.userId,
      }));

      const rituals = content.rituals.map((ritual, index) => ({
        ritualId: `ritual_${Date.now()}_${index}`,
        title: ritual.title,
        description: ritual.description,
        frequency: ritual.frequency,
        timing: ritual.timing || '',
        significance: ritual.significance,
        addedDate: now,
        addedBy: user.userId,
      }));

      const traditions = content.traditions.map((tradition, index) => ({
        traditionId: `tradition_${Date.now()}_${index}`,
        title: tradition.title,
        description: tradition.description,
        occasion: tradition.occasion,
        howWeCelebrate: tradition.howWeCelebrate,
        yearStarted: tradition.yearStarted || null,
        addedDate: now,
        addedBy: user.userId,
      }));

      const conflictPatterns = content.conflictPatterns.map((pattern, index) => ({
        patternId: `pattern_${Date.now()}_${index}`,
        pattern: pattern.pattern,
        triggerSituations: pattern.triggerSituations,
        typicalOutcome: pattern.typicalOutcome,
        whatHelps: pattern.whatHelps,
        whatMakesWorse: pattern.whatMakesWorse,
        severity: pattern.severity,
        addedDate: now,
      }));

      const connectionStrategies = content.connectionStrategies.map((strategy, index) => ({
        strategyId: `strategy_${Date.now()}_${index}`,
        strategy: strategy.strategy,
        context: strategy.context,
        effectiveness: strategy.effectiveness,
        notes: strategy.notes || '',
        addedDate: now,
        addedBy: user.userId,
      }));

      const importantMilestones = content.importantMilestones.map((milestone, index) => ({
        milestoneId: `milestone_${Date.now()}_${index}`,
        title: milestone.title,
        description: milestone.description,
        date: milestone.date,
        significance: milestone.significance,
      }));

      // Update relationship manual document
      await updateDoc(relationshipRef, {
        relationshipOverview: content.relationshipOverview,
        sharedGoals,
        rituals,
        traditions,
        conflictPatterns,
        connectionStrategies,
        importantMilestones,
        updatedAt: now,
        lastEditedBy: user.userId,
        version: increment(1),
      });

      setSaving(false);
    } catch (err: any) {
      console.error('Error saving relationship content:', err);
      setError(err.message);
      setSaving(false);
      throw err;
    }
  };

  return {
    saveContent,
    saving,
    error,
  };
}
