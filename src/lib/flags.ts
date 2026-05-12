import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import {
  MESSAGE_FLAGS_COLLECTION,
  truncateQuote,
  type FlagChatKind,
  type FlagResponseKind,
  type FlagSenderRole,
  type FlagStatus,
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

export async function markFlagSeen(
  flagId: string,
  ctx: { currentStatus: FlagStatus },
): Promise<void> {
  // Idempotent: only transition open → seen.
  if (ctx.currentStatus !== 'open') return;
  await updateDoc(doc(firestore, MESSAGE_FLAGS_COLLECTION, flagId), {
    status: 'seen',
    seenAt: serverTimestamp(),
  });
}

export interface RespondInput {
  kind: FlagResponseKind;
  value: string;
}

export async function respondToFlag(
  flagId: string,
  input: RespondInput,
): Promise<void> {
  const trimmed = (input.value ?? '').trim();
  if (input.kind !== 'emoji' && trimmed.length === 0) {
    throw new Error('respondToFlag: a non-empty value is required for note/reply.');
  }
  await updateDoc(doc(firestore, MESSAGE_FLAGS_COLLECTION, flagId), {
    status: 'closed',
    response: {
      kind: input.kind,
      value: input.kind === 'emoji' ? input.value : trimmed,
      at: serverTimestamp(),
    },
    closedAt: serverTimestamp(),
  });
}
