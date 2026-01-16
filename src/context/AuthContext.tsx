'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';
import {
  User,
  UserRole,
  AuthState,
  LoginCredentials,
  RegistrationData,
  ChildRegistrationData,
  COLLECTIONS,
} from '../types';

// ==================== Context Types ====================

interface AuthContextType extends AuthState {
  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;

  // Child auth methods
  loginChild: (username: string, pin: string) => Promise<void>;
  registerChild: (data: ChildRegistrationData) => Promise<void>;

  // User profile methods
  refreshUser: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;

  // Role checks
  isParent: boolean;
  isChild: boolean;
}

// ==================== Context ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Provider ====================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ==================== Helper Functions ====================

  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDocRef = doc(firestore, COLLECTIONS.USERS, firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data() as User;
      } else {
        console.error('User document not found in Firestore');
        return null;
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      throw err;
    }
  };

  const createUserDocument = async (
    firebaseUser: FirebaseUser,
    role: UserRole,
    name: string,
    familyId: string,
    additionalData?: Partial<User>
  ): Promise<User> => {
    const userData: User = {
      userId: firebaseUser.uid,
      familyId,
      role,
      name,
      email: firebaseUser.email || undefined,
      createdAt: serverTimestamp() as any,
      settings: {
        notifications: true,
        theme: 'light',
      },
      ...additionalData,
    };

    const userDocRef = doc(firestore, COLLECTIONS.USERS, firebaseUser.uid);
    await setDoc(userDocRef, userData);

    return userData;
  };

  // ==================== Auth State Listener ====================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData = await fetchUserData(firebaseUser);

          // Handle orphaned auth users (auth user exists but no Firestore document)
          if (!userData) {
            console.warn('Found orphaned auth user, signing out');
            await signOut(auth);
            setUser(null);
            setError(
              'Your account setup is incomplete. Please register again or contact support if this problem persists.'
            );
          } else {
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

  // ==================== Parent Authentication ====================

  const register = async (data: RegistrationData): Promise<void> => {
    let userCredential: any = null;

    try {
      setLoading(true);
      setError(null);

      // Create Firebase auth user
      userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: data.name,
      });

      // Create family document
      const familyId = doc(collection(firestore, COLLECTIONS.FAMILIES)).id;
      const familyDocRef = doc(firestore, COLLECTIONS.FAMILIES, familyId);

      await setDoc(familyDocRef, {
        familyId,
        name: data.familyName,
        createdAt: serverTimestamp(),
        parentIds: [userCredential.user.uid],
        childIds: [],
        settings: {
          chipSystemEnabled: true,
          dailyCheckInReminder: true,
          weeklyInsightsEnabled: true,
        },
      });

      // Create user document
      const userData = await createUserDocument(
        userCredential.user,
        'parent',
        data.name,
        familyId
      );

      setUser(userData);
    } catch (err: any) {
      console.error('Registration error:', err.code || err.message);

      // If we created a Firebase auth user but failed to create Firestore documents,
      // delete the auth user to prevent orphaned accounts
      if (userCredential?.user && err.code !== 'auth/email-already-in-use') {
        try {
          await userCredential.user.delete();
          console.log('Cleaned up orphaned auth user');
        } catch (deleteErr) {
          console.error('Failed to cleanup auth user:', deleteErr);
        }
      }

      // Translate Firebase error codes to user-friendly messages
      let errorMessage = 'Failed to create account. Please try again.';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in or use a different email address.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      const friendlyError = new Error(errorMessage);
      throw friendlyError;
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const userData = await fetchUserData(userCredential.user);

      if (!userData) {
        throw new Error('User data not found');
      }

      setUser(userData);
    } catch (err: any) {
      console.error('Login error:', err.code || err.message);

      // Translate Firebase error codes to user-friendly messages
      let errorMessage = 'Failed to sign in. Please try again.';

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      const friendlyError = new Error(errorMessage);
      throw friendlyError;
    } finally {
      setLoading(false);
    }
  };

  // ==================== Child Authentication ====================

  const registerChild = async (data: ChildRegistrationData): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!user || user.role !== 'parent') {
        throw new Error('Only parents can register children');
      }

      // Create a pseudo-email for child (not used for login)
      const childEmail = `${data.username}_${user.familyId}@parentpulse.child`;

      // Create Firebase auth user with PIN as password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        childEmail,
        data.pin
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: data.name,
      });

      // Create child user document
      await createUserDocument(
        userCredential.user,
        'child',
        data.name,
        user.familyId,
        {
          dateOfBirth: data.dateOfBirth as any,
        }
      );

      // Update family document with child ID
      const familyDocRef = doc(firestore, COLLECTIONS.FAMILIES, user.familyId);
      const familyDoc = await getDoc(familyDocRef);

      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        await setDoc(familyDocRef, {
          ...familyData,
          childIds: [...familyData.childIds, userCredential.user.uid],
        });
      }

      // Initialize chip balance for child
      const chipEconomyRef = doc(firestore, COLLECTIONS.CHIP_ECONOMY, user.familyId);
      const chipEconomyDoc = await getDoc(chipEconomyRef);

      if (!chipEconomyDoc.exists()) {
        // Create initial chip economy if it doesn't exist
        await setDoc(chipEconomyRef, {
          economyId: user.familyId,
          familyId: user.familyId,
          tasks: [],
          rewards: [],
        });
      }

    } catch (err: any) {
      console.error('Child registration error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginChild = async (username: string, pin: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Note: Child login implementation would require additional setup
      throw new Error('Child login not yet fully implemented - use parent account to test');

    } catch (err: any) {
      console.error('Child login error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== User Profile Methods ====================

  const refreshUser = async (): Promise<void> => {
    try {
      if (auth.currentUser) {
        const userData = await fetchUserData(auth.currentUser);
        setUser(userData);
      }
    } catch (err: any) {
      console.error('Error refreshing user:', err);
      setError(err.message);
    }
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      const userDocRef = doc(firestore, COLLECTIONS.USERS, user.userId);
      await setDoc(userDocRef, updates, { merge: true });

      setUser({ ...user, ...updates });
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      setError(err.message);
      throw err;
    }
  };

  // ==================== Logout ====================

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setError(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ==================== Role Checks ====================

  const isParent = user?.role === 'parent';
  const isChild = user?.role === 'child';

  // ==================== Context Value ====================

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    loginChild,
    registerChild,
    refreshUser,
    updateUserProfile,
    isParent,
    isChild,
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
