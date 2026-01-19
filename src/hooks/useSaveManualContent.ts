/**
 * useSaveManualContent Hook (Phase 1 - Simplified)
 *
 * Handles saving generated manual content to Firestore
 * Maps AI-generated content directly to PersonManual fields
 */

'use client';

import { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { GeneratedManualContent } from '@/types/onboarding';
import { PERSON_MANUAL_COLLECTIONS } from '@/types/person-manual';

interface UseSaveManualContentReturn {
  saveContent: (manualId: string, content: GeneratedManualContent) => Promise<void>;
  saving: boolean;
  error: string | null;
}

export function useSaveManualContent(): UseSaveManualContentReturn {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveContent = async (
    manualId: string,
    content: GeneratedManualContent
  ): Promise<void> => {
    if (!user?.userId) {
      throw new Error('User must be authenticated');
    }

    setSaving(true);
    setError(null);

    try {
      const manualRef = doc(
        firestore,
        PERSON_MANUAL_COLLECTIONS.PERSON_MANUALS,
        manualId
      );

      // Map generated content to PersonManual fields
      const updates: any = {
        updatedAt: Timestamp.now(),
        lastEditedAt: Timestamp.now(),
        lastEditedBy: user.userId,
        version: 2 // Increment version after initial creation
      };

      // Add core info from overview
      const coreInfo: any = {};
      if (content.overview) {
        if (content.overview.comfortFactors && content.overview.comfortFactors.length > 0) {
          coreInfo.sensoryNeeds = content.overview.comfortFactors;
        }
        if (content.overview.likes && content.overview.likes.length > 0) {
          coreInfo.interests = content.overview.likes;
        }
        if (content.strengths && content.strengths.length > 0) {
          coreInfo.strengths = content.strengths;
        }

        // Build notes from other overview fields
        const notes: string[] = [];
        if (content.overview.dislikes && content.overview.dislikes.length > 0) {
          notes.push(`Dislikes: ${content.overview.dislikes.join(', ')}`);
        }
        if (content.overview.motivations && content.overview.motivations.length > 0) {
          notes.push(`Motivated by: ${content.overview.motivations.join(', ')}`);
        }
        if (content.overview.discomfortFactors && content.overview.discomfortFactors.length > 0) {
          notes.push(`Uncomfortable with: ${content.overview.discomfortFactors.join(', ')}`);
        }
        if (content.importantContext && content.importantContext.length > 0) {
          notes.push(...content.importantContext);
        }
        if (notes.length > 0) {
          coreInfo.notes = notes.join('\n\n');
        }
      }
      if (Object.keys(coreInfo).length > 0) {
        updates.coreInfo = coreInfo;
      }

      // Add triggers
      if (content.triggers && content.triggers.length > 0) {
        updates.triggers = content.triggers.map((trigger, index) => ({
          id: `trigger-${Date.now()}-${index}`,
          description: trigger.description,
          context: trigger.context,
          typicalResponse: trigger.typicalResponse,
          deescalationStrategy: trigger.deescalationStrategy || '',
          severity: trigger.severity,
          identifiedDate: Timestamp.now(),
          identifiedBy: user.userId,
          confirmedBy: []
        }));
        updates.totalTriggers = content.triggers.length;
      }

      // Add "what works" strategies
      if (content.whatWorks && content.whatWorks.length > 0) {
        updates.whatWorks = content.whatWorks.map((strategy, index) => ({
          id: `strategy-works-${Date.now()}-${index}`,
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
          id: `strategy-doesnt-${Date.now()}-${index}`,
          description: strategy.description,
          context: strategy.context,
          effectiveness: 1,
          addedDate: Timestamp.now(),
          addedBy: user.userId,
          sourceType: 'discovered' as const,
          notes: strategy.notes || ''
        }));
      }

      // Calculate total strategies
      const totalStrategies = (content.whatWorks?.length || 0) + (content.whatDoesntWork?.length || 0);
      if (totalStrategies > 0) {
        updates.totalStrategies = totalStrategies;
      }

      // Add boundaries
      if (content.boundaries && content.boundaries.length > 0) {
        updates.boundaries = content.boundaries.map((boundary, index) => ({
          id: `boundary-${Date.now()}-${index}`,
          description: boundary.description,
          category: boundary.category,
          context: boundary.context || '',
          consequences: boundary.consequences || '',
          addedDate: Timestamp.now(),
          addedBy: user.userId
        }));
        updates.totalBoundaries = content.boundaries.length;
      }

      // Save to Firestore
      await updateDoc(manualRef, updates);

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
