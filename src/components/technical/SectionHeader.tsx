'use client';

import React from 'react';
import { SpecificationBadge } from './SpecificationBadge';

interface SectionHeaderProps {
  number?: number;
  title: string;
  subtitle?: string;
  cornerBrackets?: boolean;
  className?: string;
}

export function SectionHeader({
  number,
  title,
  subtitle,
  cornerBrackets = true,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`relative flex items-center gap-3 ${className}`}>
      {/* Optional badge */}
      {number !== undefined && (
        <SpecificationBadge number={number} size="md" />
      )}

      {/* Title section with optional brackets */}
      <div className={`flex-1 ${cornerBrackets ? 'relative px-4 py-1' : ''}`}>
        {cornerBrackets && (
          <>
            {/* Left bracket */}
            <span className="absolute left-0 top-0 h-full w-2 border-l-2 border-t-2 border-b-2 border-slate-800" />
            {/* Right bracket */}
            <span className="absolute right-0 top-0 h-full w-2 border-r-2 border-t-2 border-b-2 border-slate-800" />
          </>
        )}

        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-800">
          {title}
        </h2>
        {subtitle && (
          <p className="font-mono text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default SectionHeader;
