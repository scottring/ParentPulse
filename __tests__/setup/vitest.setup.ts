import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// When running Firestore rules tests against the real emulator
// (detected via FIRESTORE_EMULATOR_HOST, which `firebase emulators:exec`
// sets automatically), we must NOT mock the Firebase SDK — the tests
// need the real SDK to talk to the emulator. In all other test modes
// (unit tests, component tests), we keep the global mocks so hooks
// that transitively import @/lib/firebase don't crash on env-var
// validation at module load.
const RUNNING_AGAINST_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;

// IMPORTANT: `vi.mock` is hoisted by Vitest — calls are lifted above
// all imports and run unconditionally, even if wrapped in an `if`.
// To make the firebase mocks conditional (on/off based on whether
// we're running against a real emulator), we use `vi.doMock`, which
// is NOT hoisted and respects normal control flow.
if (!RUNNING_AGAINST_EMULATOR) {
  vi.doMock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({})),
    getApps: vi.fn(() => []),
    getApp: vi.fn(() => ({})),
  }));

  vi.doMock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  }));

  vi.doMock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({})),
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
    limit: vi.fn(),
    Timestamp: (() => {
      class MockTimestamp {
        seconds: number;
        nanoseconds: number;
        constructor(seconds: number, nanoseconds: number) {
          this.seconds = seconds;
          this.nanoseconds = nanoseconds;
        }
        toDate() {
          return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000));
        }
        toMillis() {
          return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
        }
        static now() {
          const ms = Date.now();
          return new MockTimestamp(Math.floor(ms / 1000), (ms % 1000) * 1_000_000);
        }
        static fromDate(date: Date) {
          const ms = date.getTime();
          return new MockTimestamp(Math.floor(ms / 1000), (ms % 1000) * 1_000_000);
        }
        static fromMillis(ms: number) {
          return new MockTimestamp(Math.floor(ms / 1000), (ms % 1000) * 1_000_000);
        }
      }
      return MockTimestamp;
    })(),
    serverTimestamp: vi.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    })),
  }));

  vi.doMock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn(() => vi.fn()),
  }));
}

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({}))
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Suppress console errors during tests (optional, can be removed if you want to see them)
// vi.spyOn(console, 'error').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
