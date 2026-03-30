const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall} = require("firebase-functions/v2/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");
const {GoogleGenerativeAI} = require("@google/generative-ai");

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

// Initialize Google Generative AI client lazily
let genAI;
function getGoogleAI() {
  if (!genAI && process.env.GOOGLE_AI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  return genAI; // Returns null if API key not set
}

/**
 * Check if an email has a pending invite in any family.
 * Called during registration to match invited users to their family.
 * Uses Admin SDK so it bypasses security rules.
 */
exports.checkPendingInvite = onCall(
    {
      region: "us-central1",
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {email} = request.data;
      if (!email) {
        throw new Error("email is required");
      }

      const db = admin.firestore();
      const familiesSnap = await db.collection("families").get();

      for (const familyDoc of familiesSnap.docs) {
        const familyData = familyDoc.data();
        const invite = familyData.pendingInvites?.find(
            (inv) => inv.email.toLowerCase() === email.toLowerCase(),
        );
        if (invite) {
          return {
            found: true,
            familyId: familyDoc.id,
            invite,
          };
        }
      }

      return {found: false};
    },
);

/**
 * Synthesize manual content from multiple perspective contributions.
 * Reads all completed contributions for a manual, pairs self vs observer
 * answers by topic, and generates synthesized insights highlighting
 * alignments, gaps, and blind spots.
 */
exports.synthesizeManualContent = onCall(
    {
      region: "us-central1",
      memory: "512MiB",
      timeoutSeconds: 120,
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      // Verify authentication
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {manualId} = request.data;
      if (!manualId) {
        throw new Error("manualId is required");
      }

      const db = admin.firestore();

      // Fetch the manual
      const manualDoc = await db
          .collection("person_manuals")
          .doc(manualId)
          .get();
      if (!manualDoc.exists) {
        throw new Error("Manual not found");
      }
      const manual = manualDoc.data();

      // Verify user belongs to this family
      const userDoc = await db
          .collection("users")
          .doc(request.auth.uid)
          .get();
      if (!userDoc.exists ||
          userDoc.data().familyId !== manual.familyId) {
        throw new Error("Access denied");
      }

      // Fetch all completed contributions for this manual
      const contribSnap = await db
          .collection("contributions")
          .where("manualId", "==", manualId)
          .where("status", "==", "complete")
          .get();

      if (contribSnap.empty) {
        throw new Error("No completed contributions to synthesize");
      }

      // Organize contributions by perspective type
      const selfContribs = [];
      const observerContribs = [];

      contribSnap.forEach((doc) => {
        const data = doc.data();
        if (data.perspectiveType === "self") {
          selfContribs.push(data);
        } else {
          observerContribs.push(data);
        }
      });

      // Build the prompt
      const personName = manual.personName || "this person";
      let prompt = `You are analyzing a collaborative "operating manual" for ${personName}. `;
      prompt += `Multiple people have shared their perspectives about ${personName}. `;
      prompt += `Your job is to synthesize these perspectives, highlighting:\n`;
      prompt += `1. ALIGNMENTS — where perspectives agree\n`;
      prompt += `2. GAPS — where perspectives diverge (this is the most valuable part)\n`;
      prompt += `3. BLIND SPOTS — things only one side sees\n\n`;

      // Helper: check if an answer is marked private
      const isPrivate = (contrib, section, qId) => {
        return contrib.answerVisibility &&
          contrib.answerVisibility[section] &&
          contrib.answerVisibility[section][qId] === "private";
      };

      // Helper: extract answer text, filtering out private answers
      const getAnswerText = (contrib, section, qId, answer) => {
        if (isPrivate(contrib, section, qId)) return null;
        const text = typeof answer === "string" ?
          answer :
          (answer && answer.primary) ?
            String(answer.primary) :
            JSON.stringify(answer);
        return (text && text.trim()) ? text.trim() : null;
      };

      if (selfContribs.length > 0) {
        prompt += `=== ${personName.toUpperCase()}'S OWN PERSPECTIVE ===\n`;
        for (const contrib of selfContribs) {
          for (const [section, answers] of Object.entries(contrib.answers)) {
            if (typeof answers !== "object" || answers === null) continue;
            const visibleAnswers = [];
            for (const [qId, answer] of Object.entries(answers)) {
              const text = getAnswerText(contrib, section, qId, answer);
              if (text) visibleAnswers.push(text);
            }
            if (visibleAnswers.length > 0) {
              prompt += `\n[${section.toUpperCase()}]\n`;
              for (const text of visibleAnswers) {
                prompt += `- ${text}\n`;
              }
            }
          }
        }
        prompt += "\n";
      }

      if (observerContribs.length > 0) {
        for (const contrib of observerContribs) {
          const observerName = contrib.contributorName || "An observer";
          const relationship = contrib.relationshipToSubject || "observer";
          prompt += `=== ${observerName.toUpperCase()}'S PERSPECTIVE `;
          prompt += `(${relationship}) ===\n`;
          for (const [section, answers] of Object.entries(contrib.answers)) {
            if (typeof answers !== "object" || answers === null) continue;
            const visibleAnswers = [];
            for (const [qId, answer] of Object.entries(answers)) {
              const text = getAnswerText(contrib, section, qId, answer);
              if (text) visibleAnswers.push(text);
            }
            if (visibleAnswers.length > 0) {
              prompt += `\n[${section.toUpperCase()}]\n`;
              for (const text of visibleAnswers) {
                prompt += `- ${text}\n`;
              }
            }
          }
          prompt += "\n";
        }
      }

      // Inject recent growth activity feedback into synthesis context
      try {
        const growthItemsSnap = await db.collection("growth_items")
            .where("sourceManualId", "==", manualId)
            .where("status", "==", "completed")
            .get();

        const growthSignals = [];
        growthItemsSnap.forEach((doc) => {
          const item = doc.data();
          if (item.feedback) {
            const impact = item.feedback.impactRating ?
              ` (impact: ${["slight", "noticeable", "breakthrough"][item.feedback.impactRating - 1]})` : "";
            growthSignals.push(
                `- "${item.title}" → ${item.feedback.reaction}${impact}` +
                (item.feedback.note ? ` — "${item.feedback.note}"` : ""),
            );
          }
        });

        if (growthSignals.length > 0) {
          prompt += `\n=== RECENT GROWTH ACTIVITY ===\n`;
          prompt += `The following activities were tried based on ` +
            `previous synthesis. Use this evidence of change to ` +
            `adjust gap severities — if activities addressing a gap ` +
            `got positive feedback, that gap may have improved.\n`;
          prompt += growthSignals.slice(0, 10).join("\n");
          prompt += "\n";
        }
      } catch (growthErr) {
        // Non-critical — continue without growth data
      }

      prompt += `\nBased on these perspectives, provide a JSON response with this structure:
{
  "overview": "A 2-3 sentence narrative overview of ${personName} that weaves together all perspectives",
  "alignments": [
    {
      "id": "unique-id",
      "topic": "Topic name",
      "selfPerspective": "What they said (or null if no self-perspective)",
      "observerPerspective": "What observers said",
      "synthesis": "How these perspectives align and what it means",
      "gapSeverity": "aligned"
    }
  ],
  "gaps": [
    {
      "id": "unique-id",
      "topic": "Topic name",
      "selfPerspective": "What they said",
      "observerPerspective": "What observers said",
      "synthesis": "How these perspectives differ and what the gap reveals",
      "gapSeverity": "minor_gap" or "significant_gap"
    }
  ],
  "blindSpots": [
    {
      "id": "unique-id",
      "topic": "Topic name",
      "selfPerspective": "What only they see (or null)",
      "observerPerspective": "What only observers see (or null)",
      "synthesis": "Why this blind spot matters",
      "gapSeverity": "minor_gap" or "significant_gap"
    }
  ]
}

Important:
- Focus on what's genuinely useful for understanding ${personName} better
- Gaps are not bad — they're where understanding deepens
- Be warm and constructive, not clinical
- Keep each synthesis to 1-2 sentences
- Generate 2-5 items per category (alignments, gaps, blind spots)
- If there's only one perspective type, still generate insights but note that the other perspective is missing
- Return ONLY valid JSON, no markdown or extra text`;

      try {
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = response.content[0].text;

        // Parse JSON from response (handle potential markdown wrapping)
        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (parseErr) {
          console.error("Failed to parse synthesis response:", content);
          throw new Error("Failed to parse AI response");
        }

        // Add IDs if missing
        const addIds = (items) =>
          (items || []).map((item, i) => ({
            ...item,
            id: item.id || `item-${i}-${Date.now()}`,
          }));

        const synthesizedContent = {
          overview: parsed.overview || "",
          alignments: addIds(parsed.alignments),
          gaps: addIds(parsed.gaps),
          blindSpots: addIds(parsed.blindSpots),
          lastSynthesizedAt: admin.firestore.Timestamp.now(),
        };

        // Save to manual
        await db
            .collection("person_manuals")
            .doc(manualId)
            .update({
              synthesizedContent,
              updatedAt: admin.firestore.Timestamp.now(),
            });

        return {success: true, synthesizedContent};
      } catch (err) {
        console.error("Synthesis error:", err);
        throw new Error(`Synthesis failed: ${err.message}`);
      }
    },
);

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

FOUNDATIONAL ACTIVITIES (Ages 3-12):
- emotion-checkin: Ages 3-12, helps with emotional awareness (5 min)
- choice-board: Ages 3+, helps when upset/overwhelmed (5 min)
- daily-win: Ages 4+, bedtime positivity ritual (5 min)
- visual-schedule: Ages 3-10, helps with routines (2 min)
- gratitude: Ages 5+, thankfulness practice (5 min)
- feeling-thermometer: Ages 5+, emotion intensity rating (3 min)

SELF-WORTH ACTIVITIES (Ages 4-12):
- strength-reflection: Ages 5+, identifies personal strengths (5 min) [SELF-WORTH]
- courage-moment: Ages 4+, recalls brave actions (5 min) [SELF-WORTH]
- affirmation-practice: Ages 5+, positive self-statements (5 min) [SELF-WORTH]
- growth-mindset-reflection: Ages 6+, reframes challenges as learning (7 min) [SELF-WORTH]
- accomplishment-tracker: Ages 5+, tracks weekly wins (3 min) [SELF-WORTH]
- story-reflection: Ages 5+, reflect on weekly story character (10 min) [SELF-WORTH]

EMOTIONAL REGULATION & COPING (Ages 5-12):
- worry-box: Ages 6+, categorize worries as controllable/uncontrollable (10 min)
- emotion-wheel: Ages 7+, identify secondary emotions beneath primary ones (8 min)
- calm-down-toolbox: Ages 5+, build personalized calming strategies (10 min)
- body-signals: Ages 6+, map physical sensations to emotions (8 min)
- safe-person-map: Ages 5+, identify support network by situation type (10 min)

EXECUTIVE FUNCTION & ROUTINES (Ages 6-12):
- time-captain: Ages 7+, time estimation vs. reality tracking (10 min)
- priority-picker: Ages 8+, important/urgent matrix for task prioritization (10 min)
- energy-tracker: Ages 7+, daily energy patterns for optimal scheduling (8 min)
- transition-timer: Ages 5+, visual countdown for difficult transitions (5 min)

RELATIONSHIP & SOCIAL SKILLS (Ages 5-12):
- friendship-builder: Ages 6+, friendship qualities self-assessment (10 min)
- conflict-detective: Ages 6+, "I felt ___ when ___ because ___" framework (10 min)
- kindness-catcher: Ages 5+, notice and record kindness (given/received/observed) (7 min)
- share-or-boundaries: Ages 6+, practice saying yes/no with confidence (10 min)

SELF-AWARENESS & IDENTITY (Ages 7-12):
- value-compass: Ages 8+, identify and rank personal values (12 min)
- inner-voice-check: Ages 7+, self-talk pattern recognition and reframing (10 min)
- compare-and-care: Ages 8+, address social comparison with growth focus (10 min)
- mood-journal: Ages 6+, color-coded emotional journey throughout day (8 min)

GROWTH MINDSET & RESILIENCE (Ages 5-12):
- mistake-magic: Ages 6+, reframe mistakes as learning opportunities (8 min)
- hard-thing-hero: Ages 5+, celebrate attempting difficult tasks (7 min)
- yet-power: Ages 6+, transform "I can't" to "I can't... yet" (7 min)

SELECTION PRIORITIES:
1. If self-worth score < 18: Include at least 1-2 [SELF-WORTH] activities
2. Match activities to documented triggers (e.g., transition issues → transition-timer, worry → worry-box)
3. Match activities to age appropriateness
4. Provide variety across categories
5. Include mix of quick (5 min) and deeper (10 min) activities

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
      "type": "emotion-checkin" | "choice-board" | "daily-win" | "visual-schedule" | "gratitude" | "feeling-thermometer" | "strength-reflection" | "courage-moment" | "affirmation-practice" | "growth-mindset-reflection" | "accomplishment-tracker" | "story-reflection" | "worry-box" | "emotion-wheel" | "calm-down-toolbox" | "body-signals" | "safe-person-map" | "time-captain" | "priority-picker" | "energy-tracker" | "transition-timer" | "friendship-builder" | "conflict-detective" | "kindness-catcher" | "share-or-boundaries" | "value-compass" | "inner-voice-check" | "compare-and-care" | "mood-journal" | "mistake-magic" | "hard-thing-hero" | "yet-power",
      "suggestedTime": "morning" | "afternoon" | "evening" | "bedtime" | "when-upset" | "after-school" | "during-transition",
      "customization": "Specific suggestions for ${personName} based on their triggers, strengths, or challenges"
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
 * Generate Dual Weekly Workbooks (Parent + Child)
 *
 * Creates linked parent and child workbooks:
 * - ParentWorkbook: Behavior goals + daily parenting strategies (aligned with child's story)
 * - ChildWorkbook: Weekly serialized story with illustrations
 *
 * Uses Claude 3.5 Sonnet for story narrative
 * Uses Nano Banana Pro (Gemini 3 Pro Image) for illustrations
 */
exports.generateWeeklyWorkbooks = onCall(
    {
      secrets: [
        "ANTHROPIC_API_KEY",  // Required for Claude story generation
        "OPENAI_API_KEY",     // Fallback for story generation and DALL-E illustrations
        // Optional secrets (check availability in code):
        // "GOOGLE_AI_API_KEY" - for Nano Banana Pro illustrations
      ],
      timeoutSeconds: 540, // 9 minutes for story + illustration generation
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
        personAge,
        manualId,
        relationshipType,
        triggers,
        whatWorks,
        whatDoesntWork,
        boundaries,
        coreInfo,
        previousWeekReflection,
        assessmentScores,
        weekNumber,
        startDate,
        endDate,
        // AI model configuration (optional - defaults to budget tier with GPT-4o-mini)
        storyModel = 'gpt-4o-mini', // Changed from claude-haiku-4.5 due to reliability issues
        illustrationModel = 'dalle-3-standard',
        illustrationsEnabled = true,
        // Test/Demo mode (avoids API costs)
        testMode = false,
      } = request.data;

      // Validate required parameters
      if (!familyId || !personId || !personName || !manualId) {
        throw new Error("Missing required parameters: familyId, personId, personName, manualId");
      }

      if (testMode) {
        logger.info(`[TEST MODE] Generating dual workbooks for ${personName} using sample data (no API costs)`);
      } else {
        logger.info(`Generating dual workbooks for ${personName}, age ${personAge}`);
      }

      try {
        const db = admin.firestore();

        // Generate unique weekId to link both workbooks
        const weekId = `week-${personId}-${weekNumber || Date.now()}`;

        let parentGoalsData;
        let storyData;
        let dailyStrategiesData;

        if (testMode) {
          // ===== TEST MODE: Use sample data (no API calls, no costs) =====
          logger.info("[TEST MODE] Loading sample data instead of calling AI APIs");

          const sampleData = require("./sample-story-data");

          // Customize sample data with person's name
          const sampleCharacterName = sampleData.sampleStoryAge6.characterName; // "Alex" in current sample

          storyData = {
            ...sampleData.sampleStoryAge6,
            characterName: personName,
            dailyFragments: sampleData.sampleStoryAge6.dailyFragments.map(fragment => ({
              ...fragment,
              fragmentText: fragment.fragmentText.replace(new RegExp(sampleCharacterName, 'g'), personName),
            })),
            reflectionQuestions: sampleData.sampleStoryAge6.reflectionQuestions.map(q => ({
              ...q,
              questionText: q.questionText.replace(new RegExp(sampleCharacterName, 'g'), personName),
            })),
          };

          parentGoalsData = {
            parentGoals: sampleData.sampleParentGoals.map(goal => ({
              ...goal,
              description: goal.description.replace(new RegExp(sampleCharacterName, 'g'), personName),
            })),
            dailyActivities: (sampleData.sampleChildActivities || []).map(activity => ({
              ...activity,
              customization: activity.customization.replace(new RegExp(sampleCharacterName, 'g'), personName),
            })),
          };

          dailyStrategiesData = {
            dailyStrategies: sampleData.sampleDailyStrategies.map(strategy => ({
              ...strategy,
              strategyDescription: strategy.strategyDescription.replace(new RegExp(sampleCharacterName, 'g'), personName),
              connectionToStory: strategy.connectionToStory.replace(new RegExp(sampleCharacterName, 'g'), personName),
              practicalTips: strategy.practicalTips.map(tip =>
                tip.replace(new RegExp(sampleCharacterName, 'g'), personName)
              ),
            })),
          };

          logger.info(`[TEST MODE] Using sample story: "${storyData.title}"`);

        } else {
          // ===== PRODUCTION MODE: Call AI APIs (costs apply) =====

          // STEP 1: Generate parent goals
          logger.info("Step 1: Generating parent behavior goals");
          const parentGoalsPrompt = buildWorkbookGenerationPrompt(
              personName,
              relationshipType,
              personAge,
              triggers || [],
              whatWorks || [],
              boundaries || [],
              previousWeekReflection,
              assessmentScores,
              coreInfo
          );

          const anthropicClient = getAnthropic();
          const goalsResponse = await anthropicClient.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 4000,
            temperature: 0.7,
            messages: [{
              role: "user",
              content: parentGoalsPrompt,
            }],
          });

          const goalsText = goalsResponse.content[0].text;
          const goalsJsonMatch = goalsText.match(/```json\s*([\s\S]*?)\s*```/) ||
                                 goalsText.match(/```\s*([\s\S]*?)\s*```/);
          const goalsJson = goalsJsonMatch ? goalsJsonMatch[1] : goalsText;
          parentGoalsData = JSON.parse(goalsJson);

          logger.info(`Generated ${parentGoalsData.parentGoals.length} parent goals`);

          // STEP 2: Generate child's weekly story
          logger.info(`Step 2: Generating child's weekly story with ${storyModel}`);
          storyData = await generateWeeklyStory(
              personName,
              personAge,
              coreInfo?.strengths || [],
              triggers || [],
              whatWorks || [],
              relationshipType,
              storyModel
          );

          logger.info(`Generated story: "${storyData.title}" with ${storyData.dailyFragments.length} fragments`);

          // STEP 3: Generate daily parent strategies (aligned with story)
          logger.info("Step 3: Generating daily parent strategies aligned with story");
          const dailyStrategiesPrompt = buildDailyStrategiesPrompt(
              personName,
              personAge,
              storyData,
              triggers || [],
              whatWorks || []
          );

          const strategiesResponse = await anthropicClient.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 3000,
            temperature: 0.7,
            messages: [{
              role: "user",
              content: dailyStrategiesPrompt,
            }],
          });

          const strategiesText = strategiesResponse.content[0].text;
          const strategiesJsonMatch = strategiesText.match(/```json\s*([\s\S]*?)\s*```/) ||
                                      strategiesText.match(/```\s*([\s\S]*?)\s*```/);
          const strategiesJson = strategiesJsonMatch ? strategiesJsonMatch[1] : strategiesText;
          dailyStrategiesData = JSON.parse(strategiesJson);

          logger.info(`Generated ${dailyStrategiesData.dailyStrategies.length} daily strategies`);
        }

        // STEP 4: Create ParentWorkbook document
        const parentWorkbookRef = db.collection("parent_workbooks").doc();
        const parentWorkbookId = parentWorkbookRef.id;

        // STEP 5: Create ChildWorkbook document
        const childWorkbookRef = db.collection("child_workbooks").doc();
        const childWorkbookId = childWorkbookRef.id;

        // Build parent workbook data
        const parentWorkbook = {
          workbookId: parentWorkbookId,
          weekId: weekId,
          familyId: familyId,
          personId: personId,
          personName: personName,
          weekNumber: weekNumber || 1,
          startDate: startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : admin.firestore.Timestamp.now(),
          endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),

          // Parent goals from step 1
          parentGoals: parentGoalsData.parentGoals.map((goal) => ({
            id: db.collection("parent_workbooks").doc().id,
            description: goal.description,
            targetFrequency: goal.targetFrequency,
            linkedToTrigger: goal.relatedTriggerId || null,
            linkedToStrategy: goal.relatedStrategyId || null,
            completionLog: [],
            addedDate: admin.firestore.Timestamp.now(),
          })),

          // Daily strategies from step 3 (aligned with child's story)
          dailyStrategies: dailyStrategiesData.dailyStrategies.map((strategy, idx) => ({
            day: strategy.day,
            dayNumber: idx + 1,
            strategyTitle: strategy.strategyTitle,
            strategyDescription: strategy.strategyDescription,
            connectionToStory: strategy.connectionToStory,
            practicalTips: strategy.practicalTips || [],
            linkedToTrigger: strategy.linkedToTrigger || null,
            linkedToWhatWorks: strategy.linkedToWhatWorks || null,
            completed: false,
            completedAt: null,
            notes: null,
          })),

          // Child progress summary (initially empty)
          childProgressSummary: {
            storiesRead: 0,
            activitiesCompleted: 0,
            lastActiveDate: null,
            storyCompletionPercent: 0,
          },

          // Link to child workbook
          childWorkbookId: childWorkbookId,

          status: "active",
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          lastEditedBy: request.auth.uid,
        };

        // Build child workbook data
        const childWorkbook = {
          workbookId: childWorkbookId,
          weekId: weekId,
          familyId: familyId,
          personId: personId,
          personName: personName,
          personAge: personAge || 8,
          weekNumber: weekNumber || 1,
          startDate: startDate ? admin.firestore.Timestamp.fromDate(new Date(startDate)) : admin.firestore.Timestamp.now(),
          endDate: endDate ? admin.firestore.Timestamp.fromDate(new Date(endDate)) : admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),

          // Weekly story from step 2
          weeklyStory: {
            ...storyData,
            // In test mode, preserve sample illustration URLs; in production, mark as generating
            dailyFragments: storyData.dailyFragments.map((fragment) => {
              // Ensure no undefined values - Firestore rejects them
              const result = {
                ...fragment,
                illustrationUrl: testMode ? (fragment.illustrationUrl ?? null) : null,
                illustrationThumbnail: null, // Always null for placeholders
                illustrationStatus: testMode ? (fragment.illustrationStatus ?? "complete") : "generating",
              };
              return result;
            }),
          },

          // Daily activities from parent goals data
          dailyActivities: parentGoalsData.dailyActivities || [],

          // Story progress tracking (initially empty)
          storyProgress: {
            currentDay: 1,
            daysRead: [false, false, false, false, false, false, false],
            activitiesCompleted: [],
            totalActivities: (parentGoalsData.dailyActivities || []).length,
            lastReadAt: null,
          },

          // Link to parent workbook
          parentWorkbookId: parentWorkbookId,

          status: "active",
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };

        // STEP 6: Save both workbooks to Firestore
        logger.info("Step 4: Saving workbooks to Firestore");
        await Promise.all([
          parentWorkbookRef.set(parentWorkbook),
          childWorkbookRef.set(childWorkbook),
        ]);

        logger.info(`Workbooks saved: parent=${parentWorkbookId}, child=${childWorkbookId}`);

        // STEP 7: Generate illustrations asynchronously (don't block response)
        if (testMode) {
          logger.info("[TEST MODE] Skipping illustration generation - using sample illustrations");
        } else if (illustrationsEnabled) {
          logger.info(`Step 5: Generating illustrations synchronously with ${illustrationModel}`);
          try {
            await generateAndSaveIllustrations(
                childWorkbookId,
                storyData,
                personAge,
                illustrationModel
            );
            logger.info("All illustrations generated successfully");
          } catch (error) {
            logger.error("Illustration generation failed:", error);
            // Continue anyway - workbooks are still usable without illustrations
          }
        } else {
          logger.info("Step 5: Illustrations disabled, skipping generation");
        }

        // Return success with workbook IDs
        return {
          success: true,
          parentWorkbookId: parentWorkbookId,
          childWorkbookId: childWorkbookId,
          weekId: weekId,
          storyTitle: storyData.title,
          parentGoalsCount: parentGoalsData.parentGoals.length,
          dailyStrategiesCount: dailyStrategiesData.dailyStrategies.length,
        };

      } catch (error) {
        logger.error("Error generating dual workbooks:", error);
        return {
          success: false,
          error: error.message,
          errorDetails: error.stack,
        };
      }
    }
);

