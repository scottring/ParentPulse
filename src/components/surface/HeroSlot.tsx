'use client';

import type { HeroModuleId, SurfaceData } from '@/types/surface-recipe';
import { StageCTAHero } from './heroes/StageCTAHero';
import { SynthesisHero } from './heroes/SynthesisHero';
import { SpotlightHero } from './heroes/SpotlightHero';
import { CalmHero } from './heroes/CalmHero';

interface HeroSlotProps {
  heroId: HeroModuleId;
  data: SurfaceData;
}

function resolveHeroContent(heroId: HeroModuleId, data: SurfaceData): React.ReactNode {
  switch (heroId) {
    case 'stage-cta-self':
      return (
        <StageCTAHero
          variant="self"
          selfPersonId={data.selfPerson?.personId ?? null}
        />
      );

    case 'stage-cta-add-person':
      return <StageCTAHero variant="add-person" />;

    case 'stage-cta-contribute':
      return (
        <StageCTAHero
          variant="contribute"
          targetPerson={data.peopleNeedingContributions[0]}
        />
      );

    case 'fresh-synthesis': {
      const manual = data.manuals.find(
        (m) => m.synthesizedContent?.lastSynthesizedAt != null
      );
      if (manual) return <SynthesisHero manual={manual} />;
      return <CalmHero />;
    }

    case 'person-spotlight': {
      const manual = data.manuals.find(
        (m) =>
          (m.synthesizedContent?.alignments?.length ?? 0) > 0 ||
          (m.synthesizedContent?.gaps?.length ?? 0) > 0 ||
          (m.synthesizedContent?.blindSpots?.length ?? 0) > 0
      );
      if (manual) return <SpotlightHero manual={manual} />;
      return <CalmHero />;
    }

    case 'journal-echo':
    case 'next-action':
    case 'calm':
    default:
      return <CalmHero />;
  }
}

export function HeroSlot({ heroId, data }: HeroSlotProps) {
  const heroContent = resolveHeroContent(heroId, data);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">{heroContent}</div>
      {data.dinnerPrompt && (
        <div className="px-8 pb-6">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <p
              className="text-[10px] uppercase tracking-[0.12em] mb-1"
              style={{ color: '#8BAF8E' }}
            >
              Tonight at dinner
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{
                fontFamily: 'var(--font-cormorant)',
                fontStyle: 'italic',
                color: '#F5F0E8',
              }}
            >
              &ldquo;{data.dinnerPrompt}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
