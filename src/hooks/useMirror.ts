'use client';

import { useState } from 'react';
import {
  doc,
  collection,
  setDoc,
  addDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { dyadKeyFromParticipantIds } from '@/lib/mirror/dyadKey';
import { buildSynthesisRequest } from '@/lib/mirror/buildSynthesisRequest';
import { synthesizeMirror } from '@/lib/mirror/synthesizeMirrorClient';
import { MIRROR_COLLECTIONS, type MirrorAnswer } from '@/types/mirror';

export interface RunMirrorParams {
  familyId: string;
  stewardUserId: string;
  prompt: string;
  answers: MirrorAnswer[];
}

export async function runMirror(
  params: RunMirrorParams,
): Promise<{ mirrorLine: string; dyadKey: string }> {
  const { familyId, stewardUserId, prompt, answers } = params;
  const request = buildSynthesisRequest(prompt, answers);
  const dyadKey = dyadKeyFromParticipantIds(answers.map((a) => a.participantId));
  const participantIds = dyadKey.split('__');

  const mirrorLine = await synthesizeMirror(request);

  await setDoc(
    doc(firestore, MIRROR_COLLECTIONS.DYADS, dyadKey),
    {
      dyadKey,
      familyId,
      participantIds,
      lastEntryAt: serverTimestamp(),
      entryCount: increment(1),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(collection(firestore, MIRROR_COLLECTIONS.MIRROR_ENTRIES), {
    dyadKey,
    familyId,
    stewardUserId,
    prompt,
    answers: answers.map((a) => ({
      participantId: a.participantId,
      label: a.label,
      text: a.text.trim(),
    })),
    mirrorLine,
    createdAt: serverTimestamp(),
  });

  return { mirrorLine, dyadKey };
}

export function useMirror() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (params: RunMirrorParams) => {
    setSaving(true);
    setError(null);
    try {
      return await runMirror(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mirror failed';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { submit, saving, error };
}
