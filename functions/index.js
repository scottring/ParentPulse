const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

admin.initializeApp();

// Initialize Anthropic client lazily (only when function runs)
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
 * Scheduled function that runs daily at 9 PM to generate next day's actions
 * Schedule format: "0 21 * * *" = 9 PM every day
 */
exports.generateDailyActions = onSchedule(
    {
      schedule: "0 21 * * *", // 9 PM daily
      timeZone: "America/Los_Angeles", // Adjust to your timezone
      memory: "512MiB",
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (event) => {
      const logger = require("firebase-functions/logger");
      logger.info("Starting daily action generation");

      try {
        // Get all families
        const familiesSnapshot = await admin.firestore()
            .collection("families")
            .get();

        logger.info(`Processing ${familiesSnapshot.size} families`);

        // Process each family
        for (const familyDoc of familiesSnapshot.docs) {
          const familyId = familyDoc.id;

          try {
            await processFamilyAnalysis(familyId);
            logger.info(`Successfully processed family ${familyId}`);
          } catch (error) {
            logger.error(`Error processing family ${familyId}:`, error);
            // Continue with next family even if one fails
          }
        }

        logger.info("Daily action generation complete");
        return {success: true};
      } catch (error) {
        logger.error("Error in generateDailyActions:", error);
        throw error;
      }
    }
);

/**
 * Manual trigger function for testing (can be called from the app)
 */
exports.generateDailyActionsManual = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify user is a parent
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();

      const userData = userDoc.data();
      if (!userData || userData.role !== "parent") {
        throw new Error("Only parents can generate actions");
      }

      const familyId = userData.familyId;
      logger.info(`Manual action generation for family ${familyId}`);

      try {
        const result = await processFamilyAnalysis(familyId);
        return {success: true, actionsCreated: result.actionsCreated};
      } catch (error) {
        logger.error("Error in manual generation:", error);
        throw error;
      }
    }
);

/**
 * AI Chat Coach - conversational AI that knows your personal journey
 * Uses RAG to search journal entries, knowledge base, actions, and insights
 * Provides guidance on all relationships: parenting, partnerships, friendships, family, and personal growth
 */
