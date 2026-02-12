'use client';

import Link from 'next/link';
import type { Manual, ManualType } from '@/types/manual';

interface ManualSpineProps {
  manual: Manual;
}

const SPINE_COLORS: Record<ManualType, { bg: string; text: string; accent: string }> = {
  household: { bg: 'bg-stone-800', text: 'text-stone-100', accent: 'bg-amber-600' },
  individual: { bg: 'bg-indigo-900', text: 'text-indigo-100', accent: 'bg-indigo-400' },
};

const TYPE_LABELS: Record<ManualType, string> = {
  household: 'Family',
  individual: 'Personal',
};

export function ManualSpine({ manual }: ManualSpineProps) {
  const colors = SPINE_COLORS[manual.type] || SPINE_COLORS.household;
  const typeLabel = TYPE_LABELS[manual.type];

  // Count populated domains
  const domains = manual.domains || {};
  const domainKeys = ['values', 'communication', 'connection', 'roles', 'organization', 'adaptability', 'problemSolving', 'resources'] as const;
  const populatedCount = domainKeys.filter(d => {
    const domain = domains[d];
    if (!domain) return false;
    return Object.values(domain).some(v => Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? !!v : !!v);
  }).length;

  return (
    <Link href={`/manual/${manual.manualId}`} className="group block">
      <div
        className={`${colors.bg} rounded-lg w-[140px] h-[200px] relative overflow-hidden cursor-pointer
          shadow-[3px_4px_8px_rgba(0,0,0,0.2),1px_1px_3px_rgba(0,0,0,0.15)]
          group-hover:shadow-[4px_6px_12px_rgba(0,0,0,0.25),2px_2px_4px_rgba(0,0,0,0.2)]
          group-hover:-translate-y-1 transition-all duration-200`}
      >
        {/* Spine edge line */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-black/20" />

        {/* Top accent band */}
        <div className={`${colors.accent} h-2 mx-3 mt-3 rounded-sm opacity-60`} />

        {/* Title area */}
        <div className="px-3 pt-4 flex flex-col h-[calc(100%-4rem)]">
          <h3 className={`${colors.text} text-sm font-semibold leading-tight heading`}>
            {manual.title}
          </h3>
          {manual.subtitle && (
            <p className={`${colors.text} opacity-50 text-[10px] mt-1 leading-tight`}>
              {manual.subtitle}
            </p>
          )}
        </div>

        {/* Bottom: type label + layer count */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 flex items-end justify-between">
          <span className={`${colors.text} opacity-40 text-[9px] uppercase tracking-widest`}>
            {typeLabel}
          </span>
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full ${
                  i < populatedCount ? colors.accent + ' opacity-80' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
