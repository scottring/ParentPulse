/**
 * Hook to save AI-generated family manual content to Firestore
 */

import { useState } from 'react';
import { doc, setDoc, Timestamp, increment } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

// Type for AI-generated family manual content
export interface GeneratedFamilyManualContent {
  houseRules: Array<{
    rule: string;
    reasoning: string;
    consequences: string;
    appliesTo: 'everyone' | 'adults' | 'children' | 'specific';
    specificPeople?: string[];
    nonNegotiable: boolean;
  }>;
  familyValues: Array<{
    value: string;
    description: string;
    howWeShowIt: string;
  }>;
  routines: Array<{
    title: string;
    description: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual';
    timing: string;
    steps?: string[];
    notes?: string;
  }>;
  traditions: Array<{
    title: string;
    description: string;
    occasion: string;
    howWeCelebrate: string;
    significance: string;
  }>;
}

export function useSaveFamilyContent() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const saveContent = async (
    familyId: string,
    content: GeneratedFamilyManualContent
  ): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setSaving(true);
    setError(null);

    try {
      // Family manual is stored in families/{familyId}/family_manual/data
      const familyManualRef = doc(firestore, 'families', familyId, 'family_manual', 'data');
      const now = Timestamp.now();

      // Map AI-generated content to Firestore structure
      // Add IDs, timestamps, and user attribution to each item

      const houseRules = content.houseRules.map((rule, index) => ({
        ruleId: `rule_${Date.now()}_${index}`,
        rule: rule.rule,
        reasoning: rule.reasoning,
        consequences: rule.consequences,
        appliesTo: rule.appliesTo,
        specificPeople: rule.specificPeople || [],
        nonNegotiable: rule.nonNegotiable,
        addedDate: now,
        addedBy: user.userId,
      }));

      const familyValues = content.familyValues.map((value, index) => ({
        valueId: `value_${Date.now()}_${index}`,
        value: value.value,
        description: value.description,
        howWeShowIt: value.howWeShowIt,
        addedDate: now,
        addedBy: user.userId,
      }));

      const routines = content.routines.map((routine, index) => ({
        routineId: `routine_${Date.now()}_${index}`,
        title: routine.title,
        description: routine.description,
        frequency: routine.frequency,
        timing: routine.timing,
        steps: routine.steps || null,
        notes: routine.notes || null,
        addedDate: now,
        addedBy: user.userId,
      }));

      const traditions = content.traditions.map((tradition, index) => ({
        traditionId: `tradition_${Date.now()}_${index}`,
        title: tradition.title,
        description: tradition.description,
        occasion: tradition.occasion,
        howWeCelebrate: tradition.howWeCelebrate,
        significance: tradition.significance,
        addedDate: now,
        addedBy: user.userId,
      }));

      // Update family manual document
      await setDoc(familyManualRef, {
        familyId,
        houseRules,
        familyValues,
        routines,
        traditions,
        createdAt: now,
        updatedAt: now,
        lastEditedBy: user.userId,
        version: 1,
      }, { merge: true });

      setSaving(false);
    } catch (err: any) {
      console.error('Error saving family content:', err);
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
