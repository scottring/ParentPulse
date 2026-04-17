'use client';

import type { GridModuleId, SurfaceData } from '@/types/surface-recipe';
import {
  RitualTile,
  MicroActivityTile,
  PatternTile,
  BlindSpotTile,
  GrowthArcTile,
  DinnerPromptTile,
  RecentJournalTile,
  FamilyFreshnessTile,
  ReflectionPromptTile,
  PerspectiveGapTile,
  RitualSetupTile,
  InviteSpouseTile,
  ContributionNeededTile,
} from './tiles';

interface GridSlotProps {
  tileIds: GridModuleId[];
  data: SurfaceData;
}

interface GridTileProps {
  id: GridModuleId;
  data: SurfaceData;
}

function GridTile({ id, data }: GridTileProps): React.ReactNode {
  switch (id) {
    case 'ritual-info': {
      if (!data.ritual) return null;
      return (
        <RitualTile
          ritual={data.ritual}
          spouseName={data.spouse?.name ?? 'partner'}
        />
      );
    }

    case 'micro-activity': {
      const item = data.activeGrowthItems.find((i) => i.type === 'micro_activity');
      if (!item) return null;
      return <MicroActivityTile item={item} />;
    }

    case 'pattern-detected': {
      const entry = data.journalEntries.find(
        (e) => (e.enrichment?.themes?.length ?? 0) > 0
      );
      if (!entry) return null;
      const description = entry.enrichment?.summary ?? entry.text.slice(0, 120);
      return (
        <PatternTile
          description={description}
          source={entry.enrichment?.themes[0] ?? 'From your journal'}
          entryId={entry.entryId}
        />
      );
    }

    case 'blind-spot': {
      const manual = data.manuals.find(
        (m) => (m.synthesizedContent?.blindSpots?.length ?? 0) > 0
      );
      if (!manual) return null;
      const blindSpot = manual.synthesizedContent!.blindSpots[0];
      return (
        <BlindSpotTile
          description={blindSpot.synthesis}
          personName={manual.personName}
          personId={manual.personId}
        />
      );
    }

    case 'growth-arc': {
      const arcGroup = data.arcGroups.find((ag) => ag.arc != null);
      if (!arcGroup) return null;
      return <GrowthArcTile arcGroup={arcGroup} />;
    }

    case 'dinner-prompt': {
      if (!data.dinnerPrompt) return null;
      return <DinnerPromptTile prompt={data.dinnerPrompt} />;
    }

    case 'recent-journal': {
      const entry = data.journalEntries[0];
      if (!entry) return null;
      return <RecentJournalTile entry={entry} />;
    }

    case 'family-freshness': {
      return <FamilyFreshnessTile people={data.people} manuals={data.manuals} />;
    }

    case 'reflection-prompt': {
      const item = data.activeGrowthItems.find((i) => i.type === 'reflection_prompt');
      if (!item) return null;
      return <ReflectionPromptTile item={item} />;
    }

    case 'perspective-gap': {
      const manual = data.manuals.find(
        (m) => !m.contributionIds || m.contributionIds.length === 0
      );
      if (!manual) return null;
      return (
        <PerspectiveGapTile
          personName={manual.personName}
          personId={manual.personId}
        />
      );
    }

    case 'ritual-setup': {
      return <RitualSetupTile spouseName={data.spouse?.name ?? 'partner'} />;
    }

    case 'invite-spouse': {
      if (!data.spouse) return null;
      return (
        <InviteSpouseTile
          spouseName={data.spouse.name}
          spousePersonId={data.spouse.personId}
        />
      );
    }

    case 'contribution-needed': {
      const person = data.peopleNeedingContributions[0];
      if (!person) return null;
      return <ContributionNeededTile person={person} />;
    }

    default:
      return null;
  }
}

export function GridSlot({ tileIds, data }: GridSlotProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {tileIds.map((id) => (
          <GridTile key={id} id={id} data={data} />
        ))}
      </div>
    </div>
  );
}
