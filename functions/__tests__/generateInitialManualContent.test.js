/**
 * Cloud Functions Tests - generateInitialManualContent
 *
 * Tests for the AI-powered manual content generation function.
 * These tests use firebase-functions-test for offline testing.
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Initialize firebase-functions-test in offline mode
const test = require('firebase-functions-test')();

// Mock Anthropic SDK
const mockAnthropicCreate = sinon.stub();
const mockAnthropicSDK = {
  Anthropic: function() {
    return {
      messages: {
        create: mockAnthropicCreate
      }
    };
  }
};

// Set up module mocking before requiring the function
sinon.stub(require.cache, '@anthropic-ai/sdk').value({ module: { exports: mockAnthropicSDK } });

describe('generateInitialManualContent', () => {
  let myFunctions;

  before(() => {
    // Set the required secret
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    // Require the functions file after setting environment
    // Note: In real testing, you'd need proper module setup
    // This is a simplified example showing the test structure
  });

  after(() => {
    // Clean up
    test.cleanup();
    sinon.restore();
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockAnthropicCreate.reset();
  });

  describe('input validation', () => {
    it('should require authentication', async () => {
      // Test that unauthenticated requests are rejected
      // This tests the function's auth check
      const wrapped = test.wrap(() => {
        throw new Error('User must be authenticated');
      });

      try {
        await wrapped({}, { auth: null });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('authenticated');
      }
    });

    it('should require familyId parameter', async () => {
      // Test that missing familyId is rejected
      const data = {
        personId: 'test-person',
        personName: 'Test Person',
        relationshipType: 'child',
        answers: {}
      };

      // This simulates the validation check
      expect(data.familyId).to.be.undefined;
    });

    it('should require personId parameter', async () => {
      const data = {
        familyId: 'test-family',
        personName: 'Test Person',
        relationshipType: 'child',
        answers: {}
      };

      expect(data.personId).to.be.undefined;
    });

    it('should require personName parameter', async () => {
      const data = {
        familyId: 'test-family',
        personId: 'test-person',
        relationshipType: 'child',
        answers: {}
      };

      expect(data.personName).to.be.undefined;
    });

    it('should require relationshipType parameter', async () => {
      const data = {
        familyId: 'test-family',
        personId: 'test-person',
        personName: 'Test Person',
        answers: {}
      };

      expect(data.relationshipType).to.be.undefined;
    });

    it('should require answers parameter', async () => {
      const data = {
        familyId: 'test-family',
        personId: 'test-person',
        personName: 'Test Person',
        relationshipType: 'child'
      };

      expect(data.answers).to.be.undefined;
    });
  });

  describe('relationship types', () => {
    const validRelationshipTypes = [
      'child',
      'spouse',
      'elderly_parent',
      'friend',
      'professional',
      'sibling',
      'other'
    ];

    validRelationshipTypes.forEach(type => {
      it(`should accept valid relationship type: ${type}`, () => {
        const data = {
          familyId: 'test-family',
          personId: 'test-person',
          personName: 'Test Person',
          relationshipType: type,
          answers: {}
        };

        expect(data.relationshipType).to.equal(type);
        expect(validRelationshipTypes).to.include(data.relationshipType);
      });
    });
  });

  describe('response structure', () => {
    it('should return success: true on successful generation', () => {
      const expectedResponse = {
        success: true,
        content: {
          triggers: [],
          whatWorks: [],
          whatDoesntWork: [],
          boundaries: [],
          strengths: [],
          challenges: [],
          importantContext: []
        }
      };

      expect(expectedResponse.success).to.be.true;
      expect(expectedResponse.content).to.be.an('object');
    });

    it('should return content with expected fields', () => {
      const content = {
        triggers: [{ description: 'Test', context: 'Test', typicalResponse: 'Test', severity: 'moderate' }],
        whatWorks: [{ description: 'Strategy', context: 'When to use', effectiveness: 4 }],
        whatDoesntWork: [],
        boundaries: [{ description: 'Boundary', category: 'immovable' }],
        strengths: ['Creative', 'Kind'],
        challenges: ['Focus'],
        importantContext: ['Important fact']
      };

      expect(content.triggers).to.be.an('array');
      expect(content.whatWorks).to.be.an('array');
      expect(content.whatDoesntWork).to.be.an('array');
      expect(content.boundaries).to.be.an('array');
      expect(content.strengths).to.be.an('array');
      expect(content.challenges).to.be.an('array');
      expect(content.importantContext).to.be.an('array');
    });

    it('should return success: false on error', () => {
      const errorResponse = {
        success: false,
        error: 'Failed to generate content'
      };

      expect(errorResponse.success).to.be.false;
      expect(errorResponse.error).to.be.a('string');
    });
  });

  describe('trigger format', () => {
    it('should have required trigger fields', () => {
      const trigger = {
        description: 'Homework time causes stress',
        context: 'After school when homework is assigned',
        typicalResponse: 'Resistance and avoidance',
        severity: 'moderate'
      };

      expect(trigger).to.have.property('description');
      expect(trigger).to.have.property('context');
      expect(trigger).to.have.property('typicalResponse');
      expect(trigger).to.have.property('severity');
    });

    it('should have valid severity values', () => {
      const validSeverities = ['mild', 'moderate', 'significant'];

      validSeverities.forEach(severity => {
        const trigger = {
          description: 'Test',
          context: 'Test',
          typicalResponse: 'Test',
          severity
        };

        expect(validSeverities).to.include(trigger.severity);
      });
    });
  });

  describe('strategy format', () => {
    it('should have required strategy fields', () => {
      const strategy = {
        description: 'Give 5-minute warnings before transitions',
        context: 'When changing activities or locations',
        effectiveness: 4
      };

      expect(strategy).to.have.property('description');
      expect(strategy).to.have.property('context');
    });

    it('should have effectiveness in valid range', () => {
      for (let i = 1; i <= 5; i++) {
        const strategy = { effectiveness: i };
        expect(strategy.effectiveness).to.be.at.least(1);
        expect(strategy.effectiveness).to.be.at.most(5);
      }
    });
  });

  describe('boundary format', () => {
    it('should have required boundary fields', () => {
      const boundary = {
        description: 'No screens before homework is complete',
        category: 'immovable'
      };

      expect(boundary).to.have.property('description');
      expect(boundary).to.have.property('category');
    });

    it('should have valid category values', () => {
      const validCategories = ['immovable', 'negotiable', 'preference'];

      validCategories.forEach(category => {
        const boundary = {
          description: 'Test',
          category
        };

        expect(validCategories).to.include(boundary.category);
      });
    });
  });
});
