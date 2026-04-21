/**
 * Cloud Functions Tests — regenerateTherapyWindow
 *
 * Tests the therapy regen internals using stubbed Firestore so no
 * emulator is required. The `callClaudeForThemes` stub prevents any
 * real LLM calls.
 */

'use strict';

const { expect } = require('chai');
const sinon = require('sinon');

// Set dummy key before requiring index so the lazy Anthropic getter
// does not blow up during module load.
process.env.ANTHROPIC_API_KEY = 'test-key';

// ----------------------------------------------------------------
// Minimal Firestore in-memory double
// Supports: collection().doc().get/set/update, batch, Timestamp
// ----------------------------------------------------------------

function makeTimestamp(ms) {
  return { _ms: ms, toMillis: () => ms, toDate: () => new Date(ms) };
}

const NOW_MS = Date.now();
const TS_NOW = makeTimestamp(NOW_MS);
const TS_WEEK_AGO = makeTimestamp(NOW_MS - 7 * 24 * 60 * 60 * 1000);

// Global in-memory store: { [collection]: { [docId]: data } }
let store = {};

function getDoc(col, id) {
  return (store[col] || {})[id];
}

function setDoc(col, id, data) {
  if (!store[col]) store[col] = {};
  store[col][id] = { ...data };
}

function applyUpdate(target, update) {
  const result = { ...target };
  for (const [key, val] of Object.entries(update)) {
    // Handle dot-notation paths like 'lifecycle.carriedForwardCount'
    const parts = key.split('.');
    if (parts.length === 1) {
      if (val && val.__sentinel === INCREMENT_SENTINEL) {
        result[key] = (result[key] || 0) + val.n;
      } else {
        result[key] = val;
      }
    } else {
      // Nested path — shallow-clone each level
      let obj = result;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...(obj[parts[i]] || {}) };
        obj = obj[parts[i]];
      }
      const leaf = parts[parts.length - 1];
      if (val && val.__sentinel === INCREMENT_SENTINEL) {
        obj[leaf] = (obj[leaf] || 0) + val.n;
      } else {
        obj[leaf] = val;
      }
    }
  }
  return result;
}

function updateDoc(col, id, update) {
  if (!store[col] || !store[col][id]) throw new Error(`Doc ${col}/${id} not found`);
  store[col][id] = applyUpdate(store[col][id], update);
}

let autoIdCounter = 0;
function makeAutoId() {
  return `auto-${++autoIdCounter}`;
}

// Batch double — applies writes in order on commit()
function makeBatch() {
  const ops = [];
  return {
    set(ref, data) { ops.push({ type: 'set', ref, data }); },
    update(ref, data) { ops.push({ type: 'update', ref, data }); },
    async commit() {
      for (const op of ops) {
        if (op.type === 'set') setDoc(op.ref._col, op.ref._id, op.data);
        else updateDoc(op.ref._col, op.ref._id, op.data);
      }
    },
  };
}

// DocumentReference double
function makeDocRef(col, id) {
  return {
    _col: col,
    _id: id,
    id,
    async get() {
      const data = getDoc(col, id);
      return { exists: !!data, data: () => data ? { ...data } : null, id };
    },
    async update(u) { updateDoc(col, id, u); },
    async set(d) { setDoc(col, id, d); },
  };
}

// CollectionReference double — supports .where().get() and .doc()
function makeColRef(col) {
  const filters = [];

  const self = {
    _col: col,
    _filters: filters,

    where(_field, _op, _val) {
      // Return a new object with the filter appended
      const next = makeColRef(col);
      next._filters.push(...filters, { field: _field, op: _op, val: _val });
      return next;
    },

    orderBy() { return self; },
    limit(n) {
      const next = makeColRef(col);
      next._filters.push(...filters);
      next._limit = n;
      return next;
    },

    doc(id) {
      const docId = id || makeAutoId();
      return makeDocRef(col, docId);
    },

    async get() {
      const allDocs = store[col] || {};
      const myFilters = self._filters || filters;
      const docs = Object.entries(allDocs)
          .filter(([_id, data]) => {
            return myFilters.every(({ field, op, val }) => {
              const fieldVal = data[field];
              if (op === '==') return fieldVal === val;
              if (op === 'in') return Array.isArray(val) && val.includes(fieldVal);
              if (op === '>=') return fieldVal >= val;
              if (op === '<=') return fieldVal <= val;
              return true;
            });
          })
          .map(([id, data]) => ({ id, exists: true, data: () => ({ ...data }), ref: makeDocRef(col, id) }));

      return { empty: docs.length === 0, docs, size: docs.length, forEach: (fn) => docs.forEach(fn) };
    },
  };
  return self;
}

