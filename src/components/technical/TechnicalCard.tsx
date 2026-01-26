'use client';

import React from 'react';

interface TechnicalCardProps {
  children: React.ReactNode;
  badge?: number | string;
  badgeColor?: 'amber' | 'green' | 'red' | 'blue' | 'slate';
  cornerBrackets?: boolean;
  shadowSize?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article';
}

const badgeColorMap = {
  amber: 'border-amber-600 text-amber-600',
  green: 'border-green-600 text-green-600',
  red: 'border-red-600 text-red-600',
  blue: 'border-blue-600 text-blue-600',
  slate: 'border-slate-800 text-slate-800',
};

const shadowMap = {
  none: '',
  sm: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
  md: 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
  lg: 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
};

export function TechnicalCard({
  children,
  badge,
  badgeColor = 'slate',
  cornerBrackets = false,
  shadowSize = 'md',
  className = '',
  onClick,
  as: Component = 'div',
}: TechnicalCardProps) {
  return (
    <Component
      className={`
        relative
        bg-white
        border-2 border-slate-800
        ${shadowMap[shadowSize]}
        ${onClick ? 'cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Badge */}
      {badge !== undefined && (
        <div
          className={`
            absolute -top-3 -left-3
            w-10 h-10
            bg-slate-800
            border-2 ${badgeColorMap[badgeColor]}
            flex items-center justify-center
            font-mono font-bold text-sm
            text-white
            z-10
          `}
        >
          {typeof badge === 'number' ? String(badge).padStart(2, '0') : badge}
        </div>
      )}

      {/* Corner brackets */}
      {cornerBrackets && (
        <>
          {/* Top-left bracket */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-slate-800" />
          {/* Top-right bracket */}
          <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-slate-800" />
          {/* Bottom-left bracket */}
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-slate-800" />
          {/* Bottom-right bracket */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-slate-800" />
        </>
      )}

      {children}
    </Component>
  );
}

export default TechnicalCard;
