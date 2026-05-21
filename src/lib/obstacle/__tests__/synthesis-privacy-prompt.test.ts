import { describe, it, expect } from 'vitest';
import {
  buildSynthesisPrivacyInstruction,
  shouldGeneralize,
} from '../synthesis-privacy-prompt';

describe('buildSynthesisPrivacyInstruction', () => {
  it('always includes the core generalization rule', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: false,
    });
    expect(instr).toContain('Synthesize at the level of the dynamic');
    expect(instr).toContain('not the specific');
  });

  it('lists the protected categories', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: false,
    });
    expect(instr).toContain('sexual acts');
    expect(instr).toContain('third-party names');
    expect(instr).toContain('financial figures');
    expect(instr).toContain('medical details');
    expect(instr).toContain('quoted private words');
  });

  it('adds the doubly-generalize rule when output is shared with others', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: true,
    });
    expect(instr).toContain('read by someone else');
  });

  it('omits the protection list when user opted into specifics', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: true,
      sharedWithOthers: false,
    });
    expect(instr).not.toContain('sexual acts');
  });

  it('includes the uncomfortable-test sentence', () => {
    const instr = buildSynthesisPrivacyInstruction({
      allowSpecifics: false,
      sharedWithOthers: false,
    });
    expect(instr).toContain('Would the user be uncomfortable');
  });
});

describe('shouldGeneralize', () => {
  it('returns true when allowSpecifics is false', () => {
    expect(shouldGeneralize({ allowSpecifics: false })).toBe(true);
  });
  it('returns false when allowSpecifics is true', () => {
    expect(shouldGeneralize({ allowSpecifics: true })).toBe(false);
  });
});
