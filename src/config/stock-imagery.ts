/**
 * Stock imagery — ONE PLACE to change every placeholder photo
 * across the app. Replace these URLs (or swap for /public/ paths)
 * without touching any page code.
 *
 * Slots are named by role, not by subject. Keep images editorial,
 * warm, and free of wedding / ceremonial imagery.
 */

export const stockImagery = {
  // Landing page broadsheet banner at the top of `/`.
  landingBanner:
    'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=2400&q=80&auto=format&fit=crop',

  // Workbook masthead — one photo per season. Swap by taste; the
  // data-season attribute on the band element picks the right key.
  masthead: {
    spring:
      'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=2400&q=80&auto=format&fit=crop',
    summer:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2400&q=80&auto=format&fit=crop',
    autumn:
      'https://images.unsplash.com/photo-1507371341162-763b5e419408?w=2400&q=80&auto=format&fit=crop',
    winter:
      'https://images.unsplash.com/photo-1478860409698-8707f313ee8b?w=2400&q=80&auto=format&fit=crop',
  },

  // Workbook Memory card header (from-the-archive slot). Editorial
  // still-life or landscape; will be replaced by entry.media when
  // the year-ago pipeline is wired.
  memoryCard:
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80&auto=format&fit=crop',

  // Dispatches · Lead art panel. Set to null to fall back to the
  // paper-soft gradient treatment with the "A pattern Relish
  // noticed" caption.
  leadArt: null as string | null,

  // Song strip artwork square.
  songArt:
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80&auto=format&fit=crop',

  // Family Manual hero portrait — used when the hero-person has
  // no avatarUrl of their own. Null = use the cream-warm gradient
  // placeholder the page ships with.
  personHeroFallback: null as string | null,

  // Ritual pages (empty state, active card, setup hero, manage
  // hero). One warm morning-kitchen photo used across all.
  ritualHero:
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=2400&q=80&auto=format&fit=crop',
} as const;

// Helper: masthead for a given season, with a safe fallback.
export function mastheadImageFor(
  season: 'spring' | 'summer' | 'autumn' | 'winter',
): string {
  return stockImagery.masthead[season] ?? stockImagery.masthead.spring;
}
