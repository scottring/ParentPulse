'use client';

/**
 * Workbook Configuration Modal
 *
 * Allows families to choose which AI models to use for workbook generation.
 * Shows cost comparison and quality ratings for different tiers.
 */

import { useState } from 'react';
import {
  WORKBOOK_PRICING_TIERS,
  STORY_MODEL_PRICING,
  ILLUSTRATION_MODEL_PRICING,
  calculateWorkbookCost,
  formatCost,
  type WorkbookGenerationConfig,
  type WorkbookPricingTier,
  type StoryGenerationModel,
  type IllustrationGenerationModel,
} from '@/types/workbook-config';

interface WorkbookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: WorkbookGenerationConfig;
  onSave: (config: WorkbookGenerationConfig) => Promise<void>;
}

export default function WorkbookConfigModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: WorkbookConfigModalProps) {
  const [selectedTier, setSelectedTier] = useState<WorkbookPricingTier['id'] | 'custom'>(
    currentConfig ? 'custom' : 'standard'
  );
  const [customConfig, setCustomConfig] = useState<WorkbookGenerationConfig>(
    currentConfig || WORKBOOK_PRICING_TIERS[1].config // Default to Standard tier
  );
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleTierSelect = (tierId: WorkbookPricingTier['id']) => {
    setSelectedTier(tierId);
    const tier = WORKBOOK_PRICING_TIERS.find(t => t.id === tierId)!;
    setCustomConfig(tier.config);
  };

  const handleCustomChange = (field: keyof WorkbookGenerationConfig, value: any) => {
    setSelectedTier('custom');
    setCustomConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(customConfig);
      onClose();
    } catch (error) {
      console.error('Failed to save workbook config:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentCost = calculateWorkbookCost(customConfig);
  const premiumCost = WORKBOOK_PRICING_TIERS[0].totalCost;
  const savingsPercent = Math.round(((premiumCost - currentCost) / premiumCost) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-4 border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b-4 border-slate-800 p-6 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-mono text-2xl font-bold text-slate-900 mb-1">
                WORKBOOK GENERATION SETTINGS
              </h2>
              <p className="text-sm text-slate-600">
                Choose AI models for story and illustration generation
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 border-2 border-slate-800 hover:bg-slate-100 font-bold text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Cost Display */}
          <div className="bg-emerald-50 border-2 border-emerald-600 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-emerald-700 mb-1">
                  COST PER WORKBOOK
                </div>
                <div className="font-mono text-4xl font-bold text-emerald-900">
                  {formatCost(currentCost)}
                </div>
              </div>
              {savingsPercent > 0 && (
                <div className="text-right">
                  <div className="font-mono text-xs text-emerald-700 mb-1">
                    SAVINGS VS PREMIUM
                  </div>
                  <div className="font-mono text-3xl font-bold text-emerald-600">
                    {savingsPercent}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tier Selection */}
          <div className="mb-8">
            <div className="font-mono text-xs font-bold text-slate-600 mb-4">
              1. CHOOSE A PRICING TIER
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {WORKBOOK_PRICING_TIERS.map((tier) => {
                const isSelected = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => handleTierSelect(tier.id)}
                    className={`text-left p-6 border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 shadow-[4px_4px_0px_0px_rgba(5,150,105,1)]'
                        : 'border-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-mono text-lg font-bold">
                        {tier.name.toUpperCase()}
                      </h3>
                      <div className="font-mono text-xl font-bold text-emerald-600">
                        {formatCost(tier.totalCost)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      {tier.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="font-mono text-slate-500">
                        Story: {STORY_MODEL_PRICING[tier.config.storyModel].displayName}
                      </div>
                      {tier.savingsPercent > 0 && (
                        <div className="px-2 py-1 bg-emerald-600 text-white font-mono font-bold">
                          SAVE {tier.savingsPercent}%
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="mb-8">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="font-mono text-sm text-purple-600 hover:text-purple-700 font-bold flex items-center gap-2"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              ADVANCED: CUSTOMIZE MODELS
            </button>
          </div>

          {/* Advanced Model Selection */}
          {showAdvanced && (
            <div className="border-2 border-purple-600 p-6 mb-8 bg-purple-50">
              <div className="space-y-6">
                {/* Story Model Selection */}
                <div>
                  <label className="font-mono text-xs font-bold text-slate-700 mb-3 block">
                    STORY GENERATION MODEL
                  </label>
                  <div className="space-y-2">
                    {Object.entries(STORY_MODEL_PRICING).map(([key, info]) => (
                      <button
                        key={key}
                        onClick={() => handleCustomChange('storyModel', key)}
                        className={`w-full text-left p-4 border-2 transition-all ${
                          customConfig.storyModel === key
                            ? 'border-purple-600 bg-white'
                            : 'border-slate-200 hover:border-slate-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold text-sm">
                            {info.displayName}
                          </span>
                          <span className="font-mono text-sm text-emerald-600">
                            {formatCost(info.costPerWorkbook)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{info.description}</p>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Quality:</span>
                            <span className="text-xs font-bold">
                              {'★'.repeat(info.qualityRating)}
                              {'☆'.repeat(5 - info.qualityRating)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Speed:</span>
                            <span className="text-xs font-bold">
                              {'⚡'.repeat(info.speedRating)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Illustration Model Selection */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="font-mono text-xs font-bold text-slate-700">
                      ILLUSTRATION GENERATION MODEL
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customConfig.illustrationsEnabled}
                        onChange={(e) => handleCustomChange('illustrationsEnabled', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs">Enable illustrations</span>
                    </label>
                  </div>

                  {customConfig.illustrationsEnabled && (
                    <div className="space-y-2">
                      {Object.entries(ILLUSTRATION_MODEL_PRICING).map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => handleCustomChange('illustrationModel', key)}
                          className={`w-full text-left p-4 border-2 transition-all ${
                            customConfig.illustrationModel === key
                              ? 'border-purple-600 bg-white'
                              : 'border-slate-200 hover:border-slate-400 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold text-sm">
                              {info.displayName}
                            </span>
                            <span className="font-mono text-sm text-emerald-600">
                              {formatCost(info.costPerWorkbook)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-2">{info.description}</p>
                          <div className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Quality:</span>
                              <span className="text-xs font-bold">
                                {'★'.repeat(info.qualityRating)}
                                {'☆'.repeat(5 - info.qualityRating)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">Speed:</span>
                              <span className="text-xs font-bold">
                                {'⚡'.repeat(info.speedRating)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!customConfig.illustrationsEnabled && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-600 text-sm">
                      <p className="font-mono text-amber-900">
                        ℹ️ Stories will be generated without illustrations to save costs
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          <div className="bg-slate-50 border-2 border-slate-300 p-6 mb-8">
            <div className="font-mono text-xs font-bold text-slate-600 mb-4">
              COST BREAKDOWN
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Story Generation ({STORY_MODEL_PRICING[customConfig.storyModel].displayName})</span>
                <span className="font-mono font-bold">
                  {formatCost(STORY_MODEL_PRICING[customConfig.storyModel].costPerWorkbook)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>
                  Illustrations ({customConfig.illustrationsEnabled
                    ? ILLUSTRATION_MODEL_PRICING[customConfig.illustrationModel].displayName
                    : 'Disabled'})
                </span>
                <span className="font-mono font-bold">
                  {customConfig.illustrationsEnabled
                    ? formatCost(ILLUSTRATION_MODEL_PRICING[customConfig.illustrationModel].costPerWorkbook)
                    : '$0.00'}
                </span>
              </div>
              <div className="border-t-2 border-slate-300 pt-2 mt-2 flex justify-between font-bold">
                <span>Total per workbook:</span>
                <span className="font-mono text-lg text-emerald-600">
                  {formatCost(currentCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-800 font-mono font-bold hover:bg-slate-100 transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-emerald-600 text-white font-mono font-bold hover:bg-emerald-700 disabled:bg-slate-400 transition-colors"
            >
              {saving ? 'SAVING...' : 'SAVE CONFIGURATION'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
