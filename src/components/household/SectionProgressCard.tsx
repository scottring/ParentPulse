'use client';

import Link from 'next/link';
import {
  HouseholdSectionId,
  HOUSEHOLD_SECTION_META,
} from '@/types/household-workbook';
import {
  TechnicalCard,
  TechnicalButton,
  TechnicalLabel,
  ProgressBar,
} from '@/components/technical';
import {
  DocumentTextIcon,
  HomeModernIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface SectionProgressCardProps {
  sectionId: HouseholdSectionId;
  completeness: number;
  isRecommended?: boolean;
  onClick?: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  DocumentTextIcon,
  HomeModernIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
};

export default function SectionProgressCard({
  sectionId,
  completeness,
  isRecommended = false,
  onClick,
}: SectionProgressCardProps) {
  const meta = HOUSEHOLD_SECTION_META[sectionId];
  const Icon = ICON_MAP[meta.icon] || DocumentTextIcon;
  const isComplete = completeness >= 100;

  return (
    <TechnicalCard
      shadowSize="sm"
      className={`p-4 transition-all ${
        isRecommended ? 'ring-2 ring-amber-500' : ''
      } ${onClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 flex items-center justify-center flex-shrink-0 ${
            isComplete
              ? 'bg-green-100 text-green-600'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isComplete ? (
            <CheckCircleIcon className="w-6 h-6" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="font-mono font-bold text-sm text-slate-800">
                {meta.name}
              </h3>
              <p className="font-mono text-xs text-slate-500">
                Layer {meta.layer}: {meta.friendlyName}
              </p>
            </div>
            {isRecommended && (
              <TechnicalLabel variant="filled" color="amber" size="xs">
                RECOMMENDED
              </TechnicalLabel>
            )}
          </div>

          <p className="text-xs text-slate-600 mb-3 line-clamp-2">
            {meta.description}
          </p>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="w-full bg-slate-200 h-1.5">
                <div
                  className={`h-1.5 transition-all ${
                    isComplete ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-slate-600 w-10 text-right">
              {completeness}%
            </span>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="mt-4 flex justify-end">
        <Link href={`/household/onboard/${sectionId}`}>
          <TechnicalButton
            variant={isComplete ? 'outline' : isRecommended ? 'primary' : 'secondary'}
            size="sm"
          >
            {isComplete ? 'REVIEW' : completeness > 0 ? 'CONTINUE' : 'START'}
          </TechnicalButton>
        </Link>
      </div>
    </TechnicalCard>
  );
}
