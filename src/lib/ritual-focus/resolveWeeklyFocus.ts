import type { FocusSource } from '@/types/ritual-focus';

/**
 * Decides the final focus text + who authored it. Source is 'ai' only
 * when the couple confirmed the proposal unedited; any edit, or the
 * fallback path (no proposal), counts as 'self'. Empty is rejected —
 * a ritual must always carry exactly one focus forward.
 */
export function resolveWeeklyFocus(args: {
  aiProposal: string | null;
  confirmedText: string;
}): { text: string; source: FocusSource } {
  const text = args.confirmedText.trim();
  if (!text) {
    throw new Error('A weekly focus needs text');
  }
  const proposal = (args.aiProposal ?? '').trim();
  const source: FocusSource =
    proposal.length > 0 && text === proposal ? 'ai' : 'self';
  return { text, source };
}
