/**
 * Surface types — the single curated home page that draws from
 * journal, manual, and growth system.
 */

import type { ActionItem } from '@/types/action-items';
import type { GrowthItem } from '@/types/growth';
import type { GrowthArc, DimensionAssessment } from '@/types/growth-arc';
import type { Person, PersonManual, Contribution, SynthesizedInsight } from '@/types/person-manual';
import type { JournalEntry } from '@/types/journal';
import type { EchoMatch } from '@/hooks/useJournalEcho';
import type { DashboardState, UserRole } from '@/hooks/useDashboard';
import type { ArcGroup } from '@/hooks/useGrowthFeed';
import type { FreshnessStatus } from '@/lib/freshness-engine';

// ─── Priority Engine Input ─────────────────────────────────

export interface SurfacePriorityInput {
  dashboardState: DashboardState;
  actionItems: ActionItem[];
  activeGrowthItems: GrowthItem[];
  arcGroups: ArcGroup[];
  manuals: PersonManual[];
  people: Person[];
  contributions: Contribution[];
  journalEntries: JournalEntry[];
  echo: EchoMatch | null;
  userId: string;
  dismissedIds?: Set<string>;
}

// ─── Priority Engine Output ────────────────────────────────

export interface SurfaceSections {
  lead: LeadItem;
  recentCaptures: JournalEntry[];
  manualInsight: ManualInsightItem | null;
  practiceToTry: GrowthItem | null;
  familyPeople: FamilyPill[];
  echo: EchoMatch | null;
}

// ─── Lead Item ─────────────────────────────────────────────

export type LeadType =
  | 'action'              // From action items (missing data, stale, etc.)
  | 'insight'             // From synthesis (gap, alignment, blind spot)
  | 'practice'            // From growth items
  | 'contribution_new'    // Someone else contributed
  | 'calm';               // Nothing to do — everything's steady

export interface LeadItem {
  id: string;
  type: LeadType;
  title: string;
  body: string;
  eyebrow: string;
  ctaLabel: string;
  ctaHref: string;
  personName?: string;
  glyph?: string;
  glyphColor?: string;
}

// ─── Manual Insight Item ───────────────────────────────────

export interface ManualInsightItem {
  personName: string;
  personId: string;
  insight: SynthesizedInsight;
  insightType: 'gap' | 'alignment' | 'blind_spot';
}

// ─── Family Pill ───────────────────────────────────────────

export interface FamilyPill {
  personId: string;
  name: string;
  relationshipType: string;
  freshness: FreshnessStatus;
  hasNewContribution: boolean;
  manualRoute: string;
}
