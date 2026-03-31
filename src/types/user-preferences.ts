import type { EngagementMode, GrowthItemType } from './growth';
import type { DimensionDomain } from '@/config/relationship-dimensions';

export interface GrowthPreferences {
  engagementMode: EngagementMode;
  dailyItemTarget: number;
  preferredItemTypes: GrowthItemType[];
  focusDomain?: DimensionDomain;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"
}

// Engagement mode presets
export const ENGAGEMENT_PRESETS: Record<EngagementMode, {
  label: string;
  description: string;
  dailyItemTarget: number;
  minutesPerDay: string;
}> = {
  light: {
    label: 'Light Touch',
    description: '1 quick activity per day — build the habit without pressure',
    dailyItemTarget: 1,
    minutesPerDay: '1-5',
  },
  moderate: {
    label: 'Steady Growth',
    description: '2-3 activities per day — a mix of quick check-ins and deeper work',
    dailyItemTarget: 3,
    minutesPerDay: '5-20',
  },
  deep: {
    label: 'Deep Work',
    description: '4-5 activities per day — serious commitment to transformation',
    dailyItemTarget: 5,
    minutesPerDay: '20-45',
  },
};

export const DEFAULT_PREFERENCES: GrowthPreferences = {
  engagementMode: 'moderate',
  dailyItemTarget: 3,
  preferredItemTypes: [],
};
