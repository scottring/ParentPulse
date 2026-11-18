"use client";
import type { ReactNode } from "react";
import {
  illustrationSrc,
  isPainted,
  type IllustrationName,
} from "./illustrations";

/**
 * A small picture for a screen. Shows the watercolor when it has arrived
 * (listed in illustrations.ts), otherwise a simple drawn sketch in the same
 * palette. Always decorative: hidden from screen readers.
 */
export default function Illustration({
  name,
  size = 160,
  className = "",
}: {
  name: IllustrationName;
  size?: number | string;
  className?: string;
}) {
  // A number fixes the box; a length such as "100%" lets it fill and stay square.
  const style =
    typeof size === "number" ? { width: size, height: size } : { width: size };
  if (isPainted(name))
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={`ui-illustration ${className}`}
        src={illustrationSrc(name)}
        alt=""
        aria-hidden="true"
        width={typeof size === "number" ? size : undefined}
        height={typeof size === "number" ? size : undefined}
        style={style}
        data-illustration={name}
      />
    );
  return (
    <span
      className={`ui-illustration ui-sketch ${className}`}
      aria-hidden="true"
      style={style}
      data-illustration={name}
      data-sketch=""
    >
      <svg viewBox="0 0 200 200" focusable="false">
        <g fill="none">{sketch(name)}</g>
      </svg>
    </span>
  );
}

const OLIVE = "#43513a";
const INK = "#30382c";
const PAPER = "#fbf8ef";
const SAGE = "#cfdcc4";
const SUN = "#f2d58a";
const CLAY = "#e9b9a0";
const SKY = "#c9d9e3";
const LILAC = "#e4d6ea";
const GOLD = "#c9a24a";

/** A torn-edge wash, slightly different for every name. */
function Wash({ color, seed }: { color: string; seed: string }) {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) % 9973;
  const points: string[] = [];
  const steps = 44;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    n = (n * 7919 + 17) % 9973;
    const jitter = (n % 100) / 100;
    // A soft rounded square, edges roughened like torn paper.
    const r = 78 + jitter * 6;
    const sx = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.55);
    const sy = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.55);
    points.push(`${(100 + sx * r).toFixed(1)},${(100 + sy * r).toFixed(1)}`);
  }
  return <polygon points={points.join(" ")} fill={color} opacity={0.9} />;
}

const line = {
  stroke: OLIVE,
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const S = (props: Record<string, unknown>) => ({ ...line, ...props });

function Pencil({ x = 140, y = 60, r = 28 }: { x?: number; y?: number; r?: number }) {
  return (
    <g transform={`rotate(${r} ${x} ${y})`}>
      <rect x={x - 6} y={y} width="12" height="86" rx="2" fill="#56604a" />
      <path d={`M${x - 6} ${y}l6 -16 6 16z`} fill="#e8d3a8" />
      <path d={`M${x - 2} ${y - 11}l2 -5 2 5z`} fill={INK} />
      <rect x={x - 6} y={y + 80} width="12" height="8" fill={GOLD} />
      <rect x={x - 6} y={y + 88} width="12" height="7" rx="2" fill="#d4bcb4" />
    </g>
  );
}

function Book({
  x,
  y,
  w = 70,
  h = 90,
  cover = OLIVE,
  ribbon = SUN,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  cover?: string;
  ribbon?: string;
}) {
  return (
    <g>
      <rect x={x + 4} y={y + 4} width={w} height={h} rx="4" fill="#e9e3d0" />
      <rect x={x} y={y} width={w} height={h} rx="4" fill={cover} />
      <rect x={x} y={y} width="8" height={h} rx="3" fill="#000" opacity="0.15" />
      <path d={`M${x + w - 18} ${y + h}v16l5 -5 5 5v-16`} fill={ribbon} />
    </g>
  );
}

function Figure({ x, y, s = 1, fill = CLAY }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-30" r="10" fill={fill} {...line} />
      <path d="M-18 8c0-16 8-26 18-26s18 10 18 26" fill={fill} {...line} />
    </g>
  );
}

