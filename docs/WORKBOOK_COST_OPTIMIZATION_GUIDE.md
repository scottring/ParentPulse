# Workbook Generation Cost Optimization Guide

## Overview

This guide explains how to reduce per-workbook generation costs by using different AI models for story and illustration generation. Users can choose between multiple pricing tiers or customize their own configuration.

## Current Cost Breakdown (as of 2026-01-21)

### Premium Tier (Default)
- **Story Generation** (Claude 3.5 Sonnet): $0.30 per workbook
- **Illustrations** (Nano Banana Pro - Gemini 3 Pro Image): $0.84 per workbook (7 images × $0.12)
- **Total**: $1.14 per workbook

### Annual Cost Examples:
- 1 child, 52 weeks: $59.28/year
- 2 children, 52 weeks: $118.56/year
- 4 children, 52 weeks: $237.12/year

## Available AI Models & Pricing

### Story Generation Models

| Model | Cost per Workbook | Quality | Speed | Best For |
|-------|------------------|---------|-------|----------|
| **Claude 3.5 Sonnet** | $0.30 | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | Premium quality, therapeutic depth |
| **Claude Haiku 4.5** | $0.10 | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | Great balance (within 5% of Sonnet) |
| **GPT-4o Mini** | $0.05 | ⭐⭐⭐ | ⚡⚡⚡⚡ | Budget-friendly, good creative writing |
| **GPT-3.5 Turbo** | $0.08 | ⭐⭐ | ⚡⚡⚡⚡⚡ | Economy option, basic quality |

