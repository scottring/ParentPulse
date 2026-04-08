'use client';

import { useMemo } from 'react';
import type { ClimateState } from '@/lib/climate-engine';

// Pre-computed sun ray coordinates to avoid hydration mismatches
const SUN_RAYS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
  const rad = (angle * Math.PI) / 180;
  return {
    angle,
    x1: Math.round((60 + Math.cos(rad) * 35) * 100) / 100,
    y1: Math.round((60 + Math.sin(rad) * 35) * 100) / 100,
    x2: Math.round((60 + Math.cos(rad) * 52) * 100) / 100,
    y2: Math.round((60 + Math.sin(rad) * 52) * 100) / 100,
  };
});

interface WeatherBackgroundProps {
  climate: ClimateState;
  children: React.ReactNode;
}

// Full-viewport weather configs keyed to climate state
const WEATHER_CONFIGS: Record<ClimateState, {
  sky: string;       // full viewport gradient
  sunOpacity: number;
  sunScale: number;
  cloudCount: number;
  cloudOpacity: number;
  cloudSpeed: 'slow' | 'medium' | 'fast';
  rainDrops: number;
  hazeOpacity: number;
  glowColor: string;
}> = {
  clear: {
    sky: 'linear-gradient(180deg, #87CEEB 0%, #B8E0F0 30%, #E8F4F8 60%, #FFF8E7 85%, #FFE4B5 100%)',
    sunOpacity: 1,
    sunScale: 1,
    cloudCount: 0,
    cloudOpacity: 0,
    cloudSpeed: 'slow',
    rainDrops: 0,
    hazeOpacity: 0,
    glowColor: 'rgba(255, 200, 50, 0.15)',
  },
  mostly_sunny: {
    sky: 'linear-gradient(180deg, #8CBBD4 0%, #B0D4E8 30%, #D8E8F0 55%, #F0EDE4 80%, #F5ECD8 100%)',
    sunOpacity: 0.85,
    sunScale: 0.9,
    cloudCount: 2,
    cloudOpacity: 0.6,
    cloudSpeed: 'slow',
    rainDrops: 0,
    hazeOpacity: 0.05,
    glowColor: 'rgba(255, 200, 50, 0.1)',
  },
  partly_cloudy: {
    sky: 'linear-gradient(180deg, #9AAFC0 0%, #B8C8D4 30%, #CDD5DC 55%, #DDD8D1 80%, #E8E3DC 100%)',
    sunOpacity: 0.4,
    sunScale: 0.7,
    cloudCount: 4,
    cloudOpacity: 0.8,
    cloudSpeed: 'medium',
    rainDrops: 0,
    hazeOpacity: 0.1,
    glowColor: 'rgba(200, 190, 170, 0.1)',
  },
  overcast: {
    sky: 'linear-gradient(180deg, #7A8B96 0%, #909DA6 25%, #A8B0B6 50%, #B8BFC4 75%, #C8CDD0 100%)',
    sunOpacity: 0,
    sunScale: 0,
    cloudCount: 6,
    cloudOpacity: 0.9,
    cloudSpeed: 'medium',
    rainDrops: 8,
    hazeOpacity: 0.2,
    glowColor: 'rgba(150, 160, 170, 0.1)',
  },
  stormy: {
    sky: 'linear-gradient(180deg, #4A5568 0%, #5A6577 20%, #6B7280 45%, #7A8494 70%, #8A94A0 100%)',
    sunOpacity: 0,
    sunScale: 0,
    cloudCount: 8,
    cloudOpacity: 1,
    cloudSpeed: 'fast',
    rainDrops: 20,
    hazeOpacity: 0.3,
    glowColor: 'rgba(100, 110, 130, 0.15)',
  },
};

