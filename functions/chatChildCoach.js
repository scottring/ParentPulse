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
 * Child Manual AI Coach
 *
 * Real-time AI coaching for parenting challenges with:
 * - Context from child's manual
 * - Recent behavior observations
 * - Pattern insights
 * - Experiment suggestions
 */
exports.chatChildCoach = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
      memory: "512MiB",
      timeoutSeconds: 60,
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {childId, message, sessionId, recentMessages = []} = request.data;

      if (!childId || !message) {
        throw new Error("childId and message are required");
      }

      logger.info(`Chat request for child ${childId}`);

      try {
        const db = admin.firestore();

        // Get child data
        const childDoc = await db.collection("children").doc(childId).get();
        if (!childDoc.exists) {
          throw new Error("Child not found");
        }

        const childData = childDoc.data();
        const manualId = childData.manualId;

        if (!manualId) {
          return {
            success: true,
            response: `It looks like you haven't created a manual for ${childData.name} yet. Would you like to start the onboarding process to create one?`,
            suggestions: ["Create manual", "Tell me more about manuals"],
          };
        }

        // Get manual
        const manualDoc = await db.collection("child_manuals").doc(manualId).get();
        const manual = manualDoc.data();

        // Get recent behavior observations (last 10)
        const observationsSnapshot = await db.collection("behavior_observations")
            .where("childId", "==", childId)
            .where("familyId", "==", childData.familyId)
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

        const observations = observationsSnapshot.docs.map((doc) => doc.data());

        // Build context prompt
        const contextPrompt = buildCoachingContextPrompt(
            childData.name,
            manual,
            observations,
            recentMessages
        );

        // Build messages array for Claude
        const messages = [];

        // Add context as system message (Claude uses system parameter)
        // Add conversation history
        recentMessages.forEach((msg) => {
          messages.push({
            role: msg.role === "parent" ? "user" : "assistant",
            content: msg.content,
          });
        });

        // Add current message
        messages.push({
          role: "user",
          content: message,
        });

        logger.info("Calling Claude 3 Haiku for coaching response...");

        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 2048,
          temperature: 0.7,
          system: contextPrompt, // System context
          messages: messages,
        });

        const aiResponse = response.content[0].text;

        logger.info("Coaching response generated");

        // Extract strategy references (if any)
        const strategiesReferenced = [];
        manual.whatWorks.forEach((strategy) => {
          if (aiResponse.toLowerCase().includes(strategy.text.toLowerCase().substring(0, 20))) {
            strategiesReferenced.push(strategy.id);
          }
        });

        // Save conversation if sessionId provided
        if (sessionId) {
          const sessionRef = db.collection("coaching_sessions").doc(sessionId);
          const sessionDoc = await sessionRef.get();

          const newMessage = {
            role: "parent",
            content: message,
            timestamp: admin.firestore.Timestamp.now(),
          };

          const aiMessage = {
            role: "ai",
            content: aiResponse,
            timestamp: admin.firestore.Timestamp.now(),
            strategiesReferenced: strategiesReferenced,
          };

          if (sessionDoc.exists) {
            // Append to existing session
            await sessionRef.update({
              messages: admin.firestore.FieldValue.arrayUnion(newMessage, aiMessage),
              endedAt: admin.firestore.Timestamp.now(),
            });
          } else {
            // Create new session
            await sessionRef.set({
              sessionId: sessionId,
              childId: childId,
              familyId: childData.familyId,
              userId: request.auth.uid,
              messages: [newMessage, aiMessage],
              startedAt: admin.firestore.Timestamp.now(),
              endedAt: admin.firestore.Timestamp.now(),
            });
          }
        }

        return {
          success: true,
          response: aiResponse,
          strategiesReferenced: strategiesReferenced,
        };
      } catch (error) {
        logger.error("Error in child coaching chat:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

/**
 * Build coaching context prompt
 */
function buildCoachingContextPrompt(childName, manual, observations, recentMessages) {
  // Format manual content
  const triggers = manual.triggers.map((t) =>
    `- ${t.text} (severity: ${t.severity}/5)`
  ).join("\n");

  const whatWorks = manual.whatWorks.map((s) =>
    `- ${s.text} (effectiveness: ${s.effectiveness}/5${s.context ? `, context: ${s.context}` : ""})`
  ).join("\n");

  const whatDoesntWork = manual.whatDoesntWork.map((a) =>
    `- ${a.text}`
  ).join("\n");

  const strengths = manual.strengths.map((s) =>
    `- ${s.text}`
  ).join("\n");

  // Format recent observations
  const recentObs = observations.slice(0, 5).map((obs) => {
    return `- Situation: ${obs.situation}
  What happened: ${obs.description}
  Strategy tried: ${obs.strategyUsed?.strategyText || "None"}
  Outcome: ${obs.outcome}
  Date: ${obs.date}`;
  }).join("\n\n");

  // Calculate observation stats
  const observationStats = calculateObservationStats(observations);

  return `You are an AI parenting coach specializing in helping parents with ${childName}.

You have access to ${childName}'s operating manual, recent behavior observations, and conversation history.

Your role:
- Provide specific, actionable advice based on ${childName}'s unique patterns
- Reference strategies from the manual that are working
- Suggest experiments when parents are stuck
- Be empathetic and supportive (parenting is hard!)
- Keep responses concise (2-3 short paragraphs max)

${childName}'S MANUAL:

⚡ TRIGGERS (what sets ${childName} off):
${triggers}

✨ WHAT WORKS:
${whatWorks}

🚫 WHAT DOESN'T WORK:
${whatDoesntWork}

💪 STRENGTHS:
${strengths}

📝 CONTEXT NOTES:
${manual.contextNotes}

${manual.childPerspective ? `\n🗣️ ${childName.toUpperCase()}'S PERSPECTIVE (from questionnaire):
This section contains ${childName}'s own answers about feelings, challenges, and preferences.
` : ""}

RECENT BEHAVIOR OBSERVATIONS (last ${observations.length}):
${recentObs || "No recent observations logged."}

OBSERVATION PATTERNS:
${observationStats}

COACHING GUIDELINES:

1. SUGGEST FROM THE MANUAL FIRST
   - Always check if manual has strategies for this situation
   - Reference specific strategies by name: "Have you tried [strategy from manual]?"
   - Note effectiveness ratings when relevant

2. PROPOSE EXPERIMENTS WHEN STUCK
   - If parent says "nothing works" or has tried everything
   - Suggest A/B testing: "Try X on Monday/Wednesday and Y on Tuesday/Thursday"
   - Make it specific: exact instructions, what to measure, how long to test
   - Example: "Let's experiment with timing. Try bedtime routine 15 minutes earlier for 3 days and see if that reduces resistance."

3. USE OBSERVATION DATA
   - Reference recent patterns when relevant
   - Point out success rates if a strategy is working/failing consistently
   - Suggest logging observations if parent isn't doing it

4. BE EMPATHETIC & CONCISE
   - Acknowledge the difficulty: "That sounds really frustrating"
   - Keep responses short (parents are busy!)
   - Focus on 1-2 actionable suggestions, not 10

5. WHEN TO SUGGEST PROFESSIONAL HELP
   - If parent mentions safety concerns
   - If behaviors seem severe/clinical
   - If parent is overwhelmed/burnout
   - Don't diagnose, just gently suggest: "This might be worth discussing with [child's pediatrician/therapist]"

CRITICAL: Base your advice on ${childName}'s specific manual and observation data. Don't give generic parenting advice.`;
}

/**
 * Calculate stats from observations
 */
function calculateObservationStats(observations) {
  if (observations.length === 0) {
    return "No observations logged yet to identify patterns.";
  }

  const stats = {
    total: observations.length,
    byOutcome: {
      worked_great: 0,
      worked_okay: 0,
      didnt_work: 0,
      made_worse: 0,
    },
    bySituation: {},
    strategiesWorking: [],
    strategiesFailing: [],
  };

  observations.forEach((obs) => {
    // Count outcomes
    stats.byOutcome[obs.outcome]++;

    // Count situations
    stats.bySituation[obs.situation] = (stats.bySituation[obs.situation] || 0) + 1;

    // Track strategy success
    if (obs.strategyUsed) {
      const strategy = obs.strategyUsed.strategyText;
      if (obs.outcome === "worked_great" || obs.outcome === "worked_okay") {
        stats.strategiesWorking.push(strategy);
      } else if (obs.outcome === "didnt_work" || obs.outcome === "made_worse") {
        stats.strategiesFailing.push(strategy);
      }
    }
  });

  const topSituations = Object.entries(stats.bySituation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([situation, count]) => `${situation} (${count}x)`)
      .join(", ");

  const successRate = Math.round(
      ((stats.byOutcome.worked_great + stats.byOutcome.worked_okay) / stats.total) * 100
  );

  return `- Total observations: ${stats.total}
- Overall success rate: ${successRate}%
- Most common situations: ${topSituations || "varied"}
- Strategies consistently working: ${[...new Set(stats.strategiesWorking)].slice(0, 3).join(", ") || "None logged yet"}
- Strategies consistently failing: ${[...new Set(stats.strategiesFailing)].slice(0, 3).join(", ") || "None logged yet"}`;
}

module.exports = {chatChildCoach: exports.chatChildCoach};
