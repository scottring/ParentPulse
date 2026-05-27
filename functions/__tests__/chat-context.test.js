// functions/__tests__/chat-context.test.js
const { expect } = require('chai');
const {
  buildEntryFirstMessage,
  buildThreadMessages,
  buildChatSystemMessage,
} = require('../chat-context.js');

describe('buildEntryFirstMessage', () => {
  it('says "I just wrote" when the speaker is the entry author', () => {
    const out = buildEntryFirstMessage({
      entryText: 'Kaleb took a bottle and lied about it.',
      entryAuthorName: 'Scott',
      isSpeakerAuthor: true,
      message: 'What should I make of this?',
    });
    expect(out).to.contain('I just wrote');
    expect(out).to.contain('Kaleb took a bottle and lied about it.');
    expect(out).to.contain('What should I make of this?');
  });

  it('attributes the entry to its real author when the speaker is NOT the author', () => {
    const out = buildEntryFirstMessage({
      entryText: 'Kaleb took a bottle and lied about it.',
      entryAuthorName: 'Scott',
      isSpeakerAuthor: false,
      message: 'Here are my thoughts.',
    });
    // Must NOT claim the current speaker wrote it.
    expect(out).to.not.contain('I just wrote');
    // Must name the actual author.
    expect(out).to.contain('Scott');
    expect(out).to.contain('Kaleb took a bottle and lied about it.');
    expect(out).to.contain('Here are my thoughts.');
  });
});

describe('buildThreadMessages', () => {
  const authorNamesById = { 'scott-uid': 'Scott', 'iris-uid': 'Iris' };

  it('does not prefix author names when only one human has spoken', () => {
    const msgs = buildThreadMessages({
      priorTurns: [
        { role: 'user', content: 'First thought', authorId: 'scott-uid' },
        { role: 'assistant', content: 'A reflection' },
      ],
      newMessage: 'Second thought',
      speakerId: 'scott-uid',
      speakerName: 'Scott',
      authorNamesById,
    });
    expect(msgs).to.deep.equal([
      { role: 'user', content: 'First thought' },
      { role: 'assistant', content: 'A reflection' },
      { role: 'user', content: 'Second thought' },
    ]);
  });

  it('prefixes each user turn with its author when two people are in the thread', () => {
    const msgs = buildThreadMessages({
      priorTurns: [
        { role: 'user', content: 'Scott opening', authorId: 'scott-uid' },
        { role: 'assistant', content: 'A reflection' },
      ],
      newMessage: 'Iris replying',
      speakerId: 'iris-uid',
      speakerName: 'Iris',
      authorNamesById,
    });
    expect(msgs).to.deep.equal([
      { role: 'user', content: 'Scott: Scott opening' },
      { role: 'assistant', content: 'A reflection' },
      { role: 'user', content: 'Iris: Iris replying' },
    ]);
  });
});

describe('buildChatSystemMessage', () => {
  const baseContext = {
    familyRoster: [
      { name: 'Scott', relationshipType: 'self', birthYear: null },
      { name: 'Iris', relationshipType: 'spouse', birthYear: null },
      { name: 'Kaleb', relationshipType: 'child', birthYear: 2016 },
    ],
    journalEntries: [],
    knowledgeItems: [],
    actions: [],
    personManuals: [],
    pastConversations: [],
    workbooks: [],
  };

  it('names the current speaker so the AI knows who "I" refers to', () => {
    const sys = buildChatSystemMessage(baseContext, {
      userId: 'iris-uid',
      name: 'Iris',
      relationshipType: 'spouse',
    });
    expect(sys).to.contain('Iris');
    // The speaker must be identified as the current interlocutor.
    expect(sys.toLowerCase()).to.contain('talking with');
  });

  it('attributes each journal entry to its author and marks the speaker\'s own', () => {
    const sys = buildChatSystemMessage(
      {
        ...baseContext,
        journalEntries: [
          {
            text: 'Scott entry about Kaleb',
            category: 'challenge',
            date: '5/25/2026',
            tags: [],
            authorId: 'scott-uid',
            authorName: 'Scott',
          },
          {
            text: 'Iris entry about Kaleb',
            category: 'challenge',
            date: '5/25/2026',
            tags: [],
            authorId: 'iris-uid',
            authorName: 'Iris',
          },
        ],
      },
      { userId: 'iris-uid', name: 'Iris', relationshipType: 'spouse' },
    );
    // Both authors named in the rendered entries.
    expect(sys).to.contain('Scott entry about Kaleb');
    expect(sys).to.contain('Iris entry about Kaleb');
    // The author label must accompany the entries (not anonymous blobs).
    const scottIdx = sys.indexOf('Scott entry about Kaleb');
    const scottLabel = sys.lastIndexOf('Scott', scottIdx);
    expect(scottLabel).to.be.greaterThan(-1);
  });

  it('surfaces related entries when present', () => {
    const sys = buildChatSystemMessage(
      {
        ...baseContext,
        relatedEntries: [
          {
            text: 'Older entry also about Kaleb',
            category: 'reflection',
            date: '5/20/2026',
            authorName: 'Scott',
          },
        ],
      },
      { userId: 'iris-uid', name: 'Iris', relationshipType: 'spouse' },
    );
    expect(sys.toLowerCase()).to.contain('related');
    expect(sys).to.contain('Older entry also about Kaleb');
  });
});
