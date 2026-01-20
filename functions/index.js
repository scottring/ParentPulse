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

      const {message, conversationId, personId} = request.data;
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
      logger.info(`Chat request from user ${request.auth.uid}, family ${familyId}${personId ? `, person ${personId}` : ""}`);

      try {
        // Retrieve relevant context from the user's data (includes manual if personId provided)
        const context = await retrieveChatContext(familyId, message, personId);

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
            manualsFound: context.personManual ? 1 : 0,
            workbooksFound: context.workbooks ? context.workbooks.length : 0,
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
async function retrieveChatContext(familyId, userMessage, personId = null) {
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

  // Get person manual if personId provided
  let personManual = null;
  let personName = null;
  if (personId) {
    // Get person data
    const personDoc = await admin.firestore()
        .collection("people")
        .doc(personId)
        .get();

    if (personDoc.exists) {
      personName = personDoc.data().name;

      // Get person's manual
      const manualSnapshot = await admin.firestore()
          .collection("person_manuals")
          .where("personId", "==", personId)
          .where("familyId", "==", familyId)
          .limit(1)
          .get();

      if (!manualSnapshot.empty) {
        const manualData = manualSnapshot.docs[0].data();
        personManual = {
          personName: personName,
          triggers: manualData.triggers || [],
          whatWorks: manualData.whatWorks || [],
          whatDoesntWork: manualData.whatDoesntWork || [],
          boundaries: manualData.boundaries || [],
          patterns: manualData.emergingPatterns || [],
          coreInfo: manualData.coreInfo || {},
        };
      }
    }
  }

  // Get weekly workbooks if personId provided
  let workbooks = [];
  if (personId) {
    const workbooksSnapshot = await admin.firestore()
        .collection("weekly_workbooks")
        .where("personId", "==", personId)
        .where("familyId", "==", familyId)
        .orderBy("startDate", "desc")
        .limit(3)
        .get();

    workbooks = workbooksSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        weekNumber: data.weekNumber,
        status: data.status,
        parentGoals: data.parentGoals || [],
        dailyActivities: data.dailyActivities || [],
      };
    });
  }

  // Get past coaching conversations (for historical context)
  const conversationsSnapshot = await admin.firestore()
      .collection("chat_conversations")
      .where("familyId", "==", familyId)
      .orderBy("updatedAt", "desc")
      .limit(12)
      .get();

  const pastConversations = conversationsSnapshot.docs.map((doc) => {
    const data = doc.data();
    const messages = data.messages || [];
    // Extract last 4-6 messages for context (focus on assistant responses)
    const recentMessages = messages.slice(-6);
    return {
      id: doc.id,
      date: data.updatedAt ? data.updatedAt.toDate().toLocaleDateString() : "Unknown",
      messageCount: messages.length,
      recentMessages: recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content
      })),
      personId: data.personId || null
    };
  }).filter((conv) => conv.messageCount > 2); // Only include conversations with substance

  logger.info(`Context: ${journalEntries.length} journals, ${knowledgeItems.length} knowledge items, ${actions.length} actions${personManual ? `, 1 manual for ${personName}` : ""}${workbooks.length > 0 ? `, ${workbooks.length} workbooks` : ""}${pastConversations.length > 0 ? `, ${pastConversations.length} past conversations` : ""}`);

  return {
    journalEntries,
    knowledgeItems,
    actions,
    personManual,
    workbooks,
    pastConversations,
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

  // Add past coaching conversations
  if (context.pastConversations && context.pastConversations.length > 0) {
    systemMessage += `## Past Coaching Conversations (${context.pastConversations.length}):\n`;
    systemMessage += `These are your previous coaching sessions with this family. Use them to recognize patterns, remember past advice, and provide continuity.\n\n`;
    context.pastConversations.slice(0, 8).forEach((conv, i) => {
      systemMessage += `${i + 1}. Conversation from ${conv.date} (${conv.messageCount} messages):\n`;
      // Show last 3-4 message pairs (focusing on key insights)
      const messagesToShow = conv.recentMessages.slice(-4);
      messagesToShow.forEach((msg) => {
        if (msg.role === "assistant") {
          // Only show assistant messages (they contain the insights/advice)
          const excerpt = msg.content.substring(0, 150);
          systemMessage += `   → ${excerpt}${msg.content.length > 150 ? "..." : ""}\n`;
        }
      });
      systemMessage += "\n";
    });
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

  // Add person manual if available
  if (context.personManual) {
    systemMessage += `## ${context.personManual.personName}'s Operating Manual:\n`;

    if (context.personManual.triggers.length > 0) {
      systemMessage += `\n### Triggers (${context.personManual.triggers.length}):\n`;
      context.personManual.triggers.slice(0, 5).forEach((trigger, i) => {
        systemMessage += `${i + 1}. ${trigger.description} (${trigger.severity})\n`;
        systemMessage += `   Context: ${trigger.context}\n`;
        systemMessage += `   Response: ${trigger.typicalResponse}\n`;
        if (trigger.deescalationStrategy) {
          systemMessage += `   What helps: ${trigger.deescalationStrategy}\n`;
        }
      });
    }

    if (context.personManual.whatWorks.length > 0) {
      systemMessage += `\n### What Works (${context.personManual.whatWorks.length}):\n`;
      context.personManual.whatWorks.slice(0, 5).forEach((strategy, i) => {
        systemMessage += `${i + 1}. ${strategy.description} (effectiveness: ${strategy.effectiveness || "N/A"}/5)\n`;
        systemMessage += `   Context: ${strategy.context}\n`;
      });
    }

    if (context.personManual.whatDoesntWork.length > 0) {
      systemMessage += `\n### What Doesn't Work (${context.personManual.whatDoesntWork.length}):\n`;
      context.personManual.whatDoesntWork.slice(0, 3).forEach((strategy, i) => {
        systemMessage += `${i + 1}. ${strategy.description}\n`;
      });
    }

    if (context.personManual.boundaries.length > 0) {
      systemMessage += `\n### Boundaries (${context.personManual.boundaries.length}):\n`;
      context.personManual.boundaries.slice(0, 5).forEach((boundary, i) => {
        systemMessage += `${i + 1}. [${boundary.category}] ${boundary.description}\n`;
        if (boundary.context) {
          systemMessage += `   Context: ${boundary.context}\n`;
        }
      });
    }

    if (context.personManual.coreInfo && Object.keys(context.personManual.coreInfo).length > 0) {
      systemMessage += `\n### Core Info:\n`;
      if (context.personManual.coreInfo.interests) {
        systemMessage += `Interests: ${context.personManual.coreInfo.interests.join(", ")}\n`;
      }
      if (context.personManual.coreInfo.strengths) {
        systemMessage += `Strengths: ${context.personManual.coreInfo.strengths.join(", ")}\n`;
      }
      if (context.personManual.coreInfo.sensoryNeeds) {
        systemMessage += `Sensory Needs: ${context.personManual.coreInfo.sensoryNeeds.join(", ")}\n`;
      }
    }
    systemMessage += "\n";
  }

  // Add workbooks if available
  if (context.workbooks && context.workbooks.length > 0) {
    systemMessage += `## Recent Weekly Workbooks (${context.workbooks.length}):\n`;
    context.workbooks.forEach((workbook, i) => {
      systemMessage += `Week ${workbook.weekNumber} (${workbook.status}):\n`;
      if (workbook.parentGoals && workbook.parentGoals.length > 0) {
        systemMessage += `  Parent Goals: ${workbook.parentGoals.map((g) => g.description).join("; ")}\n`;
      }
    });
    systemMessage += "\n";
  }

  systemMessage += `When answering questions:
- Cite specific journal entries, manual items, or knowledge when relevant
- Reference their person's triggers, strategies, and boundaries directly
- Remind them of strategies that worked before
- Help connect their experiences to broader patterns
- Be concise but thorough
- When suggesting new strategies or triggers, make them specific and actionable
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
          model: "claude-sonnet-4-5-20250929",
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
          model: "claude-sonnet-4-5-20250929",
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

        // Extract assessment scores for storage and future analysis
        const assessmentScores = extractAssessmentScores(answers);

        // Return generated content with assessment scores
        return {
          success: true,
          content: {
            ...content,
            assessmentScores: Object.keys(assessmentScores).length > 0 ? assessmentScores : undefined,
          },
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
 * Format an answer for AI prompt - handles both string and structured answers
 */
function formatAnswerForPrompt(answer) {
  // Handle string answers (legacy)
  if (typeof answer === "string") {
    return answer.trim();
  }

  // Handle StructuredAnswer (clinical assessments)
  if (typeof answer === "object" && answer !== null) {
    const parts = [];

    // Add primary value (rating, selection, etc.)
    if (answer.primary !== undefined && answer.primary !== null) {
      parts.push(`Rating: ${answer.primary}`);
    }

    // Add qualitative comment if present
    if (answer.qualitative && typeof answer.qualitative === "string" && answer.qualitative.trim().length > 0) {
      parts.push(`Context: ${answer.qualitative.trim()}`);
    }

    return parts.length > 0 ? parts.join(" | ") : "";
  }

  return "";
}

/**
 * Map VIA question IDs to their character strength domains
 */
function getVIADomain(questionId) {
  const domains = {
    "via_creativity": "Wisdom & Knowledge",
    "via_curiosity": "Wisdom & Knowledge",
    "via_perseverance": "Courage",
    "via_kindness": "Humanity",
    "via_social_intelligence": "Humanity",
    "via_teamwork": "Justice",
    "via_fairness": "Justice",
    "via_self_regulation": "Temperance",
    "via_gratitude": "Transcendence",
    "via_hope": "Transcendence",
  };
  return domains[questionId] || "Unknown";
}

/**
 * Map self-worth question IDs to their RSES domains
 */
function getSelfWorthDomain(questionId) {
  const domains = {
    "sw_global": "Global Self-Worth",
    "sw_qualities": "Self-Perception",
    "sw_efficacy": "Self-Efficacy",
    "sw_acceptance": "Self-Acceptance",
    "sw_social": "Social Competence",
    "sw_physical": "Physical Competence",
  };
  return domains[questionId] || "Unknown";
}

/**
 * Extract assessment scores from structured answers for storage and analysis
 */
function extractAssessmentScores(answers) {
  const scores = {};

  // Screening level (for children)
  if (answers.screening && answers.screening.screening_level) {
    const screeningAnswer = answers.screening.screening_level;
    const screeningValue = typeof screeningAnswer === "object" && screeningAnswer.primary
        ? screeningAnswer.primary
        : screeningAnswer;
    scores.screeningLevel = screeningValue;
  }

  // ADHD Screening (Vanderbilt-style)
  if (answers.adhd_screening) {
    const adhdScores = {};
    let totalScore = 0;
    let questionCount = 0;

    Object.entries(answers.adhd_screening).forEach(([questionId, answer]) => {
      if (questionId.startsWith("adhd_") && typeof answer === "object" && answer !== null && answer.primary !== undefined) {
        adhdScores[questionId] = {
          score: answer.primary,
          qualitative: answer.qualitative || undefined,
        };
        totalScore += Number(answer.primary);
        questionCount++;
      }
    });

    if (Object.keys(adhdScores).length > 0) {
      scores.adhd = {
        items: adhdScores,
        totalScore,
        averageScore: questionCount > 0 ? (totalScore / questionCount).toFixed(2) : 0,
        questionCount,
      };
    }
  }

  // Sensory Processing
  if (answers.sensory_processing) {
    const sensoryScores = {};
    Object.entries(answers.sensory_processing).forEach(([questionId, answer]) => {
      if (questionId.startsWith("sensory_") && typeof answer === "object" && answer !== null && answer.primary !== undefined) {
        sensoryScores[questionId] = {
          score: answer.primary,
          qualitative: answer.qualitative || undefined,
        };
      }
    });

    if (Object.keys(sensoryScores).length > 0) {
      scores.sensory = sensoryScores;
    }
  }

  // Executive Function
  if (answers.executive_function) {
    const efScores = {};
    Object.entries(answers.executive_function).forEach(([questionId, answer]) => {
      if (questionId.startsWith("ef_") && typeof answer === "object" && answer !== null && answer.primary !== undefined) {
        efScores[questionId] = {
          score: answer.primary,
          qualitative: answer.qualitative || undefined,
        };
      }
    });

    if (Object.keys(efScores).length > 0) {
      scores.executiveFunction = efScores;
    }
  }

  // Emotional Regulation
  if (answers.emotional_regulation) {
    const emotionScores = {};
    Object.entries(answers.emotional_regulation).forEach(([questionId, answer]) => {
      if (questionId.startsWith("emotion_") && typeof answer === "object" && answer !== null) {
        // Handle both numeric and string primary values
        emotionScores[questionId] = {
          value: answer.primary,
          qualitative: answer.qualitative || undefined,
        };
      }
    });

    if (Object.keys(emotionScores).length > 0) {
      scores.emotionalRegulation = emotionScores;
    }
  }

  // VIA Character Strengths
  if (answers.strengths) {
    const viaScores = {};
    Object.entries(answers.strengths).forEach(([questionId, answer]) => {
      if (questionId.startsWith("via_") && typeof answer === "object" && answer !== null && answer.primary !== undefined) {
        viaScores[questionId] = {
          score: answer.primary,
          qualitative: answer.qualitative || undefined,
          domain: getVIADomain(questionId),
        };
      }
    });

    if (Object.keys(viaScores).length > 0) {
      scores.via = viaScores;
    }
  }

  // Self-Worth Assessment (RSES)
  if (answers.self_worth) {
    const selfWorthItems = {};
    let totalScore = 0;
    let questionCount = 0;

    Object.entries(answers.self_worth).forEach(([questionId, answer]) => {
      if (questionId.startsWith("sw_") && typeof answer === "object" && answer !== null && answer.primary !== undefined) {
        const score = typeof answer.primary === "number" ? answer.primary : parseInt(answer.primary);
        selfWorthItems[questionId] = {
          score: score,
          qualitative: answer.qualitative || undefined,
          domain: getSelfWorthDomain(questionId),
        };
        totalScore += score;
        questionCount++;
      }
    });

    if (Object.keys(selfWorthItems).length > 0) {
      const averageScore = questionCount > 0 ? (totalScore / questionCount).toFixed(2) : 0;
      const category = totalScore < 13 ? "low" : totalScore < 19 ? "moderate" : "high";

      scores.selfWorth = {
        items: selfWorthItems,
        totalScore: totalScore,
        averageScore: parseFloat(averageScore),
        category: category,
        questionCount: questionCount,
      };
    }
  }

  return scores;
}

/**
 * Build prompt for generating initial manual content
 */
function buildManualContentPrompt(personName, relationshipType, answers) {
  // Format answers into readable text
  const formattedAnswers = Object.entries(answers)
      .map(([sectionId, sectionAnswers]) => {
        const questions = Object.entries(sectionAnswers)
            .map(([questionId, answer]) => {
              const formatted = formatAnswerForPrompt(answer);
              return formatted.length > 0 ? `${questionId}: ${formatted}` : null;
            })
            .filter((q) => q !== null)
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
  "coreInfo": {
    "selfWorthInsights": ["insight about self-perception 1", "insight about confidence 2", ...]
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
13. For selfWorthInsights in coreInfo: Analyze self-worth assessment responses to generate 2-4 actionable insights about their self-perception, confidence, and areas to support. Focus on patterns, strengths to build on, and specific ways to nurture their sense of self-worth.

Return ONLY the JSON object, no additional text or explanation.`;
}

/**
 * Generate Relationship Manual Content
 * Uses Claude 3.5 Sonnet to generate structured relationship manual content from conversational answers
 */
exports.generateRelationshipManualContent = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {familyId, relationshipId, relationshipType, participantNames, answers} = request.data;

      // Validate input
      if (!familyId || !relationshipId || !relationshipType || !participantNames || !answers) {
        throw new Error("Missing required parameters");
      }

      const namesString = participantNames.join(" & ");
      logger.info(`Generating relationship manual content for ${namesString} (${relationshipType})`);

      try {
        // Build prompt from user's answers
        const prompt = buildRelationshipManualContentPrompt(participantNames, relationshipType, answers);

        // Call Claude 3.5 Sonnet for complex reasoning and structured generation
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-5-20250929",
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

        return {
          success: true,
          content: content,
        };
      } catch (error) {
        logger.error("Error generating relationship manual content:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

/**
 * Build prompt for generating relationship manual content
 */
function buildRelationshipManualContentPrompt(participantNames, relationshipType, answers) {
  // Format answers into readable text
  const formattedAnswers = Object.entries(answers)
      .map(([sectionId, sectionAnswers]) => {
        const questions = Object.entries(sectionAnswers)
            .map(([questionId, answer]) => {
              const formatted = formatAnswerForPrompt(answer);
              return formatted.length > 0 ? `${questionId}: ${formatted}` : null;
            })
            .filter((q) => q !== null)
            .join("\n");
        return questions ? `\n${sectionId.toUpperCase()}:\n${questions}` : "";
      })
      .filter((section) => section.length > 0)
      .join("\n");

  const namesString = participantNames.join(" & ");

  return `You are helping create a relationship manual for understanding and supporting a relationship between people.

Participants: ${namesString}
Relationship Type: ${relationshipType}

Based on the following information provided about this relationship, generate structured content for their relationship manual.

USER RESPONSES:
${formattedAnswers}

Generate a JSON response with the following structure:

{
  "relationshipOverview": "A 2-3 paragraph narrative describing this relationship, its strengths, dynamics, and what makes it work. This should read like a warm, personal description of the relationship.",
  "sharedGoals": [
    {
      "title": "Goal title",
      "description": "What this goal means and why it matters",
      "category": "financial|family|personal_growth|health|career|relationship|other",
      "timeline": "When they hope to achieve this (e.g., 'This year', 'Next 5 years', 'Ongoing')",
      "milestones": ["Milestone 1", "Milestone 2", ...] or null
    }
  ],
  "rituals": [
    {
      "title": "Ritual name",
      "description": "What they do",
      "frequency": "daily|weekly|monthly|occasional",
      "timing": "When they do this (e.g., 'Sunday mornings', 'Every evening', 'Monthly')",
      "significance": "Why this matters to the relationship"
    }
  ],
  "traditions": [
    {
      "title": "Tradition name",
      "description": "Full description of what they do",
      "occasion": "When this happens (e.g., 'Birthdays', 'Holidays', 'Anniversaries')",
      "howWeCelebrate": "How they mark this occasion",
      "yearStarted": year (number) or null
    }
  ],
  "conflictPatterns": [
    {
      "pattern": "Description of typical conflict pattern",
      "triggerSituations": ["What starts this pattern", "Trigger 2", ...],
      "typicalOutcome": "How it usually plays out",
      "whatHelps": ["Strategies that break the pattern", "Strategy 2", ...],
      "whatMakesWorse": ["Things that escalate", "Thing 2", ...],
      "severity": "minor|moderate|significant"
    }
  ],
  "connectionStrategies": [
    {
      "strategy": "Strategy description",
      "context": "When/why to use this",
      "effectiveness": 1-5 (number),
      "notes": "Additional context" or null
    }
  ],
  "importantMilestones": [
    {
      "title": "Milestone title",
      "description": "What happened",
      "date": "Date string (e.g., 'June 2020', 'Summer 2018') or 'Unknown'",
      "significance": "Why this matters to the relationship"
    }
  ]
}

Important Guidelines:
1. Base content ONLY on the information provided in the user responses
2. Be specific and actionable - avoid generic relationship advice
3. Generate 1-3 items per array where appropriate (don't over-generate from limited info)
4. If a section wasn't answered or has minimal info, return empty array
5. For "effectiveness" in connectionStrategies, rate 3-5 (only include strategies that seem effective)
6. For conflictPattern "severity", infer from description and outcome
7. For sharedGoals "category", choose the most appropriate category
8. The relationshipOverview should be a cohesive, warm narrative (2-3 paragraphs) that synthesizes the information
9. Break down compound answers into separate items when appropriate
10. Maintain a supportive, respectful tone that honors the relationship

Return ONLY the JSON object, no additional text or explanation.`;
}



/**
 * Generate Weekly Workbook
 * Uses Claude 3.5 Sonnet to analyze manual content and generate parent behavior goals + activity suggestions
 */
exports.generateWeeklyWorkbook = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {
        familyId,
        personId,
        personName,
        manualId,
        relationshipType,
        personAge,
        triggers,
        whatWorks,
        boundaries,
        previousWeekReflection,
        assessmentScores,    // NEW: Assessment scores from onboarding
        coreInfo,           // NEW: Core info including selfWorthInsights
      } = request.data;

      // Validate input
      if (!familyId || !personId || !personName || !manualId || !relationshipType) {
        throw new Error("Missing required parameters");
      }

      logger.info(`Generating weekly workbook for ${personName} (${relationshipType})`);

      try {
        // Build prompt from manual content
        const prompt = buildWorkbookGenerationPrompt(
            personName,
            relationshipType,
            personAge,
            triggers || [],
            whatWorks || [],
            boundaries || [],
            previousWeekReflection,
            assessmentScores,   // NEW: Pass assessment scores
            coreInfo           // NEW: Pass core info
        );

        // Call Claude 3.5 Sonnet for complex reasoning and goal generation
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4000,
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
          logger.info("Successfully parsed generated workbook content");
        } catch (parseError) {
          logger.error("Error parsing Claude response:", parseError);
          logger.error("Response text:", responseText);
          throw new Error("Failed to parse AI response as JSON");
        }

        // Return generated workbook content
        return {
          success: true,
          content: content,
        };
      } catch (error) {
        logger.error("Error generating weekly workbook:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

/**
 * Build prompt for generating weekly workbook from manual content
 */
function buildWorkbookGenerationPrompt(
    personName,
    relationshipType,
    personAge,
    triggers,
    whatWorks,
    boundaries,
    previousWeekReflection,
    assessmentScores,   // NEW: Assessment scores (via, selfWorth, etc.)
    coreInfo           // NEW: Core info (selfWorthInsights, etc.)
) {
  // Format triggers
  const triggersText = triggers.length > 0 ?
    triggers.map((t, idx) => `${idx + 1}. ${t.description} (Severity: ${t.severity})
   Context: ${t.context || "N/A"}
   Typical Response: ${t.typicalResponse || "N/A"}
   Deescalation: ${t.deescalationStrategy || "N/A"}`).join("\n\n") :
    "No triggers documented yet.";

  // Format strategies
  const strategiesText = whatWorks.length > 0 ?
    whatWorks.map((s, idx) => `${idx + 1}. ${s.description} (Effectiveness: ${s.effectiveness}/5)
   Context: ${s.context || "N/A"}
   Notes: ${s.notes || "N/A"}`).join("\n\n") :
    "No strategies documented yet.";

  // Format boundaries
  const boundariesText = boundaries.length > 0 ?
    boundaries.map((b, idx) => `${idx + 1}. ${b.description} (Category: ${b.category})
   Context: ${b.context || "N/A"}`).join("\n\n") :
    "No boundaries documented yet.";

  // Format previous week reflection if available
  const reflectionText = previousWeekReflection ?
    `
PREVIOUS WEEK'S REFLECTION:
What Worked Well: ${previousWeekReflection.whatWorkedWell || "N/A"}
What Was Challenging: ${previousWeekReflection.whatWasChallenging || "N/A"}
Insights Learned: ${previousWeekReflection.insightsLearned || "N/A"}
Adjustments Needed: ${previousWeekReflection.adjustmentsForNextWeek || "N/A"}
` : "";

  // Format self-worth assessment if available
  const selfWorthText = assessmentScores?.selfWorth ?
    `
SELF-WORTH ASSESSMENT (Rosenberg Scale):
Total Score: ${assessmentScores.selfWorth.totalScore}/24 (${assessmentScores.selfWorth.category})
Average: ${assessmentScores.selfWorth.averageScore}/4.0

Self-Worth Insights:
${coreInfo?.selfWorthInsights?.map((insight, idx) => `${idx + 1}. ${insight}`).join('\n') || 'None documented yet.'}
` : "";

  return `You are helping a parent create a weekly workbook for supporting and understanding ${personName}.

CONTEXT:
Person: ${personName}
Relationship: ${relationshipType}${personAge ? `\nAge: ${personAge} years old` : ""}

This is a parent-driven weekly workbook where the parent tracks their own behavior changes and does simple activities with ${personName}.

MANUAL CONTENT TO ANALYZE:

TRIGGERS & PATTERNS:
${triggersText}

WHAT WORKS (Effective Strategies):
${strategiesText}

BOUNDARIES & LIMITS:
${boundariesText}${selfWorthText}${reflectionText}

YOUR TASK:
Generate a weekly workbook with:
1. 3-5 specific, measurable PARENT behavior goals (not child goals!)
2. 5 suggested activities appropriate for ${personName}'s age and challenges
3. A brief weekly focus summary

CRITICAL GUIDELINES FOR PARENT GOALS:
- Goals are for the PARENT to do, not the child
- Must be specific and actionable (e.g., "Give 5-minute warning before transitions" not "Help with transitions")
- Must be measurable (Daily, 3x per week, etc.)
- Link to specific triggers/strategies from the manual when possible
- Focus on ONE major challenge area per week
- Consider what parent behaviors might help address the documented triggers
- If self-worth is low-moderate (score < 18), prioritize at least ONE goal focused on effort-based praise, process acknowledgment, strength highlighting, or brave moment recognition
- Examples: "Use calm, low voice during meltdowns", "Praise successful transitions immediately", "Take 3 deep breaths before responding", "Acknowledge one effort your child made (daily)"

ACTIVITY SELECTION GUIDELINES:
Choose from these activity types based on ${personName}'s age and documented challenges:
- emotion-checkin: Ages 3-12, helps with emotional awareness (5 min)
- choice-board: Ages 3+, helps when upset/overwhelmed (5 min)
- daily-win: Ages 4+, bedtime positivity ritual (5 min)
- visual-schedule: Ages 3-10, helps with routines (2 min)
- gratitude: Ages 5+, thankfulness practice (5 min)
- feeling-thermometer: Ages 5+, emotion intensity rating (3 min)
- strength-reflection: Ages 5+, identifies personal strengths (5 min) [SELF-WORTH]
- courage-moment: Ages 4+, recalls brave actions (5 min) [SELF-WORTH]
- affirmation-practice: Ages 5+, positive self-statements (5 min) [SELF-WORTH]
- growth-mindset-reflection: Ages 6+, reframes challenges as learning (7 min) [SELF-WORTH]
- accomplishment-tracker: Ages 5+, tracks weekly wins (3 min) [SELF-WORTH]

If self-worth score < 18: Prioritize one of the [SELF-WORTH] activities based on ${personName}'s specific self-worth challenges

Generate a JSON response with this structure:

{
  "weeklyFocus": "Brief 1-2 sentence summary of this week's focus area based on triggers/strategies",
  "parentGoals": [
    {
      "description": "Specific parent behavior to practice",
      "targetFrequency": "Daily" | "3x per week" | "5x per week" | etc.,
      "rationale": "Why this goal (link to trigger/strategy)",
      "relatedTriggerId": "trigger ID if applicable" | null,
      "relatedStrategyId": "strategy ID if applicable" | null
    }
  ],
  "dailyActivities": [
    {
      "type": "emotion-checkin" | "choice-board" | "daily-win" | "visual-schedule" | "gratitude" | "feeling-thermometer",
      "suggestedTime": "morning" | "afternoon" | "evening" | "bedtime" | "when-upset",
      "customization": "Specific suggestions for ${personName} (optional)"
    }
  ],
  "parentNotes": "Brief encouragement or tips for the parent (1-2 sentences)"
}

IMPORTANT:
- Generate 3-5 parent goals (not more)
- Generate exactly 5 activity suggestions
- Be specific to ${personName}'s documented triggers and strategies
- If triggers mention specific times/situations, create goals for those situations
- If strategies are highly effective (4-5/5), prioritize goals that practice those strategies
- Goals should be achievable and realistic for one week
- Activities should be age-appropriate
${previousWeekReflection ? "- Consider previous week's reflection when generating goals (keep what worked, adjust what didn't)" : ""}

Return ONLY the JSON object, no additional text or explanation.`;
}


/**
 * Regenerate Workbook Activities Only
 * Uses Claude 3.5 Sonnet to generate new activity suggestions while keeping existing parent goals
 */
exports.regenerateWorkbookActivities = onCall(
    {
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {
        personName,
        relationshipType,
        personAge,
        triggers,
        whatWorks,
        boundaries,
        assessmentScores,
        coreInfo,
      } = request.data;

      // Validate input
      if (!personName || !relationshipType) {
        throw new Error("Missing required parameters");
      }

      logger.info(`Regenerating activities for ${personName} (${relationshipType})`);

      try {
        // Build prompt for activities only
        const prompt = buildActivitiesRegenerationPrompt(
            personName,
            relationshipType,
            personAge,
            triggers || [],
            whatWorks || [],
            boundaries || [],
            assessmentScores,
            coreInfo
        );

        // Call Claude 3.5 Sonnet
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2000,
          temperature: 0.8, // Higher temperature for more variety
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
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                           responseText.match(/```\s*([\s\S]*?)\s*```/);
          const jsonText = jsonMatch ? jsonMatch[1] : responseText;

          content = JSON.parse(jsonText);
          logger.info("Successfully parsed regenerated activities");
        } catch (parseError) {
          logger.error("Error parsing Claude response:", parseError);
          logger.error("Response text:", responseText);
          throw new Error("Failed to parse AI response as JSON");
        }

        // Return just the activities array
        return {
          success: true,
          activities: content.dailyActivities || [],
        };
      } catch (error) {
        logger.error("Error regenerating activities:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

/**
 * Build prompt for regenerating just activities (not parent goals)
 */
function buildActivitiesRegenerationPrompt(
    personName,
    relationshipType,
    personAge,
    triggers,
    whatWorks,
    boundaries,
    assessmentScores,
    coreInfo
) {
  // Format triggers
  const triggersText = triggers.length > 0 ?
    triggers.map((t, idx) => `${idx + 1}. ${t.description} (Severity: ${t.severity})`).join("\n") :
    "No triggers documented yet.";

  // Format strategies
  const strategiesText = whatWorks.length > 0 ?
    whatWorks.map((s, idx) => `${idx + 1}. ${s.description} (Effectiveness: ${s.effectiveness}/5)`).join("\n") :
    "No strategies documented yet.";

  // Format self-worth assessment if available
  const selfWorthText = assessmentScores?.selfWorth ?
    `\nSELF-WORTH ASSESSMENT: ${assessmentScores.selfWorth.category} (${assessmentScores.selfWorth.totalScore}/24)
Insights: ${coreInfo?.selfWorthInsights?.join(', ') || 'None'}` : "";

  return `You are helping generate new activity suggestions for ${personName}'s weekly workbook.

CONTEXT:
Person: ${personName}
Relationship: ${relationshipType}${personAge ? `\nAge: ${personAge} years old` : ""}

KEY TRIGGERS:
${triggersText}

EFFECTIVE STRATEGIES:
${strategiesText}${selfWorthText}

YOUR TASK:
Generate exactly 5 NEW activity suggestions that are:
1. Age-appropriate for ${personName}
2. Address their specific triggers/challenges
3. Different from what they might have tried before
4. Easy for a parent to facilitate (2-7 minutes each)

AVAILABLE ACTIVITY TYPES:
- emotion-checkin: Ages 3-12, helps with emotional awareness (5 min)
- choice-board: Ages 3+, helps when upset/overwhelmed (5 min)
- daily-win: Ages 4+, bedtime positivity ritual (5 min)
- visual-schedule: Ages 3-10, helps with routines (2 min)
- gratitude: Ages 5+, thankfulness practice (5 min)
- feeling-thermometer: Ages 5+, emotion intensity rating (3 min)
- strength-reflection: Ages 5+, identifies personal strengths (5 min) [SELF-WORTH]
- courage-moment: Ages 4+, recalls brave actions (5 min) [SELF-WORTH]
- affirmation-practice: Ages 5+, positive self-statements (5 min) [SELF-WORTH]
- growth-mindset-reflection: Ages 6+, reframes challenges as learning (7 min) [SELF-WORTH]
- accomplishment-tracker: Ages 5+, tracks weekly wins (3 min) [SELF-WORTH]

${assessmentScores?.selfWorth?.totalScore < 18 ? `\nIMPORTANT: Self-worth score is ${assessmentScores.selfWorth.category} - prioritize including at least 2 [SELF-WORTH] activities` : ''}

Generate a JSON response with this structure:

{
  "dailyActivities": [
    {
      "type": "activity-type-from-list-above",
      "suggestedTime": "morning" | "afternoon" | "evening" | "bedtime" | "when-upset",
      "customization": "Specific suggestions tailored for ${personName}"
    }
  ]
}

REQUIREMENTS:
- Generate EXACTLY 5 activities
- Make them diverse (don't repeat the same activity type)
- Tailor to ${personName}'s age and challenges
- Include specific customization hints for each activity

Return ONLY the JSON object, no additional text or explanation.`;
}


// Child Manual Generation
const {generateChildManualContent} = require("./generateChildManual");
exports.generateChildManualContent = generateChildManualContent;

// Pattern Analysis
const {analyzePatterns} = require("./analyzePatterns");
exports.analyzePatterns = analyzePatterns;

// Child Manual AI Coach
const {chatChildCoach} = require("./chatChildCoach");
exports.chatChildCoach = chatChildCoach;

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * Admin function: List all users in a family
 */
exports.admin_listUsers = onCall(
    {
      enforceAppCheck: false,
      memory: "256MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      try {
        // Check authentication
        if (!request.auth) {
          throw new Error("Authentication required");
        }

        // Check admin privileges
        const adminUserDoc = await admin.firestore()
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!adminUserDoc.exists || !adminUserDoc.data().isAdmin) {
          throw new Error("Admin privileges required");
        }

        const {familyId} = request.data;

        if (!familyId) {
          throw new Error("familyId is required");
        }

        // Query users by familyId
        const usersSnapshot = await admin.firestore()
            .collection("users")
            .where("familyId", "==", familyId)
            .get();

        const users = [];
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          users.push({
            id: doc.id,
            email: data.email || "",
            displayName: data.displayName || "",
            role: data.role || "parent",
            familyId: data.familyId,
            createdAt: data.createdAt,
          });
        });

        logger.info(`Listed ${users.length} users for family ${familyId}`);

        return {
          success: true,
          users,
        };
      } catch (error) {
        logger.error("Error listing users:", error);
        return {
          success: false,
          error: error.message,
          users: [],
        };
      }
    },
);

/**
 * Admin function: List all person manuals in a family
 */
exports.admin_listManuals = onCall(
    {
      enforceAppCheck: false,
      memory: "256MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      try {
        // Check authentication
        if (!request.auth) {
          throw new Error("Authentication required");
        }

        // Check admin privileges
        const adminUserDoc = await admin.firestore()
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!adminUserDoc.exists || !adminUserDoc.data().isAdmin) {
          throw new Error("Admin privileges required");
        }

        const {familyId} = request.data;

        if (!familyId) {
          throw new Error("familyId is required");
        }

        // Query manuals by familyId
        const manualsSnapshot = await admin.firestore()
            .collection("person_manuals")
            .where("familyId", "==", familyId)
            .get();

        const manuals = [];
        manualsSnapshot.forEach((doc) => {
          const data = doc.data();
          manuals.push({
            id: doc.id,
            personId: data.personId || "",
            personName: data.personName || "Unknown",
            relationshipType: data.relationshipType || "",
            createdAt: data.createdAt,
            lastModified: data.lastModified,
          });
        });

        logger.info(`Listed ${manuals.length} manuals for family ${familyId}`);

        return {
          success: true,
          manuals,
        };
      } catch (error) {
        logger.error("Error listing manuals:", error);
        return {
          success: false,
          error: error.message,
          manuals: [],
        };
      }
    },
);

/**
 * Admin function: Delete a user
 */
exports.admin_deleteUser = onCall(
    {
      enforceAppCheck: false,
      memory: "256MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      try {
        // Check authentication
        if (!request.auth) {
          throw new Error("Authentication required");
        }

        // Check admin privileges
        const adminUserDoc = await admin.firestore()
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!adminUserDoc.exists || !adminUserDoc.data().isAdmin) {
          throw new Error("Admin privileges required");
        }

        const {userId} = request.data;

        if (!userId) {
          throw new Error("userId is required");
        }

        // Delete user document
        await admin.firestore()
            .collection("users")
            .doc(userId)
            .delete();

        // Try to delete auth user (may fail if user doesn't exist in auth)
        try {
          await admin.auth().deleteUser(userId);
        } catch (authError) {
          logger.warn(`Could not delete auth user ${userId}:`, authError.message);
        }

        logger.info(`Deleted user ${userId}`);

        return {
          success: true,
        };
      } catch (error) {
        logger.error("Error deleting user:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
);

/**
 * Admin function: Delete a person manual
 */
exports.admin_deleteManual = onCall(
    {
      enforceAppCheck: false,
      memory: "256MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      try {
        // Check authentication
        if (!request.auth) {
          throw new Error("Authentication required");
        }

        // Check admin privileges
        const adminUserDoc = await admin.firestore()
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!adminUserDoc.exists || !adminUserDoc.data().isAdmin) {
          throw new Error("Admin privileges required");
        }

        const {manualId} = request.data;

        if (!manualId) {
          throw new Error("manualId is required");
        }

        // Delete manual document
        await admin.firestore()
            .collection("person_manuals")
            .doc(manualId)
            .delete();

        // Also delete related workbooks
        const workbooksSnapshot = await admin.firestore()
            .collection("weekly_workbooks")
            .where("manualId", "==", manualId)
            .get();

        const batch = admin.firestore().batch();
        workbooksSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        logger.info(`Deleted manual ${manualId} and ${workbooksSnapshot.size} related workbooks`);

        return {
          success: true,
        };
      } catch (error) {
        logger.error("Error deleting manual:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
);

/**
 * Admin function: Reset entire database for a family
 */
exports.admin_resetDatabase = onCall(
    {
      enforceAppCheck: false,
      memory: "512MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      try {
        // Check authentication
        if (!request.auth) {
          throw new Error("Authentication required");
        }

        // Check admin privileges
        const adminUserDoc = await admin.firestore()
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!adminUserDoc.exists || !adminUserDoc.data().isAdmin) {
          throw new Error("Admin privileges required");
        }

        const {familyId} = request.data;

        if (!familyId) {
          throw new Error("familyId is required");
        }

        let deletedUsers = 0;
        let deletedManuals = 0;

        // Delete all users in family
        const usersSnapshot = await admin.firestore()
            .collection("users")
            .where("familyId", "==", familyId)
            .get();

        for (const doc of usersSnapshot.docs) {
          await doc.ref.delete();
          // Try to delete from auth
          try {
            await admin.auth().deleteUser(doc.id);
          } catch (authError) {
            logger.warn(`Could not delete auth user ${doc.id}:`, authError.message);
          }
          deletedUsers++;
        }

        // Delete all manuals in family
        const manualsSnapshot = await admin.firestore()
            .collection("person_manuals")
            .where("familyId", "==", familyId)
            .get();

        const batch = admin.firestore().batch();
        manualsSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          deletedManuals++;
        });
        await batch.commit();

        // Delete all workbooks for this family
        const workbooksSnapshot = await admin.firestore()
            .collection("weekly_workbooks")
            .where("familyId", "==", familyId)
            .get();

        const workbookBatch = admin.firestore().batch();
        workbooksSnapshot.forEach((doc) => {
          workbookBatch.delete(doc.ref);
        });
        await workbookBatch.commit();

        // Delete all people for this family
        const peopleSnapshot = await admin.firestore()
            .collection("people")
            .where("familyId", "==", familyId)
            .get();

        const peopleBatch = admin.firestore().batch();
        peopleSnapshot.forEach((doc) => {
          peopleBatch.delete(doc.ref);
        });
        await peopleBatch.commit();

        logger.info(`Reset database for family ${familyId}: deleted ${deletedUsers} users, ${deletedManuals} manuals`);

        return {
          success: true,
          deleted: {
            users: deletedUsers,
            manuals: deletedManuals,
          },
        };
      } catch (error) {
        logger.error("Error resetting database:", error);
        return {
          success: false,
          error: error.message,
          deleted: {
            users: 0,
            manuals: 0,
          },
        };
      }
    },
);

