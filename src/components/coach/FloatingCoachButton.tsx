'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { CoachChat } from './CoachChat';

interface FloatingCoachButtonProps {
  // Optional context to pass to the coach
  context?: {
    type: 'plan' | 'focus' | 'manual' | 'general' | 'household';
    data?: Record<string, unknown>;
    personId?: string;
    personName?: string;
  };
}

// Global event system for triggering coach from anywhere
const COACH_OPEN_EVENT = 'openCoachWithMessage';

export interface CoachOpenEvent {
  message: string;
  context?: string;
  includeHousehold?: boolean;
}

// Function to trigger coach from outside the component
export function openCoachWithMessage(message: string, context?: string, includeHousehold?: boolean) {
  window.dispatchEvent(new CustomEvent(COACH_OPEN_EVENT, {
    detail: { message, context, includeHousehold }
  }));
}

export function FloatingCoachButton({ context }: FloatingCoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | undefined>(undefined);
  const [forceHousehold, setForceHousehold] = useState(false);
  const pathname = usePathname();

  // Detect if we're on a household page
  const isHouseholdPage = pathname?.includes('/household');

  // Listen for external open requests
  const handleOpenRequest = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<CoachOpenEvent>;
    setInitialMessage(customEvent.detail.message);
    if (customEvent.detail.includeHousehold) {
      setForceHousehold(true);
    }
    setIsOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(COACH_OPEN_EVENT, handleOpenRequest);
    return () => window.removeEventListener(COACH_OPEN_EVENT, handleOpenRequest);
  }, [handleOpenRequest]);

  // Close coach when navigating to a different page
  useEffect(() => {
    setIsOpen(false);
    setInitialMessage(undefined);
    setForceHousehold(false);
  }, [pathname]);

  // Clear initial message when coach is closed
  const handleClose = () => {
    setIsOpen(false);
    setInitialMessage(undefined);
    setForceHousehold(false);
  };

  // Don't show on login/register pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/landing') {
    return null;
  }

  // Determine if we should include household context
  const includeHousehold = forceHousehold || isHouseholdPage || context?.type === 'household';

  return (
    <>
      {/* Floating button - positioned on the right edge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2 border-slate-800"
          aria-label="Open AI Coach"
        >
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Slide-in panel from the right */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col bg-white border-l-4 border-slate-800 shadow-[-8px_0px_24px_rgba(0,0,0,0.15)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-amber-600 border-b-2 border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-white text-lg">💬</span>
              <span className="font-mono text-sm font-bold text-white">AI COACH</span>
              {includeHousehold && (
                <span className="px-2 py-0.5 bg-amber-800 text-amber-100 font-mono text-xs rounded">
                  HOUSEHOLD
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-amber-700 rounded transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            {isOpen && (
              <CoachChat
                personId={context?.personId}
                personName={context?.personName}
                includeHousehold={includeHousehold}
                initialMessage={initialMessage}
                onInitialMessageSent={() => setInitialMessage(undefined)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={handleClose}
        />
      )}
    </>
  );
}

export default FloatingCoachButton;
