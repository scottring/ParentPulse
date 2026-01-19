/**
 * AddObservationModal Component
 *
 * Quick modal for capturing observations about a person
 * Accessible from dashboard and workbook pages
 */

'use client';

import { useState } from 'react';
import { HeroIcon } from '@/components/common/HeroIcon';
import { useWorkbookObservations } from '@/hooks/useWorkbookObservations';
import { WorkbookObservation } from '@/types/workbook';

interface AddObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbookId: string;
  familyId: string;
  personId: string;
  personName: string;
}

export function AddObservationModal({
  isOpen,
  onClose,
  workbookId,
  familyId,
  personId,
  personName
}: AddObservationModalProps) {
  const { addObservation } = useWorkbookObservations(workbookId, familyId, personId);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<WorkbookObservation['category']>('neutral');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!text.trim()) {
      setError('Please enter an observation');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await addObservation(text.trim(), category, tags);

      // Reset form
      setText('');
      setCategory('neutral');
      setTags([]);
      setTagInput('');

      onClose();
    } catch (err) {
      console.error('Error adding observation:', err);
      setError('Failed to save observation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const categoryOptions: Array<{ value: WorkbookObservation['category']; label: string; icon: string; color: string }> = [
    { value: 'positive', label: 'Positive', icon: 'FaceSmileIcon', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'challenging', label: 'Challenging', icon: 'ExclamationTriangleIcon', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'neutral', label: 'Neutral', icon: 'MinusIcon', color: 'text-stone-600 bg-stone-50 border-stone-200' },
    { value: 'milestone', label: 'Milestone', icon: 'TrophyIcon', color: 'text-purple-600 bg-purple-50 border-purple-200' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <HeroIcon name="EyeIcon" className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Add Observation
              </h2>
              <p className="text-sm text-stone-600">
                About {personName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
            disabled={saving}
          >
            <HeroIcon name="XMarkIcon" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Observation text */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              What did you observe?
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`e.g., ${personName} handled the transition from playtime to homework really well today...`}
              className="w-full h-32 px-4 py-3 border-2 border-stone-200 rounded-lg focus:border-emerald-500 focus:outline-none resize-none text-stone-900 placeholder-stone-400"
              disabled={saving}
              autoFocus
            />
            <p className="text-xs text-stone-500 mt-2">
              Capture what you noticed, what was happening, and any relevant context
            </p>
          </div>

          {/* Category selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 mb-3">
              Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setCategory(option.value)}
                  className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg transition-all ${
                    category === option.value
                      ? option.color + ' border-2'
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                  disabled={saving}
                >
                  <HeroIcon name={option.icon as any} className="w-5 h-5" />
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Tags (optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 border-2 border-stone-200 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                disabled={saving}
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors text-sm font-medium disabled:opacity-50"
                disabled={saving || !tagInput.trim()}
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm text-emerald-700"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-emerald-600 hover:text-emerald-800"
                      disabled={saving}
                    >
                      <HeroIcon name="XMarkIcon" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-stone-500 mt-2">
              Examples: homework, morning routine, social, bedtime
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <HeroIcon name="XCircleIcon" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-700 hover:text-stone-900 font-medium transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={saving || !text.trim()}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <HeroIcon name="CheckIcon" className="w-5 h-5" />
                Save Observation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