/**
 * Admin function: Reset all data for a specific user
 */
exports.admin_resetUserData = onCall(
    {
      enforceAppCheck: false,
      memory: "256MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      try {
        // Check authentication
        if (!request.auth) {
          throw new Error("Authentication required");
        }

        // Check admin privileges
        const adminUserDoc = await admin.firestore()
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!adminUserDoc.exists || !adminUserDoc.data().isAdmin) {
          throw new Error("Admin privileges required");
        }

        const {userId} = request.data;

        if (!userId) {
          throw new Error("userId is required");
        }

        let deletedManuals = 0;

        // Get user's familyId
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(userId)
            .get();

        if (!userDoc.exists) {
          throw new Error("User not found");
        }

        const familyId = userDoc.data().familyId;

        // Delete all manuals created by this user (where createdBy matches)
        const manualsSnapshot = await admin.firestore()
            .collection("person_manuals")
            .where("familyId", "==", familyId)
            .where("createdBy", "==", userId)
            .get();

        const batch = admin.firestore().batch();
        manualsSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          deletedManuals++;
        });
        await batch.commit();

        // Delete related workbooks
        for (const manualDoc of manualsSnapshot.docs) {
          const workbooksSnapshot = await admin.firestore()
              .collection("weekly_workbooks")
              .where("manualId", "==", manualDoc.id)
              .get();

          const workbookBatch = admin.firestore().batch();
          workbooksSnapshot.forEach((doc) => {
            workbookBatch.delete(doc.ref);
          });
          await workbookBatch.commit();
        }

        logger.info(`Reset data for user ${userId}: deleted ${deletedManuals} manuals`);

        return {
          success: true,
          deleted: {
            manuals: deletedManuals,
          },
        };
      } catch (error) {
        logger.error("Error resetting user data:", error);
        return {
          success: false,
          error: error.message,
          deleted: {
            manuals: 0,
          },
        };
      }
    },
);

