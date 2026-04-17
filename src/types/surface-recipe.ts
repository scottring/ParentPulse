import type { DashboardState } from '@/hooks/useDashboard';
import type { Person, PersonManual, Contribution } from '@/types/person-manual';
import type { GrowthItem } from '@/types/growth';
import type { CoupleRitual } from '@/types/couple-ritual';
import type { JournalEntry } from '@/types/journal';
import type { EchoMatch } from '@/hooks/useJournalEcho';
import type { ArcGroup } from '@/hooks/useGrowthFeed';
import type { ActionItem } from '@/types/action-items';

export type HeroModuleId =
  | 'stage-cta-self'
  | 'stage-cta-add-person'
  | 'stage-cta-contribute'
  | 'fresh-synthesis'
  | 'person-spotlight'
  | 'journal-echo'
  | 'next-action'
  | 'calm';

export type GridModuleId =
  | 'ritual-info'
  | 'micro-activity'
  | 'pattern-detected'
  | 'blind-spot'
  | 'growth-arc'
  | 'dinner-prompt'
  | 'recent-journal'
  | 'family-freshness'
  | 'reflection-prompt'
  | 'perspective-gap'
  | 'ritual-setup'
  | 'invite-spouse'
  | 'contribution-needed';

export interface SurfaceRecipe {
  /** Ordered hero candidates — first eligible wins */
  heroCandidates: HeroModuleId[];
  /** Ordered grid candidates — first N eligible fill the grid (max 6) */
  gridCandidates: GridModuleId[];
  /** Max grid tiles to show */
  maxGridTiles: number;
}

/** All data needed to evaluate module eligibility */
export interface SurfaceData {
  stage: DashboardState;
  people: Person[];
  manuals: PersonManual[];
  contributions: Contribution[];
  selfPerson: Person | null;
  spouse: Person | null;
  peopleNeedingContributions: Person[];
  hasSelfContribution: boolean;
  activeGrowthItems: GrowthItem[];
  arcGroups: ArcGroup[];
  journalEntries: JournalEntry[];
  echo: EchoMatch | null;
  ritual: CoupleRitual | null;
  actionItems: ActionItem[];
  dinnerPrompt: string | null;
  hasAssessments: boolean;
}

/** Resolved recipe — modules that passed eligibility */
export interface ResolvedSurface {
  hero: HeroModuleId;
  gridTiles: GridModuleId[];
}
