import type { RitualIntention } from '@/types/ritual-session';

/**
 * When the AI proposal is unavailable (slow/failed), prefill the
 * own-words editor with the couple's first usable intention so the
 * close is never blocked on AI.
 */
export function fallbackFocusText(intentions: RitualIntention[]): string {
  return intentions.map((i) => i.text.trim()).find(Boolean) ?? '';
}
