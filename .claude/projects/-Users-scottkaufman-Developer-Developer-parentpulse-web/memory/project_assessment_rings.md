---
name: Three-Ring Assessment Model
description: Core assessment architecture — 3 concentric rings aggregating 20 dimensions across self/spousal/parental domains with multi-perspective weighting, Assess→Understand→Evolve loop, GPS interruption model, 1970s dashboard UI
type: project
---

## Three-Ring Assessment Model

The app's core visualization and scoring engine is a concentric ring model:

**Ring 3 (outer) — 20 Dimension Scores:**
- 5 self dimensions (emotional regulation, self-care/burnout, personal growth, stress management, self-awareness) — TO BE BUILT
- 10 couple dimensions (existing in relationship-dimensions.ts)
- 5 parent-child dimensions (existing in relationship-dimensions.ts)
- Each dimension scored from multiple perspectives with weights (e.g., 40% self / 40% spouse / 20% kids)

**Ring 2 (middle) — 3 Domain Scores:**
- Self = avg of 5 self dimensions
- Spousal = avg of 10 couple dimensions
- Parental = avg of 5 parent-child dimensions

**Ring 1 (center) — Overall Health:**
- Default: ⅓ Self + ⅓ Spousal + ⅓ Parental
- Rendered as color gradient (red → green)
- Domain weights customizable in settings

## Core Loop: Assess → Understand → Evolve

3 phases map to 3 rings:
- **Assess** = Ring 3 — multi-perspective data collection across 20 dimensions
- **Understand** = Ring 2 — AI synthesis into 3 domain health scores
- **Evolve** = Ring 1 — trajectory over time, color shifting, forward movement

Actions (micro-practices, conversation starters, growth arcs) are the mechanism INSIDE Evolve, not a separate phase. App surfaces 1-2 actions at a time, not a menu of 20.

## GPS Model for Interruptions

- App maintains an "active trajectory" (current growth direction)
- Users can inject acute events ("we just had a fight") via free text
- AI maps event to dimensions, decides: urgent pivot, reinforcement, or background absorption
- Immediate action surfaced if needed, but overall trajectory preserved or consciously redirected

## UI Direction: 1970s Dashboard

- Retro analog instrument cluster aesthetic with modern precision
- Concentric ring diagram is the centerpiece (like a tachometer)
- Supporting gauges/indicators around it: trajectory compass, event log (odometer-style), action card (route instruction panel), perspective status (indicator lights for family member contributions)
- Warm amber/green glows, chunky bezels — human and felt, not cold data dashboard

**Why:** This gives users a single glanceable health indicator that drills down into meaningful categories, each backed by research-grounded dimensions scored from multiple family perspectives. The 3-phase loop ensures users always feel forward movement, not just measurement.

**How to apply:** All scoring, visualization, and growth arc targeting should reference this model. The signed-in user is always at the center. Perspective weighting happens at Ring 3; aggregation flows upward. Weight customization lives in settings.
