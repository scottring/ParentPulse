I'll implement this workbook redesign. Let me start by exploring the current structure and then systematically create the new components.
I understand - you want me to implement directly, not plan. Let me read the current files and start building.
I'll update the plan file with the guidance you provided.
The plan is already well-structured. Let me add the design spirit guidance you provided to make it complete.
The plan is now complete with your design guidance integrated. It includes:

- **Design Spirit** - The 3 litmus tests and visual language
- **Problem & Vision** - What's wrong and what it becomes
- **New Structure** - All 4 sections with wireframes
- **Implementation Steps** - 9 sequential steps
- **Verification** - How to test the result
Got it. Let me walk you through the user experience one screen at a time.

---

**When a parent opens their workbook for the day, here's what they see first:**

## Screen 1: Today's Focus (Hero Card)

This is the FIRST and most prominent thing. One parent behavior to practice today.

```
┌─────────────────────────────────────────┐
│  [Warm watercolor background]           │
│                                         │
│  ☀️ Good Morning                        │
│                                         │
│  TODAY'S PRACTICE                       │
│  ───────────────────                    │
│  "Give Caleb a 5-minute warning         │
│   before transitions"                   │
│                                         │
│  WHY THIS MATTERS                       │
│  Transition warnings help Caleb's       │
│  brain prepare for change, reducing     │
│  resistance and meltdowns.              │
│                                         │
│  HOW TO DO IT                           │
│  • Set a timer on your phone            │
│  • Say "5 more minutes of [activity]"   │
│  • Give a 1-minute warning too          │
│                                         │
│  [    ○ I practiced this today    ]     │
│                                         │
└─────────────────────────────────────────┘
```

