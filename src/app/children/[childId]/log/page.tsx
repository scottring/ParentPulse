'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { useChildManual } from '@/hooks/useChildManual';
import { useObservations } from '@/hooks/useObservations';
import Navigation from '@/components/layout/Navigation';

export default function ObservationLogPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren();
  const childId = params.childId as string;

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { manual } = useChildManual(childId);
  const { observations, logObservation, loading: obsLoading } = useObservations(childId);

  // Form state
  const [situation, setSituation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [customStrategy, setCustomStrategy] = useState('');
  const [outcome, setOutcome] = useState<'worked_great' | 'worked_okay' | 'didnt_work' | 'made_worse' | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Common situations for quick selection
  const commonSituations = [
    'Morning routine',
    'Bedtime',
    'Homework',
    'Leaving the house',
    'Mealtime',
    'Screen time transition',
    'Playing with siblings',
    'At school',
    'After school',
    'Other',
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (children.length > 0) {
      const foundChild = children.find((c) => c.childId === childId);
      if (foundChild) {
        setChild(foundChild);
      } else {
        router.push('/test');
      }
      setLoading(false);
    }
  }, [user, children, childId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!situation || !description || !outcome) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const strategyText = selectedStrategyId
        ? manual?.whatWorks.find(s => s.id === selectedStrategyId)?.text || customStrategy
        : customStrategy;

      await logObservation({
        childId,
        situation,
        description,
        strategyUsed: strategyText ? {
          strategyId: selectedStrategyId || undefined,
          strategyText,
        } : undefined,
        outcome,
        notes: notes || undefined,
      });

      // Reset form
      setSituation('');
      setDescription('');
      setSelectedStrategyId('');
      setCustomStrategy('');
      setOutcome('');
      setNotes('');

      alert('✅ Observation logged successfully!');
    } catch (err) {
      console.error('Error logging observation:', err);
      alert(`Failed to log observation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Child not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Log Observation for {child.name}
          </h1>
          <p className="text-sm text-gray-600">
            Track what happened and what worked (or didn't) to discover patterns over time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form - Left side (2/3 width) */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Log</h2>

              {/* Situation */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What was the situation? *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {commonSituations.map((sit) => (
                    <button
                      key={sit}
                      type="button"
                      onClick={() => setSituation(sit)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        situation === sit
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {sit}
                    </button>
                  ))}
                </div>
                {situation === 'Other' && (
                  <input
                    type="text"
                    value={situation === 'Other' ? '' : situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="Describe the situation..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What happened? *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what happened..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  required
                />
              </div>

              {/* Strategy Used */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  What strategy did you try? (optional)
                </label>
                {manual?.whatWorks && manual.whatWorks.length > 0 ? (
                  <>
                    <select
                      value={selectedStrategyId}
                      onChange={(e) => {
                        setSelectedStrategyId(e.target.value);
                        setCustomStrategy('');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                    >
                      <option value="">-- Select from manual --</option>
                      {manual.whatWorks.map((strategy) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.text} (effectiveness: {strategy.effectiveness}/5)
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mb-2">Or enter a different strategy:</p>
                  </>
                ) : null}
                <input
                  type="text"
                  value={customStrategy}
                  onChange={(e) => {
                    setCustomStrategy(e.target.value);
                    setSelectedStrategyId('');
                  }}
                  placeholder="e.g., 'Gave 10-minute warning', 'Let him take a break', etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Outcome */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  How did it go? *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutcome('worked_great')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      outcome === 'worked_great'
                        ? 'bg-green-100 border-green-500 shadow-md'
                        : 'bg-white border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <span className="text-4xl">😊</span>
                    <span className="text-sm font-medium">Worked Great!</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome('worked_okay')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      outcome === 'worked_okay'
                        ? 'bg-yellow-100 border-yellow-500 shadow-md'
                        : 'bg-white border-gray-300 hover:border-yellow-300'
                    }`}
                  >
                    <span className="text-4xl">😐</span>
                    <span className="text-sm font-medium">Worked Okay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome('didnt_work')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      outcome === 'didnt_work'
                        ? 'bg-orange-100 border-orange-500 shadow-md'
                        : 'bg-white border-gray-300 hover:border-orange-300'
                    }`}
                  >
                    <span className="text-4xl">😞</span>
                    <span className="text-sm font-medium">Didn't Work</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutcome('made_worse')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      outcome === 'made_worse'
                        ? 'bg-red-100 border-red-500 shadow-md'
                        : 'bg-white border-gray-300 hover:border-red-300'
                    }`}
                  >
                    <span className="text-4xl">😡</span>
                    <span className="text-sm font-medium">Made Worse</span>
                  </button>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other details..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || !situation || !description || !outcome}
                className={`w-full py-3 rounded-lg font-medium text-sm transition-colors ${
                  saving || !situation || !description || !outcome
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {saving ? 'Saving...' : 'Log Observation'}
              </button>
            </form>
          </div>

          {/* Recent Observations - Right side (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Recent Observations ({observations.length})
              </h3>
              {obsLoading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : observations.length === 0 ? (
                <p className="text-gray-500 text-sm">No observations yet. Log your first one!</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {observations.slice(0, 10).map((obs) => (
                    <div key={obs.observationId} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-600">{obs.situation}</span>
                        <span className="text-lg">
                          {obs.outcome === 'worked_great' && '😊'}
                          {obs.outcome === 'worked_okay' && '😐'}
                          {obs.outcome === 'didnt_work' && '😞'}
                          {obs.outcome === 'made_worse' && '😡'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{obs.description}</p>
                      {obs.strategyUsed && (
                        <p className="text-xs text-blue-600">
                          Strategy: {obs.strategyUsed.strategyText}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{obs.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