exports.chatWithCoach = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {message, conversationId} = request.data;
      if (!message) {
        throw new Error("Message is required");
      }

      // Get user data
      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();

      const userData = userDoc.data();
      if (!userData || userData.role !== "parent") {
        throw new Error("Only parents can use the AI coach");
      }

      const familyId = userData.familyId;
      logger.info(`Chat request from user ${request.auth.uid}, family ${familyId}`);

      try {
        // Retrieve relevant context from the user's data
        const context = await retrieveChatContext(familyId, message);

        // Get or create conversation
        let conversation = null;
        let conversationRef = null;

        if (conversationId) {
          conversationRef = admin.firestore()
              .collection("chat_conversations")
              .doc(conversationId);
          const conversationDoc = await conversationRef.get();
          if (conversationDoc.exists) {
            conversation = conversationDoc.data();
          }
        }

        if (!conversation) {
          // Create new conversation
          conversationRef = admin.firestore()
              .collection("chat_conversations")
              .doc();
          conversation = {
            familyId,
            userId: request.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            messages: [],
          };
        }

        // Build chat messages for Claude
        const messages = [...conversation.messages];
        messages.push({
          role: "user",
          content: message,
        });

        // Call Claude with context
        const response = await generateChatResponse(messages, context);

        // Add assistant response to messages
        messages.push({
          role: "assistant",
          content: response,
        });

        // Save conversation
        await conversationRef.set({
          ...conversation,
          messages,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Chat response generated for conversation ${conversationRef.id}`);

        return {
          success: true,
          conversationId: conversationRef.id,
          response,
          context: {
            journalEntriesFound: context.journalEntries.length,
            knowledgeItemsFound: context.knowledgeItems.length,
            actionsFound: context.actions.length,
          },
        };
      } catch (error) {
        logger.error("Error in chat:", error);
        throw error;
      }
    }
);

/**
 * Retrieve relevant context for chat based on user's message
 */
async function retrieveChatContext(familyId, userMessage) {
  const logger = require("firebase-functions/logger");

  // Get recent journal entries (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const journalSnapshot = await admin.firestore()
      .collection("journal_entries")
      .where("familyId", "==", familyId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

  const journalEntries = journalSnapshot.docs.map((doc) => ({
    id: doc.id,
    text: doc.data().text,
    category: doc.data().category,
    date: doc.data().createdAt.toDate().toLocaleDateString(),
    tags: doc.data().tags || [],
  }));

  // Get knowledge base items
  const knowledgeSnapshot = await admin.firestore()
      .collection("knowledge_base")
      .where("familyId", "==", familyId)
      .orderBy("timestamp", "desc")
      .limit(15)
      .get();

  const knowledgeItems = knowledgeSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      excerpt: data.excerpt,
      sourceType: data.sourceType,
      tags: data.tags || [],
    };
  });

  // Get recent actions (both pending and completed)
  const actionsSnapshot = await admin.firestore()
      .collection("daily_actions")
      .where("familyId", "==", familyId)
      .orderBy("generatedAt", "desc")
      .limit(10)
      .get();

  const actions = actionsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      status: data.status,
      category: data.category,
      reasoning: data.reasoning,
    };
  });

  logger.info(`Context: ${journalEntries.length} journals, ${knowledgeItems.length} knowledge items, ${actions.length} actions`);

  return {
    journalEntries,
    knowledgeItems,
    actions,
  };
}

/**
 * Generate chat response using Claude with context
 */
async function generateChatResponse(messages, context) {
  const logger = require("firebase-functions/logger");

  // Build system message with context
  const systemMessage = buildChatSystemMessage(context);

  logger.info("Calling Claude for chat response");

  try {
    const anthropicClient = getAnthropic();
    const response = await anthropicClient.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      temperature: 0.7,
      system: systemMessage,
      messages: messages,
    });

    return response.content[0].text;
  } catch (error) {
    logger.error("Error calling Claude for chat:", error);
    throw error;
  }
}

/**
 * Build system message with relevant context
 */
function buildChatSystemMessage(context) {
  let systemMessage = `You are an empathetic AI relationship coach with access to this person's personal journey. You can reference their journal entries, saved knowledge, and action items to provide personalized advice on all relationships - parenting, partnerships, friendships, family dynamics, and personal growth.

Your role:
- Provide supportive, non-judgmental guidance on any relationship topic
- Reference specific entries, articles, or actions when relevant
- Help people see patterns in their experiences and relationships
- Suggest practical strategies based on what has worked for them before
- Acknowledge the challenges they're facing in any relationship context
- Be conversational, warm, and adaptable to any relationship topic
- Cover parenting, romantic relationships, friendships, family, work relationships, and self-relationship

Available Context:

`;

  // Add journal entries
  if (context.journalEntries.length > 0) {
    systemMessage += `## Recent Journal Entries (${context.journalEntries.length}):\n`;
    context.journalEntries.slice(0, 10).forEach((entry, i) => {
      systemMessage += `${i + 1}. [${entry.date}] ${entry.category}: ${entry.text.substring(0, 200)}${entry.text.length > 200 ? "..." : ""}\n`;
    });
    systemMessage += "\n";
  }

  // Add knowledge base
  if (context.knowledgeItems.length > 0) {
    systemMessage += `## Saved Resources & Articles (${context.knowledgeItems.length}):\n`;
    context.knowledgeItems.slice(0, 8).forEach((item, i) => {
      systemMessage += `${i + 1}. "${item.title}" (${item.sourceType}): ${item.excerpt}\n`;
    });
    systemMessage += "\n";
  }

  // Add actions
  if (context.actions.length > 0) {
    systemMessage += `## Recent Action Items (${context.actions.length}):\n`;
    context.actions.slice(0, 8).forEach((action, i) => {
      systemMessage += `${i + 1}. [${action.status}] ${action.title}: ${action.description}\n`;
    });
    systemMessage += "\n";
  }

  systemMessage += `When answering questions:
- Cite specific journal entries or knowledge items when relevant
- Remind them of strategies that worked before
- Help connect their experiences to broader patterns
- Be concise but thorough
- Use a warm, supportive tone`;

  return systemMessage;
}

/**
 * Process daily analysis for a single family
 */
async function processFamilyAnalysis(familyId) {
  const logger = require("firebase-functions/logger");

  // Get today's journal entries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const entriesSnapshot = await admin.firestore()
      .collection("journal_entries")
      .where("familyId", "==", familyId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(today))
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(tomorrow))
      .get();

  // Skip if no entries today
  if (entriesSnapshot.empty) {
    logger.info(`No entries for family ${familyId}, skipping`);
    return {actionsCreated: 0};
  }

  // Prepare journal entries for AI
  const entries = entriesSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      text: data.text,
      category: data.category,
      stressLevel: data.context?.stressLevel || 3,
      timeOfDay: data.context?.timeOfDay || "unknown",
      childId: data.childId,
    };
  });

  // Get children info for context
  const childrenSnapshot = await admin.firestore()
      .collection("users")
      .where("familyId", "==", familyId)
      .where("role", "==", "child")
      .get();

  const children = childrenSnapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
  }));

  // Get knowledge base items for context
  const knowledgeSnapshot = await admin.firestore()
      .collection("knowledge_base")
      .where("familyId", "==", familyId)
      .orderBy("timestamp", "desc")
      .limit(10) // Include up to 10 most recent items
      .get();

  const knowledgeItems = knowledgeSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      sourceType: data.sourceType,
      excerpt: data.excerpt,
      tags: data.tags || [],
    };
  });

  // Generate actions using AI with knowledge context
  const actions = await generateActionsWithAI(entries, children, knowledgeItems);

  // Delete old pending actions for this family before creating new ones
  // This ensures we don't accumulate stale or generic actions
  const oldActionsSnapshot = await admin.firestore()
      .collection("daily_actions")
      .where("familyId", "==", familyId)
      .where("status", "==", "pending")
      .get();

  logger.info(`Found ${oldActionsSnapshot.size} old pending actions to clean up`);

  // Save actions to Firestore
  const batch = admin.firestore().batch();

  // Delete old pending actions
  oldActionsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const nextDay = new Date(tomorrow);

  for (const action of actions) {
    const docRef = admin.firestore().collection("daily_actions").doc();
    batch.set(docRef, {
      familyId,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      targetDate: admin.firestore.Timestamp.fromDate(nextDay),
      ...action,
      status: "pending",
      relatedJournalEntries: entries.map((e) => e.id),
      // Store all knowledge item IDs that were available for this analysis
      // Future enhancement: AI could specify which items were actually referenced
      relatedKnowledgeIds: knowledgeItems.map((k) => k.id),
    });
  }

  // Create analysis summary
  const analysisRef = admin.firestore().collection("daily_analyses").doc();
  batch.set(analysisRef, {
    familyId,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    analysisDate: admin.firestore.Timestamp.fromDate(today),
    summary: generateSummary(entries),
    themes: extractThemes(entries),
    emotionalTrend: calculateEmotionalTrend(entries),
    actionIds: [], // Will be updated after batch commit
    journalEntriesAnalyzed: entries.map((e) => e.id),
    knowledgeItemsReferenced: knowledgeItems.map((k) => k.id),
  });

  await batch.commit();

  logger.info(`Created ${actions.length} actions for family ${familyId}`);
  return {actionsCreated: actions.length};
}

