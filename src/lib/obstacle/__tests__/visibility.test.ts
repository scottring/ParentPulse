import { describe, it, expect } from 'vitest';
import {
  defaultVisibility,
  resolveVisibleToUserIds,
  canRead,
} from '../visibility';
import type { Obstacle, ObstacleVisibility } from '@/types/obstacle';

describe('defaultVisibility', () => {
  it('returns private with author in sharedWith', () => {
    const v = defaultVisibility('user-a');
    expect(v.mode).toBe('private');
    expect(v.sharedWith).toEqual(['user-a']);
  });
});

describe('resolveVisibleToUserIds', () => {
  it('private: author only', () => {
    const v: ObstacleVisibility = { mode: 'private', sharedWith: ['author'] };
    expect(resolveVisibleToUserIds(v, 'author', ['author', 'partner'])).toEqual(['author']);
  });
  it('shared-with: explicit list (author always included)', () => {
    const v: ObstacleVisibility = {
      mode: 'shared-with',
      sharedWith: ['author', 'partner'],
    };
    expect(resolveVisibleToUserIds(v, 'author', ['author', 'partner', 'kid'])).toEqual([
      'author', 'partner',
    ]);
  });
  it('family: all family member ids', () => {
    const v: ObstacleVisibility = { mode: 'family', sharedWith: ['author'] };
    const result = resolveVisibleToUserIds(v, 'author', ['author', 'partner', 'kid']);
    expect(result.sort()).toEqual(['author', 'kid', 'partner']);
  });
});

describe('canRead', () => {
  function makeObstacle(overrides: Partial<Obstacle>): Obstacle {
    return {
      id: 'o1',
      title: 't',
      summary: 's',
      authorId: 'author',
      familyId: 'f1',
      subjectPersonIds: [],
      status: 'fresh',
      visibility: { mode: 'private', sharedWith: ['author'] },
      visibleToUserIds: ['author'],
      sensitive: false,
      allowSpecificsInOutput: false,
      bringToTherapy: false,
      createdAt: { toMillis: () => 0 } as Obstacle['createdAt'],
      updatedAt: { toMillis: () => 0 } as Obstacle['updatedAt'],
      clearedAt: null,
      origin: 'direct',
      originRefId: null,
      ...overrides,
    };
  }
  it('author can read own private', () => {
    expect(canRead(makeObstacle({}), 'author')).toBe(true);
  });
  it('non-author cannot read private', () => {
    expect(canRead(makeObstacle({}), 'partner')).toBe(false);
  });
  it('partner can read shared-with', () => {
    const o = makeObstacle({
      visibility: { mode: 'shared-with', sharedWith: ['author', 'partner'] },
      visibleToUserIds: ['author', 'partner'],
    });
    expect(canRead(o, 'partner')).toBe(true);
    expect(canRead(o, 'stranger')).toBe(false);
  });
});
