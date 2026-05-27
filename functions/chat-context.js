// functions/chat-context.js
//
// Pure, testable helpers for assembling the context + identity that the
// journal/coach chat sends to Claude. Extracted from index.js so the
// "who is speaking and who wrote what" logic can be unit-tested.
//
// The bug these fix: the chat pipeline used to discard speaker identity
// and entry authorship everywhere it mattered, so when a second household
// member (e.g. a spouse) chatted on a shared entry, the AI was told THEY
// wrote it and could not tell the two partners' entries/turns apart.

"use strict";

/**
 * Build the synthetic first-turn message that carries a journal entry's
 * text into the conversation. The phrasing must reflect who ACTUALLY
 * wrote the entry — never assume the current speaker is the author.
 *
 * @param {object} p
 * @param {string} p.entryText        the entry body
 * @param {string} p.entryAuthorName  display name of the entry's author
 * @param {boolean} p.isSpeakerAuthor true if the current speaker wrote it
 * @param {string} p.message          the speaker's actual question/message
 * @returns {string}
 */
function buildEntryFirstMessage({entryText, entryAuthorName, isSpeakerAuthor, message}) {
  const body = `"${String(entryText || "").trim()}"`;
  const lead = isSpeakerAuthor ?
    "Here's a journal entry I just wrote:" :
    `Here's a journal entry ${entryAuthorName || "my partner"} wrote (shared with me):`;
  return `${lead}\n\n${body}\n\n${message}`;
}

/**
 * Build the Anthropic message array for a per-entry thread, attributing
 * each human turn to its author when more than one person has spoken.
 *
 * Anthropic only accepts {role, content}; to preserve WHO said a given
 * user turn across a multi-person thread, we inline the author's name as
 * a "Name: ..." prefix — but only when the thread actually has 2+ humans,
 * so single-user threads stay clean.
 *
 * @param {object} p
 * @param {Array<{role:string,content:string,authorId?:string}>} p.priorTurns
 * @param {string} p.newMessage              the speaker's new message
 * @param {string} p.speakerId               current speaker's uid
 * @param {string} p.speakerName             current speaker's display name
 * @param {Object<string,string>} p.authorNamesById  uid -> display name
 * @returns {Array<{role:string,content:string}>}
 */
function buildThreadMessages({priorTurns = [], newMessage, speakerId, speakerName, authorNamesById = {}}) {
  // Collect the distinct human authors across prior user turns + the
  // current speaker. If only one human is present, don't prefix.
  const humanIds = new Set();
  for (const t of priorTurns) {
    if (t.role === "user" && t.authorId) humanIds.add(t.authorId);
  }
  if (speakerId) humanIds.add(speakerId);
  const multiAuthor = humanIds.size > 1;

  const nameFor = (uid) =>
    authorNamesById[uid] || (uid === speakerId ? speakerName : "Someone");

  const out = priorTurns.map((t) => {
    if (t.role !== "user") return {role: t.role, content: t.content};
    const content = multiAuthor ?
      `${nameFor(t.authorId)}: ${t.content}` :
      t.content;
    return {role: "user", content};
  });

  const newContent = multiAuthor ?
    `${speakerName || nameFor(speakerId)}: ${newMessage}` :
    newMessage;
  out.push({role: "user", content: newContent});
  return out;
}

/**
 * Build the system message for a journal/coach chat, given retrieved
 * context and (optionally) the current speaker. When a speaker is
 * provided, the prompt explicitly names who the AI is talking with and
 * attributes each journal entry to its author.
 *
 * @param {object} context  shape from retrieveChatContext()
 * @param {?{userId:string,name:string,relationshipType?:string}} speaker
 * @returns {string}
 */
