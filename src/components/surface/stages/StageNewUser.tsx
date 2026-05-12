'use client';

import StageCTA from '../StageCTA';
import type { Person } from '@/types/person-manual';

interface StageNewUserProps {
  selfPerson: Person | null;
}

export default function StageNewUser({ selfPerson }: StageNewUserProps) {
  const href = selfPerson
    ? `/people/${selfPerson.personId}/manual/self-onboard`
    : '/people';

  return (
    <StageCTA
      eyebrow="Your family"
      title="Welcome. Begin by telling us about yourself."
      body="Every manual starts with the author. A few minutes of reflection gives it something to work with."
      ctaLabel="Begin your self-portrait"
      ctaHref={href}
    />
  );
}
