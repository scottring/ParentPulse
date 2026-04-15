import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { usePageWindow } from '@/components/journal-spread/usePageWindow';
import type { Entry } from '@/types/entry';

const make = (i: number): Entry => ({
  id: `e${i}`,
  familyId: 'f1',
  type: 'written',
  author: { kind: 'person', personId: 'p1' },
  subjects: [],
  content: `entry ${i}`,
  tags: [],
  visibleToUserIds: ['u1'],
  sharedWithUserIds: [],
  createdAt: Timestamp.fromMillis(1_700_000_000_000 - i * 1000),
});

describe('usePageWindow', () => {
  it('returns the first page of entries by default', () => {
    const entries = Array.from({ length: 25 }, (_, i) => make(i));
    const { result } = renderHook(() => usePageWindow(entries, 10));
    expect(result.current.currentEntries.length).toBe(10);
    expect(result.current.currentEntries[0].id).toBe('e0');
    expect(result.current.canFlipNewer).toBe(false);
    expect(result.current.canFlipOlder).toBe(true);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPageIndex).toBe(0);
  });

  it('flips to older entries', () => {
    const entries = Array.from({ length: 25 }, (_, i) => make(i));
    const { result } = renderHook(() => usePageWindow(entries, 10));
    act(() => result.current.flipOlder());
    expect(result.current.currentEntries[0].id).toBe('e10');
    expect(result.current.canFlipNewer).toBe(true);
  });

  it('flips back to newer', () => {
    const entries = Array.from({ length: 25 }, (_, i) => make(i));
    const { result } = renderHook(() => usePageWindow(entries, 10));
    act(() => result.current.flipOlder());
    act(() => result.current.flipNewer());
    expect(result.current.currentEntries[0].id).toBe('e0');
  });

  it('resets to page 0 when entries change', () => {
    const a = Array.from({ length: 25 }, (_, i) => make(i));
    const { result, rerender } = renderHook(
      ({ list, size }: { list: Entry[]; size: number }) => usePageWindow(list, size),
      { initialProps: { list: a, size: 10 } }
    );
    act(() => result.current.flipOlder());
    expect(result.current.currentPageIndex).toBe(1);
    const b = Array.from({ length: 5 }, (_, i) => make(i));
    rerender({ list: b, size: 10 });
    expect(result.current.currentPageIndex).toBe(0);
  });
});