/**
 * Generate story with specified AI model
 */
async function generateStoryWithModel(
    modelName,
    storyPrompt,
    logger
) {
  logger.info(`Generating story with model: ${modelName}`);

  let responseText;

  switch (modelName) {
    case 'claude-sonnet-4.5': {
      const client = getAnthropic();
      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        temperature: 0.8,
        messages: [{ role: "user", content: storyPrompt }],
      });
      responseText = response.content[0].text;
      break;
    }

    case 'claude-haiku-4.5': {
      // Note: There is no Claude Haiku 4.5, using Claude 3 Haiku instead
      const client = getAnthropic();
      const response = await client.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        temperature: 0.8,
        messages: [{ role: "user", content: storyPrompt }],
      });
      responseText = response.content[0].text;
      break;
    }

    case 'gpt-4o-mini':
    case 'gpt-3.5-turbo': {
      // OpenAI models require the OpenAI SDK
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const modelId = modelName === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'gpt-3.5-turbo';
      const response = await openai.chat.completions.create({
        model: modelId,
        max_tokens: 4000,
        temperature: 0.8,
        messages: [{ role: 'user', content: storyPrompt }],
      });
      responseText = response.choices[0].message.content;
      break;
    }

    default:
      throw new Error(`Unsupported story model: ${modelName}`);
  }

  logger.info("Story generation response received");

  // Parse JSON response
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                   responseText.match(/```\s*([\s\S]*?)\s*```/);
  let jsonText = jsonMatch ? jsonMatch[1] : responseText;

  try {
    const storyData = JSON.parse(jsonText);
    return storyData;
  } catch (parseError) {
    // Try to repair common JSON issues
    logger.warn("Initial JSON parse failed, attempting repair...");

    try {
      // Remove trailing commas before } or ]
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      // Fix unescaped quotes in strings (basic attempt)
      // Try parsing again
      const storyData = JSON.parse(jsonText);
      logger.info("Successfully repaired and parsed JSON");
      return storyData;
    } catch (repairError) {
      logger.error("Failed to parse story JSON even after repair:", {
        originalError: parseError.message,
        position: parseError.message.match(/position (\d+)/)?.[1],
        jsonLength: jsonText.length,
        jsonPreview: jsonText.substring(0, 1000),
        fullResponse: responseText.substring(0, 2000)
      });
      throw new Error(`Failed to parse story JSON: ${parseError.message}. The AI generated invalid JSON. Please try again.`);
    }
  }
}

