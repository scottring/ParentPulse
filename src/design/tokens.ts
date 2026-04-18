// ================================================================
// Relish Design System — TS token mirror
// CSS is canonical (tokens.css). This file exists so components
// can reference tokens by name without string drift.
// ================================================================

export const color = {
  paper:        'var(--r-paper)',
  paperSoft:    'var(--r-paper-soft)',
  cream:        'var(--r-cream)',
  creamDeep:    'var(--r-cream-deep)',
  creamWarm:    'var(--r-cream-warm)',
  leather:      'var(--r-leather)',
  leather2:     'var(--r-leather-2)',

  ink:          'var(--r-ink)',
  ink2:         'var(--r-ink-2)',
  text2:        'var(--r-text-2)',
  text3:        'var(--r-text-3)',
  text4:        'var(--r-text-4)',
  text5:        'var(--r-text-5)',
  text6:        'var(--r-text-6)',

  inkReversed:   'var(--r-ink-reversed)',
  textReversed2: 'var(--r-text-reversed-2)',
  textReversed3: 'var(--r-text-reversed-3)',
  textReversed4: 'var(--r-text-reversed-4)',

  rule1: 'var(--r-rule-1)',
  rule2: 'var(--r-rule-2)',
  rule3: 'var(--r-rule-3)',
  rule4: 'var(--r-rule-4)',
  rule5: 'var(--r-rule-5)',
  ruleReversed: 'var(--r-rule-reversed)',

  sage:     'var(--r-sage)',
  sage2:    'var(--r-sage-2)',
  ember:    'var(--r-ember)',
  emberSoft:'var(--r-ember-soft)',
  burgundy: 'var(--r-burgundy)',
  amber:    'var(--r-amber)',
  warn:     'var(--r-warn)',

  tintSage:     'var(--r-tint-sage)',
  tintEmber:    'var(--r-tint-ember)',
  tintBurgundy: 'var(--r-tint-burgundy)',
  tintAmber:    'var(--r-tint-amber)',
  tintInk:      'var(--r-tint-ink)',
} as const;

export const font = {
  serif: 'var(--r-serif)',
  sans:  'var(--r-sans)',
  mono:  'var(--r-mono)',
} as const;

export const type = {
  wordmark:  'var(--r-type-wordmark)',
  display1:  'var(--r-type-display-1)',
  display2:  'var(--r-type-display-2)',
  h1:        'var(--r-type-h1)',
  h2:        'var(--r-type-h2)',
  lede:      'var(--r-type-lede)',
  body:      'var(--r-type-body)',
  bodySm:    'var(--r-type-body-sm)',
  small:     'var(--r-type-small)',
  caption:   'var(--r-type-caption)',
  micro:     'var(--r-type-micro)',
} as const;

export const leading = {
  tight: 'var(--r-leading-tight)',
  snug:  'var(--r-leading-snug)',
  body:  'var(--r-leading-body)',
  loose: 'var(--r-leading-loose)',
} as const;

export const space = {
  1: 'var(--r-space-1)',
  2: 'var(--r-space-2)',
  3: 'var(--r-space-3)',
  4: 'var(--r-space-4)',
  5: 'var(--r-space-5)',
  6: 'var(--r-space-6)',
  7: 'var(--r-space-7)',
  gutter:   'var(--r-gutter)',
  pageMax:  'var(--r-page-max)',
  columnMax:'var(--r-column-max)',
} as const;

export const radius = {
  1: 'var(--r-radius-1)',
  2: 'var(--r-radius-2)',
  3: 'var(--r-radius-3)',
  pill: 'var(--r-radius-pill)',
} as const;

export const shadow = {
  page: 'var(--r-shadow-page)',
  card: 'var(--r-shadow-card)',
  pen:  'var(--r-shadow-pen)',
} as const;

export const motion = {
  easeInk: 'var(--r-ease-ink)',
  quick:   'var(--r-dur-quick)',
  page:    'var(--r-dur-page)',
  settle:  'var(--r-dur-settle)',
} as const;
