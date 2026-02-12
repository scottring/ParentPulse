'use client';

import type { Manual, ManualDomains } from '@/types/manual';
import type { DomainId } from '@/types/user';
import { DOMAIN_NAMES } from '@/types/manual';

interface ManualSummaryProps {
  manual: Manual;
  completedDomains: DomainId[];
}

function getDomainSummary(domains: ManualDomains, domainId: DomainId): { text: string; count: number } {
  const domain = domains[domainId];
  if (!domain) return { text: '', count: 0 };

  switch (domainId) {
    case 'values': {
      const d = domain as ManualDomains['values'];
      const firstValue = d.values?.[0]?.name;
      const count = (d.values?.length || 0) + (d.identityStatements?.length || 0) + (d.nonNegotiables?.length || 0);
      return { text: firstValue ? `"${firstValue}" and more` : '', count };
    }
    case 'communication': {
      const d = domain as ManualDomains['communication'];
      const first = d.patterns?.[0] || d.strengths?.[0];
      const count = (d.strengths?.length || 0) + (d.patterns?.length || 0) + (d.challenges?.length || 0);
      return { text: first || '', count };
    }
    case 'connection': {
      const d = domain as ManualDomains['connection'];
      const firstRitual = d.rituals?.[0]?.name;
      const count = (d.rituals?.length || 0) + (d.bondingActivities?.length || 0);
      return { text: firstRitual ? `"${firstRitual}" and more` : '', count };
    }
    case 'roles': {
      const d = domain as ManualDomains['roles'];
      const first = d.assignments?.[0]?.area;
      const count = (d.assignments?.length || 0) + (d.decisionAreas?.length || 0);
      return { text: first || '', count };
    }
    case 'organization': {
      const d = domain as ManualDomains['organization'];
      const firstRoutine = d.routines?.[0]?.name;
      const count = (d.spaces?.length || 0) + (d.systems?.length || 0) + (d.routines?.length || 0);
      return { text: firstRoutine ? `"${firstRoutine}" and more` : '', count };
    }
    case 'adaptability': {
      const d = domain as ManualDomains['adaptability'];
      const first = d.strengths?.[0] || d.stressors?.[0];
      const count = (d.stressors?.length || 0) + (d.copingStrategies?.length || 0) + (d.strengths?.length || 0);
      return { text: first || '', count };
    }
    case 'problemSolving': {
      const d = domain as ManualDomains['problemSolving'];
      const style = d.decisionStyle;
      const count = (d.conflictPatterns?.length || 0) + (d.strengths?.length || 0) + (d.challenges?.length || 0) + (style ? 1 : 0);
      return { text: style ? style.split('.')[0] : '', count };
    }
    case 'resources': {
      const d = domain as ManualDomains['resources'];
      const first = d.principles?.[0];
      const count = (d.principles?.length || 0) + (d.tensions?.length || 0) + (d.strengths?.length || 0);
      return { text: first || '', count };
    }
    default:
      return { text: '', count: 0 };
  }
}

export function ManualSummary({ manual, completedDomains }: ManualSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {completedDomains.map((domainId) => {
        const { text, count } = getDomainSummary(manual.domains, domainId);

        return (
          <div
            key={domainId}
            className="bg-white rounded-xl border border-stone-200 p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                {DOMAIN_NAMES[domainId]}
              </h4>
              {count > 0 && (
                <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full shrink-0">
                  {count} items
                </span>
              )}
            </div>
            {text ? (
              <p className="text-sm text-stone-700 line-clamp-2">{text}</p>
            ) : (
              <p className="text-sm text-stone-300 italic">No data yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
