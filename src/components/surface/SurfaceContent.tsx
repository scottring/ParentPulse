'use client';

import type { DashboardState } from '@/hooks/useDashboard';
import type { Person } from '@/types/person-manual';
import type { SurfaceSections } from '@/types/surface';
import SurfaceActive from './SurfaceActive';
import StageNewUser from './stages/StageNewUser';
import StageAddPerson from './stages/StageAddPerson';
import StageBeginManual from './stages/StageBeginManual';
import StageAwaitingSynthesis from './stages/StageAwaitingSynthesis';

interface SurfaceContentProps {
  state: DashboardState;
  selfPerson: Person | null;
  firstPersonNeedingContribution: Person | null;
  sections: SurfaceSections | null;
  onDismiss?: (id: string) => void;
}

/**
 * Switches on DashboardState to render the correct stage
 * component or the full active surface.
 */
export default function SurfaceContent({
  state,
  selfPerson,
  firstPersonNeedingContribution,
  sections,
  onDismiss,
}: SurfaceContentProps) {
  switch (state) {
    case 'new_user':
      return <StageNewUser selfPerson={selfPerson} />;

    case 'self_complete':
      return <StageAddPerson />;

    case 'has_people':
      return firstPersonNeedingContribution ? (
        <StageBeginManual person={firstPersonNeedingContribution} />
      ) : (
        <StageAddPerson />
      );

    case 'has_contributions':
      return <StageAwaitingSynthesis />;

    case 'active':
      return sections ? (
        <SurfaceActive sections={sections} onDismiss={onDismiss} />
      ) : null;

    default:
      return null;
  }
}
