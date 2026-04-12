'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import defaultSteps, { type WalkthroughStep } from './walkthrough-steps';

// ────────────────────────────────────────────────────────────
// Walkthrough context — manages active state, current step,
// and persists completion to localStorage.
// ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'relish-walkthrough-completed';

interface WalkthroughContextValue {
  /** Whether the walkthrough overlay is currently visible. */
  isActive: boolean;
  /** Index into the steps array. */
  currentStep: number;
  /** The full list of step definitions. */
  steps: WalkthroughStep[];
  /** The step object for `currentStep`, or `undefined` if out of bounds. */
  activeStep: WalkthroughStep | undefined;
  /** Total step count. */
  totalSteps: number;
  /** Whether this user has completed the tour at least once. */
  hasCompleted: boolean;
  /** Start the tour from the beginning (or a specific step). */
  start: (fromStep?: number) => void;
  /** Advance to the next step; finishes the tour if on the last step. */
  next: () => void;
  /** Go back one step. No-op on the first step. */
  prev: () => void;
  /** Jump to an arbitrary step by index. */
  goToStep: (index: number) => void;
  /** Skip / close the walkthrough and mark it complete. */
  skip: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────

interface WalkthroughProviderProps {
  children: ReactNode;
  /** Override the default step list (useful for testing). */
  steps?: WalkthroughStep[];
}

export function WalkthroughProvider({
  children,
  steps: stepsProp,
}: WalkthroughProviderProps) {
  const steps = stepsProp ?? defaultSteps;
  const totalSteps = steps.length;

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Hydrate `hasCompleted` from localStorage after mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setHasCompleted(true);
    } catch {
      // SSR or storage blocked — ignore.
    }
  }, []);

  const markComplete = useCallback(() => {
    setHasCompleted(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignore write failures.
    }
  }, []);

  const start = useCallback(
    (fromStep = 0) => {
      setCurrentStep(Math.max(0, Math.min(fromStep, totalSteps - 1)));
      setIsActive(true);
    },
    [totalSteps],
  );

  const finish = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    markComplete();
  }, [markComplete]);

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const nextIdx = prev + 1;
      if (nextIdx >= totalSteps) {
        // Defer the finish so React doesn't see the state update
        // from both setCurrentStep and finish in the same render.
        queueMicrotask(finish);
        return prev;
      }
      return nextIdx;
    });
  }, [totalSteps, finish]);

  const prev = useCallback(() => {
    setCurrentStep((p) => Math.max(0, p - 1));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStep(index);
      }
    },
    [totalSteps],
  );

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const activeStep = steps[currentStep];

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        activeStep,
        totalSteps,
        hasCompleted,
        start,
        next,
        prev,
        goToStep,
        skip,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────

export function useWalkthrough(): WalkthroughContextValue {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) {
    throw new Error(
      'useWalkthrough must be used within a <WalkthroughProvider>',
    );
  }
  return ctx;
}
