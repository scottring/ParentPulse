/**
 * Household Weekly Focus Prompt Builders
 *
 * Builds prompts for the AI to generate weekly focus areas based on:
 * - Household manual content (triggers, strategies, boundaries, routines)
 * - Individual family member manuals
 * - User preferences (focus domains, capacity level)
 * - Recent focus history (to avoid repetition)
 */

/**
 * Focus domain metadata for prompt construction
 */
const FOCUS_DOMAIN_INFO = {
  physical_environment: {
    name: "Physical Environment",
    description: "Sanctuary zones, home organization, sensory considerations",
    relevantLayers: [1],
    manualSections: ["sanctuaryMap"],
    contentTypes: ["zones", "sensory needs", "organization"],
  },
  behavior_boundaries: {
    name: "Behavior & Boundaries",
    description: "Child behavior management, sibling dynamics, boundary enforcement",
    relevantLayers: [1, 3],
    manualSections: ["boundaries", "triggers"],
    contentTypes: ["boundaries", "triggers", "behavior patterns"],
  },
  partner_dynamics: {
    name: "Partner Dynamics",
    description: "Communication, fair play, relationship maintenance",
    relevantLayers: [2, 4],
    manualSections: ["communicationRhythm", "rolesAndRituals"],
    contentTypes: ["communication", "fair play cards", "repair protocols"],
  },
  routines_rituals: {
    name: "Routines & Rituals",
    description: "Daily routines, weekly rhythms, family traditions",
    relevantLayers: [4],
    manualSections: ["rolesAndRituals"],
    contentTypes: ["routines", "rituals", "schedules"],
  },
  self_regulation: {
    name: "Self-Care & Regulation",
    description: "Parent triggers, self-regulation strategies, personal boundaries",
    relevantLayers: [1, 4],
    manualSections: ["triggers", "strategies"],
    contentTypes: ["parent triggers", "coping strategies", "self-care"],
  },
  values_alignment: {
    name: "Values Alignment",
    description: "Non-negotiables, family mission, core values",
    relevantLayers: [6],
    manualSections: ["homeCharter"],
    contentTypes: ["values", "mission", "non-negotiables"],
  },
};

/**
 * Capacity level constraints
 */
const CAPACITY_CONSTRAINTS = {
  light: {
    maxFocusAreas: 2,
    maxActionsPerArea: 2,
    note: "Light capacity week - focus on essentials only",
  },
  moderate: {
    maxFocusAreas: 3,
    maxActionsPerArea: 3,
    note: "Moderate capacity - balanced approach",
  },
  full: {
    maxFocusAreas: 4,
    maxActionsPerArea: 4,
    note: "Full capacity - ambitious week ahead",
  },
};

/**
 * Build the main prompt for weekly focus generation
 */
