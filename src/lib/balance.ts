// ============================================================
// Balance — one sentence that says where a page (or a whole
// family) stands. Used on /people/[id] for a single person,
// and rolled up on /workbook across everyone.
//
// Rule: find the single biggest thing out of balance and name
// it. Never stack nudges.
// ============================================================

export type BalanceState = 'in-balance' | 'mostly-in-balance' | 'needs-attention' | 'new';

export type BalanceInput = {
  firstName: string;
  mentions: number;
  daysSinceLast: number;
  openThreads: number;
  /** Optional: if undefined, branches that depend on this are skipped. */
  hasSelfContribution?: boolean;
  /** Optional: if undefined, branches that depend on this are skipped. */
  hasObserverContribution?: boolean;
  theyCanContribute?: boolean;
  theyHaveAccount?: boolean;
  isSelf?: boolean;
};

export type BalanceOut = {
  state: BalanceState;
  label: string;
  line: string;
};

export function computeBalance(i: BalanceInput): BalanceOut {
  const { firstName, mentions, daysSinceLast, openThreads } = i;

  // Self page — quieter framing; never tell someone their own page is "off".
  if (i.isSelf) {
    if (i.hasSelfContribution === false) {
      return {
        state: 'new',
        label: 'Get started',
        line: `Answer your own questions in your own words.`,
      };
    }
    return {
      state: 'in-balance',
      label: 'In balance',
      line: `Your own page is in. Keep it current as things change.`,
    };
  }

  // Brand-new page — nothing written at all.
  if (mentions === 0 && i.hasObserverContribution !== true) {
    return {
      state: 'new',
      label: 'A new page',
      line: `Write a first note about ${firstName} — this page starts to fill.`,
    };
  }

  // Reply debt — biggest actionable signal.
  if (openThreads >= 3) {
    return {
      state: 'needs-attention',
      label: 'Needs attention',
      line: `${firstName} has ${openThreads} things waiting on you.`,
    };
  }

  // Long silence on a page that has history.
  if (mentions > 0 && daysSinceLast > 60) {
    return {
      state: 'needs-attention',
      label: 'Needs attention',
      line: `${firstName}'s page has been quiet for ${formatDaysDuration(daysSinceLast)}.`,
    };
  }

  // You've written a lot, they haven't been invited yet.
  if (
    i.theyCanContribute === true &&
    i.theyHaveAccount === false &&
    i.hasSelfContribution === false &&
    mentions >= 3
  ) {
    return {
      state: 'needs-attention',
      label: 'Needs attention',
      line: `${firstName} hasn't been invited to write their own side yet.`,
    };
  }

  // Smaller signals → "mostly in balance".
  if (openThreads > 0) {
    return {
      state: 'mostly-in-balance',
      label: 'Mostly in balance',
      line: `${openThreads} ${openThreads === 1 ? 'thing' : 'things'} waiting from ${firstName}.`,
    };
  }
  if (mentions > 0 && daysSinceLast > 14 && daysSinceLast <= 60) {
    return {
      state: 'mostly-in-balance',
      label: 'Mostly in balance',
      line: `${firstName} hasn't heard from you in ${formatDaysDuration(daysSinceLast)}.`,
    };
  }
  if (
    i.theyCanContribute === true &&
    i.theyHaveAccount === false &&
    i.hasSelfContribution === false &&
    mentions >= 1
  ) {
    return {
      state: 'mostly-in-balance',
      label: 'Mostly in balance',
      line: `Consider inviting ${firstName} to add their own view.`,
    };
  }

  // Everything's green.
  return {
    state: 'in-balance',
    label: 'In balance',
    line:
      i.hasSelfContribution === true
        ? `You and ${firstName} are in tune — recent on both sides, nothing waiting.`
        : `Things are in tune — nothing waiting on you right now.`,
  };
}

// Duration only — no "ago". Embeds cleanly inside sentences like
// "quiet for <duration>" or "hasn't heard from you in <duration>".
export function formatDaysDuration(days: number): string {
  if (days < 1) return 'less than a day';
  if (days === 1) return 'a day';
  if (days < 7) return `${days} days`;
  if (days < 14) return 'a week';
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 60) return 'a month';
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return 'over a year';
}

// "Ago" form — reads naturally as a past reference on its own
// ("updated 3 days ago"). Don't embed inside "quiet for …" phrases.
export function formatDaysAgo(days: number): string {
  if (days >= 9999) return 'not yet written about';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'a week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'a month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return 'over a year ago';
}