// Deterministic pseudo-random for consistent cloud positions
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export default function WeatherBackground({ climate, children }: WeatherBackgroundProps) {
  const config = WEATHER_CONFIGS[climate];

  const clouds = useMemo(() => {
    return Array.from({ length: config.cloudCount }, (_, i) => {
      const seed = i + 1;
      const y = 5 + seededRandom(seed) * 35; // top 5-40% of viewport
      const size = 0.6 + seededRandom(seed * 2) * 0.8; // 0.6 - 1.4 scale
      const delay = seededRandom(seed * 3) * 30; // 0-30s delay
      const speedClass =
        config.cloudSpeed === 'slow' ? 'animate-cloud-drift-slow' :
        config.cloudSpeed === 'fast' ? 'animate-cloud-drift-fast' :
        'animate-cloud-drift';
      return { id: i, y, size, delay, speedClass };
    });
  }, [config.cloudCount, config.cloudSpeed]);

  const rainDrops = useMemo(() => {
    return Array.from({ length: config.rainDrops }, (_, i) => {
      const x = seededRandom(i * 7 + 3) * 100;
      const delay = seededRandom(i * 11 + 5) * 2;
      const duration = 0.6 + seededRandom(i * 13 + 7) * 0.6;
      const opacity = 0.2 + seededRandom(i * 17 + 11) * 0.4;
      return { id: i, x, delay, duration, opacity };
    });
  }, [config.rainDrops]);

  return (
    <div
      className="fixed inset-0 overflow-hidden transition-all duration-[2000ms] ease-in-out"
      style={{ background: config.sky }}
      suppressHydrationWarning
    >
      {/* Sun */}
      {config.sunOpacity > 0 && (
        <div
          className="absolute animate-sun-pulse"
          style={{
            top: '6%',
            right: '12%',
            width: `${120 * config.sunScale}px`,
            height: `${120 * config.sunScale}px`,
            opacity: config.sunOpacity,
            transition: 'opacity 2s, transform 2s',
          }}
        >
          {/* Outer glow */}
          <div
            className="absolute inset-0 rounded-full animate-sun-glow"
            style={{
              background: 'radial-gradient(circle, rgba(255,200,60,0.3) 0%, rgba(255,180,40,0.1) 50%, transparent 70%)',
              transform: 'scale(2.5)',
            }}
          />
          {/* Sun rays */}
          <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full animate-sun-rotate">
            {SUN_RAYS.map((ray) => (
              <line
                key={ray.angle}
                x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2}
                stroke="rgba(255,190,60,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>
          {/* Sun body */}
          <div
            className="absolute rounded-full"
            style={{
              top: '25%',
              left: '25%',
              width: '50%',
              height: '50%',
              background: 'radial-gradient(circle at 40% 40%, #FFE082, #FFB74D, #FFA726)',
              boxShadow: '0 0 40px rgba(255,183,77,0.4), 0 0 80px rgba(255,167,38,0.2)',
            }}
          />
        </div>
      )}

      {/* Clouds */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className={cloud.speedClass}
          style={{
            position: 'absolute',
            top: `${cloud.y}%`,
            left: '-20%',
            animationDelay: `${cloud.delay}s`,
            opacity: config.cloudOpacity,
            transform: `scale(${cloud.size})`,
            transition: 'opacity 2s',
          }}
        >
          <CloudSVG />
        </div>
      ))}

      {/* Rain */}
      {rainDrops.map((drop) => (
        <div
          key={drop.id}
          className="animate-rain-fall"
          style={{
            position: 'absolute',
            left: `${drop.x}%`,
            top: '-5%',
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
          }}
        >
          <div
            style={{
              width: '2px',
              height: '18px',
              background: `linear-gradient(180deg, transparent, rgba(180,200,220,${drop.opacity}))`,
              borderRadius: '1px',
            }}
          />
        </div>
      ))}

      {/* Light rays — subtle god-rays when sun is visible */}
      {config.sunOpacity > 0.3 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `conic-gradient(
              from 200deg at 85% 15%,
              transparent 0deg,
              rgba(255,220,130,${0.03 * config.sunOpacity}) 10deg,
              transparent 25deg,
              rgba(255,220,130,${0.02 * config.sunOpacity}) 40deg,
              transparent 55deg,
              rgba(255,220,130,${0.04 * config.sunOpacity}) 70deg,
              transparent 90deg,
              transparent 360deg
            )`,
            opacity: config.sunOpacity,
            transition: 'opacity 2s',
          }}
        />
      )}

      {/* Atmospheric haze overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-[2000ms]"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${config.glowColor}, transparent 70%)`,
          opacity: config.hazeOpacity > 0 ? 1 : 0,
        }}
      />

      {/* Horizon fog — ground haze for depth */}
      <div className="absolute inset-0 horizon-fog pointer-events-none" />

      {/* Grain texture — very subtle film grain for atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: 0.12,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Skyline — neighborhood silhouette anchoring the ground */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '140px', overflow: 'hidden' }}
      >
        <div className="animate-skyline-scroll" style={{ width: '200%', height: '100%', display: 'flex' }}>
          <SkylineSVG opacity={climate === 'stormy' ? 0.3 : climate === 'overcast' ? 0.35 : 0.2} />
          <SkylineSVG opacity={climate === 'stormy' ? 0.3 : climate === 'overcast' ? 0.35 : 0.2} />
        </div>
      </div>

      {/* Content layer — scrollable over fixed weather */}
      <div className="fixed inset-0 z-10 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// Neighborhood skyline silhouette — houses, trees, steeple, rooftops
