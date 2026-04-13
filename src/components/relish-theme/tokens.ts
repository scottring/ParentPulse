// ================================================================
// Relish editorial theme — shared tokens
// Scale: generous horizontal space, large serif type, airy spacing.
// ================================================================

export const relishFont = {
  serif: 'var(--font-parent-display)',
  body: 'var(--font-parent-body)',
} as const;

export const relishColor = {
  ink: '#3A3530',
  muted: '#7A6E5C',
  faint: '#9A8E7C',
  sand: '#F7F5F0',
  cream: '#FBF8F1',
  edge: 'rgba(200,190,172,0.5)',
  edgeSoft: 'rgba(200,190,172,0.35)',
  sage: '#7C9082',
  gold: '#C4A265',
  coral: '#C08070',
  paper: '#FFFFFF',
} as const;

// Editorial type scale — notably larger than the old layout.
export const relishType = {
  masthead: 'clamp(64px, 8vw, 112px)',
  sectionHeading: 'clamp(30px, 2.6vw, 40px)',
  headingItalic: 'clamp(22px, 1.8vw, 28px)',
  body: 'clamp(16px, 1.15vw, 19px)',
  bodySmall: 'clamp(14px, 1vw, 16px)',
  kicker: 'clamp(12px, 0.9vw, 14px)',
  caption: 'clamp(11px, 0.8vw, 13px)',
} as const;

export const relishSpace = {
  // The container — wide, editorial.
  pageMax: 1280,
  pageGutter: 32,

  // Rhythm
  section: 64,
  block: 32,
  row: 20,
} as const;

export const relishRadius = {
  card: 16,
  pill: 999,
} as const;

export const relishBorder = {
  hairline: `1px solid ${relishColor.edge}`,
  soft: `1px solid ${relishColor.edgeSoft}`,
} as const;

export const relishShadow = {
  lift: '0 1px 2px rgba(60,50,40,0.04), 0 8px 24px rgba(60,50,40,0.06)',
} as const;
