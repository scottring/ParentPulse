import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import {
  MESSAGE_FLAGS_COLLECTION,
  truncateQuote,
  type FlagChatKind,
  type FlagSenderRole,
} from '@/types/flag';

export interface CreateFlagInput {
  fromUserId: string;
  toUserId: string;
  chatKind: FlagChatKind;
  chatId: string;
  messageId: string;
  senderRole: FlagSenderRole;
  quoteText: string;
  note?: string;
  needsRealReply: boolean;
}

export async function createFlag(input: CreateFlagInput): Promise<string> {
  const payload: Record<string, unknown> = {
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    chatKind: input.chatKind,
    chatId: input.chatId,
    messageId: input.messageId,
    senderRole: input.senderRole,
    quoteText: truncateQuote(input.quoteText),
    needsRealReply: input.needsRealReply,
    status: 'open',
    createdAt: serverTimestamp(),
  };
  if (input.note && input.note.trim().length > 0) {
    payload.note = input.note.trim();
  }
  const ref = await addDoc(
    collection(firestore, MESSAGE_FLAGS_COLLECTION),
    payload,
  );
  return ref.id;
}