function sketch(name: IllustrationName): ReactNode {
  switch (name) {
    case "welcome":
      return (
        <>
          <Wash color={SUN} seed={name} />
          <path d="M30 140h140" {...S({})} />
          <path d="M52 132l46-12 46 12-46 6z" fill={PAPER} {...line} />
          <path d="M98 120v18" {...line} />
          <rect x="138" y="104" width="22" height="24" rx="4" fill={CLAY} {...line} />
          <path d="M160 110c8 0 8 12 0 12" {...line} />
          <path d="M44 132v-18M44 114c-8-4-10-12-6-18M44 114c8-4 10-12 6-18" {...S({ stroke: "#6f7f5a" })} />
          <circle cx="150" cy="52" r="12" fill={SUN} {...line} />
        </>
      );
    case "home":
      return (
        <>
          <Wash color={SUN} seed={name} />
          <circle cx="70" cy="70" r="20" fill={SUN} {...line} />
          <path d="M70 38v-8M70 110v-8M38 70h-8M110 70h-8M48 48l-6-6M92 92l6 6M48 92l-6 6M92 48l6-6" {...line} />
          <Figure x={118} y={150} fill={CLAY} />
          <Figure x={152} y={156} s={0.75} fill={SAGE} />
          <Figure x={88} y={158} s={0.65} fill={SKY} />
        </>
      );
    case "do-something":
      return (
        <>
          <Wash color={CLAY} seed={name} />
          <rect x="46" y="62" width="70" height="92" rx="6" fill={PAPER} {...line} transform="rotate(-10 81 108)" />
          <rect x="70" y="56" width="70" height="92" rx="6" fill={PAPER} {...line} transform="rotate(6 105 102)" />
          <path d="M88 84h36M88 98h30M88 112h34" {...S({ strokeWidth: 2.5 })} transform="rotate(6 105 102)" />
          <circle cx="150" cy="150" r="13" fill={SUN} {...line} />
          <Pencil x={48} y={120} r={-38} />
        </>
      );
    case "your-book":
      return (
        <>
          <Wash color={LILAC} seed={name} />
          <path d="M58 70l70-6 4 82-70 6z" fill={PAPER} {...line} />
          <path d="M54 76l72-4 4 84-72 4z" fill={OLIVE} />
          <path d="M60 96l66-4" stroke={SUN} strokeWidth="6" />
          <path d="M62 96c-14 10-10 30 4 30" fill="none" stroke={SUN} strokeWidth="4" strokeLinecap="round" />
          <path d="M130 84l12 2M131 104l10 1M131 124l12 0" {...S({ stroke: "#b9b3a3" })} />
        </>
      );
    case "family":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <ellipse cx="100" cy="102" rx="66" ry="54" fill="#e6dcc4" {...line} />
          <circle cx="100" cy="102" r="20" fill={PAPER} {...line} />
          <path d="M92 98c4 6 12 6 16 0" {...S({ stroke: CLAY })} />
          {[
            [60, 72, CLAY],
            [140, 72, SKY],
            [60, 134, SUN],
            [140, 134, LILAC],
          ].map(([x, y, c]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x as number} cy={y as number} r="11" fill={c as string} {...line} />
              <circle cx={x as number} cy={y as number} r="5" fill="#8b6a4a" />
            </g>
          ))}
        </>
      );
    case "empty-pages":
      return (
        <>
          <Wash color={SUN} seed={name} />
          <path d="M100 70c-20-10-44-10-60-4v80c16-6 40-6 60 4z" fill={PAPER} {...line} />
          <path d="M100 70c20-10 44-10 60-4v80c-16-6-40-6-60 4z" fill={PAPER} {...line} />
          <path d="M100 70v80" {...line} />
          <Pencil x={128} y={84} r={52} />
        </>
      );
    case "saved":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <Book x={62} y={58} w={80} h={96} />
          <path d="M100 40v60l8-8 8 8v-60" fill={SUN} {...S({ stroke: GOLD, strokeWidth: 2 })} />
          <path d="M150 52l6-6M158 66h8M146 40l2-8" {...S({ stroke: GOLD })} />
        </>
      );
    case "locked":
      return (
        <>
          <Wash color={SKY} seed={name} />
          <Book x={60} y={56} w={80} h={96} ribbon={SAGE} />
          <rect x="128" y="94" width="24" height="22" rx="4" fill={GOLD} {...S({ stroke: "#8a6a2a", strokeWidth: 2 })} />
          <circle cx="140" cy="105" r="3" fill="#6b5320" />
        </>
      );
    case "jot":
      return (
        <>
          <Wash color={SUN} seed={name} />
          <rect x="52" y="60" width="78" height="78" rx="3" fill="#fff3b8" {...line} transform="rotate(-6 91 99)" />
          <path d="M64 86h50M64 102h40M64 118h46" {...S({ strokeWidth: 2.5 })} transform="rotate(-6 91 99)" />
          <Pencil x={146} y={52} r={24} />
        </>
      );
    case "voice":
      return (
        <>
          <Wash color={SUN} seed={name} />
          <rect x="82" y="44" width="36" height="66" rx="18" fill={PAPER} {...line} />
          <path d="M90 62h20M90 76h20M90 90h20" {...S({ strokeWidth: 2 })} />
          <path d="M66 92c0 24 16 36 34 36s34-12 34-36M100 128v24M80 156h40" {...line} />
        </>
      );
    case "think-it-through":
    case "guided-listen":
    case "guided-ask":
    case "guided-joy":
      return (
        <>
          <Wash color={SKY} seed={name} />
          <path d="M40 160c30-6 34-26 60-30s30-26 48-44" {...S({ strokeWidth: 14, stroke: PAPER })} />
          <path d="M40 160c30-6 34-26 60-30s30-26 48-44" {...S({ strokeDasharray: "2 10" })} />
          <path d="M136 72h30M140 72v14M162 72v14M134 66h34" {...line} />
          <path d="M48 70c6-12 18-12 24 0M60 58v-8" {...S({ stroke: "#6f7f5a" })} />
          {name === "guided-listen" && <path d="M150 120c10 0 14 8 14 16s-8 12-12 18" {...line} />}
          {name === "guided-ask" && <path d="M152 130v-26l8 4" {...line} />}
          {name === "guided-joy" && <circle cx="156" cy="124" r="10" fill={CLAY} {...line} />}
        </>
      );
    case "helps-when-upset":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          {[0, 6, 12].map((d) => (
            <rect key={d} x={44 + d} y={70 - d} width="50" height="70" rx="5" fill={PAPER} {...line} />
          ))}
          {[0, 6, 12].map((d) => (
            <rect key={`b${d}`} x={110 + d} y={76 - d} width="50" height="70" rx="5" fill={PAPER} {...line} />
          ))}
          <path d="M147 92c-4-8-16-4-12 6l12 12 12-12c4-10-8-14-12-6z" fill={CLAY} {...S({ strokeWidth: 2 })} />
        </>
      );
    case "drains-and-fills":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <path d="M44 66h44v80a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8z" fill={PAPER} {...line} />
          <path d="M46 132h40v14a6 6 0 0 1-6 6H52a6 6 0 0 1-6-6z" fill={SKY} />
          <path d="M112 66h44v80a8 8 0 0 1-8 8h-28a8 8 0 0 1-8-8z" fill={PAPER} {...line} />
          <path d="M114 92h40v54a6 6 0 0 1-6 6h-28a6 6 0 0 1-6-6z" fill={SKY} />
          <path d="M66 60v-14M134 46v14l-6-6M134 60l6-6" {...line} />
        </>
      );
    case "under-the-behavior":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <path d="M34 92h132" {...S({ stroke: "#5f7a8a" })} />
          <path d="M84 92l12-26 10 10 8-6 8 22z" fill={PAPER} {...line} />
          <path d="M70 92l-14 30 26 34 44-4 22-36-18-24z" fill="#eaf1f4" {...S({ stroke: "#7d93a0" })} />
        </>
      );
    case "who-carries-what":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <path d="M40 104h44l-4 48H44z" fill="#d9c49a" {...line} />
          <path d="M50 104c0-20 24-20 24 0" {...line} />
          <path d="M98 88h36l-3 64h-30z" fill={CLAY} {...line} />
          <path d="M106 88c0-16 20-16 20 0" {...line} />
          <path d="M140 124h26l-2 28h-22z" fill={SUN} {...line} />
          <path d="M146 124c0-10 14-10 14 0" {...line} />
        </>
      );
    case "rewrite-the-opener":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <path d="M44 92l14-18 20 6 12 22-10 24-26 4-14-18z" fill="#efe8d6" {...line} />
          <path d="M56 96l14 6M62 112l12-4" {...S({ strokeWidth: 2 })} />
          <path d="M108 70h56v60h-56z" fill={PAPER} {...line} />
          <path d="M108 70l28 26 28-26" {...line} />
          <path d="M98 100h6" {...line} />
        </>
      );
    case "thought-on-trial":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <path d="M100 48v100M70 150h60M52 76h96" {...line} />
          <path d="M52 76l-16 34h32zM148 76l-16 34h32z" fill="none" {...S({ strokeWidth: 2 })} />
          <path d="M36 110a16 8 0 0 0 32 0z" fill={PAPER} {...line} />
          <path d="M132 110a16 8 0 0 0 32 0z" fill={PAPER} {...line} />
          <path d="M44 104c6-10 14-12 20-14" {...S({ stroke: "#8a8d80", strokeWidth: 2 })} />
          <ellipse cx="148" cy="104" rx="10" ry="7" fill="#9a9a8c" {...line} />
        </>
      );
    case "unseen-work":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <rect x="40" y="110" width="120" height="44" rx="4" fill={PAPER} {...line} />
          <path d="M60 110v-6h80v6" {...line} />
          <path d="M110 104v-30h18v8" {...line} />
          <path d="M70 44h60l-12 18H82z" fill={SUN} {...line} />
          <path d="M100 30v14M78 62l-20 44M122 62l20 44" {...S({ stroke: "#e2c46e", strokeWidth: 2 })} />
          <circle cx="76" cy="128" r="8" fill={SKY} {...S({ strokeWidth: 2 })} />
        </>
      );
    case "plan-a-repair":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <path d="M58 82h80l-8 50a14 14 0 0 1-14 12H80a14 14 0 0 1-14-12z" fill={PAPER} {...line} />
          <path d="M138 92c18 0 18 26-4 26" {...line} />
          <path d="M92 82l8 20-10 16 6 26" fill="none" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="98" cy="152" rx="52" ry="7" fill={PAPER} {...line} />
        </>
      );
    case "real-hellos":
      return (
        <>
          <Wash color={LILAC} seed={name} />
          <path d="M60 156V52h80v104" fill="#fff1c9" {...line} />
          <path d="M60 52l46 10v100l-46-6z" fill={OLIVE} {...line} />
          <circle cx="96" cy="108" r="3.5" fill={SUN} />
          <path d="M112 72l40-10M114 100h44M112 128l40 10" {...S({ stroke: "#e2c46e", strokeWidth: 2 })} />
        </>
      );
    case "specific-thanks":
      return (
        <>
          <Wash color={LILAC} seed={name} />
          <rect x="50" y="96" width="96" height="56" rx="4" fill={PAPER} {...line} transform="rotate(-8 98 124)" />
          <rect x="56" y="82" width="96" height="56" rx="4" fill={PAPER} {...line} transform="rotate(4 104 110)" />
          <rect x="60" y="66" width="96" height="56" rx="4" fill="#fffaf0" {...line} />
          <path d="M108 66v56M60 94h96" stroke="#b88c77" strokeWidth="2.5" />
          <path d="M108 94c-10-10-20-4-12 4M108 94c10-10 20-4 12 4" {...S({ stroke: "#b88c77", strokeWidth: 2.5 })} />
        </>
      );
    case "repair-bingo":
      return (
        <>
          <Wash color={SAGE} seed={name} />
          <g transform="rotate(-8 100 100)">
            <rect x="40" y="40" width="112" height="112" rx="3" fill={PAPER} {...S({ stroke: "#8a8f80", strokeWidth: 2 })} />
            <path d="M77 42v108M115 42v108M42 77h108M42 115h108" {...S({ stroke: "#8a8f80", strokeWidth: 2 })} />
            <path d="M50 58l7 7 12-15M124 132l7 7 12-15" {...S({ stroke: "#7d8f3e", strokeWidth: 3.5 })} />
            <circle cx="96" cy="96" r="11" fill={SUN} stroke={GOLD} strokeWidth="2" />
          </g>
          <Pencil x={168} y={70} r={20} />
        </>
      );
    case "small-joy":
      return (
        <>
          <Wash color={CLAY} seed={name} />
          <path d="M40 150c20-6 40-6 58-14l20-10c8-4 4-14-4-12l-24 6" fill="#f3d9c6" {...line} />
          <rect x="86" y="76" width="40" height="34" rx="3" fill={SUN} {...line} />
          <path d="M106 76v34M86 92h40M106 76c-10-14-22-4-10 0M106 76c10-14 22-4 10 0" {...S({ stroke: "#b06a52", strokeWidth: 2.5 })} />
        </>
      );
    case "story-voices":
      return (
        <>
          <Wash color={CLAY} seed={name} />
          <path d="M30 140c20-12 40 12 60 0s40-12 60 0 20 6 24 4" {...S({ stroke: "#8aa1b0" })} />
          <path d="M30 156c20-12 40 12 60 0s40-12 60 0" {...S({ stroke: "#8aa1b0" })} />
          <path d="M66 120h70l-14 18H80z" fill={PAPER} {...line} />
          <path d="M100 120V62l30 50z" fill="#fffaf0" {...line} />
          <path d="M98 70l-24 42h24" fill={PAPER} {...line} />
        </>
      );
    case "same-page":
      return (
        <>
          <Wash color={CLAY} seed={name} />
          {[34, 104].map((x) => (
            <g key={x}>
              <path d={`M${x + 31} 76c-10-6-22-6-31-2v62c9-4 21-4 31 2z`} fill={PAPER} {...line} />
              <path d={`M${x + 31} 76c10-6 22-6 31-2v62c-9-4-21-4-31 2z`} fill={PAPER} {...line} />
              <path d={`M${x + 44} 72v40l5-5 5 5v-41`} fill={SAGE} {...S({ strokeWidth: 2 })} />
            </g>
          ))}
        </>
      );
    case "kid-cover":
      return <Book x={50} y={34} w={100} h={132} />;
    case "kid-kindness-spotting":
      return (
        <g {...S({ stroke: "#5a5f52", strokeWidth: 2 })}>
          <circle cx="62" cy="72" r="12" />
          <path d="M54 88c-10 10-12 26-6 38l14 4 6 22M62 90l18 20 20 26M48 126l-8 26h14" />
          <circle cx="138" cy="72" r="12" />
          <path d="M130 66c-8-10 4-18 14-12 6 4 10 0 10-6" />
          <path d="M146 88c10 10 12 26 6 38l-14 4-6 22M138 90l-18 20-18 24M152 126l8 26h-14" />
          <path d="M70 168c20 4 40 4 60 0M86 160l18-6M108 162l16 4" {...S({ stroke: "#a9ad9c", strokeWidth: 2 })} />
        </g>
      );
    default:
      if (name.startsWith("emblem-")) return <Emblem kind={name.slice(7)} />;
      return <Wash color={SAGE} seed={name} />;
  }
}

