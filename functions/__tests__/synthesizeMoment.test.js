const {expect} = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

function fakeTimestamp(iso = '2026-04-19T12:00:00Z') {
  const d = new Date(iso);
  return {
    toMillis: () => d.getTime(),
    toDate: () => d,
  };
}

function fakeDocSnap({exists = true, data = {}} = {}) {
  return {
    exists,
    data: () => data,
  };
}

function fakeDocRef({snap, updates = []}) {
  return {
    get: sinon.stub().resolves(snap),
    update: sinon.stub().callsFake((u) => {
      updates.push(u);
      return Promise.resolve();
    }),
  };
}

function fakeViewsSnap(views) {
  return {
    size: views.length,
    docs: views.map((v, i) => ({
      id: v.entryId || `view-${i}`,
      data: () => v,
    })),
  };
}

function fakeFirestore({moment, views, usageAdd}) {
  const momentUpdates = [];
  const momentRef = fakeDocRef({
    snap: fakeDocSnap({exists: !!moment, data: moment || {}}),
    updates: momentUpdates,
  });

  const viewsQuery = {
    where: sinon.stub().returnsThis(),
    orderBy: sinon.stub().returnsThis(),
    get: sinon.stub().resolves(fakeViewsSnap(views)),
  };

  const usage = usageAdd || {add: sinon.stub().resolves()};

  const db = {
    collection: sinon.stub().callsFake((name) => {
      if (name === 'moments') {
        return {doc: () => momentRef};
      }
      if (name === 'journal_entries') {
        return viewsQuery;
      }
      if (name === 'ai_usage_events') {
        return usage;
      }
      throw new Error(`unexpected collection: ${name}`);
    }),
  };

  return {db, momentRef, momentUpdates, usage};
}

