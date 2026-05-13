import type { BedtimeCardKind } from '@/types/journal';

export interface CardDefinition {
  kind: BedtimeCardKind;
  label: string;
  title: string;
  subtitle: string;
  parent: {
    /** For parent-reflection: one input slot. For h/l/b: three slots. */
    slots: Array<{ key: 'observation' | 'high' | 'low' | 'buffalo'; placeholder: string }>;
  };
  kid: {
    slots: Array<{ key: 'response' | 'high' | 'low' | 'buffalo'; placeholder: string; modeledFromParentKey?: 'observation' | 'high' | 'low' | 'buffalo' }>;
  };
}

export const PARENT_REFLECTION_CARD: CardDefinition = {
  kind: 'parent-reflection',
  label: "Tonight's card",
  title: 'Something I noticed about you today.',
  subtitle:
    'Parent goes first. Pick one specific moment — quiet at dinner, the laugh on the swing, the way they hugged the dog.',
  parent: {
    slots: [
      {
        key: 'observation',
        placeholder: 'One thing I noticed about {kid} today…',
      },
    ],
  },
  kid: {
    slots: [
      {
        key: 'response',
        placeholder: 'What about it?',
        modeledFromParentKey: 'observation',
      },
    ],
  },
};

export const HIGH_LOW_BUFFALO_CARD: CardDefinition = {
  kind: 'high-low-buffalo',
  label: "Tonight's card",
  title: 'High, Low, and Buffalo.',
  subtitle:
    'Best part, hardest part, weirdest random part. Parent goes first.',
  parent: {
    slots: [
      { key: 'high', placeholder: 'The best part of today was…' },
      { key: 'low', placeholder: 'The hardest part was…' },
      { key: 'buffalo', placeholder: 'Something weird or random…' },
    ],
  },
  kid: {
    slots: [
      { key: 'high', placeholder: 'Your best part…', modeledFromParentKey: 'high' },
      { key: 'low', placeholder: 'Your hardest part…', modeledFromParentKey: 'low' },
      { key: 'buffalo', placeholder: 'Your weird/random thing…', modeledFromParentKey: 'buffalo' },
    ],
  },
};

export const EXTERNALIZED_WORRY_CARD: CardDefinition = {
  kind: 'externalized-worry',
  label: "Tonight's card",
  title: 'Did Worry come to visit?',
  subtitle:
    'Worry is a visitor, not who you are. Parent goes first — when did you notice Worry stop by today?',
  parent: {
    slots: [
      {
        key: 'observation',
        placeholder: 'I think Worry visited {kid} when…',
      },
    ],
  },
  kid: {
    slots: [
      {
        key: 'response',
        placeholder: 'What did Worry want? Or was that someone else?',
        modeledFromParentKey: 'observation',
      },
    ],
  },
};

export const CARD_BY_KIND: Record<BedtimeCardKind, CardDefinition> = {
  'parent-reflection': PARENT_REFLECTION_CARD,
  'high-low-buffalo': HIGH_LOW_BUFFALO_CARD,
  'externalized-worry': EXTERNALIZED_WORRY_CARD,
};

/** Replace `{kid}` token in placeholder strings with the kid's first name. */
export function renderPlaceholder(template: string, kidFirstName: string): string {
  return template.replace(/\{kid\}/g, kidFirstName);
}
