'use client';

import { useState } from 'react';

interface Strategy {
  description: string;
  effectiveness: 1 | 2 | 3 | 4 | 5;
  context: string;
}

interface StrategyNoWork {
  description: string;
  context: string;
}

interface StrategiesStepProps {
  childName: string;
  initialData: {
    whatWorks: Strategy[];
    whatDoesntWork: StrategyNoWork[];
  };
  onComplete: (data: {
    whatWorks: Strategy[];
    whatDoesntWork: StrategyNoWork[];
  }) => void;
  onBack: () => void;
  onSkip: () => void;
}

const exampleWorks = [
  'Giving 5-minute warnings before transitions',
  'Visual schedule on the fridge',
  'Offering two choices instead of open-ended questions',
  'One-on-one time before bed',
  'Using a timer for tasks',
  'Breaking big tasks into smaller steps',
  'Praise for effort, not just results'
];

const exampleDoesntWork = [
  'Yelling or raising my voice',
  'Taking away all privileges at once',
  'Long explanations when they're upset',
  'Comparing to siblings',
  'Punishment without explanation'
];

export default function StrategiesStep({
  childName,
  initialData,
  onComplete,
  onBack,
  onSkip
}: StrategiesStepProps) {
  const [whatWorks, setWhatWorks] = useState<Strategy[]>(initialData.whatWorks);
  const [whatDoesntWork, setWhatDoesntWork] = useState<StrategyNoWork[]>(initialData.whatDoesntWork);

  const [newWork, setNewWork] = useState({ description: '', effectiveness: 3 as 1 | 2 | 3 | 4 | 5, context: '' });
  const [newNoWork, setNewNoWork] = useState({ description: '', context: '' });

  const handleAddWork = () => {
    if (!newWork.description.trim()) return;

    setWhatWorks([...whatWorks, newWork]);
    setNewWork({ description: '', effectiveness: 3, context: '' });
  };

  const handleAddNoWork = () => {
    if (!newNoWork.description.trim()) return;

    setWhatDoesntWork([...whatDoesntWork, newNoWork]);
    setNewNoWork({ description: '', context: '' });
  };

  const handleComplete = () => {
    onComplete({ whatWorks, whatDoesntWork });
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="parent-heading text-3xl mb-3" style={{ color: 'var(--parent-text)' }}>
          What strategies have you tried with {childName}?
        </h2>
        <p className="text-base mb-2" style={{ color: 'var(--parent-text-light)' }}>
          This step is optional but extremely valuable for creating your personalized plan.
        </p>
        <button
          onClick={onSkip}
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--parent-accent)' }}
        >
          Skip this step →
        </button>
      </div>

      {/* What Works Section */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
          What Works Well
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
          Strategies or approaches that have been effective with {childName}
        </p>

        {/* Examples */}
        <div className="parent-card p-4 mb-4" style={{ backgroundColor: 'var(--parent-bg)' }}>
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
            Examples:
          </div>
          <ul className="text-sm space-y-1" style={{ color: 'var(--parent-text-light)' }}>
            {exampleWorks.map((ex, idx) => (
              <li key={idx}>• {ex}</li>
            ))}
          </ul>
        </div>

        {/* Add Form */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            value={newWork.description}
            onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
            placeholder="Strategy or approach..."
            className="w-full px-4 py-3 border rounded-lg"
            style={{ borderColor: 'var(--parent-border)' }}
          />

          <textarea
            value={newWork.context}
            onChange={(e) => setNewWork({ ...newWork, context: e.target.value })}
            placeholder="When or where does this work? (optional)"
            rows={2}
            className="w-full px-4 py-3 border rounded-lg"
            style={{ borderColor: 'var(--parent-border)' }}
          />

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
              How effective is this? (1 = somewhat, 5 = very effective)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setNewWork({ ...newWork, effectiveness: num as 1 | 2 | 3 | 4 | 5 })}
                  className="flex-1 py-2 rounded-lg border-2 transition-all"
                  style={{
                    borderColor: newWork.effectiveness === num ? 'var(--parent-accent)' : 'var(--parent-border)',
                    backgroundColor: newWork.effectiveness === num ? 'var(--parent-bg)' : 'white',
                    color: newWork.effectiveness === num ? 'var(--parent-accent)' : 'var(--parent-text)'
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddWork}
            className="w-full py-3 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--parent-accent)',
              color: 'white'
            }}
          >
            Add Strategy
          </button>
        </div>

        {/* List of Added Strategies */}
        {whatWorks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium" style={{ color: 'var(--parent-text)' }}>
              Added strategies:
            </div>
            {whatWorks.map((strategy, idx) => (
              <div key={idx} className="parent-card p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                    {strategy.description}
                  </div>
                  {strategy.context && (
                    <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      {strategy.context}
                    </div>
                  )}
                  <div className="mt-2 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className="text-lg"
                        style={{
                          color: i < strategy.effectiveness ? 'var(--parent-accent)' : 'var(--parent-border)'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setWhatWorks(whatWorks.filter((_, i) => i !== idx))}
                  className="ml-4 text-xl hover:opacity-70"
                  style={{ color: 'var(--parent-text-light)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What Doesn't Work Section */}
      <div className="mb-10">
        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
          What Doesn't Work
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
          Approaches that haven't been effective or make things worse
        </p>

        {/* Examples */}
        <div className="parent-card p-4 mb-4" style={{ backgroundColor: 'var(--parent-bg)' }}>
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
            Examples:
          </div>
          <ul className="text-sm space-y-1" style={{ color: 'var(--parent-text-light)' }}>
            {exampleDoesntWork.map((ex, idx) => (
              <li key={idx}>• {ex}</li>
            ))}
          </ul>
        </div>

        {/* Add Form */}
        <div className="space-y-3 mb-4">
          <input
            type="text"
            value={newNoWork.description}
            onChange={(e) => setNewNoWork({ ...newNoWork, description: e.target.value })}
            placeholder="What doesn't work..."
            className="w-full px-4 py-3 border rounded-lg"
            style={{ borderColor: 'var(--parent-border)' }}
          />

          <textarea
            value={newNoWork.context}
            onChange={(e) => setNewNoWork({ ...newNoWork, context: e.target.value })}
            placeholder="Why doesn't this work? (optional)"
            rows={2}
            className="w-full px-4 py-3 border rounded-lg"
            style={{ borderColor: 'var(--parent-border)' }}
          />

          <button
            onClick={handleAddNoWork}
            className="w-full py-3 rounded-lg border-2 transition-colors"
            style={{
              borderColor: 'var(--parent-accent)',
              color: 'var(--parent-accent)'
            }}
          >
            Add
          </button>
        </div>

        {/* List of Added Strategies */}
        {whatDoesntWork.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium" style={{ color: 'var(--parent-text)' }}>
              Added:
            </div>
            {whatDoesntWork.map((strategy, idx) => (
              <div key={idx} className="parent-card p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                    {strategy.description}
                  </div>
                  {strategy.context && (
                    <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                      {strategy.context}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setWhatDoesntWork(whatDoesntWork.filter((_, i) => i !== idx))}
                  className="ml-4 text-xl hover:opacity-70"
                  style={{ color: 'var(--parent-text-light)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
          onClick={onSkip}
          className="px-8 py-3 rounded-lg border transition-colors"
          style={{
            borderColor: 'var(--parent-border)',
            color: 'var(--parent-text-light)'
          }}
        >
          Skip & Finish
        </button>
        <button
          onClick={handleComplete}
          className="px-8 py-3 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--parent-accent)',
            color: 'white'
          }}
        >
          Complete Profile
        </button>
      </div>
    </div>
  );
}