function SkylineSVG({ opacity }: { opacity: number }) {
  const fill = `rgba(40, 35, 30, ${opacity})`;
  const fillLight = `rgba(40, 35, 30, ${opacity * 0.6})`;
  // viewBox is wide so the pattern tiles seamlessly (both copies identical)
  return (
    <svg
      width="100%"
      height="140"
      viewBox="0 0 1600 140"
      preserveAspectRatio="none"
      fill="none"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Background tree line — distant trees */}
      <path
        d={`M0,100 C20,85 35,90 50,82 C60,78 70,85 85,80 C95,77 110,82 125,78
            C140,75 150,80 165,76 C175,73 190,78 210,74 C225,71 240,76 260,73
            C275,70 290,75 310,72 C325,68 340,74 360,70 C380,67 400,73 420,69
            C440,66 460,72 480,68 C500,65 520,71 540,67 C560,64 580,70 600,66
            C620,63 640,69 660,65 C680,62 700,68 720,64 C740,61 760,67 780,63
            C800,60 820,66 840,62 C860,59 880,65 900,61 C920,58 940,64 960,60
            C980,57 1000,63 1020,59 C1040,56 1060,62 1080,58 C1100,55 1120,61 1140,57
            C1160,54 1180,60 1200,56 C1220,53 1240,59 1260,55 C1280,52 1300,58 1320,54
            C1340,51 1360,57 1380,53 C1400,50 1420,56 1440,52 C1460,49 1480,55 1500,51
            C1520,48 1540,54 1560,50 C1580,47 1600,53 1600,140 L0,140 Z`}
        fill={fillLight}
      />

      {/* Houses and buildings */}
      {/* House 1 — small cottage */}
      <rect x="30" y="90" width="40" height="50" fill={fill} />
      <polygon points="25,90 50,68 75,90" fill={fill} />
      <rect x="45" y="105" width="10" height="15" fill={fillLight} />

      {/* Tree 1 */}
      <rect x="90" y="95" width="5" height="25" fill={fill} />
      <ellipse cx="92" cy="85" rx="15" ry="18" fill={fill} />

      {/* House 2 — two-story */}
      <rect x="120" y="75" width="50" height="65" fill={fill} />
      <polygon points="115,75 145,55 175,75" fill={fill} />
      <rect x="130" y="85" width="8" height="8" fill={fillLight} />
      <rect x="152" y="85" width="8" height="8" fill={fillLight} />
      <rect x="140" y="115" width="12" height="20" fill={fillLight} />

      {/* Tree 2 */}
      <rect x="190" y="90" width="4" height="30" fill={fill} />
      <polygon points="178,90 192,55 206,90" fill={fill} />

      {/* Church/steeple */}
      <rect x="230" y="70" width="35" height="70" fill={fill} />
      <polygon points="228,70 247,40 267,70" fill={fill} />
      <rect x="245" y="42" width="4" height="15" fill={fill} />
      <rect x="240" y="90" width="15" height="20" rx="7.5" fill={fillLight} />

      {/* Tree 3 — round */}
      <rect x="285" y="88" width="5" height="28" fill={fill} />
      <circle cx="287" cy="78" r="16" fill={fill} />

      {/* House 3 — wide ranch */}
      <rect x="320" y="88" width="65" height="52" fill={fill} />
      <polygon points="315,88 352,72 390,88" fill={fill} />
      <rect x="332" y="98" width="8" height="8" fill={fillLight} />
      <rect x="355" y="98" width="8" height="8" fill={fillLight} />
      <rect x="372" y="98" width="8" height="8" fill={fillLight} />

      {/* Fence */}
      {[400, 410, 420, 430, 440].map((x) => (
        <rect key={x} x={x} y="105" width="3" height="15" fill={fill} />
      ))}
      <rect x="400" y="108" width="43" height="2" fill={fill} />

      {/* Tree 4 — pine */}
      <rect x="460" y="85" width="5" height="30" fill={fill} />
      <polygon points="448,85 462,50 477,85" fill={fill} />
      <polygon points="451,72 462,45 474,72" fill={fill} />

      {/* Apartment building */}
      <rect x="500" y="60" width="45" height="80" fill={fill} />
      <rect x="507" y="68" width="6" height="6" fill={fillLight} />
      <rect x="520" y="68" width="6" height="6" fill={fillLight} />
      <rect x="533" y="68" width="6" height="6" fill={fillLight} />
      <rect x="507" y="82" width="6" height="6" fill={fillLight} />
      <rect x="520" y="82" width="6" height="6" fill={fillLight} />
      <rect x="533" y="82" width="6" height="6" fill={fillLight} />
      <rect x="507" y="96" width="6" height="6" fill={fillLight} />
      <rect x="520" y="96" width="6" height="6" fill={fillLight} />
      <rect x="533" y="96" width="6" height="6" fill={fillLight} />

      {/* Tree 5 */}
      <rect x="565" y="92" width="4" height="25" fill={fill} />
      <ellipse cx="567" cy="82" rx="14" ry="16" fill={fill} />

      {/* House 4 — A-frame */}
      <polygon points="600,140 620,65 640,140" fill={fill} />
      <rect x="613" y="110" width="14" height="20" fill={fillLight} />

      {/* Trees cluster */}
      <rect x="665" y="88" width="4" height="28" fill={fill} />
      <ellipse cx="667" cy="78" rx="12" ry="15" fill={fill} />
      <rect x="685" y="82" width="5" height="30" fill={fill} />
      <ellipse cx="687" cy="72" rx="14" ry="17" fill={fill} />

      {/* House 5 — modern */}
      <rect x="720" y="82" width="55" height="58" fill={fill} />
      <rect x="720" y="78" width="55" height="6" fill={fill} />
      <rect x="730" y="92" width="12" height="10" fill={fillLight} />
      <rect x="752" y="92" width="12" height="10" fill={fillLight} />

      {/* Lamp post */}
      <rect x="795" y="85" width="3" height="35" fill={fill} />
      <ellipse cx="796" cy="83" rx="6" ry="3" fill={fill} />

      {/* House 6 */}
      <rect x="830" y="85" width="42" height="55" fill={fill} />
      <polygon points="826,85 851,62 876,85" fill={fill} />
      <rect x="842" y="100" width="8" height="8" fill={fillLight} />
      <rect x="856" y="100" width="8" height="8" fill={fillLight} />

      {/* Tree 6 — tall pine */}
      <rect x="892" y="78" width="5" height="35" fill={fill} />
      <polygon points="880,78 894,38 910,78" fill={fill} />

      {/* House 7 — bungalow */}
      <rect x="930" y="92" width="50" height="48" fill={fill} />
      <polygon points="925,92 955,75 985,92" fill={fill} />
      <rect x="948" y="108" width="14" height="18" fill={fillLight} />

      {/* Tree 7 */}
      <rect x="1000" y="90" width="4" height="26" fill={fill} />
      <circle cx="1002" cy="80" r="14" fill={fill} />

      {/* Tall building */}
      <rect x="1035" y="55" width="35" height="85" fill={fill} />
      <rect x="1042" y="62" width="5" height="5" fill={fillLight} />
      <rect x="1055" y="62" width="5" height="5" fill={fillLight} />
      <rect x="1042" y="74" width="5" height="5" fill={fillLight} />
      <rect x="1055" y="74" width="5" height="5" fill={fillLight} />
      <rect x="1042" y="86" width="5" height="5" fill={fillLight} />
      <rect x="1055" y="86" width="5" height="5" fill={fillLight} />

      {/* Tree 8 */}
      <rect x="1090" y="85" width="5" height="30" fill={fill} />
      <polygon points="1078,85 1092,48 1108,85" fill={fill} />

      {/* House 8 */}
      <rect x="1130" y="88" width="45" height="52" fill={fill} />
      <polygon points="1125,88 1152,68 1180,88" fill={fill} />
      <rect x="1140" y="100" width="8" height="8" fill={fillLight} />
      <rect x="1158" y="100" width="8" height="8" fill={fillLight} />

      {/* Fence */}
      {[1190, 1200, 1210, 1220, 1230].map((x) => (
        <rect key={x} x={x} y="108" width="3" height="12" fill={fill} />
      ))}
      <rect x="1190" y="111" width="43" height="2" fill={fill} />

      {/* Tree 9 */}
      <rect x="1250" y="88" width="5" height="28" fill={fill} />
      <ellipse cx="1252" cy="78" rx="16" ry="18" fill={fill} />

      {/* House 9 */}
      <rect x="1290" y="80" width="48" height="60" fill={fill} />
      <polygon points="1285,80 1314,58 1343,80" fill={fill} />
      <rect x="1300" y="92" width="8" height="8" fill={fillLight} />
      <rect x="1322" y="92" width="8" height="8" fill={fillLight} />
      <rect x="1308" y="118" width="12" height="18" fill={fillLight} />

      {/* Tree 10 — pine */}
      <rect x="1360" y="82" width="5" height="32" fill={fill} />
      <polygon points="1348,82 1362,42 1378,82" fill={fill} />

      {/* House 10 */}
      <rect x="1400" y="90" width="40" height="50" fill={fill} />
      <polygon points="1395,90 1420,70 1445,90" fill={fill} />
      <rect x="1413" y="108" width="10" height="15" fill={fillLight} />

      {/* Tree 11 */}
      <rect x="1460" y="90" width="4" height="26" fill={fill} />
      <ellipse cx="1462" cy="80" rx="13" ry="16" fill={fill} />

      {/* House 11 — to ensure seamless tiling */}
      <rect x="1500" y="85" width="50" height="55" fill={fill} />
      <polygon points="1495,85 1525,65 1555,85" fill={fill} />
      <rect x="1510" y="98" width="8" height="8" fill={fillLight} />
      <rect x="1532" y="98" width="8" height="8" fill={fillLight} />

      {/* Tree 12 */}
      <rect x="1570" y="88" width="5" height="28" fill={fill} />
      <ellipse cx="1572" cy="78" rx="15" ry="17" fill={fill} />

      {/* Ground line */}
      <rect x="0" y="130" width="1600" height="10" fill={fill} />
    </svg>
  );
}

// Soft, organic cloud shape
function CloudSVG() {
  return (
    <svg width="200" height="80" viewBox="0 0 200 80" fill="none">
      <ellipse cx="70" cy="50" rx="55" ry="28" fill="white" opacity="0.85" />
      <ellipse cx="110" cy="45" rx="48" ry="32" fill="white" opacity="0.9" />
      <ellipse cx="50" cy="55" rx="40" ry="22" fill="white" opacity="0.8" />
      <ellipse cx="140" cy="52" rx="42" ry="24" fill="white" opacity="0.85" />
      <ellipse cx="90" cy="35" rx="38" ry="26" fill="white" opacity="0.75" />
    </svg>
  );
}
