/**
 * Returns an HSL color string that transitions from red → amber → green
 * based on completion ratio (0 to 1).
 *
 * 0%   = hsl(15, 80%, 50%)  — red-orange (not enough data)
 * 30%  = hsl(35, 80%, 50%)  — amber (getting there)
 * 60%  = hsl(60, 70%, 45%)  — yellow-green (enough for basic inferences)
 * 100% = hsl(140, 60%, 40%) — green (rich data)
 */
export function progressColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));

  // Hue: 15 (red-orange) → 140 (green)
  const hue = 15 + clamped * 125;

  // Saturation: 80% → 60%
  const sat = 80 - clamped * 20;

  // Lightness: 50% → 40%
  const light = 50 - clamped * 10;

  return `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(light)}%)`;
}
