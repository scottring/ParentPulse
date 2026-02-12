// Yearbook — a person's living activity book for the year

export interface Yearbook {
  yearbookId: string;
  familyId: string;
  personId: string;
  year: number; // 2026, 2027, etc.
  chapters: YearbookChapter[];
  developmentalBaseline?: DevelopmentalBaseline;
  createdAt: Date;
  updatedAt?: Date;
}

export interface YearbookChapter {
  id: string;
  title: string;
  description?: string;
  entryIds: string[];
  period?: { start: Date; end: Date };
  isActive: boolean;
}

// For children's yearbooks — system proposes, parents validate, adjusts from engagement
export interface DevelopmentalBaseline {
  age: number;
  proposedLevel: DevelopmentalLevel;
  parentValidated: boolean;
  parentAdjustments?: string;
  engagementAdjustments?: string[];
  lastAssessed: Date;
}

export type DevelopmentalLevel = 'early-childhood' | 'middle-childhood' | 'pre-teen' | 'teen' | 'adult';
