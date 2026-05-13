import type {
  BedtimeCardKind,
  BedtimeParentTurn,
  BedtimeKidTurn,
} from '@/types/journal';

interface ComposeInput {
  kidName: string;
  parentName: string;
  card: BedtimeCardKind;
  parentTurn: BedtimeParentTurn;
  kidTurn: BedtimeKidTurn;
}

/** Compose the human-readable body for a bedtime check-in entry. The
 *  body lives on the entry's `text` field and shows up in the journal
 *  feed. Empty turns are skipped; a fallback line is used when neither
 *  side said anything. */
export function composeBedtimeBody(input: ComposeInput): string {
  if (input.card === 'parent-reflection') {
    return composeSingleSlot(input, '[Parent Reflection]');
  }
  if (input.card === 'externalized-worry') {
    return composeSingleSlot(input, '[Worry Visited]');
  }
  return composeHighLowBuffalo(input);
}

/** Shared composition for one-slot cards (Parent Reflection +
 *  Externalized Worry). The parent's observation goes in their
 *  `observation` slot; the kid's reply goes in their `response` slot. */
function composeSingleSlot(input: ComposeInput, header: string): string {
  const { kidName, parentName, parentTurn, kidTurn } = input;
  const lines: string[] = [header];
  if (parentTurn.observation && parentTurn.observation.trim()) {
    lines.push(`${parentName}: "${parentTurn.observation.trim()}"`);
  }
  if (kidTurn.response && kidTurn.response.trim()) {
    lines.push(`${kidName}: "${kidTurn.response.trim()}"`);
  }
  if (lines.length === 1) {
    lines.push(`${kidName} did a bedtime check-in.`);
  }
  return lines.join('\n');
}

function composeHighLowBuffalo(input: ComposeInput): string {
  const { kidName, parentName, parentTurn, kidTurn } = input;
  const lines: string[] = ['[High / Low / Buffalo]'];

  const parentLine = composeHlbLine(parentName, parentTurn);
  if (parentLine) lines.push(parentLine);

  const kidLine = composeHlbLine(kidName, kidTurn);
  if (kidLine) lines.push(kidLine);

  if (lines.length === 1) {
    lines.push(`${kidName} did a bedtime check-in.`);
  }
  return lines.join('\n');
}

function composeHlbLine(
  name: string,
  turn: BedtimeParentTurn | BedtimeKidTurn,
): string | null {
  const parts: string[] = [];
  if (turn.high && turn.high.trim()) parts.push(`High: ${turn.high.trim()}.`);
  if (turn.low && turn.low.trim()) parts.push(`Low: ${turn.low.trim()}.`);
  if (turn.buffalo && turn.buffalo.trim())
    parts.push(`Buffalo: ${turn.buffalo.trim()}.`);
  if (parts.length === 0) return null;
  return `${name} — ${parts.join(' ')}`;
}