/**
 * Generate actions using Anthropic Claude 3.5 Sonnet
 * More reliable and excellent at empathetic parenting advice
 */
async function generateActionsWithAI(entries, children, knowledgeItems = []) {
  const logger = require("firebase-functions/logger");

  // Build context-rich prompt with knowledge base
  const prompt = buildAnalysisPrompt(entries, children, knowledgeItems);

  logger.info("Calling Anthropic Claude API for action generation");

  try {
    const anthropicClient = getAnthropic();
    const message = await anthropicClient.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      temperature: 0.7,
      system: `You are an empathetic AI parenting coach. Your role is to analyze a parent's daily journal entries and generate 2-5 specific, actionable items for the next day.

Key principles:
1. FEASIBLE: Each action should take 5-30 minutes
2. SPECIFIC: Clear what/how/when details
3. CONTEXTUAL: Based directly on the journal entries
4. BALANCED: Mix of immediate needs and long-term growth
5. REALISTIC: Parents are busy - don't overwhelm them
6. EMPATHETIC: Acknowledge the challenges they're facing
7. KNOWLEDGE-INFORMED: When the parent has saved relevant parenting resources in their knowledge base, reference them and apply their insights to the specific situations in the journal

When referencing knowledge base items, explain HOW to apply the concepts to the parent's actual situation.

You must respond with valid JSON only, no additional text. Format:
{
  "actions": [
    {
      "title": "string",
      "description": "string",
      "estimatedMinutes": number (5-30),
      "priority": "low" | "medium" | "high",
      "reasoning": "string explaining why this action matters"
    }
  ]
}`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const response = message.content[0].text;
    const parsed = JSON.parse(response);

    // Validate and normalize the response
    const actions = parsed.actions || [];

    logger.info(`Claude generated ${actions.length} actions`);

    return actions.map((action) => ({
      title: action.title || "Untitled Action",
      description: action.description || "",
      estimatedMinutes: Math.min(30, Math.max(5, action.estimatedMinutes || 15)),
      priority: ["low", "medium", "high"].includes(action.priority) ?
        action.priority : "medium",
      reasoning: action.reasoning || "",
      category: extractCategory(action.title, action.description),
    }));
  } catch (error) {
    logger.error("Error calling Anthropic Claude:", error);
    // Fallback to basic actions if API fails
    return generateFallbackActions(entries);
  }
}