**Pricing source**: [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing), [OpenAI Pricing](https://platform.openai.com/docs/pricing)

### Illustration Generation Models

| Model | Cost per Workbook (7 images) | Quality | Speed | Best For |
|-------|------------------------------|---------|-------|----------|
| **Nano Banana Pro** | $0.84 | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | Best character consistency |
| **DALL-E 3 Standard** | $0.28 | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ | High quality, balanced cost |
| **Stable Diffusion 3.5** | $0.175 | ⭐⭐⭐ | ⚡⚡⚡⚡ | Budget-friendly, good quality |
| **GPT Image 1 Mini** | $0.035 | ⭐⭐ | ⚡⚡⚡⚡⚡ | Economy option, variable quality |
| **No illustrations** | $0.00 | N/A | N/A | Story-only for maximum savings |

**Pricing sources**: [OpenAI Image Pricing](https://costgoat.com/pricing/openai-images), [Stability AI Pricing](https://platform.stability.ai/pricing)

## Recommended Pricing Tiers

### Tier 1: Premium ($1.14/workbook)
- **Story**: Claude 3.5 Sonnet ($0.30)
- **Illustrations**: Nano Banana Pro ($0.84)
- **Best for**: Families prioritizing therapeutic depth and highest quality
- **Annual cost** (2 children): $118.56

### Tier 2: Standard ($0.38/workbook) ✅ RECOMMENDED
- **Story**: Claude Haiku 4.5 ($0.10)
- **Illustrations**: DALL-E 3 Standard ($0.28)
- **Best for**: Most families - excellent balance of quality and cost
- **Savings**: 67% vs Premium
- **Annual cost** (2 children): $39.52

### Tier 3: Budget ($0.225/workbook)
- **Story**: GPT-4o Mini ($0.05)
- **Illustrations**: Stable Diffusion 3.5 ($0.175)
- **Best for**: Frequent use, cost-conscious families
- **Savings**: 80% vs Premium
- **Annual cost** (2 children): $23.40

### Tier 4: Economy ($0.115/workbook)
- **Story**: GPT-3.5 Turbo ($0.08)
- **Illustrations**: GPT Image 1 Mini ($0.035)
- **Best for**: Simple narratives, maximum cost savings
- **Savings**: 90% vs Premium
- **Annual cost** (2 children): $11.96

### Tier 5: Story-Only (starts at $0.05/workbook)
- **Story**: Any model (GPT-4o Mini recommended: $0.05)
- **Illustrations**: Disabled
- **Best for**: Audio/text-only experience, lowest cost
- **Savings**: 91-96% vs Premium
- **Annual cost** (2 children): $5.20-$31.20

## Implementation Status

### ✅ Completed

1. **Type Definitions** ([`/src/types/workbook-config.ts`](src/types/workbook-config.ts))
   - Model pricing information
   - Configuration types
   - Pricing tier definitions
   - Cost calculation helpers

2. **Data Model** ([`/src/types/person-manual.ts`](src/types/person-manual.ts))
   - Added `workbookConfig` field to PersonManual
   - Stores user's model preferences per person

3. **Settings UI Component** ([`/src/components/workbook/WorkbookConfigModal.tsx`](src/components/workbook/WorkbookConfigModal.tsx))
   - Tier selection interface
   - Cost comparison display
   - Advanced custom model selection
   - Savings calculator

4. **Cloud Function Updates** ([`/functions/index.js`](functions/index.js))
   - Added `storyModel`, `illustrationModel`, `illustrationsEnabled` parameters
   - Created `generateStoryWithModel()` helper function
   - Updated `generateWeeklyStory()` to use selected model
   - Defaults to Standard tier (Claude Haiku 4.5 + DALL-E 3)

### 🚧 To Complete

1. **Illustration Model Routing**
   - Update `generateAndSaveIllustrations()` function
   - Add support for DALL-E 3, Stable Diffusion, GPT Image models
   - Handle illustrations disabled case

2. **OpenAI SDK Integration**
   - Add `openai` package to `/functions/package.json`
   - Configure `OPENAI_API_KEY` secret in Firebase
   - Test GPT-4o Mini and GPT-3.5 Turbo story generation

3. **Frontend Integration**
   - Add WorkbookConfigModal to person manual settings
   - Pass model config when calling generateWeeklyWorkbooks
   - Display cost estimate before generation
   - Show model info on workbook pages

4. **Testing & Validation**
   - Test each model combination
   - Verify cost calculations
   - Quality comparison across tiers
   - Performance benchmarks

## User Experience Flow

### 1. Configure Preferences (One-Time Setup)

```
Person Manual → Settings → Workbook Generation
```

1. User opens person's manual
2. Clicks "Workbook Settings" button
3. Sees pricing tier comparison:
   - **Premium**: $1.14/workbook - Best quality
   - **Standard**: $0.38/workbook - Recommended (67% savings)
   - **Budget**: $0.225/workbook - Great value (80% savings)
   - **Economy**: $0.115/workbook - Maximum savings (90% savings)
4. Selects a tier or customizes models
5. Settings saved to PersonManual.workbookConfig

### 2. Generate Workbook

```
Manual Page → Generate Workbook Button
```

1. User clicks "Generate Weekly Workbook"
2. System shows cost estimate: "This will cost $0.38 (Standard tier)"
3. User confirms generation
4. Cloud Function uses configured models
5. Workbook created with selected quality/cost balance

### 3. Change Anytime

Users can change model preferences at any time:
- Switch tiers for specific children (e.g., older child gets Premium, younger gets Standard)
- Disable illustrations temporarily to save costs
- Upgrade for special weeks (e.g., challenging periods)

## Cost Comparison Examples

### Scenario 1: Family with 2 children, weekly workbooks

| Tier | Cost/Week | Cost/Year | Savings |
|------|-----------|-----------|---------|
| Premium | $2.28 | $118.56 | - |
| Standard | $0.76 | $39.52 | **$79** |
| Budget | $0.45 | $23.40 | **$95** |
| Economy | $0.23 | $11.96 | **$107** |

### Scenario 2: Family with 4 children, bi-weekly workbooks (26/year)

| Tier | Cost/Week | Cost/Year | Savings |
|------|-----------|-----------|---------|
| Premium | $4.56 | $118.56 | - |
| Standard | $1.52 | $39.52 | **$79** |
| Budget | $0.90 | $23.40 | **$95** |
| Economy | $0.46 | $11.96 | **$107** |

### Scenario 3: Single child, monthly workbooks (12/year)

| Tier | Cost/Month | Cost/Year | Savings |
|------|------------|-----------|---------|
| Premium | $1.14 | $13.68 | - |
| Standard | $0.38 | $4.56 | **$9.12** |
| Budget | $0.225 | $2.70 | **$10.98** |
| Economy | $0.115 | $1.38 | **$12.30** |

## Quality vs Cost Trade-offs

### Story Quality Comparison

**Claude 3.5 Sonnet (Premium - $0.30)**
- Most creative and engaging narratives
- Deepest therapeutic insights
- Best at handling complex emotional themes
- Excellent character development
- Perfect for older children (9-12) and complex situations

**Claude Haiku 4.5 (Standard - $0.10)** ⭐ RECOMMENDED
- Within 5% of Sonnet quality
- Very engaging stories
- Good therapeutic depth
- 4-5x faster generation
- Excellent value for all ages

**GPT-4o Mini (Budget - $0.05)**
- Good creative writing quality
- Adequate for younger children (3-8)
- Simpler narratives
- Less therapeutic nuance
- Best for straightforward situations

**GPT-3.5 Turbo (Economy - $0.08)**
- Basic story quality
- Best for ages 3-6 (picture book level)
- Simpler vocabulary and themes
- Less character depth
- Good for simple stories only

### Illustration Quality Comparison

**Nano Banana Pro (Premium - $0.84)**
- Best character consistency across 7 days
- Professional children's book aesthetic
- Rich detail and warmth
- Excellent for building story world

**DALL-E 3 Standard (Standard - $0.28)** ⭐ RECOMMENDED
- High quality illustrations
- Good character consistency
- Professional look
- Great balance of quality and cost

**Stable Diffusion 3.5 (Budget - $0.175)**
- Good quality for children's books
- Decent consistency
- May need occasional regeneration
- Good value

**GPT Image 1 Mini (Economy - $0.035)**
- Variable quality
- Less consistent character appearance
- May look less polished
- Best for very young children (3-5) who are less critical

**No Illustrations (Story-Only - $0.00)**
- Perfect for audio narration
- Parent reads story to child
- Maximum cost savings
- Focus on story quality only

## Recommendations by Use Case

### High-Volume Use (Weekly or more)
**Recommendation**: Standard tier (Claude Haiku + DALL-E 3)
- Cost: $0.38/workbook
- Quality: Excellent (within 5% of premium)
- Savings: 67% vs premium
- **Why**: Best balance for frequent generation

### Complex Therapeutic Needs
**Recommendation**: Premium tier (Sonnet + Nano Banana)
- Cost: $1.14/workbook
- Quality: Maximum
- **Why**: Complex emotional themes require best AI reasoning

### Multiple Children (3+)
**Recommendation**: Mix tiers per child
- Older child (9-12): Premium or Standard
- Middle child (6-8): Standard or Budget
- Younger child (3-5): Budget or Economy
- **Why**: Match quality to developmental needs

### Cost-Constrained Families
**Recommendation**: Budget tier (GPT-4o Mini + Stable Diffusion)
- Cost: $0.225/workbook
- Quality: Good for most situations
- Savings: 80% vs premium
- **Why**: Maintains good quality while dramatically reducing costs

### Storytelling Focus (Audio narration)
**Recommendation**: Story-only mode (any model + no illustrations)
- Cost: $0.05-$0.30/workbook (depending on story model)
- Quality: Focus investment on story text
- Savings: 91-96% vs premium
- **Why**: Parent narrates story, illustrations not needed

## API Keys Required

### Currently Configured
- ✅ `ANTHROPIC_API_KEY` - For Claude models (Sonnet, Haiku)

### To Add for Cost Optimization
- ⏳ `OPENAI_API_KEY` - For GPT and DALL-E models
- ⏳ `STABILITY_AI_API_KEY` - For Stable Diffusion models (optional)

### Configuration Commands

```bash
# Add OpenAI API key (required for GPT models and DALL-E)
firebase functions:secrets:set OPENAI_API_KEY

# Add Stability AI API key (optional, for Stable Diffusion)
firebase functions:secrets:set STABILITY_AI_API_KEY
```

Get API keys:
- OpenAI: https://platform.openai.com/api-keys
- Stability AI: https://platform.stability.ai/account/keys

## Migration Strategy

### Phase 1: Backend Foundation (Completed)
- ✅ Add model configuration parameters to Cloud Function
- ✅ Create model routing helper functions
- ✅ Default to Standard tier for backward compatibility

### Phase 2: OpenAI Integration (Next)
- Add OpenAI SDK to dependencies
- Configure API keys
- Test GPT-4o Mini and GPT-3.5 Turbo
- Test DALL-E 3 illustrations
- Update generateAndSaveIllustrations() for multiple models

### Phase 3: Frontend Integration
- Add WorkbookConfigModal to settings
- Display current tier and costs
- Allow tier selection and customization
- Show cost estimate before generation

### Phase 4: Testing & Optimization
- Quality comparison testing across all tiers
- Performance benchmarking
- Cost verification
- User feedback collection

## Technical Implementation

### Adding OpenAI SDK

```bash
cd functions
npm install openai
```

### Update `/functions/package.json`

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "@google/generative-ai": "^0.21.0",
    "openai": "^4.0.0",  // Add this
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  }
}
```

### Update Cloud Function Secrets

```javascript
exports.generateWeeklyWorkbooks = onCall(
  {
    secrets: [
      "ANTHROPIC_API_KEY",  // Required
      "OPENAI_API_KEY",     // Optional (needed for GPT models)
      "GOOGLE_AI_API_KEY"   // Optional (needed for Nano Banana)
    ],
    timeoutSeconds: 540,
  },
  async (request) => {
    // ... function implementation
  }
);
```

### Example: Call with Custom Configuration

```typescript
import { httpsCallable } from 'firebase/functions';

