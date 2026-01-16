import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firestore } from '@/lib/firebase';
import { StrategicPlan, COLLECTIONS } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useStrategicPlans(childId?: string) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<StrategicPlan | null>(null);
  const [plans, setPlans] = useState<StrategicPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch a single active plan by child ID
  useEffect(() => {
    if (!childId || !user?.familyId) return;

    const fetchPlan = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = query(
          collection(firestore, COLLECTIONS.STRATEGIC_PLANS),
          where('familyId', '==', user.familyId),
          where('childId', '==', childId),
          where('status', 'in', ['active', 'pending_approval']),
          orderBy('generatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const planDoc = querySnapshot.docs[0];
          setPlan({
            planId: planDoc.id,
            ...planDoc.data()
          } as StrategicPlan);
        } else {
          setPlan(null);
        }
      } catch (err: any) {
        console.error('Error fetching strategic plan:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [childId, user?.familyId]);

  // Fetch all plans for the family
  const fetchFamilyPlans = async (status?: 'active' | 'pending_approval' | 'completed' | 'cancelled') => {
    if (!user?.familyId) return;

    setLoading(true);
    setError(null);

    try {
      let q;
      if (status) {
        q = query(
          collection(firestore, COLLECTIONS.STRATEGIC_PLANS),
          where('familyId', '==', user.familyId),
          where('status', '==', status),
          orderBy('generatedAt', 'desc')
        );
      } else {
        q = query(
          collection(firestore, COLLECTIONS.STRATEGIC_PLANS),
          where('familyId', '==', user.familyId),
          orderBy('generatedAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const plansData = querySnapshot.docs.map(doc => ({
        planId: doc.id,
        ...doc.data()
      })) as StrategicPlan[];

      setPlans(plansData);
    } catch (err: any) {
      console.error('Error fetching family plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate a new strategic plan for a child
  const generatePlan = async (childId: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const generateStrategicPlan = httpsCallable(functions, 'generateStrategicPlan');

      const result = await generateStrategicPlan({ childId });
      const data = result.data as any;

      if (data.success && data.planId) {
        // Fetch the newly created plan
        const planDoc = await getDoc(doc(firestore, COLLECTIONS.STRATEGIC_PLANS, data.planId));
        if (planDoc.exists()) {
          const newPlan = {
            planId: planDoc.id,
            ...planDoc.data()
          } as StrategicPlan;
          setPlan(newPlan);
          return newPlan;
        }
      }

      throw new Error('Failed to generate plan');
    } catch (err: any) {
      console.error('Error generating strategic plan:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Approve a plan (parent approval workflow)
  const approvePlan = async (planId: string, notes?: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const planRef = doc(firestore, COLLECTIONS.STRATEGIC_PLANS, planId);
      const planDoc = await getDoc(planRef);

      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }

      const planData = planDoc.data() as StrategicPlan;

      // Add this parent's approval
      const updatedApprovals = {
        ...planData.parentApprovals,
        [user.userId]: {
          approved: true,
          timestamp: Timestamp.now(),
          notes: notes || undefined
        }
      };

      // Check if all required parents have approved
      const allApproved = planData.approvalRequired.every(
        parentId => updatedApprovals[parentId]?.approved === true
      );

      // If all approved, activate the plan
      const updates: any = {
        parentApprovals: updatedApprovals
      };

      if (allApproved && planData.status === 'pending_approval') {
        updates.status = 'active';
        updates.startDate = Timestamp.now();

        // Calculate end date based on duration
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + planData.duration);
        updates.endDate = Timestamp.fromDate(endDate);
      }

      await updateDoc(planRef, updates);

      // Fetch updated plan
      const updatedDoc = await getDoc(planRef);
      if (updatedDoc.exists()) {
        const updatedPlan = {
          planId: updatedDoc.id,
          ...updatedDoc.data()
        } as StrategicPlan;
        setPlan(updatedPlan);
        return updatedPlan;
      }
    } catch (err: any) {
      console.error('Error approving plan:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Request changes to a plan
  const requestChanges = async (planId: string, feedback: string) => {
    if (!user) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const planRef = doc(firestore, COLLECTIONS.STRATEGIC_PLANS, planId);
      const planDoc = await getDoc(planRef);

      if (!planDoc.exists()) {
        throw new Error('Plan not found');
      }

      const planData = planDoc.data() as StrategicPlan;

      // Add this parent's feedback as a "rejection" approval
      const updatedApprovals = {
        ...planData.parentApprovals,
        [user.userId]: {
          approved: false,
          timestamp: Timestamp.now(),
          notes: feedback
        }
      };

      await updateDoc(planRef, {
        parentApprovals: updatedApprovals,
        status: 'changes_requested' // Custom status to indicate feedback
      });

      // Fetch updated plan
      const updatedDoc = await getDoc(planRef);
      if (updatedDoc.exists()) {
        const updatedPlan = {
          planId: updatedDoc.id,
          ...updatedDoc.data()
        } as StrategicPlan;
        setPlan(updatedPlan);
        return updatedPlan;
      }
    } catch (err: any) {
      console.error('Error requesting changes:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Pause an active plan
  const pausePlan = async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      const planRef = doc(firestore, COLLECTIONS.STRATEGIC_PLANS, planId);
      await updateDoc(planRef, {
        status: 'paused'
      });

      // Fetch updated plan
      const updatedDoc = await getDoc(planRef);
      if (updatedDoc.exists()) {
        const updatedPlan = {
          planId: updatedDoc.id,
          ...updatedDoc.data()
        } as StrategicPlan;
        setPlan(updatedPlan);
        return updatedPlan;
      }
    } catch (err: any) {
      console.error('Error pausing plan:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Resume a paused plan
  const resumePlan = async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      const planRef = doc(firestore, COLLECTIONS.STRATEGIC_PLANS, planId);
      await updateDoc(planRef, {
        status: 'active'
      });

      // Fetch updated plan
      const updatedDoc = await getDoc(planRef);
      if (updatedDoc.exists()) {
        const updatedPlan = {
          planId: updatedDoc.id,
          ...updatedDoc.data()
        } as StrategicPlan;
        setPlan(updatedPlan);
        return updatedPlan;
      }
    } catch (err: any) {
      console.error('Error resuming plan:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Complete a plan
  const completePlan = async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      const planRef = doc(firestore, COLLECTIONS.STRATEGIC_PLANS, planId);
      await updateDoc(planRef, {
        status: 'completed',
        endDate: Timestamp.now()
      });

      // Fetch updated plan
      const updatedDoc = await getDoc(planRef);
      if (updatedDoc.exists()) {
        const updatedPlan = {
          planId: updatedDoc.id,
          ...updatedDoc.data()
        } as StrategicPlan;
        setPlan(updatedPlan);
        return updatedPlan;
      }
    } catch (err: any) {
      console.error('Error completing plan:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if a plan exists for a child
  const planExists = async (childId: string, status?: 'active' | 'pending_approval'): Promise<boolean> => {
    if (!user?.familyId) return false;

    try {
      let q;
      if (status) {
        q = query(
          collection(firestore, COLLECTIONS.STRATEGIC_PLANS),
          where('familyId', '==', user.familyId),
          where('childId', '==', childId),
          where('status', '==', status)
        );
      } else {
        q = query(
          collection(firestore, COLLECTIONS.STRATEGIC_PLANS),
          where('familyId', '==', user.familyId),
          where('childId', '==', childId)
        );
      }

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (err) {
      console.error('Error checking plan existence:', err);
      return false;
    }
  };

  return {
    plan,
    plans,
    loading,
    error,
    generatePlan,
    approvePlan,
    requestChanges,
    pausePlan,
    resumePlan,
    completePlan,
    fetchFamilyPlans,
    planExists
  };
}
