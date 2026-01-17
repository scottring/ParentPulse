/**
 * useSaveManualContent Hook
 *
 * Handles saving generated manual content to Firestore
 * Maps AI-generated content to RoleSection fields
 */

'use client';

import { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { GeneratedManualContent } from '@/types/onboarding';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

interface UseSaveManualContentReturn {
  saveContent: (roleSectionId: string, content: GeneratedManualContent) => Promise<void>;
  saving: boolean;
  error: string | null;
}

export function useSaveManualContent(): UseSaveManualContentReturn {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveContent = async (
    roleSectionId: string,
    content: GeneratedManualContent
  ): Promise<void> => {
    if (!user?.userId) {
      throw new Error('User must be authenticated');
    }

    setSaving(true);
    setError(null);

    try {
      const roleSectionRef = doc(
        firestore,
        PERSON_MANUAL_COLLECTIONS.ROLE_SECTIONS,
        roleSectionId
      );

      // Map generated content to RoleSection fields
      const updates: any = {
        updatedAt: Timestamp.now(),
        lastEditedBy: user.userId,
      };

      // Add role overview if present
      if (content.roleOverview) {
        updates.roleOverview = content.roleOverview;
      }

      // Add overview content as important context
      if (content.overview) {
        const contextItems: string[] = [];

        if (content.overview.likes && content.overview.likes.length > 0) {
          contextItems.push(`Likes: ${content.overview.likes.join(', ')}`);
        }
        if (content.overview.dislikes && content.overview.dislikes.length > 0) {
          contextItems.push(`Dislikes: ${content.overview.dislikes.join(', ')}`);
        }
        if (content.overview.motivations && content.overview.motivations.length > 0) {
          contextItems.push(`Motivated by: ${content.overview.motivations.join(', ')}`);
        }
        if (content.overview.comfortFactors && content.overview.comfortFactors.length > 0) {
          contextItems.push(`Comfortable with: ${content.overview.comfortFactors.join(', ')}`);
        }
        if (content.overview.discomfortFactors && content.overview.discomfortFactors.length > 0) {
          contextItems.push(`Uncomfortable with: ${content.overview.discomfortFactors.join(', ')}`);
        }

        updates.importantContext = contextItems;
      }

      // Add triggers
      if (content.triggers && content.triggers.length > 0) {
        updates.triggers = content.triggers.map((trigger, index) => ({
          id: `trigger_${Date.now()}_${index}`,
          description: trigger.description,
          context: trigger.context,
          typicalResponse: trigger.typicalResponse,
          deescalationStrategy: trigger.deescalationStrategy || '',
          severity: trigger.severity,
          identifiedDate: Timestamp.now(),
          identifiedBy: user.userId,
          confirmedByOthers: []
        }));
      }

      // Add "what works" strategies
      if (content.whatWorks && content.whatWorks.length > 0) {
        updates.whatWorks = content.whatWorks.map((strategy, index) => ({
          id: `strategy_works_${Date.now()}_${index}`,
          description: strategy.description,
          context: strategy.context,
          effectiveness: strategy.effectiveness || 3,
          addedDate: Timestamp.now(),
          addedBy: user.userId,
          sourceType: 'discovered' as const,
          notes: strategy.notes || ''
        }));
      }

      // Add "what doesn't work" strategies
      if (content.whatDoesntWork && content.whatDoesntWork.length > 0) {
        updates.whatDoesntWork = content.whatDoesntWork.map((strategy, index) => ({
          id: `strategy_doesnt_${Date.now()}_${index}`,
          description: strategy.description,
          context: strategy.context,
          effectiveness: 1,
          addedDate: Timestamp.now(),
          addedBy: user.userId,
          sourceType: 'discovered' as const,
          notes: strategy.notes || ''
        }));
      }

      // Add boundaries
      if (content.boundaries && content.boundaries.length > 0) {
        updates.boundaries = content.boundaries.map((boundary, index) => ({
          id: `boundary_${Date.now()}_${index}`,
          description: boundary.description,
          category: boundary.category,
          context: boundary.context || '',
          consequences: boundary.consequences || '',
          addedDate: Timestamp.now(),
          addedBy: user.userId
        }));
      }

      // Add strengths
      if (content.strengths && content.strengths.length > 0) {
        updates.strengths = content.strengths;
      }

      // Add challenges
      if (content.challenges && content.challenges.length > 0) {
        updates.challenges = content.challenges;
      }

      // Add any additional important context
      if (content.importantContext && content.importantContext.length > 0) {
        updates.importantContext = [
          ...(updates.importantContext || []),
          ...content.importantContext
        ];
      }

      // Save to Firestore
      await updateDoc(roleSectionRef, updates);

      setSaving(false);
    } catch (err) {
      console.error('Error saving manual content:', err);
      setError(err instanceof Error ? err.message : 'Failed to save content');
      setSaving(false);
      throw err;
    }
  };

  return {
    saveContent,
    saving,
    error
  };
}
