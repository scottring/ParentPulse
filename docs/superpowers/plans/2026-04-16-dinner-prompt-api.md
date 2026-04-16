# Dinner Prompt API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Relish-side Cloud Functions for the Symphony wall-kiosk dinner-prompt feature: an HTTP endpoint that returns one daily prompt blending a curated library with occasional AI synthesis from manual + journal data.

**Architecture:** Two Firebase v2 `onRequest` HTTPS functions (`getDinnerPrompt`, `reportDinnerPrompt`) authenticated with a shared API key. A static JSON library + a per-household Firestore overlay supply prompts; AI synthesis fires at most twice per week when journal/manual signals match the week's theme. All persistence under `dinner_prompts/{householdId}/`.

**Tech Stack:** Firebase Functions v2 (JavaScript), Firestore Admin SDK, `@anthropic-ai/sdk` (existing), Mocha + Sinon for tests (matches existing `functions/__tests__/` pattern).

**Scope note:** This plan covers only the Relish backend. The Symphony-side wall-kiosk renderer is a separate plan in the Symphony repo.

---

## File Structure

**Create:**
- `functions/data/dinner-prompts.json` — static prompt library (~50 prompts)
- `functions/dinnerPrompts/themes.js` — theme rotation helper
- `functions/dinnerPrompts/library.js` — library picker (filtering + fallback chain)
- `functions/dinnerPrompts/signal.js` — "juicy signal" predicate for synthesis trigger
- `functions/dinnerPrompts/synthesis.js` — Claude call + library fallback
- `functions/dinnerPrompts/auth.js` — API key + householdId validation
- `functions/dinnerPrompts/dayDoc.js` — Firestore persistence helpers for `dinner_prompts/{householdId}/days/{date}`
- `functions/dinnerPrompts/handlers.js` — HTTP request handlers (orchestration)
- `functions/dinnerPrompts/index.js` — module entry; re-exports the two `onRequest` functions
- `functions/__tests__/dinnerPrompts/themes.test.js`
- `functions/__tests__/dinnerPrompts/library.test.js`
- `functions/__tests__/dinnerPrompts/signal.test.js`
- `functions/__tests__/dinnerPrompts/synthesis.test.js`
- `functions/__tests__/dinnerPrompts/auth.test.js`
- `functions/__tests__/dinnerPrompts/dayDoc.test.js`
- `functions/__tests__/dinnerPrompts/handlers.test.js`

**Modify:**
- `functions/index.js` — add `exports.getDinnerPrompt` and `exports.reportDinnerPrompt`
- `firestore.rules` (or `firestore-rules/firestore.rules` — see Task 21) — deny all client access to `dinner_prompts/` and `api_keys/`

**Manual setup (no code):**
- Set `RELISH_API_KEY` Firebase secret
- Seed `api_keys/{hash}` Firestore doc with `allowed_households` for the dev household

---

## Task 1: Create static prompt library JSON

**Files:**
- Create: `functions/data/dinner-prompts.json`

- [ ] **Step 1: Create the JSON file**

Path: `functions/data/dinner-prompts.json`

```json
[
  { "id": "courage-001", "text": "What's one small brave thing you did today?", "themes": ["courage"], "audiences": ["kid", "adult"] },
  { "id": "courage-002", "text": "When you're nervous, what helps you feel a little braver?", "themes": ["courage"], "audiences": ["kid", "adult"] },
  { "id": "courage-003", "text": "What's something you used to be scared of that doesn't scare you anymore?", "themes": ["courage"], "audiences": ["kid"] },
  { "id": "courage-004", "text": "When was the last time you said yes to something that scared you a little?", "themes": ["courage"], "audiences": ["adult"] },
  { "id": "courage-005", "text": "If you could try one new thing this week with zero chance of failing, what would it be?", "themes": ["courage", "dreams"], "audiences": ["kid", "adult"] },
  { "id": "gratitude-001", "text": "What's one tiny thing today that made you feel lucky?", "themes": ["gratitude"], "audiences": ["kid", "adult"] },
  { "id": "gratitude-002", "text": "Who made you smile today, and what did they do?", "themes": ["gratitude", "kindness"], "audiences": ["kid", "adult"] },
  { "id": "gratitude-003", "text": "What's a thing in our house you'd really miss if it disappeared tomorrow?", "themes": ["gratitude"], "audiences": ["kid"] },
  { "id": "gratitude-004", "text": "When was the last time someone surprised you with kindness?", "themes": ["gratitude", "kindness"], "audiences": ["adult"] },
  { "id": "gratitude-005", "text": "What's one ordinary thing you'd be sad to live without?", "themes": ["gratitude"], "audiences": ["adult"] },
  { "id": "silliness-001", "text": "If our family had a theme song, what would it be and why?", "themes": ["silliness"], "audiences": ["kid", "adult"] },
  { "id": "silliness-002", "text": "What's the silliest thing that happened this week?", "themes": ["silliness"], "audiences": ["kid", "adult"] },
  { "id": "silliness-003", "text": "If you could swap places with any animal for one day, which one and what would you do?", "themes": ["silliness", "curiosity"], "audiences": ["kid"] },
  { "id": "silliness-004", "text": "What's the most ridiculous outfit you'd wear if there were no rules?", "themes": ["silliness"], "audiences": ["kid"] },
  { "id": "silliness-005", "text": "If we had to give the kids a brand-new family rule, what's the funniest one you can think of?", "themes": ["silliness"], "audiences": ["adult"] },
  { "id": "kindness-001", "text": "Who needs a little extra kindness right now? What's one thing we could do?", "themes": ["kindness"], "audiences": ["kid", "adult"] },
  { "id": "kindness-002", "text": "What's something nice someone did for you today that you didn't get to thank them for?", "themes": ["kindness", "gratitude"], "audiences": ["kid", "adult"] },
  { "id": "kindness-003", "text": "If you could send a secret kind message to someone, who would you send it to?", "themes": ["kindness"], "audiences": ["kid"] },
  { "id": "kindness-004", "text": "When was the last time being kind cost you something — and was it worth it?", "themes": ["kindness"], "audiences": ["adult"] },
  { "id": "kindness-005", "text": "Who in our life have we been forgetting to call?", "themes": ["kindness", "family-history"], "audiences": ["adult"] },
  { "id": "curiosity-001", "text": "What's a question you've been wondering about lately?", "themes": ["curiosity"], "audiences": ["kid", "adult"] },
  { "id": "curiosity-002", "text": "If you could learn anything tomorrow with no effort, what would you pick?", "themes": ["curiosity", "dreams"], "audiences": ["kid", "adult"] },
  { "id": "curiosity-003", "text": "What's something you saw today that you wanted to know more about?", "themes": ["curiosity"], "audiences": ["kid"] },
  { "id": "curiosity-004", "text": "What's a topic you used to find boring that you're starting to like?", "themes": ["curiosity"], "audiences": ["adult"] },
  { "id": "curiosity-005", "text": "If you could spend one day inside any book or movie, which one?", "themes": ["curiosity", "dreams"], "audiences": ["kid", "adult"] },
  { "id": "family-history-001", "text": "What's a story about Mom or Dad as a kid that you want to hear again?", "themes": ["family-history"], "audiences": ["kid"] },
  { "id": "family-history-002", "text": "What's something you remember from when you were exactly the age the kids are now?", "themes": ["family-history"], "audiences": ["adult"] },
  { "id": "family-history-003", "text": "What family tradition do you love most? Which one should we start fresh?", "themes": ["family-history"], "audiences": ["kid", "adult"] },
  { "id": "family-history-004", "text": "Who's someone in our family you wish you knew better?", "themes": ["family-history", "curiosity"], "audiences": ["kid", "adult"] },
  { "id": "family-history-005", "text": "What's a thing your parents used to say that you catch yourself saying now?", "themes": ["family-history"], "audiences": ["adult"] },
  { "id": "dreams-001", "text": "If you could be amazing at one thing by next year, what would you pick?", "themes": ["dreams"], "audiences": ["kid", "adult"] },
  { "id": "dreams-002", "text": "What's one place in the world you really want to go someday?", "themes": ["dreams", "curiosity"], "audiences": ["kid", "adult"] },
  { "id": "dreams-003", "text": "If you ran the world for a day, what would you change first?", "themes": ["dreams"], "audiences": ["kid"] },
  { "id": "dreams-004", "text": "What's something you wanted as a kid that you actually have now?", "themes": ["dreams", "gratitude"], "audiences": ["adult"] },
  { "id": "dreams-005", "text": "What would you do tomorrow if you knew you couldn't fail?", "themes": ["dreams", "courage"], "audiences": ["adult"] },
  { "id": "connection-001", "text": "When did you feel most like yourself this week?", "themes": ["connection"], "audiences": ["adult"] },
  { "id": "connection-002", "text": "What's something you wish I knew about your week?", "themes": ["connection"], "audiences": ["adult"] },
  { "id": "connection-003", "text": "What's one thing about our family right now that you'd want to remember in ten years?", "themes": ["connection", "family-history"], "audiences": ["adult"] },
  { "id": "connection-004", "text": "What's something I do that helps you feel loved?", "themes": ["connection", "kindness"], "audiences": ["adult"] },
  { "id": "connection-005", "text": "What's a quiet thing about us that's working really well lately?", "themes": ["connection"], "audiences": ["adult"] },
  { "id": "challenge-001", "text": "What's one thing that was hard today, and what helped?", "themes": ["challenge"], "audiences": ["kid", "adult"] },
  { "id": "challenge-002", "text": "When you make a mistake, what's the first thing you usually do?", "themes": ["challenge"], "audiences": ["kid", "adult"] },
  { "id": "challenge-003", "text": "What's something you're working on that's harder than it looks from the outside?", "themes": ["challenge"], "audiences": ["adult"] },
  { "id": "challenge-004", "text": "What's a thing you used to find hard that's gotten easier?", "themes": ["challenge"], "audiences": ["kid", "adult"] },
  { "id": "challenge-005", "text": "Who in our family is really good at handling hard things — and what do they do that we could borrow?", "themes": ["challenge"], "audiences": ["kid", "adult"] },
  { "id": "wonder-001", "text": "What's the weirdest thing you've thought about today?", "themes": ["curiosity", "silliness"], "audiences": ["kid"] },
  { "id": "wonder-002", "text": "What's something tiny you noticed today that most people would miss?", "themes": ["curiosity"], "audiences": ["kid", "adult"] },
  { "id": "wonder-003", "text": "If trees could talk, what do you think the oldest one near our house would say?", "themes": ["curiosity", "silliness"], "audiences": ["kid"] },
  { "id": "wonder-004", "text": "What's one belief you have now that your younger self would be surprised by?", "themes": ["curiosity"], "audiences": ["adult"] },
  { "id": "wonder-005", "text": "What do you think we'll be doing five years from tonight?", "themes": ["dreams", "curiosity"], "audiences": ["kid", "adult"] }
]
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "console.log(require('./functions/data/dinner-prompts.json').length)"`
Expected: `50`