/** Gold-foil line emblems for a child's cloth cover. */
export function Emblem({ kind, color = "#d6b25e" }: { kind: string; color?: string }) {
  const g = { fill: "none", stroke: color, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "beetle":
      return (
        <g {...g}>
          <ellipse cx="100" cy="112" rx="30" ry="40" />
          <path d="M100 72v80M78 92h44M80 116h40M84 136h32" />
          <circle cx="100" cy="64" r="12" />
          <path d="M92 54l-10-14M108 54l10-14M72 96l-24-10M72 116h-26M74 136l-22 14M128 96l24-10M128 116h26M126 136l22 14" />
        </g>
      );
    case "fox":
      return (
        <g {...g}>
          <path d="M60 60l18 34M140 60l-18 34M60 60l-2 46 42 46 42-46-2-46-20 22H80z" />
          <circle cx="84" cy="112" r="3" fill={color} />
          <circle cx="116" cy="112" r="3" fill={color} />
          <path d="M94 132l6 6 6-6" />
        </g>
      );
    case "whale":
      return (
        <g {...g}>
          <path d="M40 112c0-26 30-40 66-36s48 26 44 44c-4 16-24 24-54 24-34 0-56-12-56-32z" />
          <path d="M150 116c10-6 18-18 18-26M150 116c12-2 22 0 28 6" />
          <circle cx="76" cy="108" r="3" fill={color} />
          <path d="M96 62c0-10 8-16 8-24M96 62c-6-6-14-6-18-4" />
        </g>
      );
    case "star":
      return (
        <g {...g}>
          <path d="M100 40l16 40 42 2-32 26 12 42-38-24-38 24 12-42-32-26 42-2z" />
        </g>
      );
    case "leaf":
      return (
        <g {...g}>
          <path d="M60 150c0-60 30-96 90-104 4 64-30 104-90 104z" />
          <path d="M60 150c20-30 44-56 76-86M84 122l-4-24M104 100l-2-22M104 100l24 2M84 122l26 2" />
        </g>
      );
    default:
      return (
        <g {...g}>
          <path d="M120 44a56 56 0 1 0 36 96 46 46 0 1 1-36-96z" />
          <path d="M140 64l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        </g>
      );
  }
}
