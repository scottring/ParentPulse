const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('transcribeAudio', () => {
  let openaiStub;
  let firestoreStub;
  let rateLimitDoc;
  let logsCollection;

  beforeEach(() => {
    openaiStub = {
      audio: { transcriptions: { create: sinon.stub().resolves('hello world') } },
    };

    rateLimitDoc = {
      get: sinon.stub().resolves({ exists: false, data: () => null }),
      set: sinon.stub().resolves(),
    };
    logsCollection = { add: sinon.stub().resolves() };

    firestoreStub = {
      collection: sinon.stub().callsFake((name) => {
        if (name === 'rate_limits') return { doc: () => rateLimitDoc };
        if (name === 'transcription_logs') return logsCollection;
        throw new Error('unexpected collection: ' + name);
      }),
    };
  });

  function loadHandler() {
    delete require.cache[require.resolve('../transcribeAudio.handler.js')];
    return proxyquire('../transcribeAudio.handler.js', {
      'firebase-admin': { firestore: () => firestoreStub },
      './openaiClient.js': { getOpenAI: () => openaiStub },
    }).transcribeAudioHandler;
  }

  it('rejects unauthenticated requests', async () => {
    const handler = loadHandler();
    try {
      await handler({ auth: null, data: {} });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.message).to.match(/auth/i);
    }
  });

  it('rejects when audioBase64 is missing', async () => {
    const handler = loadHandler();
    try {
      await handler({ auth: { uid: 'u1' }, data: { mimeType: 'audio/webm', durationSec: 3 } });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.message).to.match(/audio/i);
    }
  });

  it('returns transcribed text for a valid request', async () => {
    const handler = loadHandler();
    const result = await handler({
      auth: { uid: 'u1' },
      data: {
        audioBase64: Buffer.from('fake').toString('base64'),
        mimeType: 'audio/webm',
        durationSec: 3,
      },
    });
    expect(result).to.deep.equal({ text: 'hello world' });
    expect(openaiStub.audio.transcriptions.create.calledOnce).to.be.true;
    expect(logsCollection.add.calledOnce).to.be.true;
  });

  it('rejects when user has exceeded daily limit', async () => {
    rateLimitDoc.get.resolves({
      exists: true,
      data: () => ({
        windowStartMs: Date.now() - 60_000,
        secondsUsed: 30 * 60,
      }),
    });
    const handler = loadHandler();
    try {
      await handler({
        auth: { uid: 'u1' },
        data: {
          audioBase64: Buffer.from('fake').toString('base64'),
          mimeType: 'audio/webm',
          durationSec: 3,
        },
      });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.code).to.equal('resource-exhausted');
    }
  });
});
