/**
 * Tests for usePersonManual Hook (Phase 1 - Simplified)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';

// Create mock functions for Firestore
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockArrayUnion = vi.fn((val) => val);
const mockArrayRemove = vi.fn((val) => val);

// Mock Firebase modules
vi.mock('@/lib/firebase', () => ({
  firestore: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  limit: (...args: any[]) => mockLimit(...args),
  arrayUnion: (...args: any[]) => mockArrayUnion(...args),
  arrayRemove: (...args: any[]) => mockArrayRemove(...args),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    }))
  }
}));

// Mock AuthContext
const mockUser = {
  userId: 'test-user-id',
  familyId: 'test-family-id',
  role: 'parent',
  name: 'Test User'
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

// Import after mocks
import { usePersonManual } from '@/hooks/usePersonManual';
import type { PersonManual, ManualTrigger, ManualStrategy, ManualBoundary } from '@/types/person-manual';

// Helper to create mock Timestamp
function createMockTimestamp() {
  return {
    toDate: () => new Date(),
    toMillis: () => Date.now(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0
  } as Timestamp;
}

// Helper to create simplified mock PersonManual
function createMockPersonManual(overrides: Partial<PersonManual> = {}): PersonManual {
  return {
    manualId: 'manual-123',
    familyId: 'test-family-id',
    personId: 'person-123',
    personName: 'Test Person',
    relationshipType: 'child',
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    version: 1,
    lastEditedAt: createMockTimestamp(),
    lastEditedBy: 'test-user-id',
    coreInfo: {
      sensoryNeeds: ['Quiet environment'],
      interests: ['Reading'],
      strengths: ['Creative'],
      notes: 'General notes'
    },
    triggers: [],
    whatWorks: [],
    whatDoesntWork: [],
    boundaries: [],
    emergingPatterns: [],
    progressNotes: [],
    totalTriggers: 0,
    totalStrategies: 0,
    totalBoundaries: 0,
    relatedJournalEntries: [],
    relatedKnowledgeIds: [],
    ...overrides
  };
}

describe('usePersonManual (Phase 1 - Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockCollection.mockReturnValue({});
    mockDoc.mockReturnValue({ id: 'test-doc-id' });
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockLimit.mockReturnValue({});
  });

  describe('createManual', () => {
    it('should create manual with simplified structure', async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
      mockAddDoc.mockResolvedValue({ id: 'new-manual-id' });

      const { result } = renderHook(() => usePersonManual());

      await act(async () => {
        const manualId = await result.current.createManual(
          'person-123',
          'Test Person',
          'child'
        );
        expect(manualId).toBe('new-manual-id');
      });

      // Verify addDoc was called with simplified structure
      const addDocCall = mockAddDoc.mock.calls[0];
      const manualData = addDocCall[1];

      expect(manualData.triggers).toEqual([]);
      expect(manualData.whatWorks).toEqual([]);
      expect(manualData.whatDoesntWork).toEqual([]);
      expect(manualData.boundaries).toEqual([]);
      expect(manualData.emergingPatterns).toEqual([]);
      expect(manualData.progressNotes).toEqual([]);
      expect(manualData.totalTriggers).toBe(0);
      expect(manualData.totalStrategies).toBe(0);
      expect(manualData.totalBoundaries).toBe(0);
    });
  });

  describe('updateCoreInfo', () => {
    it('should update core information', async () => {
      const mockManual = createMockPersonManual();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      // Wait for initial load
      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateCoreInfo('manual-123', {
          sensoryNeeds: ['Quiet', 'Soft fabrics'],
          interests: ['Reading', 'Drawing']
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('Trigger Management', () => {
    it('should add a new trigger', async () => {
      const mockManual = createMockPersonManual();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addTrigger('manual-123', {
          description: 'Loud noises',
          context: 'In crowded places',
          typicalResponse: 'Covers ears',
          severity: 'moderate'
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0];
      expect(updateCall[1].totalTriggers).toBe(1);
    });

    it('should delete a trigger', async () => {
      const mockManual = createMockPersonManual({
        triggers: [{
          id: 'trigger-1',
          description: 'Test trigger',
          context: 'Test context',
          typicalResponse: 'Test response',
          severity: 'mild' as const,
          identifiedDate: createMockTimestamp(),
          identifiedBy: 'user-123',
          confirmedBy: []
        }],
        totalTriggers: 1
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTrigger('manual-123', 'trigger-1');
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0];
      expect(updateCall[1].totalTriggers).toBe(0);
    });
  });

  describe('Strategy Management', () => {
    it('should add a strategy to whatWorks', async () => {
      const mockManual = createMockPersonManual();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addStrategy('manual-123', {
          description: 'Use calm voice',
          context: 'When upset',
          effectiveness: 4,
          sourceType: 'discovered'
        }, 'whatWorks');
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0];
      expect(updateCall[1].totalStrategies).toBe(1);
    });

    it('should delete a strategy from whatDoesntWork', async () => {
      const mockManual = createMockPersonManual({
        whatDoesntWork: [{
          id: 'strategy-1',
          description: 'Raising voice',
          context: 'When frustrated',
          effectiveness: 1,
          addedDate: createMockTimestamp(),
          addedBy: 'user-123',
          sourceType: 'discovered'
        }],
        totalStrategies: 1
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteStrategy('manual-123', 'strategy-1', 'whatDoesntWork');
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0];
      expect(updateCall[1].totalStrategies).toBe(0);
    });
  });

  describe('Boundary Management', () => {
    it('should add a boundary', async () => {
      const mockManual = createMockPersonManual();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addBoundary('manual-123', {
          description: 'No screen time after 8 PM',
          category: 'immovable',
          context: 'Sleep hygiene',
          consequences: 'Poor sleep quality'
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0];
      expect(updateCall[1].totalBoundaries).toBe(1);
    });

    it('should delete a boundary', async () => {
      const mockManual = createMockPersonManual({
        boundaries: [{
          id: 'boundary-1',
          description: 'Test boundary',
          category: 'immovable' as const,
          addedDate: createMockTimestamp(),
          addedBy: 'user-123'
        }],
        totalBoundaries: 1
      });

      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteBoundary('manual-123', 'boundary-1');
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0];
      expect(updateCall[1].totalBoundaries).toBe(0);
    });
  });

  describe('Pattern Management', () => {
    it('should add a pattern', async () => {
      const mockManual = createMockPersonManual();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addPattern('manual-123', {
          description: 'Gets anxious on Mondays',
          frequency: 'Weekly',
          firstObserved: createMockTimestamp(),
          lastObserved: createMockTimestamp(),
          confidence: 'consistent',
          relatedEntries: [],
          identifiedBy: 'user'
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('Progress Notes', () => {
    it('should add a progress note', async () => {
      const mockManual = createMockPersonManual();
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [{ id: 'manual-123', data: () => mockManual }]
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePersonManual('person-123'));

      await vi.waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addProgressNote('manual-123', {
          note: 'Showed improvement with transitions',
          category: 'improvement'
        });
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });
});