/**
 * Extract action category from title and description
 */
function extractCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (text.match(/one-on-one|quality time|special time|individual/))
    return "one-on-one";
  if (text.match(/discipline|boundary|consequence|rule|limit/))
    return "discipline";
  if (text.match(/self-care|break|rest|yourself|recharge/))
    return "self-care";
  if (text.match(/read|research|learn|knowledge|strategy/))
    return "learning";
  if (text.match(/routine|schedule|habit|consistent|bedtime/))
    return "routine";
  if (text.match(/emotion|feeling|empathy|validate|listen/))
    return "emotional";

  return "general";
}

/**
 * Build the analysis prompt for the AI
 */
function buildAnalysisPrompt(entries, children, knowledgeItems = []) {
  const childMap = {};
  children.forEach((child) => {
    childMap[child.id] = child.name;
  });

  const entriesText = entries.map((entry, index) => {
    const childName = entry.childId ? childMap[entry.childId] || "Unknown" : "General";
    return `
Entry ${index + 1}:
- Category: ${entry.category}
- Child: ${childName}
- Stress Level: ${entry.stressLevel}/5
- Time: ${entry.timeOfDay}
- Content: ${entry.text}
`;
  }).join("\n");

  // Build knowledge base context
  let knowledgeText = "";
  if (knowledgeItems.length > 0) {
    knowledgeText = "\n\nPARENT'S KNOWLEDGE BASE:\n";
    knowledgeText += "The parent has saved these parenting resources. " +
      "Reference them when relevant to provide evidence-based guidance:\n\n";
    knowledgeItems.forEach((item, index) => {
      knowledgeText += `${index + 1}. ${item.title} (${item.sourceType})\n`;
      knowledgeText += `   Excerpt: ${item.excerpt.slice(0, 300)}...\n`;
      if (item.tags.length > 0) {
        knowledgeText += `   Tags: ${item.tags.join(", ")}\n`;
      }
      knowledgeText += "\n";
    });
  }

  return `Analyze today's parenting journal entries and generate 2-5 actionable items for tomorrow.

Children in the family: ${children.map((c) => c.name).join(", ") || "Not specified"}

TODAY'S JOURNAL ENTRIES:
${entriesText}
${knowledgeText}

Generate 2-5 specific actions for tomorrow. Each action should:
- Be completable in 5-30 minutes
- Address something mentioned in the entries
- Be concrete and specific (not vague advice)
- Consider the parent's energy/stress levels
- Balance urgent needs with long-term goals

Respond with this exact JSON structure:
{
  "actions": [
    {
      "title": "Brief, actionable title (e.g., 'Spend 15 min one-on-one with Emma')",
      "description": "Specific what/how details (2-3 sentences)",
      "estimatedMinutes": 15,
      "priority": "high",
      "reasoning": "Why this matters based on the journal entries (1-2 sentences)"
    }
  ]
}`;
}

