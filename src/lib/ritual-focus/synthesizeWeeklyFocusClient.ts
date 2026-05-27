import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type {
  SynthesizeWeeklyFocusRequest,
  SynthesizeWeeklyFocusResponse,
} from '@/types/ritual-focus';

export async function synthesizeWeeklyFocus(
  req: SynthesizeWeeklyFocusRequest,
): Promise<string> {
  const callable = httpsCallable<
    SynthesizeWeeklyFocusRequest,
    SynthesizeWeeklyFocusResponse
  >(functions, 'synthesizeWeeklyFocus');
  const result = await callable(req);
  return result.data.focus;
}
