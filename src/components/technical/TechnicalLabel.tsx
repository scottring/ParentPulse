'use client';

import React from 'react';

interface TechnicalLabelProps {
  children: React.ReactNode;
  variant?: 'filled' | 'outline' | 'subtle';
  color?: 'slate' | 'amber' | 'green' | 'red' | 'blue';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const variantColorMap = {
  filled: {
    slate: 'bg-slate-800 text-white',
    amber: 'bg-amber-600 text-white',
    green: 'bg-green-600 text-white',
    red: 'bg-red-600 text-white',
    blue: 'bg-blue-600 text-white',
  },
  outline: {
    slate: 'border-2 border-slate-800 text-slate-800 bg-transparent',
    amber: 'border-2 border-amber-600 text-amber-600 bg-transparent',
    green: 'border-2 border-green-600 text-green-600 bg-transparent',
    red: 'border-2 border-red-600 text-red-600 bg-transparent',
    blue: 'border-2 border-blue-600 text-blue-600 bg-transparent',
  },
  subtle: {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  },
};

const sizeMap = {
  xs: 'px-2 py-0.5 text-[10px]',
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
};

export function TechnicalLabel({
  children,
  variant = 'filled',
  color = 'slate',
  size = 'sm',
  className = '',
}: TechnicalLabelProps) {
  return (
    <span
      className={`
        inline-flex items-center
        font-mono font-medium uppercase tracking-wider
        ${variantColorMap[variant][color]}
        ${sizeMap[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export default TechnicalLabel;
