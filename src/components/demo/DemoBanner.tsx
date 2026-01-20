'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isDemoUser } from '@/utils/demo';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export function DemoBanner() {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isDemo = user && isDemoUser(user);

  // DEBUG: Log user state
  console.log('DemoBanner - User:', user);
  console.log('DemoBanner - isDemo:', isDemo);
  console.log('DemoBanner - isDemoUser result:', user ? isDemoUser(user) : 'no user');

  if (!isDemo) {
    return null;
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all demo data? This will delete all people, manuals, and workbooks.')) {
      return;
    }

    setResetting(true);
    setMessage(null);

    try {
      const resetDemoAccount = httpsCallable(functions, 'resetDemoAccount');
      const result = await resetDemoAccount();

      // @ts-ignore
      if (result.data.success) {
        setMessage({
          type: 'success',
          // @ts-ignore
          text: `Demo reset complete! Deleted ${result.data.deleted.people} people, ${result.data.deleted.manuals} manuals, ${result.data.deleted.workbooks} workbooks.`
        });

        // Redirect to people page after 2 seconds
        setTimeout(() => {
          window.location.href = '/people';
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          // @ts-ignore
          text: result.data.error || 'Failed to reset demo account'
        });
      }
    } catch (error) {
      console.error('Error resetting demo account:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      {/* Success/Error Message - top of screen when present */}
      {message && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className={`${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 text-center font-mono text-xs`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Subtle banner at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 bg-opacity-90 text-white border-t border-slate-700" style={{ zIndex: 40 }}>
        <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 opacity-75">
            <span className="text-sm">✨</span>
            <span className="font-mono font-medium">Demo Mode</span>
            <span className="hidden sm:inline opacity-60">· Auto-fill available</span>
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 font-mono text-xs rounded transition-all disabled:opacity-50"
          >
            {resetting ? 'Resetting...' : 'Reset Demo'}
          </button>
        </div>
      </div>
    </>
  );
}
