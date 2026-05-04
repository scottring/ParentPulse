/* ================================================================
   journal-first / tokens — shared design tokens used across the
   new home, kid mode, and (eventually) any other journal-first
   surface. Inline values, no CSS files, no styled-jsx — keeps each
   component drop-in safe.
   ================================================================ */

export const T = {
  paper: '#FBF8F2',
  paperWarm: '#F2E9D6',
  cream: '#F5F0E8',
  creamWarm: '#EFE7D6',
  ink: '#3A3530',
  inkSoft: '#4D4640',
  text3: '#5F564B',
  text4: '#6B6254',
  text5: '#887C68',
  text6: '#9A8E7A',
  rule: '#DCD3C2',
  ruleStrong: '#C8B79D',
  ruleSoft: '#E8E0D0',
  leather: '#14100C',
  leather2: '#2A2520',
  sage: '#7C9082',
  sageDeep: '#4A5D50',
  sageTint: '#DCE5DD',
  warmTint: 'rgba(201, 168, 76, 0.22)',
  warmRow: 'rgba(201, 168, 76, 0.07)',
  warmRow2: 'rgba(201, 168, 76, 0.13)',
  ember: '#C9864C',
  emberTint: '#F0DCC4',
  amber: '#C9A84C',
  burgundy: '#8C4A3E',

  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'DM Sans', system-ui, -apple-system, sans-serif",
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;
