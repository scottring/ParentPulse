import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMentionedIn } from '@/hooks/useIsMentionedIn';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'scott-uid', familyId: 'fam-1' } }),
}));
vi.mock('@/hooks/usePerson', () => ({
  usePerson: () => ({
    people: [
      { personId: 'person-scott', linkedUserId: 'scott-uid' },
      { personId: 'person-iris',  linkedUserId: 'iris-uid'  },
      { personId: 'person-kaleb', linkedUserId: undefined   },
    ],
  }),
}));

describe('useIsMentionedIn', () => {
  it('true when current user\'s linked personId is in personMentions', () => {
    const { result } = renderHook(() => useIsMentionedIn({ personMentions: ['person-scott'], authorId: 'iris-uid' } as never));
    expect(result.current).toBe(true);
  });
  it('false when only other people are mentioned', () => {
    const { result } = renderHook(() => useIsMentionedIn({ personMentions: ['person-iris'], authorId: 'iris-uid' } as never));
    expect(result.current).toBe(false);
  });
  it('false when the current user is the author', () => {
    const { result } = renderHook(() => useIsMentionedIn({ personMentions: ['person-scott'], authorId: 'scott-uid' } as never));
    expect(result.current).toBe(false);
  });
  it('false when entry is null/undefined', () => {
    const { result } = renderHook(() => useIsMentionedIn(null));
    expect(result.current).toBe(false);
  });
});
