export const VOICE_BYTES = 3_000_000;
export const VOICE_SECONDS = 120;
export const VOICE_TEXT_LIMIT = 12_000;
export const audioTypes: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};
export function audioExtension(type: string): string | undefined {
  return audioTypes[type.split(";")[0].trim().toLowerCase()];
}
export function audioMatches(bytes: Uint8Array, type: string): boolean {
  const ext = audioExtension(type),
    ascii = (start: number, end: number) =>
      String.fromCharCode(...bytes.slice(start, end));
  if (!ext || bytes.length < 12) return false;
  if (ext === "webm")
    return (
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  if (ext === "m4a") return ascii(4, 8) === "ftyp";
  if (ext === "mp3")
    return (
      ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    );
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
}
