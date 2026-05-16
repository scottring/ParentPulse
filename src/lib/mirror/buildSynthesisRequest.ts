import type { MirrorAnswer, SynthesizeMirrorRequest } from '@/types/mirror';

export function buildSynthesisRequest(
  prompt: string,
  answers: MirrorAnswer[],
): SynthesizeMirrorRequest {
  if (answers.length < 2) {
    throw new Error('Mirror needs at least two answers');
  }
  const shaped = answers.map((a) => ({ label: a.label, text: a.text.trim() }));
  if (shaped.some((a) => !a.text)) {
    throw new Error('Both chairs must be filled before revealing');
  }
  return { prompt, answers: shaped };
}