- [ ] **Step 3: Commit**

```bash
git add functions/data/dinner-prompts.json
git commit -m "feat(dinner-prompts): seed static prompt library with 50 prompts"
```

---

## Task 2: Theme rotation helper

**Files:**
- Create: `functions/dinnerPrompts/themes.js`
- Test: `functions/__tests__/dinnerPrompts/themes.test.js`

- [ ] **Step 1: Write the failing test**

Path: `functions/__tests__/dinnerPrompts/themes.test.js`

```javascript
const assert = require("assert");
const { pickTheme, THEMES } = require("../../dinnerPrompts/themes");

describe("themes.pickTheme", () => {
  it("returns a theme from the fixed vocabulary", () => {
    const theme = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "kid" });
    assert.ok(THEMES.includes(theme), `expected one of ${THEMES.join(",")}, got ${theme}`);
  });

  it("is deterministic for the same household + ISO week + audience", () => {
    const a = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "kid" });
    const b = pickTheme({ householdId: "h1", date: new Date("2026-04-15"), audience: "kid" });
    assert.strictEqual(a, b, "same ISO week should produce same theme");
  });

  it("can differ across households in the same week", () => {
    const seen = new Set();
    for (let i = 0; i < 20; i++) {
      seen.add(pickTheme({ householdId: `h${i}`, date: new Date("2026-04-16"), audience: "kid" }));
    }
    assert.ok(seen.size > 1, "expected variation across households");
  });

  it("uses a different salt for adult vs kid so Friday adult theme can differ from kid theme", () => {
    const kid = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "kid" });
    const adult = pickTheme({ householdId: "h1", date: new Date("2026-04-16"), audience: "adult" });
    let differenceFound = false;
    for (let i = 0; i < 20; i++) {
      const k = pickTheme({ householdId: `h${i}`, date: new Date("2026-04-16"), audience: "kid" });
      const a = pickTheme({ householdId: `h${i}`, date: new Date("2026-04-16"), audience: "adult" });
      if (k !== a) { differenceFound = true; break; }
    }
    assert.ok(differenceFound, "kid and adult themes should differ for at least one household");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/themes.test.js`
Expected: FAIL — "Cannot find module '../../dinnerPrompts/themes'"

- [ ] **Step 3: Implement themes.js**

Path: `functions/dinnerPrompts/themes.js`

```javascript
const crypto = require("crypto");

const THEMES = [
  "courage",
  "gratitude",
  "silliness",
  "kindness",
  "curiosity",
  "family-history",
  "dreams",
  "connection",
  "challenge",
];

function isoWeekKey(date) {
  // Returns "YYYY-Www" string for the date's ISO week
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function pickTheme({ householdId, date, audience }) {
  const salt = audience === "adult" ? "adult-v1" : "kid-v1";
  const key = `${householdId}|${isoWeekKey(date)}|${salt}`;
  const hash = crypto.createHash("sha256").update(key).digest();
  const idx = hash.readUInt32BE(0) % THEMES.length;
  return THEMES[idx];
}

module.exports = { pickTheme, THEMES, isoWeekKey };
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/themes.test.js`
Expected: PASS — 4 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/themes.js functions/__tests__/dinnerPrompts/themes.test.js
git commit -m "feat(dinner-prompts): deterministic theme rotation per ISO week"
```

---

## Task 3: Library picker — basic filter (audience + theme)

**Files:**
- Create: `functions/dinnerPrompts/library.js`
- Test: `functions/__tests__/dinnerPrompts/library.test.js`

- [ ] **Step 1: Write the failing test**

Path: `functions/__tests__/dinnerPrompts/library.test.js`

```javascript
const assert = require("assert");
const { pickFromLibrary } = require("../../dinnerPrompts/library");

const fakeLibrary = [
  { id: "kid-courage-1", text: "Brave?", themes: ["courage"], audiences: ["kid"] },
  { id: "adult-courage-1", text: "Brave adult?", themes: ["courage"], audiences: ["adult"] },
  { id: "kid-grat-1", text: "Grateful?", themes: ["gratitude"], audiences: ["kid"] },
  { id: "any-kind-1", text: "Kind?", themes: ["kindness"], audiences: ["kid", "adult"] },
];

