const {onCall} = require("firebase-functions/v2/https");
const Anthropic = require("@anthropic-ai/sdk");

// Initialize Anthropic client lazily
let anthropic;
function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

/**
 * Format answer value for the prompt
 */
function formatAnswerValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

/**
 * Build prompt for child manual generation
 */
function buildChildManualPrompt(childName, childAge, answers) {
  // Format answers by question ID
  const formattedAnswers = Object.entries(answers)
      .map(([questionId, value]) => {
        const formatted = formatAnswerValue(value);
        if (!formatted || formatted.length === 0) return null;
        return `${questionId}: ${formatted}`;
      })
      .filter((line) => line !== null)
      .join("\n");

  return `You are helping create an operating manual for a child to help parents understand and support them better.

Child: ${childName}
Age: ${childAge || "Not specified"}

Based on the following parent responses about ${childName}, generate a comprehensive child manual with specific, actionable strategies.

PARENT RESPONSES:
${formattedAnswers}

Generate a JSON response with this EXACT structure:

{
  "triggers": [
    {
      "text": "Clear, specific description of the trigger",
      "severity": 1-5 (1=mild, 5=severe),
      "examples": ["specific example 1", "specific example 2"]
    }
  ],
  "whatWorks": [
    {
      "text": "Clear, actionable strategy description",
      "effectiveness": 3-5 (3=moderately effective, 5=very effective),
      "context": "When/how to use this strategy"
    }
  ],
  "whatDoesntWork": [
    {
      "text": "Clear description of what doesn't work or makes things worse"
    }
  ],
  "strengths": [
    {
      "text": "Specific strength or positive attribute"
    }
  ],
  "contextNotes": "A comprehensive paragraph (3-5 sentences) summarizing important context about ${childName}, including any diagnoses, medical conditions, sensory sensitivities, ADHD patterns, routines that work well, and other critical information parents should always keep in mind."
}

CRITICAL GUIDELINES:

1. SPECIFICITY IS KEY
   - Don't say "transitions are hard" - say "leaving the house for school is hard, especially when rushed"
   - Don't say "needs warnings" - say "10-minute warning before transitions helps them mentally prepare"
   - Use ${childName}'s name naturally where appropriate

2. ADHD-SPECIFIC PATTERNS
   - If parent mentioned ADHD symptoms, create triggers and strategies specifically for:
     * Attention/focus difficulties (what helps them concentrate)
     * Impulsivity (how to prevent impulsive actions)
     * Hyperactivity (movement needs, fidget strategies)
     * Waiting/patience (how to handle delays)
     * Task completion (breaking down multi-step tasks)
     * Organization (systems to remember things)

3. EMOTIONAL REGULATION
   - Identify specific triggers with concrete examples
   - Note how quickly they escalate (gradual vs instant)
   - Specify what helps them calm down (alone time, hugs, fidgets, etc.)
   - Include what makes meltdowns worse (reasoning mid-meltdown, following them, etc.)

4. ROUTINES & TRANSITIONS
   - Be specific about which transitions are hard (morning? bedtime? homework?)
   - Include timing strategies (10-min warnings, timers, countdowns)
   - Note what makes routines smoother (choices, songs, making it a race)

5. QUANTITY GUIDELINES
   - Generate 5-12 triggers (focus on most important/frequent ones)
   - Generate 5-15 whatWorks strategies (actionable, specific, proven to help)
   - Generate 3-8 whatDoesntWork items (critical to avoid)
   - Generate 3-8 strengths (positive attributes, skills, interests)
   - contextNotes should be 3-5 sentences, comprehensive but concise

6. EFFECTIVENESS RATINGS
   - Only include strategies rated 3+ (don't include things that "sort of work")
   - Rate 5 = consistently works well
   - Rate 4 = works most of the time
   - Rate 3 = works sometimes, worth trying

7. SEVERITY RATINGS FOR TRIGGERS
   - 5 = Severe (immediate meltdown, dangerous, extremely difficult to recover from)
   - 4 = Significant (major meltdown, takes long time to calm down)
   - 3 = Moderate (upset but manageable, calms down in 15-30 min)
   - 2 = Mild (frustration, whining, redirectable)
   - 1 = Minor (slight irritation, easily redirected)

8. TONE
   - Supportive and empathetic (this is about understanding the child)
   - Respectful (avoid pathologizing language)
   - Practical (parents need actionable guidance)
   - Strengths-based (highlight positives, not just challenges)

9. CONTEXT NOTES
   - Synthesize key information: diagnoses, medications, therapy
   - Include sensory sensitivities and physical needs
   - Mention successful routines or environmental factors
   - Note any critical safety or health considerations
   - Keep it to 3-5 sentences maximum

10. BASE EVERYTHING ON PARENT RESPONSES
    - Don't invent information not provided
    - If a question wasn't answered, don't make assumptions
    - Use the parent's language and specific examples where possible
    - If parent mentioned uncertainty ("we think he has ADHD"), include that nuance

Return ONLY the JSON object. No additional text, explanations, or markdown formatting.`;
}

/**
 * Generate Child Manual Content from Onboarding Questionnaire
 * Cloud Function callable from the app
 */
exports.generateChildManualContent = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
      memory: "512MiB",
      timeoutSeconds: 120,
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {childId, childName, childAge, answers} = request.data;

      // Validate input
      if (!childId || !childName || !answers) {
        throw new Error("Missing required parameters: childId, childName, and answers are required");
      }

      logger.info(`Generating child manual for ${childName} (age ${childAge || "unknown"})`);

      try {
        // Build prompt from parent's answers
        const prompt = buildChildManualPrompt(childName, childAge, answers);

        logger.info("Calling Claude 3 Haiku for manual generation...");

        // Call Claude 3 Haiku for fast, cost-effective generation
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 4096,
          temperature: 0.7,
          messages: [{
            role: "user",
            content: prompt,
          }],
        });

        const responseText = response.content[0].text;
        logger.info("Claude response received, parsing JSON");

        // Parse the JSON response
        let content;
        try {
          // Extract JSON from markdown code blocks if present
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                           responseText.match(/```\s*([\s\S]*?)\s*```/);
          const jsonText = jsonMatch ? jsonMatch[1] : responseText;

          content = JSON.parse(jsonText);
          logger.info(`Successfully parsed generated content: ${content.triggers?.length || 0} triggers, ${content.whatWorks?.length || 0} strategies`);
        } catch (parseError) {
          logger.error("Error parsing Claude response:", parseError);
          logger.error("Response text:", responseText.substring(0, 500));
          throw new Error("Failed to parse AI response as JSON. The AI may have returned malformed data.");
        }

        // Validate structure
        if (!content.triggers || !content.whatWorks || !content.strengths) {
          logger.error("Generated content missing required fields");
          throw new Error("AI generated incomplete manual content");
        }

        // Return generated content
        return {
          success: true,
          content: content,
        };
      } catch (error) {
        logger.error("Error generating child manual content:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

module.exports = {generateChildManualContent: exports.generateChildManualContent};
