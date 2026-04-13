'use client';

import StageCTA from '../StageCTA';
import type { Person } from '@/types/person-manual';

interface StageBeginManualProps {
  person: Person;
}

export default function StageBeginManual({ person }: StageBeginManualProps) {
  return (
    <StageCTA
      eyebrow="The library"
      title={`Begin writing ${person.name}\u2019s manual.`}
      body={`Share what you know \u2014 their triggers, what works, what doesn\u2019t, the patterns you\u2019ve noticed. The synthesis engine takes it from there.`}
      ctaLabel="Start the onboarding"
      ctaHref={`/people/${person.personId}/manual/onboard`}
      ornament="✎"
    />
  );
}
