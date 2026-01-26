/**
 * Household Components
 *
 * Components for the Household Manual system including:
 * - Manual viewing and editing
 * - Journey progress tracking
 * - Workbook system (hub & spokes)
 * - Family member management
 */

// Manual components
export { HouseholdManualHeader } from './HouseholdManualHeader';
export { JourneyProgress } from './JourneyProgress';
export { PeopleGrid } from './PeopleGrid';
export { LayerSection } from './LayerSection';

// Workbook components
export { WeeklyFocusCard } from './WeeklyFocusCard';
export { DelegatedTaskList } from './DelegatedTaskList';
export { MilestoneTracker } from './MilestoneTracker';
export { HouseholdReflectionForm } from './HouseholdReflectionForm';
export { MilestonePlanView, DEFAULT_DAY30_PLAN, DEFAULT_JOURNEY_CONTEXT } from './MilestonePlanView';

// Coach components (to be added in Phase 6)
// export { HouseholdCoachButton } from './HouseholdCoachButton';
// export { CoachSuggestionCard } from './CoachSuggestionCard';
