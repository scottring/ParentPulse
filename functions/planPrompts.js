/**
 * Prompt templates for strategic plan generation based on different challenge types
 */

const BASE_SYSTEM_PROMPT = `You are an expert child development specialist and parenting coach with deep expertise in creating comprehensive, evidence-based strategic plans for children with various challenges.

Your task is to generate a personalized 30-90 day strategic plan based on a child's baseline profile, recent journal entries, and knowledge base resources.

CRITICAL REQUIREMENTS:
1. Plans must be realistic, actionable, and evidence-based
2. Break complex goals into manageable phases (2-4 week chunks)
3. Include specific activities with estimated time commitments
4. Provide resources (articles, printables, videos, tools)
5. Set observable, measurable milestones
6. Consider family's unique context and child's strengths
7. Build progressively - start with foundation, then expand

PLAN STRUCTURE:
- Duration: 30 days (simple challenges), 60 days (moderate), or 90 days (complex)
- Phases: 2-4 week themed phases, building on each other
- Activities: Specific, daily/weekly tasks with clear instructions
- Milestones: Observable markers of progress at 2-week intervals
- Resources: Links to knowledge base, articles, printables, apps, products

OUTPUT FORMAT:
Return a valid JSON object matching this structure exactly:
{
  "title": "Plan title (e.g., 'Managing ADHD: Building Focus and Routine')",
  "description": "2-3 sentence overview of plan goals",
  "targetChallenge": "Primary challenge being addressed",
  "duration": 30 | 60 | 90,
  "aiReasoning": "1-2 paragraphs explaining why this plan structure was chosen",
  "phases": [
    {
      "title": "Phase name",
      "description": "What this phase focuses on",
      "weekStart": 1,
      "weekEnd": 2,
      "focus": "Primary objective",
      "activities": [
        {
          "title": "Activity name",
          "description": "Clear description with specific steps",
          "frequency": "daily" | "every_other_day" | "twice_week" | "weekly",
          "estimatedMinutes": 15,
          "requiredResources": [
            {
              "type": "physical_item" | "printable" | "article" | "video" | "app",
              "name": "Resource name",
              "description": "What it is and how to use it",
              "url": "URL if applicable",
              "cost": "free" | "low" | "medium" | "high"
            }
          ]
        }
      ],
      "successCriteria": ["Observable outcome 1", "Observable outcome 2"]
    }
  ],
  "milestones": [
    {
      "title": "Milestone name",
      "description": "What success looks like",
      "targetWeek": 2
    }
  ],
  "relatedKnowledgeIds": ["knowledge_base_id_1", "knowledge_base_id_2"]
}`;

