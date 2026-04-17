import { describe, it, expect, vi, beforeEach } from 'vitest';

const getDocsMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_, name: string) => ({ __collection: name })),
  query: vi.fn((...args) => ({ __query: args })),
  where: vi.fn((...args) => ({ __where: args })),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}));
vi.mock('@/lib/firebase', () => ({ firestore: {} }));

import { findSpouseUserId } from '@/lib/rituals/spouseDetection';

function mockUsers(users: Array<{ id: string; role: string }>) {
  getDocsMock.mockResolvedValueOnce({
    docs: users.map((u) => ({ id: u.id, data: () => ({ role: u.role }) })),
  });
}

describe('findSpouseUserId', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
  });

  it('returns the other parent when exactly 2 parent users exist', async () => {
    mockUsers([
      { id: 'scott', role: 'parent' },
      { id: 'iris', role: 'parent' },
    ]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBe('iris');
  });

  it('returns null when no other parent exists', async () => {
    mockUsers([{ id: 'scott', role: 'parent' }]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBeNull();
  });

  it('returns null when more than one other parent exists', async () => {
    mockUsers([
      { id: 'scott', role: 'parent' },
      { id: 'iris', role: 'parent' },
      { id: 'sam', role: 'parent' },
    ]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBeNull();
  });

  it('ignores non-parent role users', async () => {
    mockUsers([
      { id: 'scott', role: 'parent' },
      { id: 'liam', role: 'child' },
      { id: 'iris', role: 'parent' },
    ]);
    const id = await findSpouseUserId('fam1', 'scott');
    expect(id).toBe('iris');
  });
});
