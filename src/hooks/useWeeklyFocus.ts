'use client';

import { useState } from 'react';
import {
  doc,
  collection,
  setDoc,
  updateDoc,
  addDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { dyadKeyFromParticipantIds } from '@/lib/mirror/dyadKey';
import { synthesizeWeeklyFocus } from '@/lib/ritual-focus/synthesizeWeeklyFocusClient';
import { DYAD_FOCUSES_SUBCOLLECTION } from '@/types/ritual-focus';
import type {
  FocusSource,
  FocusWentWell,
  SynthesizeWeeklyFocusRequest,
  WeeklyFocus,
} from '@/types/ritual-focus';
import { MIRROR_COLLECTIONS } from '@/types/mirror';

/** Ask the Cloud Function for the one-thing proposal. Resilience
 *  (timeout / fallback to own words) is the caller's job — this just
 *  surfaces the proposal or throws. */
export async function requestWeeklyFocus(
  input: SynthesizeWeeklyFocusRequest,
): Promise<string> {
  return synthesizeWeeklyFocus(input);
}

function dyadKeyFor(participantIds: string[]): string {
  const ids = Array.from(
    new Set(participantIds.map((id) => id.trim()).filter(Boolean)),
  ).sort();
  return dyadKeyFromParticipantIds(ids);
}

/** Read the dyad's still-open focus for the revisit card. Returns null
 *  when there is nothing to revisit (no dyad, no focus, or already
 *  closed) so the next ritual simply skips the card. */
export async function getActiveDyadFocus(
  participantIds: string[],
): Promise<WeeklyFocus | null> {
  const dyadKey = dyadKeyFor(participantIds);
  const snap = await getDoc(doc(firestore, MIRROR_COLLECTIONS.DYADS, dyadKey));
  if (!snap.exists()) return null;
  const focus = (snap.data() as { currentFocus?: WeeklyFocus }).currentFocus;
  if (!focus || focus.status !== 'active') return null;
  return focus;
}

export interface SaveWeeklyFocusParams {
  familyId: string;
  participantIds: string[];
  ritualSessionId: string;
  text: string;
  source: FocusSource;
}

/** Write the confirmed focus onto the dyad + append the active
 *  history snapshot (append-only, unread in v1). */
export async function saveWeeklyFocus(
  params: SaveWeeklyFocusParams,
): Promise<{ dyadKey: string }> {
  const text = params.text.trim();
  if (!text) {
    throw new Error('A weekly focus needs text');
  }
  const participantIds = Array.from(
    new Set(params.participantIds.map((id) => id.trim()).filter(Boolean)),
  ).sort();
  const dyadKey = dyadKeyFor(participantIds);

  const currentFocus = {
    text,
    source: params.source,
    ritualSessionId: params.ritualSessionId,
    status: 'active' as const,
    createdAt: serverTimestamp(),
  };

  await setDoc(
    doc(firestore, MIRROR_COLLECTIONS.DYADS, dyadKey),
    {
      dyadKey,
      familyId: params.familyId,
      participantIds,
      currentFocus,
      lastFocusAt: serverTimestamp(),
    },
    { merge: true },
  );

  await addDoc(
    collection(firestore, MIRROR_COLLECTIONS.DYADS, dyadKey, DYAD_FOCUSES_SUBCOLLECTION),
    {
      text,
      source: params.source,
      ritualSessionId: params.ritualSessionId,
      familyId: params.familyId,
      status: 'active',
      createdAt: serverTimestamp(),
    },
  );

  return { dyadKey };
}

export interface RecordFocusOutcomeParams {
  familyId: string;
  participantIds: string[];
  focusText: string;
  wentWell: FocusWentWell;
  reflection: string;
}

/** Close the loop at the start of the next ritual: mark the dyad's
 *  focus revisited + append an immutable closed snapshot. */
export async function recordFocusOutcome(
  params: RecordFocusOutcomeParams,
): Promise<{ dyadKey: string }> {
  const dyadKey = dyadKeyFor(params.participantIds);
  const reflection = params.reflection.trim();

  await updateDoc(doc(firestore, MIRROR_COLLECTIONS.DYADS, dyadKey), {
    'currentFocus.status': 'revisited',
    'currentFocus.outcome': {
      wentWell: params.wentWell,
      reflection,
      revisitedAt: serverTimestamp(),
    },
  });

  await addDoc(
    collection(firestore, MIRROR_COLLECTIONS.DYADS, dyadKey, DYAD_FOCUSES_SUBCOLLECTION),
    {
      text: params.focusText.trim(),
      familyId: params.familyId,
      status: 'revisited',
      outcome: { wentWell: params.wentWell, reflection },
      createdAt: serverTimestamp(),
    },
  );

  return { dyadKey };
}

/** Thin UI state wrapper, mirrors useMirror's shape. */
export function useWeeklyFocus() {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const propose = async (input: SynthesizeWeeklyFocusRequest) => {
    setWorking(true);
    setError(null);
    try {
      return await requestWeeklyFocus(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Focus failed';
      setError(message);
      throw err;
    } finally {
      setWorking(false);
    }
  };

  return { propose, saveWeeklyFocus, recordFocusOutcome, working, error };
}
