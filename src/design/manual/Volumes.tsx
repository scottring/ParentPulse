'use client';
/* ================================================================
   Relish · Manual — Volumes
   A shelf of bound volumes. Each volume is a year. Tapping opens
   that year in the Archive. The current year is a half-bound
   working copy; past years are fully bound.
   ================================================================ */

import { Eyebrow, Caption } from '../type';

export interface Volume {
  year: number;
  title?: string;                // "A year of small returns"
  entries: number;
  spineColor?: 'leather' | 'sage' | 'burgundy' | 'ember';
  current?: boolean;
}

export interface VolumesProps {
  volumes: Volume[];
  onOpen?: (year: number) => void;
}

const SPINE: Record<NonNullable<Volume['spineColor']>, string> = {
  leather: '#14100C',
  sage: '#4A5D50',
  burgundy: '#6B342A',
  ember: '#8A5A2E',
};

export function Volumes({ volumes, onOpen }: VolumesProps) {
  return (
    <section aria-label="Volumes" style={{ padding: '32px 0 64px' }}>
      <Eyebrow>Volumes · {volumes.length}</Eyebrow>
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-end',
          padding: '32px 0 24px',
          borderBottom: '4px solid var(--r-rule-3)',
        }}
      >
        {volumes.map((v) => (
          <VolumeSpine key={v.year} volume={v} onOpen={() => onOpen?.(v.year)} />
        ))}
      </div>
    </section>
  );
}

function VolumeSpine({ volume, onOpen }: { volume: Volume; onOpen: () => void }) {
  const color = SPINE[volume.spineColor ?? 'leather'];
  const height = volume.current ? 260 : 240 + ((volume.year * 7) % 30);
  return (
    <button
      onClick={onOpen}
      style={{
        all: 'unset', cursor: 'pointer',
        width: 56, height,
        background: volume.current
          ? `linear-gradient(180deg, ${color} 0%, ${color} 70%, rgba(20,16,12,0.15) 100%)`
          : `linear-gradient(90deg, rgba(255,255,255,0.08) 0%, ${color} 20%, ${color} 80%, rgba(0,0,0,0.25) 100%)`,
        borderRadius: '2px 2px 0 0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 6px',
        color: 'var(--r-ink-reversed)',
        boxShadow: volume.current
          ? 'inset 0 -2px 0 rgba(212,168,114,0.4), 0 2px 8px rgba(20,16,12,0.22)'
          : '0 2px 8px rgba(20,16,12,0.22), inset -2px 0 0 rgba(0,0,0,0.15)',
        transition: 'transform 180ms var(--r-ease-ink)',
        position: 'relative',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
      aria-label={`Volume ${volume.year}`}
    >
      <div
        style={{
          fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontWeight: 400,
          fontSize: 14, letterSpacing: '0.06em',
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          whiteSpace: 'nowrap', opacity: 0.85,
          maxHeight: height - 90, overflow: 'hidden',
        }}
      >
        {volume.title ?? `Volume · ${volume.year}`}
      </div>
      <div
        style={{
          fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontWeight: 300,
          fontSize: 18, color: 'var(--r-ember-soft)',
        }}
      >
        {volume.year.toString().slice(-2)}
      </div>
    </button>
  );
}
