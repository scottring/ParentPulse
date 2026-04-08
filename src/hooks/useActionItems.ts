'use client';

import { useMemo, useState, useCallback } from 'react';
import { Person, PersonManual, Contribution } from '@/types/person-manual';
import { DimensionAssessment } from '@/types/growth-arc';
import { ActionItem } from '@/types/action-items';
import { generateActionItems } from '@/lib/action-engine';

interface UseActionItemsParams {
  people: Person[];
  manuals: PersonManual[];
  contributions: Contribution[];
  assessments: DimensionAssessment[];
  userId: string;
}

export function useActionItems(params: UseActionItemsParams) {
  const { people, manuals, contributions, assessments, userId } = params;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const allItems = useMemo(
    () => generateActionItems({ people, manuals, contributions, assessments, userId }),
    [people, manuals, contributions, assessments, userId],
  );

  const items = useMemo(
    () => allItems.filter((item) => !dismissedIds.has(item.id)),
    [allItems, dismissedIds],
  );

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  }, []);

  const highPriority = items.filter((i) => i.priority === 'high');
  const hasUrgent = highPriority.length > 0;

  return { items, allItems, dismiss, highPriority, hasUrgent };
}
