'use client';

import StageCTA from '../StageCTA';

export default function StageAddPerson() {
  return (
    <StageCTA
      eyebrow="Your family"
      title="Now add someone. Who matters most?"
      body="A partner, a child, a parent, a friend. The manual deepens with every perspective you bring."
      ctaLabel="Add someone"
      ctaHref="/people"
      ornament="✦"
    />
  );
}
