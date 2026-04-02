'use client';

import Link from 'next/link';
import type { Force } from '@/lib/climate-engine';

interface FamilyForcesProps {
  lifting: Force[];
  weighing: Force[];
}

export function FamilyForces({ lifting, weighing }: FamilyForcesProps) {
  if (lifting.length === 0 && weighing.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Lifting */}
      <div
        className="rounded-2xl p-5 md:p-6"
        style={{ background: 'rgba(124, 144, 130, 0.06)', border: '1px solid rgba(124, 144, 130, 0.15)' }}
      >
        <p
          className="text-xs font-medium tracking-wide uppercase mb-4"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-primary)' }}
        >
          What&rsquo;s lifting you
        </p>
        {lifting.length === 0 ? (
          <p
            className="text-sm italic"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            Building foundations &mdash; every step counts
          </p>
        ) : (
          <div className="space-y-3">
            {lifting.map((force) => (
              <ForceRow key={force.dimensionId} force={force} />
            ))}
          </div>
        )}
      </div>

      {/* Weighing */}
      <div
        className="rounded-2xl p-5 md:p-6"
        style={{ background: 'rgba(212, 165, 116, 0.06)', border: '1px solid rgba(212, 165, 116, 0.15)' }}
      >
        <p
          className="text-xs font-medium tracking-wide uppercase mb-4"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#B8864A' }}
        >
          What&rsquo;s weighing
        </p>
        {weighing.length === 0 ? (
          <p
            className="text-sm italic"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            No heavy clouds right now
          </p>
        ) : (
          <div className="space-y-3">
            {weighing.map((force) => (
              <ForceRow key={force.dimensionId} force={force} />
            ))}
          </div>
        )}
      </div>

      {/* Deep dive link */}
      {(lifting.length > 0 || weighing.length > 0) && (
        <div className="md:col-span-2 text-center pt-1">
          <Link
            href="/dashboard/deep-dive"
            className="text-xs transition-colors hover:underline"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            See the full picture &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function ForceRow({ force }: { force: Force }) {
  const isLifting = force.direction === 'lifting';

  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 text-sm shrink-0"
        style={{ color: isLifting ? 'var(--parent-primary)' : '#C49556' }}
      >
        {isLifting ? '\u2191' : '\u2193'}
      </span>
      <div>
        <p
          className="text-sm font-medium leading-snug"
          style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text)' }}
        >
          {force.name}
        </p>
        {force.shortDescription && (
          <p
            className="text-xs mt-0.5 leading-relaxed"
            style={{ fontFamily: 'var(--font-parent-body)', color: 'var(--parent-text-light)' }}
          >
            {force.shortDescription}
          </p>
        )}
      </div>
    </div>
  );
}
