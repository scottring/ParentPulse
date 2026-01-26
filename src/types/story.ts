import type { Timestamp } from 'firebase/firestore';

// ==================== Story Character Types ====================

export type CompanionType = 'dragon' | 'robot' | 'fairy' | 'bear' | 'fox' | 'custom';
export type Personality = 'silly' | 'calm' | 'brave';
export type WorldType = 'town' | 'kingdom' | 'space' | 'forest';

export interface StoryCharacter {
  characterId: string;
  personId: string;
  familyId: string;

  // Companion (sidekick)
  companion: {
    type: CompanionType;
    customType?: string;
    name: string;
    personality: Personality;
  };

  // Hero (child's avatar)
  hero: {
    name: string;
    hairColor: string;
    hairStyle: string;
    skinTone: string;
    clothingStyle: string;
    avatarUrl?: string;
  };

  // World setting
  world: WorldType;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==================== Story Types ====================

export interface StoryArc {
  arcId: string;
  journeyId: string;
  personId: string;
  familyId: string;

  title: string;
  description: string;

  // Arc spans the 90-day journey
  phases: StoryPhase[];

  createdAt: Timestamp;
  status: 'active' | 'completed' | 'paused';
}

export interface StoryPhase {
  phaseNumber: number;
  title: string;
  dayRange: [number, number]; // e.g., [1, 30]
  chapterCount: number;
}

export interface StoryChapter {
  chapterId: string;
  arcId: string;
  personId: string;
  familyId: string;

  // Chapter metadata
  chapterNumber: number;
  title: string;
  description: string;

  // Tied to workbook focus
  weeklyFocusId?: string;
  weekNumber?: number;

  // Content
  pages: StoryPage[];

  // Cover image
  coverImageUrl?: string;

  // Status
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  unlockedAt?: Timestamp;
  completedAt?: Timestamp;

  createdAt: Timestamp;
}

export interface StoryPage {
  pageNumber: number;

  // Page content
  text: string;
  imageUrl?: string;
  imagePrompt?: string;

  // Optional discussion prompt
  discussionPrompt?: string;

  // Reading metadata
  readAt?: Timestamp;
}

export interface StoryProgress {
  progressId: string;
  personId: string;
  familyId: string;
  arcId: string;

  chaptersCompleted: number;
  totalChapters: number;

  currentChapterId?: string;
  currentPageNumber?: number;

  lastReadAt?: Timestamp;
}

// ==================== Character Setup Options ====================

export const COMPANION_OPTIONS: { type: CompanionType; emoji: string; name: string }[] = [
  { type: 'dragon', emoji: '🐉', name: 'Dragon' },
  { type: 'robot', emoji: '🤖', name: 'Robot' },
  { type: 'fairy', emoji: '🧚', name: 'Fairy' },
  { type: 'bear', emoji: '🐻', name: 'Bear' },
  { type: 'fox', emoji: '🦊', name: 'Fox' },
  { type: 'custom', emoji: '✨', name: 'Something else...' },
];

export const PERSONALITY_OPTIONS: { type: Personality; label: string; description: string }[] = [
  { type: 'silly', label: 'Silly & Playful', description: 'Loves jokes and making you laugh' },
  { type: 'calm', label: 'Calm & Wise', description: 'Thoughtful and always has good advice' },
  { type: 'brave', label: 'Brave & Adventurous', description: 'Ready to face any challenge' },
];

export const WORLD_OPTIONS: { type: WorldType; emoji: string; name: string; description: string }[] = [
  { type: 'town', emoji: '🏘️', name: 'Cozy Town', description: 'A friendly neighborhood' },
  { type: 'kingdom', emoji: '🏰', name: 'Magical Kingdom', description: 'Castles and enchantment' },
  { type: 'space', emoji: '🚀', name: 'Space Adventures', description: 'Among the stars' },
  { type: 'forest', emoji: '🌲', name: 'Enchanted Forest', description: 'Nature and wonder' },
];

export const HAIR_COLOR_OPTIONS = [
  { value: 'black', label: 'Black', color: '#1a1a1a' },
  { value: 'brown', label: 'Brown', color: '#5c4033' },
  { value: 'blonde', label: 'Blonde', color: '#f5d742' },
  { value: 'red', label: 'Red', color: '#b54040' },
  { value: 'auburn', label: 'Auburn', color: '#8b4513' },
];

export const HAIR_STYLE_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
  { value: 'curly', label: 'Curly' },
  { value: 'ponytail', label: 'Ponytail' },
  { value: 'braids', label: 'Braids' },
];

export const SKIN_TONE_OPTIONS = [
  { value: 'light', label: 'Light', color: '#ffe0bd' },
  { value: 'medium-light', label: 'Medium Light', color: '#e5c298' },
  { value: 'medium', label: 'Medium', color: '#c68642' },
  { value: 'medium-dark', label: 'Medium Dark', color: '#8d5524' },
  { value: 'dark', label: 'Dark', color: '#5c3317' },
];

export const CLOTHING_STYLE_OPTIONS = [
  { value: 'casual', label: 'Casual', description: 'T-shirt and jeans' },
  { value: 'adventurer', label: 'Adventurer', description: 'Explorer outfit' },
  { value: 'sporty', label: 'Sporty', description: 'Athletic wear' },
  { value: 'fancy', label: 'Fancy', description: 'Dressed up nice' },
];

// ==================== Firestore Collections ====================

export const STORY_COLLECTIONS = {
  CHARACTERS: 'story_characters',
  ARCS: 'story_arcs',
  CHAPTERS: 'story_chapters',
  PROGRESS: 'story_progress',
} as const;
