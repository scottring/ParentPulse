import { describe, it, expect } from 'vitest';
import { MIRROR_V1_PROMPT_TEMPLATE, renderMirrorPrompt } from '../prompt';

describe('renderMirrorPrompt', () => {
  it('frames the prompt from the answerer toward the other person', () => {
    expect(renderMirrorPrompt('Dad')).toBe(
      'If today between you and Dad was an animal — what animal, and what was it doing?',
    );
    expect(renderMirrorPrompt('Kaleb')).toBe(
      'If today between you and Kaleb was an animal — what animal, and what was it doing?',
    );
  });

  it('template contains the {other} placeholder exactly once', () => {
    expect(MIRROR_V1_PROMPT_TEMPLATE.match(/\{other\}/g)).toHaveLength(1);
  });

  it('trims the other label', () => {
    expect(renderMirrorPrompt('  Dad  ')).toContain('you and Dad was');
  });
});
