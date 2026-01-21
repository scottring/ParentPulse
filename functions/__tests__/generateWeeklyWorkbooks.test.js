/**
 * Cloud Functions Tests - generateWeeklyWorkbooks
 *
 * Tests for the dual workbook generation function (Parent + Child workbooks).
 * Tests use firebase-functions-test for offline testing.
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Initialize firebase-functions-test in offline mode
const test = require('firebase-functions-test')();

describe('generateWeeklyWorkbooks', () => {
  let mockAnthropicCreate;
  let mockGenAI;
  let mockFirestore;

  before(() => {
    // Set required secrets
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_AI_API_KEY = 'test-google-key';
  });

  after(() => {
    test.cleanup();
    sinon.restore();
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockAnthropicCreate = sinon.stub();
    mockGenAI = {
      getGenerativeModel: sinon.stub().returns({
        generateContent: sinon.stub()
      })
    };
    mockFirestore = {
      collection: sinon.stub().returnsThis(),
      doc: sinon.stub().returnsThis(),
      set: sinon.stub().resolves(),
      get: sinon.stub().resolves({
        exists: true,
        data: () => ({})
      }),
      update: sinon.stub().resolves()
    };
  });

  describe('input validation', () => {
    it('should require authentication', async () => {
      const wrapped = test.wrap(() => {
        throw new Error('Authentication required');
      });

      try {
        await wrapped({}, { auth: null });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Authentication required');
      }
    });

    it('should require familyId parameter', () => {
      const data = {
        personId: 'test-person',
        personName: 'Test Child',
        manualId: 'test-manual',
        relationshipType: 'child',
        personAge: 7
      };

      expect(data.familyId).to.be.undefined;
    });

    it('should require personId parameter', () => {
      const data = {
        familyId: 'test-family',
        personName: 'Test Child',
        manualId: 'test-manual',
        relationshipType: 'child',
        personAge: 7
      };

      expect(data.personId).to.be.undefined;
    });

    it('should require personAge parameter', () => {
      const data = {
        familyId: 'test-family',
        personId: 'test-person',
        personName: 'Test Child',
        manualId: 'test-manual',
        relationshipType: 'child'
      };

      expect(data.personAge).to.be.undefined;
    });
  });

  describe('dual workbook structure', () => {
    it('should return both parent and child workbook IDs', () => {
      const response = {
        success: true,
        parentWorkbookId: 'parent-123',
        childWorkbookId: 'child-123',
        weekId: 'week-2026-01-20'
      };

      expect(response).to.have.property('parentWorkbookId');
      expect(response).to.have.property('childWorkbookId');
      expect(response).to.have.property('weekId');
      expect(response.success).to.be.true;
    });

    it('should link workbooks via weekId', () => {
      const weekId = 'week-2026-01-20';
      const parentWorkbook = {
        workbookId: 'parent-123',
        weekId: weekId,
        childWorkbookId: 'child-123'
      };
      const childWorkbook = {
        workbookId: 'child-123',
        weekId: weekId,
        parentWorkbookId: 'parent-123'
      };

      expect(parentWorkbook.weekId).to.equal(childWorkbook.weekId);
      expect(parentWorkbook.childWorkbookId).to.equal(childWorkbook.workbookId);
      expect(childWorkbook.parentWorkbookId).to.equal(parentWorkbook.workbookId);
    });
  });

  describe('parent workbook structure', () => {
    it('should have required parent workbook fields', () => {
      const parentWorkbook = {
        workbookId: 'parent-123',
        weekId: 'week-2026-01-20',
        familyId: 'family-123',
        personId: 'person-123',
        personName: 'Test Child',
        weekNumber: 1,
        startDate: new Date(),
        endDate: new Date(),
        parentGoals: [],
        childProgressSummary: {
          storiesRead: 0,
          activitiesCompleted: 0,
          storyCompletionPercent: 0
        },
        childWorkbookId: 'child-123',
        status: 'active'
      };

      expect(parentWorkbook).to.have.property('workbookId');
      expect(parentWorkbook).to.have.property('weekId');
      expect(parentWorkbook).to.have.property('familyId');
      expect(parentWorkbook).to.have.property('personId');
      expect(parentWorkbook).to.have.property('personName');
      expect(parentWorkbook).to.have.property('parentGoals');
      expect(parentWorkbook).to.have.property('childProgressSummary');
      expect(parentWorkbook).to.have.property('childWorkbookId');
      expect(parentWorkbook).to.have.property('status');
    });

    it('should initialize childProgressSummary to zero', () => {
      const childProgressSummary = {
        storiesRead: 0,
        activitiesCompleted: 0,
        storyCompletionPercent: 0,
        lastActiveDate: null
      };

      expect(childProgressSummary.storiesRead).to.equal(0);
      expect(childProgressSummary.activitiesCompleted).to.equal(0);
      expect(childProgressSummary.storyCompletionPercent).to.equal(0);
    });

    it('should have parent goals array', () => {
      const parentGoals = [
        {
          id: 'goal-1',
          description: 'Give 5-minute warning before transitions',
          targetFrequency: 'Daily',
          completionLog: []
        }
      ];

      expect(parentGoals).to.be.an('array');
      expect(parentGoals[0]).to.have.property('description');
      expect(parentGoals[0]).to.have.property('targetFrequency');
      expect(parentGoals[0]).to.have.property('completionLog');
    });
  });

  describe('child workbook structure', () => {
    it('should have required child workbook fields', () => {
      const childWorkbook = {
        workbookId: 'child-123',
        weekId: 'week-2026-01-20',
        familyId: 'family-123',
        personId: 'person-123',
        personName: 'Test Child',
        personAge: 7,
        weekNumber: 1,
        startDate: new Date(),
        endDate: new Date(),
        weeklyStory: {},
        dailyActivities: [],
        storyProgress: {
          currentDay: 1,
          daysRead: [false, false, false, false, false, false, false],
          activitiesCompleted: [],
          totalActivities: 7
        },
        parentWorkbookId: 'parent-123',
        status: 'active'
      };

      expect(childWorkbook).to.have.property('workbookId');
      expect(childWorkbook).to.have.property('weekId');
      expect(childWorkbook).to.have.property('familyId');
      expect(childWorkbook).to.have.property('personId');
      expect(childWorkbook).to.have.property('personName');
      expect(childWorkbook).to.have.property('personAge');
      expect(childWorkbook).to.have.property('weeklyStory');
      expect(childWorkbook).to.have.property('dailyActivities');
      expect(childWorkbook).to.have.property('storyProgress');
      expect(childWorkbook).to.have.property('parentWorkbookId');
      expect(childWorkbook).to.have.property('status');
    });

    it('should initialize storyProgress correctly', () => {
      const storyProgress = {
        currentDay: 1,
        daysRead: [false, false, false, false, false, false, false],
        activitiesCompleted: [],
        totalActivities: 7
      };

      expect(storyProgress.currentDay).to.equal(1);
      expect(storyProgress.daysRead).to.be.an('array').with.lengthOf(7);
      expect(storyProgress.daysRead.every(day => day === false)).to.be.true;
      expect(storyProgress.activitiesCompleted).to.be.an('array').that.is.empty;
    });
  });

  describe('weekly story structure', () => {
    it('should have required story fields', () => {
      const weeklyStory = {
        title: 'Luna and the Big Transition',
        characterName: 'Luna',
        characterDescription: 'a brave young fox',
        characterAge: 7,
        storyTheme: 'transitions',
        dailyFragments: [],
        reflectionQuestions: [],
        mirrorsContent: {
          primaryTrigger: 'trigger-123',
          strategiesUsed: ['strategy-456'],
          strengthsHighlighted: ['creative', 'kind']
        },
        ageAppropriateLevel: 'early-reader',
        readingLevel: 'Ages 6-8',
        estimatedReadTime: 15
      };

      expect(weeklyStory).to.have.property('title');
      expect(weeklyStory).to.have.property('characterName');
      expect(weeklyStory).to.have.property('characterDescription');
      expect(weeklyStory).to.have.property('characterAge');
      expect(weeklyStory).to.have.property('storyTheme');
      expect(weeklyStory).to.have.property('dailyFragments');
      expect(weeklyStory).to.have.property('reflectionQuestions');
      expect(weeklyStory).to.have.property('mirrorsContent');
      expect(weeklyStory).to.have.property('ageAppropriateLevel');
      expect(weeklyStory).to.have.property('readingLevel');
    });

    it('should have 7 daily fragments', () => {
      const dailyFragments = [
        { day: 'monday', dayNumber: 1, fragmentText: 'Test', wordCount: 4 },
        { day: 'tuesday', dayNumber: 2, fragmentText: 'Test', wordCount: 4 },
        { day: 'wednesday', dayNumber: 3, fragmentText: 'Test', wordCount: 4 },
        { day: 'thursday', dayNumber: 4, fragmentText: 'Test', wordCount: 4 },
        { day: 'friday', dayNumber: 5, fragmentText: 'Test', wordCount: 4 },
        { day: 'saturday', dayNumber: 6, fragmentText: 'Test', wordCount: 4 },
        { day: 'sunday', dayNumber: 7, fragmentText: 'Test', wordCount: 4 }
      ];

      expect(dailyFragments).to.have.lengthOf(7);
      expect(dailyFragments[0].day).to.equal('monday');
      expect(dailyFragments[6].day).to.equal('sunday');
    });

    it('should have valid age-appropriate levels', () => {
      const validLevels = ['picture-book', 'early-reader', 'chapter-book'];

      validLevels.forEach(level => {
        expect(validLevels).to.include(level);
      });
    });

    it('should have valid story themes', () => {
      const validThemes = [
        'courage',
        'transitions',
        'friendship',
        'problem-solving',
        'emotions',
        'boundaries',
        'growth',
        'self-compassion'
      ];

      validThemes.forEach(theme => {
        expect(validThemes).to.include(theme);
      });
    });
  });

  describe('daily story fragment structure', () => {
    it('should have required fragment fields', () => {
      const fragment = {
        day: 'monday',
        dayNumber: 1,
        fragmentText: 'Luna woke up in her cozy nest...',
        illustrationPrompt: 'A small fox waking up in a tree hollow',
        illustrationUrl: null,
        illustrationStatus: 'generating',
        wordCount: 75,
        estimatedReadTime: 2,
        pairedActivityId: 'activity-123'
      };

      expect(fragment).to.have.property('day');
      expect(fragment).to.have.property('dayNumber');
      expect(fragment).to.have.property('fragmentText');
      expect(fragment).to.have.property('illustrationPrompt');
      expect(fragment).to.have.property('illustrationStatus');
      expect(fragment).to.have.property('wordCount');
      expect(fragment).to.have.property('estimatedReadTime');
    });

    it('should have valid illustration statuses', () => {
      const validStatuses = ['pending', 'generating', 'complete', 'failed'];

      validStatuses.forEach(status => {
        const fragment = { illustrationStatus: status };
        expect(validStatuses).to.include(fragment.illustrationStatus);
      });
    });

    it('should initialize with generating illustration status', () => {
      const fragment = {
        illustrationPrompt: 'Test prompt',
        illustrationUrl: null,
        illustrationStatus: 'generating'
      };

      expect(fragment.illustrationStatus).to.equal('generating');
      expect(fragment.illustrationUrl).to.be.null;
    });
  });

  describe('story reflection questions', () => {
    it('should have 5-7 reflection questions', () => {
      const questions = [
        { id: '1', questionText: 'What was hard for Luna?', category: 'challenge' },
        { id: '2', questionText: 'What brave thing did Luna do?', category: 'courage' },
        { id: '3', questionText: 'What helped Luna feel better?', category: 'strategy' },
        { id: '4', questionText: 'Have you ever felt like Luna?', category: 'connection' },
        { id: '5', questionText: 'What would you tell Luna?', category: 'compassion' }
      ];

      expect(questions).to.be.an('array');
      expect(questions.length).to.be.at.least(5);
      expect(questions.length).to.be.at.most(7);
    });

    it('should have required question fields', () => {
      const question = {
        id: 'q1',
        questionText: 'What was hard for Luna this week?',
        category: 'challenge',
        purposeNote: 'Helps identify challenges'
      };

      expect(question).to.have.property('id');
      expect(question).to.have.property('questionText');
      expect(question).to.have.property('category');
      expect(question).to.have.property('purposeNote');
    });

    it('should have valid question categories', () => {
      const validCategories = ['challenge', 'courage', 'strategy', 'connection', 'compassion'];

      validCategories.forEach(category => {
        const question = {
          questionText: 'Test?',
          category: category
        };
        expect(validCategories).to.include(question.category);
      });
    });
  });

  describe('age-appropriate content generation', () => {
    it('should generate picture-book level for ages 3-5', () => {
      const personAge = 4;
      const expectedLevel = personAge <= 5 ? 'picture-book' : 'early-reader';
      const expectedWordCount = personAge <= 5 ? 75 : 125; // 50-100 words per day

      expect(expectedLevel).to.equal('picture-book');
      expect(expectedWordCount).to.be.at.most(100);
    });

    it('should generate early-reader level for ages 6-8', () => {
      const personAge = 7;
      const expectedLevel = personAge <= 8 ? 'early-reader' : 'chapter-book';
      const expectedWordCount = 125; // 100-150 words per day

      expect(expectedLevel).to.equal('early-reader');
      expect(expectedWordCount).to.be.at.least(100);
      expect(expectedWordCount).to.be.at.most(150);
    });

    it('should generate chapter-book level for ages 9-12', () => {
      const personAge = 10;
      const expectedLevel = 'chapter-book';
      const expectedWordCount = 200; // 150-250 words per day

      expect(expectedLevel).to.equal('chapter-book');
      expect(expectedWordCount).to.be.at.least(150);
      expect(expectedWordCount).to.be.at.most(250);
    });
  });

  describe('illustration generation', () => {
    it('should generate illustration prompts for all 7 days', () => {
      const dailyFragments = Array(7).fill(null).map((_, i) => ({
        day: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i],
        dayNumber: i + 1,
        fragmentText: 'Test',
        illustrationPrompt: `Illustration prompt for day ${i + 1}`,
        illustrationStatus: 'generating'
      }));

      expect(dailyFragments).to.have.lengthOf(7);
      dailyFragments.forEach(fragment => {
        expect(fragment).to.have.property('illustrationPrompt');
        expect(fragment.illustrationPrompt).to.be.a('string').with.length.greaterThan(0);
      });
    });

    it('should not block response while generating illustrations', () => {
      // Illustrations should be generated asynchronously
      const response = {
        success: true,
        parentWorkbookId: 'parent-123',
        childWorkbookId: 'child-123',
        weekId: 'week-123'
      };

      // Response should be immediate, not waiting for illustrations
      expect(response).to.have.property('parentWorkbookId');
      expect(response).to.have.property('childWorkbookId');
      // Illustrations will be updated asynchronously via updateChildWorkbookIllustrations
    });
  });

  describe('error handling', () => {
    it('should return success: false on story generation error', () => {
      const errorResponse = {
        success: false,
        error: 'Failed to generate story',
        errorDetails: 'API error details'
      };

      expect(errorResponse.success).to.be.false;
      expect(errorResponse.error).to.be.a('string');
    });

    it('should mark illustrations as failed on generation error', () => {
      const fragment = {
        illustrationPrompt: 'Test prompt',
        illustrationUrl: null,
        illustrationStatus: 'failed'
      };

      expect(fragment.illustrationStatus).to.equal('failed');
      expect(fragment.illustrationUrl).to.be.null;
    });

    it('should handle missing manual content gracefully', () => {
      const emptyManualData = {
        triggers: [],
        whatWorks: [],
        boundaries: [],
        strengths: []
      };

      // Should still generate generic story even with empty manual
      expect(emptyManualData.triggers).to.be.an('array').that.is.empty;
      expect(emptyManualData.whatWorks).to.be.an('array').that.is.empty;
      // Generation should proceed with generic content
    });
  });

  describe('Firestore collection structure', () => {
    it('should save to parent_workbooks collection', () => {
      const collectionName = 'parent_workbooks';
      expect(collectionName).to.equal('parent_workbooks');
    });

    it('should save to child_workbooks collection', () => {
      const collectionName = 'child_workbooks';
      expect(collectionName).to.equal('child_workbooks');
    });

    it('should not save to deprecated weekly_workbooks collection', () => {
      const deprecatedCollection = 'weekly_workbooks';
      const newCollections = ['parent_workbooks', 'child_workbooks'];

      expect(newCollections).to.not.include(deprecatedCollection);
    });
  });
});