/**
 * Generate weekly story using Claude 3.5 Sonnet (legacy wrapper for backwards compatibility)
 */
async function generateWeeklyStory(
    personName,
    personAge,
    strengths,
    triggers,
    whatWorks,
    relationshipType,
    modelName = 'claude-haiku-4.5' // Default to Standard tier
) {
  const logger = require("firebase-functions/logger");

  // Determine primary trigger for story theme
  const primaryTrigger = triggers.length > 0 ? triggers[0] : null;

  // Build story generation prompt
  const storyPrompt = buildStoryPrompt(
      personName,
      personAge,
      strengths,
      primaryTrigger,
      whatWorks
  );

  // Determine minimum word count based on age
  const minWordCount =
    personAge <= 5 ? 75 :
    personAge <= 8 ? 150 :
    200;

  // Try up to 2 times to get properly sized story
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      logger.info(`Story generation attempt ${attempt}/2`);

      // Use new model-agnostic function
      const storyData = await generateStoryWithModel(modelName, storyPrompt, logger);

      // Validate word counts
      const fragmentValidation = storyData.dailyFragments.map((fragment, idx) => {
        const wordCount = fragment.fragmentText.split(/\s+/).length;
        const isValid = wordCount >= minWordCount;
        return { day: idx + 1, wordCount, isValid, minRequired: minWordCount };
      });

      const invalidFragments = fragmentValidation.filter(f => !f.isValid);

      if (invalidFragments.length > 0) {
        const details = invalidFragments.map(f =>
          `Day ${f.day}: ${f.wordCount} words (need ${f.minRequired}+)`
        ).join(', ');

        logger.warn(`Story fragments too short on attempt ${attempt}: ${details}`);

        if (attempt < 2) {
          // Retry with stronger emphasis
          logger.info("Retrying with stronger word count emphasis...");
          continue;
        } else {
          // On final attempt, log warning but accept it
          logger.error(`Story still too short after ${attempt} attempts. Accepting anyway.`);
        }
      } else {
        logger.info("All story fragments meet minimum word count requirements");
      }

      return storyData;

    } catch (error) {
      lastError = error;
      logger.error(`Story generation attempt ${attempt} failed:`, error);

      if (attempt < 2) {
        logger.info("Retrying story generation...");
        continue;
      }
    }
  }

  // If we got here, all attempts failed
  throw lastError || new Error("Story generation failed after all attempts");
}

/**
 * Build prompt for generating weekly story
 */
function buildStoryPrompt(personName, personAge, strengths, primaryTrigger, whatWorks) {
  const ageLevel =
    personAge <= 5 ? "picture-book" :
    personAge <= 8 ? "early-reader" :
    "chapter-book";

  const wordCount =
    personAge <= 5 ? "75-125" :
    personAge <= 8 ? "150-200" :
    "200-300";

  const strengthsText = strengths.length > 0 ? strengths.join(", ") : "creativity, curiosity, kindness";
  const triggerText = primaryTrigger ? primaryTrigger.description : "facing new challenges";
  const strategiesText = whatWorks.length > 0 ?
    whatWorks.map((s) => s.description).join("; ") :
    "taking deep breaths, asking for help, breaking tasks into small steps";

  return `You are writing a therapeutic children's story for ${personName}, age ${personAge}.

STORY REQUIREMENTS:
- Age level: ${ageLevel}
- **CRITICAL: Each day's story MUST be ${wordCount} words (minimum ${wordCount.split('-')[0]} words)**
- 7-day serialized story (one fragment per day, Monday-Sunday)
- Main character mirrors ${personName}'s age and strengths: ${strengthsText}
- Character faces challenge similar to: ${triggerText}
- Character discovers strategies: ${strategiesText}
- Each fragment ends with mini-cliffhanger (except Sunday)
- DO NOT write short paragraphs - write full, engaging stories of ${wordCount} words per day

THERAPEUTIC DESIGN PRINCIPLE:
The story creates a "therapeutic mirror" - the character faces ${personName}'s challenges, but it feels psychologically safe because "it's about someone else." Questions about the character become a bridge to self-reflection.

STORY STRUCTURE (7-Day Arc):
Day 1 (Monday): Introduce character, world, establish normalcy
Day 2 (Tuesday): Challenge emerges (mirrors the trigger)
Day 3 (Wednesday): First attempt, partial success or setback
Day 4 (Thursday): Discovery of helpful strategy
Day 5 (Friday): Success with help, feeling proud
Day 6 (Saturday): Continued growth and practice
Day 7 (Sunday): Resolution and lesson learned

THERAPEUTIC GOALS:
- Character demonstrates it's okay to struggle
- Character shows asking for help is brave
- Character's feelings are validated
- Character grows through experience, not despite it
- Emotions are named and normalized

STORY REFLECTION QUESTIONS (5-7 questions):
Create questions about the character that prompt self-reflection:
1. Challenge identification: "What was hard for [Character]?"
2. Courage recognition: "What brave thing did [Character] do?"
3. Strategy naming: "What helped [Character] feel better?"
4. Connection bridge: "Have you ever felt like [Character]?"
5. Self-compassion: "What would you tell [Character] if they were your friend?"

CHARACTER DESIGN:
- Choose an animal or child character that feels relatable
- Character should be same age as ${personName}
- Character demonstrates documented strengths
- Character's personality mirrors positive traits

OUTPUT FORMAT - CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no comments, no additional text, no markdown code blocks
2. All 7 days must be complete - do not use placeholders like "..." or comments
3. Include 5-7 complete reflection questions
4. Escape all quotes inside strings properly
5. Do not include any explanatory text before or after the JSON

JSON STRUCTURE (all fields required):
{
  "title": "Story title here",
  "characterName": "Character name",
  "characterDescription": "Brief description",
  "characterAge": ${personAge},
  "storyTheme": "one of: transitions, courage, friendship, problem-solving, emotions, boundaries, growth, self-compassion",
  "ageAppropriateLevel": "${ageLevel}",
  "readingLevel": "Ages ${Math.max(3, personAge - 2)}-${personAge + 2}",
  "estimatedReadTime": 15,
  "dailyFragments": [
    {
      "day": "monday",
      "dayNumber": 1,
      "fragmentText": "Complete story text for day 1 here",
      "illustrationPrompt": "Visual description for AI image generation",
      "wordCount": 100,
      "estimatedReadTime": 2,
      "pairedActivityId": null
    }
    (INCLUDE ALL 7 DAYS: monday, tuesday, wednesday, thursday, friday, saturday, sunday)
  ],
  "reflectionQuestions": [
    {
      "id": "q1",
      "questionText": "What was hard for [Character]?",
      "category": "challenge",
      "purposeNote": "Helps identify and name challenges"
    }
    (INCLUDE 5-7 COMPLETE QUESTIONS)
  ],
  "mirrorsContent": {
    "primaryTrigger": "${primaryTrigger?.id || null}",
    "strategiesUsed": ${JSON.stringify((whatWorks || []).map((s) => s.id))},
    "strengthsHighlighted": ${JSON.stringify(strengths)}
  }
}

IMPORTANT:
- Keep language age-appropriate for ${personAge} year old
- Character should feel like a friend, not a lesson
- Story should be engaging and fun first, therapeutic second
- **EACH DAY MUST BE ${wordCount} WORDS - DO NOT write shorter fragments**
- Write complete, engaging narratives - not brief summaries
- Illustration prompts should describe scenes visually for AI image generation
- RETURN ONLY VALID JSON WITH NO COMMENTS OR EXTRA TEXT`;
}

/**
 * Build prompt for generating daily parent strategies (aligned with child's story)
 */
function buildDailyStrategiesPrompt(personName, personAge, storyData, triggers, whatWorks) {
  const triggersText = triggers.length > 0 ?
    triggers.map((t) => `- ${t.description} (${t.severity})`).join("\n") :
    "None documented";

  const strategiesText = whatWorks.length > 0 ?
    whatWorks.map((s) => `- ${s.description} (${s.effectiveness}/5)`).join("\n") :
    "None documented";

  // Extract story progression
  const storyProgression = storyData.dailyFragments.map((f, idx) =>
    `Day ${idx + 1} (${f.day}): ${f.fragmentText.substring(0, 100)}...`
  ).join("\n");

  return `You are creating daily parenting strategies for a parent of ${personName} (age ${personAge}).

CONTEXT:
This week, ${personName} will be reading a story called "${storyData.title}" about ${storyData.characterName}, ${storyData.characterDescription}.

STORY PROGRESSION:
${storyProgression}

DOCUMENTED TRIGGERS:
${triggersText}

WHAT WORKS (Effective Strategies):
${strategiesText}

YOUR TASK:
Generate 7 daily parenting strategies (Monday-Sunday) that:
1. Align with what's happening in ${storyData.characterName}'s story each day
2. Give parents concrete ways to support ${personName} through similar situations
3. Practice the documented "what works" strategies
4. Address the documented triggers proactively
5. Connect the story to real parenting moments

Each daily strategy should:
- Have a clear, actionable title
- Describe what parent should focus on/practice that day
- Explain how it connects to the story
- Provide 2-3 practical tips
- Be achievable in the context of daily life

OUTPUT FORMAT (JSON):
{
  "dailyStrategies": [
    {
      "day": "monday",
      "dayNumber": 1,
      "strategyTitle": "Notice Without Judgment",
      "strategyDescription": "Today, practice observing ${personName}'s emotions without immediately trying to fix them, just like ${storyData.characterName}'s parent notices their feelings in today's story.",
      "connectionToStory": "In today's story, ${storyData.characterName} wakes up feeling grumpy. Practice noticing and naming ${personName}'s emotions without judgment.",
      "practicalTips": [
        "When you notice an emotion, name it: 'I see you're feeling frustrated'",
        "Wait 5 seconds before offering solutions",
        "Validate the feeling: 'It makes sense you'd feel that way'"
      ],
      "linkedToTrigger": "trigger-id-if-applicable",
      "linkedToWhatWorks": "strategy-id-if-applicable"
    },
    // ... 6 more days
  ]
}

IMPORTANT:
- Each strategy should feel doable and specific
- Connect to the story but also stand alone as parenting guidance
- Use ${personName}'s name and ${storyData.characterName}'s name explicitly
- Strategies should build on each other across the week
- Return ONLY valid JSON, no additional text`;
}

/**
 * Generate story illustrations using specified model (async)
 * Supports: dalle-3-standard (default), nano-banana-pro, stable-diffusion-3.5, gpt-image-1-mini
 */
