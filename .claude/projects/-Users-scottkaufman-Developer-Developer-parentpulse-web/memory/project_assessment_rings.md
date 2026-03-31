---
name: Three-Ring Assessment Model
description: Core assessment architecture — 3 concentric rings with 9 perspective zones (3 domains × 3 perspectives), 20 dimensions underneath, Assess→Understand→Evolve loop, GPS interruption model, 1970s landscape dashboard
type: project
---

## Three-Ring Assessment Model

The app's core visualization is a concentric ring model, oriented landscape:

**Outer Ring — 9 Perspective Zones (3 domains × 3 perspectives):**
- 3 major pie sections at 120° each: Self, Spousal, Parental
- Each domain subdivided by perspective: Self (~40%), Spouse (~40%), Kids (~20%)
- Each zone colored by that perspective's score for that domain
- Perspective gaps are visually obvious (green vs red in same domain = blind spot)
- 20 dimensions (5 self + 10 couple + 5 parent-child) drive the zone colors underneath but aren't individually visible

**Middle Ring — 3 Domain Scores:**
- Self = weighted avg of perspective zones (40% self + 40% spouse + 20% kids)
- Spousal = same weighting across perspectives
- Parental = same weighting across perspectives

**Center — Overall Health:**
- Stick figure representing the signed-in user
- Overall score number + color gradient (red → green)
- Trend indicator (improving/stable/declining/gathering)
- Default: ⅓ Self + ⅓ Spousal + ⅓ Parental (customizable in settings)

**Per-perspective scores:** Claude returns `{ blended, self, spouse, kids }` per dimension in `seedDimensionAssessments`. Stored as `perspectiveScores` on `DimensionAssessment` docs.

## Core Loop: Assess → Understand → Evolve

- **Assess** = Outer ring — multi-perspective data collection, each perspective scores independently
- **Understand** = Middle ring — AI synthesis into 3 weighted domain scores, perspective gaps surfaced
- **Evolve** = Center — trajectory over time, color shifting, forward movement

Actions (micro-practices, conversation starters, growth arcs) are the mechanism INSIDE Evolve. App surfaces 1-2 actions at a time.

## GPS Model for Interruptions

- App maintains an "active trajectory" (current growth direction)
- Users can inject acute events ("we just had a fight") via free text
- AI maps event to dimensions, decides: urgent pivot, reinforcement, or background absorption
- Cloud function: `processAcuteEvent`, collection: `acute_events`

## UI Direction: 1970s Landscape Dashboard

- Retro analog instrument cluster aesthetic with modern precision, landscape orientation
- Concentric ring diagram is the centerpiece
- Supporting instruments: TrajectoryCompass, ActionCard (1-2 items), PerspectiveStatusLights
- EventInjectionModal for GPS interruptions
- Dark background (#1a1a1a), warm amber/green glows, chunky bezels
- All components in `src/components/dashboard/`

**How to apply:** All scoring, visualization, and growth arc targeting reference this model. The signed-in user is always at the center. 20 dimensions are the scoring engine; 9 perspective zones are the display layer. Weight customization lives in settings.
