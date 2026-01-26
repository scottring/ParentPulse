'use client';

import React from 'react';

interface SpecificationBadgeProps {
  number: number | string;
  color?: 'amber' | 'green' | 'red' | 'blue' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorMap = {
  amber: 'border-amber-600',
  green: 'border-green-600',
  red: 'border-red-600',
  blue: 'border-blue-600',
  slate: 'border-slate-600',
};

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function SpecificationBadge({
  number,
  color = 'slate',
  size = 'md',
  className = '',
}: SpecificationBadgeProps) {
  const displayNumber = typeof number === 'number'
    ? String(number).padStart(2, '0')
    : number;

  return (
    <div
      className={`
        inline-flex items-center justify-center
        bg-slate-800 text-white
        border-2 ${colorMap[color]}
        font-mono font-bold
        ${sizeMap[size]}
        ${className}
      `}
    >
      {displayNumber}
    </div>
  );
}

export default SpecificationBadge;
