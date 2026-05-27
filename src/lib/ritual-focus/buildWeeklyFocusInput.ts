import type { SessionSection, RitualIntention } from '@/types/ritual-session';
import type { SynthesizeWeeklyFocusRequest } from '@/types/ritual-focus';

/**
 * Shapes the couple's just-finished session into the input the
 * synthesizeWeeklyFocus Cloud Function reads. Pure: only the three
 * reflection notes + the typed intentions feed the prescription —
 * deliberately NOT the Mirror entries (scope kept tight for v1).
 */
export function buildWeeklyFocusInput(
  sections: SessionSection[],
  intentions: RitualIntention[],
): SynthesizeWeeklyFocusRequest {
  const noteFor = (kind: SessionSection['kind']): string =>
    (sections.find((s) => s.kind === kind)?.note ?? '').trim();

  return {
    wentWell: noteFor('wentWell'),
    wasHard: noteFor('wasHard'),
    smallJoys: noteFor('smallJoys'),
    intentions: intentions.map((i) => i.text.trim()).filter(Boolean),
  };
}

/** True when there is at least something for the AI to work from. */
export function hasFocusSignal(req: SynthesizeWeeklyFocusRequest): boolean {
  return Boolean(
    req.wentWell || req.wasHard || req.smallJoys || req.intentions.length > 0,
  );
}
