'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { CoachChat } from './CoachChat';

interface FloatingCoachButtonProps {
  // Optional context to pass to the coach
  context?: {
    type: 'plan' | 'focus' | 'manual' | 'general';
    data?: Record<string, unknown>;
    personId?: string;
    personName?: string;
  };
}

export function FloatingCoachButton({ context }: FloatingCoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const pathname = usePathname();

  // Close coach when navigating to a different page
  useEffect(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, [pathname]);

  // Don't show on login/register pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/landing') {
    return null;
  }

  return (
    <>
      {/* Floating button */}
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

      {/* Chat panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isMinimized
              ? 'bottom-6 right-6 w-72 h-14'
              : 'bottom-6 right-6 w-[420px] h-[600px] max-h-[80vh]'
          }`}
        >
          {isMinimized ? (
            // Minimized bar
            <button
              onClick={() => setIsMinimized(false)}
              className="w-full h-full bg-amber-600 border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between px-4 hover:bg-amber-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">💬</span>
                <span className="font-mono text-sm font-bold text-white">AI COACH</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber-200">Click to expand</span>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </button>
          ) : (
            // Full chat panel
            <div className="h-full flex flex-col bg-white border-2 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              {/* Custom header with minimize/close */}
              <div className="flex items-center justify-between px-4 py-2 bg-amber-600 border-b-2 border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-white text-lg">💬</span>
                  <span className="font-mono text-sm font-bold text-white">AI COACH</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-amber-700 rounded transition-colors"
                    aria-label="Minimize"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-amber-700 rounded transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chat content */}
              <div className="flex-1 overflow-hidden">
                <CoachChat
                  personId={context?.personId}
                  personName={context?.personName}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backdrop for mobile */}
      {isOpen && !isMinimized && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export default FloatingCoachButton;
