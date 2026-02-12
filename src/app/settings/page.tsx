'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { COLLECTIONS } from '@/types';
import type { Manual, ManualDomains } from '@/types/manual';

const DEMO_DOMAINS: ManualDomains = {
  values: {
    values: [
      { id: 'v1', name: 'Curiosity', description: 'We encourage questions and exploration over perfection' },
      { id: 'v2', name: 'Kindness', description: 'How we treat people matters more than what we achieve' },
      { id: 'v3', name: 'Resilience', description: 'We bounce back together and learn from hard things' },
    ],
    identityStatements: [
      "We're the family that talks things through, even when it's uncomfortable",
      "We show up for each other — no matter what",
    ],
    nonNegotiables: [
      'Everyone gets heard before a decision is made',
      'No screens during dinner',
      'We always say goodnight, even after a fight',
    ],
    narratives: [
      'The time we moved across the country and rebuilt everything together',
    ],
  },
  communication: {
    strengths: ['We can talk about hard things without shutting down'],
    patterns: ['Partner A processes externally, Partner B needs time to think'],
    challenges: ['Interrupting each other when stressed', 'Bringing up old issues during new arguments'],
    repairStrategies: ['Take a 15-minute break when voices rise', 'Say "I feel..." instead of "You always..."'],
    goals: ['Have a weekly check-in without kids present'],
  },
  connection: {
    rituals: [
      { id: 'ri1', name: 'Highs & Lows', description: 'Share best and hardest part of the day at dinner', frequency: 'daily', meaningSource: 'Keeps us connected to each other\'s inner world' },
      { id: 'ri2', name: 'Friday movie night', description: 'Kids alternate picking the movie', frequency: 'weekly', meaningSource: 'Predictable family fun everyone looks forward to' },
    ],
    bondingActivities: ['Cooking together on Sundays', 'Bedtime stories with voices', 'Family hikes once a month'],
    strengths: ['Kids come to us with problems instead of hiding them'],
    challenges: ['Hard to find couple time after kids are in bed'],
    goals: ['Monthly date night — no phones'],
  },
  roles: {
    assignments: [
      { id: 'ra1', area: 'Cooking / meal planning', owner: 'Partner A', satisfaction: 'working' },
      { id: 'ra2', area: 'School logistics', owner: 'Partner B', satisfaction: 'working' },
      { id: 'ra3', area: 'Finances', owner: 'Shared', satisfaction: 'needs-discussion' },
      { id: 'ra4', area: 'Bedtime routine', owner: 'Alternating', satisfaction: 'working' },
    ],
    decisionAreas: [
      { id: 'da1', name: 'Education', style: 'collaborative' },
      { id: 'da2', name: 'Daily discipline', style: 'delegated' },
      { id: 'da3', name: 'Social calendar', style: 'unclear' },
    ],
    painPoints: ['Mental load is lopsided — one partner tracks everything', 'No clear owner for home maintenance tasks'],
    goals: ['Redistribute invisible labor', 'Weekly sync on upcoming logistics'],
  },
  organization: {
    spaces: [
      { id: 'sp1', name: 'Kitchen', currentState: 'Functional but cluttered counters', idealState: 'Clear counters, everything has a home', priority: 'urgent' },
      { id: 'sp2', name: 'Kids rooms', currentState: 'Toy explosion, no system', idealState: 'Rotation bins, nightly 5-min reset', priority: 'important' },
      { id: 'sp3', name: 'Garage', currentState: 'Can barely fit one car', idealState: 'Organized zones for tools, sports, storage', priority: 'nice-to-have' },
    ],
    systems: [
      { id: 'sys1', name: 'Shared family calendar', description: 'Google Calendar with color coding', effectiveness: 'working' },
      { id: 'sys2', name: 'Meal planning', description: 'Plan on Sunday, shop Monday', effectiveness: 'inconsistent' },
      { id: 'sys3', name: 'Laundry', description: 'No real system — whoever notices', effectiveness: 'nonexistent' },
    ],
    routines: [
      { id: 'rt1', name: 'Morning launch', frequency: 'daily', description: 'Breakfast, pack bags, out the door by 7:45', isActive: true, consistency: 'spotty' },
      { id: 'rt2', name: 'Sunday reset', frequency: 'weekly', description: 'Meal prep, clean house, plan the week', isActive: true, consistency: 'solid' },
      { id: 'rt3', name: 'Monthly adventure', frequency: 'monthly', description: 'One new experience as a family', isActive: true, consistency: 'aspirational' },
    ],
    painPoints: ['Morning rush — everyone is stressed getting out the door', 'No landing zone for backpacks and papers', 'Clutter accumulates on every flat surface'],
    goals: ['Create a family command center', 'Implement a 10-minute nightly reset'],
  },
  adaptability: {
    stressors: ['Work travel disrupts routines', 'Sick days with no backup plan', 'Transitions between activities'],
    copingStrategies: ['Tag-team parenting when one partner is depleted', 'Lower standards temporarily during crunch weeks'],
    strengths: ['We recover quickly from bad days', 'Kids are flexible with schedule changes'],
    challenges: ['Sibling conflicts escalate before we catch them', 'Hard to maintain routines during school breaks'],
    goals: ['Build a "Plan B" protocol for common disruptions'],
  },
  problemSolving: {
    decisionStyle: 'We talk it through but sometimes go in circles — need a clearer process for bigger decisions',
    conflictPatterns: ['One partner withdraws, the other pursues', 'Revisiting resolved issues when stressed'],
    strengths: ['We eventually find compromises', 'Both partners willing to apologize'],
    challenges: ['Avoiding tough financial conversations', 'Decision fatigue leads to defaulting to status quo'],
    goals: ['Adopt a structured approach for big family decisions'],
  },
  resources: {
    principles: [
      'We invest in experiences over things',
      'Each kid gets one extracurricular per season — their choice',
      'Save before spending on wants',
    ],
    tensions: ['Disagreement on how much to spend on kids activities', 'Time poverty — too many commitments, not enough margin'],
    strengths: ['Good at budgeting basics', 'Aligned on saving for education'],
    challenges: ['No emergency fund target', 'Impulse spending on convenience when exhausted'],
    goals: ['Build 3-month emergency fund', 'Audit family time commitments — cut 20%'],
  },
};