/**
 * Fallback actions if AI fails
 */
function generateFallbackActions(entries) {
  const highStress = entries.some((e) => e.stressLevel >= 4);
  const multipleEntries = entries.length > 2;

  const actions = [];

  if (highStress) {
    actions.push({
      title: "Take 10 minutes for yourself",
      description: "Set a timer for 10 minutes and do something just for you - read, meditate, or just sit quietly with a cup of tea.",
      estimatedMinutes: 10,
      priority: "high",
      reasoning: "Your stress levels were high today. Self-care helps you be more present with your children.",
    });
  }

  if (multipleEntries) {
    actions.push({
      title: "Reflect on a positive moment",
      description: "Before bed, spend 5 minutes thinking about one positive interaction you had with your child today.",
      estimatedMinutes: 5,
      priority: "medium",
      reasoning: "You're actively journaling, which shows commitment. Reflecting on positives builds resilience.",
    });
  }

  // Always provide at least one action when entries exist
  if (actions.length === 0 && entries.length > 0) {
    actions.push({
      title: "Review today's journal entry",
      description: "Take a moment to reflect on what you wrote today. Consider what went well and what you might approach differently tomorrow.",
      estimatedMinutes: 10,
      priority: "medium",
      reasoning: "You took time to journal today. Reflecting on your thoughts helps identify patterns and growth opportunities.",
    });
  }

  return actions;
}

/**
 * Generate a summary of the day's entries
 */
function generateSummary(entries) {
  const categories = entries.map((e) => e.category);
  const avgStress = entries.reduce((sum, e) => sum + e.stressLevel, 0) / entries.length;

  return `${entries.length} journal ${entries.length === 1 ? "entry" : "entries"} recorded. ` +
    `Main categories: ${[...new Set(categories)].join(", ")}. ` +
    `Average stress level: ${avgStress.toFixed(1)}/5.`;
}

/**
 * Extract themes from entries
 */
function extractThemes(entries) {
  const themes = new Set();

  entries.forEach((entry) => {
    themes.add(entry.category);

    // Add stress-related themes
    if (entry.stressLevel >= 4) {
      themes.add("high-stress");
    }
  });

  return Array.from(themes);
}

/**
 * Calculate emotional trend
 */
function calculateEmotionalTrend(entries) {
  const avgStress = entries.reduce((sum, e) => sum + e.stressLevel, 0) / entries.length;
  const positiveCategories = ["win", "milestone"];
  const positiveCount = entries.filter((e) => positiveCategories.includes(e.category)).length;

  if (avgStress >= 4) return "challenging";
  if (positiveCount >= entries.length / 2) return "positive";
  return "neutral";
}

/**
 * Generate Strategic Plan - Create personalized 30-90 day plan based on child profile
 */
