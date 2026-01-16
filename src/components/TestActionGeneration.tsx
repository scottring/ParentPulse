'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Test component for manually triggering AI action generation
 *
 * To use: Add this to your dashboard temporarily for testing:
 *
 * import TestActionGeneration from '@/components/TestActionGeneration';
 *
 * // In your dashboard JSX, add:
 * <TestActionGeneration />
 *
 * Remove this component once you've verified the system works!
 */
export default function TestActionGeneration() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleTest = async () => {
    setLoading(true);
    setResult('');

    try {
      const functions = getFunctions();
      const generateActions = httpsCallable(functions, 'generateDailyActionsManual');

      console.log('Calling AI action generation...');
      const response = await generateActions();

      const data = response.data as any;
      const message = `Success! Generated ${data.actionsCreated} action${data.actionsCreated === 1 ? '' : 's'} for tomorrow.`;

      setResult(message);
      console.log('Result:', data);

      // Refresh page after 2 seconds to show new actions
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Error generating actions:', error);
      let errorMessage = 'Failed to generate actions. ';

      if (error.code === 'functions/not-found') {
        errorMessage += 'Cloud Function not found. Make sure you deployed it with: firebase deploy --only functions';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage += 'You must be logged in as a parent to generate actions.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Check the browser console for details.';
      }

      setResult(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="parent-card p-6 mb-8 animate-fade-in-up"
      style={{
        borderLeft: '4px solid #9C27B0',
        backgroundColor: '#F3E5F5',
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🧪</span>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              Test AI Action Generation
            </h3>
          </div>

          <p className="text-sm mb-3" style={{ color: 'var(--parent-text-light)' }}>
            This will analyze today's journal entries and generate actions for tomorrow.
            Normally this happens automatically at 9 PM.
          </p>

          {result && (
            <div
              className="mb-3 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: result.includes('Success') ? '#E8F5E9' : '#FEE2E2',
                color: result.includes('Success') ? '#2E7D32' : '#C62828',
                border: `1px solid ${result.includes('Success') ? '#81C784' : '#EF9A9A'}`,
              }}
            >
              {result}
            </div>
          )}

          <div className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
            <strong>Prerequisites:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Cloud Functions deployed (<code>firebase deploy --only functions</code>)</li>
              <li>OpenAI API key set (<code>firebase functions:secrets:set OPENAI_API_KEY</code>)</li>
              <li>At least one journal entry created today</li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleTest}
          disabled={loading}
          className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          style={{
            backgroundColor: '#9C27B0',
            color: 'white',
          }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </span>
          ) : (
            '▶️ Generate Now'
          )}
        </button>
      </div>

      <details className="mt-4">
        <summary className="text-xs cursor-pointer" style={{ color: '#9C27B0' }}>
          <span className="hover:underline">Troubleshooting</span>
        </summary>
        <div className="mt-2 p-3 rounded-lg text-xs space-y-2" style={{
          backgroundColor: 'white',
          border: '1px solid #E0E0E0'
        }}>
          <p><strong>Function not found?</strong></p>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">firebase deploy --only functions</pre>

          <p><strong>API key error?</strong></p>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">firebase functions:secrets:set OPENAI_API_KEY</pre>

          <p><strong>No journal entries?</strong></p>
          <p>Create at least one journal entry today before testing.</p>

          <p><strong>Check logs:</strong></p>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">firebase functions:log</pre>
        </div>
      </details>
    </div>
  );
}