export default function SettingsPage() {
  const { user, logout, updateUserProfile, refreshUser } = useAuth();
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleResetOnboarding = async () => {
    if (!user) return;
    if (!confirm('This will delete your manuals, conversations, and reset onboarding. Continue?')) return;

    setResetting(true);
    try {
      // Delete manuals for this family
      const manualsSnap = await getDocs(
        query(collection(firestore, COLLECTIONS.MANUALS), where('familyId', '==', user.familyId))
      );
      for (const d of manualsSnap.docs) {
        await deleteDoc(doc(firestore, COLLECTIONS.MANUALS, d.id));
      }

      // Delete conversations for this user
      const convoSnap = await getDocs(
        query(collection(firestore, COLLECTIONS.CONVERSATIONS), where('userId', '==', user.userId))
      );
      for (const d of convoSnap.docs) {
        await deleteDoc(doc(firestore, COLLECTIONS.CONVERSATIONS, d.id));
      }

      // Reset onboarding status
      await updateUserProfile({
        onboardingStatus: {
          introCompleted: false,
          phasesCompleted: [],
          currentPhase: null,
          familyManualId: null,
        },
      });

      await refreshUser();
      router.push('/intro');
    } catch (err) {
      console.error('Reset failed:', err);
      alert('Reset failed. Check console.');
    } finally {
      setResetting(false);
    }
  };

  const handleSeedDemoData = async () => {
    if (!user) return;
    if (!confirm('This will reset onboarding and create a pre-populated demo manual. Continue?')) return;

    setSeeding(true);
    try {
      // First reset — delete old manuals & conversations
      const manualsSnap = await getDocs(
        query(collection(firestore, COLLECTIONS.MANUALS), where('familyId', '==', user.familyId))
      );
      for (const d of manualsSnap.docs) {
        await deleteDoc(doc(firestore, COLLECTIONS.MANUALS, d.id));
      }
      const convoSnap = await getDocs(
        query(collection(firestore, COLLECTIONS.CONVERSATIONS), where('userId', '==', user.userId))
      );
      for (const d of convoSnap.docs) {
        await deleteDoc(doc(firestore, COLLECTIONS.CONVERSATIONS, d.id));
      }

      // Create populated manual
      const manualRef = doc(collection(firestore, COLLECTIONS.MANUALS));
      const manual: Manual = {
        manualId: manualRef.id,
        familyId: user.familyId,
        type: 'household',
        title: 'Our Family',
        subtitle: 'The operating manual for how we do things',
        domains: DEMO_DOMAINS,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      await setDoc(manualRef, manual);

      // Mark onboarding fully complete
      await updateUserProfile({
        onboardingStatus: {
          introCompleted: true,
          phasesCompleted: ['foundation', 'relationships', 'operations', 'strategy'],
          currentPhase: null,
          familyManualId: manualRef.id,
        },
      });

      await refreshUser();
      router.push('/bookshelf');
    } catch (err) {
      console.error('Seed failed:', err);
      alert('Seed failed. Check console.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-stone-900 heading mb-6">Settings</h1>

        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
          <div>
            <p className="text-sm text-stone-400">Name</p>
            <p className="text-stone-900">{user?.displayName}</p>
          </div>
          <div>
            <p className="text-sm text-stone-400">Email</p>
            <p className="text-stone-900">{user?.email}</p>
          </div>
          <hr className="border-stone-100" />

          {/* Dev tools */}
          <div className="pt-2">
            <p className="text-xs text-stone-400 uppercase tracking-wider mb-2">Developer</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleResetOnboarding}
                disabled={resetting || seeding}
                className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50 text-sm font-medium"
              >
                {resetting ? 'Resetting...' : 'Reset Onboarding'}
              </button>
              <button
                onClick={handleSeedDemoData}
                disabled={resetting || seeding}
                className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 disabled:opacity-50 text-sm font-medium"
              >
                {seeding ? 'Seeding...' : 'Seed Demo Data'}
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1">Reset: restarts from intro | Seed: skip onboarding with populated manual</p>
          </div>

          <hr className="border-stone-100" />
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