// Challenge-specific guidance
const CHALLENGE_GUIDANCE = {
  adhd: `
ADHD-SPECIFIC GUIDANCE:
- Phase 1: Infrastructure setup (visual schedules, token economy, workspace organization)
- Phase 2: Routine building (consistent times, transition warnings, break schedules)
- Phase 3: Focus strategies (Pomodoro, body breaks, fidget tools)
- Phase 4: Self-regulation (emotional check-ins, coping strategies)

Key principles:
- External structure compensates for internal challenges
- Visual > Verbal instructions
- Immediate > Delayed rewards
- Movement breaks are essential, not optional
- Routines reduce decision fatigue

Resources to prioritize:
- Visual timers, token charts, routine cards
- Sensory tools (fidgets, wobble cushions)
- Apps: Goblin Tools, Tiimo, Forest
- Physical setup: organized workspace, quiet zone`,

  anxiety: `
ANXIETY-SPECIFIC GUIDANCE:
- Phase 1: Safety and understanding (psychoeducation, worry tracking)
- Phase 2: Coping toolkit (breathing, grounding, progressive relaxation)
- Phase 3: Gradual exposure (start small, build confidence)
- Phase 4: Independence (self-advocacy, applying tools independently)

Key principles:
- Validate feelings, don't dismiss ("I know this feels scary")
- Gradual > Sudden changes
- Practice when calm, use when anxious
- Build competence through small successes
- Predictability reduces anxiety

Resources to prioritize:
- Worry journals, feelings charts
- Breathing exercises, sensory grounding
- Books: "What to Do When You Worry Too Much"
- Apps: Headspace Kids, Breathe Think Do`,

  behavioral: `
BEHAVIORAL-SPECIFIC GUIDANCE:
- Phase 1: Understanding function (ABC tracking - Antecedent, Behavior, Consequence)
- Phase 2: Proactive strategies (environmental setup, clear expectations)
- Phase 3: Teaching replacement behaviors (communication, coping skills)
- Phase 4: Reinforcement systems (consistent consequences, positive attention)

Key principles:
- Behavior is communication - what's the need?
- Prevent > React
- Teach > Punish
- Consistency > Intensity
- Positive attention > Negative attention ratio should be 4:1

Resources to prioritize:
- ABC tracking sheets
- Visual behavior charts, token systems
- Social stories, choice boards
- Books: "The Explosive Child", "No-Drama Discipline"`,

  sensory: `
SENSORY-SPECIFIC GUIDANCE:
- Phase 1: Identification (sensory profile, trigger tracking)
- Phase 2: Environmental modifications (reduce triggers, add supports)
- Phase 3: Sensory diet (planned sensory activities throughout day)
- Phase 4: Self-advocacy (child learns to identify needs and ask for breaks)

Key principles:
- Sensory input regulates nervous system
- Prevention through planned input
- Different kids need different input (some seek, some avoid)
- Transitions and new environments are high-risk
- "Sensory breaks" are needs, not rewards

Resources to prioritize:
- Sensory profile checklist
- Heavy work activities, compression tools
- Noise-canceling headphones, sunglasses
- Chewies, fidgets, weighted items
- Apps: Sensory App House collection`,

  social: `
SOCIAL-SPECIFIC GUIDANCE:
- Phase 1: Skills assessment (what skills are present/missing?)
- Phase 2: Explicit teaching (social scripts, perspective-taking)
- Phase 3: Structured practice (parent coaching, playdates with support)
- Phase 4: Generalization (applying skills independently)

Key principles:
- Social skills are learned, not innate for everyone
- Break down implicit rules into explicit steps
- Practice > Lecture
- Video modeling is powerful
- Start with interested peer, then expand

Resources to prioritize:
- Social scripts, conversation starters
- Books: "The Unwritten Rules of Friendship"
- Games that teach turn-taking, emotions
- Apps: Social Express, Model Me Kids`,

  learning: `
LEARNING-SPECIFIC GUIDANCE:
- Phase 1: Strength-based assessment (what works, learning style)
- Phase 2: Intervention strategies (multisensory, explicit instruction)
- Phase 3: Practice routines (consistent, positive, short sessions)
- Phase 4: Building confidence (celebrating progress, self-advocacy)

Key principles:
- Use strengths to compensate for challenges
- Multisensory > Single modality
- Explicit instruction > Discovery learning
- Short, frequent > Long, rare practice
- Confidence matters as much as skill

Resources to prioritize:
- Multisensory materials (manipulatives, visual aids)
- Apps: Khan Academy Kids, Raz-Kids, Mathletics
- Assistive tech: text-to-speech, speech-to-text
- Books: "The Dyslexia Empowerment Plan"`,

  other: `
GENERAL GUIDANCE FOR OTHER CHALLENGES:
- Phase 1: Deep understanding (tracking, patterns, triggers)
- Phase 2: Evidence-based strategies (research what works)
- Phase 3: Consistent implementation (daily practice)
- Phase 4: Refinement (adjust based on what's working)

Key principles:
- Every child is unique - customize
- Small, consistent changes > Big, sporadic ones
- Parent consistency predicts child success
- Celebrate small wins
- Adjust as you learn

Focus on:
- Clear, specific strategies
- Manageable time commitments
- Building on existing strengths
- Resources that match family's style`
};

/**
 * Generate the complete prompt for strategic plan generation
 */
