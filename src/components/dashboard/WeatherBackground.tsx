'use client';

import { useMemo } from 'react';
import type { ClimateState } from '@/lib/climate-engine';

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
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 60 + Math.cos(rad) * 35;
              const y1 = 60 + Math.sin(rad) * 35;
              const x2 = 60 + Math.cos(rad) * 52;
              const y2 = 60 + Math.sin(rad) * 52;
              return (
                <line
                  key={angle}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="rgba(255,190,60,0.5)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}
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

      {/* Content layer — scrollable over fixed weather */}
      <div className="fixed inset-0 z-10 overflow-y-auto">
        {children}
      </div>
    </div>
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
