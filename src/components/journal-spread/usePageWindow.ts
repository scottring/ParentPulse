'use client';

import { useEffect, useState } from 'react';
import type { Entry } from '@/types/entry';

export interface PageWindow {
  currentEntries: Entry[];
  currentPageIndex: number;
  totalPages: number;
  canFlipNewer: boolean;
  canFlipOlder: boolean;
  flipNewer: () => void;
  flipOlder: () => void;
}

export function usePageWindow(entries: Entry[], pageSize: number): PageWindow {
  const [pageIndex, setPageIndex] = useState(0);

  // Reset when the underlying list identity changes.
  useEffect(() => {
    setPageIndex(0);
  }, [entries]);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const safeIndex = Math.min(pageIndex, totalPages - 1);
  const start = safeIndex * pageSize;
  const currentEntries = entries.slice(start, start + pageSize);

  return {
    currentEntries,
    currentPageIndex: safeIndex,
    totalPages,
    canFlipNewer: safeIndex > 0,
    canFlipOlder: safeIndex < totalPages - 1,
    flipNewer: () => setPageIndex((i) => Math.max(0, i - 1)),
    flipOlder: () => setPageIndex((i) => Math.min(totalPages - 1, i + 1)),
  };
}
