'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { useChildren } from '@/hooks/useChildren';
import { useChildManual } from '@/hooks/useChildManual';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS } from '@/types';

export default function TestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { family, inviteParent, error: familyError } = useFamily();
  const { children, addChild, error: childrenError } = useChildren();

  // State for forms
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Hook for selected child's manual
  const {
    manual,
    loading: manualLoading,
    error: manualError,
    addTrigger,
    addStrategy,
    addStrength,
  } = useChildManual(selectedChildId);

  // Form states
  const [triggerText, setTriggerText] = useState('');
  const [triggerSeverity, setTriggerSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [strategyText, setStrategyText] = useState('');
  const [strategyEffectiveness, setStrategyEffectiveness] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [strengthText, setStrengthText] = useState('');

  // Handler to add a child
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const child = await addChild({
        name: newChildName,
        age: newChildAge ? parseInt(newChildAge) : undefined,
      });
      console.log('Child added:', child);
      setNewChildName('');
      setNewChildAge('');
    } catch (err) {
      console.error('Error adding child:', err);
    }
  };

  // Handler to navigate to onboarding wizard
  const handleCreateManual = (childId: string) => {
    router.push(`/children/${childId}/onboard`);
  };

  // Handler to add trigger
  const handleAddTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTrigger(triggerText, triggerSeverity);
      setTriggerText('');
      console.log('Trigger added');
    } catch (err) {
      console.error('Error adding trigger:', err);
    }
  };

  // Handler to add strategy
  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStrategy(strategyText, strategyEffectiveness);
      setStrategyText('');
      console.log('Strategy added');
    } catch (err) {
      console.error('Error adding strategy:', err);
    }
  };

  // Handler to add strength
  const handleAddStrength = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addStrength(strengthText);
      setStrengthText('');
      console.log('Strength added');
    } catch (err) {
      console.error('Error adding strength:', err);
    }
  };

  // Handler to invite parent
  const handleInviteParent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteParent(inviteEmail);
      setInviteEmail('');
      console.log('Invitation sent');
    } catch (err) {
      console.error('Error inviting parent:', err);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Page</h1>
        <p>Please log in to test the hooks.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Child Manual System Test Page</h1>

      {/* User Info */}
      <section className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Current User</h2>
        <p>Name: {user.name}</p>
        <p>Role: {user.role}</p>
        <p>Family ID: {user.familyId}</p>
      </section>

      {/* Family Info */}
      <section className="mb-8 p-4 bg-blue-50 rounded">
        <h2 className="text-xl font-semibold mb-2">Family Information</h2>
        {familyError && <p className="text-red-600 mb-2">Error: {familyError}</p>}
        {family ? (
          <div>
            <p>Family ID: {family.familyId}</p>
            <p>Created By: {family.createdBy}</p>
            <p>Members: {family.members?.length || 0}</p>
            <p>Pending Invites: {family.pendingInvites?.length || 0}</p>
            {family.pendingInvites && family.pendingInvites.length > 0 && (
              <div className="mt-2">
                {family.pendingInvites.map((invite, idx) => (
                  <div key={idx} className="ml-4 text-sm">
                    - {invite.email} ({invite.role})
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p>No family data</p>
        )}

        {/* Invite Parent Form */}
        <form onSubmit={handleInviteParent} className="mt-4 flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Co-parent email"
            className="border rounded px-3 py-2 flex-1"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Invite Parent
          </button>
        </form>
      </section>

      {/* Children Management */}
      <section className="mb-8 p-4 bg-green-50 rounded">
        <h2 className="text-xl font-semibold mb-2">Children</h2>
        {childrenError && <p className="text-red-600 mb-2">Error: {childrenError}</p>}

        {/* Add Child Form */}
        <form onSubmit={handleAddChild} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            placeholder="Child name"
            className="border rounded px-3 py-2 flex-1"
            required
          />
          <input
            type="number"
            value={newChildAge}
            onChange={(e) => setNewChildAge(e.target.value)}
            placeholder="Age"
            className="border rounded px-3 py-2 w-24"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add Child
          </button>
        </form>

        {/* Children List */}
        <div className="space-y-2">
          {children.map((child) => (
            <div
              key={child.childId}
              className="flex items-center justify-between p-3 bg-white rounded border"
            >
              <div>
                <p className="font-medium">{child.name}</p>
                <p className="text-sm text-gray-600">
                  {child.age && `Age: ${child.age} | `}
                  {child.manualId ? '✅ Has Manual' : '⚠️ No Manual'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!child.manualId && (
                  <button
                    onClick={() => handleCreateManual(child.childId)}
                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                  >
                    Start Onboarding
                  </button>
                )}
                {child.manualId && (
                  <>
                    <button
                      onClick={() => setSelectedChildId(child.childId)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      {selectedChildId === child.childId ? '✓ Selected' : 'View Manual'}
                    </button>
                    <button
                      onClick={() => router.push(`/children/${child.childId}/log`)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      📊 Log Observation
                    </button>
                    <button
                      onClick={() => router.push(`/children/${child.childId}/child-questions`)}
                      className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                    >
                      🗣️ Kid's Questions
                    </button>
                    <button
                      onClick={() => router.push(`/children/${child.childId}/insights`)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                    >
                      🔍 View Insights
                    </button>
                    <button
                      onClick={() => router.push(`/children/${child.childId}/coach`)}
                      className="bg-pink-600 text-white px-3 py-1 rounded text-sm hover:bg-pink-700"
                    >
                      💬 AI Coach
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {children.length === 0 && (
            <p className="text-gray-500">No children yet. Add one above!</p>
          )}
        </div>
      </section>

      {/* Manual Editor */}
      {selectedChildId && (
        <section className="mb-8 p-4 bg-yellow-50 rounded">
          <h2 className="text-xl font-semibold mb-4">
            Manual for {children.find(c => c.childId === selectedChildId)?.name}
          </h2>

          {manualError && <p className="text-red-600 mb-2">Error: {manualError}</p>}
          {manualLoading && <p className="text-gray-600 mb-2">Loading manual...</p>}

          {manual ? (
            <div className="space-y-6">
              {/* Manual Info */}
              <div className="p-3 bg-white rounded border">
                <p className="text-sm text-gray-600">Manual ID: {manual.manualId}</p>
                <p className="text-sm text-gray-600">Status: {manual.status}</p>
                <p className="text-sm text-gray-600">Version: {manual.version}</p>
                <p className="text-sm text-gray-600">
                  Triggers: {manual.triggers.length} | Strategies: {manual.whatWorks.length} |
                  Strengths: {manual.strengths.length}
                </p>
              </div>

              {/* Add Trigger */}
              <div>
                <h3 className="font-semibold mb-2">⚡ Add Trigger</h3>
                <form onSubmit={handleAddTrigger} className="flex gap-2">
                  <input
                    type="text"
                    value={triggerText}
                    onChange={(e) => setTriggerText(e.target.value)}
                    placeholder="What triggers stress?"
                    className="border rounded px-3 py-2 flex-1"
                    required
                  />
                  <select
                    value={triggerSeverity}
                    onChange={(e) => setTriggerSeverity(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="1">1 - Mild</option>
                    <option value="2">2</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4</option>
                    <option value="5">5 - Severe</option>
                  </select>
                  <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                    Add
                  </button>
                </form>
                <div className="mt-2 space-y-1">
                  {manual.triggers.map((trigger) => (
                    <div key={trigger.id} className="text-sm bg-white p-2 rounded border">
                      {trigger.text} <span className="text-red-600">(Severity: {trigger.severity})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Strategy */}
              <div>
                <h3 className="font-semibold mb-2">✨ Add Strategy (What Works)</h3>
                <form onSubmit={handleAddStrategy} className="flex gap-2">
                  <input
                    type="text"
                    value={strategyText}
                    onChange={(e) => setStrategyText(e.target.value)}
                    placeholder="What strategy works?"
                    className="border rounded px-3 py-2 flex-1"
                    required
                  />
                  <select
                    value={strategyEffectiveness}
                    onChange={(e) => setStrategyEffectiveness(parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="1">1 - Not very</option>
                    <option value="2">2</option>
                    <option value="3">3 - Moderate</option>
                    <option value="4">4</option>
                    <option value="5">5 - Very effective</option>
                  </select>
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Add
                  </button>
                </form>
                <div className="mt-2 space-y-1">
                  {manual.whatWorks.map((strategy) => (
                    <div key={strategy.id} className="text-sm bg-white p-2 rounded border">
                      {strategy.text} <span className="text-green-600">(Effectiveness: {strategy.effectiveness})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Strength */}
              <div>
                <h3 className="font-semibold mb-2">💪 Add Strength</h3>
                <form onSubmit={handleAddStrength} className="flex gap-2">
                  <input
                    type="text"
                    value={strengthText}
                    onChange={(e) => setStrengthText(e.target.value)}
                    placeholder="What is this child good at?"
                    className="border rounded px-3 py-2 flex-1"
                    required
                  />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Add
                  </button>
                </form>
                <div className="mt-2 space-y-1">
                  {manual.strengths.map((strength) => (
                    <div key={strength.id} className="text-sm bg-white p-2 rounded border">
                      {strength.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Select a child with a manual to edit</p>
          )}
        </section>
      )}

      {/* Instructions */}
      <section className="p-4 bg-gray-50 rounded border-l-4 border-blue-500">
        <h3 className="font-semibold mb-2">Test Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Verify your user and family information loads correctly</li>
          <li>Try inviting a co-parent (check pending invites section)</li>
          <li>Add a child using the form</li>
          <li>Create a manual for the child</li>
          <li>Select the child to view their manual</li>
          <li>Add triggers, strategies, and strengths</li>
          <li>Verify the items appear in the manual sections</li>
          <li>Check browser console for any errors</li>
        </ol>
      </section>
    </div>
  );
}
