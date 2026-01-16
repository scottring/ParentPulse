'use client';

import { useState } from 'react';
import { LearningStyle } from '@/types';

interface StrengthsStepProps {
  childName: string;
  initialData: {
    strengths: string[];
    interests: string[];
    learningStyle: LearningStyle;
  };
  onComplete: (data: {
    strengths: string[];
    interests: string[];
    learningStyle: LearningStyle;
  }) => void;
  onBack: () => void;
}

const strengthOptions = [
  'Creative & Imaginative',
  'Physically Active',
  'Mathematically Inclined',
  'Verbal & Communicative',
  'Empathetic & Caring',
  'Problem Solver',
  'Determined & Persistent',
  'Funny & Entertaining',
  'Artistic',
  'Musical',
  'Tech-Savvy'
];

const interestSuggestions = [
  'Sports',
  'Arts & Crafts',
  'Music',
  'Reading',
  'Building & Construction',
  'Nature & Animals',
  'Technology & Gaming',
  'Science & Experiments',
  'Cooking & Baking',
  'Dancing',
  'Writing & Storytelling'
];

export default function StrengthsStep({
  childName,
  initialData,
  onComplete,
  onBack
}: StrengthsStepProps) {
  const [strengths, setStrengths] = useState<string[]>(initialData.strengths);
  const [interests, setInterests] = useState<string[]>(initialData.interests);
  const [customInterest, setCustomInterest] = useState('');
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(initialData.learningStyle);

  const handleToggleStrength = (strength: string) => {
    if (strengths.includes(strength)) {
      setStrengths(strengths.filter(s => s !== strength));
    } else {
      setStrengths([...strengths, strength]);
    }
  };

  const handleToggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleAddCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      setInterests([...interests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleNext = () => {
    if (strengths.length === 0) {
      alert('Please select at least one strength.');
      return;
    }

    if (interests.length === 0) {
      alert('Please add at least one interest.');
      return;
    }

    onComplete({ strengths, interests, learningStyle });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="parent-heading text-3xl mb-3" style={{ color: 'var(--parent-text)' }}>
          What does {childName} love and excel at?
        </h2>
        <p className="text-base" style={{ color: 'var(--parent-text-light)' }}>
          Understanding strengths helps us build on what's working well.
        </p>
      </div>

      {/* Strengths Section */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
          Strengths
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
          Select all that apply
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {strengthOptions.map((strength) => {
            const isSelected = strengths.includes(strength);
            return (
              <button
                key={strength}
                onClick={() => handleToggleStrength(strength)}
                className="p-4 rounded-lg border-2 transition-all text-center"
                style={{
                  borderColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
                  backgroundColor: isSelected ? 'var(--parent-bg)' : 'white',
                  color: isSelected ? 'var(--parent-accent)' : 'var(--parent-text)'
                }}
              >
                <div className="font-medium text-sm">{strength}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interests Section */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
          Interests & Hobbies
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
          What activities does {childName} enjoy?
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {interestSuggestions.map((interest) => {
            const isSelected = interests.includes(interest);
            return (
              <button
                key={interest}
                onClick={() => handleToggleInterest(interest)}
                className="p-4 rounded-lg border-2 transition-all text-center"
                style={{
                  borderColor: isSelected ? 'var(--parent-accent)' : 'var(--parent-border)',
                  backgroundColor: isSelected ? 'var(--parent-bg)' : 'white',
                  color: isSelected ? 'var(--parent-accent)' : 'var(--parent-text)'
                }}
              >
                <div className="font-medium text-sm">{interest}</div>
              </button>
            );
          })}
        </div>

        {/* Custom Interest */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomInterest()}
            placeholder="Add another interest..."
            className="flex-1 px-4 py-3 border rounded-lg"
            style={{ borderColor: 'var(--parent-border)' }}
          />
          <button
            onClick={handleAddCustomInterest}
            className="px-6 py-3 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--parent-accent)',
              color: 'white'
            }}
          >
            Add
          </button>
        </div>

        {/* Selected Interests */}
        {interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: 'var(--parent-accent)',
                  color: 'white'
                }}
              >
                {interest}
                <button
                  onClick={() => setInterests(interests.filter(i => i !== interest))}
                  className="hover:opacity-70"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Learning Style Section */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
          Learning Style
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
          How does {childName} learn best?
        </p>

        <div className="space-y-3">
          {[
            { value: 'visual' as LearningStyle, label: 'Visual', description: 'Pictures, diagrams, charts, and visual aids' },
            { value: 'auditory' as LearningStyle, label: 'Auditory', description: 'Listening, discussions, and verbal instructions' },
            { value: 'kinesthetic' as LearningStyle, label: 'Kinesthetic', description: 'Hands-on activities, movement, and doing' },
            { value: 'reading-writing' as LearningStyle, label: 'Reading/Writing', description: 'Written words, lists, and note-taking' },
            { value: 'mixed' as LearningStyle, label: 'Mixed / Not Sure', description: 'A combination of different styles' }
          ].map((style) => (
            <button
              key={style.value}
              onClick={() => setLearningStyle(style.value)}
              className="w-full p-4 rounded-lg border-2 transition-all text-left"
              style={{
                borderColor: learningStyle === style.value ? 'var(--parent-accent)' : 'var(--parent-border)',
                backgroundColor: learningStyle === style.value ? 'var(--parent-bg)' : 'white'
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: learningStyle === style.value ? 'var(--parent-accent)' : 'var(--parent-border)',
                    color: learningStyle === style.value ? 'white' : 'transparent'
                  }}
                >
                  {learningStyle === style.value && '✓'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold mb-1" style={{ color: 'var(--parent-text)' }}>
                    {style.label}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                    {style.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 justify-end">
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
