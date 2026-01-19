'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { doc, collection, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS } from '@/types';

interface GeneratedContent {
  triggers: Array<{
    text: string;
    severity: number;
    examples?: string[];
  }>;
  whatWorks: Array<{
    text: string;
    effectiveness: number;
    context?: string;
  }>;
  whatDoesntWork: Array<{
    text: string;
  }>;
  strengths: Array<{
    text: string;
  }>;
  contextNotes: string;
}

export default function ReviewManualPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { children } = useChildren();
  const childId = params.childId as string;

  const [child, setChild] = useState<any>(null);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Load child data
    if (children.length > 0) {
      const foundChild = children.find((c) => c.childId === childId);
      if (foundChild) {
        setChild(foundChild);
      } else {
        router.push('/test');
        return;
      }
    }

    // Load generated content from localStorage
    const storedContent = localStorage.getItem(`manual-generated-${childId}`);
    if (storedContent) {
      try {
        setContent(JSON.parse(storedContent));
      } catch (err) {
        console.error('Failed to load generated content:', err);
        router.push(`/children/${childId}/onboard`);
      }
    } else {
      // No generated content, redirect to onboarding
      router.push(`/children/${childId}/onboard`);
    }
  }, [user, children, childId, router]);

  const handleSave = async () => {
    if (!content || !child || !user) return;

    try {
      setSaving(true);

      // Create manual ID
      const manualId = doc(collection(firestore, COLLECTIONS.CHILD_MANUALS)).id;

      // Transform generated content to match Firestore schema
      const triggers = content.triggers.map((t, idx) => ({
        id: doc(collection(firestore, 'temp')).id,
        text: t.text,
        severity: t.severity,
        examples: t.examples || [],
        addedBy: user.userId,
        addedAt: Timestamp.now(),
      }));

      const whatWorks = content.whatWorks.map((w, idx) => ({
        id: doc(collection(firestore, 'temp')).id,
        text: w.text,
        effectiveness: w.effectiveness,
        context: w.context,
        addedBy: user.userId,
        addedAt: Timestamp.now(),
      }));

      const whatDoesntWork = content.whatDoesntWork.map((w, idx) => ({
        id: doc(collection(firestore, 'temp')).id,
        text: w.text,
        addedBy: user.userId,
        addedAt: Timestamp.now(),
      }));

      const strengths = content.strengths.map((s, idx) => ({
        id: doc(collection(firestore, 'temp')).id,
        text: s.text,
        addedBy: user.userId,
        addedAt: Timestamp.now(),
      }));

      // Create manual document
      await setDoc(doc(firestore, COLLECTIONS.CHILD_MANUALS, manualId), {
        manualId,
        childId: child.childId,
        familyId: user.familyId,
        status: 'active',
        contributors: [user.userId],
        triggers,
        whatWorks,
        whatDoesntWork,
        strengths,
        contextNotes: content.contextNotes || '',
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: user.userId,
        version: 1,
      });

      // Update child document with manual ID
      await updateDoc(doc(firestore, COLLECTIONS.CHILDREN, child.childId), {
        manualId: manualId,
      });

      // Clear localStorage
      localStorage.removeItem(`manual-generated-${childId}`);

      console.log('Manual saved successfully!');

      // Navigate to test page to view the manual
      router.push(`/test`);
    } catch (err) {
      console.error('Error saving manual:', err);
      alert(`Failed to save manual: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!child || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Review {child.name}'s Manual
          </h1>
          <p className="text-gray-600 mb-6">
            Review the AI-generated content below. You can edit it after saving.
          </p>

          {/* Context Notes */}
          {content.contextNotes && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">📝 Context & Overview</h2>
              <p className="text-gray-700">{content.contextNotes}</p>
            </div>
          )}

          {/* Triggers */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⚡ Triggers ({content.triggers.length})</h2>
            <div className="space-y-3">
              {content.triggers.map((trigger, idx) => (
                <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start justify-between">
                    <p className="text-gray-900 flex-1">{trigger.text}</p>
                    <span className="ml-4 px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                      {trigger.severity}/5
                    </span>
                  </div>
                  {trigger.examples && trigger.examples.length > 0 && (
                    <ul className="mt-2 ml-4 list-disc text-sm text-gray-600">
                      {trigger.examples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* What Works */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">✨ What Works ({content.whatWorks.length})</h2>
            <div className="space-y-3">
              {content.whatWorks.map((strategy, idx) => (
                <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start justify-between">
                    <p className="text-gray-900 flex-1">{strategy.text}</p>
                    <span className="ml-4 px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">
                      {strategy.effectiveness}/5
                    </span>
                  </div>
                  {strategy.context && (
                    <p className="mt-2 text-sm text-gray-600 italic">{strategy.context}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* What Doesn't Work */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🚫 What Doesn't Work ({content.whatDoesntWork.length})</h2>
            <div className="space-y-3">
              {content.whatDoesntWork.map((avoid, idx) => (
                <div key={idx} className="p-4 bg-gray-100 rounded-lg border border-gray-300">
                  <p className="text-gray-900">{avoid.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💪 Strengths ({content.strengths.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.strengths.map((strength, idx) => (
                <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-gray-900">{strength.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end pt-6 border-t">
            <button
              onClick={() => router.push(`/children/${childId}/onboard`)}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              ← Back to Questions
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                saving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving...' : 'Save Manual →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
