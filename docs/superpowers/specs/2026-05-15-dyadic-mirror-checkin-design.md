# Dyadic Mirror Check-in — Design

**Date:** 2026-05-15
**Status:** Approved (design), pending implementation plan
**Supersedes the *intent* of:** `2026-05-13-bedtime-checkin-cards-design.md` (those cards stay in the codebase; this is a new, additive moment, not a rewrite)

## Problem

The May 2026 bedtime check-in (three rotating cards: Parent Reflection, High/Low/Buffalo, Externalized Worry) shipped and failed in real use. With Scott's actual kids — **Kaleb and Ella, 8-year-old twins** — the activities produced no real moment:

- **Kaleb** gave terse three-word answers (completed the quiz efficiently).
- **Ella** stalled for a long time hunting for the "right"/worthy answer (perfectionism).

The kids are *into* the tool and *take it seriously* — there is no buy-in problem. The check-ins run with **both Scott and Iris present, one-on-one with each twin, sequentially**. An 8-year-old facing two attentive loved adults, asked an open recall question, experiences self-report as a *performance on a stage*. Parent-goes-first modeling *raises* the bar rather than lowering it.

The deeper reframe (established in brainstorming): the real job is **not kid self-report**. It is **repairing the recurring frictions between specific pairs of people in the family** — e.g., Kaleb's impulsivity/provocation/not-listening colliding with Scott's impatience and hypersensitivity to buttons Kaleb knows how to press. The collision is mutual; every collision has both chairs. Scott wants this for every dyad in the house.

## Goal

Optimize for **"did this feel like a real moment between us"** — never coverage or answer depth. A flat night is still a success if the moment felt real. The tool **reflects; it never coaches**.

## The Model: One Loop

Four moments that are not alternatives — they are one virtuous cycle for a single dyad:

1. **Catch** — when the spiral starts, a shared word for it.
2. **Repair** — that night, a reliable way back to each other.
3. **Mirror** — the *engine* of repair: each person sees the moment from the other's chair.
4. **Deposit** — every repair accrues into a living "us" record; the fuller it gets, the faster you Catch next time.

`Catch → Repair (powered by Mirror) → Deposit → Catch faster next time.`

Mirror is the engine. Repair is Mirror applied to a bad day. The "us" manual is Mirror deposits accumulating. Catch only works once that manual has named patterns. **Therefore: design the whole loop on paper; ship only the bare Mirror first.** Rationale: the prior redesign failed silently in real use, so the highest-value asset is a tight feedback loop — change one core thing, test with Kaleb the next night, learn. Building all four at once destroys attribution, requires inventing Catch's patterns abstractly before any real data exists, and is an expensive wrong bet experienced *with a real child at bedtime*.

## The Unit: The Dyad, Not the Person

The app's current unit is a *person* (person-manual). This design introduces the **dyad** — a pair, e.g. `{Scott, Kaleb}` — as a first-class entity that owns a record, accretes patterns, and gets a nightly moment. This single data-model decision is what lets Repair, the "us" manual, and Catch all slot in later as operations on a dyad, without a rewrite.

## Iris as Co-Equal Steward (hard requirement)

Iris is **not** "the other adult in the room while Scott runs it." She is a co-equal steward with her own dyads (Iris↔Ella, Iris↔Kaleb, Iris↔Scott). On any night this runs, **her role that night must be explicit and visible** — her own dyad (e.g. Iris↔Ella in parallel), a triad, or all-together — never the silent witness to Scott's moment with Kaleb. The system's job is to make **"who's got who tonight"** a clear, shared, first-class thing. The Mirror mechanic must generalize to 3+ participants (triad / all-together): same mechanic, each chair's view of one moment, synthesis names alignments/gaps across all of them.

## Data Model

Three entities:

- **`Dyad`** — `{ participantIds: [a, b] }`. The relationship is the record. Holds the accreting deposits (field exists in v1, empty/unused). `participantIds` may hold 3+ for a triad/all-together night — same mechanic. v1 only ever writes a 2-person dyad, but the shape does not forbid more.

- **`MirrorEntry`** — one exchange belonging to a `Dyad`: the prompt, each participant's hidden answer, the one synthesized line, timestamp. This is the deposit. v1 writes it and stops; the "us" manual layer later reads the stream.

- **`NightPlan`** — the Iris requirement made concrete. A night is an explicit small plan: a list of that night's Mirrors, each with its participants, which steward runs it, and its **device mode** — e.g. `[{Scott,Kaleb}@Scott, {Iris,Ella}@Iris]` (two-device parallel), or a single shared-iPad sequence. Both stewards see the same plan. **v1 does not build the orchestrator UI**; the shape exists, and v1's entry screen makes the user *pick the pairing* (so Iris↔Ella is a co-equal first-class run, never a hidden mode), rather than hardcoding Scott+Kaleb.

## Devices (the "hidden until both are in" invariant)

