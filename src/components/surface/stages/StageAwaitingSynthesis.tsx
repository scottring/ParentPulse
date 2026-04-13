'use client';

import StageCTA from '../StageCTA';

export default function StageAwaitingSynthesis() {
  return (
    <StageCTA
      eyebrow="The manual is listening"
      title="Contributions are in. The synthesis is building."
      body="While the AI reads what you\u2019ve written, start capturing moments in the journal. Every entry enriches the manual over time."
      ctaLabel="Open the journal"
      ctaHref="/journal"
      ornament="◆"
    />
  );
}
