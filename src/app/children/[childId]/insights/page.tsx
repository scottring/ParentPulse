'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { useObservations } from '@/hooks/useObservations';
import { usePatternAnalysis, PatternAnalysis } from '@/hooks/usePatternAnalysis';
import Navigation from '@/components/layout/Navigation';

export default function InsightsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren();
  const childId = params.childId as string;

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null);
  const [daysBack, setDaysBack] = useState(14);

  const { observations } = useObservations(childId);
  const { analyzePatterns, loading: analyzing, error: analysisError } = usePatternAnalysis();

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

  const handleAnalyze = async () => {
    try {
      const result = await analyzePatterns(childId, daysBack);
      setAnalysis(result);
    } catch (err) {
      console.error('Error analyzing patterns:', err);
    }
  };

  // Auto-analyze on load if there are observations
  useEffect(() => {
    if (child && observations.length >= 5 && !analysis) {
      handleAnalyze();
    }
  }, [child, observations]);

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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Pattern Insights for {child.name}
          </h1>
          <p className="text-sm text-gray-600">
            AI-discovered patterns from {observations.length} behavior observations
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Analyze last:
              </label>
              <select
                value={daysBack}
                onChange={(e) => setDaysBack(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
              </select>
            </div>
            <div className="flex-1"></div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || observations.length < 3}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors text-sm ${
                analyzing || observations.length < 3
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {analyzing ? 'Analyzing...' : '🔍 Analyze Patterns'}
            </button>
          </div>
          {observations.length < 3 && (
            <p className="mt-4 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
              ⚠️ Need at least 3 observations to analyze patterns. You have {observations.length}.
            </p>
          )}
        </div>

        {/* Analysis Results */}
        {analysisError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-red-900 mb-2">Error</h3>
            <p className="text-red-700">{analysisError}</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Insights */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Key Insights ({analysis.insights?.length || 0})
              </h2>
              {analysis.insights && analysis.insights.length > 0 ? (
                <div className="space-y-4">
                  {analysis.insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'success'
                          ? 'bg-green-50 border-green-500'
                          : insight.type === 'failure'
                          ? 'bg-red-50 border-red-500'
                          : insight.type === 'pattern'
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-purple-50 border-purple-500'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900">
                          {insight.type === 'success' && '✅ '}
                          {insight.type === 'failure' && '❌ '}
                          {insight.type === 'pattern' && '📈 '}
                          {insight.type === 'experiment' && '🔬 '}
                          {insight.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded ${
                            insight.priority === 'high'
                              ? 'bg-red-600 text-white'
                              : insight.priority === 'medium'
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-400 text-white'
                          }`}
                        >
                          {insight.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700">{insight.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No insights generated yet.</p>
              )}
            </div>

            {/* Effectiveness Updates */}
            {analysis.effectivenessUpdates && analysis.effectivenessUpdates.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  🎯 Suggested Rating Updates ({analysis.effectivenessUpdates.length})
                </h2>
                <p className="text-gray-600 mb-4">
                  Based on real-world data, these strategies should have updated effectiveness ratings:
                </p>
                <div className="space-y-3">
                  {analysis.effectivenessUpdates.map((update, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{update.strategyText}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {update.currentRating}/5 → {update.suggestedRating}/5
                          </span>
                          {update.suggestedRating > update.currentRating ? (
                            <span className="text-green-600 font-bold">⬆️</span>
                          ) : (
                            <span className="text-red-600 font-bold">⬇️</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{update.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Strategies */}
            {analysis.suggestedStrategies && analysis.suggestedStrategies.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  💡 New Strategies to Try ({analysis.suggestedStrategies.length})
                </h2>
                <div className="space-y-3">
                  {analysis.suggestedStrategies.map((strategy, idx) => (
                    <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{strategy.text}</h3>
                        <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded">
                          Est. {strategy.estimatedEffectiveness}/5
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{strategy.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Experiments */}
            {analysis.suggestedExperiments && analysis.suggestedExperiments.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  🔬 Experiments to Run ({analysis.suggestedExperiments.length})
                </h2>
                <p className="text-gray-600 mb-4">
                  Test these hypotheses to discover what works best:
                </p>
                <div className="space-y-4">
                  {analysis.suggestedExperiments.map((experiment, idx) => (
                    <div key={idx} className="p-6 bg-purple-50 rounded-lg border-2 border-purple-300">
                      <h3 className="font-bold text-purple-900 text-lg mb-3">
                        Experiment #{idx + 1}: {experiment.hypothesis}
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">📋 What to do:</h4>
                          <p className="text-gray-700">{experiment.testInstructions}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">✅ Look for:</h4>
                          <p className="text-gray-700">{experiment.measureSuccess}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">⏰ Duration:</h4>
                          <p className="text-gray-700">{experiment.duration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!analysis && !analyzing && observations.length >= 3 && (
          <div className="bg-gray-100 rounded-lg p-12 text-center">
            <p className="text-gray-600 text-lg">
              Click "Analyze Patterns" above to discover insights from your observations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
