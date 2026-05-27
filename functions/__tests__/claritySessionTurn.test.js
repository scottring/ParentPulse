// functions/__tests__/claritySessionTurn.test.js
const { expect } = require('chai');
const sinon = require('sinon');
const {
  runClaritySessionTurn,
  buildPerTurnUserMessage,
} = require('../claritySessionTurn.handler.js');

// Tiny in-memory firestore fake — only the operations the handler uses.
function makeFakeDb({ obstacle, moves = [], userData }) {
  const written = { obstacleUpdates: [], moves: [] };

  const movesCollection = {
    add: sinon.stub().callsFake(async (doc) => {
      written.moves.push({ ...doc });
      return { id: `move-${written.moves.length}` };
    }),
    orderBy: sinon.stub().callsFake(() => ({
      get: sinon.stub().resolves({
        docs: moves.map((m, i) => ({ id: `m${i}`, data: () => m })),
      }),
    })),
  };

  const obstacleRef = {
    get: sinon.stub().resolves({
      exists: !!obstacle,
      data: () => obstacle,
      id: obstacle && obstacle.id,
    }),
    update: sinon.stub().callsFake(async (patch) => {
      written.obstacleUpdates.push(patch);
      if (obstacle) Object.assign(obstacle, patch);
    }),
    collection: sinon.stub().callsFake((name) => {
      if (name === 'moves') return movesCollection;
      throw new Error('unexpected subcollection ' + name);
    }),
  };

  const userRef = {
    get: sinon.stub().resolves({ data: () => userData }),
  };

  const db = {
    collection: sinon.stub().callsFake((name) => {
      if (name === 'obstacles') {
        return { doc: sinon.stub().returns(obstacleRef) };
      }
      if (name === 'users') {
        return { doc: sinon.stub().returns(userRef) };
      }
      throw new Error('unexpected collection ' + name);
    }),
  };

  return { db, written };
}

