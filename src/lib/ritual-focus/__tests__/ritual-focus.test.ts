import { describe, it, expect } from 'vitest';
import {
  buildWeeklyFocusInput,
  hasFocusSignal,
} from '../buildWeeklyFocusInput';
import { resolveWeeklyFocus } from '../resolveWeeklyFocus';
import { fallbackFocusText } from '../fallbackFocusText';
import type { SessionSection, RitualIntention } from '@/types/ritual-session';

function section(kind: SessionSection['kind'], note?: string): SessionSection {
  return { kind, title: kind, opener: '', prompt: '', ...(note !== undefined ? { note } : {}) };
}

const intentions: RitualIntention[] = [
  { text: '  Trade bedtime two nights this week  ' },
  { text: '' },
  { text: 'Say the hard thing sooner' },
];

describe('buildWeeklyFocusInput', () => {
  it('pulls the three reflection notes and trims them', () => {
    const sections = [
      section('weekInReview', 'ignored'),
      section('wentWell', '  We laughed at dinner  '),
      section('wasHard', 'The Tuesday handoff'),
      section('smallJoys', 'Coffee on the porch'),
      section('planAhead'),
    ];
    const req = buildWeeklyFocusInput(sections, intentions);
    expect(req.wentWell).toBe('We laughed at dinner');
    expect(req.wasHard).toBe('The Tuesday handoff');
    expect(req.smallJoys).toBe('Coffee on the porch');
  });

  it('drops blank intentions and trims the rest', () => {
    const req = buildWeeklyFocusInput([], intentions);
    expect(req.intentions).toEqual([
      'Trade bedtime two nights this week',
      'Say the hard thing sooner',
    ]);
  });

  it('uses empty strings when a section is missing', () => {
    const req = buildWeeklyFocusInput([section('wentWell', 'x')], []);
    expect(req.wasHard).toBe('');
    expect(req.smallJoys).toBe('');
    expect(req.intentions).toEqual([]);
  });
});

describe('hasFocusSignal', () => {
  it('is false when every field is empty', () => {
    expect(
      hasFocusSignal({ wentWell: '', wasHard: '', smallJoys: '', intentions: [] }),
    ).toBe(false);
  });

  it('is true when any field has content', () => {
    expect(
      hasFocusSignal({ wentWell: '', wasHard: 'something', smallJoys: '', intentions: [] }),
    ).toBe(true);
    expect(
      hasFocusSignal({ wentWell: '', wasHard: '', smallJoys: '', intentions: ['x'] }),
    ).toBe(true);
  });
});

describe('resolveWeeklyFocus', () => {
  it('marks source ai when the confirmed text is the unedited proposal', () => {
    const r = resolveWeeklyFocus({
      aiProposal: '  Trade the Tuesday handoff for a week.  ',
      confirmedText: 'Trade the Tuesday handoff for a week.',
    });
    expect(r).toEqual({ text: 'Trade the Tuesday handoff for a week.', source: 'ai' });
  });

  it('marks source self when the user edited the proposal', () => {
    const r = resolveWeeklyFocus({
      aiProposal: 'Trade the Tuesday handoff for a week.',
      confirmedText: 'Trade the Tuesday handoff AND say so out loud.',
    });
    expect(r.source).toBe('self');
  });

  it('marks source self when there was no AI proposal (fallback path)', () => {
    const r = resolveWeeklyFocus({ aiProposal: null, confirmedText: 'Our own words' });
    expect(r).toEqual({ text: 'Our own words', source: 'self' });
  });

  it('throws when the confirmed text is empty', () => {
    expect(() =>
      resolveWeeklyFocus({ aiProposal: 'x', confirmedText: '   ' }),
    ).toThrow(/text/i);
  });
});

describe('fallbackFocusText', () => {
  it('returns the first non-empty intention, trimmed', () => {
    expect(fallbackFocusText(intentions)).toBe('Trade bedtime two nights this week');
  });

  it('returns empty string when there are no usable intentions', () => {
    expect(fallbackFocusText([{ text: '   ' }])).toBe('');
    expect(fallbackFocusText([])).toBe('');
  });
});
