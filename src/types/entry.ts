// Entry — the content atom of the Relish system
// Every piece of content in any manual or yearbook is an Entry.

import { DomainId } from './user';

export type EntryType =
  | 'insight'
  | 'activity'
  | 'goal'
  | 'task'
  | 'reflection'
  | 'story'
  | 'checklist'
  | 'discussion'
  | 'milestone';

export type EntrySource = 'system' | 'parent' | 'child' | 'imported';
export type EntryLifecycle = 'active' | 'completed' | 'archived';
export type EntryVisibility = 'family' | 'parents' | 'individual';

export interface Entry {
  entryId: string;
  familyId: string;
  manualId?: string;
  yearbookId?: string;
  personId?: string;
  type: EntryType;
  source: EntrySource;
  domain: DomainId;
  title: string;
  content: EntryContent;
  linkedEntryIds: string[];
  lifecycle: EntryLifecycle;
  visibility: EntryVisibility;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
}

// Discriminated union for type-specific content
export type EntryContent =
  | StoryContent
  | ChecklistContent
  | GoalContent
  | ReflectionContent
  | DiscussionContent
  | ActivityContent
  | InsightContent
  | TaskContent
  | MilestoneContent;

export interface StoryContent {
  kind: 'story';
  body: string;
  characterName?: string;
  theme?: string;
  illustrationUrl?: string;
  readAloud?: boolean;
}

export interface ChecklistContent {
  kind: 'checklist';
  items: ChecklistItem[];
  frequency?: 'daily' | 'weekly' | 'once';
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  time?: string;
}

export interface GoalContent {
  kind: 'goal';
  description: string;
  targetDate?: Date;
  progress: number;
  milestoneIds?: string[];
}

export interface ReflectionContent {
  kind: 'reflection';
  prompt: string;
  response?: string;
  sentiment?: 'positive' | 'neutral' | 'difficult';
}

export interface DiscussionContent {
  kind: 'discussion';
  prompt: string;
  suggestedScript?: string;
  targetAudience: 'family' | 'couple' | 'parent-child';
  responses?: DiscussionResponse[];
}

export interface DiscussionResponse {
  personId: string;
  personName: string;
  response: string;
  timestamp: Date;
}

export interface ActivityContent {
  kind: 'activity';
  instructions: string;
  ageRange?: { min: number; max: number };
  duration?: string;
  materials?: string[];
  completed?: boolean;
}

export interface InsightContent {
  kind: 'insight';
  body: string;
  source: string;
  actionable?: boolean;
}

export interface TaskContent {
  kind: 'task';
  description: string;
  assignee?: string;
  dueDate?: Date;
  completed: boolean;
}

export interface MilestoneContent {
  kind: 'milestone';
  description: string;
  achievedDate?: Date;
  celebrationNote?: string;
}
