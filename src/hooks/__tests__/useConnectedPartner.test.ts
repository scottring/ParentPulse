import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const peopleMock = vi.fn();
vi.mock('@/hooks/usePerson', () => ({
  usePerson: () => ({ people: peopleMock() }),
}));

import { useConnectedPartner } from '../useConnectedPartner';

describe('useConnectedPartner', () => {
  it('returns null when nobody has a linked account', () => {
    peopleMock.mockReturnValue([
      { personId: 'p1', name: 'Mia', relationshipType: 'child' },
      { personId: 'p2', name: 'Self', relationshipType: 'self', linkedUserId: 'me' },
    ]);
    const { result } = renderHook(() => useConnectedPartner());
    expect(result.current).toBeNull();
  });

  it('prefers a linked spouse', () => {
    peopleMock.mockReturnValue([
      { personId: 'p1', name: 'Sib', relationshipType: 'sibling', linkedUserId: 'u-sib' },
      { personId: 'p2', name: 'Iris', relationshipType: 'spouse', linkedUserId: 'u-iris' },
    ]);
    const { result } = renderHook(() => useConnectedPartner());
    expect(result.current).toEqual({ userId: 'u-iris', displayName: 'Iris' });
  });

  it('falls back to any other linked adult when there is no spouse', () => {
    peopleMock.mockReturnValue([
      { personId: 'p1', name: 'Mia', relationshipType: 'child', linkedUserId: 'u-mia' },
      { personId: 'p2', name: 'CoParent', relationshipType: 'friend', linkedUserId: 'u-cp' },
    ]);
    const { result } = renderHook(() => useConnectedPartner());
    expect(result.current).toEqual({ userId: 'u-cp', displayName: 'CoParent' });
  });

  it('never returns the user themself or a child even if linked', () => {
    peopleMock.mockReturnValue([
      { personId: 'p1', name: 'Self', relationshipType: 'self', linkedUserId: 'me' },
      { personId: 'p2', name: 'Kid', relationshipType: 'child', linkedUserId: 'u-kid' },
    ]);
    const { result } = renderHook(() => useConnectedPartner());
    expect(result.current).toBeNull();
  });
});
