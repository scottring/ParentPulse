// ────────────────────────────────────────────────────────────
// Walkthrough step definitions for the Relish guided tour.
// Each step targets a DOM element via CSS selector; steps
// whose target lives on a different route show as a centered
// modal instead of a spotlight.
// ────────────────────────────────────────────────────────────

export type StepPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface WalkthroughStep {
  /** Unique key for this step. */
  id: string;
  /** CSS selector for the element to spotlight. `null` = centered modal. */
  target: string | null;
  /** Step title — rendered in Cormorant italic. */
  title: string;
  /** Rich description of what this feature does. */
  description: string;
  /** Preferred tooltip placement relative to the target. */
  placement: StepPlacement;
  /** If set, the step only spotlights when on this route. */
  route?: string;
}

const steps: WalkthroughStep[] = [
  // ─── Welcome (centered, no target) ───────────────────────
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Relish',
    description:
      'Your library of volumes kept on behalf of the people under your roof. Let us show you around.',
    placement: 'center',
  },

  // ─── Home page ────────────────────────────────────────────
  {
    id: 'library-table',
    target: '.home-books',
    title: 'The Library Table',
    description:
      'This is home. Three books sit on the table, each one a different way of knowing and growing with your family.',
    placement: 'top',
    route: '/',
  },
  {
    id: 'family-manual-book',
    target: '[data-walkthrough="book-manual"]',
    title: 'The Family Manual',
    description:
      'The atlas of everyone you care about. Tap to open the catalog of volumes\u2009\u2014\u2009one for each person.',
    placement: 'right',
    route: '/',
  },
  {
    id: 'journal-book',
    target: '[data-walkthrough="book-journal"]',
    title: 'The Journal',
    description:
      'A chronological stream of moments, reflections, wins, and questions. Everything you write here feeds the manuals.',
    placement: 'top',
    route: '/',
  },
  {
    id: 'workbook-book',
    target: '[data-walkthrough="book-workbook"]',
    title: 'The Workbook',
    description:
      'Your weekly practice book. AI-generated exercises drawn from what you\u2019ve written, one featured focus per day.',
    placement: 'left',
    route: '/',
  },

  // ─── Navigation ───────────────────────────────────────────
  {
    id: 'navigation',
    target: 'nav.fixed',
    title: 'Getting Around',
    description:
      'Three rooms in the library. You\u2019ll always find your way back.',
    placement: 'bottom',
  },

  // ─── Capture sheet ────────────────────────────────────────
  {
    id: 'floating-pen',
    target: '[aria-label="Capture a thought"]',
    title: 'The Floating Pen',
    description:
      'The most important button in the app. Tap it anytime to capture a thought, a moment, or start a conversation.',
    placement: 'left',
  },
  {
    id: 'save-or-ask',
    target: null,
    title: 'Save or Ask',
    description:
      'Every entry saves first, then you choose: close the sheet and move on, or tap "Ask about this" to think it through with the AI — grounded in what you know about your people.',
    placement: 'center',
  },

  // ─── Family manual page ───────────────────────────────────
  {
    id: 'atlas',
    target: '[data-walkthrough="atlas"]',
    title: 'The Atlas',
    description:
      'A visual map of your family. Each circle is a person; the lines between them show connection.',
    placement: 'bottom',
    route: '/family-manual',
  },
  {
    id: 'volumes',
    target: '[data-walkthrough="volumes"]',
    title: 'The Volumes',
    description:
      'Every person has a volume. Roman numerals, italic titles, and a quiet health indicator. Tap to read.',
    placement: 'top',
    route: '/family-manual',
  },
  {
    id: 'new-volume',
    target: '[data-walkthrough="add-person"]',
    title: 'Begin a New Volume',
    description:
      'Add someone new to the library\u2009\u2014\u2009a partner, child, friend, parent.',
    placement: 'left',
    route: '/family-manual',
  },

  // ─── Journal page ─────────────────────────────────────────
  {
    id: 'journal-stream',
    target: '[data-walkthrough="journal-entries"]',
    title: 'The Journal Stream',
    description:
      'Your captured moments, grouped by day. The AI reads these and weaves what it learns into the manuals.',
    placement: 'top',
    route: '/journal',
  },
  {
    id: 'echo',
    target: '[data-walkthrough="echo"]',
    title: 'The Echo',
    description:
      'A resurfaced older entry, semantically similar to something recent. The journal remembers.',
    placement: 'bottom',
    route: '/journal',
  },
  {
    id: 'filters',
    target: '[data-walkthrough="journal-filters"]',
    title: 'Filters',
    description:
      'See everything, just yours, or entries shared with you by family members.',
    placement: 'bottom',
    route: '/journal',
  },

  // ─── Workbook page ────────────────────────────────────────
  {
    id: 'chapters',
    target: '[data-walkthrough="arcs"]',
    title: 'Chapters in Progress',
    description:
      'Longer growth arcs you\u2019re walking through\u2009\u2014\u2009multi-week practices with phases.',
    placement: 'right',
    route: '/workbook',
  },
  {
    id: 'todays-focus',
    target: '[data-walkthrough="featured-focus"]',
    title: 'Today\u2019s Focus',
    description:
      'The one thing the app thinks you should do right now. Three minutes. This is the entire job most days.',
    placement: 'left',
    route: '/workbook',
  },

  // ─── Closing (centered, no target) ───────────────────────
  {
    id: 'closing',
    target: null,
    title: 'You\u2019re Ready',
    description:
      'Open the app, look at Today, do the one thing. Tap the pen when something comes up. The rest takes care of itself.',
    placement: 'center',
  },
];

export default steps;