function makeMockAnthropic(response) {
  return {
    messages: {
      create: sinon.stub().resolves({
        content: [{ text: response }],
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    },
  };
}

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

describe('runClaritySessionTurn', () => {
  const baseObstacle = {
    id: 'ob1',
    title: '',
    authorId: 'uid-1',
    familyId: 'fam-1',
    status: 'fresh',
    visibility: { mode: 'private', sharedWith: ['uid-1'] },
    visibleToUserIds: ['uid-1'],
    sensitive: false,
    allowSpecificsInOutput: false,
  };

  it('throws on missing auth', async () => {
    const { db } = makeFakeDb({ obstacle: { ...baseObstacle } });
    const anthropic = makeMockAnthropic('{}');
    let err;
    try {
      await runClaritySessionTurn(
        { db, anthropic, logger: silentLogger },
        { uid: null, data: { obstacleId: 'ob1', message: 'hi' } },
      );
    } catch (e) { err = e; }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/Authentication/);
  });

  it('throws when obstacle does not exist', async () => {
    const { db } = makeFakeDb({ obstacle: null });
    const anthropic = makeMockAnthropic('{}');
    let err;
    try {
      await runClaritySessionTurn(
        { db, anthropic, logger: silentLogger },
        { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'hi' } },
      );
    } catch (e) { err = e; }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/Obstacle not found/);
  });

  it('throws when caller is not the author', async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle, authorId: 'someone-else' },
      userData: { familyId: 'fam-1', role: 'parent' },
    });
    const anthropic = makeMockAnthropic('{}');
    let err;
    try {
      await runClaritySessionTurn(
        { db, anthropic, logger: silentLogger },
        { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'hi' } },
      );
    } catch (e) { err = e; }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/Access denied/);
  });

  it("throws when user's familyId does not match obstacle's familyId", async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle },  // familyId: 'fam-1'
      userData: { familyId: 'fam-DIFFERENT', role: 'parent' },
    });
    const anthropic = makeMockAnthropic('{}');
    let err;
    try {
      await runClaritySessionTurn(
        { db, anthropic, logger: silentLogger },
        { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'hi' } },
      );
    } catch (e) { err = e; }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/Access denied/);
  });

  it('on fresh obstacle: transitions to clarifying, drafts title, writes both moves', async () => {
    const { db, written } = makeFakeDb({
      obstacle: { ...baseObstacle },
      userData: { familyId: 'fam-1', role: 'parent' },
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: 'That sounds heavy.', question: 'Have you said this to her?' }),
    );
    const result = await runClaritySessionTurn(
      { db, anthropic, logger: silentLogger },
      {
        uid: 'uid-1',
        data: { obstacleId: 'ob1', message: 'I want to bring up something hard with Iris.' },
      },
    );
    expect(result.assistantTurn.reflection).to.contain('heavy');
    expect(written.moves).to.have.length(2);
    expect(written.moves[0].payload.role).to.equal('user');
    expect(written.moves[1].payload.role).to.equal('assistant');
    expect(written.obstacleUpdates.some((u) => u.status === 'clarifying')).to.equal(true);
    expect(
      written.obstacleUpdates.some((u) => typeof u.title === 'string' && u.title.length > 0),
    ).to.equal(true);
  });

  it('on clarifying obstacle: appends turns without re-drafting title', async () => {
    const { db, written } = makeFakeDb({
      obstacle: { ...baseObstacle, status: 'clarifying', title: 'the wrestling thing' },
      userData: { familyId: 'fam-1', role: 'parent' },
      moves: [
        { type: 'clarity-session', payload: { role: 'user', content: 'first' } },
        { type: 'clarity-session', payload: { role: 'assistant', content: 'first reply' } },
      ],
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: 'r', question: 'q' }),
    );
    await runClaritySessionTurn(
      { db, anthropic, logger: silentLogger },
      { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'more' } },
    );
    // Title was not changed.
    expect(written.obstacleUpdates.every((u) => !('title' in u))).to.equal(true);
  });

  it('when LLM emits a prescription draft, returns it on the assistant turn', async () => {
    const { db, written } = makeFakeDb({
      obstacle: { ...baseObstacle, status: 'clarifying', title: 'x' },
      userData: { familyId: 'fam-1', role: 'parent' },
      moves: [],
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({
        reflection: 'Clear now.',
        question: 'Want to try something concrete?',
        prescriptionDraft: { shape: 'atomic', body: "Ask her: '...'" },
      }),
    );
    const result = await runClaritySessionTurn(
      { db, anthropic, logger: silentLogger },
      { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'yes' } },
    );
    expect(result.assistantTurn.prescriptionDraft.shape).to.equal('atomic');
    const assistantMove = written.moves.find((m) => m.payload.role === 'assistant');
    expect(assistantMove.payload.prescriptionDraft).to.exist;
  });

  it('includes the synthesis-privacy instruction in the system prompt', async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle, status: 'clarifying', title: 'x' },
      userData: { familyId: 'fam-1', role: 'parent' },
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: 'r', question: 'q' }),
    );
    await runClaritySessionTurn(
      { db, anthropic, logger: silentLogger },
      { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'x' } },
    );
    const callArgs = anthropic.messages.create.firstCall.args[0];
    expect(callArgs.system).to.contain('PRIVACY');
    expect(callArgs.system).to.contain('Synthesize at the level of the dynamic');
  });

  it('uses claude-sonnet-4-6 model', async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle, status: 'clarifying', title: 'x' },
      userData: { familyId: 'fam-1', role: 'parent' },
    });
    const anthropic = makeMockAnthropic(
      JSON.stringify({ reflection: 'r', question: 'q' }),
    );
    await runClaritySessionTurn(
      { db, anthropic, logger: silentLogger },
      { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'x' } },
    );
    const callArgs = anthropic.messages.create.firstCall.args[0];
    expect(callArgs.model).to.equal('claude-sonnet-4-6');
  });

  it('throws when the LLM returns unparseable JSON', async () => {
    const { db } = makeFakeDb({
      obstacle: { ...baseObstacle, status: 'clarifying', title: 'x' },
      userData: { familyId: 'fam-1', role: 'parent' },
    });
    const anthropic = makeMockAnthropic('not json at all {{{{');
    let err;
    try {
      await runClaritySessionTurn(
        { db, anthropic, logger: silentLogger },
        { uid: 'uid-1', data: { obstacleId: 'ob1', message: 'x' } },
      );
    } catch (e) { err = e; }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/parsed/i);
  });
});

describe('buildPerTurnUserMessage', () => {
  const transcript = [{ role: 'user', content: 'I keep avoiding the talk.' }];

  it('names the user when a userName is provided', () => {
    const out = buildPerTurnUserMessage('A hard talk', transcript, 'Scott');
    expect(out).to.contain('Scott');
  });

  it('omits a name line when no userName is given', () => {
    const out = buildPerTurnUserMessage('A hard talk', transcript);
    // Still includes the obstacle + transcript, just no speaker identity.
    expect(out).to.contain('A hard talk');
    expect(out).to.contain('I keep avoiding the talk.');
  });
});
