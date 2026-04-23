import type { Timestamp } from 'firebase/firestore';

/**
 * A "coach closure" is what Relish distills from a coach-chat
 * conversation at the moment the user closes it. Mirrors the
 * distillChatToInsights pipeline that already exists for per-entry
 * chats, but scoped to the general coach conversation (which isn't
 * tied to any single journal entry).
 *
 * Written server-side by the distillCoachConversation Cloud
 * Function. Direct client creation is blocked in firestore.rules
 * so all closures flow through the function.
 */

export interface CoachClosure {
  closureId: string;
  userId: string;
  /** chat_conversations doc id this was distilled from. */
  conversationId: string;
  /** One-sentence emergent line — what the conversation was really about. */
  emergent: string;
  /** 2–4 short themes (each 2–5 words). */
  themes: string[];
  /** Number of user turns at close-time. */
  turnCount: number;
  /**
   * First user message, trimmed for the "We heard ..." echo on close
   * and on the workbook card.
   */
  firstUserEcho: string;
  /** Model that produced the distillation, for provenance. */
  model?: string;
  distilledAt: Timestamp;
  createdAt: Timestamp;
  /** Set when the user has opened the workbook with this closure present. */
  seenAt?: Timestamp;
}

export const COACH_CLOSURES_COLLECTION = 'coach_closures';