/**
 * Demo function: Reset demo account data
 * Deletes all people, manuals, and workbooks for the demo account
 * Preserves the demo user account itself
 */
exports.resetDemoAccount = onCall(
    {
      enforceAppCheck: false,
      memory: "256MiB",
    },
    async (request) => {
      const logger = require("firebase-functions/logger");

      try {
        // Check authentication
        if (!request.auth) {
          throw new Error("Authentication required");
        }

        // Get user document
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(request.auth.uid)
            .get();

        if (!userDoc.exists) {
          throw new Error("User not found");
        }

        const userData = userDoc.data();
        const familyId = userData.familyId;

        // Verify this is a demo account (check email or isDemo flag)
        const isDemoAccount = userData.email === "demo@relish.app" || userData.isDemo === true;

        if (!isDemoAccount) {
          throw new Error("This function can only be called from a demo account");
        }

        logger.info(`Resetting demo account for family ${familyId}`);

        let deletedPeople = 0;
        let deletedManuals = 0;
        let deletedWorkbooks = 0;

        // Delete all people in the demo family
        const peopleSnapshot = await admin.firestore()
            .collection("people")
            .where("familyId", "==", familyId)
            .get();

        const peopleBatch = admin.firestore().batch();
        peopleSnapshot.forEach((doc) => {
          peopleBatch.delete(doc.ref);
          deletedPeople++;
        });
        await peopleBatch.commit();

        // Delete all person_manuals in the demo family
        const manualsSnapshot = await admin.firestore()
            .collection("person_manuals")
            .where("familyId", "==", familyId)
            .get();

        const manualsBatch = admin.firestore().batch();
        manualsSnapshot.forEach((doc) => {
          manualsBatch.delete(doc.ref);
          deletedManuals++;
        });
        await manualsBatch.commit();

        // Delete all weekly_workbooks in the demo family
        const workbooksSnapshot = await admin.firestore()
            .collection("weekly_workbooks")
            .where("familyId", "==", familyId)
            .get();

        const workbooksBatch = admin.firestore().batch();
        workbooksSnapshot.forEach((doc) => {
          workbooksBatch.delete(doc.ref);
          deletedWorkbooks++;
        });
        await workbooksBatch.commit();

        logger.info(`Demo account reset complete: deleted ${deletedPeople} people, ${deletedManuals} manuals, ${deletedWorkbooks} workbooks`);

        return {
          success: true,
          message: "Demo account data has been reset successfully",
          deleted: {
            people: deletedPeople,
            manuals: deletedManuals,
            workbooks: deletedWorkbooks,
          },
        };
      } catch (error) {
        logger.error("Error resetting demo account:", error);
        return {
          success: false,
          error: error.message,
          deleted: {
            people: 0,
            manuals: 0,
            workbooks: 0,
          },
        };
      }
    },
);
