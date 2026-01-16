'use client';

import { useState } from 'react';
import { ChildChallenge, ChallengeCategory, ChallengeSeverity } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface ChallengesStepProps {
  childName: string;
  initialChallenges: ChildChallenge[];
  onComplete: (challenges: ChildChallenge[]) => void;
  onBack: (() => void) | null;
}

interface ChallengeOption {
  category: ChallengeCategory;
  label: string;
  description: string;
}

const challengeOptions: ChallengeOption[] = [
  {
    category: 'adhd',
    label: 'Attention & Focus (ADHD-related)',
    description: 'Difficulty paying attention, impulsivity, hyperactivity'
  },
  {
    category: 'anxiety',
    label: 'Anxiety & Worry',
    description: 'Excessive worry, fear, panic, social anxiety'
  },
  {
    category: 'behavioral',
    label: 'Behavioral Issues',
    description: 'Tantrums, aggression, defiance, rule-breaking'
  },
  {
    category: 'sensory',
    label: 'Sensory Sensitivities',
    description: 'Over/under-responsive to sounds, textures, lights, etc.'
  },
  {
    category: 'social',
    label: 'Social Challenges',
    description: 'Difficulty with peer relationships, making friends, social cues'
  },
  {
    category: 'learning',
    label: 'Learning Difficulties',
    description: 'Reading, writing, math, or other academic challenges'
  },
  {
    category: 'other',
    label: 'Other',
    description: 'Sleep issues, eating difficulties, transitions, etc.'
  }
];

export default function ChallengesStep({
  childName,
  initialChallenges,
  onComplete,
  onBack
}: ChallengesStepProps) {
  const [selectedChallenges, setSelectedChallenges] = useState<Map<ChallengeCategory, ChildChallenge>>(
    new Map(initialChallenges.map(c => [c.category, c]))
  );

  const [editingChallenge, setEditingChallenge] = useState<ChallengeCategory | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    severity: 'moderate' as ChallengeSeverity,
    diagnosed: false,
    professionalSupport: false,
    notes: ''
  });

  const handleToggleChallenge = (category: ChallengeCategory) => {
    if (selectedChallenges.has(category)) {
      const newMap = new Map(selectedChallenges);
      newMap.delete(category);
      setSelectedChallenges(newMap);
    } else {
      setEditingChallenge(category);
      setFormData({
        description: challengeOptions.find(opt => opt.category === category)?.label || '',
        severity: 'moderate',
        diagnosed: false,
        professionalSupport: false,
        notes: ''
      });
    }
  };

  const handleSaveDetails = () => {
    if (!editingChallenge) return;

    const challenge: ChildChallenge = {
      id: `challenge_${editingChallenge}_${Date.now()}`,
      category: editingChallenge,
      description: formData.description,
      severity: formData.severity,
      diagnosed: formData.diagnosed,
      professionalSupport: formData.professionalSupport,
      notes: formData.notes || undefined,
      identifiedDate: Timestamp.now()
    };

    const newMap = new Map(selectedChallenges);
    newMap.set(editingChallenge, challenge);
    setSelectedChallenges(newMap);
    setEditingChallenge(null);
  };

  const handleNext = () => {
    if (selectedChallenges.size === 0) {
      alert('Please select at least one challenge to continue.');
      return;
    }

    onComplete(Array.from(selectedChallenges.values()));
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="parent-heading text-3xl mb-3" style={{ color: 'var(--parent-text)' }}>
          What challenges are you experiencing with {childName}?
        </h2>
        <p className="text-base" style={{ color: 'var(--parent-text-light)' }}>
          Select all that apply. We'll use this to create a personalized support plan.
        </p>
      </div>

      {/* Challenge Options */}
      <div className="space-y-3 mb-8">
        {challengeOptions.map((option) => {
          const isSelected = selectedChallenges.has(option.category);
          const challenge = selectedChallenges.get(option.category);

          return (
            <div key={option.category}>
              <button
                onClick={() => handleToggleChallenge(option.category)}
                className="w-full parent-card p-6 text-left transition-all duration-200 hover:shadow-md"
                style={{
                  borderLeft: isSelected ? '4px solid var(--parent-accent)' : '4px solid transparent',
                  backgroundColor: isSelected ? 'var(--parent-bg)' : 'var(--parent-card)'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
                          color: isSelected ? 'white' : 'transparent'
                        }}
                      >
                        {isSelected && '✓'}
                      </div>
                      <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                        {option.label}
                      </h3>
                    </div>
                    <p className="text-sm ml-9" style={{ color: 'var(--parent-text-light)' }}>
                      {option.description}
                    </p>
                    {isSelected && challenge && (
                      <div className="mt-3 ml-9 flex gap-2 flex-wrap">
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: 'var(--parent-accent)',
                            color: 'white'
                          }}
                        >
                          {challenge.severity}
                        </span>
                        {challenge.diagnosed && (
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: 'var(--parent-primary)',
                              color: 'white'
                            }}
                          >
                            Diagnosed
                          </span>
                        )}
                        {challenge.professionalSupport && (
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: 'var(--parent-secondary)',
                              color: 'white'
                            }}
                          >
                            Professional Support
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Detail Form Modal */}
              {editingChallenge === option.category && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--parent-text)' }}>
                      Tell us more about {option.label.toLowerCase()}
                    </h3>

                    <div className="space-y-6">
                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                          Brief Description
                        </label>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                          style={{ borderColor: 'var(--parent-border)' }}
                          placeholder="e.g., Difficulty focusing on homework"
                        />
                      </div>

                      {/* Severity */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                          Severity
                        </label>
                        <div className="flex gap-3">
                          {['mild', 'moderate', 'significant'].map((sev) => (
                            <button
                              key={sev}
                              onClick={() => setFormData({ ...formData, severity: sev as ChallengeSeverity })}
                              className="flex-1 py-2 px-4 rounded-lg border transition-colors"
                              style={{
                                borderColor: formData.severity === sev ? 'var(--parent-accent)' : 'var(--parent-border)',
                                backgroundColor: formData.severity === sev ? 'var(--parent-bg)' : 'white',
                                color: formData.severity === sev ? 'var(--parent-accent)' : 'var(--parent-text)'
                              }}
                            >
                              {sev.charAt(0).toUpperCase() + sev.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.diagnosed}
                            onChange={(e) => setFormData({ ...formData, diagnosed: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <span style={{ color: 'var(--parent-text)' }}>
                            Professionally diagnosed
                          </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.professionalSupport}
                            onChange={(e) => setFormData({ ...formData, professionalSupport: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <span style={{ color: 'var(--parent-text)' }}>
                            Currently working with a professional
                          </span>
                        </label>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                          Additional Notes (optional)
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border rounded-lg"
                          style={{ borderColor: 'var(--parent-border)' }}
                          placeholder="Any other details that might be helpful..."
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 mt-8">
                      <button
                        onClick={() => setEditingChallenge(null)}
                        className="flex-1 py-3 px-6 rounded-lg border transition-colors"
                        style={{
                          borderColor: 'var(--parent-border)',
                          color: 'var(--parent-text)'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDetails}
                        className="flex-1 py-3 px-6 rounded-lg transition-colors"
                        style={{
                          backgroundColor: 'var(--parent-accent)',
                          color: 'white'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 justify-end">
        {onBack && (
          <button
            onClick={onBack}
            className="px-8 py-3 rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--parent-border)',
              color: 'var(--parent-text)'
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          className="px-8 py-3 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--parent-accent)',
            color: 'white'
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