exports.generateStrategicPlan = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
      timeoutSeconds: 540, // 9 minutes - plan generation is complex
      memory: "512MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");
      const {buildPlanPrompt} = require("./planPrompts");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {childId} = request.data;
      if (!childId) {
        throw new Error("childId is required");
      }

      // Get user data
      const userDoc = await admin.firestore()
          .collection("users")
          .doc(request.auth.uid)
          .get();

      const userData = userDoc.data();
      if (!userData || userData.role !== "parent") {
        throw new Error("Only parents can generate strategic plans");
      }

      const familyId = userData.familyId;
      logger.info(`Strategic plan generation for child ${childId}, family ${familyId}`);

      try {
        // 1. Fetch child profile
        const profileSnapshot = await admin.firestore()
            .collection("child_profiles")
            .where("familyId", "==", familyId)
            .where("childId", "==", childId)
            .limit(1)
            .get();

        if (profileSnapshot.empty) {
          throw new Error("Child profile not found. Please complete onboarding first.");
        }

        const profileDoc = profileSnapshot.docs[0];
        const childProfile = {
          profileId: profileDoc.id,
          ...profileDoc.data(),
        };

        // 2. Fetch child details
        const childDoc = await admin.firestore()
            .collection("users")
            .doc(childId)
            .get();

        if (!childDoc.exists) {
          throw new Error("Child not found");
        }

        const child = {
          userId: childDoc.id,
          ...childDoc.data(),
        };

        // 3. Fetch all children in family (for context)
        const childrenSnapshot = await admin.firestore()
            .collection("users")
            .where("familyId", "==", familyId)
            .where("role", "==", "child")
            .get();

        const children = childrenSnapshot.docs.map((doc) => ({
          userId: doc.id,
          ...doc.data(),
        }));

        // 4. Fetch recent journal entries (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const journalSnapshot = await admin.firestore()
            .collection("journal_entries")
            .where("familyId", "==", familyId)
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();

        const journalEntries = journalSnapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text,
          category: doc.data().category,
          date: doc.data().createdAt.toDate().toLocaleDateString(),
          tags: doc.data().tags || [],
        }));

        // 5. Fetch knowledge base items
        const knowledgeSnapshot = await admin.firestore()
            .collection("knowledge_base")
            .where("familyId", "==", familyId)
            .orderBy("timestamp", "desc")
            .limit(10)
            .get();

        const knowledgeItems = knowledgeSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 6. Build prompt for Claude
        const prompt = buildPlanPrompt(childProfile, journalEntries, knowledgeItems, children);

        logger.info("Calling Claude to generate strategic plan");

        // 7. Call Claude 3.5 Sonnet for complex reasoning
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8000,
          temperature: 0.7,
          messages: [{
            role: "user",
            content: prompt,
          }],
        });

        const responseText = response.content[0].text;
        logger.info("Claude response received, parsing JSON");

        // 8. Parse the JSON response
        let planData;
        try {
          // Extract JSON from response (in case Claude added extra text)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("No valid JSON found in response");
          }
          planData = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          logger.error("Failed to parse Claude response:", responseText);
          throw new Error(`Failed to parse plan data: ${parseError.message}`);
        }

        // 9. Get all parents in family for approval workflow
        const parentsSnapshot = await admin.firestore()
            .collection("users")
            .where("familyId", "==", familyId)
            .where("role", "==", "parent")
            .get();

        const approvalRequired = parentsSnapshot.docs.map((doc) => doc.id);

        // 10. Create strategic plan document
        const planRef = await admin.firestore()
            .collection("strategic_plans")
            .add({
              familyId,
              childId,
              profileId: childProfile.profileId,
              title: planData.title,
              description: planData.description,
              targetChallenge: planData.targetChallenge,
              duration: planData.duration,
              phases: planData.phases,
              milestones: planData.milestones,
              status: "pending_approval",
              parentApprovals: {}, // Empty initially
              approvalRequired,
              generatedAt: admin.firestore.FieldValue.serverTimestamp(),
              aiReasoning: planData.aiReasoning,
              relatedKnowledgeIds: planData.relatedKnowledgeIds || [],
              relatedJournalEntries: journalEntries.slice(0, 5).map((e) => e.id),
              adaptations: [],
            });

        logger.info(`Strategic plan created: ${planRef.id}`);

        // 11. TODO: Send notification to all parents for approval
        // This would be implemented when notification system is added

        return {
          success: true,
          planId: planRef.id,
          plan: {
            planId: planRef.id,
            title: planData.title,
            description: planData.description,
            duration: planData.duration,
            phasesCount: planData.phases.length,
            milestonesCount: planData.milestones.length,
            approvalRequired,
          },
        };
      } catch (error) {
        logger.error("Error generating strategic plan:", error);
        throw error;
      }
    }
);

/**
 * Generate Initial Manual Content
 * Uses Claude 3.5 Sonnet to generate structured manual content from user's conversational answers
 */