describe('synthesizeMoment handler', () => {
  function loadHandler(openaiStub) {
    delete require.cache[require.resolve('../synthesizeMoment.handler.js')];
    return proxyquire('../synthesizeMoment.handler.js', {
      'firebase-admin': {
        firestore: {Timestamp: {now: () => fakeTimestamp()}},
      },
      './openaiClient.js': {getOpenAI: () => openaiStub},
    });
  }

  it('skips when fewer than 2 views', async () => {
    const openai = {chat: {completions: {create: sinon.stub()}}};
    const {runMomentSynthesis} = loadHandler(openai);
    const {db} = fakeFirestore({
      moment: {familyId: 'fam-1'},
      views: [{authorId: 'iris', text: 'only view', createdAt: fakeTimestamp()}],
    });

    const result = await runMomentSynthesis(db, 'm1', {
      now: () => fakeTimestamp(),
      openai,
      logger: {warn: () => {}, info: () => {}, error: () => {}},
    });

    expect(result.skipped).to.equal('too_few_views');
    expect(openai.chat.completions.create.called).to.equal(false);
  });

  it('skips when moment does not exist', async () => {
    const openai = {chat: {completions: {create: sinon.stub()}}};
    const {runMomentSynthesis} = loadHandler(openai);
    const {db} = fakeFirestore({
      moment: null,
      views: [],
    });

    const result = await runMomentSynthesis(db, 'missing', {
      openai,
      logger: {warn: () => {}, info: () => {}, error: () => {}},
    });

    expect(result.skipped).to.equal('missing');
  });

  it('writes agreement/divergence/emergent to moment doc on success', async () => {
    const openai = {
      chat: {
        completions: {
          create: sinon.stub().resolves({
            choices: [{
              message: {
                content: JSON.stringify({
                  agreement_line: 'Both watched the same bedtime unravel.',
                  divergence_line: 'Iris names exhaustion, Scott names distraction.',
                  emergent_line: 'The hand-off at 8pm is where things crack.',
                }),
              },
            }],
            usage: {total_tokens: 210, prompt_tokens: 160, completion_tokens: 50},
          }),
        },
      },
    };

    const {runMomentSynthesis} = loadHandler(openai);
    const fixedNow = fakeTimestamp('2026-04-19T12:00:00Z');
    const {db, momentRef, momentUpdates, usage} = fakeFirestore({
      moment: {familyId: 'fam-1'},
      views: [
        {authorId: 'iris', text: 'I was so tired', createdAt: fakeTimestamp('2026-04-18T20:00:00Z')},
        {authorId: 'scott', text: 'I was on my phone', createdAt: fakeTimestamp('2026-04-18T20:05:00Z')},
      ],
    });

    const result = await runMomentSynthesis(db, 'm1', {
      now: () => fixedNow,
      openai,
      logger: {warn: () => {}, info: () => {}, error: () => {}},
    });

    expect(result.ok).to.equal(true);
    expect(result.viewCount).to.equal(2);
    expect(result.agreementLine).to.equal('Both watched the same bedtime unravel.');
    expect(result.divergenceLine).to.equal('Iris names exhaustion, Scott names distraction.');
    expect(result.emergentLine).to.equal('The hand-off at 8pm is where things crack.');

    // Moment doc updated exactly once with all three lines.
    expect(momentRef.update.calledOnce).to.equal(true);
    expect(momentUpdates).to.have.length(1);
    expect(momentUpdates[0].synthesis).to.include({
      agreementLine: 'Both watched the same bedtime unravel.',
      divergenceLine: 'Iris names exhaustion, Scott names distraction.',
      emergentLine: 'The hand-off at 8pm is where things crack.',
    });
    expect(momentUpdates[0].synthesis.model).to.equal('gpt-4o-mini');
    expect(momentUpdates[0].synthesis.generatedAt).to.equal(fixedNow);
    expect(momentUpdates[0].synthesisUpdatedAt).to.equal(fixedNow);

    // AI usage logged with moment_synthesis kind.
    expect(usage.add.calledOnce).to.equal(true);
    const usageArg = usage.add.firstCall.args[0];
    expect(usageArg.kind).to.equal('moment_synthesis');
    expect(usageArg.familyId).to.equal('fam-1');
    expect(usageArg.momentId).to.equal('m1');
    expect(usageArg.tokens).to.equal(210);
  });

  it('accepts null divergence/emergent when model returns null', async () => {
    const openai = {
      chat: {
        completions: {
          create: sinon.stub().resolves({
            choices: [{
              message: {
                content: JSON.stringify({
                  agreement_line: 'They both describe the kitchen at 7am.',
                  divergence_line: null,
                  emergent_line: null,
                }),
              },
            }],
            usage: {total_tokens: 100},
          }),
        },
      },
    };

    const {runMomentSynthesis} = loadHandler(openai);
    const {db, momentUpdates} = fakeFirestore({
      moment: {familyId: 'fam-1'},
      views: [
        {authorId: 'a', text: 'coffee was made', createdAt: fakeTimestamp()},
        {authorId: 'b', text: 'coffee was made', createdAt: fakeTimestamp()},
      ],
    });

    const result = await runMomentSynthesis(db, 'm1', {
      openai,
      logger: {warn: () => {}, info: () => {}, error: () => {}},
    });

    expect(result.ok).to.equal(true);
    expect(result.divergenceLine).to.equal(null);
    expect(result.emergentLine).to.equal(null);
    expect(momentUpdates[0].synthesis.divergenceLine).to.equal(null);
    expect(momentUpdates[0].synthesis.emergentLine).to.equal(null);
  });

  it('skips write if model returns empty agreement_line', async () => {
    const openai = {
      chat: {
        completions: {
          create: sinon.stub().resolves({
            choices: [{message: {content: JSON.stringify({
              agreement_line: '',
              divergence_line: null,
              emergent_line: null,
            })}}],
            usage: {total_tokens: 50},
          }),
        },
      },
    };

    const {runMomentSynthesis} = loadHandler(openai);
    const {db, momentRef} = fakeFirestore({
      moment: {familyId: 'fam-1'},
      views: [
        {authorId: 'a', text: 'x', createdAt: fakeTimestamp()},
        {authorId: 'b', text: 'y', createdAt: fakeTimestamp()},
      ],
    });

    const result = await runMomentSynthesis(db, 'm1', {
      openai,
      logger: {warn: () => {}, info: () => {}, error: () => {}},
    });

    expect(result.skipped).to.equal('empty_agreement');
    expect(momentRef.update.called).to.equal(false);
  });
});
