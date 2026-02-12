'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';
import {
  User,
  AuthState,
  LoginCredentials,
  RegistrationData,
  OnboardingStatus,
  COLLECTIONS,
} from '../types';

// ==================== Context Types ====================

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  isParent: boolean;
}

// ==================== Context ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Provider ====================

const DEFAULT_ONBOARDING: OnboardingStatus = {
  introCompleted: false,
  phasesCompleted: [],
  currentPhase: null,
  familyManualId: null,
  launchCompleted: false,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isRegistering = React.useRef(false);

  // ==================== Helper Functions ====================

  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDocRef = doc(firestore, COLLECTIONS.USERS, firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data() as User;
      } else {
        console.warn('User document not found in Firestore for UID:', firebaseUser.uid);
        return null;
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      throw err;
    }
  };

  // ==================== Auth State Listener ====================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData = await fetchUserData(firebaseUser);

          if (!userData && !isRegistering.current) {
            console.warn('Found orphaned auth user — signing out');
            await signOut(auth);
            setUser(null);
            setError('Your account setup is incomplete. Please register again.');
          } else if (userData) {
            setUser(userData);
          }
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.error('Auth state change error:', err);
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ==================== Registration ====================

  const register = async (data: RegistrationData): Promise<void> => {
    let userCredential: any = null;

    try {
      setLoading(true);
      setError(null);
      isRegistering.current = true;

      // Check for pending invites
      let existingFamilyId: string | null = null;
      let pendingInvite: any = null;

      try {
        const familiesRef = collection(firestore, COLLECTIONS.FAMILIES);
        const familiesSnapshot = await getDocs(familiesRef);

        for (const familyDoc of familiesSnapshot.docs) {
          const familyData = familyDoc.data();
          const invite = familyData.pendingInvites?.find(
            (inv: any) => inv.email.toLowerCase() === data.email.toLowerCase()
          );
          if (invite) {
            existingFamilyId = familyData.familyId;
            pendingInvite = invite;
            break;
          }
        }
      } catch {
        // Expected for new users — security rules prevent listing families
      }

      userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await updateProfile(userCredential.user, { displayName: data.displayName });

      let familyId: string;

      if (existingFamilyId && pendingInvite) {
        familyId = existingFamilyId;
        const familyDocRef = doc(firestore, COLLECTIONS.FAMILIES, familyId);
        await updateDoc(familyDocRef, {
          memberIds: arrayUnion(userCredential.user.uid),
          pendingInvites: arrayRemove(pendingInvite),
        });
      } else {
        familyId = doc(collection(firestore, COLLECTIONS.FAMILIES)).id;
        const familyDocRef = doc(firestore, COLLECTIONS.FAMILIES, familyId);
        await setDoc(familyDocRef, {
          familyId,
          name: data.familyName,
          memberIds: [userCredential.user.uid],
          createdAt: serverTimestamp(),
        });
      }

      const userData: User = {
        userId: userCredential.user.uid,
        email: data.email,
        displayName: data.displayName,
        familyId,
        role: 'parent',
        onboardingStatus: DEFAULT_ONBOARDING,
        createdAt: serverTimestamp() as any,
      };

      const userDocRef = doc(firestore, COLLECTIONS.USERS, userCredential.user.uid);
      await setDoc(userDocRef, userData);

      setUser(userData);
      isRegistering.current = false;
    } catch (err: any) {
      console.error('Registration error:', err.code || err.message);
      isRegistering.current = false;

      if (userCredential?.user && err.code !== 'auth/email-already-in-use') {
        try {
          await userCredential.user.delete();
        } catch {
          // cleanup failed — non-critical
        }
      }

      let errorMessage = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in or use a different email.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      isRegistering.current = false;
    }
  };

  // ==================== Login ====================

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const userData = await fetchUserData(userCredential.user);

      if (!userData) {
        throw new Error('User data not found');
      }

      setUser(userData);
    } catch (err: any) {
      console.error('Login error:', err.code || err.message);

      let errorMessage = 'Failed to sign in. Please try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Password Reset ====================

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
    } catch (err: any) {
      let errorMessage = 'Failed to send reset email.';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'If this email is registered, you will receive a reset link.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==================== User Profile ====================

  const refreshUser = async (): Promise<void> => {
    if (auth.currentUser) {
      const userData = await fetchUserData(auth.currentUser);
      setUser(userData);
    }
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) throw new Error('No user logged in');

    const userDocRef = doc(firestore, COLLECTIONS.USERS, user.userId);
    await setDoc(userDocRef, updates, { merge: true });
    setUser({ ...user, ...updates });
  };

  // ==================== Logout ====================

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
    updateUserProfile,
    isParent: user?.role === 'parent',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ==================== Hook ====================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