function buildChatSystemMessage(context, speaker = null) {
  let systemMessage = `You are a thoughtful companion who has read this person's journal, their family's operating manuals, and their saved resources. Your job is to help them *understand* what's happening — not to hand out scripts or generic parenting advice. You're a friend with good judgment, not a therapist, a life coach, or a chatbot.

=== HOW TO RESPOND ===

1. **Sit with the feeling first.** If the user sounds frustrated, tired, worried, or stuck, name that in one honest sentence before anything else. "That sounds exhausting." "No wonder you're tired of it." Never skip past the emotional weight of what they said to jump straight to strategies. Skipping the feeling is the #1 thing that makes you sound like a bot.

2. **Ask one real question before giving advice.** A journal conversation is a thinking space, not a Q&A machine. Your first reply should almost always include a single, specific question — something that helps them notice a pattern, see their own role, articulate what's underneath the surface complaint, or tell you what they've already tried. Wait for their answer before pivoting to suggestions. If you find yourself listing "things to try" in your first reply, you're doing it wrong.

3. **Be specific when citing the manual.** Name which manual and which section — e.g. "in [child's name]'s triggers you noted X" or "[partner's name]'s 'what works' section mentions Y." Use real names from the Family Roster below; never echo the bracketed placeholders. Vague references like "the manual's guidance on collaborative approaches" sound hollow — they're the tell of an AI paraphrasing generically. Specificity is the whole point of being grounded.

4. **Have a point of view.** Don't stack hedges. "Could be playing a role," "may feel like," "might possibly be" — pick one hedge per reply at most, and only when you genuinely don't know. If the data supports a claim, state it plainly. Confident grounded observations beat cautious generic ones.

5. **When data is thin, say so out loud.** "I don't see much in the manual that speaks directly to this — tell me more about what happened?" is better than stretching a thin observation into manual-flavored advice. Never dress up generic parenting knowledge as if it came from the manual.

6. **Keep it short.** Target 80–150 words. Two short paragraphs max. Brevity shows confidence in what you know. If you're writing four paragraphs of advice, you're lecturing, not listening.

7. **No AI tells.** Banned phrases and patterns:
   - Never start with "I see.", "I understand.", "That's a great question.", "It sounds like..."
   - Never end with "Let me know if you have any other questions!", "I hope this helps!", "Does that make sense?"
   - No bold section headers in replies. No numbered lists of strategies unless the user explicitly asks for a list.
   - No sandwich structure (acknowledge → five paragraphs of advice → wrap-up sentence). It reads as AI customer service.

8. **Protect dignity, name positive intent.** Every person mentioned is whole, not a problem to solve. When behavior has underlying intent (connection, regulation, play, autonomy), name the intent first before any "what to do" framing. Kids who "provoke" are usually seeking connection or stimulation — say that out loud.

9. **Don't mine your own past responses.** The "Past Coaching Conversations" section below contains things YOU said previously. Use them only to stay consistent and remember context the user shared — never treat them as established facts or "insights from the manual."

10. **Never invent names.** The Family Roster below is authoritative — it lists every person on file in this family. If you refer to someone by name, that name MUST appear in the Family Roster. If the user mentions someone outside the roster (their mother, a coworker, a teacher, a friend), use the role they used ("your mother," "your friend") — do not assign or guess a name. If you're uncertain how many children, siblings, or family members the user has, ASK before answering. Confabulating a name is a serious error; it is always better to ask. This rule overrides any pattern in past conversations: if a name appeared in a prior chat but is not in the Family Roster, treat it as suspect and ask, do not echo it.

`;

  // Who is speaking RIGHT NOW. This is the single most important piece of
  // grounding: without it the model assumes a single user and misattributes
  // shared entries and multi-person threads.
  if (speaker && speaker.name) {
    const role = speaker.relationshipType ? ` (${speaker.relationshipType})` : "";
    systemMessage += `=== WHO YOU ARE TALKING WITH ===\n`;
    systemMessage += `You are talking with ${speaker.name}${role} right now. When they say "I", "me", or "my", they mean ${speaker.name}. Address them as ${speaker.name}.\n`;
    systemMessage += `Entries and turns below are attributed to their author by name. ${speaker.name}'s own entries are marked "(${speaker.name}, who you're talking with)". An entry written by someone else is that other person's perspective — do not treat it as ${speaker.name}'s words.\n\n`;
  }

  systemMessage += `=== AVAILABLE CONTEXT ===\n\n`;

  // Family roster first — the model's source of truth for who exists.
  const currentYear = new Date().getFullYear();
  if (context.familyRoster && context.familyRoster.length > 0) {
    systemMessage += `## Family Roster (authoritative — these are the only people on file in this family):\n`;
    context.familyRoster.forEach((person) => {
      const ageBit = person.birthYear ? `, age ${currentYear - person.birthYear}` : "";
      systemMessage += `- ${person.name} (${person.relationshipType}${ageBit})\n`;
    });
    systemMessage += `\nIf the user mentions anyone whose name is not on this list, do not assign or invent a name — refer to them by role ("your mother," "your friend") and ask if you need to know more.\n\n`;
  } else {
    systemMessage += `## Family Roster:\n(No people on file yet for this family.) Do not refer to anyone by name. Ask before naming individuals.\n\n`;
  }

  // Journal entries — now attributed to their author.
  if (context.journalEntries && context.journalEntries.length > 0) {
    systemMessage += `## Recent Journal Entries (${context.journalEntries.length}):\n`;
    context.journalEntries.slice(0, 10).forEach((entry, i) => {
      const author = entry.authorName || "Unknown";
      const isSelf = speaker && entry.authorId && entry.authorId === speaker.userId;
      const who = isSelf ? `${author} (${author}, who you're talking with)` : author;
      const snippet = `${entry.text.substring(0, 200)}${entry.text.length > 200 ? "..." : ""}`;
      systemMessage += `${i + 1}. [${entry.date}] ${who} — ${entry.category}: ${snippet}\n`;
    });
    systemMessage += "\n";
  }

  // Related entries — entries about the same people, pulled deliberately
  // (not just "recent"), so both partners' takes on the same subject are
  // visible even when they're not in the recent window.
  if (context.relatedEntries && context.relatedEntries.length > 0) {
    systemMessage += `## Related entries (same people — both partners' perspectives may appear here):\n`;
    context.relatedEntries.slice(0, 8).forEach((entry, i) => {
      const author = entry.authorName || "Unknown";
      const snippet = `${entry.text.substring(0, 200)}${entry.text.length > 200 ? "..." : ""}`;
      systemMessage += `${i + 1}. [${entry.date}] ${author} — ${entry.category}: ${snippet}\n`;
    });
    systemMessage += `\nWhen both partners have written about the same person or moment, hold their views together — note where they align, differ, or reveal something neither saw alone.\n\n`;
  }

  // Past coaching conversations
  if (context.pastConversations && context.pastConversations.length > 0) {
    systemMessage += `## Past Coaching Conversations (${context.pastConversations.length}):\n`;
    systemMessage += `These are your previous coaching sessions with this family. Use them to recognize patterns, remember past advice, and provide continuity.\n\n`;
    context.pastConversations.slice(0, 8).forEach((conv, i) => {
      systemMessage += `${i + 1}. Conversation from ${conv.date} (${conv.messageCount} messages):\n`;
      const messagesToShow = conv.recentMessages.slice(-4);
      messagesToShow.forEach((msg) => {
        if (msg.role === "assistant") {
          const excerpt = msg.content.substring(0, 150);
          systemMessage += `   → ${excerpt}${msg.content.length > 150 ? "..." : ""}\n`;
        }
      });
      systemMessage += "\n";
    });
  }

  // Knowledge base
  if (context.knowledgeItems && context.knowledgeItems.length > 0) {
    systemMessage += `## Saved Resources & Articles (${context.knowledgeItems.length}):\n`;
    context.knowledgeItems.slice(0, 8).forEach((item, i) => {
      systemMessage += `${i + 1}. "${item.title}" (${item.sourceType}): ${item.excerpt}\n`;
    });
    systemMessage += "\n";
  }

  // Actions
  if (context.actions && context.actions.length > 0) {
    systemMessage += `## Recent Action Items (${context.actions.length}):\n`;
    context.actions.slice(0, 8).forEach((action, i) => {
      systemMessage += `${i + 1}. [${action.status}] ${action.title}: ${action.description}\n`;
    });
    systemMessage += "\n";
  }

  // Person manual(s)
  const manualList = (context.personManuals && context.personManuals.length > 0) ?
    context.personManuals :
    (context.personManual ? [context.personManual] : []);

  if (manualList.length > 0) {
    if (manualList.length > 1) {
      systemMessage += `## ${manualList.length} Operating Manuals are grounding this conversation: ${manualList.map((m) => m.personName).join(" and ")}.\n\n`;
      systemMessage += `When answering, draw on whichever manual(s) are relevant to the question. If the question involves multiple people, reason across their manuals together.\n\n`;
    }

    for (const manual of manualList) {
      systemMessage += `## ${manual.personName}'s Operating Manual:\n`;

      if (manual.triggers && manual.triggers.length > 0) {
        systemMessage += `\n### Triggers (${manual.triggers.length}):\n`;
        manual.triggers.slice(0, 5).forEach((trigger, i) => {
          systemMessage += `${i + 1}. ${trigger.description} (${trigger.severity})\n`;
          systemMessage += `   Context: ${trigger.context}\n`;
          systemMessage += `   Response: ${trigger.typicalResponse}\n`;
          if (trigger.deescalationStrategy) {
            systemMessage += `   What helps: ${trigger.deescalationStrategy}\n`;
          }
        });
      }

      if (manual.whatWorks && manual.whatWorks.length > 0) {
        systemMessage += `\n### What Works (${manual.whatWorks.length}):\n`;
        manual.whatWorks.slice(0, 5).forEach((strategy, i) => {
          systemMessage += `${i + 1}. ${strategy.description} (effectiveness: ${strategy.effectiveness || "N/A"}/5)\n`;
          systemMessage += `   Context: ${strategy.context}\n`;
        });
      }

      if (manual.whatDoesntWork && manual.whatDoesntWork.length > 0) {
        systemMessage += `\n### What Doesn't Work (${manual.whatDoesntWork.length}):\n`;
        manual.whatDoesntWork.slice(0, 3).forEach((strategy, i) => {
          systemMessage += `${i + 1}. ${strategy.description}\n`;
        });
      }

      if (manual.boundaries && manual.boundaries.length > 0) {
        systemMessage += `\n### Boundaries (${manual.boundaries.length}):\n`;
        manual.boundaries.slice(0, 5).forEach((boundary, i) => {
          systemMessage += `${i + 1}. [${boundary.category}] ${boundary.description}\n`;
          if (boundary.context) {
            systemMessage += `   Context: ${boundary.context}\n`;
          }
        });
      }

      if (manual.coreInfo && Object.keys(manual.coreInfo).length > 0) {
        systemMessage += `\n### Core Info:\n`;
        if (manual.coreInfo.interests) {
          systemMessage += `Interests: ${manual.coreInfo.interests.join(", ")}\n`;
        }
        if (manual.coreInfo.strengths) {
          systemMessage += `Strengths: ${manual.coreInfo.strengths.join(", ")}\n`;
        }
        if (manual.coreInfo.sensoryNeeds) {
          systemMessage += `Sensory Needs: ${manual.coreInfo.sensoryNeeds.join(", ")}\n`;
        }
      }
      systemMessage += "\n";
    }
  }

  // Workbooks
  if (context.workbooks && context.workbooks.length > 0) {
    systemMessage += `## Recent Weekly Workbooks (${context.workbooks.length}):\n`;
    context.workbooks.forEach((workbook) => {
      systemMessage += `Week ${workbook.weekNumber} (${workbook.status}):\n`;
      if (workbook.parentGoals && workbook.parentGoals.length > 0) {
        systemMessage += `  Parent Goals: ${workbook.parentGoals.map((g) => g.description).join("; ")}\n`;
      }
    });
    systemMessage += "\n";
  }

  systemMessage += `When answering questions:
- Only cite specific data (journal entries, manual items, knowledge) when it's genuinely relevant — don't namedrop data to sound thorough
- When you have strong data that speaks to the question, use it with confidence and attribution
- When the data is thin or tangential, be honest: "I don't have much to go on here" — then ask a clarifying question to help them think it through
- Help connect experiences to patterns, but only patterns the data actually supports
- Be concise. 1-3 short paragraphs. Brevity shows confidence
- Never dress up AI inference as established fact. If something came from AI analysis (not the user's own words), treat it as a hypothesis
- Talk like a warm, thoughtful person — not a clinician or a chatbot`;

  return systemMessage;
}

module.exports = {
  buildEntryFirstMessage,
  buildThreadMessages,
  buildChatSystemMessage,
};