function buildPlanPrompt(childProfile, recentJournalEntries, knowledgeItems, children) {
  const child = children.find(c => c.userId === childProfile.childId);
  const childName = child?.name || "the child";

  // Get primary challenge category
  const primaryChallenge = childProfile.challenges[0]?.category || "other";
  const challengeGuidance = CHALLENGE_GUIDANCE[primaryChallenge] || CHALLENGE_GUIDANCE.other;

  // Build context sections
  const profileContext = `
CHILD PROFILE - ${childName}:

Age: ${calculateAge(child?.dateOfBirth)}

PRIMARY CHALLENGES:
${childProfile.challenges.map(c => `- ${c.category} (${c.severity}): ${c.description}
  ${c.diagnosed ? "✓ Professionally diagnosed" : ""}
  ${c.professionalSupport ? "✓ Currently working with professional" : ""}
  ${c.notes ? `Notes: ${c.notes}` : ""}`).join("\n")}

STRENGTHS:
${childProfile.strengths.map(s => `- ${s}`).join("\n")}

INTERESTS:
${childProfile.interests.map(i => `- ${i}`).join("\n")}

LEARNING STYLE: ${childProfile.learningStyle}

WHAT WORKS (proven strategies):
${childProfile.whatWorks.map(s => `- ${s.description} (Effectiveness: ${s.effectiveness}/5)
  Context: ${s.context}`).join("\n")}

WHAT DOESN'T WORK (avoid these):
${childProfile.whatDoesntWork.map(s => `- ${s.description}
  Context: ${s.context}`).join("\n")}

${childProfile.schoolInfo ? `
SCHOOL ENVIRONMENT:
- Grade: ${childProfile.schoolInfo.grade || "Not specified"}
- Special Services: ${childProfile.schoolInfo.specialServices?.join(", ") || "None"}
- IEP/504 Plan: ${childProfile.schoolInfo.iepOrFiveOFour ? "Yes" : "No"}
` : ""}

TRIGGERS (if identified):
${childProfile.triggers.length > 0 ?
  childProfile.triggers.map(t => `- ${t.description}
  Typical response: ${t.typicalResponse}
  Context: ${t.context}`).join("\n") :
  "None identified yet"}
`;

  const journalContext = recentJournalEntries.length > 0 ? `
RECENT JOURNAL ENTRIES (last 30 days - showing parent's real experiences):
${recentJournalEntries.slice(0, 10).map(entry => `
[${entry.date}] ${entry.category}
${entry.text}
${entry.tags ? `Tags: ${entry.tags.join(", ")}` : ""}
`).join("\n")}
` : "\nNo recent journal entries available.";

  const knowledgeContext = knowledgeItems.length > 0 ? `
AVAILABLE KNOWLEDGE BASE RESOURCES:
${knowledgeItems.map(item => `
- [${item.id}] ${item.title}
  ${item.summary || item.content?.substring(0, 200) + "..."}
  ${item.source ? `Source: ${item.source}` : ""}
`).join("\n")}
` : "\nNo knowledge base items available yet.";

  return `${BASE_SYSTEM_PROMPT}

${challengeGuidance}

---

${profileContext}

${journalContext}

${knowledgeContext}

---

TASK:
Create a comprehensive strategic plan for ${childName} that:
1. Addresses the primary challenge: ${primaryChallenge}
2. Builds on identified strengths: ${childProfile.strengths.slice(0, 3).join(", ")}
3. Incorporates proven strategies (what works)
4. Avoids ineffective approaches (what doesn't work)
5. Considers ${childName}'s ${childProfile.learningStyle} learning style
6. Provides realistic, actionable steps for busy parents
7. Uses available knowledge base resources where relevant

Choose duration based on challenge complexity:
- 30 days for single, focused challenges
- 60 days for moderate complexity or multiple related challenges
- 90 days for significant challenges requiring extensive skill building

Remember: This plan will guide daily action generation for the next ${30} to ${90} days. Make it practical, evidence-based, and customized to this unique child and family.

Return ONLY valid JSON matching the structure specified above. No additional text.`;
}

/**
 * Calculate child's age from date of birth
 */
function calculateAge(dateOfBirth) {
  if (!dateOfBirth || !dateOfBirth.toDate) return "Age not specified";
  const birthDate = dateOfBirth.toDate();
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age === 1 ? "1 year old" : `${age} years old`;
}

module.exports = {
  buildPlanPrompt,
  BASE_SYSTEM_PROMPT,
  CHALLENGE_GUIDANCE
};
