const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

// Lazy-load Anthropic client
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
 * Analyze Behavior Patterns
 *
 * Analyzes recent behavior observations to:
 * - Calculate strategy success rates
 * - Identify patterns
 * - Suggest effectiveness updates
 * - Recommend new strategies or experiments
 */
exports.analyzePatterns = onCall(
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

      const {childId, daysBack = 14} = request.data;

      if (!childId) {
        throw new Error("childId is required");
      }

      logger.info(`Analyzing patterns for child ${childId} (last ${daysBack} days)`);

      try {
        const db = admin.firestore();

        // Get child and manual
        const childDoc = await db.collection("children").doc(childId).get();
        if (!childDoc.exists) {
          throw new Error("Child not found");
        }

        const childData = childDoc.data();
        const manualId = childData.manualId;

        if (!manualId) {
          throw new Error("Child has no manual");
        }

        const manualDoc = await db.collection("child_manuals").doc(manualId).get();
        if (!manualDoc.exists) {
          throw new Error("Manual not found");
        }

        const manual = manualDoc.data();

        // Get recent behavior observations
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);

        const observationsSnapshot = await db.collection("behavior_observations")
            .where("childId", "==", childId)
            .where("familyId", "==", childData.familyId)
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(cutoffDate))
            .orderBy("createdAt", "desc")
            .get();

        const observations = observationsSnapshot.docs.map((doc) => doc.data());

        logger.info(`Found ${observations.length} observations`);

        if (observations.length === 0) {
          return {
            success: true,
            message: "Not enough data to analyze (0 observations)",
            insights: [],
          };
        }

        // Calculate strategy success rates
        const strategyStats = {};

        observations.forEach((obs) => {
          if (obs.strategyUsed && obs.strategyUsed.strategyId) {
            const strategyId = obs.strategyUsed.strategyId;

            if (!strategyStats[strategyId]) {
              strategyStats[strategyId] = {
                text: obs.strategyUsed.strategyText,
                total: 0,
                workedGreat: 0,
                workedOkay: 0,
                didntWork: 0,
                madeWorse: 0,
              };
            }

            strategyStats[strategyId].total++;
            if (obs.outcome === "worked_great") strategyStats[strategyId].workedGreat++;
            else if (obs.outcome === "worked_okay") strategyStats[strategyId].workedOkay++;
            else if (obs.outcome === "didnt_work") strategyStats[strategyId].didntWork++;
            else if (obs.outcome === "made_worse") strategyStats[strategyId].madeWorse++;
          }
        });

        // Build AI prompt
        const prompt = buildPatternAnalysisPrompt(
            childData.name,
            manual,
            observations,
            strategyStats
        );

        logger.info("Calling Claude 3 Haiku for pattern analysis...");

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

        // Parse JSON response
        let analysis;
        try {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                           responseText.match(/```\s*([\s\S]*?)\s*```/);
          const jsonText = jsonMatch ? jsonMatch[1] : responseText;
          analysis = JSON.parse(jsonText);
        } catch (parseError) {
          logger.error("Error parsing AI response:", parseError);
          logger.error("Response text:", responseText.substring(0, 500));
          throw new Error("Failed to parse AI analysis response");
        }

        logger.info(`Analysis complete: ${analysis.insights?.length || 0} insights generated`);

        return {
          success: true,
          analysis: analysis,
          strategyStats: strategyStats,
          observationCount: observations.length,
        };
      } catch (error) {
        logger.error("Error analyzing patterns:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

/**
 * Build prompt for pattern analysis
 */
function buildPatternAnalysisPrompt(childName, manual, observations, strategyStats) {
  // Format observations
  const obsText = observations.slice(0, 20).map((obs, idx) => {
    return `${idx + 1}. Situation: ${obs.situation}
   Description: ${obs.description}
   Strategy: ${obs.strategyUsed?.strategyText || "None"}
   Outcome: ${obs.outcome}
   Date: ${obs.date}`;
  }).join("\n\n");

  // Format strategy stats
  const statsText = Object.entries(strategyStats)
      .map(([strategyId, stats]) => {
        const successRate = Math.round(
            ((stats.workedGreat + stats.workedOkay) / stats.total) * 100
        );
        return `- "${stats.text}": ${stats.total} attempts, ${successRate}% success rate (${stats.workedGreat} great, ${stats.workedOkay} okay, ${stats.didntWork} didn't work, ${stats.madeWorse} made worse)`;
      })
      .join("\n");

  // Format current manual strategies
  const currentStrategies = manual.whatWorks.map((s) => {
    return `- "${s.text}" (current effectiveness rating: ${s.effectiveness}/5)`;
  }).join("\n");

  return `You are analyzing behavior observation data for ${childName} to help parents discover what actually works.

RECENT OBSERVATIONS (last ${observations.length} entries):
${obsText}

STRATEGY SUCCESS RATES (from observations):
${statsText}

CURRENT MANUAL STRATEGIES:
${currentStrategies}

CURRENT TRIGGERS:
${manual.triggers.map((t) => `- "${t.text}" (severity: ${t.severity}/5)`).join("\n")}

Based on this data, generate a JSON response with this EXACT structure:

{
  "insights": [
    {
      "type": "success" | "failure" | "pattern" | "experiment",
      "title": "Short insight title",
      "description": "Detailed description of what you discovered",
      "priority": "high" | "medium" | "low",
      "actionable": true | false
    }
  ],
  "effectivenessUpdates": [
    {
      "strategyId": "ID from manual if applicable",
      "strategyText": "Text of the strategy",
      "currentRating": 1-5,
      "suggestedRating": 1-5,
      "reason": "Why this rating change makes sense based on data"
    }
  ],
  "suggestedStrategies": [
    {
      "text": "New strategy to try",
      "estimatedEffectiveness": 1-5,
      "rationale": "Why this might work based on patterns"
    }
  ],
  "suggestedExperiments": [
    {
      "hypothesis": "We think X will help with Y",
      "testInstructions": "Try this: [specific instructions]",
      "measureSuccess": "Look for: [specific outcomes]",
      "duration": "Test for X days"
    }
  ]
}

CRITICAL GUIDELINES:

1. INSIGHTS
   - "success": Strategies working consistently well (80%+ success rate, 3+ attempts)
   - "failure": Strategies consistently failing (< 40% success rate, 3+ attempts)
   - "pattern": Recurring situations, triggers, or timing patterns
   - "experiment": Suggested A/B tests or new approaches to try

2. EFFECTIVENESS UPDATES
   - ONLY suggest updates where real-world data contradicts current rating
   - If strategy has 90%+ success rate but rated 3/5 → suggest 5/5
   - If strategy has <40% success rate but rated 4-5/5 → suggest 2-3/5
   - Require at least 3 attempts before suggesting changes

3. SUGGESTED STRATEGIES
   - Base on patterns observed (e.g., if "alone time" works in one context, suggest it for others)
   - Look for what ISN'T being tried but might help
   - Consider timing, environment, antecedents

4. SUGGESTED EXPERIMENTS
   - Specific, testable hypotheses
   - Clear instructions parents can follow
   - Measurable outcomes (success vs failure)
   - Realistic duration (3-7 days usually)

5. PRIORITIZATION
   - High: Clear data with strong implications, easy to act on
   - Medium: Promising patterns, worth trying
   - Low: Weak signals, might not be actionable yet

6. BE EVIDENCE-BASED
   - Only report patterns with real data support
   - Don't invent strategies not mentioned in observations
   - Cite specific observations when making claims

Return ONLY the JSON object. No additional text, explanations, or markdown formatting.`;
}

module.exports = {analyzePatterns: exports.analyzePatterns};
