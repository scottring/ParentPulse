import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePeopleMap } from '@/hooks/usePeopleMap';

vi.mock('@/hooks/usePerson', () => ({
  usePerson: () => ({
    people: [
      { personId: 'p1', name: 'Liam' },
      { personId: 'p2', name: 'Mia' },
    ],
    loading: false,
  }),
}));

describe('usePeopleMap', () => {
  it('indexes people by personId', async () => {
    const { result } = renderHook(() => usePeopleMap());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.byId['p1'].name).toBe('Liam');
    expect(result.current.byId['p2'].name).toBe('Mia');
  });

  it('returns a display-name helper that falls back to personId', async () => {
    const { result } = renderHook(() => usePeopleMap());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.nameOf('p1')).toBe('Liam');
    expect(result.current.nameOf('unknown')).toBe('unknown');
  });
});