async function generateAndSaveIllustrations(
    childWorkbookId,
    storyData,
    personAge,
    illustrationModel = 'dalle-3-standard'
) {
  const logger = require("firebase-functions/logger");

  try {
    logger.info(`Starting illustration generation for workbook ${childWorkbookId} with model: ${illustrationModel}`);

    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const illustrations = [];

    // Generate all 7 illustrations
    for (let i = 0; i < storyData.dailyFragments.length; i++) {
      const fragment = storyData.dailyFragments[i];

      logger.info(`Generating illustration ${i + 1}/7: ${fragment.day}`);

      // Build illustration prompt
      const characterRef = i === 0 ?
        `Introduce ${storyData.characterName}, ${storyData.characterDescription}. This is the first illustration, establish character design.` :
        `Continue with ${storyData.characterName} (${storyData.characterDescription}) from previous illustrations. Maintain exact same character appearance, colors, and style.`;

      const fullPrompt = `
Children's book illustration in watercolor style:

${characterRef}

Scene: ${fragment.illustrationPrompt}

Style requirements:
- Watercolor or soft digital painting aesthetic
- Warm, friendly, inviting colors
- Age-appropriate for ${personAge} years old
- No scary or threatening elements
- Whimsical and playful tone
- High detail in character, moderate detail in background
- Picture book quality (professional children's book standard)

Composition:
- Main character clearly visible and expressive
- Clear emotion/action readable by young children
- Background supports but doesn't overwhelm story

Technical:
- High resolution (1024x1024 minimum)
- Consistent character proportions and colors across series
- Safe for children, warm and comforting overall tone
`;

      try {
        let imageBuffer;

        // Route to appropriate model
        switch (illustrationModel) {
          case 'dalle-3-standard': {
            const { OpenAI } = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const response = await openai.images.generate({
              model: 'dall-e-3',
              prompt: fullPrompt,
              n: 1,
              size: '1024x1024',
              quality: 'standard',
              response_format: 'url',
            });

            // Download the image
            const imageUrl = response.data[0].url;
            const imageResponse = await fetch(imageUrl);
            imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            break;
          }

          case 'nano-banana-pro': {
            const genAI = getGoogleAI();
            if (!genAI) {
              throw new Error('GOOGLE_AI_API_KEY not configured');
            }

            const model = genAI.getGenerativeModel({
              model: "gemini-3-pro-image-preview",
            });

            const result = await model.generateContent(fullPrompt);
            const image = await result.response.image();
            imageBuffer = Buffer.from(await image.arrayBuffer());
            break;
          }

          case 'stable-diffusion-3.5':
          case 'gpt-image-1-mini': {
            // TODO: Implement when Stability AI SDK is added
            logger.warn(`Model ${illustrationModel} not yet implemented, marking as pending`);
            illustrations.push({
              url: null,
              day: fragment.day,
              dayNumber: i + 1,
              status: "pending",
            });
            continue;
          }

          default:
            throw new Error(`Unsupported illustration model: ${illustrationModel}`);
        }

        // Upload to Firebase Storage
        const filename = `story-illustrations/${childWorkbookId}/day-${i + 1}-${fragment.day}.png`;
        const file = bucket.file(filename);

        await file.save(imageBuffer, {
          metadata: {
            contentType: "image/png",
            metadata: {
              characterName: storyData.characterName,
              day: fragment.day,
              workbookId: childWorkbookId,
              model: illustrationModel,
            },
          },
        });

        // Make file publicly readable
        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        illustrations.push({
          url: publicUrl,
          day: fragment.day,
          dayNumber: i + 1,
        });

        logger.info(`Illustration ${i + 1}/7 generated: ${publicUrl}`);

      } catch (error) {
        logger.error(`Failed to generate illustration for day ${i + 1}:`, error);
        illustrations.push({
          url: null,
          day: fragment.day,
          dayNumber: i + 1,
          status: "failed",
        });
      }
    }

    // Update child workbook with illustration URLs
    const childWorkbookRef = db.collection("child_workbooks").doc(childWorkbookId);
    const workbook = await childWorkbookRef.get();

    if (!workbook.exists) {
      throw new Error(`Child workbook ${childWorkbookId} not found`);
    }

    const weeklyStory = workbook.data().weeklyStory;

    // Update each fragment with its illustration
    weeklyStory.dailyFragments = weeklyStory.dailyFragments.map((fragment, idx) => ({
      ...fragment,
      illustrationUrl: illustrations[idx]?.url || null,
      illustrationStatus: illustrations[idx]?.url ? "complete" : (illustrations[idx]?.status || "failed"),
    }));

    await childWorkbookRef.update({
      weeklyStory: weeklyStory,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const successCount = illustrations.filter(i => i.url).length;
    logger.info(`Successfully generated ${successCount}/7 illustrations using ${illustrationModel}`);

  } catch (error) {
    logger.error("Illustration generation failed:", error);

    // Mark all illustrations as failed
    const db = admin.firestore();
    const childWorkbookRef = db.collection("child_workbooks").doc(childWorkbookId);
    const workbook = await childWorkbookRef.get();

    if (workbook.exists) {
      const weeklyStory = workbook.data().weeklyStory;
      weeklyStory.dailyFragments = weeklyStory.dailyFragments.map((fragment) => ({
        ...fragment,
        illustrationStatus: "failed",
      }));

      await childWorkbookRef.update({
        weeklyStory: weeklyStory,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    }
  }
}

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

/**
 * Extract draft onboarding answers from uploaded personal documents.
 *
 * Privacy: Raw documents are received as base64 in the request payload,
 * processed transiently with Claude, and never persisted to any storage.
 * Only structured answers keyed to existing question IDs are returned.
 */
exports.extractDraftFromDocuments = onCall(
    {
      region: "us-central1",
      memory: "1GiB",
      timeoutSeconds: 180,
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const {personId, personName, files} = request.data;
      if (!personId || !files || !Array.isArray(files) || files.length === 0) {
        throw new Error("personId and files are required");
      }
      if (files.length > 5) {
        throw new Error("Maximum 5 files allowed");
      }

      // Build content blocks for Claude from uploaded files
      const contentBlocks = [];

      for (const file of files) {
        if (!file.base64Data || !file.mimeType) {
          continue;
        }

        if (file.mimeType === "text/plain") {
          // Text files: decode base64 to string
          const text = Buffer.from(file.base64Data, "base64").toString("utf-8");
          contentBlocks.push({
            type: "text",
            text: `--- Document: ${file.name || "text file"} ---\n${text}`,
          });
        } else if (file.mimeType === "application/pdf") {
          contentBlocks.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: file.base64Data,
            },
          });
        } else if (file.mimeType.startsWith("image/")) {
          contentBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: file.mimeType,
              data: file.base64Data,
            },
          });
        }
      }

      if (contentBlocks.length === 0) {
        throw new Error("No valid files to process");
      }

      // Add the extraction instructions after the document content
      contentBlocks.push({
        type: "text",
        text: `Based on the documents above, extract answers for the following self-onboarding questions.
Write answers in first person as if ${personName || "the person"} wrote them directly.
If the documents don't contain relevant information for a question, return null for that question.
Do NOT reference the source documents, their type, therapy, journaling, or any context about where this information came from.
Answers should be concise (1-3 sentences) and feel natural, like someone describing themselves.

Also identify any answers that touch on sensitive topics (sexuality, intimacy, trauma, substance use, relationship grievances, embarrassing personal details, mental health diagnoses) and return them in a "sensitiveFields" array — these will be auto-marked as private for the user's protection.

SECTIONS AND QUESTIONS:

Section "overview" (About You):
  "overview_q1": "What do you enjoy? What brings you joy or energy?"
  "overview_q2": "What do you dislike or find draining?"
  "overview_q3": "What drives or motivates you?"
  "overview_q4": "What makes you feel comfortable vs. uncomfortable?"

Section "triggers" (Your Triggers & Patterns):
  "triggers_q1": "Describe a recent time you became stressed or upset. What happened?"
  "triggers_q2": "What situations or transitions tend to be challenging for you?"
  "triggers_q3": "What typically helps when you're struggling?"

Section "what_works" (What Works for You):
  "works_q1": "What do you need from the people around you to feel supported?"
  "works_q2": "Think of a time things went really well at home. What made the difference?"
  "works_q3": "What motivates or excites you?"

Section "boundaries" (Your Boundaries & Needs):
  "boundaries_q1": "What boundaries are important to you?"
  "boundaries_q2": "What do others need to know to interact well with you?"
  "boundaries_q3": "What approaches or behaviors should be avoided with you?"

Section "communication" (How You Communicate):
  "communication_q1": "How do you prefer to communicate when something is bothering you?"
  "communication_q2": "How do you show love or appreciation?"
  "communication_q3": "How do you prefer to receive love or appreciation?"

Return ONLY valid JSON with this exact structure:
{
  "answers": {
    "overview": { "overview_q1": "answer or null", "overview_q2": "answer or null", "overview_q3": "answer or null", "overview_q4": "answer or null" },
    "triggers": { "triggers_q1": "answer or null", "triggers_q2": "answer or null", "triggers_q3": "answer or null" },
    "what_works": { "works_q1": "answer or null", "works_q2": "answer or null", "works_q3": "answer or null" },
    "boundaries": { "boundaries_q1": "answer or null", "boundaries_q2": "answer or null", "boundaries_q3": "answer or null" },
    "communication": { "communication_q1": "answer or null", "communication_q2": "answer or null", "communication_q3": "answer or null" }
  },
  "sensitiveFields": [{ "sectionId": "...", "questionId": "..." }]
}`,
      });

      try {
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: contentBlocks,
            },
          ],
        });

        const content = response.content[0].text;

        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (parseErr) {
          console.error("Failed to parse extraction response:", content);
          throw new Error("Failed to parse AI response");
        }

        // Build populatedFields map (sectionId -> questionId[] where answer is not null)
        const populatedFields = {};
        const answers = parsed.answers || {};
        for (const [sectionId, sectionAnswers] of Object.entries(answers)) {
          const populated = [];
          for (const [qId, answer] of Object.entries(sectionAnswers || {})) {
            if (answer !== null && answer !== undefined && answer !== "null") {
              populated.push(qId);
            } else {
              // Normalize null-string to actual null
              answers[sectionId][qId] = null;
            }
          }
          if (populated.length > 0) {
            populatedFields[sectionId] = populated;
          }
        }

        return {
          success: true,
          answers,
          populatedFields,
          sensitiveFields: parsed.sensitiveFields || [],
        };
      } catch (err) {
        console.error("Document extraction error:", err);
        throw new Error(`Document extraction failed: ${err.message}`);
      }
    },
);

// ==================== Growth Items System ====================

/**
 * Generate a batch of growth items (micro-activities + reflection prompts)
 * based on synthesis gaps and blind spots.
 *
 * Can be called manually or triggered after synthesis completes.
 * Reads all person_manuals for the family, identifies actionable gaps,
 * and generates concrete growth items via Claude.
 */
