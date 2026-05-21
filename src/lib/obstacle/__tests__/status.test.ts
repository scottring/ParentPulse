import { describe, it, expect } from 'vitest';
import { canTransition, nextStatusOnUserAction } from '../status';
import type { ObstacleStatus } from '@/types/obstacle';

describe('canTransition', () => {
  it('allows fresh → clarifying', () => {
    expect(canTransition('fresh', 'clarifying')).toBe(true);
  });
  it('allows clarifying → prescribed', () => {
    expect(canTransition('clarifying', 'prescribed')).toBe(true);
  });
  it('allows clarifying → clarifying (idempotent for back-and-forth turns)', () => {
    expect(canTransition('clarifying', 'clarifying')).toBe(true);
  });
  it('allows any non-cleared → paused', () => {
    const sources: ObstacleStatus[] = ['fresh', 'clarifying', 'prescribed', 'executed'];
    for (const s of sources) {
      expect(canTransition(s, 'paused')).toBe(true);
    }
  });
  it('rejects cleared → anything (terminal)', () => {
    expect(canTransition('cleared', 'fresh')).toBe(false);
    expect(canTransition('cleared', 'clarifying')).toBe(false);
  });
  it('rejects fresh → prescribed (must clarify first)', () => {
    expect(canTransition('fresh', 'prescribed')).toBe(false);
  });
});

describe('nextStatusOnUserAction', () => {
  it('first user message on fresh obstacle → clarifying', () => {
    expect(nextStatusOnUserAction('fresh', 'send-message')).toBe('clarifying');
  });
  it('subsequent user message on clarifying obstacle → clarifying', () => {
    expect(nextStatusOnUserAction('clarifying', 'send-message')).toBe('clarifying');
  });
  it('user confirms prescription on clarifying → prescribed', () => {
    expect(nextStatusOnUserAction('clarifying', 'confirm-prescription')).toBe('prescribed');
  });
});
