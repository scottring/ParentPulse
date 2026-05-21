import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('useKidHandoffMode', () => {
  it('defaults to false', async () => {
    const { useKidHandoffMode } = await import('../useKidHandoffMode');
    const { result } = renderHook(() => useKidHandoffMode());
    expect(result.current.kidHandoffMode).toBe(false);
  });

  it('toggles to true and persists', async () => {
    const { useKidHandoffMode } = await import('../useKidHandoffMode');
    const { result } = renderHook(() => useKidHandoffMode());
    act(() => result.current.setKidHandoffMode(true));
    expect(result.current.kidHandoffMode).toBe(true);
    expect(localStorage.getItem('relish:kidHandoffMode')).toBe('1');
  });

  it('rehydrates from localStorage on mount', async () => {
    localStorage.setItem('relish:kidHandoffMode', '1');
    const { useKidHandoffMode } = await import('../useKidHandoffMode');
    const { result } = renderHook(() => useKidHandoffMode());
    expect(result.current.kidHandoffMode).toBe(true);
  });

  it('toggle helper flips current value', async () => {
    const { useKidHandoffMode } = await import('../useKidHandoffMode');
    const { result } = renderHook(() => useKidHandoffMode());
    act(() => result.current.toggle());
    expect(result.current.kidHandoffMode).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.kidHandoffMode).toBe(false);
  });
});