exports.generateGrowthBatch = onCall(
    {
      region: "us-central1",
      memory: "512MiB",
      timeoutSeconds: 120,
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const logger = require("firebase-functions/logger");
      const db = admin.firestore();

      // Get user and family
      const userDoc = await db
          .collection("users")
          .doc(request.auth.uid)
          .get();
      if (!userDoc.exists) {
        throw new Error("User not found");
      }
      const userData = userDoc.data();
      const familyId = userData.familyId;
      if (!familyId) {
        throw new Error("User has no family");
      }

      // Fetch all person manuals with synthesis for this family
      const manualsSnap = await db
          .collection("person_manuals")
          .where("familyId", "==", familyId)
          .get();

      if (manualsSnap.empty) {
        return {success: false, message: "No manuals found"};
      }

      // Collect all insights (gaps + blind spots) across manuals
      const allInsights = [];
      const manualMap = {};

      manualsSnap.forEach((doc) => {
        const manual = doc.data();
        manualMap[doc.id] = manual;
        const synth = manual.synthesizedContent;
        if (!synth) return;

        const addInsights = (items, type) => {
          for (const item of (items || [])) {
            allInsights.push({
              ...item,
              insightType: type,
              manualId: doc.id,
              personName: manual.personName,
              personId: manual.personId,
            });
          }
        };

        addInsights(synth.gaps, "gap");
        addInsights(synth.blindSpots, "blind_spot");
        // Include alignments at lower priority for reflection prompts
        addInsights(synth.alignments, "alignment");
      });

      if (allInsights.length === 0) {
        return {success: false, message: "No synthesis insights found"};
      }

      // Check recent growth items to avoid repeating topics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentItemsSnap = await db
          .collection("growth_items")
          .where("familyId", "==", familyId)
          .where("createdAt", ">=",
              admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
          .get();

      const recentInsightIds = new Set();
      const recentFeedback = [];
      recentItemsSnap.forEach((doc) => {
        const item = doc.data();
        if (item.sourceInsightId) {
          recentInsightIds.add(item.sourceInsightId);
        }
        if (item.feedback) {
          recentFeedback.push({
            title: item.title,
            reaction: item.feedback.reaction,
            impactRating: item.feedback.impactRating,
            sourceInsightId: item.sourceInsightId,
          });
        }
      });

      // Score and select insights
      const scoredInsights = allInsights
          .map((insight) => {
            let score = 0;
            // Prioritize by type
            if (insight.insightType === "blind_spot") score += 3;
            if (insight.insightType === "gap") score += 2;
            if (insight.insightType === "alignment") score += 0.5;
            // Prioritize by severity
            if (insight.gapSeverity === "significant_gap") score += 2;
            if (insight.gapSeverity === "minor_gap") score += 1;
            // Penalize recently addressed
            if (recentInsightIds.has(insight.id)) score -= 5;
            // Penalize "doesnt_fit" feedback
            const rejected = recentFeedback.find(
                (f) => f.sourceInsightId === insight.id &&
                       f.reaction === "doesnt_fit",
            );
            if (rejected) score -= 10;
            return {...insight, score};
          })
          .filter((i) => i.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

      if (scoredInsights.length === 0) {
        return {
          success: false,
          message: "No actionable insights (all recently addressed)",
        };
      }

      // Get people for context
      const peopleSnap = await db
          .collection("people")
          .where("familyId", "==", familyId)
          .get();
      const people = {};
      peopleSnap.forEach((doc) => {
        people[doc.id] = doc.data();
      });

      // Identify spouse pairs and build relational context
      const spouses = Object.entries(people)
          .filter(([, p]) => p.relationshipType === "spouse" ||
            p.relationshipType === "self");
      const children = Object.entries(people)
          .filter(([, p]) => p.relationshipType === "child");

      // Build cross-manual relational narratives
      let relationalContext = "";

      if (spouses.length >= 2) {
        // Find the two adult manuals and cross-reference
        const spouseManuals = spouses
            .map(([id]) => {
              const manual = Object.values(manualMap).find(
                  (m) => m.personId === id,
              );
              return manual ? {personId: id, manual} : null;
            })
            .filter(Boolean);

        if (spouseManuals.length >= 2) {
          const [a, b] = spouseManuals;

          relationalContext += "\n=== RELATIONAL DYNAMICS ===\n";

          // Each person alone: their individual synthesis
          relationalContext += `\n[${a.manual.personName} AS INDIVIDUAL]\n`;
          const aSynth = a.manual.synthesizedContent;
          if (aSynth) {
            relationalContext +=
              `Overview: ${aSynth.overview}\n`;
            relationalContext +=
              `Key gaps: ${(aSynth.gaps || []).map((g) => g.topic + " — " + g.synthesis).join("; ")}\n`;
            relationalContext +=
              `Blind spots: ${(aSynth.blindSpots || []).map((bs) => bs.topic + " — " + bs.synthesis).join("; ")}\n`;
          }

          relationalContext += `\n[${b.manual.personName} AS INDIVIDUAL]\n`;
          const bSynth = b.manual.synthesizedContent;
          if (bSynth) {
            relationalContext +=
              `Overview: ${bSynth.overview}\n`;
            relationalContext +=
              `Key gaps: ${(bSynth.gaps || []).map((g) => g.topic + " — " + g.synthesis).join("; ")}\n`;
            relationalContext +=
              `Blind spots: ${(bSynth.blindSpots || []).map((bs) => bs.topic + " — " + bs.synthesis).join("; ")}\n`;
          }

          // The couple together: cross-reference gaps
          relationalContext += `\n[${a.manual.personName} & ${b.manual.personName} AS A COUPLE]\n`;
          relationalContext +=
            "Look for: where their individual gaps interact, " +
            "where one person's blind spot is the other's " +
            "frustration, where communication styles clash " +
            "or complement.\n";

          // If they have children, add co-parenting context
          if (children.length > 0) {
            const childNames = children
                .map(([, p]) => p.name).join(", ");
            relationalContext += `\n[${a.manual.personName} & ${b.manual.personName} AS PARENTS TO ${childNames}]\n`;
            relationalContext +=
              "Consider: where their parenting approaches " +
              "diverge, how their individual stress patterns " +
              "affect the kids, where they need to be more " +
              "aligned.\n";

            // Add child manual insights if available
            for (const [childId, childData] of children) {
              const childManual = Object.values(manualMap).find(
                  (m) => m.personId === childId,
              );
              if (childManual && childManual.synthesizedContent) {
                const cs = childManual.synthesizedContent;
                relationalContext +=
                  `\n${childData.name}'s key insights: `;
                relationalContext +=
                  `${cs.overview || "N/A"}\n`;
                const childGaps = (cs.gaps || [])
                    .map((g) => g.topic).join(", ");
                if (childGaps) {
                  relationalContext +=
                    `${childData.name}'s gaps: ${childGaps}\n`;
                }
              }
            }
          }
        }

        // Check for relationship manual data
        const relManualSnap = await db
            .collection("relationship_manuals")
            .where("familyId", "==", familyId)
            .get();

        if (!relManualSnap.empty) {
          relManualSnap.forEach((doc) => {
            const rm = doc.data();
            relationalContext +=
              `\n[RELATIONSHIP MANUAL: ${rm.relationshipTitle || "Couple"}]\n`;
            if (rm.conflictPatterns && rm.conflictPatterns.length > 0) {
              relationalContext += "Conflict patterns:\n";
              for (const cp of rm.conflictPatterns) {
                relationalContext +=
                  `- ${cp.pattern} (${cp.severity}): ` +
                  `helps: ${(cp.whatHelps || []).join(", ")}; ` +
                  `worsens: ${(cp.whatMakesWorse || []).join(", ")}\n`;
              }
            }
            if (rm.connectionStrategies &&
                rm.connectionStrategies.length > 0) {
              relationalContext += "Connection strategies:\n";
              for (const cs of rm.connectionStrategies) {
                relationalContext +=
                  `- ${cs.strategy} (effectiveness: ${cs.effectiveness}/5)\n`;
              }
            }
            if (rm.sharedGoals && rm.sharedGoals.length > 0) {
              relationalContext += "Shared goals:\n";
              for (const g of rm.sharedGoals.filter(
                  (sg) => sg.status === "active")) {
                relationalContext += `- ${g.title}: ${g.description}\n`;
              }
            }
          });
        }
      }

      // Build prompt sections
      const insightsContext = scoredInsights.map((i) => {
        return `- [${i.insightType.toUpperCase()}] About ${i.personName}: "${i.topic}" — ${i.synthesis} (severity: ${i.gapSeverity || "N/A"})`;
      }).join("\n");

      const feedbackContext = recentFeedback.length > 0 ?
        "\n\nRecent feedback on previous growth items:\n" +
        recentFeedback.slice(0, 5).map((f) => {
          const impact = f.impactRating ?
            ` (impact: ${["slight", "noticeable", "breakthrough"][f.impactRating - 1]})` : "";
          return `- "${f.title}" → ${f.reaction}${impact}`;
        }).join("\n") : "";

      const familyContext = Object.values(people).map((p) => {
        return `- ${p.name} (${p.relationshipType || "other"})`;
      }).join("\n");

      const prompt = `You are a warm, practical family growth coach. You understand that families are systems — individual patterns affect relationships, and relationship dynamics affect individuals.

FAMILY MEMBERS:
${familyContext}
${relationalContext}

INDIVIDUAL SYNTHESIS INSIGHTS:
${insightsContext}
${feedbackContext}

Based on all of this context — both individual insights AND relational dynamics — generate 3-5 growth items. Think about THREE levels:

1. INDIVIDUAL: What does each person need to work on for themselves?
2. COUPLE: Where do their patterns collide? What could they try together?
3. FAMILY: How do the adults' dynamics affect the kids? What parenting alignment is needed?

Each item should be one of:
- "micro_activity": A specific 1-3 minute action (e.g., "Tonight, before responding to Iris's request, pause and ask 'What do you need from me right now — action or listening?'")
- "reflection_prompt": A 1-tap emoji check-in (e.g., "How connected did you feel to Scott today?")

Return JSON:
{
  "items": [
    {
      "type": "micro_activity" or "reflection_prompt",
      "title": "Short title (under 60 chars)",
      "body": "1-3 sentences of warm, specific instruction. Be concrete — name names, suggest specific times of day, describe exactly what to do or say. Connect it to the actual pattern or gap you're addressing.",
      "emoji": "Single emoji that captures the spirit",
      "targetPersonNames": ["Name of person(s) this is about"],
      "sourceInsightId": "The insight ID this addresses (from INDIVIDUAL SYNTHESIS INSIGHTS above)",
      "relationalLevel": "individual" or "couple" or "family",
      "speed": "ambient" (for micro daily moments) or "intentional" (for deeper weekly activities),
      "estimatedMinutes": 1-5
    }
  ]
}

Rules:
- Use actual names from the family — never generic
- At least one item should be couple-focused (if two adults exist)
- Micro-activities should fit natural daily moments (bedtime, dinner, car ride, morning coffee)
- Reflection prompts should be answerable with a single emoji tap
- Activities should feel like natural outgrowths of the observations, not homework
- Connect each activity to a specific pattern or gap — the user should feel "ah, this is about THAT thing"
- Tone: warm, practical, never clinical or preachy
- Return ONLY valid JSON, no markdown`;

      try {
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{role: "user", content: prompt}],
        });

        const content = response.content[0].text;

        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (parseErr) {
          logger.error("Failed to parse growth batch response:", content);
          throw new Error("Failed to parse AI response");
        }

        const items = parsed.items || [];
        if (items.length === 0) {
          return {success: false, message: "AI generated no items"};
        }

        // Write items to Firestore
        const batchId = `batch-${Date.now()}`;
        const now = admin.firestore.Timestamp.now();
        const batch = db.batch();
        const createdItems = [];

        // Schedule items across the next few days
        const scheduleOffsets = [0, 1, 2, 3, 4]; // days from now

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const ref = db.collection("growth_items").doc();

          // Find the insight this addresses
          const sourceInsight = scoredInsights.find(
              (si) => si.id === item.sourceInsightId,
          );

          // Calculate schedule date
          const scheduleDate = new Date();
          scheduleDate.setDate(
              scheduleDate.getDate() + (scheduleOffsets[i] || i),
          );
          scheduleDate.setHours(
              item.speed === "ambient" ? 9 : 18, 0, 0, 0,
          );

          // Calculate expiry
          const expiresAt = new Date(scheduleDate);
          if (item.speed === "ambient") {
            expiresAt.setHours(expiresAt.getHours() + 24);
          } else {
            expiresAt.setDate(expiresAt.getDate() + 7);
          }

          // Find targetPersonIds from names
          const targetPersonIds = (item.targetPersonNames || []).map(
              (name) => {
                const match = Object.entries(people).find(
                    ([, p]) => p.name.toLowerCase() ===
                      name.toLowerCase(),
                );
                return match ? match[0] : null;
              },
          ).filter(Boolean);

          const growthItem = {
            growthItemId: ref.id,
            familyId,
            type: item.type || "micro_activity",
            title: item.title || "",
            body: item.body || "",
            emoji: item.emoji || "✨",
            targetPersonIds,
            targetPersonNames: item.targetPersonNames || [],
            assignedToUserId: request.auth.uid,
            assignedToUserName: userData.displayName ||
              userData.name || "Parent",
            sourceInsightId: item.sourceInsightId || null,
            sourceInsightType: sourceInsight ?
              sourceInsight.insightType : null,
            sourceManualId: sourceInsight ?
              sourceInsight.manualId : null,
            sourceGapSeverity: sourceInsight ?
              sourceInsight.gapSeverity : null,
            relationalLevel: item.relationalLevel || "individual",
            speed: item.speed || "ambient",
            scheduledDate:
              admin.firestore.Timestamp.fromDate(scheduleDate),
            expiresAt:
              admin.firestore.Timestamp.fromDate(expiresAt),
            estimatedMinutes: item.estimatedMinutes || 2,
            status: "active",
            createdAt: now,
            generatedBy: "ai",
            batchId,
          };

          batch.set(ref, growthItem);
          createdItems.push(growthItem);
        }

        await batch.commit();

        logger.info(
            `Generated ${createdItems.length} growth items ` +
            `for family ${familyId}`,
        );

        return {
          success: true,
          itemCount: createdItems.length,
          items: createdItems,
        };
      } catch (err) {
        logger.error("Growth batch generation error:", err);
        throw new Error(`Growth batch generation failed: ${err.message}`);
      }
    },
);

// ==================== Dimension Assessment & Growth Arcs ====================

/**
 * Dimension definitions (mirrored from client config for server use).
 * Maps existing onboarding question IDs to relationship health dimensions.
 */
const DIMENSION_QUESTION_MAPPINGS = {
  // Couple dimensions
  love_maps: {
    questionIds: ["overview_q1", "overview_q2", "overview_q3", "overview_q4"],
    domain: "couple",
    name: "Love Maps",
  },
  fondness_admiration: {
    questionIds: ["communication_q2", "communication_q3"],
    domain: "couple",
    name: "Fondness & Admiration",
  },
  turning_toward: {
    questionIds: ["what_works_q1", "what_works_q2"],
    domain: "couple",
    name: "Turning Toward",
  },
  conflict_style: {
    questionIds: [
      "triggers_q1", "triggers_q2", "boundaries_q1", "communication_q1",
    ],
    domain: "couple",
    name: "Conflict Style",
  },
  emotional_accessibility: {
    questionIds: ["what_works_q1", "boundaries_q2", "communication_q1"],
    domain: "couple",
    name: "Emotional Accessibility",
  },
  emotional_responsiveness: {
    questionIds: ["triggers_q3", "what_works_q3", "communication_q1"],
    domain: "couple",
    name: "Emotional Responsiveness",
  },
  attachment_security: {
    questionIds: ["boundaries_q1", "boundaries_q3", "communication_q1"],
    domain: "couple",
    name: "Attachment Security",
  },
  shared_meaning: {
    questionIds: ["overview_q3"],
    domain: "couple",
    name: "Shared Meaning",
  },
  practical_partnership: {
    questionIds: ["boundaries_q1", "what_works_q1"],
    domain: "couple",
    name: "Practical Partnership",
  },
  negative_cycles: {
    questionIds: ["triggers_q1", "triggers_q2", "communication_q1"],
    domain: "couple",
    name: "Negative Cycles",
  },
  // Parent-child dimensions
  warmth_responsiveness: {
    questionIds: [
      "overview_q1", "what_works_q1", "communication_q2", "communication_q3",
    ],
    domain: "parent_child",
    name: "Warmth & Responsiveness",
  },
  structure_consistency: {
    questionIds: ["triggers_q2", "boundaries_q1", "boundaries_q2"],
    domain: "parent_child",
    name: "Structure & Consistency",
  },
  autonomy_support: {
    questionIds: ["what_works_q1", "what_works_q3", "overview_q3"],
    domain: "parent_child",
    name: "Autonomy Support",
  },
  repair_after_rupture: {
    questionIds: ["triggers_q3", "what_works_q2"],
    domain: "parent_child",
    name: "Repair After Rupture",
  },
  mindsight: {
    questionIds: ["overview_q3", "overview_q4", "triggers_q1"],
    domain: "parent_child",
    name: "Mindsight",
  },
};

/**
 * Seed dimension assessments for a family.
 * Uses Claude to analyze contributions and synthesis data,
 * producing meaningful per-dimension scores (not heuristic defaults).
 */
