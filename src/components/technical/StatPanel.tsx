'use client';

import React from 'react';

interface Stat {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface StatPanelProps {
  stats: Stat[];
  title?: string;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatPanel({
  stats,
  title,
  columns = 3,
  className = '',
}: StatPanelProps) {
  const gridColsMap = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`border-2 border-slate-800 bg-white ${className}`}>
      {/* Header */}
      {title && (
        <div className="bg-slate-800 text-white px-4 py-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}

      {/* Stats grid */}
      <div className={`grid ${gridColsMap[columns]} divide-x-2 divide-slate-800`}>
        {stats.map((stat, index) => (
          <div key={index} className="p-4 text-center">
            {/* Value */}
            <div className="flex items-baseline justify-center gap-1">
              <span className="font-mono text-2xl font-bold text-slate-800">
                {stat.value}
              </span>
              {stat.unit && (
                <span className="font-mono text-xs text-slate-500 uppercase">
                  {stat.unit}
                </span>
              )}
              {stat.trend && (
                <span
                  className={`
                    text-sm ml-1
                    ${stat.trend === 'up' ? 'text-green-600' : ''}
                    ${stat.trend === 'down' ? 'text-red-600' : ''}
                    ${stat.trend === 'neutral' ? 'text-slate-400' : ''}
                  `}
                >
                  {stat.trend === 'up' && '\u2191'}
                  {stat.trend === 'down' && '\u2193'}
                  {stat.trend === 'neutral' && '\u2192'}
                </span>
              )}
            </div>

            {/* Label */}
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wider mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StatPanel;