function buildWeeklyFocusPrompt({householdManual, childManuals, preferences, recentFocus}) {
  const {focusDomains, capacity, manualPriorities, excludeAreas} = preferences;
  const capacityConfig = CAPACITY_CONSTRAINTS[capacity] || CAPACITY_CONSTRAINTS.moderate;

  // Build context sections
  const manualContext = buildManualContext(householdManual, focusDomains);
  const childContext = buildChildManualsContext(childManuals, focusDomains);
  const historyContext = buildRecentFocusContext(recentFocus);
  const prioritiesContext = manualPriorities && manualPriorities.length > 0 ?
      `\nUSER-SPECIFIED PRIORITIES:\n${manualPriorities.join("\n")}` : "";
  const excludeContext = excludeAreas && excludeAreas.length > 0 ?
      `\nAREAS TO EXCLUDE THIS WEEK:\n${excludeAreas.join("\n")}` : "";

  const domainNames = focusDomains.map((d) => FOCUS_DOMAIN_INFO[d]?.name || d).join(", ");

  return `You are helping create a weekly focus plan for a household. The family wants to focus on specific domains and has provided their household manual content for context.

SELECTED FOCUS DOMAINS: ${domainNames}
CAPACITY LEVEL: ${capacity.toUpperCase()} (max ${capacityConfig.maxFocusAreas} focus areas, ${capacityConfig.maxActionsPerArea} actions each)
${capacityConfig.note}

${manualContext}

${childContext}

${historyContext}
${prioritiesContext}
${excludeContext}

Based on this context, generate a JSON response with weekly focus areas:

{
  "focusAreas": [
    {
      "title": "Short, actionable title (e.g., 'Reinforce Bedtime Boundary')",
      "sourceType": "boundary|trigger|strategy|ritual|fairplay|value",
      "sourceId": "ID from the manual if referencing a specific item, or 'generated'",
      "layerId": 1-6 (matching the 6-layer framework),
      "rationale": "1-2 sentences explaining WHY this needs focus this week based on the manual content",
      "actions": [
        {
          "description": "Specific, actionable task",
          "trackable": true,
          "dueDay": 0-6 (0=Sunday) or null if flexible,
          "recurring": false (true for daily tasks)
        }
      ],
      "successMetric": "How to know this was successful (e.g., 'Boundary held 5/7 nights')"
    }
  ],
  "ritualReminders": [
    {
      "ritualName": "Name of existing ritual from manual",
      "scheduledDay": 0-6 (0=Sunday),
      "notes": "Any special notes for this week"
    }
  ],
  "capacityNote": "A supportive note about the family's capacity this week (optional)"
}

IMPORTANT GUIDELINES:
1. Focus areas MUST connect to content from the household manual or individual manuals
2. Each focus area should have clear, trackable actions
3. Respect the capacity constraints: max ${capacityConfig.maxFocusAreas} focus areas, ${capacityConfig.maxActionsPerArea} actions each
4. If there's recent focus history, avoid repeating the same areas unless they're explicitly prioritized
5. Consider individual family member triggers and strategies when relevant
6. Success metrics should be specific and measurable
7. Actions should be concrete - things like "Review boundary with kids" not "Think about boundaries"
8. If a boundary is marked as "immovable", frame actions around consistency and enforcement
9. For ${capacity} capacity, keep actions simple and achievable

Return ONLY the JSON object, no additional text.`;
}

/**
 * Build context from household manual relevant to selected domains
 */
function buildManualContext(manual, focusDomains) {
  const sections = [];

  // Always include core info
  sections.push(`HOUSEHOLD: ${manual.householdName || "Our Household"}`);
  sections.push(`MEMBERS: ${(manual.members || []).map((m) => m.name).join(", ")}`);

  // Home Charter (for values_alignment)
  if (focusDomains.includes("values_alignment") && manual.homeCharter) {
    sections.push(`
HOME CHARTER (VALUES):
- Family Mission: ${manual.homeCharter.familyMission || "Not defined"}
- Non-Negotiables: ${formatNonNegotiables(manual.homeCharter.nonNegotiables)}
- Core Values: ${(manual.familyValues || []).join(", ")}`);
  }

  // Sanctuary Map (for physical_environment)
  if (focusDomains.includes("physical_environment") && manual.sanctuaryMap) {
    sections.push(`
SANCTUARY MAP (ENVIRONMENT):
- Zones: ${formatZones(manual.sanctuaryMap.zones)}
- Light Issues: ${manual.sanctuaryMap.lightAudit?.length || 0} items noted
- Sound Issues: ${manual.sanctuaryMap.soundAudit?.length || 0} items noted`);
  }

  // Boundaries (for behavior_boundaries)
  if (focusDomains.includes("behavior_boundaries") && manual.boundaries?.length > 0) {
    sections.push(`
HOUSEHOLD BOUNDARIES:
${formatBoundaries(manual.boundaries)}`);
  }

  // Triggers (for self_regulation, behavior_boundaries)
  if ((focusDomains.includes("self_regulation") || focusDomains.includes("behavior_boundaries")) &&
      manual.triggers?.length > 0) {
    sections.push(`
HOUSEHOLD TRIGGERS:
${formatTriggers(manual.triggers)}`);
  }

  // Strategies
  if ((focusDomains.includes("self_regulation") || focusDomains.includes("behavior_boundaries")) &&
      manual.strategies?.length > 0) {
    sections.push(`
EFFECTIVE STRATEGIES:
${formatStrategies(manual.strategies)}`);
  }

  // Roles & Rituals (for routines_rituals, partner_dynamics)
  if ((focusDomains.includes("routines_rituals") || focusDomains.includes("partner_dynamics")) &&
      manual.rolesAndRituals) {
    sections.push(`
ROLES & RITUALS:
- Fair Play Cards: ${formatFairPlayCards(manual.rolesAndRituals.fairPlayCards)}
- Weekly Rituals: ${formatRituals(manual.rolesAndRituals.weeklyRituals)}`);
  }

  // Communication Rhythm (for partner_dynamics)
  if (focusDomains.includes("partner_dynamics") && manual.communicationRhythm) {
    sections.push(`
COMMUNICATION RHYTHM:
- Weekly Sync: ${manual.communicationRhythm.weeklySyncConfig?.isEnabled ? "Enabled" : "Not set up"}
- Repair Protocol: ${manual.communicationRhythm.repairProtocol ? "Defined" : "Not defined"}`);
  }

  return `HOUSEHOLD MANUAL CONTENT:\n${sections.join("\n")}`;
}