exports.seedDimensionAssessments = onCall(
    {
      region: "us-central1",
      memory: "1GiB",
      timeoutSeconds: 180,
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const logger = require("firebase-functions/logger");
      const db = admin.firestore();

      // Get user and family
      const userDoc = await db.collection("users")
          .doc(request.auth.uid).get();
      if (!userDoc.exists) throw new Error("User not found");
      const familyId = userDoc.data().familyId;
      if (!familyId) throw new Error("User has no family");

      // Get people
      const peopleSnap = await db.collection("people")
          .where("familyId", "==", familyId).get();
      const people = {};
      peopleSnap.forEach((doc) => {
        people[doc.id] = doc.data();
      });

      // Get all completed contributions
      const contribSnap = await db.collection("contributions")
          .where("familyId", "==", familyId)
          .where("status", "==", "complete")
          .get();

      const contributions = [];
      contribSnap.forEach((doc) => contributions.push(doc.data()));

      // Get existing synthesis data from manuals
      const manualsSnap = await db.collection("person_manuals")
          .where("familyId", "==", familyId).get();
      const manuals = {};
      manualsSnap.forEach((doc) => {
        manuals[doc.id] = doc.data();
      });

      // Identify relationship pairs
      const spouses = Object.entries(people)
          .filter(([, p]) =>
            p.relationshipType === "spouse" ||
            p.relationshipType === "self");
      const children = Object.entries(people)
          .filter(([, p]) => p.relationshipType === "child");

      // Build context for Claude to score dimensions
      // Gather all contribution text and synthesis data
      let contextForAI = "";

      for (const contrib of contributions) {
        const person = people[contrib.personId];
        const personName = person ? person.name : "Unknown";
        const perspective = contrib.perspectiveType === "self" ?
          `${personName} about themselves` :
          `${contrib.contributorName} about ${personName}`;
        contextForAI += `\n[${perspective}]\n`;
        for (const [section, answers] of
          Object.entries(contrib.answers || {})) {
          if (typeof answers !== "object" || answers === null) continue;
          for (const [, answer] of Object.entries(answers)) {
            const text = typeof answer === "string" ?
              answer : (answer && answer.primary) ?
                String(answer.primary) : null;
            if (text && text.trim()) {
              contextForAI += `- ${text.trim()}\n`;
            }
          }
        }
      }

      // Add synthesis data
      for (const manual of Object.values(manuals)) {
        const synth = manual.synthesizedContent;
        if (!synth) continue;
        contextForAI += `\n[Synthesis for ${manual.personName}]\n`;
        contextForAI += `Overview: ${synth.overview || "N/A"}\n`;
        for (const gap of (synth.gaps || [])) {
          contextForAI += `Gap: ${gap.topic} — ${gap.synthesis} ` +
            `(${gap.gapSeverity})\n`;
        }
        for (const bs of (synth.blindSpots || [])) {
          contextForAI += `Blind spot: ${bs.topic} — ${bs.synthesis}\n`;
        }
        for (const al of (synth.alignments || [])) {
          contextForAI += `Alignment: ${al.topic} — ${al.synthesis}\n`;
        }
      }

      // Build relationship pairs to score
      const pairsToScore = [];
      if (spouses.length >= 2) {
        const [a, b] = spouses;
        pairsToScore.push({
          ids: [a[0], b[0]],
          names: [a[1].name, b[1].name],
          domain: "couple",
          dimensions: Object.entries(DIMENSION_QUESTION_MAPPINGS)
              .filter(([, d]) => d.domain === "couple")
              .map(([id, d]) => ({id, name: d.name})),
        });
      }
      for (const [childId, childData] of children) {
        for (const [parentId, parentData] of spouses) {
          pairsToScore.push({
            ids: [parentId, childId],
            names: [parentData.name, childData.name],
            domain: "parent_child",
            dimensions: Object.entries(DIMENSION_QUESTION_MAPPINGS)
                .filter(([, d]) => d.domain === "parent_child")
                .map(([id, d]) => ({id, name: d.name})),
          });
        }
      }

      if (pairsToScore.length === 0) {
        return {success: false, message: "No relationship pairs found"};
      }

      // Ask Claude to score all dimensions based on the data
      const dimensionList = pairsToScore.map((pair) => {
        return `\n${pair.names.join(" & ")} (${pair.domain}):\n` +
          pair.dimensions.map((d) => `  - ${d.id}: ${d.name}`).join("\n");
      }).join("\n");

      const scoringPrompt = `You are a relationship assessment expert. Based on the following data about a family, score each relationship dimension on a 1.0-5.0 scale.

FAMILY DATA:
${contextForAI.slice(0, 6000)}

DIMENSIONS TO SCORE:
${dimensionList}

Score each dimension based on the evidence. Use the FULL range:
- 1.0-2.0: Clear problems, frequent negative patterns
- 2.0-3.0: Some struggles, inconsistent
- 3.0-4.0: Generally healthy, room for growth
- 4.0-5.0: Strong, consistent positive patterns

Also provide a 1-sentence narrative for each relationship pair summarizing their dynamic.

Return JSON:
{
  "pairs": [
    {
      "names": ["Name1", "Name2"],
      "domain": "couple",
      "narrative": "Warm 1-2 sentence summary of this relationship's strengths and growth areas.",
      "scores": {
        "dimension_id": 3.5,
        "another_dimension": 2.1
      }
    }
  ]
}

Be honest and differentiated — NOT all 3.0. Use the actual data. If you see conflict patterns, score conflict_style LOW. If you see warmth, score warmth HIGH. Every pair should have a different profile.
Return ONLY valid JSON.`;

      try {
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{role: "user", content: scoringPrompt}],
        });

        const content = response.content[0].text;
        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (parseErr) {
          logger.error("Failed to parse scoring response:", content);
          throw new Error("Failed to parse AI scoring response");
        }

        const now = admin.firestore.Timestamp.now();
        const assessmentsToCreate = [];

        for (const pairResult of (parsed.pairs || [])) {
          // Match to our pair data
          const matchedPair = pairsToScore.find((p) =>
            p.names.every((n) => pairResult.names.includes(n)) &&
            p.domain === pairResult.domain,
          );
          if (!matchedPair) continue;

          for (const dim of matchedPair.dimensions) {
            const score = pairResult.scores?.[dim.id];
            if (score === undefined) continue;

            const clampedScore = Math.max(1.0,
                Math.min(5.0, Math.round(score * 10) / 10));

            assessmentsToCreate.push({
              familyId,
              dimensionId: dim.id,
              domain: matchedPair.domain,
              participantIds: matchedPair.ids,
              participantNames: matchedPair.names,
              currentScore: clampedScore,
              confidence: "medium",
              dataPointCount: contributions.length,
              scoreHistory: [{
                score: clampedScore,
                confidence: "medium",
                timestamp: now,
                trigger: "initial",
              }],
              dataSources: [{
                sourceType: "onboarding_answer",
                sourceId: "ai_initial_assessment",
                signal: clampedScore,
                weight: 1.0,
                capturedAt: now,
              }],
              assessmentProgress: {
                promptsDelivered: [],
                promptsAnswered: [],
                existingDataUsed: true,
              },
              narrative: pairResult.narrative || null,
              completedArcIds: [],
              createdAt: now,
              updatedAt: now,
              lastAssessedAt: now,
            });
          }
        }

        // Upsert: update existing assessments or create new ones
        const existingSnap = await db
            .collection("dimension_assessments")
            .where("familyId", "==", familyId).get();
        const existingMap = {};
        existingSnap.forEach((doc) => {
          const d = doc.data();
          const key = `${d.dimensionId}:${(d.participantIds || []).sort().join(",")}`;
          existingMap[key] = doc.ref;
        });

        const batch = db.batch();
        let created = 0;
        let updated = 0;
        for (const assessment of assessmentsToCreate) {
          const key = `${assessment.dimensionId}:${assessment.participantIds.sort().join(",")}`;
          const existingRef = existingMap[key];
          if (existingRef) {
            // SAFE UPDATE: only touch scores, never delete anything.
            // Preserves: completedArcIds, activeArcId, assessmentProgress,
            // and all other fields. Appends to scoreHistory (never replaces).
            batch.update(existingRef, {
              currentScore: assessment.currentScore,
              confidence: assessment.confidence,
              narrative: assessment.narrative || null,
              lastAssessedAt: now,
              updatedAt: now,
              scoreHistory: admin.firestore.FieldValue.arrayUnion(
                  assessment.scoreHistory[0],
              ),
            });
            updated++;
          } else {
            const ref = db.collection("dimension_assessments").doc();
            assessment.assessmentId = ref.id;
            batch.set(ref, assessment);
            created++;
          }
        }
        await batch.commit();

        logger.info(
            `Dimension assessments for family ${familyId}: ` +
            `${created} created, ${updated} updated`,
        );

        return {
          success: true,
          assessmentCount: assessmentsToCreate.length,
          dimensions: assessmentsToCreate.map((a) => ({
            dimensionId: a.dimensionId,
            domain: a.domain,
            score: a.currentScore,
            confidence: a.confidence,
            participants: a.participantNames,
          })),
        };
      } catch (err) {
        logger.error("Dimension assessment seeding error:", err);
        throw new Error(
            `Dimension assessment seeding failed: ${err.message}`,
        );
      }
    },
);

/**
 * Generate a Growth Arc — a structured multi-week learning course
 * targeting a specific relationship health dimension.
 *
 * Selects the weakest dimension, generates a phased arc via Claude,
 * and creates all growth items with arc linkage.
 */
