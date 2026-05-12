import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
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

/**
 * Guard against a sender double-submitting the same flag from two tabs/devices
 * while the prior flag is still open or seen. Closed/retracted flags do not
 * block a fresh flag on the same message.
 */
async function hasOpenFlagForMessage(input: {
  fromUserId: string;
  toUserId: string;
  chatId: string;
  messageId: string;
}): Promise<boolean> {
  const q = query(
    collection(firestore, MESSAGE_FLAGS_COLLECTION),
    where('fromUserId', '==', input.fromUserId),
    where('toUserId', '==', input.toUserId),
    where('chatId', '==', input.chatId),
    where('messageId', '==', input.messageId),
    where('status', 'in', ['open', 'seen']),
    limit(1),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createFlag(input: CreateFlagInput): Promise<string> {
  if (
    await hasOpenFlagForMessage({
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      chatId: input.chatId,
      messageId: input.messageId,
    })
  ) {
    throw new Error(
      `Already flagged: this message is already flagged for the recipient (and still open).`,
    );
  }
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