/**
 * Build context from child manuals
 */
function buildChildManualsContext(childManuals, focusDomains) {
  if (!childManuals || childManuals.length === 0) {
    return "INDIVIDUAL MANUALS: None available";
  }

  const relevantContent = childManuals.map((child) => {
    const parts = [`${child.personName}:`];

    // Include triggers for behavior/self-regulation domains
    if ((focusDomains.includes("behavior_boundaries") || focusDomains.includes("self_regulation")) &&
        child.triggers?.length > 0) {
      const topTriggers = child.triggers.slice(0, 3).map((t) => t.description || t).join("; ");
      parts.push(`  Triggers: ${topTriggers}`);
    }

    // Include strategies
    if (child.strategies?.length > 0) {
      const topStrategies = child.strategies.slice(0, 2).map((s) => s.description || s).join("; ");
      parts.push(`  Effective strategies: ${topStrategies}`);
    }

    return parts.join("\n");
  });

  return `INDIVIDUAL FAMILY MEMBER INSIGHTS:\n${relevantContent.join("\n\n")}`;
}

/**
 * Build context from recent focus history
 */
function buildRecentFocusContext(recentFocus) {
  if (!recentFocus || recentFocus.length === 0) {
    return "RECENT FOCUS HISTORY: None (first week of planning)";
  }

  const summaries = recentFocus.map((focus, index) => {
    const weekAgo = index === 0 ? "Last week" : `${index + 1} weeks ago`;
    const areas = (focus.focusAreas || []).map((a) => a.title).join(", ");
    const completion = focus.completedActions?.length || 0;
    const total = (focus.focusAreas || []).reduce((sum, a) => sum + (a.actions?.length || 0), 0);
    const rating = focus.effectivenessRating ? ` (rated ${focus.effectivenessRating}/5)` : "";

    return `- ${weekAgo}: ${areas} [${completion}/${total} completed${rating}]`;
  });

  return `RECENT FOCUS HISTORY:\n${summaries.join("\n")}`;
}

// ==================== Formatting Helpers ====================

function formatNonNegotiables(nonNegotiables) {
  if (!nonNegotiables || nonNegotiables.length === 0) return "None defined";
  return nonNegotiables.map((nn) =>
    typeof nn === "string" ? nn : `${nn.value}: ${nn.description}`
  ).join("; ");
}

function formatZones(zones) {
  if (!zones || zones.length === 0) return "None defined";
  return zones.map((z) => `${z.name} (${z.type})`).join(", ");
}

function formatBoundaries(boundaries) {
  return boundaries.slice(0, 5).map((b) =>
    `- [${b.category?.toUpperCase() || "GENERAL"}] ${b.description}`
  ).join("\n");
}

function formatTriggers(triggers) {
  return triggers.slice(0, 5).map((t) =>
    `- [${t.severity?.toUpperCase() || "MEDIUM"}] ${t.description}`
  ).join("\n");
}

function formatStrategies(strategies) {
  return strategies.slice(0, 5).map((s) =>
    `- [${s.effectiveness || 3}/5] ${s.description}`
  ).join("\n");
}

function formatFairPlayCards(cards) {
  if (!cards || cards.length === 0) return "None assigned";
  return cards.slice(0, 3).map((c) => `${c.name} (${c.ownerName || "unassigned"})`).join(", ");
}

function formatRituals(rituals) {
  if (!rituals || rituals.length === 0) return "None defined";
  return rituals.slice(0, 3).map((r) => r.name).join(", ");
}

module.exports = {
  buildWeeklyFocusPrompt,
  FOCUS_DOMAIN_INFO,
  CAPACITY_CONSTRAINTS,
};
