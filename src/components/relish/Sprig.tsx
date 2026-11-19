/** Colors for the sprig: the journal's sage, the cloth cover's gold. */
const tones = {
  sage: { stem: "#7d8f6a", leaves: ["#98aa84", "#a9b896"], vein: "#6f8160", opacity: 0.62 },
  gold: { stem: "#d6b25e", leaves: ["#d9b24e", "#e6c878"], vein: "#b8913a", opacity: 0.9 },
} as const;

/**
 * A painted-looking leaf sprig for page corners. Decorative. `berries` adds a
 * few dark berries at the tip, as on a kept passage.
 */
export default function Sprig({
  className,
  tone = "sage",
  berries = false,
}: {
  className: string;
  tone?: keyof typeof tones;
  berries?: boolean;
}) {
  const t = tones[tone];
  // Leaves on both sides of a curving stem, tip at top right.
  const leaves: [number, number, number, number][] = [
    [24, 92, -70, 1],
    [30, 86, 10, 0.95],
    [42, 72, -62, 1.05],
    [50, 66, 18, 1],
    [62, 52, -52, 1.1],
    [70, 46, 26, 1],
    [82, 34, -44, 1],
    [88, 30, 34, 0.9],
    [98, 20, -30, 0.85],
  ];
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 120 120"
      width="120"
      height="120"
    >
      <path
        d="M10 112 C 34 90, 60 60, 108 12"
        fill="none"
        stroke={t.stem}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      {leaves.map(([x, y, r, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${k})`}>
          <path
            d="M0 0 C 6 -9, 20 -10, 26 -2 C 18 4, 6 5, 0 0 Z"
            fill={t.leaves[i % 2]}
            opacity={t.opacity}
          />
          <path
            d="M1 -0.5 C 9 -3, 16 -3.5, 24 -2"
            fill="none"
            stroke={t.vein}
            strokeWidth="0.7"
            opacity="0.6"
          />
        </g>
      ))}
      {berries &&
        [
          [104, 10, 5],
          [112, 18, 4.5],
          [97, 4, 4],
          [110, 6, 3.5],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? "#4f6286" : "#3f5076"} opacity="0.85" />
        ))}
    </svg>
  );
}
