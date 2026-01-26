'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { QuickCaptureModal } from './QuickCaptureModal';

interface QuickCaptureButtonProps {
  // Optional: pre-select a person
  defaultPersonId?: string;
  defaultPersonName?: string;
  // Position - can be used alongside coach button
  position?: 'bottom-left' | 'bottom-right';
}

export function QuickCaptureButton({
  defaultPersonId,
  defaultPersonName,
  position = 'bottom-left',
}: QuickCaptureButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Don't show on login/register/landing pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/landing') {
    return null;
  }

  const positionClasses = position === 'bottom-left'
    ? 'left-6'
    : 'right-24'; // Offset from coach button

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 ${positionClasses} z-40 flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]`}
        aria-label="Capture a concern"
      >
        <svg
          className="w-5 h-5 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span className="font-mono text-xs font-bold uppercase">
          What&apos;s on your mind?
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <QuickCaptureModal
          onClose={() => setIsOpen(false)}
          defaultPersonId={defaultPersonId}
          defaultPersonName={defaultPersonName}
        />
      )}
    </>
  );
}

export default QuickCaptureButton;
