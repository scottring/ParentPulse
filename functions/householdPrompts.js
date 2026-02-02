/**
 * Household Section Prompt Builders
 *
 * Section-specific prompts for generating AI content for the household manual.
 * Each section maps to a layer in the 6-layer framework.
 */

/**
 * Build a prompt for a specific household section
 */
function buildHouseholdSectionPrompt(sectionId, answers, householdName, members, linkedManuals) {
  const memberNames = members.map((m) => m.name).join(", ");
  const memberContext = members.length > 0 ?
    `\nHousehold Members: ${memberNames} (${members.length} people)` : "";

  // Include insights from individual manuals if available
  let manualContext = "";
  if (linkedManuals && linkedManuals.length > 0) {
    const triggersSummary = linkedManuals
        .filter((m) => m.triggers && m.triggers.length > 0)
        .map((m) => `${m.personName}: ${m.triggers.slice(0, 3).map((t) => t.description || t).join("; ")}`)
        .join("\n");

    if (triggersSummary) {
      manualContext = `\n\nINDIVIDUAL TRIGGERS (from family member manuals):\n${triggersSummary}`;
    }
  }

  // Format answers into readable text
  const formattedAnswers = Object.entries(answers)
      .map(([questionId, answer]) => {
        const formatted = formatAnswerValue(answer);
        return formatted ? `${questionId}: ${formatted}` : null;
      })
      .filter((a) => a !== null)
      .join("\n");

  // Get section-specific prompt
  switch (sectionId) {
    case "home_charter":
      return buildHomeCharterPrompt(householdName, memberContext, manualContext, formattedAnswers);
    case "sanctuary_map":
      return buildSanctuaryMapPrompt(householdName, memberContext, manualContext, formattedAnswers);
    case "village_wiki":
      return buildVillageWikiPrompt(householdName, memberContext, formattedAnswers);
    case "roles_rituals":
      return buildRolesRitualsPrompt(householdName, memberContext, formattedAnswers, members);
    case "communication_rhythm":
      return buildCommunicationRhythmPrompt(householdName, memberContext, formattedAnswers);
    default:
      return buildGenericSectionPrompt(sectionId, householdName, memberContext, formattedAnswers);
  }
}

/**
 * Home Charter (L6 - Values) Prompt
 */
function buildHomeCharterPrompt(householdName, memberContext, manualContext, formattedAnswers) {
  return `You are helping create a "Home Charter" for a family's household manual. The Home Charter captures their family mission, non-negotiables, desired feelings, and core values.

HOUSEHOLD: ${householdName}${memberContext}${manualContext}

USER RESPONSES:
${formattedAnswers}

Based on the user's responses, generate a JSON response with the following structure:

{
  "familyMission": "A warm, inspiring 1-2 sentence mission statement that captures what this family is about. Should feel personal and actionable.",
  "nonNegotiables": [
    {
      "value": "Short title (3-5 words)",
      "description": "Brief explanation of what this means in practice"
    }
  ],
  "desiredFeelings": ["feeling1", "feeling2", "feeling3", ...],
  "coreValues": ["value1", "value2", "value3"]
}

Guidelines:
1. The familyMission should synthesize their stated mission with their values and desired feelings into something cohesive
2. For nonNegotiables, include both the ones they selected AND any custom ones they mentioned
3. Keep desiredFeelings to the ones they actually selected (don't add more)
4. Limit coreValues to 3-5 based on what they provided
5. Use warm, family-friendly language
6. Make everything specific to THIS family, not generic

Return ONLY the JSON object, no additional text.`;
}

/**
 * Sanctuary Map (L1 - Inputs/Triggers) Prompt
 */
function buildSanctuaryMapPrompt(householdName, memberContext, manualContext, formattedAnswers) {
  return `You are helping create a "Sanctuary Map" for a family's household manual. The Sanctuary Map captures their home's sensory environment (light, sound, nature) and designated zones.

HOUSEHOLD: ${householdName}${memberContext}${manualContext}

USER RESPONSES:
${formattedAnswers}

Based on the user's responses and any individual triggers from family members, generate a JSON response:

{
  "lightRecommendations": [
    "Specific recommendation based on their light rating and issues mentioned"
  ],
  "soundRecommendations": [
    "Specific recommendation based on sound sources they identified"
  ],
  "zones": [
    {
      "name": "Zone name",
      "type": "quiet|activity|work|rest|connection|transition",
      "location": "Where in the home",
      "purpose": "What this zone is for",
      "rules": ["Rule 1", "Rule 2"] or null
    }
  ],
  "natureRecommendations": [
    "Recommendations for adding nature elements based on what they have/don't have"
  ]
}

Guidelines:
1. If they mentioned light issues, provide 1-2 practical recommendations
2. For zones, always include a quiet/calm-down zone based on their response
3. Consider individual family member triggers when suggesting zone rules
4. Be specific about locations when they provided them
5. Keep recommendations actionable and realistic

Return ONLY the JSON object, no additional text.`;
}

/**
 * Village Wiki (L3 - Memory/Structure) Prompt
 */
