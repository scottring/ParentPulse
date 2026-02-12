import { describe, it, expect } from 'vitest';
import { emptyLayers, LAYER_NAMES, LAYER_DESCRIPTIONS } from '@/types/manual';
import { COLLECTIONS } from '@/types';
import type { CoherenceLayerId } from '@/types/user';
import type { Manual, CoherenceLayers } from '@/types/manual';
import type { Entry, EntryType, EntryContent } from '@/types/entry';
import type { Yearbook } from '@/types/yearbook';
import type { CoherenceCheckin } from '@/types/checkin';

describe('Coherence Framework Types', () => {
  describe('COLLECTIONS', () => {
    it('has all 7 collections', () => {
      expect(Object.keys(COLLECTIONS)).toHaveLength(7);
      expect(COLLECTIONS.FAMILIES).toBe('families');
      expect(COLLECTIONS.USERS).toBe('users');
      expect(COLLECTIONS.MANUALS).toBe('manuals');
      expect(COLLECTIONS.ENTRIES).toBe('entries');
      expect(COLLECTIONS.YEARBOOKS).toBe('yearbooks');
      expect(COLLECTIONS.CONVERSATIONS).toBe('conversations');
      expect(COLLECTIONS.CHECKINS).toBe('checkins');
    });
  });

  describe('emptyLayers', () => {
    it('has all 4 coherence layers', () => {
      const layers = emptyLayers;
      expect(layers).toHaveProperty('mind');
      expect(layers).toHaveProperty('context');
      expect(layers).toHaveProperty('execution');
      expect(layers).toHaveProperty('output');
    });

    it('has empty arrays for all mind fields', () => {
      expect(emptyLayers.mind.values).toEqual([]);
      expect(emptyLayers.mind.identityStatements).toEqual([]);
      expect(emptyLayers.mind.nonNegotiables).toEqual([]);
      expect(emptyLayers.mind.narratives).toEqual([]);
    });

    it('has empty arrays for all context fields', () => {
      expect(emptyLayers.context.decisionDomains).toEqual([]);
      expect(emptyLayers.context.boundaries).toEqual([]);
      expect(emptyLayers.context.resourcePrinciples).toEqual([]);
    });

    it('has empty arrays for all execution fields', () => {
      expect(emptyLayers.execution.rhythms).toEqual([]);
      expect(emptyLayers.execution.rituals).toEqual([]);
      expect(emptyLayers.execution.commitments).toEqual([]);
      expect(emptyLayers.execution.painPoints).toEqual([]);
    });

    it('has empty arrays for all output fields', () => {
      expect(emptyLayers.output.coherenceIndicators).toEqual([]);
      expect(emptyLayers.output.driftSignals).toEqual([]);
      expect(emptyLayers.output.storyArchive).toEqual([]);
    });
  });

  describe('LAYER_NAMES', () => {
    it('has names for all 4 layers', () => {
      const layerIds: CoherenceLayerId[] = ['mind', 'context', 'execution', 'output'];
      for (const id of layerIds) {
        expect(LAYER_NAMES[id]).toBeDefined();
        expect(typeof LAYER_NAMES[id]).toBe('string');
      }
    });
  });

  describe('LAYER_DESCRIPTIONS', () => {
    it('has descriptions for all 4 layers', () => {
      const layerIds: CoherenceLayerId[] = ['mind', 'context', 'execution', 'output'];
      for (const id of layerIds) {
        expect(LAYER_DESCRIPTIONS[id]).toBeDefined();
        expect(typeof LAYER_DESCRIPTIONS[id]).toBe('string');
      }
    });
  });

  describe('Entry types', () => {
    it('supports all 9 entry types', () => {
      const types: EntryType[] = [
        'insight', 'activity', 'goal', 'task', 'reflection',
        'story', 'checklist', 'discussion', 'milestone',
      ];
      // This is a compile-time check — if any type is invalid, TS will error
      expect(types).toHaveLength(9);
    });

    it('story content has required fields', () => {
      const content: EntryContent = {
        kind: 'story',
        body: 'Once upon a time...',
      };
      expect(content.kind).toBe('story');
    });

    it('checklist content has items array', () => {
      const content: EntryContent = {
        kind: 'checklist',
        items: [
          { id: '1', label: 'Brush teeth', checked: false },
        ],
      };
      expect(content.kind).toBe('checklist');
    });
  });
});