exports.generateGrowthArc = onCall(
    {
      region: "us-central1",
      memory: "1GiB",
      timeoutSeconds: 180,
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("Authentication required");
      }

      const logger = require("firebase-functions/logger");
      const db = admin.firestore();

      // Get user and family
      const userDoc = await db.collection("users")
          .doc(request.auth.uid).get();
      if (!userDoc.exists) throw new Error("User not found");
      const userData = userDoc.data();
      const familyId = userData.familyId;
      if (!familyId) throw new Error("User has no family");

      // Optional: allow specifying a dimension
      const requestedDimension = request.data?.dimensionId || null;

      // Get all dimension assessments for this family
      const assessSnap = await db.collection("dimension_assessments")
          .where("familyId", "==", familyId).get();

      if (assessSnap.empty) {
        return {
          success: false,
          message: "No dimension assessments found. Run seedDimensionAssessments first.",
        };
      }

      const assessments = [];
      assessSnap.forEach((doc) => assessments.push(doc.data()));

      // Check for active arcs (max 2 per family)
      const activeArcsSnap = await db.collection("growth_arcs")
          .where("familyId", "==", familyId)
          .where("status", "==", "active")
          .get();

      if (activeArcsSnap.size >= 2) {
        return {
          success: false,
          message: "Maximum 2 active arcs. Complete or pause one first.",
        };
      }

      // Select dimension to target
      let selectedAssessment;

      if (requestedDimension) {
        selectedAssessment = assessments.find(
            (a) => a.dimensionId === requestedDimension && !a.activeArcId,
        );
        if (!selectedAssessment) {
          return {
            success: false,
            message: `Dimension ${requestedDimension} not found or already has active arc`,
          };
        }
      } else {
        // Priority algorithm: lowest score * confidence multiplier
        const scored = assessments
            .filter((a) => !a.activeArcId)
            .map((a) => {
              const confMult = a.confidence === "high" ? 1.0 :
                a.confidence === "medium" ? 0.8 : 0.5;
              const recency = a.completedArcIds.length > 0 ? 0.7 : 1.0;
              const priority =
                (5.0 - a.currentScore) * confMult * recency;
              return {...a, priority};
            })
            .sort((a, b) => b.priority - a.priority);

        selectedAssessment = scored[0];
      }

      if (!selectedAssessment) {
        return {success: false, message: "No eligible dimensions to address"};
      }

      const dimId = selectedAssessment.dimensionId;
      const dimDef = DIMENSION_QUESTION_MAPPINGS[dimId];

      // Determine arc level
      const previousArcs = selectedAssessment.completedArcIds.length;
      const level = Math.min(3, previousArcs + 1);
      const durationWeeks = level === 1 ? 2 : 3;

      // Get people and manuals for context
      const peopleSnap = await db.collection("people")
          .where("familyId", "==", familyId).get();
      const people = {};
      peopleSnap.forEach((doc) => {
        people[doc.id] = doc.data();
      });

      const manualsSnap = await db.collection("person_manuals")
          .where("familyId", "==", familyId).get();

      let synthesisContext = "";
      manualsSnap.forEach((doc) => {
        const m = doc.data();
        if (selectedAssessment.participantIds.includes(m.personId) &&
            m.synthesizedContent) {
          const s = m.synthesizedContent;
          synthesisContext +=
            `\n${m.personName}'s synthesis: ${s.overview || "N/A"}`;
          if (s.gaps?.length) {
            synthesisContext +=
              `\nGaps: ${s.gaps.map((g) => g.topic + " — " + g.synthesis).join("; ")}`;
          }
          if (s.blindSpots?.length) {
            synthesisContext +=
              `\nBlind spots: ${s.blindSpots.map((bs) => bs.topic + " — " + bs.synthesis).join("; ")}`;
          }
        }
      });

      // Get recent feedback context
      const recentItemsSnap = await db.collection("growth_items")
          .where("familyId", "==", familyId)
          .where("dimensionId", "==", dimId)
          .get();

      let feedbackContext = "";
      recentItemsSnap.forEach((doc) => {
        const item = doc.data();
        if (item.feedback) {
          feedbackContext +=
            `\n- "${item.title}" → ${item.feedback.reaction}` +
            (item.feedback.impactRating ?
              ` (impact: ${item.feedback.impactRating}/3)` : "");
        }
      });

      // Dimension-specific guidance (inline from config)
      const dimensionGuidance = {
        love_maps: {
          research: "Gottman's Sound Relationship House Level 1. " +
            "Couples who maintain detailed 'love maps' — mental " +
            "models of each other's world — weather life transitions " +
            "better. 86% of couples who turn toward bids stay together.",
          awareness: "Notice how much you know about your partner's " +
            "current inner world",
          practice: "Ask open-ended questions and listen without solving",
          integration: "Build a habit of daily curiosity",
          exercises: "love map questions, daily check-ins, " +
            "open-ended conversation starters",
        },
        fondness_admiration: {
          research: "Gottman Level 2. The antidote to contempt " +
            "(the #1 predictor of divorce). 5:1 positive-to-negative " +
            "ratio in conflict predicts lasting relationships.",
          awareness: "Track appreciation vs. criticism flow",
          practice: "Daily specific appreciation — not generic",
          integration: "Shift scanning from 'what's wrong' to " +
            "'what's right'",
          exercises: "admiration list, daily appreciation, " +
            "gratitude sharing",
        },
        conflict_style: {
          research: "Gottman's Four Horsemen: criticism, contempt, " +
            "defensiveness, stonewalling. Each has a researched " +
            "antidote: gentle startup, appreciation, responsibility, " +
            "self-soothing.",
          awareness: "Identify which Horsemen appear in your conflicts",
          practice: "Replace each with its antidote",
          integration: "Develop a shared fair-fight protocol",
          exercises: "horseman spotting, gentle startup practice, " +
            "repair attempts, 20-min breaks",
        },
        negative_cycles: {
          research: "EFT 'Demon Dialogues' (Sue Johnson). " +
            "Pursue-Withdraw is most common. The cycle is the enemy, " +
            "not each other.",
          awareness: "Name your cycle — see it, don't blame",
          practice: "Express the emotion underneath the behavior",
          integration: "Build shared language: 'there it is again'",
          exercises: "cycle mapping, raw spot identification, " +
            "underneath-the-anger conversation",
        },
        // Simplified entries for other dimensions
        turning_toward: {research: "Gottman Level 3 — bid responsiveness"},
        emotional_accessibility: {research: "EFT A.R.E. — Accessibility"},
        emotional_responsiveness: {research: "EFT A.R.E. — Responsiveness"},
        attachment_security: {research: "Adult attachment theory"},
        shared_meaning: {research: "Gottman Levels 6-7"},
        practical_partnership: {research: "PREPARE/ENRICH scales"},
        warmth_responsiveness: {research: "Baumrind + SDT warmth axis"},
        structure_consistency: {research: "Baumrind structure axis + SDT"},
        autonomy_support: {research: "SDT autonomy support dimension"},
        repair_after_rupture: {research: "Siegel — repair after rupture"},
        mindsight: {research: "Siegel reflective functioning"},
      };

      const guidance = dimensionGuidance[dimId] || {};
      const participantNames =
        selectedAssessment.participantNames.join(" & ");
      const levelTitle = level === 1 ? "Foundations" :
        level === 2 ? "Deepening" : "Mastery";

      const prompt = `You are designing a structured ${durationWeeks}-week Growth Arc (a mini-course) for the "${dimDef.name}" dimension of ${participantNames}'s ${dimDef.domain === "couple" ? "relationship" : "parent-child relationship"}.

RESEARCH BASIS:
${guidance.research || dimDef.name + " — see research literature"}

ARC LEVEL: ${level} (${levelTitle})
${level === 1 ? "This is their first time working on this dimension. Start with basics." : level === 2 ? "They've done a foundations arc. Go deeper." : "They've done two arcs. Focus on mastery and subtle refinement."}

CURRENT ASSESSMENT:
Score: ${selectedAssessment.currentScore}/5.0 (confidence: ${selectedAssessment.confidence})
Participants: ${participantNames}
${synthesisContext}
${feedbackContext ? "\nPrevious feedback on this dimension:" + feedbackContext : ""}

DATA CONFIDENCE: ${selectedAssessment.confidence}
${selectedAssessment.confidence === "low" ? "IMPORTANT: We have limited data on this dimension. The arc should include extra reflection_prompt and assessment_prompt items that help us LEARN about this area — not just practice it. Ask open-ended questions that reveal how they experience this dimension. Every response teaches us something." : selectedAssessment.confidence === "medium" ? "We have moderate data. Include 1-2 reflection prompts that deepen our understanding of nuances." : "We have good data. Focus on practice and growth."}

Generate a ${durationWeeks}-week Growth Arc with exactly 3 phases:

1. AWARENESS (Week 1): 3-4 items to help them notice the pattern
   - Item 1 MUST be an assessment_prompt: a self-rating question about this dimension (this is the pre-assessment)
   - Then reflection_prompts and 1 micro_activity
   ${selectedAssessment.confidence === "low" ? "- Include an extra reflection_prompt that asks them to describe their experience in this area in their own words" : ""}

2. PRACTICE (Week ${durationWeeks === 2 ? "1-2" : "2"}): 3-4 items that build new skills
   - Concrete micro_activities using their actual names
   - Build on awareness phase insights
   - After each micro_activity, the NEXT item should be a reflection_prompt asking "how did that go?" — this captures real data about their experience

3. INTEGRATION (Week ${durationWeeks}): 2-3 items that cement the change
   - Include a micro_activity that tests their progress
   - LAST item MUST be an assessment_prompt: the SAME self-rating question as item 1 (this is the post-assessment)

Return JSON:
{
  "arc": {
    "title": "Short arc title (under 50 chars)",
    "subtitle": "One line describing what they'll learn",
    "emoji": "Single emoji",
    "outcomeStatement": "After this arc, [specific felt outcome]. (e.g., 'After this, hard conversations should feel safer between you and Iris.')"
  },
  "items": [
    {
      "type": "assessment_prompt" | "micro_activity" | "reflection_prompt",
      "title": "Short title (under 60 chars)",
      "body": "1-3 sentences. Be concrete — use their names, suggest times, describe exactly what to do.",
      "emoji": "Single emoji",
      "targetPersonNames": ["Name(s)"],
      "phase": "awareness" | "practice" | "integration",
      "week": 1-${durationWeeks},
      "dayOffset": 0-${durationWeeks * 7},
      "isAssessment": true/false,
      "speed": "ambient" | "intentional",
      "estimatedMinutes": 1-10,
      "relationalLevel": "individual" | "couple" | "family"
    }
  ]
}

Rules:
- Use actual names — never generic
- Activities should feel like natural outgrowths, not homework
- The pre and post assessment questions MUST be identical for measuring progress
- For ${dimDef.domain === "couple" ? "couple" : "parent-child"} dimension: activities should involve both participants
- Tone: warm, practical, never clinical
- ${durationWeeks === 2 ? "8-10" : "10-12"} items total
- Return ONLY valid JSON`;

      try {
        const client = getAnthropic();
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2500,
          messages: [{role: "user", content: prompt}],
        });

        const content = response.content[0].text;

        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (parseErr) {
          logger.error("Failed to parse arc response:", content);
          throw new Error("Failed to parse AI response");
        }

        const arcData = parsed.arc || {};
        const items = parsed.items || [];

        if (items.length === 0) {
          return {success: false, message: "AI generated no items"};
        }

        // Create the arc document
        const now = admin.firestore.Timestamp.now();
        const startDate = new Date();
        const targetEndDate = new Date();
        targetEndDate.setDate(targetEndDate.getDate() + durationWeeks * 7);

        const arcRef = db.collection("growth_arcs").doc();
        const arcItemRefs = [];
        const batch = db.batch();

        // Create growth items
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemRef = db.collection("growth_items").doc();

          // Calculate schedule date from dayOffset
          const schedDate = new Date(startDate);
          schedDate.setDate(schedDate.getDate() + (item.dayOffset || i));
          schedDate.setHours(
              item.speed === "ambient" ? 9 : 18, 0, 0, 0,
          );

          const expiresAt = new Date(schedDate);
          if (item.speed === "ambient") {
            expiresAt.setHours(expiresAt.getHours() + 48);
          } else {
            expiresAt.setDate(expiresAt.getDate() + 7);
          }

          // Find targetPersonIds
          const targetPersonIds = (item.targetPersonNames || []).map(
              (name) => {
                const match = Object.entries(people).find(
                    ([, p]) => p.name.toLowerCase() ===
                      name.toLowerCase(),
                );
                return match ? match[0] : null;
              },
          ).filter(Boolean);

          const growthItem = {
            growthItemId: itemRef.id,
            familyId,
            type: item.type || "micro_activity",
            title: item.title || "",
            body: item.body || "",
            emoji: item.emoji || "✨",
            targetPersonIds,
            targetPersonNames: item.targetPersonNames || [],
            assignedToUserId: request.auth.uid,
            assignedToUserName: userData.displayName ||
              userData.name || "Parent",
            sourceInsightId: null,
            sourceInsightType: null,
            sourceManualId: null,
            sourceGapSeverity: null,
            relationalLevel: item.relationalLevel || "couple",
            speed: item.speed || "ambient",
            scheduledDate:
              admin.firestore.Timestamp.fromDate(schedDate),
            expiresAt:
              admin.firestore.Timestamp.fromDate(expiresAt),
            estimatedMinutes: item.estimatedMinutes || 3,
            status: "active",
            createdAt: now,
            generatedBy: "ai",
            // Arc linkage
            arcId: arcRef.id,
            arcPhase: item.phase || "awareness",
            arcSequence: i + 1,
            dimensionId: dimId,
            isAssessmentItem: item.isAssessment || false,
          };

          batch.set(itemRef, growthItem);

          arcItemRefs.push({
            growthItemId: itemRef.id,
            sequenceNumber: i + 1,
            phase: item.phase || "awareness",
            week: item.week || 1,
            isRequired: true,
            isAssessment: item.isAssessment || false,
          });
        }

        // Build phase definitions
        const phases = [
          {
            phase: "awareness",
            weekStart: 1,
            weekEnd: 1,
            title: "Notice the Pattern",
            description: guidance.awareness ||
              "Observe and become aware",
            itemCount: items.filter(
                (i) => i.phase === "awareness").length,
          },
          {
            phase: "practice",
            weekStart: durationWeeks === 2 ? 1 : 2,
            weekEnd: durationWeeks === 2 ? 2 : durationWeeks - 1,
            title: "Build New Skills",
            description: guidance.practice || "Practice new approaches",
            itemCount: items.filter(
                (i) => i.phase === "practice").length,
          },
          {
            phase: "integration",
            weekStart: durationWeeks,
            weekEnd: durationWeeks,
            title: "Cement the Change",
            description: guidance.integration ||
              "Integrate into daily life",
            itemCount: items.filter(
                (i) => i.phase === "integration").length,
          },
        ];

        const arcDoc = {
          arcId: arcRef.id,
          familyId,
          dimensionId: dimId,
          dimensionName: dimDef.name,
          domain: dimDef.domain,
          participantIds: selectedAssessment.participantIds,
          participantNames: selectedAssessment.participantNames,
          title: arcData.title || `Working on ${dimDef.name}`,
          subtitle: arcData.subtitle || "",
          emoji: arcData.emoji || "🎯",
          outcomeStatement: arcData.outcomeStatement || "",
          researchBasis: guidance.research || "",
          level,
          levelTitle,
          durationWeeks,
          startDate: admin.firestore.Timestamp.fromDate(startDate),
          targetEndDate:
            admin.firestore.Timestamp.fromDate(targetEndDate),
          phases,
          arcItems: arcItemRefs,
          status: "active",
          currentPhase: "awareness",
          currentWeek: 1,
          preScore: selectedAssessment.currentScore,
          preConfidence: selectedAssessment.confidence,
          graduationCriteria: {
            minItemsCompleted: Math.ceil(items.length * 0.6),
            minPositiveReactions: Math.ceil(items.length * 0.4),
            minScoreImprovement: 0.5,
            targetPostScore: Math.min(5.0,
                selectedAssessment.currentScore + 1.0),
          },
          completedItemCount: 0,
          totalItemCount: items.length,
          averageImpactRating: 0,
          positiveReactionCount: 0,
          createdAt: now,
          updatedAt: now,
          generatedBy: "ai",
        };

        batch.set(arcRef, arcDoc);

        // Update the dimension assessment with activeArcId
        const assessRef = db.collection("dimension_assessments")
            .doc(selectedAssessment.assessmentId);
        batch.update(assessRef, {
          activeArcId: arcRef.id,
          updatedAt: now,
        });

        await batch.commit();

        logger.info(
            `Generated Growth Arc "${arcDoc.title}" ` +
            `(${items.length} items, ${durationWeeks} weeks) ` +
            `for ${dimDef.name} in family ${familyId}`,
        );

        return {
          success: true,
          arcId: arcRef.id,
          title: arcDoc.title,
          dimensionId: dimId,
          dimensionName: dimDef.name,
          level,
          itemCount: items.length,
          durationWeeks,
        };
      } catch (err) {
        logger.error("Growth arc generation error:", err);
        throw new Error(`Growth arc generation failed: ${err.message}`);
      }
    },
);

// ==================== Feedback Processing Pipeline ====================

/**
 * Process growth item feedback — the critical data pipeline.
 *
 * Every growth item response does double duty:
 * 1. Updates dimension assessment scores (feedback is signal)
 * 2. Writes back to person manuals (progress notes, pattern updates)
 * 3. Updates arc progress when items belong to arcs
 * 4. Triggers re-synthesis when enough new data accumulates
 *
 * Fires on every growth_items document update where feedback was added.
 */
