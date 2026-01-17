'use client';

import { useState } from 'react';

interface AddTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trigger: {
    description: string;
    context: string;
    typicalResponse: string;
    deescalationStrategy: string;
    severity: 'mild' | 'moderate' | 'significant';
  }) => Promise<void>;
  personName: string;
}

export function AddTriggerModal({ isOpen, onClose, onSave, personName }: AddTriggerModalProps) {
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [typicalResponse, setTypicalResponse] = useState('');
  const [deescalationStrategy, setDeescalationStrategy] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'significant'>('moderate');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !context.trim()) {
      alert('Description and context are required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        description: description.trim(),
        context: context.trim(),
        typicalResponse: typicalResponse.trim(),
        deescalationStrategy: deescalationStrategy.trim(),
        severity
      });

      // Reset form
      setDescription('');
      setContext('');
      setTypicalResponse('');
      setDeescalationStrategy('');
      setSeverity('moderate');
      onClose();
    } catch (error) {
      console.error('Error saving trigger:', error);
      alert('Failed to save trigger. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="parent-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="parent-heading text-2xl flex items-center gap-2" style={{ color: 'var(--parent-text)' }}>
              <span className="text-3xl">⚡</span>
              <span>Add Trigger</span>
            </h2>
            <button
              onClick={onClose}
              className="text-2xl transition-transform hover:scale-110"
              style={{ color: 'var(--parent-text-light)' }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Trigger Description *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`e.g., Transitions between activities`}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
                required
              />
            </div>

            {/* Context */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Context / When does this happen? *
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={`e.g., When switching from playtime to homework`}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
                required
              />
            </div>

            {/* Typical Response */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Typical Response
              </label>
              <textarea
                value={typicalResponse}
                onChange={(e) => setTypicalResponse(e.target.value)}
                placeholder={`e.g., Whining, delaying, frustration`}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
              />
            </div>

            {/* De-escalation Strategy */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                What Helps / De-escalation Strategy
              </label>
              <textarea
                value={deescalationStrategy}
                onChange={(e) => setDeescalationStrategy(e.target.value)}
                placeholder={`e.g., Give 5-minute warning, offer choices`}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--parent-border)',
                  backgroundColor: 'var(--parent-bg)',
                  color: 'var(--parent-text)'
                }}
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                Severity
              </label>
              <div className="flex gap-3">
                {(['mild', 'moderate', 'significant'] as const).map((level) => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value={level}
                      checked={severity === level}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="cursor-pointer"
                    />
                    <span className="capitalize" style={{ color: 'var(--parent-text)' }}>
                      {level}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--parent-border)' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1px solid var(--parent-border)', color: 'var(--parent-text-light)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--parent-accent)' }}
              >
                {saving ? 'Saving...' : 'Add Trigger'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