**Key points:**
- ONE thing, not a list
- Explains WHY (connects to child's needs)
- Explains HOW (actionable steps)
- Single gentle checkbox

---

Before I continue to Screen 2 (the Activity with Child), I want to ask about the **stories feature** you mentioned.
Let's start from the beginning - **Onboarding**.

---

## Onboarding Screen 1: Welcome

The first thing a new user sees after creating an account.

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash background]      │
│                                         │
│                                         │
│                                         │
│      Welcome to the                     │
│      [Family Name] family space.        │
│                                         │
│                                         │
│      [Visual: A book gently opening]    │
│                                         │
│                                         │
│                                         │
│        [ Let's Begin ]                  │
│                                         │
└─────────────────────────────────────────┘
```

**The feeling:** Calm. Unhurried. You're entering a sanctuary, not a productivity tool.

---
---

## Onboarding Screen 2: The 30-Second Video

After tapping "Let's Begin", they see this.

```
┌─────────────────────────────────────────┐
│  [Watercolor animation player]          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │   [Animated watercolor scene:   │   │
│  │    Parent taking a breath,      │   │
│  │    book opening with pages      │   │
│  │    filling with details]        │   │
│  │                                 │   │
│  │         ▶ PLAY                  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  "There is no such thing as a           │
│   perfect parent. And you don't         │
│   need to be one."                      │
│                                         │
│        [ Skip ]    [ Continue ]         │
│                                         │
└─────────────────────────────────────────┘
```

**Video script (30 sec):**
- "There is no such thing as a perfect parent. And you don't need to be one."
- "You just need to understand *your* people. Relish helps you build a custom manual—learning what works, what doesn't, and how to connect."
- "It's not about fixing everything. It's about showing up today, staying present, and knowing how to repair when things go wrong."
- "Let's start building your manual."

---

## Onboarding Screen 3: The Caring Conversation Begins

One question at a time. Huge typography. No form.

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash - subtle shift]  │
│                                         │
│                                         │
│                                         │
│    Let's get to know                    │
│    your child.                          │
│                                         │
│                                         │
│    What's their name?                   │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Caleb                      │     │
│    └─────────────────────────────┘     │
│                                         │
│                                         │
│              [ Continue → ]             │
│                                         │
└─────────────────────────────────────────┘
```

**Key points:**
- ONE question per screen
- HUGE text (36-48pt)
- Generous whitespace
- Feels like a conversation, not a form

---
---

## Onboarding Screen 4-N: The Conversation Flow

Each question appears alone, with options as large tappable pills.

**Example - Triggers question:**
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│    Which situations most                │
│    commonly trigger frustration         │
│    for Caleb?                           │
│                                         │
│                                         │
│    ┌─────────────────────────────┐     │
│    │      Transitions            │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │    Sensory overwhelm        │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │    Unexpected changes       │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │    Something else...        │     │
│    └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

**The system quietly organizes answers into the 6-layer scaffolding (triggers, processing, structure, etc.) without the parent needing to know the technical terms.**

---

## Onboarding Final Screen: The Manual is Born

After the conversation completes:

```
┌─────────────────────────────────────────┐
│  [Watercolor celebration wash]          │
│                                         │
│                                         │
│       [Visual: Book fully open]         │
│                                         │
│                                         │
│    Caleb's Manual                       │
│    is ready.                            │
│                                         │
│    This is a living book.               │
│    It will grow as you learn            │
│    what works for your family.          │
│                                         │
│                                         │
│        [ See Caleb's Manual ]           │
│                                         │
└─────────────────────────────────────────┘
```

---

That's the **Onboarding Flow**. Ready to move to the **Manual** (what they see after onboarding), or would you like to adjust anything about onboarding first?
What would you like to change about the onboarding flow? Please describe what's on your mind.
Got it. Let me revise the onboarding flow.

---

## Onboarding Screen 3 (Revised): Choose Your Focus

After the video, the parent chooses what they want to build first.

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    What would you like to               │
│    start with?                          │
│                                         │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  👤  A Person               │     │
│    │      Create a manual for    │     │
│    │      someone specific       │     │
│    │      (child, partner, etc.) │     │
│    └─────────────────────────────┘     │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  🏠  Our Household          │     │
│    │      Create a manual for    │     │
│    │      how your family works  │     │
│    │      together               │     │
│    └─────────────────────────────┘     │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

---
---

## Onboarding Screen 4 (Person Path): Who is this for?

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    Who are you creating                 │
│    this manual for?                     │
│                                         │
│                                         │
│    ┌─────────────────────────────┐     │
│    │      My child               │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      My partner             │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Myself                 │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Someone else...        │     │
│    └─────────────────────────────┘     │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

Then → "What's their name?" → The caring conversation tailored to that relationship type.

---
---

## Onboarding Screen 4 (Household Path): Who's in your household?

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    Who's in your household?             │
│                                         │
│    (We'll create a space for each       │
│     person to have their own manual)    │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Name: [           ]        │     │
│    │  Role: Parent / Child / ... │     │
│    │              [ + Add ]      │     │
│    └─────────────────────────────┘     │
│                                         │
│    Added:                               │
│    • Sarah (Parent)                     │
│    • Caleb (Child, age 7)               │
│    • Emma (Child, age 4)                │
│                                         │
│                                         │
│        [ Continue → ]                   │
│                                         │
└─────────────────────────────────────────┘
```

After listing household members → The conversation asks about household dynamics (routines, decision-making, shared values).

---

So the revised onboarding structure is:

1. **Welcome** - "Welcome to the [Family] family space"
2. **Video** - 30-second explainer
3. **Choose Path** - Person or Household?
4. **If Person** → Relationship type → Name → Caring conversation for that person
5. **If Household** → List members → Household dynamics conversation

---
What else would you like to adjust about the onboarding flow?
---

## Household Path: Screen 1 - List Members

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    Who's in your household?             │
│                                         │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Name: [           ]        │     │
│    │  Role: [ Parent ▼ ]         │     │
│    │              [ + Add ]      │     │
│    └─────────────────────────────┘     │
│                                         │
│    Added:                               │
│    • Sarah (Parent)              [ ✕ ] │
│    • Caleb (Child)               [ ✕ ] │
│    • Emma (Child)                [ ✕ ] │
│                                         │
│                                         │
│        [ That's everyone → ]            │
│                                         │
└─────────────────────────────────────────┘
```

---
---

## Household Path: Screen 2 - Pain Points

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    What's hardest right now             │
│    in your household?                   │
│                                         │
│                                         │
│    ┌─────────────────────────────┐     │
│    │      Morning routines       │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Mealtimes              │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Bedtime                │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Sibling conflicts      │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Screen time battles    │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Something else...      │     │
│    └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

*User can select multiple.*

---

## Household Path: Screen 3 - Dig Deeper (per pain point)

If they selected "Morning routines":

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    Tell me about mornings.              │
│                                         │
│    What usually goes wrong?             │
│                                         │
│                                         │
│    ┌─────────────────────────────┐     │
│    │      Kids won't get up      │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Getting dressed is     │     │
│    │      a battle               │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Everyone's rushing     │     │
│    │      and stressed           │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Breakfast chaos        │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │      Something else...      │     │
│    └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

---
This is a great question. Let me share my thinking:

---

## On "Disorganized mess" as a pain point

This should absolutely be a first-class option. It could branch into:

- **Physical spaces** - clutter, no systems, can't find things
- **Time/scheduling** - no routines, always rushing, always late
- **Responsibilities** - unclear who does what, things fall through cracks
- **Information** - no shared calendar, forgotten appointments, lost paperwork

---

## On 30/60/90 day plans

I love this. It gives structure to the "journey" and makes progress tangible:

- **Days 1-30**: Foundation - tackle the biggest pain points
- **Days 31-60**: Build habits - routines become more automatic
- **Days 61-90**: Refine & expand - what's working, what needs adjustment

---

## On Household vs Person workbooks

Here's my take:

**Option A: Fully integrated** (Household tasks appear in person-manuals)
- Risk: Confusing. "Is this about me or us?"

**Option B: Fully separate** (Household workbook is its own thing)
- Risk: Fragmented. Two places to check.

**Option C: Hub and spokes** (my recommendation)
- The **Household** is the organizing principle - it holds the 30/60/90 day plan and shared goals
- **Person-manuals** receive relevant tasks delegated from household goals
- Example: 
  - Household goal: "Organized mornings by Day 30"
  - Sarah's workbook gets: "Set up launch pad by front door"
  - Caleb's workbook gets: "Practice putting backpack in launch pad"

This way, each person sees only what's relevant to them, but it all flows from a unified household plan.

---
That distinction feels important. Let me build on it:

---

## Place-centered thinking (task list)
- "Organize the mudroom"
- "Clean out the junk drawer"
- "Set up a command center"

This is what productivity apps do. It's a checklist. It doesn't connect to *why*.

---

## Temporal/state-centered thinking (journey)
- "Calm mornings by Day 30"
- "Know where everything is by Day 60"
- "Evenings feel restful by Day 90"

This connects to the *feeling* you want. The places and tasks become **means to that end**, not the goal itself.

---

So the Household workbook might frame the 30/60/90 plan as:

**Day 30 milestone:** "Mornings feel calmer"
- This week's focus: Launch pad by the door
- Sarah's task: Set it up
- Caleb's task: Practice using it

**Day 60 milestone:** "We know where things are"
- This week's focus: One room at a time
- ...

**Day 90 milestone:** "Evenings are for us, not catching up"
- ...

---
---

## Household Path: Screen 4 - Your 90-Day Vision

After pain points are identified, we suggest milestones based on what they shared.

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    Based on what you shared,            │
│    here's a possible journey:           │
│                                         │
│                                         │
│    DAY 30                               │
│    ┌─────────────────────────────┐     │
│    │  "Mornings feel calmer"     │ ✏️  │
│    └─────────────────────────────┘     │
│                                         │
│    DAY 60                               │
│    ┌─────────────────────────────┐     │
│    │  "We know where things are" │ ✏️  │
│    └─────────────────────────────┘     │
│                                         │
│    DAY 90                               │
│    ┌─────────────────────────────┐     │
│    │  "Evenings are restful"     │ ✏️  │
│    └─────────────────────────────┘     │
│                                         │
│    Tap ✏️ to customize any milestone    │
│                                         │
│        [ This feels right → ]           │
│                                         │
└─────────────────────────────────────────┘
```

---
Great question. Let me map the 6-layer framework to household context with friendlier terms:

---

## The 6 Layers → Household Edition

| Technical Layer | Household Translation | Friendly Name |
|-----------------|----------------------|---------------|
| 1. Inputs/Triggers | What causes stress or conflict | **"What Sets Us Off"** |
| 2. Processing | How we communicate & understand each other | **"How We Talk"** |
| 3. Structure | Routines, rhythms, systems | **"Our Rhythms"** |
| 4. Execution | How things actually get done | **"How We Get Things Done"** |
| 5. Outputs | Connection, growth, memories we create | **"What We're Building"** |
| 6. Values | What we stand for, how we decide | **"What We Stand For"** |

---

## How these could appear in onboarding:

Instead of asking about all 6 explicitly, we could let **pain points** naturally reveal which layers need attention:

- "Disorganized mess" → Layers 3 & 4 (Rhythms + Getting Things Done)
- "We're always arguing" → Layers 1 & 2 (Triggers + How We Talk)
- "No quality time together" → Layers 5 & 6 (Building + Values)
- "Kids don't listen" → Layers 1, 2, 4 (Triggers, Communication, Execution)

The system maps their answers to layers behind the scenes - they never see "Layer 3."

---
---

## Updated Household Pain Points (mapping to layers)

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    What's hardest right now?            │
│                                         │
│    (Select all that apply)              │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Disorganized / chaotic     │     │  → Rhythms, Getting Things Done
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  We argue a lot             │     │  → Triggers, How We Talk
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  No quality time together   │     │  → Building, Values
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  Kids don't listen          │     │  → Triggers, Talk, Getting Things Done
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  Everyone's stressed        │     │  → Triggers, Rhythms
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  Something else...          │     │
│    └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

*The layer mapping happens silently. User just picks what resonates.*

---

Based on selections, the **caring conversation** digs deeper into the relevant layers only. If they picked "Disorganized/chaotic", we ask about:

- **Our Rhythms**: "What does a typical morning look like?"
- **Getting Things Done**: "Who handles what? Is it clear?"

If they picked "We argue a lot", we ask about:

- **What Sets Us Off**: "What topics tend to spark conflict?"
- **How We Talk**: "When things get heated, what usually happens?"

---
---

## The Household Manual

After onboarding completes, the user lands here. It's styled like a **family book**, not a dashboard.

```
┌─────────────────────────────────────────┐
│  [Warm watercolor header]               │
│                                         │
│       THE KAUFMAN HOUSEHOLD             │
│       Our Manual                        │
│                                         │
│       [Illustration: Simple home        │
│        with family silhouettes]         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  OUR JOURNEY                            │
│  ─────────────                          │
│  Day 12 of 90                           │
│  ●●●●●●●●●●●●○○○○○○○○○○○○○○○○○○         │
│                                         │
│  Current milestone:                     │
│  "Mornings feel calmer"                 │
│  → 18 days to go                        │
│                                         │
│        [ Open This Week's Workbook ]    │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  OUR PEOPLE                             │
│  ─────────────                          │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Sarah  │  │  Caleb  │  │  Emma   │ │
│  │ (Parent)│  │ (Child) │  │ (Child) │ │
│  │  [View] │  │  [View] │  │  [View] │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT WE'VE LEARNED                     │
│  ─────────────────                      │
│                                         │
│  What Sets Us Off                       │
│  • Rushing in the morning               │
│  • Unexpected schedule changes          │
│                                         │
│  Our Rhythms                            │
│  • Mornings: chaotic (working on it!)   │
│  • Evenings: better when phones away    │
│                                         │
│  How We Get Things Done                 │
│  • Chore chart started Week 1           │
│  • Launch pad by door (Day 8)           │
│                                         │
│        [ See all → ]                    │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT WE STAND FOR                      │
│  ─────────────────                      │
│  "We repair when we mess up"            │
│  "Everyone's voice matters"             │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key elements:**

1. **Our Journey** - The 30/60/90 progress front and center
2. **Our People** - Quick access to individual manuals
3. **What We've Learned** - Organized by the 6 layers (friendly names)
4. **What We Stand For** - Family values they defined

---
---

## Next: The Household Workbook

Now let's see how the weekly workbook connects to the 30/60/90 journey.

```
┌─────────────────────────────────────────┐
│  [Warm watercolor wash]                 │
│                                         │
│       WEEK 2 OF YOUR JOURNEY            │
│                                         │
│       Milestone: "Mornings feel calmer" │
│       Day 12 → Day 30                   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  THIS WEEK'S FOCUS                      │
│  ─────────────────                      │
│                                         │
│  "Creating a launch pad"                │
│                                         │
│  A designated spot by the door where    │
│  everything needed for morning exits    │
│  lives: backpacks, keys, shoes.         │
│                                         │
│  WHY THIS MATTERS                       │
│  Reduces "where's my..." chaos.         │
│  Kids can own their own readiness.      │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  TASKS THIS WEEK                        │
│  ───────────────                        │
│                                         │
│  Household:                             │
│  ○ Pick the spot                        │
│  ○ Get hooks/bins (keep it simple)      │
│  ○ Do a family "reveal"                 │
│                                         │
│  Sarah:                                 │
│  ○ Lead the setup                       │
│  ○ Model using it for 3 days            │
│                                         │
│  Caleb:                                 │
│  ○ Decorate his hook/bin                │
│  ○ Practice: backpack goes here         │
│                                         │
│  Emma:                                  │
│  ○ Pick her favorite color bin          │
│  ○ Practice: shoes go here              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  END OF WEEK CHECK-IN                   │
│  ─────────────────────                  │
│                                         │
│  [ Complete Week 2 Reflection ]         │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key elements:**

1. **Week tied to milestone** - Always connected to the 30/60/90 journey
2. **Single focus** - ONE thing this week, not a list of unrelated tasks
3. **Why it matters** - Connects the task to the feeling they want
4. **Hub & spokes** - Household tasks + individual tasks delegated to each person

---
Excellent point. The AI coach should be woven throughout, not just in onboarding.

---

## AI Coach Integration

The coach appears as a conversational option whenever the app makes a suggestion:

```
┌─────────────────────────────────────────┐
│  THIS WEEK'S FOCUS                      │
│  ─────────────────                      │
│                                         │
│  "Creating a launch pad"                │
│                                         │
│  A designated spot by the door where    │
│  everything needed for morning exits    │
│  lives: backpacks, keys, shoes.         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 💬 Chat with coach about this   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

Tapping opens a conversation:

```
┌─────────────────────────────────────────┐
│  💬 COACH                               │
│  ─────────────────────────────          │
│                                         │
│  The launch pad idea is about reducing  │
│  morning chaos. What's on your mind?    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ I feel like the launchpad       │   │
│  │ should be for all times         │   │
│  │ leaving the house...            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  That makes sense! If departures are    │
│  chaotic in general (not just mornings),│
│  let's make it an "exit station."       │
│                                         │
│  Should we update the plan to focus on  │
│  ALL departures this week?              │
│                                         │
│  [ Yes, update it ]  [ Keep as mornings ]│
│                                         │
└─────────────────────────────────────────┘
```

**The coach can:**
- Refine suggestions to fit the family
- Answer "why" questions
- Adjust the 30/60/90 plan based on feedback
- Help troubleshoot when something isn't working

---

Now back to your question about person workbooks:
Let me clarify the goal structure:

---

## Goal Hierarchy

**Year level:**
- Multiple family goals (e.g., "More organized", "Better communication", "More quality time")
- These are the big themes

**90-day journeys:**
- Each goal might have its own 90-day journey
- Question: Run one at a time, or multiple in parallel?

**Weekly level:**
- Even with multiple goals, the "Opening a Gift" philosophy suggests ONE focus per week
- But that focus could rotate between different goals

---
Got it. So the default is:

**Parallel journeys with combined weekly focus** - Multiple goals run simultaneously, each week has tasks from multiple goals (but kept minimal)

**With user control** - Families can switch to sequential if they prefer focus on one journey at a time.

---

## Updated Household Workbook (Multiple Goals)

```
┌─────────────────────────────────────────┐
│  [Warm watercolor wash]                 │
│                                         │
│       WEEK 2                            │
│       The Kaufman Household             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  YOUR ACTIVE JOURNEYS                   │
│  ─────────────────────                  │
│                                         │
│  🏠 Organized Home          Day 12/90   │
│     "Mornings feel calmer"              │
│     ●●●●●●●●●●●●○○○○○○○○               │
│                                         │
│  💬 Better Communication    Day 5/90    │
│     "We listen before reacting"         │
│     ●●●●●○○○○○○○○○○○○○○○               │
│                                         │
│        [ Manage journeys ⚙️ ]           │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  THIS WEEK'S FOCUS                      │
│  ─────────────────                      │
│                                         │
│  From "Organized Home":                 │
│  ┌─────────────────────────────────┐   │
│  │ 🏠 Creating a launch pad        │   │
│  │    [ 💬 Chat with coach ]       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  From "Better Communication":           │
│  ┌─────────────────────────────────┐   │
│  │ 💬 Practice "repeat back"       │   │
│  │    Before responding, repeat    │   │
│  │    what you heard them say.     │   │
│  │    [ 💬 Chat with coach ]       │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  TASKS THIS WEEK                        │
│  ───────────────                        │
│  (grouped by person - see your slice)   │
│                                         │
│  Sarah: 3 tasks   [ View → ]            │
│  Caleb: 2 tasks   [ View → ]            │
│  Emma: 2 tasks    [ View → ]            │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key changes:**
- Multiple journeys shown with progress
- Each week pulls from active journeys (but stays minimal)
- "Manage journeys" lets users pause/prioritize
- Tasks grouped by person (hub & spokes)

---
---

## Sarah's Workbook View (Everything visible, hers highlighted)

```
┌─────────────────────────────────────────┐
│  [Warm watercolor wash]                 │
│                                         │
│       SARAH'S WEEK 2                    │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  🏠 ORGANIZED HOME                      │
│  "Creating a launch pad"                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ YOUR TASKS                ━━━━━ │   │  ← Highlighted
│  │ ◉ Lead the setup                │   │
│  │ ◉ Model using it for 3 days     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Household:                             │
│  ○ Pick the spot                        │  ← Visible but dimmer
│  ○ Get hooks/bins                       │
│  ○ Do a family "reveal"                 │
│                                         │
│  Caleb:                                 │
│  ○ Decorate his hook/bin                │
│  ○ Practice: backpack goes here         │
│                                         │
│  Emma:                                  │
│  ○ Pick her favorite color bin          │
│  ○ Practice: shoes go here              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  💬 BETTER COMMUNICATION                │
│  "Practice repeat back"                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ YOUR TASK                 ━━━━━ │   │  ← Highlighted
│  │ ◉ Use "repeat back" 3x today    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Everyone else:                         │
│  ○ Caleb: Practice with Sarah           │
│  ○ Emma: (age-appropriate version)      │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  📘 SARAH'S PERSONAL GOALS              │
│  (From your individual manual)          │
│                                         │
│  ◉ 5-min transition warnings            │
│  ◉ Validate before fixing               │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key elements:**
- Sarah sees the full picture (what everyone's working on)
- Her tasks are visually highlighted
- Personal goals (from her individual manual) appear at the bottom
- She can track progress for the whole family while knowing exactly what's hers

---
---

## Person Manual: Caleb (Child)

Styled like a "treasured book" about this person.

```
┌─────────────────────────────────────────┐
│  [Warm watercolor header]               │
│                                         │
│       CALEB'S MANUAL                    │
│       Our Journey Together              │
│                                         │
│       [Watercolor illustration:         │
│        Child silhouette or avatar]      │
│                                         │
│       Age 7 • 2nd Grade                 │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  HOW CALEB SHINES ✨                    │
│  ───────────────────                    │
│                                         │
│  • Creative problem-solver with Legos   │
│  • Deeply caring about his sister       │
│  • Incredible memory for facts          │
│  • Makes us laugh with his observations │
│                                         │
│        [ + Add a strength ]             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT WE'VE LEARNED                     │
│  ───────────────────                    │
│                                         │
│  What Sets Caleb Off                    │
│  • Transitions without warning          │
│  • Loud unexpected noises               │
│  • Feeling rushed                       │
│                                         │
│  How Caleb Processes                    │
│  • Needs time to shift gears            │
│  • Better with visual schedules         │
│  • Asks lots of "why" questions         │
│                                         │
│  What Works for Caleb                   │
│  • 5-minute warnings ✓ (working!)       │
│  • Choice between 2-3 options           │
│  • Silly voices get his attention       │
│                                         │
│        [ See all layers → ]             │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  HOW WE REPAIR 💛                       │
│  ────────────────                       │
│                                         │
│  When things go wrong:                  │
│  • Sit together on the couch            │
│  • "I'm sorry I yelled. That wasn't     │
│     fair to you."                       │
│  • Physical reconnection (hug)          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  CALEB'S WORKBOOK                       │
│  ─────────────────                      │
│                                         │
│  [ Open This Week's Practice ]          │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key sections:**
1. **How [Name] Shines** - Strengths first, always
2. **What We've Learned** - The 6 layers, friendly names
3. **How We Repair** - Explicit repair strategies
4. **Workbook link** - Connect to weekly practice

---
---

## Person Manual: Sarah (Adult/Parent)

Different structure - focused on self-awareness and how she shows up.

```
┌─────────────────────────────────────────┐
│  [Warm watercolor header]               │
│                                         │
│       SARAH'S MANUAL                    │
│       Knowing Myself                    │
│                                         │
│       [Watercolor illustration:         │
│        Abstract or avatar]              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHO I AM AT MY BEST ✨                 │
│  ─────────────────────                  │
│                                         │
│  • Patient listener                     │
│  • Creative problem-solver              │
│  • Brings calm to chaos                 │
│  • Fiercely protective of family time   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  MY PATTERNS                            │
│  ───────────────                        │
│                                         │
│  What Sets Me Off                       │
│  • Running late                         │
│  • Feeling unheard                      │
│  • When kids don't listen after 3x     │
│                                         │
│  How I React Under Stress               │
│  • Voice gets louder                    │
│  • I start doing instead of asking      │
│  • I withdraw and get quiet             │
│                                         │
│  Early Warning Signs                    │
│  • Jaw tightens                         │
│  • Short answers                        │
│  • Checking phone more                  │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT I NEED                            │
│  ────────────                           │
│                                         │
│  To show up as my best self:            │
│  • 10 min alone in the morning          │
│  • Feeling like a partner, not alone    │
│  • Acknowledgment when things are hard  │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT I'M WORKING ON                    │
│  ───────────────────                    │
│                                         │
│  • Pausing before reacting              │
│  • Validating before fixing             │
│  • Being kind to myself when I mess up  │
│                                         │
│  Current streak: 4 days 🔥              │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  HOW I REPAIR 💛                        │
│  ────────────────                       │
│                                         │
│  When I lose it:                        │
│  • Take a breath (even leave the room)  │
│  • Come back and name it: "I yelled.    │
│    That wasn't okay."                   │
│  • Physical reconnection                │
│  • Be kind to myself too                │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  MY WORKBOOK                            │
│  ────────────                           │
│                                         │
│  [ Open This Week's Practice ]          │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key differences from child manual:**

| Child Manual | Adult Manual |
|--------------|--------------|
| How [Name] Shines | Who I Am At My Best |
| What Sets [Name] Off | My Patterns (triggers + reactions) |
| How [Name] Processes | Early Warning Signs |
| What Works for [Name] | What I Need |
| — | What I'm Working On |
| How We Repair | How I Repair |

---
---

## Partner Perspective: David Viewing Sarah's Manual

When David opens Sarah's manual, he sees it through a "How to support her" lens:

```
┌─────────────────────────────────────────┐
│  [Warm watercolor header]               │
│                                         │
│       SARAH'S MANUAL                    │
│       How to Support Her                │
│                                         │
│       Viewing as: David (Partner)       │
│       [ Switch to Sarah's view ]        │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  SARAH AT HER BEST ✨                   │
│  ───────────────────                    │
│                                         │
│  • Patient listener                     │
│  • Creative problem-solver              │
│  • Brings calm to chaos                 │
│                                         │
│  💡 Notice when she's in this mode -    │
│     tell her you see it.                │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  SIGNS SHE'S STRUGGLING                 │
│  ─────────────────────                  │
│                                         │
│  Watch for:                             │
│  • Jaw tightens                         │
│  • Short answers                        │
│  • Checking phone more                  │
│                                         │
│  This usually means:                    │
│  • She's feeling overwhelmed            │
│  • She might need a break               │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  HOW TO HELP                            │
│  ───────────                            │
│                                         │
│  What she needs:                        │
│  • 10 min alone (offer to take kids)    │
│  • Feel like a partner, not alone       │
│  • Acknowledgment: "This is hard"       │
│                                         │
│  What NOT to do:                        │
│  • Jump in to "fix" it                  │
│  • Tell her to calm down                │
│  • Disappear when it gets tense         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  AFTER A HARD MOMENT                    │
│  ────────────────────                   │
│                                         │
│  How Sarah repairs:                     │
│  • She needs a moment, then comes back  │
│  • Physical reconnection helps          │
│                                         │
│  How you can help repair:               │
│  • Don't hold it against her            │
│  • "We all have hard moments"           │
│  • Let her come back without shame      │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key differences in partner view:**

| Sarah's View (Self) | David's View (Partner) |
|---------------------|------------------------|
| "My Patterns" | "Signs She's Struggling" |
| "What I Need" | "How to Help" |
| "How I Repair" | "After a Hard Moment" + "How you can help" |
| Self-reflection focus | Supportive action focus |

---
So the rule is:

- **Your own manual**: Self-awareness view
- **Someone else's manual**: Support perspective (default)

This applies to both adult-adult (partners) and adult-child (parent viewing child's manual gets "How to support Caleb").

---
Let me update the plan file with everything we've discussed.
Done. The plan now captures everything we've discussed:

- **Part 1: Onboarding** - Welcome, Video, Person vs Household paths, 90-day vision
- **Part 2: The Manual** - Household, Child, Adult structures + Partner perspective view
- **Part 3: The Workbook** - Hub & spokes, multiple parallel goals, person view
- **AI Coach** - Available throughout

Still marked as "to design":
- Stories feature
- Reflections & check-ins
- Kid-friendly view
- Adding new household members later
---

## Stories Feature: Let's Design It

You mentioned the original app had personalized stories with generated images that embed learnings in a fun narrative. Let me explore how this could work.

**Core concept:** Stories that help a child (or family) understand themselves through narrative - making the "manual" concepts feel like adventures, not clinical insights.

---

**Example story premise (for Caleb):**

> *"The Day Caleb's Brain Needed a Warning"*
> 
> Caleb was deep in his Lego spaceship when Mom said "Time to go!" His brain felt like someone pulled the plug. In the story, we meet Caleb's "Brain Helper" who explains why warnings help - and what Caleb can do when he doesn't get one.

The story embeds the learning (transition warnings help) in a narrative Caleb can relate to and remember.

---
---

## Stories as Workbook Activities

So a story appears as one of the weekly activities:

```
┌─────────────────────────────────────────┐
│  TODAY'S ACTIVITY WITH CALEB            │
│  ───────────────────────────            │
│                                         │
│  📖 Story Time                          │
│     ~10 min • Builds: Self-understanding│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  [Generated watercolor image:   │   │
│  │   Caleb with his "Brain Helper"]│   │
│  │                                 │   │
│  │  "The Day Caleb's Brain         │   │
│  │   Needed a Warning"             │   │
│  │                                 │   │
│  │  Chapter 2 of Caleb's Story     │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ PARENT'S GUIDE                  │   │
│  │                                 │   │
│  │ Before reading:                 │   │
│  │ • Find a cozy spot              │   │
│  │ • "This story is about YOU!"    │   │
│  │                                 │   │
│  │ While reading:                  │   │
│  │ • Pause to ask "Has that ever   │   │
│  │   happened to you?"             │   │
│  │ • Let Caleb point things out    │   │
│  │   in the pictures               │   │
│  │                                 │   │
│  │ After:                          │   │
│  │ • "What did your Brain Helper   │   │
│  │   teach you?"                   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [    Read Together    ]                │
│                                         │
└─────────────────────────────────────────┘
```

---
---

## Episodic Story Structure

One ongoing story unfolds week by week, aligned with the family's 90-day journey.

**Example: "Caleb and the Brain Helper"**

```
THE STORY ARC (tied to 90-day journey)
──────────────────────────────────────

DAYS 1-30: "Learning About My Brain"
├─ Ch 1: Caleb meets his Brain Helper
├─ Ch 2: The day Caleb's brain needed a warning
├─ Ch 3: When loud sounds make Brain Helper hide
├─ Ch 4: The "5 more minutes" magic spell
└─ Ch 5: Caleb teaches Mom about his brain

DAYS 31-60: "Getting Stronger Together"
├─ Ch 6: Brain Helper learns a new trick
├─ Ch 7: The big feelings storm
├─ Ch 8: How Caleb calms the storm
└─ ...

DAYS 61-90: "Caleb Becomes a Brain Expert"
├─ ...
└─ Final Chapter: Caleb writes his own story
```

**Key elements:**
- Story arc matches the 90-day journey milestones
- Each chapter reinforces what the family is practicing that week
- Generated images make Caleb the hero of his own story
- Final chapter: Caleb has learned to understand himself

---
---

## Story Generation Logic

Each chapter is generated based on:
1. **Child's profile** - Name, triggers, what works, personality
2. **This week's workbook focus** - The skill/practice being worked on
3. **Previous chapters** - Maintain continuity with the ongoing narrative

**Example flow:**

```
Week 2 Workbook Focus: "5-minute transition warnings"
                    ↓
        Story Generator creates:
                    ↓
┌─────────────────────────────────────────┐
│  Chapter 2: "The Day Caleb's Brain      │
│              Needed a Warning"          │
│                                         │
│  Caleb was building the best Lego       │
│  spaceship EVER when Mom said           │
│  "Time to go!" His brain felt like      │
│  someone pulled the plug on his         │
│  favorite video game...                 │
│                                         │
│  [Generated image: Caleb looking        │
│   startled, Legos mid-air, Brain        │
│   Helper character looking worried]     │
│                                         │
│  Brain Helper whispered, "Your brain    │
│  doesn't like surprises! Let's teach    │
│  Mom the magic warning spell..."        │
│                                         │
└─────────────────────────────────────────┘
```

---
---

## Story Character Setup

**During onboarding (or first story activity):**

```
┌─────────────────────────────────────────┐
│  [Soft watercolor wash]                 │
│                                         │
│                                         │
│    Let's create Caleb's                 │
│    story companion!                     │
│                                         │
│    Who should guide the story hero?     │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  🐉  A friendly dragon      │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  🤖  A helpful robot        │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  🧚  A wise fairy           │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  🐻  A cozy bear            │     │
│    └─────────────────────────────┘     │
│    ┌─────────────────────────────┐     │
│    │  ✨  Something else...      │     │
│    └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

Then:

```
┌─────────────────────────────────────────┐
│                                         │
│    What should we name the              │
│    story hero?                          │
│                                         │
│    (This character will be a lot        │
│     like Caleb, but with a              │
│     different name!)                    │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Max                        │     │
│    └─────────────────────────────┘     │
│                                         │
│    And the dragon's name?               │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Spark                      │     │
│    └─────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

**Result:** Stories feature "Max and Spark" - where Max experiences things similar to Caleb, and Spark helps Max understand his brain/feelings.

---
---

## Expanded Story Character Customization

### Step 1: The Companion

```
┌─────────────────────────────────────────┐
│  Who should guide the story hero?       │
│                                         │
│  [🐉] [🤖] [🧚] [🐻] [🦊] [✨]         │
│   ^selected                             │
│                                         │
│  What's the dragon's name?              │
│  ┌─────────────────────────────┐       │
│  │  Spark                      │       │
│  └─────────────────────────────┘       │
│                                         │
│  What's Spark like?                     │
│  ┌─────────────────────────────┐       │
│  │  ○ Silly and playful        │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  ● Calm and wise            │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  ○ Brave and adventurous    │       │
│  └─────────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

### Step 2: The Hero

```
┌─────────────────────────────────────────┐
│  Now let's create the story hero!       │
│  (A character a lot like Caleb)         │
│                                         │
│  What's the hero's name?                │
│  ┌─────────────────────────────┐       │
│  │  Max                        │       │
│  └─────────────────────────────┘       │
│                                         │
│  What does Max look like?               │
│                                         │
│  Hair:  [Brown ▼]  [Curly ▼]           │
│  Skin:  [🟫] [🟡] [🟤] [⚫]             │
│  Style: [Casual ▼]                      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  [Preview: Generated avatar     │   │
│  │   of Max with selected traits]  │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Step 3: The World (Optional)

```
┌─────────────────────────────────────────┐
│  Where do Max and Spark's               │
│  adventures happen?                     │
│                                         │
│  ┌─────────────────────────────┐       │
│  │  🏠 A town like ours        │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  🏰 A magical kingdom       │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  🚀 Space adventures        │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  🌳 An enchanted forest     │       │
│  └─────────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

---

**Result:** Fully personalized stories featuring Max (brown curly hair, looks like Caleb) and his calm, wise dragon Spark, having adventures in a magical kingdom - but dealing with the same triggers and learnings as Caleb.

---
---

## The Story Reading Experience

When the parent taps "Read Together" in the workbook:

```
┌─────────────────────────────────────────┐
│                            Chapter 2/12 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  [Full-width generated image:   │   │
│  │   Max looking startled at his   │   │
│  │   Legos, Spark hovering nearby] │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Max was building the best spaceship   │
│  EVER. His fingers moved fast,         │
│  snapping bricks into place.           │
│                                         │
│  "Almost done!" he whispered.          │
│                                         │
│  Then Mom called from downstairs:      │
│  "Time to go, Max!"                    │
│                                         │
│                                         │
│         [ Next → ]                      │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Large, beautiful generated images
- Simple, readable text (age-appropriate)
- Page-by-page progression (not scroll)
- Parent reads aloud to child

---

## Story with Discussion Prompts

Some pages include gentle prompts for parent-child discussion:

```
┌─────────────────────────────────────────┐
│                                         │
│  Spark flew closer. "Your brain        │
│  doesn't like surprises, Max.          │
│  It needs time to get ready."          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 💬 PAUSE AND ASK                │   │
│  │                                 │   │
│  │ "Has that ever happened to you? │   │
│  │  When someone said 'time to go' │   │
│  │  and you weren't ready?"        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Max nodded. "But what can I do?"      │
│                                         │
│         [ Next → ]                      │
│                                         │
└─────────────────────────────────────────┘
```

---
---

## Story Library (in Child's Manual)

```
┌─────────────────────────────────────────┐
│  CALEB'S MANUAL                         │
│                                         │
│  [Other sections...]                    │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  MAX & SPARK'S ADVENTURES 📚            │
│  ─────────────────────────              │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Ch. 1   │ │ Ch. 2   │ │ Ch. 3   │  │
│  │ [img]   │ │ [img]   │ │ [img]   │  │
│  │ Meeting │ │ The     │ │ Coming  │  │
│  │ Spark   │ │ Warning │ │ Soon... │  │
│  │    ✓    │ │    ✓    │ │    🔒   │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  2 of 12 chapters complete              │
│                                         │
│        [ Read a chapter ]               │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Visual chapter cards with cover images
- Completed chapters marked
- Upcoming chapters locked (anticipation)
- Can re-read any completed chapter

---

Let me update the plan file with the Stories feature design.
Stories feature is now documented in the plan.
---

## Reflections & Check-ins

Let me walk through the different reflection moments:

### 1. Quick Reflection (After Activity)

This already exists in our workbook design - appears after completing a daily activity:

```
┌─────────────────────────────────────────┐
│  WHAT DID YOU NOTICE?                   │
│  (helps update Caleb's manual)          │
│                                         │
│  [                                    ] │
│  [     e.g., "He loved the silly     ] │
│  [      voices - got him engaged"    ] │
│                                         │
│  [ Save to Manual ]  [ Skip for now ]   │
│                                         │
└─────────────────────────────────────────┘
```

---

### 2. Weekly Check-in (End of Week)

Appears at the end of each week - gentle, not grading:

```
┌─────────────────────────────────────────┐
│  [Warm watercolor wash]                 │
│                                         │
│       WEEK 2 COMPLETE                   │
│       ──────────────                    │
│                                         │
│       Let's reflect on your week.       │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  HOW DID IT FEEL?                       │
│                                         │
│  This week's focus was                  │
│  "5-minute transition warnings"         │
│                                         │
│  How often did you practice this?       │
│                                         │
│  [ Rarely ]  [ Sometimes ]  [ Often ]   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT WORKED?                           │
│                                         │
│  [                                    ] │
│  [                                    ] │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT WAS HARD?                         │
│                                         │
│  [                                    ] │
│  [                                    ] │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  DID YOU REPAIR THIS WEEK?              │
│                                         │
│  [ ] I made mistakes and was kind       │
│      to myself                          │
│  [ ] I repaired with Caleb after a      │
│      hard moment                        │
│                                         │
│        [ Complete Week 2 → ]            │
│                                         │
└─────────────────────────────────────────┘
```

---
---

### 3. Daily Journal (New)

An optional daily journaling feature with system-suggested prompts:

```
┌─────────────────────────────────────────┐
│  [Warm watercolor wash]                 │
│                                         │
│       DAILY JOURNAL                     │
│       Tuesday, Jan 28                   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  TODAY'S PROMPT (optional)              │
│  ─────────────────────────              │
│                                         │
│  "What moment today made you feel       │
│   most connected to Caleb?"             │
│                                         │
│  [ Use this prompt ]  [ Different one ] │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │                                 │   │
│  │                                 │   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ Save entry ]  [ Skip today ]         │
│                                         │
└─────────────────────────────────────────┘
```

**System-chosen prompts could include:**
- "What moment today made you feel most connected to [child]?"
- "What was hardest today? How did you handle it?"
- "Did you notice any triggers today? What happened?"
- "What made you proud of yourself as a parent today?"
- "What do you want to do differently tomorrow?"
- "What's one thing [child] did that surprised you?"

**Prompt selection logic:**
- Based on what they're working on (if practicing transition warnings, prompt might be about transitions)
- Varies day to day (not repetitive)
- User can request a different prompt

---
---

### 4. Milestone Celebrations (30/60/90 days)

When a milestone is reached, a special celebration screen:

```
┌─────────────────────────────────────────┐
│  [Celebratory watercolor wash]          │
│                                         │
│       🎉                                │
│                                         │
│       DAY 30 MILESTONE                  │
│       ────────────────                  │
│                                         │
│       "Mornings feel calmer"            │
│                                         │
│       You made it.                      │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  YOUR JOURNEY SO FAR                    │
│                                         │
│  📅 30 days of showing up               │
│  ✓  18 activities completed             │
│  📖 4 story chapters read               │
│  💛 6 repairs celebrated                │
│  📝 12 journal entries                  │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  LOOKING BACK                           │
│                                         │
│  When you started, mornings were:       │
│  "Chaotic, stressful, always rushing"   │
│                                         │
│  How do mornings feel now?              │
│                                         │
│  [                                    ] │
│  [                                    ] │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  WHAT HELPED MOST?                      │
│                                         │
│  [ ] 5-minute warnings                  │
│  [ ] The launch pad                     │
│  [ ] Consistent wake-up time            │
│  [ ] Something else: [          ]       │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  NEXT MILESTONE: DAY 60                 │
│  "We know where things are"             │
│                                         │
│        [ Continue the Journey → ]       │
│                                         │
└─────────────────────────────────────────┘
```

---

**Key elements of milestone celebrations:**
- Celebratory visual (warm, not corporate achievement badge)
- Summary of the journey stats (gentle, not gamified)
- Before/After reflection
- What helped most (feeds back into the system)
- Preview of next milestone

---
---

### Back to Weekly Check-ins

You asked about whether weekly check-ins are required. Given the daily journal is now part of the experience:
---

### Updated Weekly Check-in Logic

**If daily journals exist for the week:**
System generates a summary, user just reviews and confirms:

```
┌─────────────────────────────────────────┐
│  WEEK 2 SUMMARY                         │
│  (from your journal entries)            │
│                                         │
│  This week you practiced:               │
│  "5-minute transition warnings"         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Based on your entries:          │   │
│  │                                 │   │
│  │ • Monday: "Used warnings 3x,    │   │
│  │   worked great at bedtime"      │   │
│  │ • Wednesday: "Forgot in the     │   │
│  │   morning, hard day"            │   │
│  │ • Friday: "Getting easier!"     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  How accurate is this summary?          │
│  [ Looks right ]  [ Let me adjust ]     │
│                                         │
│  Anything to add?                       │
│  [                                    ] │
│                                         │
│        [ Complete Week 2 → ]            │
│                                         │
└─────────────────────────────────────────┘
```

**If no daily journals for the week:**
Full weekly check-in form (as shown earlier).

---

Let me update the plan with the Reflections & Check-ins design.
Reflections & Check-ins added to the plan.
---

## Adding Household Members Later

### Where to Access

From the Household Manual:

```
┌─────────────────────────────────────────┐
│  THE KAUFMAN HOUSEHOLD                  │
│                                         │
│  OUR PEOPLE                             │
│  ─────────────                          │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Sarah  │  │  Caleb  │  │  Emma   │ │
│  │ (Parent)│  │ (Child) │  │ (Child) │ │
│  │  [View] │  │  [View] │  │  [View] │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
│        [ + Add someone new ]            │
│                                         │
└─────────────────────────────────────────┘
```

---

### Flow: Adding Someone New

```
┌─────────────────────────────────────────┐
│  Who are you adding?                    │
│                                         │
│  ┌─────────────────────────────┐       │
│  │  👶  A child                │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  👤  A partner/co-parent    │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  🧑  Another caregiver      │       │
│  │      (grandparent, nanny)   │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │  ✨  Someone else           │       │
│  └─────────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

---
---

### Adding a Child: Inherit + Customize

```
┌─────────────────────────────────────────┐
│  What's their name?                     │
│                                         │
│  ┌─────────────────────────────┐       │
│  │  Oliver                     │       │
│  └─────────────────────────────┘       │
│                                         │
│  How old is Oliver?                     │
│  ┌─────────────────────────────┐       │
│  │  3                          │       │
│  └─────────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

Then:

```
┌─────────────────────────────────────────┐
│  Based on your household, we know       │
│  mornings and transitions can be        │
│  challenging.                           │
│                                         │
│  Is this also true for Oliver?          │
│                                         │
│  [ Yes, similar ]  [ Different for him ]│
│                                         │
└─────────────────────────────────────────┘
```

If "Different for him" → ask follow-up questions specific to Oliver.

Then:

```
┌─────────────────────────────────────────┐
│  What's unique about Oliver?            │
│                                         │
│  What are his strengths?                │
│  [                                    ] │
│                                         │
│  What sets him off that's different     │
│  from Caleb or Emma?                    │
│  [                                    ] │
│                                         │
│  Anything else we should know?          │
│  [                                    ] │
│                                         │
└─────────────────────────────────────────┘
```

---

### Adding a Partner/Co-parent
---

### Adding a Partner: Own Login + Join Household

**Step 1: Invite**

```
┌─────────────────────────────────────────┐
│  Invite your partner                    │
│                                         │
│  What's their name?                     │
│  ┌─────────────────────────────┐       │
│  │  David                      │       │
│  └─────────────────────────────┘       │
│                                         │
│  Their email:                           │
│  ┌─────────────────────────────┐       │
│  │  david@email.com            │       │
│  └─────────────────────────────┘       │
│                                         │
│  We'll send them an invite to join      │
│  the Kaufman household.                 │
│                                         │
│        [ Send Invite ]                  │
│                                         │
└─────────────────────────────────────────┘
```

**Step 2: Partner Receives Invite**

David gets an email/link:

```
┌─────────────────────────────────────────┐
│  Sarah invited you to join              │
│  the Kaufman household on Relish.       │
│                                         │
│  You'll be able to:                     │
│  • See and contribute to children's     │
│    manuals                              │
│  • Have your own workbook with          │
│    personalized practices               │
│  • Build your own manual (optional)     │
│  • Track household goals together       │
│                                         │
│        [ Join the Household ]           │
│                                         │
└─────────────────────────────────────────┘
```

**Step 3: Partner Creates Account + Quick Onboarding**

```
┌─────────────────────────────────────────┐
│  Welcome, David!                        │
│                                         │
│  Let's set up your space in the         │
│  Kaufman household.                     │
│                                         │
│  Would you like to create your own      │
│  manual? (Sarah has one)                │
│                                         │
│  [ Yes, create mine ]  [ Maybe later ]  │
│                                         │
└─────────────────────────────────────────┘
```

If "Yes" → Adult manual onboarding (My Patterns, What I Need, etc.)

---

### Adding a Caregiver (Limited Access)
I noticed you started typing something - did you want to add a note? Feel free to share, and I'll incorporate it.

In the meantime, here's the caregiver permission setup:

---

### Adding a Caregiver: Customizable Permissions

```
┌─────────────────────────────────────────┐
│  Invite a caregiver                     │
│                                         │
│  Name: [  Grandma Carol    ]            │
│  Email: [ carol@email.com  ]            │
│                                         │
│  What can Grandma Carol access?         │
│                                         │
│  ☑ View Caleb's manual                  │
│  ☑ View Emma's manual                   │
│  ☐ View Oliver's manual                 │
│  ☐ Edit children's manuals              │
│  ☐ View household goals                 │
│  ☐ Have their own workbook              │
│                                         │
│  [ Send Invite ]                        │
│                                         │
└─────────────────────────────────────────┘
```

This lets parents control exactly what caregivers can see - useful for:
- Grandparents who help with one child but not others
- Nannies who need to see "What Works" for the kids
- Babysitters who just need the basics

---
Yes, I think we're at a good stopping point for design. Here's what we've covered:

**Core User Experience:**
- ✓ Onboarding (Person + Household paths)
- ✓ 90-day journeys with milestones
- ✓ Hub & spokes architecture
- ✓ The 6 layers (friendly terminology)

**The Manual:**
- ✓ Household Manual
- ✓ Child Manual
- ✓ Adult Manual (different structure)
- ✓ Partner perspective view

**The Workbook:**
- ✓ Multiple parallel goals
- ✓ Person view (everything visible, theirs highlighted)
- ✓ Daily journal
- ✓ Weekly check-ins
- ✓ Milestone celebrations

**Special Features:**
- ✓ AI Coach throughout
- ✓ Personalized stories with customizable characters
- ✓ Adding household members later

**Deferred:**
- Kid-friendly view (can add later)
- Detailed technical implementation

This is enough to start building. The kid-friendly view is a nice-to-have that can be designed when needed.
I'll implement this comprehensive design plan for the Relish App. Let me first explore the existing codebase structure to understand what's already in place.
Now I have a comprehensive understanding of the codebase. Let me create tasks to track this large implementation.
Let me read the existing onboarding components and types to understand what to build on.
Now I have a clear picture of the existing codebase. Let me read the welcome page and check the current routing flow.
Now I understand the current flow. Let me check the family types and hooks to understand how to create household manuals.
Now I have a comprehensive understanding of the codebase. Let me create the enhanced onboarding system. I'll start by creating the new types and then the component.
Now let me create the main RelishOnboarding component that handles the entire onboarding flow.
Now let me update the onboarding page to use the new RelishOnboarding component and handle both paths.
Let me update the exports and then mark the onboarding task as complete.
Now let me work on the Household Manual. First, let me read the existing manual page structure.
Let me create the journey types and the HouseholdManualView component.
Now let me create the HouseholdManualView component.
Now let me update the hooks to fetch family manuals and update the manual page.
Now let me update the manual page to handle both child and family manuals.
Now let me update the manual components index to export HouseholdManualView.
Now let me work on enhancing the Person Manual. First, let me read the existing ManualTabs component.
Let me create an enhanced PersonManualView component that handles child/adult variants and partner perspective.
Let me update the manual component exports and mark task #3 as complete.
Let me read the existing workbook components to understand the current structure.
Let me create the HouseholdWorkbookView component for the Hub & Spokes architecture.
Let me update the workbook component exports.
Let me read the existing reflection component and implement the enhanced reflection system.
Now let me create the additional reflection components - Quick Reflection, Daily Journal, and Milestone Celebration.
Let me create the reflection components index file.
Let me check the current task status and continue with the implementation.
I'll continue with Task #6 - integrating the reflection components into the app. Let me check the existing workbook components to integrate the reflections properly.
Now I'll integrate the reflection components. Let me enhance the DailyActivityCard to show QuickReflection after completion, and add DailyJournal to the WorkbookView.
Now let me update the WorkbookView to include the DailyJournal component.
Now let me update the HouseholdWorkbookView to include the DailyJournal as well.
Let me update the HouseholdWorkbookView to include the DailyJournal in the overview section.
Now let me create a hook to manage journal entries and reflections for the data layer.
Let me update the collections and create the useReflections hook.
Now let me create the useReflections hook to manage journal entries and reflections.
Let me update the reflection component exports to include all necessary types.
Let me check for TypeScript errors to ensure the integration works.
TypeScript compilation successful. Let me update the task status and continue with the remaining work.
Now I'll implement Task #7 - the Add Household Members feature. Let me create the component for adding new members.
Let me update the onboarding index to export the new component.
Now let me integrate the AddMemberFlow into the HouseholdManualView. Let me first check the current PeopleSection implementation.
Let me update the manual page to use the AddMemberFlow modal instead of redirecting.
Let me check for TypeScript errors.
No TypeScript errors. Let me mark Task #7 as complete and move to the Stories feature.
Let me create the types and components for the Stories feature.
Now let me create the Story Character Setup component.
Now let me create the Story Reader component for the reading experience.
Let me create the index file for stories components and update the types.
Let me verify TypeScript compilation.
All tasks from the design plan are now complete. Here's a summary of what was implemented:

## Completed Implementation

### Task #6: Reflections & Check-ins System
- **QuickReflection** - Post-activity reflection with "Save to Manual" option
- **DailyJournal** - Contextual prompts based on weekly focus (connection, triggers, routines, repair)
- **MilestoneCelebration** - 30/60/90 day celebration modals with stats and feedback collection
- **useReflections hook** - Data layer for saving journal entries and reflections
- Integrated into `DailyActivityCard` and `WorkbookView`

### Task #7: Add Household Members
- **AddMemberFlow** component with three paths:
  - **Child** - Inherit household patterns or customize, add unique strengths/triggers
  - **Partner** - Email invite with full family access
  - **Caregiver** - Customizable permissions (view/edit children, household goals, own workbook)
- Integrated into HouseholdManualView with modal display
- Added `refresh` function to `useFamilyManuals` hook

### Task #5: Stories Feature
- **Types** (`src/types/story.ts`):
  - StoryCharacter, StoryArc, StoryChapter, StoryPage, StoryProgress
  - Character setup options (companions, personalities, worlds, appearance)
  
- **StoryCharacterSetup** - Multi-step character creation:
  - Companion selection (Dragon, Robot, Fairy, Bear, Fox, custom)
  - Companion naming and personality
  - Hero naming (different from real child) and appearance
  - World selection (Town, Kingdom, Space, Forest)
  - Preview step

- **StoryReader** - Full reading experience:
  - Page-by-page navigation with progress bar
  - Full-width images with text
  - Discussion prompts ("PAUSE AND ASK")
  - Chapter completion tracking

- **StoryLibrary** - Chapter grid with:
  - Visual chapter cards with status badges
  - Locked/available/completed states
  - Progress indicator

### Files Created/Modified

**New Files:**
- `src/components/reflection/QuickReflection.tsx`
- `src/components/reflection/DailyJournal.tsx`
- `src/components/reflection/MilestoneCelebration.tsx`
- `src/components/reflection/index.ts`
- `src/hooks/useReflections.ts`
- `src/components/onboarding/AddMemberFlow.tsx`
- `src/types/story.ts`
- `src/components/stories/StoryCharacterSetup.tsx`
- `src/components/stories/StoryReader.tsx`
- `src/components/stories/index.ts`

**Modified Files:**
- `src/components/workbook/DailyActivityCard.tsx` - Added QuickReflection integration
- `src/components/workbook/WorkbookView.tsx` - Added DailyJournal integration
- `src/components/workbook/HouseholdWorkbookView.tsx` - Added DailyJournal integration
- `src/components/manual/HouseholdManualView.tsx` - Fixed JSX.Element type issue
- `src/app/manual/[id]/page.tsx` - Added AddMemberFlow modal
- `src/hooks/useManual.ts` - Added refresh function to useFamilyManuals
- `src/types/index.ts` - Added story exports and reflection collections
Let me first read the existing plan to understand the context, then we can discuss the design issues page by page.
I understand - you're concerned about the visual design quality. This is a different task than the feature implementation plan that was there before. Let me explore the current pages to understand what we're working with, then we can discuss specific improvements.
Based on the exploration, I can see the app has a foundation but several design issues:

**Current Problems Identified:**
1. **Dashboard is dense** - Too many grids competing (Quick Actions, Weekly Progress, Manuals, Layer Overview, Framework - all packed together)
2. **Manual Header is cramped** - Avatar, title, stats, buttons all fighting for attention
3. **Everything looks the same** - Every card uses identical styling, no visual hierarchy
4. **Inconsistent spacing** - Some areas use "breathing room," others are tight
5. **Mix of styling approaches** - Inline styles, Tailwind, CSS variables all jumbled

The design system has good bones (warm colors, nice fonts) but the execution feels crowded and overwhelming.
Let me look at the current dashboard in detail.
I can see the issues clearly now. The dashboard has:
- **6 competing sections** all crammed together
- **Technical jargon** ("6-Layer Framework", "Inputs", "Processing", "Supervisory")
- **Everything looks the same** - all `instruction-card` with equal visual weight
- **No clear hierarchy** - what should users focus on?

Let me get the frontend-design specialist's input on redesigning this.
<thinking>
The user wants me to use the frontend-design skill to redesign the dashboard. The skill has been loaded and provides guidance on creating distinctive, production-grade frontend interfaces.

Let me think about the design direction for this Relish parenting app dashboard:

**Purpose**: Parents tracking their relationship/understanding of their children. The "manual" metaphor - like building understanding of your child step by step.

**Tone**: This should be **warm/organic/soft** - like a treasured journal or a handwritten letter. NOT corporate, NOT tech-y. Think of the feeling of opening a beautifully wrapped gift, or a handmade book. Soft pastels, cream paper textures, gentle animations.

**Differentiation**: What makes this UNFORGETTABLE?
- The feeling of opening a treasured book/journal
- A single, calming focus instead of dashboard chaos
- Typography that feels like it was hand-chosen with love
- The absence of typical "app" UI patterns

**Design Direction: "The Treasured Journal"**
- Cream/warm paper background with subtle texture
- One hero element - today's focus or the child they're working with
- Large, serif typography (Fraunces is perfect)
- Minimal chrome - no heavy headers or navigation
- Cards that look like pages from a journal
- Soft shadows and rounded corners
- Gentle fade-in animations

Since I'm in plan mode and can only write to the plan file, let me create a comprehensive design plan that captures this vision and the specific implementation details.
</thinking>

Let me think through this design challenge with the frontend-design skill's guidance.

## Design Thinking for Relish Dashboard

**Purpose**: Parents nurturing understanding of their children - not tracking metrics, but building connection.

**Tone Direction: "The Treasured Journal"**
- Warm, soft, organic - like opening a beloved family journal
- NOT a dashboard. NOT corporate. NOT tech-y.
- The feeling of handwritten notes and morning light through curtains

**Differentiation**: What makes this unforgettable?
- **One breath** - a single calming focus, not 6 competing sections
- **Paper texture** - feels tangible, not digital
- **Generous emptiness** - the courage to show less
- **Personal warmth** - addresses the child by name, not "Manual #1"

Let me now write this into a concrete design plan.
<thinking>
The user loves the direction. Now I should finalize the plan and call ExitPlanMode to get approval to implement. Let me clean up the plan file to remove the old feature implementation stuff and focus on this design overhaul.
</thinking>

Let me finalize the plan with implementation details.
<thinking>
I've written a comprehensive plan for the Dashboard redesign with:
- Clear design direction ("The Treasured Journal")
- Specific problems identified and solutions
- Visual specifications (typography, colors, spacing)
- New information architecture
- What to remove vs keep
- Implementation details with code examples
- Verification criteria

The user said they love the direction. Now I should call ExitPlanMode to get approval to implement.
</thinking>
No response requested.