describe("library.pickFromLibrary — basic filter", () => {
  it("returns a prompt matching audience and theme", () => {
    const result = pickFromLibrary({
      library: fakeLibrary,
      audience: "kid",
      theme: "courage",
      recentlyServedIds: [],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "kid-courage-1");
  });

  it("respects audience boundary", () => {
    const result = pickFromLibrary({
      library: fakeLibrary,
      audience: "adult",
      theme: "courage",
      recentlyServedIds: [],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "adult-courage-1");
  });

  it("matches multi-audience prompts for either audience", () => {
    const result = pickFromLibrary({
      library: fakeLibrary,
      audience: "adult",
      theme: "kindness",
      recentlyServedIds: [],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "any-kind-1");
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/library.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement basic picker**

Path: `functions/dinnerPrompts/library.js`

```javascript
function pickFromLibrary({ library, audience, theme, recentlyServedIds, flaggedIds, now }) {
  const candidates = library.filter(p =>
    p.audiences.includes(audience) &&
    p.themes.includes(theme) &&
    !recentlyServedIds.includes(p.id) &&
    !flaggedIds.includes(p.id)
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

module.exports = { pickFromLibrary };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/library.test.js`
Expected: PASS — 3 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/library.js functions/__tests__/dinnerPrompts/library.test.js
git commit -m "feat(dinner-prompts): library picker with audience+theme filter"
```

---

## Task 4: Library picker — exclusion of recently served prompts

**Files:**
- Modify: `functions/__tests__/dinnerPrompts/library.test.js`

- [ ] **Step 1: Add a failing test**

Append to `functions/__tests__/dinnerPrompts/library.test.js`:

```javascript
describe("library.pickFromLibrary — exclusion", () => {
  it("excludes recently served prompt ids", () => {
    const lib = [
      { id: "a", text: "A", themes: ["courage"], audiences: ["kid"] },
      { id: "b", text: "B", themes: ["courage"], audiences: ["kid"] },
    ];
    const result = pickFromLibrary({
      library: lib,
      audience: "kid",
      theme: "courage",
      recentlyServedIds: ["a"],
      flaggedIds: [],
      now: new Date(),
    });
    assert.strictEqual(result.id, "b");
  });

  it("excludes flagged prompt ids", () => {
    const lib = [
      { id: "a", text: "A", themes: ["courage"], audiences: ["kid"] },
      { id: "b", text: "B", themes: ["courage"], audiences: ["kid"] },
    ];
    const result = pickFromLibrary({
      library: lib,
      audience: "kid",
      theme: "courage",
      recentlyServedIds: [],
      flaggedIds: ["b"],
      now: new Date(),
    });
    assert.strictEqual(result.id, "a");
  });
});
```

- [ ] **Step 2: Run, verify pass**

Already passes (the basic implementation in Task 3 already handles `recentlyServedIds` and `flaggedIds`). If it doesn't pass, fix `library.js`.

Run: `cd functions && npx mocha __tests__/dinnerPrompts/library.test.js`
Expected: PASS — 5 passing

- [ ] **Step 3: Commit**

```bash
git add functions/__tests__/dinnerPrompts/library.test.js
git commit -m "test(dinner-prompts): cover library exclusion paths"
```

---

## Task 5: Library picker — fallback chain when no candidates

**Files:**
- Modify: `functions/dinnerPrompts/library.js`
- Modify: `functions/__tests__/dinnerPrompts/library.test.js`

- [ ] **Step 1: Add failing tests**

Append:

```javascript
describe("library.pickWithFallback — fallback chain", () => {
  const { pickWithFallback } = require("../../dinnerPrompts/library");

  it("returns a normal pick when candidates exist", () => {
    const lib = [{ id: "a", text: "A", themes: ["courage"], audiences: ["kid"] }];
    const result = pickWithFallback({
      library: lib, audience: "kid", theme: "courage",
      recentlyServedIds: [], flaggedIds: [], now: new Date(),
    });
    assert.strictEqual(result.prompt.id, "a");
    assert.strictEqual(result.relaxation, "none");
  });

  it("relaxes the recency window when nothing matches", () => {
    const lib = [{ id: "a", text: "A", themes: ["courage"], audiences: ["kid"] }];
    const result = pickWithFallback({
      library: lib, audience: "kid", theme: "courage",
      recentlyServedIds: ["a"], flaggedIds: [], now: new Date(),
    });
    assert.strictEqual(result.prompt.id, "a");
    assert.strictEqual(result.relaxation, "recency-relaxed");
  });

  it("drops the theme constraint when still nothing", () => {
    const lib = [{ id: "kind-1", text: "K", themes: ["kindness"], audiences: ["kid"] }];
    const result = pickWithFallback({
      library: lib, audience: "kid", theme: "courage",
      recentlyServedIds: [], flaggedIds: [], now: new Date(),
    });
    assert.strictEqual(result.prompt.id, "kind-1");
    assert.strictEqual(result.relaxation, "theme-dropped");
  });

  it("falls back to any audience match as last resort", () => {
    const lib = [{ id: "any-1", text: "X", themes: ["dreams"], audiences: ["adult"] }];
    const result = pickWithFallback({
      library: lib, audience: "kid", theme: "courage",
      recentlyServedIds: [], flaggedIds: [], now: new Date(),
    });
    // No match for kid; ultimate fallback drops audience constraint
    assert.strictEqual(result.prompt.id, "any-1");
    assert.strictEqual(result.relaxation, "audience-dropped");
  });

  it("never returns flagged prompts even after relaxation", () => {
    const lib = [{ id: "a", text: "A", themes: ["courage"], audiences: ["kid"] }];
    const result = pickWithFallback({
      library: lib, audience: "kid", theme: "courage",
      recentlyServedIds: [], flaggedIds: ["a"], now: new Date(),
    });
    assert.strictEqual(result, null);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/library.test.js`
Expected: FAIL — pickWithFallback not exported

- [ ] **Step 3: Implement fallback chain**

Update `functions/dinnerPrompts/library.js` — replace its contents:

```javascript
function pickFromLibrary({ library, audience, theme, recentlyServedIds, flaggedIds }) {
  const candidates = library.filter(p =>
    p.audiences.includes(audience) &&
    p.themes.includes(theme) &&
    !recentlyServedIds.includes(p.id) &&
    !flaggedIds.includes(p.id)
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickWithFallback({ library, audience, theme, recentlyServedIds, flaggedIds }) {
  // 1. Normal pick
  let prompt = pickFromLibrary({ library, audience, theme, recentlyServedIds, flaggedIds });
  if (prompt) return { prompt, relaxation: "none" };

  // 2. Relax recency
  prompt = pickFromLibrary({ library, audience, theme, recentlyServedIds: [], flaggedIds });
  if (prompt) return { prompt, relaxation: "recency-relaxed" };

  // 3. Drop theme — keep audience + flag exclusion
  const audienceMatches = library.filter(p =>
    p.audiences.includes(audience) && !flaggedIds.includes(p.id)
  );
  if (audienceMatches.length > 0) {
    return {
      prompt: audienceMatches[Math.floor(Math.random() * audienceMatches.length)],
      relaxation: "theme-dropped",
    };
  }

  // 4. Drop audience too — only flag exclusion
  const anyMatches = library.filter(p => !flaggedIds.includes(p.id));
  if (anyMatches.length > 0) {
    return {
      prompt: anyMatches[Math.floor(Math.random() * anyMatches.length)],
      relaxation: "audience-dropped",
    };
  }

  return null;
}

module.exports = { pickFromLibrary, pickWithFallback };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/library.test.js`
Expected: PASS — 10 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/library.js functions/__tests__/dinnerPrompts/library.test.js
git commit -m "feat(dinner-prompts): library fallback chain with relaxation tracking"
```

---

## Task 6: Juicy-signal predicate — keyword match

**Files:**
- Create: `functions/dinnerPrompts/signal.js`
- Test: `functions/__tests__/dinnerPrompts/signal.test.js`

- [ ] **Step 1: Write failing test**

Path: `functions/__tests__/dinnerPrompts/signal.test.js`

```javascript
const assert = require("assert");
const { hasJuicySignal, THEME_KEYWORDS } = require("../../dinnerPrompts/signal");

describe("signal.hasJuicySignal — keyword match", () => {
  const now = new Date("2026-04-16T12:00:00Z");
  const recent = new Date("2026-04-15T12:00:00Z"); // within 7 days
  const old = new Date("2026-04-01T12:00:00Z");    // outside 7 days

  it("returns false when there are no recent entries", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, false);
  });

  it("matches a recent journal entry containing a theme keyword", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "Mia was so brave at swim today", createdAt: recent, authorIsHouseholdMember: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, true);
    assert.deepStrictEqual(result.matchedJournalIds, ["j1"]);
  });

  it("ignores entries older than 7 days", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "brave", createdAt: old, authorIsHouseholdMember: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, false);
  });

  it("exposes the theme keyword vocabulary for inspection", () => {
    assert.ok(Array.isArray(THEME_KEYWORDS.courage), "courage keywords array should exist");
    assert.ok(THEME_KEYWORDS.courage.length > 0, "should have at least one keyword");
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/signal.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement keyword match**

Path: `functions/dinnerPrompts/signal.js`

```javascript
const THEME_KEYWORDS = {
  courage: ["brave", "scared", "scary", "nervous", "afraid", "tried"],
  gratitude: ["grateful", "thankful", "lucky", "appreciate", "thank"],
  silliness: ["silly", "funny", "ridiculous", "laugh", "joke"],
  kindness: ["kind", "nice", "helped", "shared", "thoughtful"],
  curiosity: ["wonder", "curious", "noticed", "question", "interesting"],
  "family-history": ["remember", "used to", "tradition", "grandma", "grandpa", "when I was"],
  dreams: ["wish", "hope", "want to", "someday", "dream"],
  connection: ["close", "together", "miss", "love", "feel"],
  challenge: ["hard", "tough", "struggle", "difficult", "couldn't"],
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function withinLast7Days(date, now) {
  return now - new Date(date) <= SEVEN_DAYS_MS;
}

function hasJuicySignal({ theme, recentJournalEntries, recentManualAnswers, synthCountInLast7Days, now }) {
  if (synthCountInLast7Days >= 2) {
    return { matched: false, reason: "synth-cap-reached" };
  }

  const keywords = (THEME_KEYWORDS[theme] || []).map(k => k.toLowerCase());
  const matchedJournalIds = [];
  const matchedManualIds = [];

  for (const entry of recentJournalEntries) {
    if (!entry.authorIsHouseholdMember) continue;
    if (!withinLast7Days(entry.createdAt, now)) continue;
    const text = (entry.text || "").toLowerCase();
    if (keywords.some(k => text.includes(k)) || entry.salient === true) {
      matchedJournalIds.push(entry.id);
    }
  }

  for (const answer of recentManualAnswers) {
    if (!answer.authorIsHouseholdMember) continue;
    if (!withinLast7Days(answer.createdAt, now)) continue;
    const text = (answer.text || "").toLowerCase();
    if (keywords.some(k => text.includes(k)) || answer.salient === true) {
      matchedManualIds.push(answer.id);
    }
  }

  const matched = matchedJournalIds.length > 0 || matchedManualIds.length > 0;
  return { matched, matchedJournalIds, matchedManualIds };
}

module.exports = { hasJuicySignal, THEME_KEYWORDS };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/signal.test.js`
Expected: PASS — 4 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/signal.js functions/__tests__/dinnerPrompts/signal.test.js
git commit -m "feat(dinner-prompts): juicy-signal predicate with theme keyword match"
```

---

## Task 7: Juicy-signal — salience flag, observer exclusion, weekly cap

**Files:**
- Modify: `functions/__tests__/dinnerPrompts/signal.test.js`

- [ ] **Step 1: Add failing tests**

Append:

```javascript
describe("signal.hasJuicySignal — additional rules", () => {
  const now = new Date("2026-04-16T12:00:00Z");
  const recent = new Date("2026-04-15T12:00:00Z");

  it("matches on the salient flag even without keyword match", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "We had a really long day", createdAt: recent, authorIsHouseholdMember: true, salient: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, true);
  });

  it("excludes contributions from non-household members (observers/friends)", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "Mia was brave", createdAt: recent, authorIsHouseholdMember: false },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 0,
      now,
    });
    assert.strictEqual(result.matched, false);
  });

  it("respects the 2-per-week synthesis cap", () => {
    const result = hasJuicySignal({
      theme: "courage",
      recentJournalEntries: [
        { id: "j1", text: "brave", createdAt: recent, authorIsHouseholdMember: true },
      ],
      recentManualAnswers: [],
      synthCountInLast7Days: 2,
      now,
    });
    assert.strictEqual(result.matched, false);
    assert.strictEqual(result.reason, "synth-cap-reached");
  });
});
```

- [ ] **Step 2: Run, verify pass**

The Task 6 implementation already covers all three cases. Run:

`cd functions && npx mocha __tests__/dinnerPrompts/signal.test.js`
Expected: PASS — 7 passing

- [ ] **Step 3: Commit**

```bash
git add functions/__tests__/dinnerPrompts/signal.test.js
git commit -m "test(dinner-prompts): cover salience, observer, and synth-cap paths"
```

---

## Task 8: Synthesis module — successful Claude call

**Files:**
- Create: `functions/dinnerPrompts/synthesis.js`
- Test: `functions/__tests__/dinnerPrompts/synthesis.test.js`

- [ ] **Step 1: Write failing test**

Path: `functions/__tests__/dinnerPrompts/synthesis.test.js`

```javascript
const assert = require("assert");
const sinon = require("sinon");
const { synthesizePrompt } = require("../../dinnerPrompts/synthesis");

describe("synthesis.synthesizePrompt", () => {
  it("returns a generated prompt when Claude responds successfully", async () => {
    const fakeClient = {
      messages: {
        create: sinon.stub().resolves({
          content: [{ type: "text", text: "When did you feel brave like Mia at swim?" }],
        }),
      },
    };
    const result = await synthesizePrompt({
      client: fakeClient,
      theme: "courage",
      audience: "kid",
      excerpts: [{ source: "journal", text: "Mia was brave at swim", firstName: "Mia" }],
    });
    assert.strictEqual(result.text, "When did you feel brave like Mia at swim?");
    assert.strictEqual(result.source, "synthesized");
    sinon.assert.calledOnce(fakeClient.messages.create);
    const call = fakeClient.messages.create.firstCall.args[0];
    assert.strictEqual(call.model, "claude-haiku-4-5-20251001");
  });

  it("trims whitespace from the model response", async () => {
    const fakeClient = {
      messages: { create: sinon.stub().resolves({ content: [{ type: "text", text: "  Hi?  \n" }] }) },
    };
    const result = await synthesizePrompt({
      client: fakeClient, theme: "courage", audience: "kid",
      excerpts: [{ source: "journal", text: "x", firstName: "Mia" }],
    });
    assert.strictEqual(result.text, "Hi?");
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/synthesis.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement synthesis**

Path: `functions/dinnerPrompts/synthesis.js`

```javascript
const SYSTEM_PROMPT = `You are writing one short dinner-table conversation question for a family.

Rules:
- Output exactly ONE question, max 25 words.
- Match the requested audience: "kid" prompts must be accessible to a 7-year-old; "adult" prompts can be more reflective.
- Use the family signal as inspiration, NOT as a quote — never repeat the journal/manual text verbatim.
- Connect the family signal to the requested theme.
- No preamble, no headers, no explanation. Just the question.
- Plain text. No emoji unless the audience is "kid" and it would clearly help.`;

async function synthesizePrompt({ client, theme, audience, excerpts }) {
  const excerptBlock = excerpts
    .map(e => `(${e.source}, ${e.firstName}) ${e.text}`)
    .join("\n");

  const userMessage = `Theme: ${theme}
Audience: ${audience}

Family signals from the last 7 days:
${excerptBlock}

Write the question now.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content.find(b => b.type === "text");
  if (!block || !block.text) {
    throw new Error("synthesis returned no text block");
  }

  return {
    text: block.text.trim(),
    source: "synthesized",
  };
}

module.exports = { synthesizePrompt, SYSTEM_PROMPT };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/synthesis.test.js`
Expected: PASS — 2 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/synthesis.js functions/__tests__/dinnerPrompts/synthesis.test.js
git commit -m "feat(dinner-prompts): Claude-based prompt synthesis"
```

---

## Task 9: Synthesis fallback when Claude errors

**Files:**
- Modify: `functions/dinnerPrompts/synthesis.js`
- Modify: `functions/__tests__/dinnerPrompts/synthesis.test.js`

- [ ] **Step 1: Write failing test**

Append:

```javascript
describe("synthesis.synthesizeOrFallback", () => {
  const { synthesizeOrFallback } = require("../../dinnerPrompts/synthesis");

  it("returns the synthesized prompt on success", async () => {
    const client = {
      messages: { create: sinon.stub().resolves({ content: [{ type: "text", text: "Q?" }] }) },
    };
    const fallback = sinon.stub().returns({ id: "lib-1", text: "Lib?" });
    const result = await synthesizeOrFallback({
      client, theme: "courage", audience: "kid",
      excerpts: [{ source: "journal", text: "x", firstName: "Mia" }],
      libraryFallback: fallback,
    });
    assert.strictEqual(result.source, "synthesized");
    assert.strictEqual(result.text, "Q?");
    sinon.assert.notCalled(fallback);
  });

  it("returns the library fallback when Claude throws", async () => {
    const client = { messages: { create: sinon.stub().rejects(new Error("boom")) } };
    const fallback = sinon.stub().returns({ prompt: { id: "lib-1", text: "Lib?" }, relaxation: "none" });
    const result = await synthesizeOrFallback({
      client, theme: "courage", audience: "kid",
      excerpts: [{ source: "journal", text: "x", firstName: "Mia" }],
      libraryFallback: fallback,
    });
    assert.strictEqual(result.source, "library");
    assert.strictEqual(result.text, "Lib?");
    sinon.assert.calledOnce(fallback);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/synthesis.test.js`
Expected: FAIL — synthesizeOrFallback not exported

- [ ] **Step 3: Implement fallback wrapper**

Append to `functions/dinnerPrompts/synthesis.js` before `module.exports`:

```javascript
async function synthesizeOrFallback({ client, theme, audience, excerpts, libraryFallback }) {
  try {
    const synth = await synthesizePrompt({ client, theme, audience, excerpts });
    return { ...synth, sourceRefs: { journalEntryIds: [], manualAnswerIds: [] } };
  } catch (err) {
    console.warn("[dinner-prompts] synthesis failed, falling back to library", err.message);
    const fb = libraryFallback();
    if (!fb) return null;
    return {
      text: fb.prompt.text,
      source: "library",
      sourceRefs: { libraryId: fb.prompt.id },
      relaxation: fb.relaxation,
    };
  }
}
```

Update `module.exports`:

```javascript
module.exports = { synthesizePrompt, synthesizeOrFallback, SYSTEM_PROMPT };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/synthesis.test.js`
Expected: PASS — 4 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/synthesis.js functions/__tests__/dinnerPrompts/synthesis.test.js
git commit -m "feat(dinner-prompts): synthesis falls back to library on Claude error"
```

---

## Task 10: API key authentication

**Files:**
- Create: `functions/dinnerPrompts/auth.js`
- Test: `functions/__tests__/dinnerPrompts/auth.test.js`

- [ ] **Step 1: Write failing tests**

Path: `functions/__tests__/dinnerPrompts/auth.test.js`

```javascript
const assert = require("assert");
const { hashApiKey, validateApiKey } = require("../../dinnerPrompts/auth");

describe("auth.hashApiKey", () => {
  it("produces a stable sha256 hex digest", () => {
    const a = hashApiKey("abc");
    const b = hashApiKey("abc");
    assert.strictEqual(a, b);
    assert.strictEqual(a.length, 64);
  });

  it("differs for different inputs", () => {
    assert.notStrictEqual(hashApiKey("a"), hashApiKey("b"));
  });
});

describe("auth.validateApiKey", () => {
  function fakeStore(records) {
    return {
      doc: (id) => ({ get: async () => ({ exists: !!records[id], data: () => records[id] }) }),
    };
  }

  it("returns ok when key hash exists and household is allowed", async () => {
    const apiKey = "secret-key";
    const hash = hashApiKey(apiKey);
    const store = fakeStore({ [hash]: { allowed_households: ["h1"], label: "symphony-prod" } });
    const result = await validateApiKey({ apiKey, householdId: "h1", apiKeysCollection: store });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.label, "symphony-prod");
  });

  it("rejects when key not found", async () => {
    const store = fakeStore({});
    const result = await validateApiKey({ apiKey: "nope", householdId: "h1", apiKeysCollection: store });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 401);
  });

  it("rejects when household not in allow list", async () => {
    const apiKey = "secret";
    const store = fakeStore({ [hashApiKey(apiKey)]: { allowed_households: ["h2"] } });
    const result = await validateApiKey({ apiKey, householdId: "h1", apiKeysCollection: store });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 403);
  });

  it("rejects when apiKey is missing", async () => {
    const result = await validateApiKey({ apiKey: null, householdId: "h1", apiKeysCollection: fakeStore({}) });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 401);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/auth.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement auth**

Path: `functions/dinnerPrompts/auth.js`

```javascript
const crypto = require("crypto");

function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function extractBearer(authorizationHeader) {
  if (!authorizationHeader) return null;
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function validateApiKey({ apiKey, householdId, apiKeysCollection }) {
  if (!apiKey) return { ok: false, status: 401, error: "missing api key" };
  if (!householdId) return { ok: false, status: 400, error: "missing householdId" };

  const hash = hashApiKey(apiKey);
  const snap = await apiKeysCollection.doc(hash).get();
  if (!snap.exists) return { ok: false, status: 401, error: "invalid api key" };

  const data = snap.data();
  const allowed = Array.isArray(data.allowed_households) ? data.allowed_households : [];
  if (!allowed.includes(householdId)) {
    return { ok: false, status: 403, error: "household not allowed for this key" };
  }

  return { ok: true, label: data.label || null };
}

module.exports = { hashApiKey, extractBearer, validateApiKey };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/auth.test.js`
Expected: PASS — 6 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/auth.js functions/__tests__/dinnerPrompts/auth.test.js
git commit -m "feat(dinner-prompts): API key + household allow-list auth"
```

---

## Task 11: Day-doc persistence helpers

**Files:**
- Create: `functions/dinnerPrompts/dayDoc.js`
- Test: `functions/__tests__/dinnerPrompts/dayDoc.test.js`

- [ ] **Step 1: Write failing tests**

Path: `functions/__tests__/dinnerPrompts/dayDoc.test.js`

```javascript
const assert = require("assert");
const sinon = require("sinon");
const { writeNewDay, readDay, recordSwap, recordReport } = require("../../dinnerPrompts/dayDoc");

function fakeDayDocRef(initial) {
  let state = initial;
  return {
    get: sinon.stub().callsFake(async () => ({
      exists: state !== undefined,
      data: () => state,
    })),
    set: sinon.stub().callsFake(async (data) => { state = data; }),
    update: sinon.stub().callsFake(async (patch) => {
      state = { ...state, ...patch };
    }),
    _state: () => state,
  };
}

describe("dayDoc.writeNewDay", () => {
  it("persists a new day-doc with status 'served'", async () => {
    const ref = fakeDayDocRef(undefined);
    const now = new Date("2026-04-16T22:00:00Z");
    await writeNewDay({
      ref,
      payload: {
        text: "Q?",
        audience: "kid",
        theme: "courage",
        source: "library",
        sourceRefs: { libraryId: "courage-001" },
      },
      now,
    });
    sinon.assert.calledOnce(ref.set);
    const written = ref.set.firstCall.args[0];
    assert.strictEqual(written.status, "served");
    assert.strictEqual(written.text, "Q?");
    assert.deepStrictEqual(written.swapHistory, []);
    assert.ok(written.servedAt instanceof Date);
  });
});

describe("dayDoc.readDay", () => {
  it("returns null when doc does not exist", async () => {
    const ref = fakeDayDocRef(undefined);
    const result = await readDay({ ref });
    assert.strictEqual(result, null);
  });
  it("returns the data when doc exists", async () => {
    const ref = fakeDayDocRef({ text: "Q?", status: "served" });
    const result = await readDay({ ref });
    assert.strictEqual(result.text, "Q?");
  });
});

describe("dayDoc.recordSwap", () => {
  it("appends to swapHistory and overwrites the prompt fields", async () => {
    const ref = fakeDayDocRef({
      text: "Old?", audience: "kid", theme: "courage", source: "library",
      sourceRefs: { libraryId: "courage-001" }, status: "served", swapHistory: [],
    });
    const now = new Date("2026-04-16T23:00:00Z");
    await recordSwap({
      ref,
      newPayload: { text: "New?", source: "library", sourceRefs: { libraryId: "courage-002" } },
      now,
    });
    const state = ref._state();
    assert.strictEqual(state.text, "New?");
    assert.strictEqual(state.status, "swapped");
    assert.strictEqual(state.swapHistory.length, 1);
    assert.strictEqual(state.swapHistory[0].previousText, "Old?");
    assert.strictEqual(state.swapHistory[0].previousLibraryId, "courage-001");
  });
});

describe("dayDoc.recordReport", () => {
  it("sets status to reported and stores reason + timestamp", async () => {
    const ref = fakeDayDocRef({ text: "Q?", status: "served" });
    const now = new Date("2026-04-16T23:00:00Z");
    await recordReport({ ref, reason: "too dark for kids", now });
    const state = ref._state();
    assert.strictEqual(state.status, "reported");
    assert.strictEqual(state.reportedReason, "too dark for kids");
    assert.ok(state.reportedAt instanceof Date);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/dayDoc.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement dayDoc**

Path: `functions/dinnerPrompts/dayDoc.js`

```javascript
async function writeNewDay({ ref, payload, now }) {
  await ref.set({
    text: payload.text,
    audience: payload.audience,
    theme: payload.theme,
    source: payload.source,
    sourceRefs: payload.sourceRefs || {},
    status: "served",
    swapHistory: [],
    servedAt: now,
  });
}

async function readDay({ ref }) {
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data();
}

async function recordSwap({ ref, newPayload, now }) {
  const snap = await ref.get();
  const prev = snap.exists ? snap.data() : null;
  const swapEntry = prev
    ? {
        at: now,
        previousText: prev.text,
        previousLibraryId: prev.sourceRefs && prev.sourceRefs.libraryId ? prev.sourceRefs.libraryId : null,
      }
    : null;

  const swapHistory = prev && Array.isArray(prev.swapHistory) ? [...prev.swapHistory] : [];
  if (swapEntry) swapHistory.push(swapEntry);

  await ref.update({
    text: newPayload.text,
    source: newPayload.source,
    sourceRefs: newPayload.sourceRefs || {},
    status: "swapped",
    swapHistory,
  });
}

async function recordReport({ ref, reason, now }) {
  await ref.update({
    status: "reported",
    reportedAt: now,
    reportedReason: reason || null,
  });
}

module.exports = { writeNewDay, readDay, recordSwap, recordReport };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/dayDoc.test.js`
Expected: PASS — 5 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/dayDoc.js functions/__tests__/dinnerPrompts/dayDoc.test.js
git commit -m "feat(dinner-prompts): day-doc persistence helpers"
```

---

## Task 12: Audience-by-day helper

**Files:**
- Modify: `functions/dinnerPrompts/themes.js`
- Modify: `functions/__tests__/dinnerPrompts/themes.test.js`

- [ ] **Step 1: Write failing test**

Append to `functions/__tests__/dinnerPrompts/themes.test.js`:

```javascript
describe("themes.audienceForDate", () => {
  const { audienceForDate } = require("../../dinnerPrompts/themes");

  it("returns 'adult' on Friday", () => {
    // 2026-04-17 is a Friday
    assert.strictEqual(audienceForDate(new Date("2026-04-17T18:00:00Z")), "adult");
  });

  it("returns 'kid' on every other day of the week", () => {
    const expectations = {
      "2026-04-13T18:00:00Z": "kid", // Mon
      "2026-04-14T18:00:00Z": "kid", // Tue
      "2026-04-15T18:00:00Z": "kid", // Wed
      "2026-04-16T18:00:00Z": "kid", // Thu
      "2026-04-18T18:00:00Z": "kid", // Sat
      "2026-04-19T18:00:00Z": "kid", // Sun
    };
    for (const [iso, expected] of Object.entries(expectations)) {
      assert.strictEqual(audienceForDate(new Date(iso)), expected, `failed for ${iso}`);
    }
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/themes.test.js`
Expected: FAIL — audienceForDate not exported

- [ ] **Step 3: Implement audienceForDate**

Update `functions/dinnerPrompts/themes.js`. Add before `module.exports`:

```javascript
function audienceForDate(date) {
  // getUTCDay: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  return date.getUTCDay() === 5 ? "adult" : "kid";
}
```

Update exports:

```javascript
module.exports = { pickTheme, THEMES, isoWeekKey, audienceForDate };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/themes.test.js`
Expected: PASS — 6 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/themes.js functions/__tests__/dinnerPrompts/themes.test.js
git commit -m "feat(dinner-prompts): audienceForDate (Friday=adult, else=kid)"
```

---

## Task 13: Recently-served lookup

**Files:**
- Modify: `functions/dinnerPrompts/dayDoc.js`
- Modify: `functions/__tests__/dinnerPrompts/dayDoc.test.js`

- [ ] **Step 1: Write failing test**

Append to `functions/__tests__/dinnerPrompts/dayDoc.test.js`:

```javascript
describe("dayDoc.recentlyServedLibraryIds", () => {
  const { recentlyServedLibraryIds } = require("../../dinnerPrompts/dayDoc");

  it("returns library ids from days within the window", async () => {
    const fakeDays = {
      where: () => ({
        get: async () => ({
          docs: [
            { data: () => ({ source: "library", sourceRefs: { libraryId: "a" } }) },
            { data: () => ({ source: "synthesized", sourceRefs: { journalEntryIds: ["j1"] } }) },
            { data: () => ({ source: "library", sourceRefs: { libraryId: "b" } }) },
          ],
        }),
      }),
    };
    const ids = await recentlyServedLibraryIds({
      daysCollection: fakeDays,
      now: new Date("2026-04-16T00:00:00Z"),
      windowDays: 30,
    });
    assert.deepStrictEqual(ids.sort(), ["a", "b"]);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/dayDoc.test.js`
Expected: FAIL — recentlyServedLibraryIds not exported

- [ ] **Step 3: Implement**

Append to `functions/dinnerPrompts/dayDoc.js` before `module.exports`:

```javascript
async function recentlyServedLibraryIds({ daysCollection, now, windowDays }) {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().slice(0, 10);
  const snap = await daysCollection.where("__name__", ">=", sinceIso).get();
  const ids = [];
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.source === "library" && data.sourceRefs && data.sourceRefs.libraryId) {
      ids.push(data.sourceRefs.libraryId);
    }
  });
  return ids;
}
```

Update exports:

```javascript
module.exports = { writeNewDay, readDay, recordSwap, recordReport, recentlyServedLibraryIds };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/dayDoc.test.js`
Expected: PASS — 6 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/dayDoc.js functions/__tests__/dinnerPrompts/dayDoc.test.js
git commit -m "feat(dinner-prompts): recentlyServedLibraryIds query helper"
```

---

## Task 14: Flagged-overlay lookup

**Files:**
- Create: `functions/dinnerPrompts/overlay.js`
- Test: `functions/__tests__/dinnerPrompts/overlay.test.js`

- [ ] **Step 1: Write failing test**

Path: `functions/__tests__/dinnerPrompts/overlay.test.js`

```javascript
const assert = require("assert");
const { flaggedLibraryIds, writeFlag } = require("../../dinnerPrompts/overlay");

describe("overlay.flaggedLibraryIds", () => {
  it("returns ids of all docs with flagged: true", async () => {
    const fakeOverlay = {
      where: (field, op, val) => ({
        get: async () => {
          assert.strictEqual(field, "flagged");
          assert.strictEqual(op, "==");
          assert.strictEqual(val, true);
          return {
            docs: [
              { id: "courage-001" },
              { id: "silliness-005" },
            ],
          };
        },
      }),
    };
    const ids = await flaggedLibraryIds({ overlayCollection: fakeOverlay });
    assert.deepStrictEqual(ids.sort(), ["courage-001", "silliness-005"]);
  });
});

describe("overlay.writeFlag", () => {
  it("writes a flagged doc with reason and timestamp", async () => {
    let written;
    const fakeRef = { set: async (data) => { written = data; } };
    const fakeOverlay = { doc: (id) => { assert.strictEqual(id, "courage-001"); return fakeRef; } };
    const now = new Date("2026-04-16T12:00:00Z");
    await writeFlag({ overlayCollection: fakeOverlay, libraryId: "courage-001", reason: "too dark", now });
    assert.strictEqual(written.flagged, true);
    assert.strictEqual(written.flaggedReason, "too dark");
    assert.ok(written.flaggedAt instanceof Date);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/overlay.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement overlay**

Path: `functions/dinnerPrompts/overlay.js`

```javascript
async function flaggedLibraryIds({ overlayCollection }) {
  const snap = await overlayCollection.where("flagged", "==", true).get();
  return snap.docs.map(d => d.id);
}

async function writeFlag({ overlayCollection, libraryId, reason, now }) {
  await overlayCollection.doc(libraryId).set({
    flagged: true,
    flaggedAt: now,
    flaggedReason: reason || null,
  });
}

module.exports = { flaggedLibraryIds, writeFlag };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/overlay.test.js`
Expected: PASS — 2 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/overlay.js functions/__tests__/dinnerPrompts/overlay.test.js
git commit -m "feat(dinner-prompts): library overlay flag read/write"
```

---

## Task 15: Recent journal/manual signal collector

**Files:**
- Create: `functions/dinnerPrompts/signalSources.js`
- Test: `functions/__tests__/dinnerPrompts/signalSources.test.js`

- [ ] **Step 1: Write failing test**

Path: `functions/__tests__/dinnerPrompts/signalSources.test.js`

```javascript
const assert = require("assert");
const { collectRecentSignals } = require("../../dinnerPrompts/signalSources");

describe("signalSources.collectRecentSignals", () => {
  it("collects journal entries and manual answers within window, marks household membership", async () => {
    const now = new Date("2026-04-16T12:00:00Z");
    const recentTs = new Date("2026-04-15T12:00:00Z");

    const householdMemberIds = ["user-1", "user-2"];

    const journalSnap = {
      docs: [
        { id: "j1", data: () => ({ text: "Mia was brave", createdAt: recentTs, authorId: "user-1" }) },
        { id: "j2", data: () => ({ text: "Friend visited", createdAt: recentTs, authorId: "friend-9" }) },
      ],
    };
    const contributionsSnap = {
      docs: [
        {
          id: "c1",
          data: () => ({
            authorId: "user-2",
            updatedAt: recentTs,
            answers: { core: { brave_moments: { text: "tried something scary" } } },
          }),
        },
      ],
    };

    const fakeJournals = { where: () => ({ where: () => ({ get: async () => journalSnap }) }) };
    const fakeContributions = { where: () => ({ where: () => ({ get: async () => contributionsSnap }) }) };

    const result = await collectRecentSignals({
      householdId: "h1",
      householdMemberIds,
      journalsCollection: fakeJournals,
      contributionsCollection: fakeContributions,
      now,
      windowDays: 7,
    });

    assert.strictEqual(result.journalEntries.length, 2);
    const j1 = result.journalEntries.find(e => e.id === "j1");
    const j2 = result.journalEntries.find(e => e.id === "j2");
    assert.strictEqual(j1.authorIsHouseholdMember, true);
    assert.strictEqual(j2.authorIsHouseholdMember, false);

    assert.strictEqual(result.manualAnswers.length, 1);
    assert.strictEqual(result.manualAnswers[0].authorIsHouseholdMember, true);
    assert.ok(result.manualAnswers[0].text.includes("scary"));
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/signalSources.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement collector**

Path: `functions/dinnerPrompts/signalSources.js`

```javascript
function flattenAnswers(answers) {
  // Walks the nested {section: {questionKey: {text}}} shape and joins all text values.
  if (!answers || typeof answers !== "object") return "";
  const parts = [];
  for (const section of Object.values(answers)) {
    if (!section || typeof section !== "object") continue;
    for (const q of Object.values(section)) {
      if (q && typeof q.text === "string") parts.push(q.text);
    }
  }
  return parts.join(" ");
}

async function collectRecentSignals({
  householdId, householdMemberIds, journalsCollection, contributionsCollection, now, windowDays,
}) {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const journalSnap = await journalsCollection
    .where("householdId", "==", householdId)
    .where("createdAt", ">=", since)
    .get();

  const journalEntries = journalSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: data.text || "",
      createdAt: data.createdAt,
      authorIsHouseholdMember: householdMemberIds.includes(data.authorId),
      salient: data.salient === true,
    };
  });

  const contribSnap = await contributionsCollection
    .where("householdId", "==", householdId)
    .where("updatedAt", ">=", since)
    .get();

  const manualAnswers = contribSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: flattenAnswers(data.answers),
      createdAt: data.updatedAt,
      authorIsHouseholdMember: householdMemberIds.includes(data.authorId),
      salient: data.salient === true,
    };
  });

  return { journalEntries, manualAnswers };
}

module.exports = { collectRecentSignals, flattenAnswers };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/signalSources.test.js`
Expected: PASS — 1 passing

> **Note for the implementing engineer:** This task assumes journal entries have a `householdId` field and contributions have a `householdId` and `authorId` field. If they don't (verify against `src/types/person-manual.ts` and the schema in `functions/index.js` lines 480–620), adapt the `where` clauses to whatever scoping field exists (it may be `familyId` per the synthesizeManualContent function). Update tests to match.

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/signalSources.js functions/__tests__/dinnerPrompts/signalSources.test.js
git commit -m "feat(dinner-prompts): collect recent journal+manual signals"
```

---

## Task 16: Synth-count-in-last-7-days helper

**Files:**
- Modify: `functions/dinnerPrompts/dayDoc.js`
- Modify: `functions/__tests__/dinnerPrompts/dayDoc.test.js`

- [ ] **Step 1: Write failing test**

Append:

```javascript
describe("dayDoc.synthCountInLast7Days", () => {
  const { synthCountInLast7Days } = require("../../dinnerPrompts/dayDoc");

  it("counts day-docs with source: synthesized in the last 7 days", async () => {
    const fakeDays = {
      where: () => ({
        get: async () => ({
          docs: [
            { data: () => ({ source: "synthesized" }) },
            { data: () => ({ source: "library" }) },
            { data: () => ({ source: "synthesized" }) },
          ],
        }),
      }),
    };
    const count = await synthCountInLast7Days({
      daysCollection: fakeDays,
      now: new Date("2026-04-16T00:00:00Z"),
    });
    assert.strictEqual(count, 2);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/dayDoc.test.js`
Expected: FAIL — synthCountInLast7Days not exported

- [ ] **Step 3: Implement**

Append to `functions/dinnerPrompts/dayDoc.js` before `module.exports`:

```javascript
async function synthCountInLast7Days({ daysCollection, now }) {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString().slice(0, 10);
  const snap = await daysCollection.where("__name__", ">=", sinceIso).get();
  let count = 0;
  snap.docs.forEach(d => { if (d.data().source === "synthesized") count++; });
  return count;
}
```

Add to exports:

```javascript
module.exports = { writeNewDay, readDay, recordSwap, recordReport, recentlyServedLibraryIds, synthCountInLast7Days };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/dayDoc.test.js`
Expected: PASS — 7 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/dayDoc.js functions/__tests__/dinnerPrompts/dayDoc.test.js
git commit -m "feat(dinner-prompts): synth-count helper for cap enforcement"
```

---

## Task 17: Handler — getDinnerPrompt happy path (library, no existing day-doc)

**Files:**
- Create: `functions/dinnerPrompts/handlers.js`
- Test: `functions/__tests__/dinnerPrompts/handlers.test.js`

- [ ] **Step 1: Write failing test**

Path: `functions/__tests__/dinnerPrompts/handlers.test.js`

```javascript
const assert = require("assert");
const sinon = require("sinon");
const { handleGetDinnerPrompt } = require("../../dinnerPrompts/handlers");

function fakeReq({ method = "GET", query = {}, body = {}, headers = {} } = {}) {
  return { method, query, body, headers };
}

function fakeRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    set(name, val) { this.headers[name] = val; },
  };
  return res;
}

describe("handlers.handleGetDinnerPrompt — happy path (library)", () => {
  it("returns and persists a library-picked prompt when no day-doc exists", async () => {
    const req = fakeReq({
      method: "GET",
      query: { householdId: "h1", date: "2026-04-16" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();

    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves(null),
      writeNewDay: sinon.stub().resolves(),
      audienceForDate: () => "kid",
      pickTheme: () => "courage",
      hasJuicySignal: () => ({ matched: false }),
      pickWithFallback: () => ({
        prompt: { id: "courage-001", text: "Brave?", themes: ["courage"], audiences: ["kid"] },
        relaxation: "none",
      }),
      collectRecentSignals: sinon.stub().resolves({ journalEntries: [], manualAnswers: [] }),
      recentlyServedLibraryIds: sinon.stub().resolves([]),
      flaggedLibraryIds: sinon.stub().resolves([]),
      synthCountInLast7Days: sinon.stub().resolves(0),
      synthesizeOrFallback: sinon.stub(),
      library: [],
      anthropicClient: null,
      householdMemberIds: ["user-1"],
      collections: {
        apiKeys: {},
        days: { doc: () => ({}) },
        overlay: {},
        journals: {},
        contributions: {},
      },
      now: new Date("2026-04-16T22:00:00Z"),
    };

    await handleGetDinnerPrompt(req, res, deps);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.text, "Brave?");
    assert.strictEqual(res.body.source, "library");
    assert.strictEqual(res.body.audience, "kid");
    assert.strictEqual(res.body.theme, "courage");
    sinon.assert.calledOnce(deps.writeNewDay);
  });

  it("returns 401 when api key is invalid", async () => {
    const req = fakeReq({ method: "GET", query: { householdId: "h1", date: "2026-04-16" }, headers: {} });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: false, status: 401, error: "missing api key" }),
      collections: { apiKeys: {} },
    };
    await handleGetDinnerPrompt(req, res, deps);
    assert.strictEqual(res.statusCode, 401);
  });

  it("returns the existing day-doc when one is already present", async () => {
    const req = fakeReq({
      method: "GET",
      query: { householdId: "h1", date: "2026-04-16" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Existing?", audience: "kid", theme: "courage", source: "library",
        sourceRefs: { libraryId: "x" }, status: "served", servedAt: new Date(),
      }),
      writeNewDay: sinon.stub().resolves(),
      collections: { apiKeys: {}, days: { doc: () => ({}) } },
      now: new Date(),
    };
    await handleGetDinnerPrompt(req, res, deps);
    assert.strictEqual(res.body.text, "Existing?");
    sinon.assert.notCalled(deps.writeNewDay);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/handlers.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement handler**

Path: `functions/dinnerPrompts/handlers.js`

```javascript
const { extractBearer } = require("./auth");

function dayDocPath(householdId, dateStr) {
  return `dinner_prompts/${householdId}/days/${dateStr}`;
}

function shapeResponse(dayData, includeRefs) {
  const out = {
    text: dayData.text,
    audience: dayData.audience,
    theme: dayData.theme,
    source: dayData.source,
    servedAt: dayData.servedAt,
  };
  if (includeRefs) out.sourceRefs = dayData.sourceRefs || {};
  return out;
}

async function generatePrompt({ deps, householdId, dateStr, audience, theme }) {
  const [recentlyServed, flagged, signals, synthCount] = await Promise.all([
    deps.recentlyServedLibraryIds({ daysCollection: deps.collections.days, now: deps.now, windowDays: 30 }),
    deps.flaggedLibraryIds({ overlayCollection: deps.collections.overlay }),
    deps.collectRecentSignals({
      householdId,
      householdMemberIds: deps.householdMemberIds,
      journalsCollection: deps.collections.journals,
      contributionsCollection: deps.collections.contributions,
      now: deps.now,
      windowDays: 7,
    }),
    deps.synthCountInLast7Days({ daysCollection: deps.collections.days, now: deps.now }),
  ]);

  const signal = deps.hasJuicySignal({
    theme,
    recentJournalEntries: signals.journalEntries,
    recentManualAnswers: signals.manualAnswers,
    synthCountInLast7Days: synthCount,
    now: deps.now,
  });

  const libraryFallback = () => deps.pickWithFallback({
    library: deps.library,
    audience,
    theme,
    recentlyServedIds: recentlyServed,
    flaggedIds: flagged,
  });

  if (signal.matched && deps.anthropicClient) {
    const excerpts = signals.journalEntries
      .filter(e => signal.matchedJournalIds.includes(e.id))
      .map(e => ({ source: "journal", text: e.text, firstName: "" }));
    const synth = await deps.synthesizeOrFallback({
      client: deps.anthropicClient,
      theme, audience, excerpts, libraryFallback,
    });
    if (synth) {
      if (synth.source === "synthesized") {
        synth.sourceRefs = {
          journalEntryIds: signal.matchedJournalIds,
          manualAnswerIds: signal.matchedManualIds,
        };
      }
      return synth;
    }
  }

  const fb = libraryFallback();
  if (!fb) return null;
  return {
    text: fb.prompt.text,
    source: "library",
    sourceRefs: { libraryId: fb.prompt.id },
  };
}

async function handleGetDinnerPrompt(req, res, deps) {
  const apiKey = extractBearer(req.headers.authorization);
  const householdId = (req.method === "GET" ? req.query.householdId : req.body.householdId);
  const dateStr = (req.method === "GET" ? req.query.date : req.body.date);
  const includeRefs = (req.method === "GET" ? req.query.include === "refs" : req.body.include === "refs");

  if (!householdId || !dateStr) {
    res.status(400).json({ error: "householdId and date are required" });
    return;
  }

  const auth = await deps.validateApiKey({
    apiKey, householdId, apiKeysCollection: deps.collections.apiKeys,
  });
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const dayRef = deps.collections.days.doc(dateStr);
  const existing = await deps.readDay({ ref: dayRef });
  if (existing) {
    res.status(200).json(shapeResponse(existing, includeRefs));
    return;
  }

  const audience = deps.audienceForDate(new Date(dateStr + "T12:00:00Z"));
  const theme = deps.pickTheme({ householdId, date: new Date(dateStr + "T12:00:00Z"), audience });

  const generated = await generatePrompt({ deps, householdId, dateStr, audience, theme });
  if (!generated) {
    res.status(500).json({ error: "no prompt could be produced" });
    return;
  }

  await deps.writeNewDay({
    ref: dayRef,
    payload: { ...generated, audience, theme },
    now: deps.now,
  });

  res.status(200).json(shapeResponse({ ...generated, audience, theme, servedAt: deps.now }, includeRefs));
}

module.exports = { handleGetDinnerPrompt, dayDocPath, shapeResponse };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/handlers.test.js`
Expected: PASS — 3 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/handlers.js functions/__tests__/dinnerPrompts/handlers.test.js
git commit -m "feat(dinner-prompts): getDinnerPrompt handler — library happy path + cache + auth"
```

---

## Task 18: Handler — swap path

**Files:**
- Modify: `functions/dinnerPrompts/handlers.js`
- Modify: `functions/__tests__/dinnerPrompts/handlers.test.js`

- [ ] **Step 1: Write failing test**

Append:

```javascript
describe("handlers.handleSwapDinnerPrompt", () => {
  const { handleSwapDinnerPrompt } = require("../../dinnerPrompts/handlers");

  it("records a swap and returns a new prompt", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", swap: true },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();

    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Old?", audience: "kid", theme: "courage", source: "library",
        sourceRefs: { libraryId: "courage-001" }, status: "served",
      }),
      recordSwap: sinon.stub().resolves(),
      audienceForDate: () => "kid",
      pickTheme: () => "courage",
      hasJuicySignal: () => ({ matched: false }),
      pickWithFallback: () => ({
        prompt: { id: "courage-002", text: "New brave?", themes: ["courage"], audiences: ["kid"] },
        relaxation: "none",
      }),
      collectRecentSignals: sinon.stub().resolves({ journalEntries: [], manualAnswers: [] }),
      recentlyServedLibraryIds: sinon.stub().resolves(["courage-001"]),
      flaggedLibraryIds: sinon.stub().resolves([]),
      synthCountInLast7Days: sinon.stub().resolves(0),
      synthesizeOrFallback: sinon.stub(),
      library: [],
      anthropicClient: null,
      householdMemberIds: ["user-1"],
      collections: {
        apiKeys: {}, days: { doc: () => ({}) }, overlay: {}, journals: {}, contributions: {},
      },
      now: new Date("2026-04-16T23:00:00Z"),
    };

    await handleSwapDinnerPrompt(req, res, deps);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.text, "New brave?");
    sinon.assert.calledOnce(deps.recordSwap);
    const swapArgs = deps.recordSwap.firstCall.args[0];
    assert.strictEqual(swapArgs.newPayload.text, "New brave?");
    assert.strictEqual(swapArgs.newPayload.sourceRefs.libraryId, "courage-002");
  });

  it("returns 404 when there is no day-doc to swap from", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", swap: true },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves(null),
      collections: { apiKeys: {}, days: { doc: () => ({}) } },
      now: new Date(),
    };
    await handleSwapDinnerPrompt(req, res, deps);
    assert.strictEqual(res.statusCode, 404);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/handlers.test.js`
Expected: FAIL — handleSwapDinnerPrompt not exported

- [ ] **Step 3: Implement swap handler**

Append to `functions/dinnerPrompts/handlers.js` before `module.exports`:

```javascript
async function handleSwapDinnerPrompt(req, res, deps) {
  const apiKey = extractBearer(req.headers.authorization);
  const { householdId, date: dateStr } = req.body;

  if (!householdId || !dateStr) {
    res.status(400).json({ error: "householdId and date are required" });
    return;
  }

  const auth = await deps.validateApiKey({
    apiKey, householdId, apiKeysCollection: deps.collections.apiKeys,
  });
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const dayRef = deps.collections.days.doc(dateStr);
  const existing = await deps.readDay({ ref: dayRef });
  if (!existing) {
    res.status(404).json({ error: "no prompt to swap; call GET first" });
    return;
  }

  const audience = existing.audience;
  const theme = existing.theme;
  const generated = await generatePrompt({ deps, householdId, dateStr, audience, theme });
  if (!generated) {
    res.status(500).json({ error: "no replacement prompt could be produced" });
    return;
  }

  await deps.recordSwap({
    ref: dayRef,
    newPayload: generated,
    now: deps.now,
  });

  res.status(200).json(shapeResponse({ ...generated, audience, theme, servedAt: deps.now }, false));
}
```

Update exports:

```javascript
module.exports = { handleGetDinnerPrompt, handleSwapDinnerPrompt, dayDocPath, shapeResponse };
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/handlers.test.js`
Expected: PASS — 5 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/handlers.js functions/__tests__/dinnerPrompts/handlers.test.js
git commit -m "feat(dinner-prompts): swap handler — records history and picks new prompt"
```

---

## Task 19: Handler — reportDinnerPrompt

**Files:**
- Modify: `functions/dinnerPrompts/handlers.js`
- Modify: `functions/__tests__/dinnerPrompts/handlers.test.js`

- [ ] **Step 1: Write failing test**

Append:

```javascript
describe("handlers.handleReportDinnerPrompt", () => {
  const { handleReportDinnerPrompt } = require("../../dinnerPrompts/handlers");

  it("flags the library prompt and records a report on the day-doc", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", reason: "too dark" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();

    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Bad?", source: "library", sourceRefs: { libraryId: "courage-001" }, status: "served",
      }),
      writeFlag: sinon.stub().resolves(),
      recordReport: sinon.stub().resolves(),
      collections: { apiKeys: {}, days: { doc: () => ({}) }, overlay: {} },
      now: new Date("2026-04-16T23:30:00Z"),
    };

    await handleReportDinnerPrompt(req, res, deps);

    assert.strictEqual(res.statusCode, 200);
    sinon.assert.calledOnce(deps.writeFlag);
    sinon.assert.calledOnce(deps.recordReport);
    const flagCall = deps.writeFlag.firstCall.args[0];
    assert.strictEqual(flagCall.libraryId, "courage-001");
    assert.strictEqual(flagCall.reason, "too dark");
  });

  it("does not call writeFlag when the source is synthesized (no libraryId)", async () => {
    const req = fakeReq({
      method: "POST",
      body: { householdId: "h1", date: "2026-04-16", reason: "weird" },
      headers: { authorization: "Bearer test-key" },
    });
    const res = fakeRes();
    const deps = {
      validateApiKey: sinon.stub().resolves({ ok: true }),
      readDay: sinon.stub().resolves({
        text: "Synth?", source: "synthesized", sourceRefs: { journalEntryIds: ["j1"] }, status: "served",
      }),
      writeFlag: sinon.stub().resolves(),
      recordReport: sinon.stub().resolves(),
      collections: { apiKeys: {}, days: { doc: () => ({}) }, overlay: {} },
      now: new Date(),
    };
    await handleReportDinnerPrompt(req, res, deps);
    sinon.assert.notCalled(deps.writeFlag);
    sinon.assert.calledOnce(deps.recordReport);
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/handlers.test.js`
Expected: FAIL — handleReportDinnerPrompt not exported

- [ ] **Step 3: Implement report handler**

Append before `module.exports` in `functions/dinnerPrompts/handlers.js`:

```javascript
async function handleReportDinnerPrompt(req, res, deps) {
  const apiKey = extractBearer(req.headers.authorization);
  const { householdId, date: dateStr, reason } = req.body;

  if (!householdId || !dateStr) {
    res.status(400).json({ error: "householdId and date are required" });
    return;
  }

  const auth = await deps.validateApiKey({
    apiKey, householdId, apiKeysCollection: deps.collections.apiKeys,
  });
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const dayRef = deps.collections.days.doc(dateStr);
  const existing = await deps.readDay({ ref: dayRef });
  if (!existing) {
    res.status(404).json({ error: "no day-doc to report" });
    return;
  }

  if (existing.source === "library" && existing.sourceRefs && existing.sourceRefs.libraryId) {
    await deps.writeFlag({
      overlayCollection: deps.collections.overlay,
      libraryId: existing.sourceRefs.libraryId,
      reason: reason || null,
      now: deps.now,
    });
  }

  await deps.recordReport({ ref: dayRef, reason: reason || null, now: deps.now });

  res.status(200).json({ ok: true });
}
```

Update exports:

```javascript
module.exports = {
  handleGetDinnerPrompt,
  handleSwapDinnerPrompt,
  handleReportDinnerPrompt,
  dayDocPath,
  shapeResponse,
};
```

- [ ] **Step 4: Run, verify pass**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/handlers.test.js`
Expected: PASS — 7 passing

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/handlers.js functions/__tests__/dinnerPrompts/handlers.test.js
git commit -m "feat(dinner-prompts): reportDinnerPrompt handler — flags + records"
```

---

## Task 20: Module entry — wire dependencies and export onRequest functions

**Files:**
- Create: `functions/dinnerPrompts/index.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Create the module entry**

Path: `functions/dinnerPrompts/index.js`

```javascript
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

const library = require("../data/dinner-prompts.json");
const { audienceForDate, pickTheme } = require("./themes");
const { pickWithFallback } = require("./library");
const { hasJuicySignal } = require("./signal");
const { synthesizeOrFallback } = require("./synthesis");
const { validateApiKey } = require("./auth");
const {
  writeNewDay, readDay, recordSwap, recordReport,
  recentlyServedLibraryIds, synthCountInLast7Days,
} = require("./dayDoc");
const { flaggedLibraryIds, writeFlag } = require("./overlay");
const { collectRecentSignals } = require("./signalSources");
const {
  handleGetDinnerPrompt,
  handleSwapDinnerPrompt,
  handleReportDinnerPrompt,
} = require("./handlers");

let anthropic;
function getAnthropic() {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

async function loadHouseholdMemberIds(householdId) {
  const db = admin.firestore();
  const snap = await db.collection("people")
    .where("householdId", "==", householdId)
    .where("relationshipType", "in", ["self", "spouse", "child"])
    .get();
  const ids = [];
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.linkedUserId) ids.push(data.linkedUserId);
  });
  return ids;
}

function buildDeps({ householdId, now }) {
  const db = admin.firestore();
  return {
    validateApiKey,
    readDay,
    writeNewDay,
    recordSwap,
    recordReport,
    audienceForDate,
    pickTheme,
    hasJuicySignal,
    pickWithFallback,
    collectRecentSignals,
    recentlyServedLibraryIds,
    flaggedLibraryIds,
    writeFlag,
    synthCountInLast7Days,
    synthesizeOrFallback,
    library,
    anthropicClient: getAnthropic(),
    collections: {
      apiKeys: db.collection("api_keys"),
      days: db.collection("dinner_prompts").doc(householdId).collection("days"),
      overlay: db.collection("dinner_prompts").doc(householdId).collection("library_overlay"),
      journals: db.collection("journal_entries"),
      contributions: db.collection("contributions"),
    },
    now,
  };
}

const COMMON_OPTS = {
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 30,
  secrets: ["ANTHROPIC_API_KEY"],
  cors: true,
};

const getDinnerPrompt = onRequest(COMMON_OPTS, async (req, res) => {
  try {
    const householdId = req.method === "GET" ? req.query.householdId : (req.body && req.body.householdId);
    if (!householdId) { res.status(400).json({ error: "householdId required" }); return; }
    const now = new Date();
    const deps = buildDeps({ householdId, now });
    deps.householdMemberIds = await loadHouseholdMemberIds(householdId);

    if (req.method === "POST" && req.body && req.body.swap) {
      await handleSwapDinnerPrompt(req, res, deps);
    } else {
      await handleGetDinnerPrompt(req, res, deps);
    }
  } catch (err) {
    console.error("[dinner-prompts] getDinnerPrompt error", err);
    res.status(500).json({ error: "internal error" });
  }
});

const reportDinnerPrompt = onRequest(COMMON_OPTS, async (req, res) => {
  try {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    const householdId = req.body && req.body.householdId;
    if (!householdId) { res.status(400).json({ error: "householdId required" }); return; }
    const now = new Date();
    const deps = buildDeps({ householdId, now });
    await handleReportDinnerPrompt(req, res, deps);
  } catch (err) {
    console.error("[dinner-prompts] reportDinnerPrompt error", err);
    res.status(500).json({ error: "internal error" });
  }
});

module.exports = { getDinnerPrompt, reportDinnerPrompt };
```

- [ ] **Step 2: Wire into functions/index.js**

Add at the bottom of `functions/index.js`:

```javascript
// Dinner prompt API (Symphony wall-kiosk integration)
const dinnerPromptApi = require("./dinnerPrompts");
exports.getDinnerPrompt = dinnerPromptApi.getDinnerPrompt;
exports.reportDinnerPrompt = dinnerPromptApi.reportDinnerPrompt;
```

- [ ] **Step 3: Verify the module loads without runtime errors**

Run: `cd functions && node -e "require('./dinnerPrompts')"`
Expected: No output, exit code 0. (If you see `Error: ... ANTHROPIC_API_KEY` it means the lazy `getAnthropic()` was called at load — confirm it isn't.)

- [ ] **Step 4: Run all dinner-prompt tests**

Run: `cd functions && npx mocha __tests__/dinnerPrompts/*.test.js`
Expected: PASS — all tests across all files green

> **Note for the implementing engineer:** The `loadHouseholdMemberIds` query assumes `people.householdId` and `people.linkedUserId` exist. Per `src/types/person-manual.ts`, `Person` has `linkedUserId`. The `householdId` field may instead be `familyId` — verify against the existing schema before deploying. If the field is `familyId`, change the query to match.

- [ ] **Step 5: Commit**

```bash
git add functions/dinnerPrompts/index.js functions/index.js
git commit -m "feat(dinner-prompts): wire onRequest endpoints into functions entry"
```

---

## Task 21: Firestore security rules — deny client access

**Files:**
- Modify: `firestore.rules` (locate via `firebase.json` or top-level)

- [ ] **Step 1: Locate the rules file**

Run: `ls firestore.rules firestore-rules/firestore.rules 2>/dev/null`
Expected: one path. If neither exists, check `firebase.json` for `firestore.rules` configured path.

- [ ] **Step 2: Add deny rules**

Add to the rules file inside the `match /databases/{database}/documents { ... }` block (above any catch-all `allow read, write: if false;`):

```
// Dinner prompt collections — server-only access via Cloud Functions
match /dinner_prompts/{householdId}/{document=**} {
  allow read, write: if false;
}

// API keys — server-only
match /api_keys/{keyHash} {
  allow read, write: if false;
}
```

- [ ] **Step 3: Run rules tests if they exist**

Run: `npm run test:rules 2>/dev/null || echo "no rules tests configured"`
Expected: PASS or "no rules tests configured" — either is fine for this task.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat(dinner-prompts): deny all client access to dinner_prompts and api_keys"
```

---

## Task 22: Manual setup — provision API key and configure secret

This task has no code; it produces a runbook the operator (you) executes once.

- [ ] **Step 1: Generate a strong API key**

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
Save the printed value as `RELISH_API_KEY` (you will need it for both the seeding step and Symphony's env).

- [ ] **Step 2: Compute the hash and seed the api_keys document**

Run (substitute the actual key for `<KEY>`):
```bash
node -e "console.log(require('crypto').createHash('sha256').update('<KEY>').digest('hex'))"
```

Then in the Firebase console (or via a seed script if you prefer), create:

```
api_keys/{the-hash-from-above}
  label: "symphony-prod"
  allowed_households: ["<your-household-id>"]
  createdAt: <server timestamp>
```

- [ ] **Step 3: Configure Anthropic key as a Firebase secret (if not already)**

Run: `cd functions && firebase functions:secrets:access ANTHROPIC_API_KEY 2>&1 | head -1`

If it errors with "no such secret":
```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```
(Paste your Anthropic key when prompted.)

- [ ] **Step 4: Deploy the new functions**

Run: `firebase deploy --only functions:getDinnerPrompt,functions:reportDinnerPrompt`
Expected: deployment succeeds, prints two HTTPS URLs.

- [ ] **Step 5: Smoke test**

Run (substitute URL, key, householdId):
```bash
curl -s "https://<region>-<project>.cloudfunctions.net/getDinnerPrompt?householdId=<HID>&date=$(date -u +%Y-%m-%d)" \
  -H "Authorization: Bearer <KEY>" | jq
```
Expected: a JSON response with `text`, `audience`, `theme`, `source`, `servedAt`.

- [ ] **Step 6: Smoke test the swap path**

```bash
curl -s -X POST "https://<region>-<project>.cloudfunctions.net/getDinnerPrompt" \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"householdId\":\"<HID>\",\"date\":\"$(date -u +%Y-%m-%d)\",\"swap\":true}" | jq
```
Expected: a different `text` value than the prior call.

- [ ] **Step 7: Smoke test the report path**

```bash
curl -s -X POST "https://<region>-<project>.cloudfunctions.net/reportDinnerPrompt" \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"householdId\":\"<HID>\",\"date\":\"$(date -u +%Y-%m-%d)\",\"reason\":\"smoke test\"}"
```
Expected: `{"ok":true}`.

Verify in the Firestore console that:
- `dinner_prompts/<HID>/days/<today>` exists with `status: "reported"` and `reportedReason: "smoke test"`
- If today's prompt was a library pick: `dinner_prompts/<HID>/library_overlay/<libraryId>` exists with `flagged: true`

- [ ] **Step 8: Document the deployed URLs**

Note the two HTTPS function URLs in your password manager / project notes — Symphony will need them. No commit needed for this step.

---

## Spec coverage check

Each spec section maps to tasks:

- **Cadence (kid Mon–Thu+Sat–Sun, adult Fri):** Task 12
- **Theme rotation (deterministic per ISO week):** Task 2
- **Library picker (filter, exclusion, fallback chain):** Tasks 3–5
- **AI synthesis (juicy signal, Claude call, fallback):** Tasks 6–9, 15–16
- **API contract (GET/POST getDinnerPrompt, POST reportDinnerPrompt):** Tasks 17–19
- **Day-doc + overlay data model:** Tasks 11, 13, 14
- **Auth (shared bearer token + household allow-list):** Task 10
- **Wiring + onRequest exports:** Task 20
- **Security rules deny client access:** Task 21
- **Notification mechanism (open question):** **Deferred.** Per the explore report, no notification system exists in Relish. The flagged-prompt event lands in Firestore (`status: "reported"`) and is visible by manual inspection. A future task can add an in-app banner once Relish has a notification surface — out of scope for this plan.
- **Phase-2 saved_prompts collection:** Out of scope (spec marks as future work).