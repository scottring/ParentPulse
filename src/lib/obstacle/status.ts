import type { ObstacleStatus } from '@/types/obstacle';

/**
 * Allowed obstacle status transitions for Phase 1.
 *
 * fresh       → clarifying                       (first user message)
 * clarifying  → clarifying | prescribed | paused (loop or confirm or rest)
 * prescribed  → executed | clarifying | paused   (later phases for executed)
 * executed    → cleared | clarifying | paused    (later phases)
 * cleared     → ∅                                (terminal)
 * paused      → fresh | clarifying | prescribed  (resume to prior shape)
 */
const ALLOWED: Record<ObstacleStatus, ObstacleStatus[]> = {
  fresh: ['clarifying', 'paused'],
  clarifying: ['clarifying', 'prescribed', 'paused'],
  prescribed: ['executed', 'clarifying', 'paused'],
  executed: ['cleared', 'clarifying', 'paused'],
  cleared: [],
  paused: ['fresh', 'clarifying', 'prescribed'],
};

export function canTransition(from: ObstacleStatus, to: ObstacleStatus): boolean {
  return ALLOWED[from].includes(to);
}

export type UserAction =
  | 'send-message'
  | 'confirm-prescription'
  | 'pause'
  | 'resume';

export function nextStatusOnUserAction(
  current: ObstacleStatus,
  action: UserAction,
): ObstacleStatus {
  if (action === 'pause' && canTransition(current, 'paused')) return 'paused';
  if (action === 'send-message') {
    if (current === 'fresh') return 'clarifying';
    if (current === 'clarifying') return 'clarifying';
  }
  if (action === 'confirm-prescription' && current === 'clarifying') {
    return 'prescribed';
  }
  // Invalid combinations return current — caller can detect no-op.
  return current;
}
