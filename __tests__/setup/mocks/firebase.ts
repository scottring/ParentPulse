import { vi } from 'vitest';

/**
 * Mock Firestore operations
 */
export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn()
};

/**
 * Mock Auth operations
 */
export const mockAuth = {
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(),
  currentUser: null
};

/**
 * Mock Functions operations
 */
export const mockFunctions = {
  httpsCallable: vi.fn(() => vi.fn())
};

/**
 * Helper to create a mock Timestamp
 */
export function createTimestamp(date: Date = new Date()) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0
  };
}

/**
 * Helper to create a mock document snapshot
 */
export function createDocSnapshot(id: string, data: Record<string, unknown> | null) {
  return {
    id,
    data: () => data,
    exists: () => data !== null
  };
}

/**
 * Helper to create a mock query snapshot
 */
export function createQuerySnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    empty: docs.length === 0,
    docs: docs.map(doc => createDocSnapshot(doc.id, doc.data)),
    size: docs.length,
    forEach: (callback: (doc: ReturnType<typeof createDocSnapshot>) => void) => {
      docs.forEach(doc => callback(createDocSnapshot(doc.id, doc.data)));
    }
  };
}

/**
 * Helper to create a mock document reference
 */
export function createDocRef(id: string) {
  return {
    id,
    path: `collection/${id}`
  };
}

/**
 * Setup Firestore mocks for a test
 */
export function setupFirestoreMocks() {
  const { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, query, where, orderBy, limit } = mockFirestore;

  // Reset all mocks
  vi.clearAllMocks();

  // Default implementations
  collection.mockReturnValue({});
  doc.mockReturnValue({});
  query.mockReturnValue({});
  where.mockReturnValue({});
  orderBy.mockReturnValue({});
  limit.mockReturnValue({});

  return {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    orderBy,
    limit
  };
}

/**
 * Setup Auth mocks for a test
 */
export function setupAuthMocks() {
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } = mockAuth;

  // Reset all mocks
  vi.clearAllMocks();

  return {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
  };
}

/**
 * Setup Functions mocks for a test
 */
export function setupFunctionsMocks() {
  const { httpsCallable } = mockFunctions;

  // Reset all mocks
  vi.clearAllMocks();

  return {
    httpsCallable
  };
}
