'use client';

import React, { useState } from 'react';
import { TechnicalCard, TechnicalLabel, TechnicalButton } from '../technical';

interface MilestoneEditorProps {
  day30: string;
  day60: string;
  day90: string;
  onUpdate: (milestones: { day30: string; day60: string; day90: string }) => void;
  suggestedMilestones?: { day30: string; day60: string; day90: string };
  className?: string;
}

export function MilestoneEditor({
  day30,
  day60,
  day90,
  onUpdate,
  suggestedMilestones,
  className = '',
}: MilestoneEditorProps) {
  const [editingDay, setEditingDay] = useState<'day30' | 'day60' | 'day90' | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (day: 'day30' | 'day60' | 'day90') => {
    setEditingDay(day);
    setEditValue(day === 'day30' ? day30 : day === 'day60' ? day60 : day90);
  };

  const saveEdit = () => {
    if (!editingDay) return;

    onUpdate({
      day30: editingDay === 'day30' ? editValue : day30,
      day60: editingDay === 'day60' ? editValue : day60,
      day90: editingDay === 'day90' ? editValue : day90,
    });
    setEditingDay(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingDay(null);
    setEditValue('');
  };

  const useSuggestion = (day: 'day30' | 'day60' | 'day90') => {
    if (!suggestedMilestones) return;

    onUpdate({
      day30: day === 'day30' ? suggestedMilestones.day30 : day30,
      day60: day === 'day60' ? suggestedMilestones.day60 : day60,
      day90: day === 'day90' ? suggestedMilestones.day90 : day90,
    });
  };

  const milestones = [
    { key: 'day30' as const, day: 30, value: day30, label: 'FIRST MILESTONE' },
    { key: 'day60' as const, day: 60, value: day60, label: 'SECOND MILESTONE' },
    { key: 'day90' as const, day: 90, value: day90, label: 'FINAL MILESTONE' },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <p className="font-mono text-xs text-slate-500 uppercase tracking-wider mb-4">
        DEFINE YOUR 90-DAY VISION
      </p>

      {milestones.map(({ key, day, value, label }) => (
        <TechnicalCard key={key} shadowSize="sm" className="p-4">
          <div className="flex items-start justify-between mb-2">
            <TechnicalLabel
              variant="filled"
              color={day === 30 ? 'amber' : day === 60 ? 'blue' : 'green'}
              size="sm"
            >
              DAY {day} · {label}
            </TechnicalLabel>

            {editingDay !== key && (
              <button
                onClick={() => startEditing(key)}
                className="font-mono text-xs text-slate-500 hover:text-slate-700 uppercase"
              >
                [EDIT]
              </button>
            )}
          </div>

          {editingDay === key ? (
            <div className="space-y-3">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={`What would success look like by day ${day}?`}
                className="
                  w-full p-3 border-2 border-slate-300 font-mono text-sm
                  focus:outline-none focus:border-slate-800
                  resize-none
                "
                rows={3}
                autoFocus
              />

              {suggestedMilestones && suggestedMilestones[key] !== editValue && (
                <div className="p-2 bg-slate-50 border border-slate-200">
                  <p className="font-mono text-[10px] text-slate-400 uppercase mb-1">
                    AI SUGGESTION:
                  </p>
                  <p className="text-xs text-slate-600 italic">
                    &quot;{suggestedMilestones[key]}&quot;
                  </p>
                  <button
                    onClick={() => setEditValue(suggestedMilestones[key])}
                    className="font-mono text-xs text-amber-600 hover:text-amber-700 mt-1"
                  >
                    [USE THIS]
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <TechnicalButton variant="primary" size="sm" onClick={saveEdit}>
                  SAVE
                </TechnicalButton>
                <TechnicalButton variant="outline" size="sm" onClick={cancelEdit}>
                  CANCEL
                </TechnicalButton>
              </div>
            </div>
          ) : (
            <div>
              {value ? (
                <blockquote className="font-mono text-slate-800 italic">
                  &quot;{value}&quot;
                </blockquote>
              ) : (
                <div className="space-y-2">
                  <p className="font-mono text-sm text-slate-400 italic">
                    No milestone set yet
                  </p>
                  {suggestedMilestones && (
                    <button
                      onClick={() => useSuggestion(key)}
                      className="text-left w-full p-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      <p className="font-mono text-[10px] text-amber-600 uppercase mb-1">
                        SUGGESTED:
                      </p>
                      <p className="text-xs text-slate-700">
                        &quot;{suggestedMilestones[key]}&quot;
                      </p>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </TechnicalCard>
      ))}

      {/* Progress indicator */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center text-xs font-mono text-slate-500">
          <span>MILESTONES DEFINED:</span>
          <span>
            {[day30, day60, day90].filter(Boolean).length} / 3
          </span>
        </div>
      </div>
    </div>
  );
}

export default MilestoneEditor;
