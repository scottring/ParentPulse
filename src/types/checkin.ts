// Check-in types

export interface CoherenceCheckin {
  checkinId: string;
  familyId: string;
  userId: string;
  week: string; // ISO week string, e.g. "2026-W07"
  responses: Record<string, CheckinResponse>; // keyed by manualId
  systemObservations: SystemObservation[];
  driftSignals?: DriftSignal[];
  createdAt: Date;
}

export interface CheckinResponse {
  manualId: string;
  reflectionText: string;
  alignmentRating: number; // 1-5
  driftNotes?: string;
}

export interface SystemObservation {
  id: string;
  text: string;
  relatedManualIds: string[];
  relatedEntryIds: string[];
  dismissedByUser: boolean;
  createdAt: Date;
}

export interface DriftSignal {
  id: string;
  description: string;
  manualId: string;
  domain: string;
  severity: 'gentle' | 'notable';
  acknowledged: boolean;
  createdAt: Date;
}
