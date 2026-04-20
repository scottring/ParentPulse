import { Timestamp } from 'firebase/firestore';

// Cross-view synthesis cache. Produced by the `synthesizeMoment`
// Cloud Function when a moment has >=2 views. All three lines are
// one sentence each; divergence/emergent may be null when the views
// don't warrant naming either.
export interface MomentSynthesis {
  agreementLine: string;
  divergenceLine: string | null;
  emergentLine: string | null;
  model: string;
  generatedAt: Timestamp;
}

// A moment holds 1..N views of the same lived event. Each view is a
// `journal_entries` doc with `momentId` pointing here. The moment doc
// itself carries metadata (title, dimensions, tags), a cached
// synthesis, and counters. It contains no private content — visibility
// of content is enforced per-view at the journal_entries layer.
export interface Moment {
  momentId: string;
  familyId: string;
  createdByUserId: string;

  // Optional author-editable metadata. Clients may update these.
  title?: string;
  dimensions?: string[]; // dimensionIds from the 20-dimension framework
  tags?: string[];

  // Participant userIds — the distinct set of authors who have a view
  // attached. Admin-SDK-maintained by the `synthesizeMoment` trigger,
  // not writable by clients on update (they seed it on create).
  participantUserIds: string[];

  // View count and last-view timestamp — admin-SDK-maintained so the
  // synthesis cache can be invalidated without scanning views.
  viewCount: number;
  lastViewAddedAt?: Timestamp;

  // Cached synthesis. Present when viewCount >= 2 and the trigger has
  // run at least once. Clients cannot write these fields.
  synthesis?: MomentSynthesis;
  synthesisUpdatedAt?: Timestamp;

  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