const generateWorkbooks = httpsCallable(functions, 'generateWeeklyWorkbooks');

const result = await generateWorkbooks({
  familyId: 'family123',
  personId: 'person456',
  personName: 'Emma',
  personAge: 7,
  manualId: 'manual789',
  // ... other parameters

  // Cost optimization parameters
  storyModel: 'claude-haiku-4.5',      // Standard tier
  illustrationModel: 'dalle-3-standard',  // Standard tier
  illustrationsEnabled: true,
});
```

## Monitoring Costs

### Track Generation Costs

Add cost logging to Cloud Function:

```javascript
logger.info(`Workbook generated - Cost estimate: Story $${storyCost}, Illustrations $${illustrationCost}, Total $${totalCost}`);
```

### Monthly Cost Tracking

Create admin dashboard showing:
- Total workbooks generated this month
- Cost per workbook (by tier)
- Total monthly AI costs
- Cost per family
- Tier distribution (how many using each tier)

## FAQ

**Q: Can I change tiers after selecting one?**
A: Yes! Change anytime in person manual settings. Next workbook uses new settings.

**Q: Can different children use different tiers?**
A: Yes! Each person's manual has its own workbook configuration.

**Q: What if I want premium story but budget illustrations?**
A: Use "Advanced: Customize Models" to mix and match.

**Q: Can I try different tiers to compare?**
A: Yes! Generate test workbooks with different tiers and compare quality.

**Q: What happens to old workbooks if I change tiers?**
A: Nothing. Old workbooks keep their quality. Only new workbooks use new settings.

**Q: Is there a way to see costs before generating?**
A: Yes! The UI shows estimated cost before you click "Generate Workbook".

**Q: Can I disable illustrations temporarily?**
A: Yes! Uncheck "Enable illustrations" to generate story-only workbooks.

**Q: Which tier do you recommend?**
A: Standard tier (Claude Haiku + DALL-E 3) - excellent quality at $0.38/workbook (67% savings).

## Sources

- [Claude API Pricing Guide 2026](https://www.aifreeapi.com/en/posts/claude-api-pricing-per-million-tokens)
- [OpenAI DALL-E & GPT Image Pricing Calculator](https://costgoat.com/pricing/openai-images)
- [Complete Guide to AI Image Generation APIs in 2026](https://wavespeed.ai/blog/posts/complete-guide-ai-image-apis-2026/)
- [Claude Haiku 4.5 Deep Dive: Cost, Capabilities](https://caylent.com/blog/claude-haiku-4-5-deep-dive-cost-capabilities-and-the-multi-agent-opportunity)
- [OpenAI API Pricing](https://platform.openai.com/docs/pricing)
- [Stability AI Developer Platform Pricing](https://platform.stability.ai/pricing)

---

**Last Updated**: January 21, 2026
**Status**: Implementation in progress
**Default Configuration**: Standard tier (Claude Haiku 4.5 + DALL-E 3 Standard) - $0.38/workbook