exports.processGrowthFeedback = onDocumentUpdated(
    {
      document: "growth_items/{itemId}",
      region: "us-central1",
      memory: "256MiB",
    },
    async (event) => {
      const logger = require("firebase-functions/logger");
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      const before = event.data.before.data();
      const after = event.data.after.data();

      // Only process when feedback is newly added
      if (!after.feedback || before.feedback) return;

      const feedback = after.feedback;
      const itemId = event.params.itemId;

      logger.info(
          `Processing feedback on growth item ${itemId}: ` +
          `${feedback.reaction}`,
      );

      // ---- 1. UPDATE DIMENSION ASSESSMENT ----

      if (after.dimensionId) {
        // Find the relevant dimension assessment
        const assessSnap = await db.collection("dimension_assessments")
            .where("familyId", "==", after.familyId)
            .where("dimensionId", "==", after.dimensionId)
            .get();

        if (!assessSnap.empty) {
          const assessDoc = assessSnap.docs[0];
          const assessment = assessDoc.data();

          // Convert feedback reaction to a score signal
          let signal;
          if (feedback.reaction === "loved_it") {
            // Positive signal — things are improving
            signal = feedback.impactRating === 3 ? 4.5 :
              feedback.impactRating === 2 ? 4.0 : 3.5;
          } else if (feedback.reaction === "tried_it") {
            signal = feedback.impactRating === 3 ? 4.0 :
              feedback.impactRating === 2 ? 3.5 : 3.0;
          } else if (feedback.reaction === "doesnt_fit") {
            // Negative — the suggestion missed, dimension may be worse
            signal = 2.0;
          } else {
            // "not_now" — no score signal, skip
            signal = null;
          }

          if (signal !== null) {
            const newSource = {
              sourceType: "growth_feedback",
              sourceId: itemId,
              signal,
              weight: 0.8, // Feedback is high-quality recent signal
              capturedAt: now,
            };

            const updatedSources = [
              ...(assessment.dataSources || []),
              newSource,
            ];
            const updatedCount = updatedSources.length;

            // Recalculate weighted average
            const totalWeight = updatedSources.reduce(
                (sum, s) => sum + s.weight, 0,
            );
            const newScore = updatedSources.reduce(
                (sum, s) => sum + (s.signal * s.weight), 0,
            ) / totalWeight;
            const clampedScore = Math.max(1.0,
                Math.min(5.0, Math.round(newScore * 10) / 10));

            const confidence = updatedCount >= 5 ? "high" :
              updatedCount >= 3 ? "medium" : "low";

            await assessDoc.ref.update({
              dataSources: updatedSources,
              dataPointCount: updatedCount,
              currentScore: clampedScore,
              confidence,
              lastAssessedAt: now,
              updatedAt: now,
              scoreHistory: admin.firestore.FieldValue.arrayUnion({
                score: clampedScore,
                confidence,
                timestamp: now,
                trigger: "feedback_signal",
              }),
            });

            logger.info(
                `Updated ${after.dimensionId} score: ` +
                `${assessment.currentScore} → ${clampedScore}`,
            );
          }
        }
      }

      // ---- 2. WRITE BACK TO PERSON MANUAL ----

      // Positive feedback on gap-sourced items → create ManualProgressNote
      if (after.sourceManualId &&
          (feedback.reaction === "loved_it" ||
           feedback.reaction === "tried_it") &&
          feedback.impactRating && feedback.impactRating >= 2) {
        const manualRef = db.collection("person_manuals")
            .doc(after.sourceManualId);
        const manualDoc = await manualRef.get();

        if (manualDoc.exists) {
          const progressNote = {
            id: `growth-${itemId}-${Date.now()}`,
            date: now,
            note: `Growth activity "${after.title}" — ` +
              `${feedback.reaction === "loved_it" ? "loved it" : "tried it"}` +
              `${feedback.impactRating === 3 ? " (breakthrough)" :
                feedback.impactRating === 2 ? " (noticeable impact)" : ""}` +
              `${feedback.note ? ". Note: " + feedback.note : ""}`,
            category: feedback.impactRating === 3 ?
              "milestone" : "improvement",
            addedBy: "ai",
          };

          await manualRef.update({
            progressNotes: admin.firestore.FieldValue.arrayUnion(
                progressNote,
            ),
            updatedAt: now,
          });

          logger.info(
              `Added progress note to manual ${after.sourceManualId}`,
          );
        }
      }

      // "Doesn't fit" feedback → mark this source insight as problematic
      if (after.sourceInsightId && feedback.reaction === "doesnt_fit") {
        // Track suppressed insights in the growth item for future avoidance
        // (The generateGrowthBatch already checks for doesnt_fit feedback)
        logger.info(
            `Insight ${after.sourceInsightId} marked as "doesn't fit"`,
        );
      }

      // ---- 3. UPDATE ARC PROGRESS ----

      if (after.arcId && feedback.reaction !== "not_now") {
        const arcRef = db.collection("growth_arcs").doc(after.arcId);
        const arcDoc = await arcRef.get();

        if (arcDoc.exists) {
          const arc = arcDoc.data();
          const isPositive = feedback.reaction === "loved_it" ||
            feedback.reaction === "tried_it";

          const updates = {
            completedItemCount: (arc.completedItemCount || 0) + 1,
            updatedAt: now,
          };

          if (isPositive) {
            updates.positiveReactionCount =
              (arc.positiveReactionCount || 0) + 1;
          }

          // Update average impact rating
          if (feedback.impactRating) {
            const prevTotal = (arc.averageImpactRating || 0) *
              (arc.completedItemCount || 0);
            updates.averageImpactRating =
              (prevTotal + feedback.impactRating) /
              ((arc.completedItemCount || 0) + 1);
          }

          // Determine current phase from sequence
          if (after.arcPhase) {
            updates.currentPhase = after.arcPhase;
          }

          // Check if arc is complete
          const newCompletedCount = updates.completedItemCount;
          if (newCompletedCount >= arc.totalItemCount) {
            updates.status = "completed";
            updates.actualEndDate = now;

            // Clear the active arc from dimension assessment
            const assessSnap2 = await db
                .collection("dimension_assessments")
                .where("familyId", "==", arc.familyId)
                .where("dimensionId", "==", arc.dimensionId)
                .get();

            if (!assessSnap2.empty) {
              const assessDoc2 = assessSnap2.docs[0];
              const assessment2 = assessDoc2.data();

              await assessDoc2.ref.update({
                activeArcId: null,
                completedArcIds: admin.firestore.FieldValue.arrayUnion(
                    arc.arcId,
                ),
                updatedAt: now,
                scoreHistory: admin.firestore.FieldValue.arrayUnion({
                  score: assessment2.currentScore,
                  confidence: assessment2.confidence,
                  timestamp: now,
                  trigger: "arc_completion",
                }),
              });

              // Store post-score on the arc
              updates.postScore = assessment2.currentScore;
              updates.postConfidence = assessment2.confidence;

              logger.info(
                  `Arc ${after.arcId} completed. ` +
                  `Pre: ${arc.preScore} → Post: ${assessment2.currentScore}`,
              );
            }
          }

          await arcRef.update(updates);
        }
      }

      // ---- 4. TRIGGER RE-SYNTHESIS IF ENOUGH DATA ----

      // Count recent positive feedback for this manual
      if (after.sourceManualId &&
          (feedback.reaction === "loved_it" ||
           feedback.reaction === "tried_it")) {
        const recentFeedbackSnap = await db.collection("growth_items")
            .where("sourceManualId", "==", after.sourceManualId)
            .where("status", "==", "completed")
            .get();

        let positiveCount = 0;
        let lastSynthDate = null;
        recentFeedbackSnap.forEach((doc) => {
          const item = doc.data();
          if (item.feedback &&
              (item.feedback.reaction === "loved_it" ||
               item.feedback.reaction === "tried_it")) {
            positiveCount++;
          }
        });

        // Get the manual's last synthesis date
        const manualDoc2 = await db.collection("person_manuals")
            .doc(after.sourceManualId).get();
        if (manualDoc2.exists) {
          const synth = manualDoc2.data().synthesizedContent;
          if (synth && synth.lastSynthesizedAt) {
            lastSynthDate = synth.lastSynthesizedAt.toDate();
          }
        }

        // Trigger re-synthesis if:
        // - 5+ positive feedback signals since last synthesis, OR
        // - Last synthesis was 14+ days ago with any new feedback
        const daysSinceSynth = lastSynthDate ?
          (Date.now() - lastSynthDate.getTime()) / (1000 * 60 * 60 * 24) :
          999;

        if (positiveCount >= 5 || (positiveCount >= 1 && daysSinceSynth >= 14)) {
          // Mark the manual as needing re-synthesis
          await db.collection("person_manuals")
              .doc(after.sourceManualId)
              .update({
                needsResynthesis: true,
                resynthesisReason: positiveCount >= 5 ?
                  "5+ positive growth signals accumulated" :
                  "New growth data + synthesis is 14+ days old",
                updatedAt: now,
              });

          logger.info(
              `Manual ${after.sourceManualId} flagged for re-synthesis ` +
              `(${positiveCount} positive signals, ` +
              `${Math.round(daysSinceSynth)} days since last synthesis)`,
          );
        }
      }

      // ---- 5. ASSESSMENT PROMPT RESPONSES → CONTRIBUTION DATA ----

      // When an assessment_prompt is answered, write the response
      // back as structured data that enriches the manual
      if (after.isAssessmentItem && after.dimensionId && feedback.note) {
        // Store assessment responses in dimension assessment's dataSources
        // The note field contains freeform text that's valuable context
        const assessSnap3 = await db.collection("dimension_assessments")
            .where("familyId", "==", after.familyId)
            .where("dimensionId", "==", after.dimensionId)
            .get();

        if (!assessSnap3.empty) {
          const assessDoc3 = assessSnap3.docs[0];
          await assessDoc3.ref.update({
            assessmentProgress: {
              ...assessDoc3.data().assessmentProgress,
              promptsAnswered: admin.firestore.FieldValue.arrayUnion(
                  itemId,
              ),
            },
            updatedAt: now,
          });
        }
      }
    },
);

/**
 * Staleness check — runs weekly to identify dimensions and manuals
 * that need fresh data. Generates targeted assessment prompts
 * as growth items to fill gaps.
 */
exports.refreshStaleData = onSchedule(
    {
      schedule: "0 10 * * 1", // Monday 10 AM weekly
      timeZone: "America/Los_Angeles",
      memory: "512MiB",
      secrets: ["ANTHROPIC_API_KEY"],
    },
    async () => {
      const logger = require("firebase-functions/logger");
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();

      // Get all families
      const familiesSnap = await db.collection("families").get();

      for (const familyDoc of familiesSnap.docs) {
        const familyId = familyDoc.id;

        // Get all dimension assessments for this family
        const assessSnap = await db.collection("dimension_assessments")
            .where("familyId", "==", familyId)
            .get();

        if (assessSnap.empty) continue;

        const staleAssessments = [];
        const lowConfidence = [];

        assessSnap.forEach((doc) => {
          const assessment = doc.data();
          const lastAssessed = assessment.lastAssessedAt?.toDate();
          const daysSince = lastAssessed ?
            (Date.now() - lastAssessed.getTime()) /
            (1000 * 60 * 60 * 24) : 999;

          // Flag stale: not assessed in 21+ days
          if (daysSince >= 21) {
            staleAssessments.push({...assessment, daysSince});
          }

          // Flag low confidence: need more data
          if (assessment.confidence === "low" &&
              !assessment.activeArcId) {
            lowConfidence.push(assessment);
          }
        });

        if (staleAssessments.length === 0 &&
            lowConfidence.length === 0) continue;

        // Get a family user to assign items to
        const usersSnap = await db.collection("users")
            .where("familyId", "==", familyId)
            .where("role", "==", "parent")
            .get();

        if (usersSnap.empty) continue;
        const assignee = usersSnap.docs[0].data();
        const assigneeId = usersSnap.docs[0].id;

        const batch = db.batch();
        let itemCount = 0;

        // Generate refresh prompts for stale dimensions (max 2 per week)
        const toRefresh = [
          ...lowConfidence.slice(0, 1),
          ...staleAssessments.slice(0, 1),
        ];

        for (const assessment of toRefresh) {
          const dimDef = DIMENSION_QUESTION_MAPPINGS[
              assessment.dimensionId
          ];
          if (!dimDef) continue;

          // Find an undelivered assessment prompt
          const delivered = new Set(
              assessment.assessmentProgress?.promptsDelivered || [],
          );

          // Create a simple check-in reflection prompt
          const schedDate = new Date();
          schedDate.setHours(10, 0, 0, 0);
          const expiresAt = new Date(schedDate);
          expiresAt.setDate(expiresAt.getDate() + 3);

          const ref = db.collection("growth_items").doc();
          const refreshItem = {
            growthItemId: ref.id,
            familyId,
            type: "reflection_prompt",
            title: `Quick check: ${dimDef.name}`,
            body: assessment.confidence === "low" ?
              `We'd love to know more about this area. ` +
              `How would you rate "${dimDef.name}" in your ` +
              `relationship right now?` :
              `It's been a while since we checked in on ` +
              `"${dimDef.name}." How are things in this area?`,
            emoji: "📊",
            targetPersonIds: assessment.participantIds || [],
            targetPersonNames: assessment.participantNames || [],
            assignedToUserId: assigneeId,
            assignedToUserName: assignee.name || "Parent",
            sourceInsightId: null,
            sourceInsightType: null,
            sourceManualId: null,
            sourceGapSeverity: null,
            relationalLevel: assessment.domain === "couple" ?
              "couple" : "family",
            speed: "ambient",
            scheduledDate:
              admin.firestore.Timestamp.fromDate(schedDate),
            expiresAt:
              admin.firestore.Timestamp.fromDate(expiresAt),
            estimatedMinutes: 1,
            status: "active",
            createdAt: now,
            generatedBy: "system",
            dimensionId: assessment.dimensionId,
            isAssessmentItem: true,
          };

          batch.set(ref, refreshItem);
          itemCount++;
        }

        // Also check for manuals flagged for re-synthesis
        const manualsSnap = await db.collection("person_manuals")
            .where("familyId", "==", familyId)
            .where("needsResynthesis", "==", true)
            .get();

        if (!manualsSnap.empty) {
          logger.info(
              `Family ${familyId} has ${manualsSnap.size} manuals ` +
              `needing re-synthesis`,
          );
          // Note: actual re-synthesis is triggered by user or
          // a separate scheduled function — we just flag it here
        }

        if (itemCount > 0) {
          await batch.commit();
          logger.info(
              `Generated ${itemCount} refresh items for ` +
              `family ${familyId}`,
          );
        }
      }
    },
);
