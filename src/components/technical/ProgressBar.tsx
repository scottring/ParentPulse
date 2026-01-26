'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  segments?: number;
  showPercentage?: boolean;
  label?: string;
  color?: 'green' | 'amber' | 'blue' | 'red' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorMap = {
  green: 'bg-green-600',
  amber: 'bg-amber-600',
  blue: 'bg-blue-600',
  red: 'bg-red-600',
  slate: 'bg-slate-800',
};

const sizeMap = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

export function ProgressBar({
  progress,
  segments = 10,
  showPercentage = true,
  label,
  color = 'green',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const filledSegments = Math.round((clampedProgress / 100) * segments);

  return (
    <div className={`font-mono ${className}`}>
      {/* Label row */}
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-xs font-medium uppercase tracking-wider text-slate-600">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-xs font-bold text-slate-800">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Segmented progress bar */}
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, index) => (
          <div
            key={index}
            className={`
              flex-1 ${sizeMap[size]}
              border border-slate-300
              transition-colors duration-200
              ${index < filledSegments ? colorMap[color] : 'bg-slate-100'}
            `}
          />
        ))}
      </div>

      {/* Text representation */}
      <div className="mt-1 text-xs text-slate-500 flex justify-between">
        <span>
          {Array.from({ length: segments }).map((_, i) =>
            i < filledSegments ? '\u2588' : '\u2591'
          ).join('')}
        </span>
      </div>
    </div>
  );
}

export default ProgressBar;
