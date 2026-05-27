const {expect} = require('chai');
const sinon = require('sinon');
const {
  runWeeklyFocusSynthesis,
  buildWeeklyFocusPrompt,
} = require('../synthesizeWeeklyFocus.handler.js');

function fakeUserDb(userData) {
  return {
    collection: sinon.stub().callsFake((name) => {
      if (name === 'users') {
        return {doc: () => ({get: sinon.stub().resolves({data: () => userData})})};
      }
      throw new Error(`unexpected collection: ${name}`);
    }),
  };
}

function fakeAnthropic(text) {
  return {
    messages: {
      create: sinon.stub().resolves({
        content: [{text}],
        usage: {input_tokens: 120, output_tokens: 30},
      }),
    },
  };
}

const silentLogger = {info: () => {}, warn: () => {}, error: () => {}};

describe('synthesizeWeeklyFocus handler', () => {
  it('requires authentication', async () => {
    let err;
    try {
      await runWeeklyFocusSynthesis(
        {db: fakeUserDb({role: 'parent'}), anthropic: fakeAnthropic('x'), logger: silentLogger},
        {uid: null, data: {wentWell: 'a'}},
      );
    } catch (e) {
      err = e;
    }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/auth/i);
  });

  it('rejects when there is no signal to build from', async () => {
    let err;
    try {
      await runWeeklyFocusSynthesis(
        {db: fakeUserDb({role: 'parent'}), anthropic: fakeAnthropic('x'), logger: silentLogger},
        {uid: 'u1', data: {wentWell: '', wasHard: '', smallJoys: '', intentions: []}},
      );
    } catch (e) {
      err = e;
    }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/nothing|signal|empty/i);
  });

  it('rejects non-parent callers', async () => {
    let err;
    try {
      await runWeeklyFocusSynthesis(
        {db: fakeUserDb({role: 'child', familyId: 'f1'}), anthropic: fakeAnthropic('x'), logger: silentLogger},
        {uid: 'kid', data: {wasHard: 'the handoff'}},
      );
    } catch (e) {
      err = e;
    }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/parent/i);
  });

  it('returns a trimmed focus line on success', async () => {
    const anthropic = fakeAnthropic('  Trade the Tuesday handoff for one week and say so out loud.  ');
    const result = await runWeeklyFocusSynthesis(
      {db: fakeUserDb({role: 'parent', familyId: 'f1'}), anthropic, logger: silentLogger},
      {uid: 'u1', data: {wentWell: 'laughed', wasHard: 'the handoff', smallJoys: 'coffee', intentions: ['be kinder']}},
    );
    expect(result.focus).to.equal(
      'Trade the Tuesday handoff for one week and say so out loud.',
    );
    expect(anthropic.messages.create.calledOnce).to.equal(true);
    const callArg = anthropic.messages.create.firstCall.args[0];
    expect(callArg.model).to.equal('claude-sonnet-4-6');
    expect(callArg.system).to.match(/no advice-as-lecture|plain language|two sentences/i);
  });

  it('throws when the model returns empty', async () => {
    let err;
    try {
      await runWeeklyFocusSynthesis(
        {db: fakeUserDb({role: 'parent', familyId: 'f1'}), anthropic: fakeAnthropic('   '), logger: silentLogger},
        {uid: 'u1', data: {wasHard: 'x'}},
      );
    } catch (e) {
      err = e;
    }
    expect(err).to.be.an('error');
    expect(err.message).to.match(/empty/i);
  });

  it('logs AI usage but does not fail the call when logging throws', async () => {
    const logAIUsage = sinon.stub().rejects(new Error('analytics down'));
    const result = await runWeeklyFocusSynthesis(
      {
        db: fakeUserDb({role: 'parent', familyId: 'f1'}),
        anthropic: fakeAnthropic('Do the thing.'),
        logger: silentLogger,
        logAIUsage,
      },
      {uid: 'u1', data: {wasHard: 'x'}},
    );
    expect(result.focus).to.equal('Do the thing.');
    expect(logAIUsage.calledOnce).to.equal(true);
  });
});

describe('buildWeeklyFocusPrompt', () => {
  it('includes every non-empty section and the intentions', () => {
    const p = buildWeeklyFocusPrompt({
      wentWell: 'We laughed at dinner',
      wasHard: 'The Tuesday handoff',
      smallJoys: 'Coffee on the porch',
      intentions: ['Trade bedtime', 'Say it sooner'],
    });
    expect(p).to.contain('We laughed at dinner');
    expect(p).to.contain('The Tuesday handoff');
    expect(p).to.contain('Coffee on the porch');
    expect(p).to.contain('Trade bedtime');
    expect(p).to.contain('Say it sooner');
  });

  it('omits empty sections cleanly', () => {
    const p = buildWeeklyFocusPrompt({
      wentWell: '',
      wasHard: 'Only this',
      smallJoys: '',
      intentions: [],
    });
    expect(p).to.contain('Only this');
    expect(p.toLowerCase()).to.not.contain('went well');
  });
});