function buildVillageWikiPrompt(householdName, memberContext, formattedAnswers) {
  return `You are helping organize a "Village Wiki" for a family's household manual. The Village Wiki captures their support network, important codes, and household quirks.

HOUSEHOLD: ${householdName}${memberContext}

USER RESPONSES:
${formattedAnswers}

Based on the user's responses, generate a JSON response:

{
  "contacts": [
    {
      "name": "Contact name from their response",
      "relationship": "How they're related/connected",
      "category": "emergency|medical|school|childcare|family|neighbor|service|other",
      "notes": "Any additional context mentioned" or null
    }
  ],
  "codeCategories": [
    "List of code types they indicated they have (garage, alarm, wifi, etc.)"
  ],
  "householdTips": [
    "Quirk or tip they mentioned, formatted as actionable guidance"
  ]
}

Guidelines:
1. Parse the emergency contacts and local support into structured contact entries
2. Only include code categories they actually selected
3. Format household quirks as clear, memorable tips
4. Use their exact wording for names and relationships when provided

Return ONLY the JSON object, no additional text.`;
}

/**
 * Roles & Rituals (L4 - Execution) Prompt
 */
function buildRolesRitualsPrompt(householdName, memberContext, formattedAnswers, members) {
  const parentNames = members.filter((m) => m.role === "parent").map((m) => m.name);

  return `You are helping create a "Roles & Rituals" section for a family's household manual. This captures task ownership (Fair Play cards), standards of care, and weekly rituals.

HOUSEHOLD: ${householdName}${memberContext}
PARENTS/ADULTS: ${parentNames.join(", ") || "Not specified"}

USER RESPONSES:
${formattedAnswers}

Based on the user's responses, generate a JSON response:

{
  "fairPlayCards": [
    {
      "name": "Task/responsibility name",
      "category": "meals|tidying|laundry|finances|scheduling|medical|school|emotional-labor|household-maintenance|childcare|pet-care|social|other",
      "ownerName": "Name of person who owns this (based on mental load response)",
      "description": "Brief description of what full ownership means",
      "conception": true,
      "planning": true,
      "execution": true
    }
  ],
  "standardsOfCare": [
    {
      "area": "Area where standards differ",
      "minimumStandard": "The agreed minimum standard",
      "notes": "Any context about the disagreement" or null
    }
  ],
  "weeklyRituals": [
    {
      "name": "Ritual name",
      "description": "What they do",
      "dayOfWeek": 0-6 (0=Sunday) or null,
      "timeOfDay": "morning|afternoon|evening|flexible",
      "participants": ["who participates"],
      "purpose": "Why this matters"
    }
  ]
}

Guidelines:
1. Parse the mental load response to assign Fair Play card owners
2. Focus on pain point areas they identified for Fair Play cards
3. If they mentioned different standards, create standardsOfCare entries
4. For rituals, use both what they have AND what they want to have
5. Be specific about timing when they provided it

Return ONLY the JSON object, no additional text.`;
}

/**
 * Communication Rhythm (L2 - Processing) Prompt
 */
function buildCommunicationRhythmPrompt(householdName, memberContext, formattedAnswers) {
  return `You are helping create a "Communication Rhythm" section for a family's household manual. This captures their weekly sync, repair protocol, and conflict patterns.

HOUSEHOLD: ${householdName}${memberContext}

USER RESPONSES:
${formattedAnswers}

Based on the user's responses, generate a JSON response:

{
  "weeklySyncConfig": {
    "isEnabled": true/false (based on whether they have one),
    "dayOfWeek": 0-6 (0=Sunday) if they specified,
    "agenda": ["Suggested agenda item 1", "Suggested agenda item 2", "Suggested agenda item 3"]
  },
  "repairProtocol": {
    "coolDownTime": "Time based on their response (e.g., '15 minutes', '1 hour')",
    "initiationPhrase": "Their repair phrase if provided, or a suggestion",
    "steps": [
      {"order": 1, "action": "First step of repair"},
      {"order": 2, "action": "Second step"},
      {"order": 3, "action": "Third step"}
    ],
    "aftercare": ["How to reconnect after repair"]
  },
  "conflictStyleInsight": "A 2-3 sentence personalized insight about their conflict styles and how to navigate them together"
}

Guidelines:
1. Match cool down time to their specific response
2. If they provided a repair phrase, use it exactly
3. Tailor repair steps to their conflict style (immediate vs. need space)
4. The conflictStyleInsight should be warm and practical
5. Suggest a weekly sync agenda that addresses common household coordination needs

Return ONLY the JSON object, no additional text.`;
}

/**
 * Generic section prompt for fallback
 */
function buildGenericSectionPrompt(sectionId, householdName, memberContext, formattedAnswers) {
  return `You are helping create content for a household manual section.

SECTION: ${sectionId}
HOUSEHOLD: ${householdName}${memberContext}

USER RESPONSES:
${formattedAnswers}

Based on the user's responses, generate a structured JSON response that captures the key information provided. Include only fields that have relevant data from the responses.

Return ONLY the JSON object, no additional text.`;
}

/**
 * Format an answer value for inclusion in a prompt
 */
function formatAnswerValue(answer) {
  if (answer === null || answer === undefined) {
    return null;
  }

  if (typeof answer === "boolean") {
    return answer ? "Yes" : "No";
  }

  if (typeof answer === "number") {
    return String(answer);
  }

  if (Array.isArray(answer)) {
    const filtered = answer.filter((v) => v !== null && v !== undefined && v !== "");
    return filtered.length > 0 ? filtered.join(", ") : null;
  }

  if (typeof answer === "string") {
    const trimmed = answer.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof answer === "object") {
    return JSON.stringify(answer);
  }

  return String(answer);
}

module.exports = {
  buildHouseholdSectionPrompt,
};
