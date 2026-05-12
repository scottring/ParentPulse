import type { Timestamp } from 'firebase/firestore';

export const MESSAGE_FLAGS_COLLECTION = 'message_flags';

export type FlagChatKind = 'coach' | 'entry_chat';
export type FlagSenderRole = 'user' | 'assistant';
export type FlagStatus = 'open' | 'seen' | 'closed' | 'retracted';
export type FlagResponseKind = 'emoji' | 'note' | 'reply';

export interface FlagResponse {
  kind: FlagResponseKind;
  value: string;
  at: Timestamp;
}

export interface MessageFlag {
  flagId: string;
  fromUserId: string;
  toUserId: string;
  chatKind: FlagChatKind;
  chatId: string;
  messageId: string;
  senderRole: FlagSenderRole;
  /** Max ~280 chars. Truncated with ellipsis at create time. */
  quoteText: string;
  note?: string;
  needsRealReply: boolean;
  status: FlagStatus;
  seenAt?: Timestamp;
  closedAt?: Timestamp;
  response?: FlagResponse;
  createdAt: Timestamp;
}

export const MAX_QUOTE_CHARS = 280;

export function truncateQuote(raw: string): string {
  const trimmed = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (trimmed.length <= MAX_QUOTE_CHARS) return trimmed;
  return trimmed.slice(0, MAX_QUOTE_CHARS - 1).trimEnd() + '…';
}
