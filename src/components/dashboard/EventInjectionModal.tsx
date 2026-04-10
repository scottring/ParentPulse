'use client';

import { useState } from 'react';

interface EventInjectionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  loading?: boolean;
}

export default function EventInjectionModal({
  open, onClose, onSubmit, loading,
}: EventInjectionModalProps) {
  const [text, setText] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await onSubmit(text.trim());
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-lg p-4"
        style={{
          background: '#FFFFFF',
          boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
          border: '2px solid #2C2C2C',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-[16px] font-bold tracking-widest"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#2C2C2C' }}
          >
            🚨 SOMETHING HAPPENED
          </h3>
          <button
            onClick={onClose}
            className="text-[16px] px-2 py-0.5 rounded"
            style={{ fontFamily: 'var(--font-parent-body)', color: '#4A4238' }}
          >
            ✕
          </button>
        </div>

        <p
          className="text-[16px] mb-3"
          style={{ fontFamily: 'var(--font-parent-body)', color: '#4A4238' }}
        >
          Tell us what happened. The AI will map it to your dimensions and decide whether to adjust your growth trajectory.
        </p>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="We just had a fight about..."
          rows={4}
          className="w-full rounded p-3 text-[17px] resize-none focus:outline-none"
          style={{
            fontFamily: 'var(--font-parent-body)',
            background: '#FAF8F5',
            border: '1px solid #E8E3DC',
            color: '#2C2C2C',
          }}
          autoFocus
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="text-[16px] px-4 py-2 rounded"
            style={{
              fontFamily: 'var(--font-parent-body)',
              color: '#4A4238',
              border: '1px solid #E8E3DC',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className="text-[16px] font-bold px-4 py-2 rounded transition-all disabled:opacity-30"
            style={{
              fontFamily: 'var(--font-parent-body)',
              background: 'rgba(124,144,130,0.1)',
              color: '#7C9082',
              border: '1px solid rgba(124,144,130,0.5)',
              boxShadow: text.trim() ? '2px 2px 0px 0px rgba(124,144,130,0.4)' : 'none',
            }}
          >
            {loading ? 'ANALYZING...' : 'RECALCULATE'}
          </button>
        </div>
      </div>
    </div>
  );
}
