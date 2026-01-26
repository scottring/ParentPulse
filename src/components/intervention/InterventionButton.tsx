'use client';

import React from 'react';
import Link from 'next/link';
import { useActiveInterventions } from '@/hooks/useIntervention';
import { useAuth } from '@/context/AuthContext';

interface InterventionButtonProps {
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
}

export function InterventionButton({
  variant = 'full',
  className = '',
}: InterventionButtonProps) {
  const { user } = useAuth();
  const { interventions } = useActiveInterventions(user?.familyId);
  const activeCount = interventions.filter((i) => i.status === 'active').length;

  if (variant === 'icon') {
    return (
      <Link
        href="/intervention"
        className={`
          relative w-10 h-10 flex items-center justify-center
          bg-red-600 text-white
          border-2 border-red-600
          hover:bg-red-700
          transition-colors
          ${className}
        `}
        title="Emergency Intervention"
      >
        <span className="text-lg">!</span>
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href="/intervention"
        className={`
          inline-flex items-center gap-2 px-3 py-2
          bg-red-600 text-white
          border-2 border-red-600
          font-mono text-xs font-bold uppercase tracking-wider
          hover:bg-red-700
          transition-colors
          ${className}
        `}
      >
        <span>!</span>
        INTERVENTION
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 bg-amber-500 text-[10px]">
            {activeCount}
          </span>
        )}
      </Link>
    );
  }

  // Full variant
  return (
    <Link
      href="/intervention"
      className={`
        flex items-center gap-3 px-4 py-3
        bg-red-600 text-white
        border-2 border-red-600
        shadow-[4px_4px_0px_0px_rgba(185,28,28,1)]
        hover:shadow-[2px_2px_0px_0px_rgba(185,28,28,1)]
        hover:translate-x-[2px] hover:translate-y-[2px]
        transition-all
        ${className}
      `}
    >
      {/* Warning icon */}
      <div className="w-8 h-8 bg-white/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xl font-bold">!</span>
      </div>

      <div className="flex-1">
        <span className="font-mono text-sm font-bold uppercase tracking-wider block">
          INTERVENTION
        </span>
        <span className="font-mono text-xs opacity-80">
          {activeCount > 0
            ? `${activeCount} active`
            : 'Report an incident'}
        </span>
      </div>

      {activeCount > 0 && (
        <div className="w-6 h-6 bg-amber-500 flex items-center justify-center font-mono text-xs font-bold">
          {activeCount}
        </div>
      )}
    </Link>
  );
}

export default InterventionButton;