Device count is **not fixed** and must not be hardcoded. The family usually shares **one iPad**, but Iris's phone or laptop is available when wanted. The invariant is "neither person sees the other's answer until both are submitted"; *how* that's achieved is a property of the night:

- **One shared iPad (common, the v1 path):** **pass-the-device** — first person answers, screen flips/locks, hand over, second person answers, then reveal together.
- **Two devices (Iris's phone/laptop available):** genuinely parallel — and in this mode `{Scott,Kaleb}` and `{Iris,Ella}` can run at the same time, which is the cleanest expression of Iris-as-co-equal.

v1 builds the **single-iPad pass-the-device path** (simplest, matches the common case). The two-device parallel variant is explicitly designed-for (the `MirrorEntry`/`NightPlan` shape does not preclude it) but not built in v1.

## The Mirror Moment (shippable v1)

The entire first build. Reuses the existing check-in input (textarea + `MicButton`) and one constrained AI call.

1. **Pick the dyad; frame it as *between us*, not about the kid.** v1 only `{Scott, Kaleb}` in practice, but the pairing is selected on the entry screen, not hardcoded. The prompt is about the *space between the two people today* — never "how was your day."

2. **One tiny, projective, no-right-answer prompt — answered hidden (pass-the-device in v1).** v1 prompt: *"If today between you and Dad was an animal — what animal, and what was it doing?"* Each participant answers about the pair, from their own chair. Neither sees the other's answer until both are submitted (achieved via pass-the-device on one iPad in v1; see Devices). Why this exact shape:
   - **Projective** — the truth comes out *sideways* through the animal; there is no self-report stage to perform on (fixes both Kaleb's terseness and Ella's freeze).
   - **Concrete, no worthy answer** to hunt for.
   - **The gap between the two animals is itself the mirror.**

3. **Reveal together — exactly one synthesized sentence; v1 carries no advice (deliberately, to learn).** Both answers shown side by side; the tool adds one reflected line naming the alignment, gap, or tension, then stops. Example: *"Kaleb drew a puppy that wanted to play. Dad drew a porcupine that needed space. You both wanted something real at the same second — they just pointed opposite ways."* v1 deliberately ships *without* advice — **this is a learning decision, not a product principle.** Advice *is* wanted (Scott explicitly rejected a no-advice rule); but if the pure mirror alone creates a real moment, advice could wreck it, and if it feels incomplete, *the specific way it feels incomplete* tells us which advice model fits. Advice is purely additive on top of the mirror, so deferring it locks in nothing.

4. **Deposit.** The exchange + the one line is saved as the first `MirrorEntry` on the `{Scott, Kaleb}` `Dyad`. v1 does nothing else with it.

**The AI call** is tightly constrained: input = both answers + dyad framing; output = ≤2 sentences naming alignment/gap/tension, no advice **in v1** (deferred per above, not forbidden). Low surface, cheap to get right.

## Out of Scope for v1 (scope fence)

- No "us" manual surfaced — deposits accrue silently, nothing reads them. (Layer 2.)
- No Repair framing, no rupture detection — bare Mirror on any night. (Layer 2.)
- No Catch / in-the-moment signal / shared language. (Layer 3.)
- No `NightPlan` orchestrator UI — shape exists; v1 only "pick the pairing" on entry.
- No two-device parallel mode — v1 is single-iPad pass-the-device only; parallel is designed-for, not built.
- No triad/all-together UI — model allows 3+; v1 writes only 2-person dyads.
- One prompt only (the animal). No rotation/library.
- Existing 3-card check-in stays untouched — Mirror is additive; exact placement is an implementation-plan decision.
- **No advice in v1 — deferred to learn from the real test, NOT forbidden.** Advice is wanted; its model (to-the-adult / on-demand / shared-moment / full-coach) is decided after observing v1 with Kaleb.
- No streaks, reminders, or cadence pressure — consistent with the rest of the app.

## Success Criteria

v1 succeeds if, used with Kaleb at bedtime, the pass-the-device animal prompt + one mirror line produces a moment that *feels real to Scott* — i.e., Kaleb engages without performing and Scott sees Kaleb's chair. Depth, length, and coverage are explicitly **not** success metrics. The test is qualitative and fast: try it, observe, iterate on the single core. A key thing v1 is designed to *learn*: whether the pure mirror is enough, or what kind of advice the moment is missing.

## Open Questions for Implementation Plan

- Exact placement/route of the Mirror moment relative to the existing `/check-in/[personId]` flow.
- Which existing Cloud Function pattern the constrained synthesis call should follow.
- Firestore collection naming/security-rule shape for `Dyad` / `MirrorEntry`.
- Entry-screen pairing picker UX (minimal, but must make Iris↔Ella a co-equal first-class choice).
- Pass-the-device hand-off UX on one iPad (how the screen flips/locks so the first answer stays hidden).
