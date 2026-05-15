import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { SynthesizeMirrorRequest, SynthesizeMirrorResponse } from '@/types/mirror';

export async function synthesizeMirror(
  req: SynthesizeMirrorRequest,
): Promise<string> {
  const callable = httpsCallable<SynthesizeMirrorRequest, SynthesizeMirrorResponse>(
    functions,
    'synthesizeMirror',
  );
  const result = await callable(req);
  return result.data.mirrorLine;
}
