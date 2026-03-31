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
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 rounded-lg p-4"
        style={{
          background: 'linear-gradient(145deg, #2a2a2a, #1e1e1e)',
          boxShadow: '0 0 30px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-mono text-[11px] font-bold tracking-widest"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            🚨 SOMETHING HAPPENED
          </h3>
          <button
            onClick={onClose}
            className="font-mono text-[11px] px-2 py-0.5 rounded"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ✕
          </button>
        </div>

        <p
          className="font-mono text-[11px] mb-3"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Tell us what happened. The AI will map it to your dimensions and decide whether to adjust your growth trajectory.
        </p>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="We just had a fight about..."
          rows={4}
          className="w-full rounded p-3 font-mono text-[12px] resize-none focus:outline-none"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)',
          }}
          autoFocus
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="font-mono text-[11px] px-4 py-2 rounded"
            style={{
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className="font-mono text-[11px] font-bold px-4 py-2 rounded transition-all disabled:opacity-30"
            style={{
              background: 'rgba(217,119,6,0.2)',
              color: '#d97706',
              border: '1px solid rgba(217,119,6,0.3)',
              boxShadow: text.trim() ? '0 0 8px rgba(217,119,6,0.15)' : 'none',
            }}
          >
            {loading ? 'ANALYZING...' : 'RECALCULATE'}
          </button>
        </div>
      </div>
    </div>
  );
}
