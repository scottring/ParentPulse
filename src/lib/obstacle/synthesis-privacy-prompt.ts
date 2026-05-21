export interface SynthesisPrivacyOptions {
  /** Per-obstacle opt-in to include specifics in output. Default false. */
  allowSpecifics: boolean;
  /** True when the synthesized output will be visible to users other than the author. */
  sharedWithOthers: boolean;
}

/**
 * Returns a paragraph of instructions to PREPEND to any system prompt
 * whose output is shown to the user as synthesized text (milestone
 * sentences, chronicle entries, dashboard blurbs, etc.).
 *
 * The principle: specific in, general out. The AI has full detail in
 * its context but writes outputs that generalize.
 */
export function buildSynthesisPrivacyInstruction(
  opts: SynthesisPrivacyOptions,
): string {
  const lines: string[] = [];
  lines.push(
    'PRIVACY: Synthesize at the level of the dynamic, not the specific.',
  );
  if (!opts.allowSpecifics) {
    lines.push(
      'Do not include: sexual acts, third-party names, financial figures, ' +
        'medical details, or quoted private words.',
    );
  }
  if (opts.sharedWithOthers) {
    lines.push(
      'This output may be read by someone else. Doubly generalize. ' +
        'Avoid any phrasing that would be uncomfortable if read by the ' +
        'other party.',
    );
  }
  lines.push(
    'Apply the uncomfortable test: Would the user be uncomfortable if ' +
      'this exact sentence were read by someone they share this with? ' +
      'If yes, generalize further.',
  );
  return lines.join(' ');
}

export function shouldGeneralize(opts: { allowSpecifics: boolean }): boolean {
  return !opts.allowSpecifics;
}
