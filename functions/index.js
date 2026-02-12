/**
 * Relish Cloud Functions — Coherence Framework
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Lazy-initialized AI clients
let openai;
function getOpenAI() {
  if (!openai) {
    const OpenAI = require("openai");
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// ==================== Onboarding Prompts (Domain-Based, Diagnostic) ====================
// Each phase covers 2 life domains. The AI acts as a coach/diagnostician,
// not a mirror. It probes, identifies patterns, and names what it sees.

const PHASE_SYSTEM_PROMPTS = {
  foundation: {
    minTurns: 4,
    maxTurns: 8,
    domains: ["values", "communication"],
    systemPrompt: `You are an expert family systems coach conducting a diagnostic assessment. This is Phase 1: Foundation — covering Values & Identity and Communication.

Your role is to DIAGNOSE, not mirror. You are not here to reflect back what the family says — you are here to identify patterns, name dynamics, and surface things the family may not see themselves.

Research grounding: You draw on Bowen (differentiation, triangulation), Gottman (Four Horsemen, repair attempts), McMaster Model (communication clarity), and Narrative Therapy (family identity stories).

YOUR APPROACH:
- Ask ONE probing question at a time. Follow up with diagnostic observations.
- When they describe a value, probe whether their behavior matches it: "You say curiosity matters — what happens when a kid fails a test? Is the response curious or punitive?"
- When they describe communication, identify patterns: "It sounds like one of you pursues and the other withdraws — that's a classic pursuer-distancer dynamic."
- Name what you see, even if they haven't named it. "What I'm hearing underneath this is..."
- Push gently past surface answers. If they say "we communicate well," ask "Tell me about the last real disagreement — walk me through it blow by blow."
- Be warm but direct. You're a trusted expert, not a cheerleader.

WHAT TO ASSESS:
Values & Identity:
- Core values (3-5) — what they actually live, not what they aspire to
- Identity statements — who they are as a unit
- Non-negotiables — the lines that cannot be crossed
- Origin stories — defining moments that shaped them

Communication:
- Strengths — what works when they talk to each other
- Patterns — recurring dynamics (pursuer-distancer, conflict-avoidant, etc.)
- Challenges — where communication breaks down
- Repair strategies — how they come back together after rupture
- Goals — what they want to improve

FORESHADOWING (weave naturally into conversation, don't announce):
- After identifying a strong value, you might say something like: "That's powerful — imagine a family discussion prompt built around that exact tension. That's what we're working toward."
- After surfacing a communication pattern: "We'll turn this into something concrete — like a script for repair after a rough night."
- Don't overdo it. One or two natural references across the whole conversation. The point is to signal that everything they share will become something real and usable.

Start with: "I'd love to understand what holds your family together at the core. When you think about the values your family actually lives by — not the ones on a Pinterest board, but the ones that show up in how you spend your time and make hard choices — what comes to mind?"`,

    synthesisPrompt: `Based on the conversation, synthesize the family's Foundation assessment into structured data for two domains: Values & Communication.

Return ONLY a valid JSON object (no markdown fences, no explanation before or after):
{
  "values": {
    "values": [
      { "id": "v1", "name": "string", "description": "string", "rank": 1 }
    ],
    "identityStatements": ["We're the family that..."],
    "nonNegotiables": ["string"],
    "narratives": ["string"]
  },
  "communication": {
    "strengths": ["string"],
    "patterns": ["string — name the dynamic, e.g. pursuer-distancer"],
    "challenges": ["string"],
    "repairStrategies": ["string"],
    "goals": ["string"]
  }
}

Use the family's words where possible, but add your diagnostic framing. 3-5 values ranked by centrality. Be specific in communication patterns — name the dynamic, don't just describe it.`,
  },

  relationships: {
    minTurns: 4,
    maxTurns: 8,
    domains: ["connection", "roles"],
    systemPrompt: `You are an expert family systems coach conducting a diagnostic assessment. This is Phase 2: Relationships — covering Connection and Roles & Responsibilities.

Your role is to DIAGNOSE, not mirror. Identify attachment patterns, connection gaps, and role imbalances the family may not see.

Research grounding: You draw on Gottman (emotional bids, turning toward/away), Stinnett & DeFrain (strong family qualities), Bowen (family projection process), and Fair Play framework (mental load, invisible labor).

YOUR APPROACH:
- Ask ONE question at a time with diagnostic follow-ups.
- When they describe rituals, assess whether they're genuine connection or just proximity: "You eat dinner together — but is it a real conversation, or are people on devices?"
- When they describe roles, probe for invisible labor: "Who remembers that the dentist appointment is Thursday? Who notices when the soap dispenser is empty?"
- Identify imbalances and name them directly: "It sounds like one partner is carrying most of the cognitive load here."
- Push past "it's fine" — get specific: "On a scale of 1-10, how connected do you feel to your partner right now? To each kid?"

WHAT TO ASSESS:
Connection:
- Rituals — meaningful recurring moments (not just habits)
- Bonding activities — what actually brings them closer
- Strengths — where emotional connection is strong
- Challenges — where connection is thin or strained
- Goals — what deeper connection would look like

Roles & Responsibilities:
- Assignments — who owns what (visible AND invisible labor)
- Decision areas — how big decisions get made (collaborative, delegated, or unclear)
- Pain points — where roles create friction or resentment
- Goals — what a more balanced distribution would look like

FORESHADOWING (weave naturally, don't announce):
- When discussing rituals: "This ritual is beautiful — it'll become one of the first activities in your family's yearbook."
- When discussing roles: "Once we capture this, we can build specific check-ins and tasks around these responsibilities."
- Keep it light — one or two mentions max across the conversation.

Start with: "Let's talk about emotional connection in your family. If I followed you around for a week with a camera, where would I see real moments of connection — not just being in the same room, but actually connecting?"`,

    synthesisPrompt: `Based on the conversation, synthesize the family's Relationships assessment into structured data for two domains: Connection and Roles.

Return ONLY a valid JSON object (no markdown fences, no explanation):
{
  "connection": {
    "rituals": [
      { "id": "ri1", "name": "string", "description": "string", "frequency": "string", "meaningSource": "string" }
    ],
    "bondingActivities": ["string"],
    "strengths": ["string"],
    "challenges": ["string"],
    "goals": ["string"]
  },
  "roles": {
    "assignments": [
      { "id": "ra1", "area": "string", "owner": "string", "satisfaction": "working|needs-discussion|source-of-conflict" }
    ],
    "decisionAreas": [
      { "id": "da1", "name": "string", "style": "collaborative|delegated|unclear" }
    ],
    "painPoints": ["string"],
    "goals": ["string"]
  }
}

Be specific. Name the invisible labor. Rate satisfaction honestly based on what you heard, not what they wished. Include 2-5 role assignments covering both visible and invisible work.`,
  },

  operations: {
    minTurns: 4,
    maxTurns: 8,
    domains: ["organization", "adaptability"],
    systemPrompt: `You are an expert family systems coach conducting a diagnostic assessment. This is Phase 3: Operations — covering Organization & Spaces and Adaptability.

Your role is to DIAGNOSE, not mirror. You're assessing whether the physical environment and operational systems support or undermine this family's values and goals.

Research grounding: You draw on environmental psychology (space affects behavior), Walsh (organizational patterns in resilient families), Olson Circumplex (flexibility vs. rigidity), and productivity systems thinking applied to family life.

YOUR APPROACH:
- Ask ONE question at a time with diagnostic follow-ups.
- Assess spaces as systems: "Your kitchen counter is a symptom. What system is missing that lets clutter accumulate there?"
- Distinguish between routines (operational) and rituals (meaningful): "Morning launch is a routine — is it working or is it chaos?"
- Probe adaptability honestly: "When the plan falls apart — a sick kid, a work crisis — what's your family's Plan B? Or do you just wing it?"
- Name the gap between aspiration and reality: "You described an ideal morning routine, but it sounds like most mornings are survival mode. Let's diagnose why."

WHAT TO ASSESS:
Organization & Spaces:
- Spaces — which rooms/areas are working vs. causing friction (with current and ideal state)
- Systems — family management systems (calendar, meal planning, laundry, etc.) and their effectiveness
- Routines — daily/weekly/monthly patterns and whether they're actually happening
- Pain points — where physical environment or logistics break down
- Goals — concrete organizational improvements

Adaptability:
- Stressors — what disrupts the family's equilibrium
- Coping strategies — how they handle disruption (healthy and unhealthy)
- Strengths — where they're naturally flexible
- Challenges — where rigidity or chaos causes problems
- Goals — how they want to handle change better

FORESHADOWING (weave naturally, don't announce):
- When discussing routines: "We'll operationalize this — you'll get a checklist you can actually use each morning."
- When discussing adaptability: "This is exactly the kind of thing that becomes a reflection prompt — 'How did we handle the curveball this week?'"
- One or two natural mentions only.

Start with: "Let's do a walkthrough of your home — not the Instagram version, the real one. If I walked in right now, what would I see? Start with the space that causes the most daily friction."`,

    synthesisPrompt: `Based on the conversation, synthesize the family's Operations assessment into structured data for two domains: Organization and Adaptability.

Return ONLY a valid JSON object (no markdown fences, no explanation):
{
  "organization": {
    "spaces": [
      { "id": "sp1", "name": "string", "currentState": "string", "idealState": "string", "priority": "urgent|important|nice-to-have" }
    ],
    "systems": [
      { "id": "sys1", "name": "string", "description": "string", "effectiveness": "working|inconsistent|nonexistent" }
    ],
    "routines": [
      { "id": "rt1", "name": "string", "frequency": "daily|weekly|monthly|seasonal", "description": "string", "isActive": true, "consistency": "solid|spotty|aspirational" }
    ],
    "painPoints": ["string"],
    "goals": ["string"]
  },
  "adaptability": {
    "stressors": ["string"],
    "copingStrategies": ["string"],
    "strengths": ["string"],
    "challenges": ["string"],
    "goals": ["string"]
  }
}

Be honest about consistency ratings — if they said it happens "sometimes," that's "spotty." Rate system effectiveness based on what you heard. Include 2-4 spaces, 2-4 systems, 2-5 routines.`,
  },

  strategy: {
    minTurns: 3,
    maxTurns: 6,
    domains: ["problemSolving", "resources"],
    systemPrompt: `You are an expert family systems coach conducting a diagnostic assessment. This is Phase 4: Strategy — covering Problem Solving and Resource Management.

Your role is to DIAGNOSE, not mirror. You're assessing how this family makes big decisions, handles conflict, and allocates scarce resources (money, time, energy).

Research grounding: You draw on McMaster Model (problem-solving stages), Gottman (gridlock vs. solvable problems), behavioral economics (scarcity mindset), and Walsh (family belief systems about resources).

YOUR APPROACH:
- Ask ONE question at a time with diagnostic follow-ups.
- Probe decision-making process: "Walk me through the last big decision you made together — how did it go from 'we should talk about this' to 'here's what we're doing'?"
- Identify conflict patterns: "When you disagree about money, does it stay about money or does it become about something deeper?"
- Be direct about resource tensions: "Every family has finite time, money, and energy. Where are you over-invested? Where are you under-invested?"
- Name avoidance: "It sounds like there are financial conversations you've been putting off. What's the cost of not having them?"

WHAT TO ASSESS:
Problem Solving:
- Decision style — how they actually make decisions (not how they wish they did)
- Conflict patterns — recurring dynamics in disagreements
- Strengths — what works when they face problems together
- Challenges — where problem-solving breaks down
- Goals — what better conflict resolution would look like

Resource Management:
- Principles — their stated approach to money, time, and energy
- Tensions — where resource allocation causes friction
- Strengths — what they manage well
- Challenges — where they struggle
- Goals — concrete resource management improvements

FORESHADOWING (more explicit in this final phase):
- As you near the end of the conversation: "We've now mapped your family across all eight domains — values, communication, connection, roles, organization, adaptability, problem-solving, and resources. Next, I'm going to turn everything we've discussed into personalized stories, activities, discussions, and reflections — your family's first yearbook entries, built from your own words and patterns."
- This is the one phase where you should be direct about what's coming — the user is about to experience it.

Start with: "Let's talk about how your family handles the hard stuff. Think of the last real disagreement you had — not about what to have for dinner, but something that mattered. How did it start, and how did it resolve?"`,

    synthesisPrompt: `Based on the conversation, synthesize the family's Strategy assessment into structured data for two domains: Problem Solving and Resources.

Return ONLY a valid JSON object (no markdown fences, no explanation):
{
  "problemSolving": {
    "decisionStyle": "string — a diagnostic sentence describing their actual pattern",
    "conflictPatterns": ["string — name the dynamic"],
    "strengths": ["string"],
    "challenges": ["string"],
    "goals": ["string"]
  },
  "resources": {
    "principles": ["string"],
    "tensions": ["string"],
    "strengths": ["string"],
    "challenges": ["string"],
    "goals": ["string"]
  }
}

Be diagnostic in the decisionStyle field — don't just say "collaborative," say something like "Collaborative in theory but one partner often defers to avoid conflict." Name conflict patterns specifically. Include 2-4 items per array.`,
  },
};

// ==================== Domain Refresh Config ====================
// Shorter, focused conversations to update a single domain.
// Each entry has the JSON shape that domain should produce.

const DOMAIN_REFRESH_CONFIG = {
  values: {
    minTurns: 2,
    maxTurns: 4,
    label: "Values & Identity",
    synthesisShape: `{
  "values": [{ "id": "v1", "name": "string", "description": "string", "rank": 1 }],
  "identityStatements": ["We're the family that..."],
  "nonNegotiables": ["string"],
  "narratives": ["string"]
}`,
  },
  communication: {
    minTurns: 2,
    maxTurns: 4,
    label: "Communication",
    synthesisShape: `{
  "strengths": ["string"],
  "patterns": ["string — name the dynamic"],
  "challenges": ["string"],
  "repairStrategies": ["string"],
  "goals": ["string"]
}`,
  },
  connection: {
    minTurns: 2,
    maxTurns: 4,
    label: "Connection",
    synthesisShape: `{
  "rituals": [{ "id": "ri1", "name": "string", "description": "string", "frequency": "string", "meaningSource": "string" }],
  "bondingActivities": ["string"],
  "strengths": ["string"],
  "challenges": ["string"],
  "goals": ["string"]
}`,
  },
  roles: {
    minTurns: 2,
    maxTurns: 4,
    label: "Roles & Responsibilities",
    synthesisShape: `{
  "assignments": [{ "id": "ra1", "area": "string", "owner": "string", "satisfaction": "working|needs-discussion|source-of-conflict" }],
  "decisionAreas": [{ "id": "da1", "name": "string", "style": "collaborative|delegated|unclear" }],
  "painPoints": ["string"],
  "goals": ["string"]
}`,
  },
  organization: {
    minTurns: 2,
    maxTurns: 4,
    label: "Organization & Spaces",
    synthesisShape: `{
  "spaces": [{ "id": "sp1", "name": "string", "currentState": "string", "idealState": "string", "priority": "urgent|important|nice-to-have" }],
  "systems": [{ "id": "sys1", "name": "string", "description": "string", "effectiveness": "working|inconsistent|nonexistent" }],
  "routines": [{ "id": "rt1", "name": "string", "frequency": "daily|weekly|monthly|seasonal", "description": "string", "isActive": true, "consistency": "solid|spotty|aspirational" }],
  "painPoints": ["string"],
  "goals": ["string"]
}`,
  },
  adaptability: {
    minTurns: 2,
    maxTurns: 4,
    label: "Adaptability",
    synthesisShape: `{
  "stressors": ["string"],
  "copingStrategies": ["string"],
  "strengths": ["string"],
  "challenges": ["string"],
  "goals": ["string"]
}`,
  },
  problemSolving: {
    minTurns: 2,
    maxTurns: 4,
    label: "Problem Solving",
    synthesisShape: `{
  "decisionStyle": "string — a diagnostic sentence",
  "conflictPatterns": ["string"],
  "strengths": ["string"],
  "challenges": ["string"],
  "goals": ["string"]
}`,
  },
  resources: {
    minTurns: 2,
    maxTurns: 4,
    label: "Resource Management",
    synthesisShape: `{
  "principles": ["string"],
  "tensions": ["string"],
  "strengths": ["string"],
  "challenges": ["string"],
  "goals": ["string"]
}`,
  },
};

function buildRefreshSystemPrompt(domainId, config, currentDomainData) {
  const dataSummary = currentDomainData
    ? JSON.stringify(currentDomainData, null, 2)
    : "(no existing data)";

  return `You are an expert family systems coach conducting a focused refresh of the ${config.label} domain.

Last time this family went through this area, here is what was captured:
${dataSummary}

Your job is to find out WHAT HAS CHANGED since this was written. Things shift — values evolve, new routines emerge, old systems break down, roles get redistributed.

YOUR APPROACH:
- Reference specific items from the existing data: "Last time you said your top value was curiosity — does that still feel right?"
- Ask ONE question at a time. Be direct and diagnostic.
- Don't re-assess everything — focus on what's different, what's new, and what no longer applies.
- If nothing has changed in an area, acknowledge it and move on.
- Be warm but efficient — this is a check-up, not a full assessment.
- 2-4 exchanges should be enough.

Start by summarizing what you see in their existing ${config.label} data and asking what feels different now.`;
}

function buildRefreshSynthesisPrompt(domainId, config) {
  return `Based on the refresh conversation, produce an UPDATED version of the ${config.label} domain data. Merge the changes the family described with the existing data — keep what's still accurate, update what changed, remove what no longer applies, and add anything new.

Return ONLY a valid JSON object (no markdown fences, no explanation) matching this shape:
${config.synthesisShape}

Use the family's words where possible. Be specific and diagnostic.`;
}

// ==================== Helper: Parse JSON from AI response ====================

function parseJsonFromResponse(text) {
  // Try to extract JSON from markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }

  // Try to find a JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("No valid JSON found in response");
}

// ==================== Health Check ====================

exports.healthCheck = onCall(async () => {
  return {
    status: "ok",
    version: "2.0.0-coherence",
    timestamp: new Date().toISOString(),
  };
});

// ==================== Conduct Onboarding Conversation ====================

exports.conductOnboardingConversation = onCall(
  { timeoutSeconds: 60, memory: "512MiB", secrets: ["OPENAI_API_KEY"] },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const {
      phaseId, conversationId, message, familyId, previousDomains,
      mode, domainId, currentDomainData,
    } = request.data;

    const isRefresh = mode === "refresh";

    if (isRefresh) {
      if (!domainId || !familyId) {
        throw new HttpsError("invalid-argument", "domainId and familyId are required for refresh mode.");
      }
    } else {
      if (!phaseId || !familyId) {
        throw new HttpsError("invalid-argument", "phaseId and familyId are required.");
      }
    }

    // Build config depending on mode
    let phaseConfig;
    if (isRefresh) {
      const refreshDomainConfig = DOMAIN_REFRESH_CONFIG[domainId];
      if (!refreshDomainConfig) {
        throw new HttpsError("invalid-argument", `Invalid domainId: ${domainId}`);
      }
      phaseConfig = {
        minTurns: refreshDomainConfig.minTurns,
        maxTurns: refreshDomainConfig.maxTurns,
        domains: [domainId],
        systemPrompt: buildRefreshSystemPrompt(domainId, refreshDomainConfig, currentDomainData),
        synthesisPrompt: buildRefreshSynthesisPrompt(domainId, refreshDomainConfig),
      };
    } else {
      phaseConfig = PHASE_SYSTEM_PROMPTS[phaseId];
      if (!phaseConfig) {
        throw new HttpsError("invalid-argument", `Invalid phaseId: ${phaseId}`);
      }
    }

    const userId = request.auth.uid;
    const client = getOpenAI();

    try {
      // Get or create conversation
      let conversation;
      let conversationRef;

      if (conversationId) {
        conversationRef = db.collection("conversations").doc(conversationId);
        const doc = await conversationRef.get();
        if (!doc.exists) {
          throw new HttpsError("not-found", "Conversation not found.");
        }
        conversation = doc.data();
      } else {
        // Create new conversation
        conversationRef = db.collection("conversations").doc();
        conversation = {
          conversationId: conversationRef.id,
          familyId,
          userId,
          purpose: isRefresh ? "refresh" : "onboarding",
          ...(isRefresh ? { domainId } : { phaseId }),
          turns: [],
          status: "active",
          createdAt: FieldValue.serverTimestamp(),
        };
        await conversationRef.set(conversation);
      }

      const turns = conversation.turns || [];

      // Add user message if provided
      if (message) {
        turns.push({
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        });
      }

      // Count assistant turns (questions asked so far)
      const assistantTurns = turns.filter((t) => t.role === "assistant").length;

      // Decide: ask another question or synthesize?
      const userTurns = turns.filter((t) => t.role === "user").length;
      const shouldSynthesize = userTurns >= phaseConfig.maxTurns;

      // Build context from previous domains if available
      let previousDomainContext = "";
      if (previousDomains && Object.keys(previousDomains).length > 0) {
        previousDomainContext =
          "\n\nFor context, here is what has already been assessed in previous phases:\n";
        for (const [domainName, data] of Object.entries(previousDomains)) {
          previousDomainContext += `\n${domainName.toUpperCase()} domain: ${JSON.stringify(data, null, 2)}\n`;
        }
      }

      // Build messages for OpenAI
      const chatMessages = turns
        .filter((t) => t.role === "user" || t.role === "assistant")
        .map((t) => ({
          role: t.role,
          content: t.content,
        }));

      let responseType;
      let aiResponse;
      let structuredData = null;

      if (shouldSynthesize) {
        // Synthesis mode: ask AI to produce structured data
        responseType = "synthesis";

        const synthesisMessages = [
          { role: "system", content: phaseConfig.systemPrompt + previousDomainContext + "\n\n" + phaseConfig.synthesisPrompt },
          ...chatMessages,
          {
            role: "user",
            content:
              "Please synthesize everything we've discussed into the structured format now.",
          },
        ];

        const result = await client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 2000,
          messages: synthesisMessages,
        });

        const rawText = result.choices[0].message.content;

        try {
          structuredData = parseJsonFromResponse(rawText);
        } catch {
          // If parsing fails, try again with stricter instructions
          const retryResult = await client.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 2000,
            messages: [
              { role: "system", content: "You must return ONLY valid JSON with no other text. No markdown fences. " + phaseConfig.synthesisPrompt },
              ...chatMessages,
              { role: "user", content: "Please synthesize everything we've discussed into the structured format now." },
            ],
          });
          structuredData = parseJsonFromResponse(retryResult.choices[0].message.content);
        }

        // For refresh mode, wrap single-domain data under its key
        if (isRefresh && structuredData) {
          structuredData = { [domainId]: structuredData };
        }

        // Generate a warm summary message to show the user
        const summaryResult = await client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are a warm guide. Briefly summarize what you heard from this family in 2-3 sentences. Be warm and affirming. Do not list items — just reflect the essence back to them naturally." },
            ...chatMessages,
          ],
        });

        aiResponse = summaryResult.choices[0].message.content;
      } else if (chatMessages.length === 0) {
        // First turn: AI opens the conversation
        responseType = "question";

        const result = await client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 300,
          messages: [
            { role: "system", content: phaseConfig.systemPrompt + previousDomainContext },
            {
              role: "user",
              content:
                "Please begin the conversation with your opening question.",
            },
          ],
        });

        aiResponse = result.choices[0].message.content;
      } else {
        // Ongoing conversation: ask next question
        responseType = "question";

        const result = await client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 300,
          messages: [
            { role: "system", content: phaseConfig.systemPrompt + previousDomainContext },
            ...chatMessages,
          ],
        });

        aiResponse = result.choices[0].message.content;
      }

      // Add assistant response to turns
      turns.push({
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
        ...(structuredData ? { extractedData: structuredData } : {}),
      });

      // Update conversation in Firestore
      await conversationRef.update({
        turns,
        status: shouldSynthesize ? "completed" : "active",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        conversationId: conversation.conversationId || conversationRef.id,
        type: responseType,
        message: aiResponse,
        structuredData,
        turnCount: userTurns,
        minTurns: phaseConfig.minTurns,
        maxTurns: phaseConfig.maxTurns,
      };
    } catch (error) {
      console.error("Onboarding conversation error:", error);
      throw new HttpsError(
        "internal",
        "Failed to process conversation. Please try again."
      );
    }
  }
);

// ==================== Generate Yearbook Content ====================

exports.generateYearbookContent = onCall(
  { timeoutSeconds: 90, memory: "512MiB", secrets: ["OPENAI_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const { familyId, personId, yearbookId, manualId, entryTypes, focusDomain } = request.data;

    if (!familyId || !personId || !yearbookId) {
      throw new HttpsError(
        "invalid-argument",
        "familyId, personId, and yearbookId are required."
      );
    }

    const client = getOpenAI();

    try {
      // Fetch the family manual for context
      let manualContext = "";
      if (manualId) {
        const manualDoc = await db
          .collection("manuals")
          .doc(manualId)
          .get();
        if (manualDoc.exists) {
          const manual = manualDoc.data();
          manualContext = `
Family Manual: "${manual.title}"
Values: ${JSON.stringify(manual.domains?.values?.values || [])}
Identity: ${JSON.stringify(manual.domains?.values?.identityStatements || [])}
Non-negotiables: ${JSON.stringify(manual.domains?.values?.nonNegotiables || [])}
Communication strengths: ${JSON.stringify(manual.domains?.communication?.strengths || [])}
Communication patterns: ${JSON.stringify(manual.domains?.communication?.patterns || [])}
Communication challenges: ${JSON.stringify(manual.domains?.communication?.challenges || [])}
Repair strategies: ${JSON.stringify(manual.domains?.communication?.repairStrategies || [])}
Rituals: ${JSON.stringify(manual.domains?.connection?.rituals || [])}
Bonding activities: ${JSON.stringify(manual.domains?.connection?.bondingActivities || [])}
Role assignments: ${JSON.stringify(manual.domains?.roles?.assignments || [])}
Routines: ${JSON.stringify(manual.domains?.organization?.routines || [])}
Family systems: ${JSON.stringify(manual.domains?.organization?.systems || [])}
Adaptability strengths: ${JSON.stringify(manual.domains?.adaptability?.strengths || [])}
Stressors: ${JSON.stringify(manual.domains?.adaptability?.stressors || [])}
Decision style: ${JSON.stringify(manual.domains?.problemSolving?.decisionStyle || "")}
Conflict patterns: ${JSON.stringify(manual.domains?.problemSolving?.conflictPatterns || [])}
Resource principles: ${JSON.stringify(manual.domains?.resources?.principles || [])}`;
        }
      }

      // Fetch existing entries to avoid duplication
      const existingSnap = await db
        .collection("entries")
        .where("yearbookId", "==", yearbookId)
        .where("familyId", "==", familyId)
        .get();
      const existingTitles = existingSnap.docs.map(
        (d) => d.data().title
      );

      // Determine which entry types to generate
      const typesToGenerate = entryTypes || [
        "story",
        "activity",
        "reflection",
        "discussion",
      ];

      const systemPrompt = `You are a creative, warm family engagement specialist generating personalized content for a family's yearbook. Your content should be grounded in the family's actual values, rhythms, and identity — not generic.

${manualContext}

${existingTitles.length > 0 ? `Already created entries (avoid duplicating): ${existingTitles.join(", ")}` : ""}

Generate ${typesToGenerate.length} entries, one for each of these types: ${typesToGenerate.join(", ")}.

Return ONLY a valid JSON array (no markdown fences, no explanation) where each entry has this shape:
[
  {
    "type": "story|activity|reflection|discussion",
    "domain": "values|communication|connection|roles|organization|adaptability|problemSolving|resources",
    "title": "string",
    "content": { ... }
  }
]

Content shapes by type:
- story: { "kind": "story", "body": "full story text", "theme": "string", "characterName": "optional" }
- activity: { "kind": "activity", "instructions": "string", "duration": "string", "materials": ["string"], "ageRange": { "min": number, "max": number } }
- reflection: { "kind": "reflection", "prompt": "string", "sentiment": "positive|neutral|difficult" }
- discussion: { "kind": "discussion", "prompt": "string", "suggestedScript": "string", "targetAudience": "family|couple|parent-child" }

Make stories warm and personal (200-400 words). Make activities age-appropriate and achievable. Make reflections thought-provoking. Make discussions structured with a clear opening script.

Tie each entry to a specific domain that fits its content.${focusDomain ? `\n\nIMPORTANT: Focus entries specifically on the "${focusDomain}" domain, as this area was just refreshed with updated family data. Generate content that reflects the latest information in this domain.` : ""}`;

      const result = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Please generate fresh yearbook content for this family. Today is ${new Date().toLocaleDateString()}.`,
          },
        ],
      });

      const rawText = result.choices[0].message.content;
      let generatedEntries;

      try {
        generatedEntries = parseJsonFromResponse(rawText);
        // Handle if it returns an object with an entries key
        if (!Array.isArray(generatedEntries) && generatedEntries.entries) {
          generatedEntries = generatedEntries.entries;
        }
      } catch {
        // Retry with stricter prompt
        const retryResult = await client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 4000,
          messages: [
            { role: "system", content: "You must return ONLY a valid JSON array with no other text. No markdown fences, no explanation. " + systemPrompt },
            {
              role: "user",
              content: `Generate yearbook content now. Today is ${new Date().toLocaleDateString()}.`,
            },
          ],
        });
        generatedEntries = parseJsonFromResponse(retryResult.choices[0].message.content);
        if (!Array.isArray(generatedEntries) && generatedEntries.entries) {
          generatedEntries = generatedEntries.entries;
        }
      }

      if (!Array.isArray(generatedEntries)) {
        throw new Error("AI did not return an array of entries");
      }

      // Save entries to Firestore
      const batch = db.batch();
      const savedEntryIds = [];

      for (const entry of generatedEntries) {
        const entryRef = db.collection("entries").doc();
        batch.set(entryRef, {
          entryId: entryRef.id,
          familyId,
          yearbookId,
          personId,
          manualId: manualId || null,
          type: entry.type,
          source: "system",
          domain: entry.domain || "values",
          title: entry.title,
          content: entry.content,
          linkedEntryIds: [],
          lifecycle: "active",
          visibility: "family",
          createdAt: FieldValue.serverTimestamp(),
        });
        savedEntryIds.push(entryRef.id);
      }

      await batch.commit();

      return {
        success: true,
        entryCount: savedEntryIds.length,
        entryIds: savedEntryIds,
      };
    } catch (error) {
      console.error("Yearbook content generation error:", error);
      throw new HttpsError(
        "internal",
        "Failed to generate yearbook content. Please try again."
      );
    }
  }
);

// ==================== Generate Coherence Observations ====================

exports.generateCoherenceObservations = onCall(
  { timeoutSeconds: 60, memory: "512MiB", secrets: ["OPENAI_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const { familyId, checkinId } = request.data;

    if (!familyId || !checkinId) {
      throw new HttpsError(
        "invalid-argument",
        "familyId and checkinId are required."
      );
    }

    const client = getOpenAI();

    try {
      // Fetch the current check-in
      const checkinDoc = await db
        .collection("checkins")
        .doc(checkinId)
        .get();
      if (!checkinDoc.exists) {
        throw new HttpsError("not-found", "Check-in not found.");
      }
      const checkin = checkinDoc.data();

      // Fetch recent check-ins for trend analysis (last 8 weeks)
      const recentSnap = await db
        .collection("checkins")
        .where("familyId", "==", familyId)
        .where("userId", "==", request.auth.uid)
        .orderBy("createdAt", "desc")
        .limit(8)
        .get();
      const recentCheckins = recentSnap.docs.map((d) => d.data());

      // Fetch manuals for context
      const manualsSnap = await db
        .collection("manuals")
        .where("familyId", "==", familyId)
        .get();
      const manuals = manualsSnap.docs.map((d) => d.data());

      // Build context
      let manualContext = "";
      let freshnessContext = "";
      for (const manual of manuals) {
        manualContext += `\nManual "${manual.title}" (${manual.type}, id: ${manual.manualId}):`;
        if (manual.domains?.values?.values?.length > 0) {
          manualContext += `\n  Values: ${manual.domains.values.values.map((v) => v.name).join(", ")}`;
        }
        if (manual.domains?.organization?.routines?.length > 0) {
          manualContext += `\n  Routines: ${manual.domains.organization.routines.map((r) => r.name + " (" + r.frequency + ")").join(", ")}`;
        }
        if (manual.domains?.connection?.rituals?.length > 0) {
          manualContext += `\n  Rituals: ${manual.domains.connection.rituals.map((r) => r.name).join(", ")}`;
        }
        if (manual.domains?.communication?.challenges?.length > 0) {
          manualContext += `\n  Communication challenges: ${manual.domains.communication.challenges.join("; ")}`;
        }
        if (manual.domains?.organization?.painPoints?.length > 0) {
          manualContext += `\n  Organization pain points: ${manual.domains.organization.painPoints.join("; ")}`;
        }

        // Domain freshness
        if (manual.domainMeta) {
          const domainIds = ["values", "communication", "connection", "roles", "organization", "adaptability", "problemSolving", "resources"];
          for (const did of domainIds) {
            const meta = manual.domainMeta[did];
            if (meta?.updatedAt) {
              const updatedDate = meta.updatedAt.toDate ? meta.updatedAt.toDate() : new Date(meta.updatedAt);
              const daysSince = Math.floor((Date.now() - updatedDate.getTime()) / 86400000);
              freshnessContext += `\n  ${did}: last updated ${daysSince} days ago by ${meta.updatedBy}`;
            }
          }
        }
      }
      if (freshnessContext) {
        manualContext += `\n\nDomain freshness:${freshnessContext}`;
      }

      let trendContext = "";
      if (recentCheckins.length > 1) {
        trendContext = "\n\nRecent check-in history:\n";
        for (const rc of recentCheckins) {
          trendContext += `Week ${rc.week}: `;
          const ratings = Object.values(rc.responses || {}).map(
            (r) => `${r.manualId?.slice(0, 6)}=${r.alignmentRating}/5`
          );
          trendContext += ratings.join(", ");
          const reflections = Object.values(rc.responses || {})
            .filter((r) => r.reflectionText)
            .map((r) => r.reflectionText);
          if (reflections.length > 0) {
            trendContext += ` — "${reflections.join("; ")}"`;
          }
          trendContext += "\n";
        }
      }

      const currentResponses = Object.values(checkin.responses || {});
      let currentContext = "\nThis week's check-in:\n";
      for (const resp of currentResponses) {
        const manual = manuals.find((m) => m.manualId === resp.manualId);
        currentContext += `  ${manual?.title || resp.manualId}: ${resp.alignmentRating}/5`;
        if (resp.reflectionText) {
          currentContext += ` — "${resp.reflectionText}"`;
        }
        if (resp.driftNotes) {
          currentContext += ` [drift: "${resp.driftNotes}"]`;
        }
        currentContext += "\n";
      }

      const result = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1000,
        messages: [
          {
            role: "system",
            content: `You are a warm, perceptive family coherence observer. You help families notice patterns without judging.

Your tone is:
- Warm and curious, never clinical or prescriptive
- Observational: "I notice..." not "You should..."
- Affirming when things are going well
- Gentle when surfacing drift — like a friend who cares

${manualContext}
${trendContext}

Based on the check-in data, generate two things:

1. **observations**: 2-3 brief observations (1-2 sentences each). Focus on:
   - Patterns across weeks (improving? drifting? stable?)
   - Connections between what they said matters and what they're experiencing
   - Affirmation when coherence is strong

2. **driftSignals**: 0-2 drift signals ONLY when there is clear evidence of drift in a specific domain. Evidence includes: low ratings (1-2), declining trend over 2+ weeks, explicit tension or conflict mentioned in reflections/drift notes, or a domain that hasn't been updated in a long time. Each signal should map to the MOST relevant domain ID from: values, communication, connection, roles, organization, adaptability, problemSolving, resources. Do NOT generate drift signals when things are going well — only when there's real signal.

Return ONLY a valid JSON object (no markdown fences, no explanation):
{
  "observations": [
    { "id": "obs1", "text": "string", "relatedManualIds": ["string"], "relatedEntryIds": [], "dismissedByUser": false }
  ],
  "driftSignals": [
    { "id": "ds1", "description": "short description of the drift", "manualId": "the manual id", "domain": "domainId", "severity": "gentle|notable", "acknowledged": false }
  ]
}`,
          },
          {
            role: "user",
            content: `Here is this week's check-in data. Please share your observations.\n${currentContext}`,
          },
        ],
      });

      const rawText = result.choices[0].message.content;
      let observations;
      let driftSignals = [];
      try {
        const parsed = parseJsonFromResponse(rawText);
        if (Array.isArray(parsed)) {
          // Legacy format — just observations
          observations = parsed;
        } else {
          observations = parsed.observations || [];
          driftSignals = (parsed.driftSignals || []).map((ds) => ({
            ...ds,
            acknowledged: false,
            createdAt: new Date().toISOString(),
          }));
        }
      } catch {
        observations = [
          {
            id: "obs-fallback",
            text: "Thank you for checking in this week. Keep reflecting — patterns will become clearer over time.",
            relatedManualIds: [],
            relatedEntryIds: [],
            dismissedByUser: false,
          },
        ];
      }

      // Save observations and drift signals to the check-in document
      await db.collection("checkins").doc(checkinId).update({
        systemObservations: observations,
        ...(driftSignals.length > 0 ? { driftSignals } : {}),
      });

      return { observations, driftSignals };
    } catch (error) {
      console.error("Coherence observation error:", error);
      throw new HttpsError(
        "internal",
        "Failed to generate observations. Please try again."
      );
    }
  }
);