// Minimal db double
const db = {
  collection: (col) => makeColRef(col),
  batch: () => makeBatch(),
};

// FieldValue sentinels
const INCREMENT_SENTINEL = Symbol('INCREMENT');
function makeIncrement(n) { return { __sentinel: INCREMENT_SENTINEL, n }; }

// Firestore.Timestamp stub
const adminTimestampStub = {
  Timestamp: {
    now: () => TS_NOW,
    fromMillis: makeTimestamp,
  },
  firestore: {
    Timestamp: { now: () => TS_NOW, fromMillis: makeTimestamp },
    FieldValue: {
      delete: () => 'DELETE',
      increment: makeIncrement,
      arrayUnion: (...items) => ({ __sentinel: 'ARRAY_UNION', items }),
    },
  },
};

// ----------------------------------------------------------------
// Stub out firebase-admin BEFORE requiring index.js so the
// module-level `admin.initializeApp()` call uses our double.
// ----------------------------------------------------------------
const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'firebase-admin') {
    return {
      initializeApp: () => {},
      apps: [{}], // non-empty so apps.length check passes if needed
      firestore: Object.assign(
          () => db,
          adminTimestampStub.firestore,
          { Timestamp: adminTimestampStub.Timestamp },
          { FieldValue: adminTimestampStub.firestore.FieldValue },
      ),
    };
  }
  if (request === 'firebase-functions/logger') {
    return { info: () => {}, warn: () => {}, error: () => {} };
  }
  if (request === 'firebase-functions/v2/https') {
    const err = class HttpsError extends Error {
      constructor(code, message) { super(message); this.code = code; }
    };
    return { onCall: (opts, fn) => fn, HttpsError: err };
  }
  if (request === 'firebase-functions/v2/scheduler') {
    return { onSchedule: () => () => {} };
  }
  if (request === 'firebase-functions/v2/firestore') {
    return { onDocumentUpdated: () => () => {}, onDocumentCreated: () => () => {} };
  }
  if (request === '@anthropic-ai/sdk') {
    return class { messages = { create: async () => ({ content: [{ text: '{}' }], usage: {} }) }; };
  }
  if (request === '@google/generative-ai') {
    return { GoogleGenerativeAI: class {} };
  }
  if (request === 'openai') {
    return class { embeddings = { create: async () => ({ data: [] }) }; };
  }
  return originalLoad.apply(this, arguments);
};

// Now require index — it will use our stubs
const indexModule = require('../index');
Module._load = originalLoad; // restore

const internals = indexModule.__therapyInternals;
const { gatherTherapySources, buildTherapyPrompt, callClaudeForThemes, performTherapyRegen, performTherapyClose } = internals;

// ----------------------------------------------------------------
// Helpers to seed the in-memory store
// ----------------------------------------------------------------
function resetStore() { store = {}; autoIdCounter = 0; }

function seedWindow(windowId, opts = {}) {
  setDoc('therapy_windows', windowId, {
    therapistId: opts.therapistId || 'therapist-1',
    ownerUserId: opts.ownerUserId || 'user-1',
    status: opts.status || 'open',
    openedAt: TS_WEEK_AGO,
    themeIds: opts.themeIds || [],
    noteIds: opts.noteIds || [],
    lastRegeneratedAt: null,
  });
}

