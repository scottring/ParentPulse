// src/components/layout/leftRailItems.ts

export type LeftRailItem = {
  key: string;
  label: string;
  href: string;
  /** If true, an extra glyph indicates the room is privacy-gated. */
  pinGated?: boolean;
};

export const LEFT_RAIL_ITEMS: readonly LeftRailItem[] = [
  { key: 'journal',     label: 'Journal',     href: '/' },
  { key: 'people',      label: 'People',      href: '/manual' },
  { key: 'therapy',     label: 'Therapy',     href: '/therapy', pinGated: true },
  { key: 'rituals',     label: 'Rituals',     href: '/rituals' },
  { key: 'experiments', label: 'Experiments', href: '/experiments' },
  { key: 'unspoken',    label: 'Unspoken',    href: '/unspoken' },
  // Visual separator handled by the consumer.
  { key: 'archive',     label: 'Archive',     href: '/archive' },
];

/** Routes where neither the TopChrome nor the LeftRail should render. */
export const HIDE_CHROME_ROUTES: readonly RegExp[] = [
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/check-in(\/|$)/,
];

export function shouldHideChrome(pathname: string): boolean {
  return HIDE_CHROME_ROUTES.some((re) => re.test(pathname));
}
