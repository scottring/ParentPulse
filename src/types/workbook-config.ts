/**
 * Workbook AI Model Configuration Types
 *
 * Allows families to choose which AI models to use for workbook generation
 * based on their budget and quality preferences.
 */

export type StoryGenerationModel =
  | 'claude-sonnet-4.5'      // Premium: $0.30/workbook - Best quality
  | 'claude-haiku-4.5'       // Standard: $0.10/workbook - Great balance
  | 'gpt-4o-mini'            // Budget: $0.05/workbook - Good creative writing
  | 'gpt-3.5-turbo';         // Economy: $0.08/workbook - Basic quality

export type IllustrationGenerationModel =
  | 'nano-banana-pro'        // Premium: $0.84/7 images - Best children's book style
  | 'dalle-3-standard'       // Standard: $0.28/7 images - High quality
  | 'stable-diffusion-3.5'   // Budget: $0.175/7 images - Good quality
  | 'gpt-image-1-mini';      // Economy: $0.035/7 images - Variable quality

export interface WorkbookGenerationConfig {
  storyModel: StoryGenerationModel;
  illustrationModel: IllustrationGenerationModel;
  illustrationsEnabled: boolean;          // Option to skip illustrations entirely
}

export interface ModelPricingInfo {
  model: StoryGenerationModel | IllustrationGenerationModel;
  displayName: string;
  costPerWorkbook: number;                // In USD
  description: string;
  qualityRating: 1 | 2 | 3 | 4 | 5;      // 1 = basic, 5 = premium
  speedRating: 1 | 2 | 3 | 4 | 5;        // 1 = slow, 5 = fast
  recommended?: boolean;
}

// Predefined pricing tiers
export interface WorkbookPricingTier {
  id: 'premium' | 'standard' | 'budget' | 'economy';
  name: string;
  description: string;
  config: WorkbookGenerationConfig;
  totalCost: number;                      // Total cost per workbook
  savingsPercent: number;                 // Compared to premium
}

// Story model pricing information
export const STORY_MODEL_PRICING: Record<StoryGenerationModel, ModelPricingInfo> = {
  'claude-sonnet-4.5': {
    model: 'claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    costPerWorkbook: 0.30,
    description: 'Best quality - Most creative and engaging stories, excellent therapeutic depth',
    qualityRating: 5,
    speedRating: 3,
    recommended: true,
  },
  'claude-haiku-4.5': {
    model: 'claude-haiku-4.5',
    displayName: 'Claude Haiku 4.5',
    costPerWorkbook: 0.10,
    description: 'Great balance - Within 5% of premium quality at 1/3 the cost, 4-5x faster',
    qualityRating: 4,
    speedRating: 5,
    recommended: true,
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    costPerWorkbook: 0.05,
    description: 'Budget-friendly - Good creative writing quality, very affordable',
    qualityRating: 3,
    speedRating: 4,
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    costPerWorkbook: 0.08,
    description: 'Economy option - Basic story quality, best for simple narratives',
    qualityRating: 2,
    speedRating: 5,
  },
};

// Illustration model pricing information
export const ILLUSTRATION_MODEL_PRICING: Record<IllustrationGenerationModel, ModelPricingInfo> = {
  'nano-banana-pro': {
    model: 'nano-banana-pro',
    displayName: 'Nano Banana Pro (Gemini 3)',
    costPerWorkbook: 0.84,
    description: 'Premium quality - Best character consistency and children\'s book aesthetic',
    qualityRating: 5,
    speedRating: 3,
    recommended: true,
  },
  'dalle-3-standard': {
    model: 'dalle-3-standard',
    displayName: 'DALL-E 3 Standard',
    costPerWorkbook: 0.28,
    description: 'High quality - Excellent illustrations with good consistency',
    qualityRating: 4,
    speedRating: 4,
    recommended: true,
  },
  'stable-diffusion-3.5': {
    model: 'stable-diffusion-3.5',
    displayName: 'Stable Diffusion 3.5',
    costPerWorkbook: 0.175,
    description: 'Budget-friendly - Good quality for children\'s book style',
    qualityRating: 3,
    speedRating: 4,
  },
  'gpt-image-1-mini': {
    model: 'gpt-image-1-mini',
    displayName: 'GPT Image 1 Mini',
    costPerWorkbook: 0.035,
    description: 'Economy option - Variable quality, lowest cost',
    qualityRating: 2,
    speedRating: 5,
  },
};

// Predefined pricing tiers
export const WORKBOOK_PRICING_TIERS: WorkbookPricingTier[] = [
  {
    id: 'premium',
    name: 'Premium',
    description: 'Best quality stories and illustrations - Recommended for therapeutic depth',
    config: {
      storyModel: 'claude-sonnet-4.5',
      illustrationModel: 'nano-banana-pro',
      illustrationsEnabled: true,
    },
    totalCost: 1.14,
    savingsPercent: 0,
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Excellent balance of quality and cost - Great for most families',
    config: {
      storyModel: 'claude-haiku-4.5',
      illustrationModel: 'dalle-3-standard',
      illustrationsEnabled: true,
    },
    totalCost: 0.38,
    savingsPercent: 67,
  },
  {
    id: 'budget',
    name: 'Budget',
    description: 'Good quality at affordable price - Ideal for frequent use',
    config: {
      storyModel: 'gpt-4o-mini',
      illustrationModel: 'stable-diffusion-3.5',
      illustrationsEnabled: true,
    },
    totalCost: 0.225,
    savingsPercent: 80,
  },
  {
    id: 'economy',
    name: 'Economy',
    description: 'Lowest cost option - Basic story quality for simple narratives',
    config: {
      storyModel: 'gpt-3.5-turbo',
      illustrationModel: 'gpt-image-1-mini',
      illustrationsEnabled: true,
    },
    totalCost: 0.115,
    savingsPercent: 90,
  },
];

// Helper function to calculate total cost
export function calculateWorkbookCost(config: WorkbookGenerationConfig): number {
  const storyCost = STORY_MODEL_PRICING[config.storyModel].costPerWorkbook;
  const illustrationCost = config.illustrationsEnabled
    ? ILLUSTRATION_MODEL_PRICING[config.illustrationModel].costPerWorkbook
    : 0;

  return storyCost + illustrationCost;
}

// Helper function to get recommended tier
export function getRecommendedTier(): WorkbookPricingTier {
  return WORKBOOK_PRICING_TIERS.find(tier => tier.id === 'standard')!;
}

// Helper function to format cost for display
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}