exports.generateInitialManualContent = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {familyId, personId, personName, relationshipType, answers} = request.data;

      // Validate input
      if (!familyId || !personId || !personName || !relationshipType || !answers) {
        throw new Error("Missing required parameters");
      }

      logger.info(`Generating manual content for ${personName} (${relationshipType})`);

      try {
        // Build prompt from user's answers
        const prompt = buildManualContentPrompt(personName, relationshipType, answers);

        // Call Claude 3.5 Sonnet for complex reasoning and structured generation
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 6000,
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
          logger.info("Successfully parsed generated content");
        } catch (parseError) {
          logger.error("Error parsing Claude response:", parseError);
          logger.error("Response text:", responseText);
          throw new Error("Failed to parse AI response as JSON");
        }

        // Return generated content
        return {
          success: true,
          content: content,
        };
      } catch (error) {
        logger.error("Error generating manual content:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

/**
 * Build prompt for generating initial manual content
 */
function buildManualContentPrompt(personName, relationshipType, answers) {
  // Format answers into readable text
  const formattedAnswers = Object.entries(answers)
      .map(([sectionId, sectionAnswers]) => {
        const questions = Object.entries(sectionAnswers)
            .filter(([_, answer]) => answer && answer.trim().length > 0)
            .map(([questionId, answer]) => `${questionId}: ${answer}`)
            .join("\n");
        return questions ? `\n${sectionId.toUpperCase()}:\n${questions}` : "";
      })
      .filter((section) => section.length > 0)
      .join("\n");

  return `You are helping create an operating manual for understanding and supporting a person.

Person: ${personName}
Relationship Type: ${relationshipType}

Based on the following information provided by someone who knows ${personName} well, generate structured content for their operating manual.

USER RESPONSES:
${formattedAnswers}

Generate a JSON response with the following structure:

{
  "roleOverview": "A 2-3 paragraph narrative description of how ${personName} shows up in this ${relationshipType} relationship, based on the user's answers. This should read like a rich, personal description written by someone who knows them well in this specific role.",
  "overview": {
    "likes": ["thing they like 1", "thing they like 2", ...],
    "dislikes": ["thing they dislike 1", "thing they dislike 2", ...],
    "motivations": ["motivation 1", "motivation 2", ...],
    "comfortFactors": ["what makes them comfortable 1", ...],
    "discomfortFactors": ["what makes them uncomfortable 1", ...]
  },
  "triggers": [
    {
      "description": "Brief description of the trigger",
      "context": "When/where this happens",
      "typicalResponse": "How they typically react",
      "deescalationStrategy": "What helps (optional)",
      "severity": "mild" | "moderate" | "significant"
    }
  ],
  "whatWorks": [
    {
      "description": "Strategy description",
      "context": "When to use this",
      "effectiveness": 3-5,
      "notes": "Additional context (optional)"
    }
  ],
  "whatDoesntWork": [
    {
      "description": "What doesn't work",
      "context": "Why to avoid",
      "notes": "Context (optional)"
    }
  ],
  "boundaries": [
    {
      "description": "Boundary description",
      "category": "immovable" | "negotiable" | "preference",
      "context": "Context (optional)",
      "consequences": "What happens if crossed (optional)"
    }
  ],
  "strengths": ["strength 1", "strength 2", ...],
  "challenges": ["challenge 1", "challenge 2", ...],
  "importantContext": ["important context 1", "important context 2", ...]
}

Important Guidelines:
1. Base content ONLY on the information provided in the user responses
2. Be specific and actionable - avoid generic advice
3. Use ${personName}'s name naturally where appropriate
4. Maintain a supportive, respectful, empathetic tone
5. Generate 2-4 items per array where appropriate (don't over-generate)
6. If a section wasn't answered or has minimal info, return fewer items or empty array
7. For "effectiveness" in whatWorks, rate 3-5 (only include strategies that seem genuinely effective based on the description)
8. For trigger "severity", infer from the description and typical response
9. For boundary "category", infer based on how firmly the boundary was described
10. Break down compound answers into separate items when appropriate
11. The overview section should distill the user's answers into clear, concise points
12. The roleOverview should be a cohesive narrative (2-3 paragraphs) that synthesizes all the information into a personal, warm description of ${personName} in this ${relationshipType} role

Return ONLY the JSON object, no additional text or explanation.`;
}