function seedTheme(themeId, windowId, opts = {}) {
  setDoc('therapy_themes', themeId, {
    windowId,
    therapistId: 'therapist-1',
    ownerUserId: 'user-1',
    title: opts.title || `Theme ${themeId}`,
    summary: opts.summary || 'A summary',
    sourceRefs: [],
    identity: opts.identity || themeId,
    userState: opts.userState || { starred: false, dismissed: false },
    lifecycle: opts.lifecycle || { firstSeenWindowId: windowId, carriedForwardCount: 0 },
    generatedAt: TS_NOW,
    model: 'claude-sonnet-4-5',
  });
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------
describe('buildTherapyPrompt', () => {
  const emptySources = {
    journalEntries: [],
    marginNotes: [],
    manualSyntheses: [],
    growthItems: [],
    priorNotes: [],
  };

  it('returns a non-empty string given minimal sources', () => {
    const prompt = buildTherapyPrompt({ sources: emptySources, existingThemes: [], priorNotes: [] });
    expect(prompt).to.be.a('string').with.length.greaterThan(0);
  });

  it('instructs Claude to return JSON with a themes array', () => {
    const prompt = buildTherapyPrompt({ sources: emptySources, existingThemes: [], priorNotes: [] });
    expect(prompt).to.include('"themes"');
  });

  it('marks dismissed themes as "do not resurface"', () => {
    const prompt = buildTherapyPrompt({
      sources: emptySources,
      existingThemes: [
        { identity: 'anx', title: 'Anxiety', userState: { dismissed: true, starred: false }, lifecycle: { carriedForwardCount: 0 } },
      ],
      priorNotes: [],
    });
    expect(prompt.toLowerCase()).to.include('do not resurface');
  });

  it('marks starred themes as "preserve"', () => {
    const prompt = buildTherapyPrompt({
      sources: emptySources,
      existingThemes: [
        { identity: 'sleep', title: 'Sleep', userState: { starred: true, dismissed: false }, lifecycle: { carriedForwardCount: 0 } },
      ],
      priorNotes: [],
    });
    expect(prompt.toLowerCase()).to.include('preserve');
  });

  it('includes journal entry text in prompt', () => {
    const sources = { ...emptySources, journalEntries: [{ id: 'e1', text: 'Had a rough morning with Liam', createdAt: TS_NOW }] };
    const prompt = buildTherapyPrompt({ sources, existingThemes: [], priorNotes: [] });
    expect(prompt).to.include('Had a rough morning');
  });
});

describe('performTherapyRegen — new themes created', () => {
  let stub;

  beforeEach(() => {
    resetStore();
    stub = sinon.stub(internals, 'callClaudeForThemes');
  });

  afterEach(() => sinon.restore());

  it('creates theme docs and populates window.themeIds', async () => {
    const WIN = 'win-1';
    seedWindow(WIN);

    stub.resolves([
      { title: 'Bedtime battles', summary: 'Recurring at 8pm', sourceRefs: [], identity: 'bedtime-battles' },
      { title: 'Sibling conflict', summary: 'Escalates on weekends', sourceRefs: [], identity: 'sibling-conflict' },
    ]);

    await performTherapyRegen(db, { windowId: WIN });

    const winData = getDoc('therapy_windows', WIN);
    expect(winData.themeIds).to.be.an('array').with.lengthOf(2);
    expect(winData.lastRegeneratedAt).to.equal(TS_NOW);

    // Both theme docs must exist
    for (const themeId of winData.themeIds) {
      const theme = getDoc('therapy_themes', themeId);
      expect(theme).to.exist;
      expect(theme.windowId).to.equal(WIN);
      expect(theme.userState).to.deep.equal({ starred: false, dismissed: false });
    }
  });

  it('assigns stable identity to new themes', async () => {
    const WIN = 'win-2';
    seedWindow(WIN);

    stub.resolves([
      { title: 'Work stress', summary: '...', sourceRefs: [], identity: 'work-stress' },
    ]);

    await performTherapyRegen(db, { windowId: WIN });

    const winData = getDoc('therapy_windows', WIN);
    const theme = getDoc('therapy_themes', winData.themeIds[0]);
    expect(theme.identity).to.equal('work-stress');
  });
});

describe('performTherapyRegen — userState preserved on identity match', () => {
  let stub;

  beforeEach(() => {
    resetStore();
    stub = sinon.stub(internals, 'callClaudeForThemes');
  });

  afterEach(() => sinon.restore());

  it('keeps starred + note when LLM returns matching identity', async () => {
    const WIN = 'win-3';
    const THEME_ID = 'theme-existing';

    seedWindow(WIN, { themeIds: [THEME_ID] });
    seedTheme(THEME_ID, WIN, {
      title: 'Anxiety at school',
      identity: 'anxiety-at-school',
      userState: { starred: true, dismissed: false, note: 'big one' },
      lifecycle: { firstSeenWindowId: WIN, carriedForwardCount: 2 },
    });

    // LLM returns matching identity with updated title/summary
    stub.resolves([
      { title: 'Anxiety at school (refined)', summary: 'Still showing at drop-off', sourceRefs: [], identity: 'anxiety-at-school' },
    ]);

    await performTherapyRegen(db, { windowId: WIN });

    const winData = getDoc('therapy_windows', WIN);
    expect(winData.themeIds).to.have.lengthOf(1);

    const themeId = winData.themeIds[0];
    const theme = getDoc('therapy_themes', themeId);

    // userState and lifecycle must be preserved exactly
    expect(theme.userState.starred).to.be.true;
    expect(theme.userState.note).to.equal('big one');
    expect(theme.lifecycle.carriedForwardCount).to.equal(2);
    // Content must be updated
    expect(theme.title).to.equal('Anxiety at school (refined)');
  });
});

describe('performTherapyRegen — soft-retire themes not returned by LLM', () => {
  let stub;

  beforeEach(() => {
    resetStore();
    stub = sinon.stub(internals, 'callClaudeForThemes');
  });

  afterEach(() => sinon.restore());

  it('removes un-returned themes from themeIds but keeps their docs', async () => {
    const WIN = 'win-4';
    const KEPT_ID = 'theme-kept';
    const DROPPED_ID = 'theme-dropped';

    seedWindow(WIN, { themeIds: [KEPT_ID, DROPPED_ID] });
    seedTheme(KEPT_ID, WIN, { title: 'Sleep regression', identity: 'sleep-regression' });
    seedTheme(DROPPED_ID, WIN, { title: 'Old theme', identity: 'old-theme' });

    // LLM only returns the kept theme
    stub.resolves([
      { title: 'Sleep regression', summary: 'Better but still present', sourceRefs: [], identity: 'sleep-regression' },
    ]);

    await performTherapyRegen(db, { windowId: WIN });

    const winData = getDoc('therapy_windows', WIN);
    expect(winData.themeIds).to.have.lengthOf(1);

    // Dropped doc must still exist (soft-retired, not deleted)
    const dropped = getDoc('therapy_themes', DROPPED_ID);
    expect(dropped).to.exist;
    expect(dropped.title).to.equal('Old theme');
  });
});

describe('performTherapyRegen — LLM failure leaves window untouched', () => {
  let stub;

  beforeEach(() => {
    resetStore();
    stub = sinon.stub(internals, 'callClaudeForThemes');
  });

  afterEach(() => sinon.restore());

  it('throws and leaves themeIds + lastRegeneratedAt unchanged', async () => {
    const WIN = 'win-5';
    const THEME_ID = 'theme-safe';

    seedWindow(WIN, { themeIds: [THEME_ID] });
    seedTheme(THEME_ID, WIN, { title: 'Safe theme', identity: 'safe-theme' });

    stub.rejects(new Error('LLM unavailable'));

    let threw = false;
    try {
      await performTherapyRegen(db, { windowId: WIN });
    } catch (err) {
      threw = true;
      expect(err.message).to.include('LLM unavailable');
    }

    expect(threw).to.be.true;

    const winData = getDoc('therapy_windows', WIN);
    expect(winData.themeIds).to.deep.equal([THEME_ID]);
    expect(winData.lastRegeneratedAt).to.be.null;
  });

  it('throws for a non-open window', async () => {
    const WIN = 'win-closed';
    seedWindow(WIN, { status: 'closed' });
    stub.resolves([]);

    let threw = false;
    try {
      await performTherapyRegen(db, { windowId: WIN });
    } catch (err) {
      threw = true;
      expect(err.message).to.include('not open');
    }
    expect(threw).to.be.true;
  });

  it('throws for a missing window', async () => {
    stub.resolves([]);
    let threw = false;
    try {
      await performTherapyRegen(db, { windowId: 'does-not-exist' });
    } catch (err) {
      threw = true;
    }
    expect(threw).to.be.true;
  });
});

// ----------------------------------------------------------------
// therapy — close
// ----------------------------------------------------------------
describe('therapy — close', () => {
  let regenStub;

  beforeEach(() => {
    resetStore();
    // Stub performTherapyRegen so post-close regen never calls LLM
    regenStub = sinon.stub(internals, 'performTherapyRegen').resolves({ themeIds: [] });
  });

  afterEach(() => sinon.restore());

  it('marks discussed, closes window, creates new open window with carry-forward', async () => {
    const WIN = 'close-win-1';
    const THEME_DISCUSSED = 'theme-disc-1';
    const THEME_UNDISCUSSED = 'theme-undisc-1';
    const SESSION_MS = NOW_MS + 1000;

    seedWindow(WIN, { themeIds: [THEME_DISCUSSED, THEME_UNDISCUSSED] });
    seedTheme(THEME_DISCUSSED, WIN, { identity: 'disc-theme', lifecycle: { firstSeenWindowId: WIN, carriedForwardCount: 0 } });
    seedTheme(THEME_UNDISCUSSED, WIN, { identity: 'undisc-theme', lifecycle: { firstSeenWindowId: WIN, carriedForwardCount: 0 } });

    const result = await performTherapyClose(db, {
      windowId: WIN,
      sessionDateMillis: SESSION_MS,
      discussedThemeIds: [THEME_DISCUSSED],
      transcript: null,
    });

    // Closed window should have status=closed
    const closedWin = getDoc('therapy_windows', WIN);
    expect(closedWin.status).to.equal('closed');
    expect(closedWin.closedAt).to.exist;

    // Discussed theme should have discussedAt set
    const discussedTheme = getDoc('therapy_themes', THEME_DISCUSSED);
    expect(discussedTheme.lifecycle.discussedAt).to.exist;

    // Undiscussed theme should be reassigned to new window with incremented carriedForwardCount
    const undiscussedTheme = getDoc('therapy_themes', THEME_UNDISCUSSED);
    expect(undiscussedTheme.windowId).to.equal(result.newWindowId);
    expect(undiscussedTheme.lifecycle.carriedForwardCount).to.equal(1);

    // New window should be open with correct fields
    const newWin = getDoc('therapy_windows', result.newWindowId);
    expect(newWin.status).to.equal('open');
    expect(newWin.themeIds).to.deep.equal([THEME_UNDISCUSSED]);
    expect(newWin.carriedForwardFromWindowId).to.equal(WIN);

    // performTherapyRegen should have been called once (best-effort)
    expect(regenStub.calledOnce).to.be.true;
  });

  it('rejects double-close', async () => {
    const WIN = 'close-win-2';
    const THEME_A = 'theme-dc-a';

    seedWindow(WIN, { themeIds: [THEME_A] });
    seedTheme(THEME_A, WIN, { identity: 'theme-a', lifecycle: { firstSeenWindowId: WIN, carriedForwardCount: 0 } });

    // First close
    await performTherapyClose(db, {
      windowId: WIN,
      sessionDateMillis: NOW_MS,
      discussedThemeIds: [THEME_A],
      transcript: null,
    });

    // Second close should fail
    let threw = false;
    let errorMessage = '';
    try {
      await performTherapyClose(db, {
        windowId: WIN,
        sessionDateMillis: NOW_MS + 1000,
        discussedThemeIds: [],
        transcript: null,
      });
    } catch (err) {
      threw = true;
      errorMessage = err.message;
    }

    expect(threw).to.be.true;
    expect(errorMessage).to.match(/not open/i);
  });

  it('writes transcript as therapy_note on closing window', async () => {
    const WIN = 'close-win-3';
    const THEME_B = 'theme-note-b';
    const TRANSCRIPT = 'Today we talked about bedtime routines at length.';

    seedWindow(WIN, { themeIds: [THEME_B] });
    seedTheme(THEME_B, WIN, { identity: 'bedtime', lifecycle: { firstSeenWindowId: WIN, carriedForwardCount: 0 } });

    await performTherapyClose(db, {
      windowId: WIN,
      sessionDateMillis: NOW_MS,
      discussedThemeIds: [THEME_B],
      transcript: TRANSCRIPT,
    });

    // Find the therapy_note doc attached to the closing window
    const notes = Object.values(store['therapy_notes'] || {});
    expect(notes).to.have.lengthOf(1);
    expect(notes[0].windowId).to.equal(WIN);
    expect(notes[0].transcript).to.equal(TRANSCRIPT);
  });
});
