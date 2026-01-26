'use client';

import React from 'react';
import Link from 'next/link';
import { TechnicalCard, TechnicalLabel } from '../technical';
import { InterventionSeverity, SEVERITY_CONFIG, InterventionLog } from '@/types/intervention';
import { Timestamp } from 'firebase/firestore';

interface InterventionCardProps {
  intervention: InterventionLog;
  className?: string;
}

function formatTimeAgo(timestamp: Timestamp): string {
  const now = new Date();
  const then = timestamp.toDate();
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function InterventionCard({ intervention, className = '' }: InterventionCardProps) {
  const severityConfig = SEVERITY_CONFIG[intervention.severity];

  return (
    <Link href={`/intervention/${intervention.interventionId}`}>
      <TechnicalCard
        shadowSize="sm"
        className={`
          p-4 cursor-pointer
          hover:translate-x-[2px] hover:translate-y-[2px]
          hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
          transition-all
          ${severityConfig.bgColor}
          ${className}
        `}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title and person */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-mono font-bold text-slate-800 truncate">
                {intervention.title}
              </h3>
              {intervention.personName && (
                <span className="font-mono text-xs text-slate-500">
                  ({intervention.personName})
                </span>
              )}
            </div>

            {/* Status and time */}
            <div className="flex items-center gap-2 flex-wrap">
              <TechnicalLabel
                variant={intervention.status === 'active' ? 'filled' : 'outline'}
                color={intervention.status === 'active' ? 'red' : intervention.status === 'stabilized' ? 'amber' : 'green'}
                size="xs"
              >
                {intervention.status.toUpperCase()}
              </TechnicalLabel>
              <TechnicalLabel
                variant="outline"
                color={intervention.severity === 'crisis' || intervention.severity === 'severe' ? 'red' : 'amber'}
                size="xs"
              >
                {intervention.severity.toUpperCase()}
              </TechnicalLabel>
              <span className="font-mono text-xs text-slate-400">
                {formatTimeAgo(intervention.triggeredAt)}
              </span>
            </div>

            {/* Suggestions status */}
            {intervention.suggestionsTotal > 0 && (
              <div className="mt-2 font-mono text-xs text-slate-500">
                {intervention.suggestionsApproved} / {intervention.suggestionsTotal} suggestions reviewed
              </div>
            )}
          </div>

          {/* Active indicator */}
          {intervention.status === 'active' && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
      </TechnicalCard>
    </Link>
  );
}

export default InterventionCard;
