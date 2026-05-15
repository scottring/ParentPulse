/** v1 prompt. {other} is the OTHER person in the dyad, from the answerer's chair. */
export const MIRROR_V1_PROMPT_TEMPLATE =
  'If today between you and {other} was an animal — what animal, and what was it doing?';

export function renderMirrorPrompt(otherLabel: string): string {
  return MIRROR_V1_PROMPT_TEMPLATE.replace('{other}', otherLabel.trim());
}
