import { Timestamp } from 'firebase/firestore';

// A MomentInvite is a request for another family member to add
// their own view onto a specific moment. Mode:
//   - 'blind'    — the recipient writes without seeing existing
//     views; the synthesis lands cleanly
//   - 'anchored' — the recipient sees existing views first
//
// Lifecycle: 'pending' → 'answered' (when recipient attaches a
// view) | 'declined'. Immutable fields: mode, prompt, fromUserId,
// toUserId, momentId, familyId, createdAt.
export type MomentInviteMode = 'blind' | 'anchored';
export type MomentInviteStatus = 'pending' | 'answered' | 'declined';

export interface MomentInvite {
  inviteId: string;
  familyId: string;
  momentId: string;
  fromUserId: string;
  toUserId: string;
  mode: MomentInviteMode;
  prompt?: string;                // optional framing from the sender
  status: MomentInviteStatus;
  createdAt: Timestamp;
  answeredAt?: Timestamp;
  answerEntryId?: string;         // journal_entries id the recipient wrote
}
