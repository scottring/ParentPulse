import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useIdleLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not call onLock before idleMs elapses', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(onLock).not.toHaveBeenCalled();
  });

  it('calls onLock after idleMs of inactivity', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(1001); });
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('warningActive is true within warnAtMs of the deadline', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    const { result } = renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current.warningActive).toBe(false);
    act(() => { vi.advanceTimersByTime(150); }); // total 850, within 200 of 1000
    expect(result.current.warningActive).toBe(true);
  });

  it('resetting the timer cancels the lock', async () => {
    const onLock = vi.fn();
    const { useIdleLock } = await import('@/hooks/useIdleLock');
    const { result } = renderHook(() => useIdleLock({ idleMs: 1000, warnAtMs: 200, onLock }));
    act(() => { vi.advanceTimersByTime(900); });
    act(() => { result.current.reset(); });
    act(() => { vi.advanceTimersByTime(900); });
    expect(onLock).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(onLock).toHaveBeenCalledTimes(1);
  });
});
