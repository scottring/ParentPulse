# Relish Launch Sprint: Feb 1-15, 2026
## 2-Week Implementation Plan

---

## ⚠️ Reality Check

**Timeline:** Jan 25 → Feb 15 = **21 days**
**Scope:** Must be ruthlessly minimal

**What We CAN Ship:**
✅ 6-layer framework (backend structure)
✅ Spider diagram visualization
✅ Basic goal creation (manual, not AI-generated)
✅ Extended manual types (child + marriage + family)
✅ Workbook integration showing journey
✅ Weekly spider assessments

**What We CANNOT Ship:**
❌ AI-generated goal breakdown (takes 1+ week)
❌ Agentic conversational agents (V2 feature)
❌ Gap detection system (V2 feature)
❌ System generation (chip economy, etc.) (V2 feature)
❌ Fully automated quarterly/monthly progression (V2 feature)

---

## Week 1: Data Foundation (Jan 25-31)

### Day 1-2: Extend Data Models
**Files to Modify:**
- `/src/types/person-manual.ts`
- `/src/types/goal-hierarchy.ts` (NEW)
- `/src/types/parent-workbook.ts`

**Tasks:**
- [x] Add `layerId` to Trigger, Strategy, Boundary
- [x] Add `manualType` field to PersonManual
- [x] Create GoalVolume, QuarterlyMilestone, MonthlyFocus types
- [x] Create SpiderAssessment type
- [x] Create LayerAssessment type

**Acceptance Criteria:**
- TypeScript compiles without errors
- All existing code still works

---

### Day 3-4: Firestore Schema & Hooks

**New Collections:**
```
/goal_volumes/{volumeId}
/quarterly_milestones/{milestoneId}
/monthly_focuses/{focusId}
/spider_assessments/{assessmentId}
```

**New Hooks:**
- `/src/hooks/useGoalVolume.ts`
- `/src/hooks/useQuarterlyMilestone.ts`
- `/src/hooks/useMonthlyFocus.ts`
- `/src/hooks/useSpiderAssessment.ts`

**Tasks:**
- [x] Create Firestore collections
- [x] Write security rules
- [x] Implement CRUD hooks
- [x] Test with sample data

**Acceptance Criteria:**
- Can create/read/update goal volumes
- Security rules enforced
- Hooks work in React components

---

### Day 5-7: Spider Diagram Component

**Files to Create:**
- `/src/components/visualizations/SpiderDiagram.tsx`
- `/src/components/visualizations/LayerProgressBar.tsx`
- `/src/components/visualizations/ProgressTimeline.tsx`

**Dependencies:**
```bash
npm install recharts
```

**Tasks:**
- [x] Build SpiderDiagram with recharts
- [x] Show baseline, current, target overlays
- [x] Layer detail cards below chart
- [x] Responsive design
- [x] Print-friendly version

**Acceptance Criteria:**
- Spider diagram renders correctly
- Shows 6 layers with scores
- Interactive (click layer for details)
- Beautiful, on-brand design

---

## Week 2: Integration & Polish (Feb 1-7)

### Day 8-10: Goal Creation Wizard (Manual)

**Files to Create:**
- `/src/components/goals/GoalVolumeWizard.tsx`
- `/src/components/goals/LayerAssessmentStep.tsx`
- `/src/components/goals/QuarterBreakdownStep.tsx`

**User Flow:**
1. "What's your main goal with [child] this year?"
2. Rate current state (6 layers, 1-10)
3. Set targets (6 layers, 1-10)
4. **MANUAL:** User writes 4 quarterly focuses (not AI-generated)
5. Review & create

**Tasks:**
- [x] Multi-step wizard UI
- [x] Layer assessment sliders
- [x] Manual quarterly input
- [x] Save to Firestore
- [x] Generate first month focus

**Acceptance Criteria:**
- User can create goal in <5 minutes
- Beautiful, Typeform-style UI
- Data saves correctly
- Links to manual

---

### Day 11-12: Workbook Integration

**Files to Modify:**
- `/src/components/workbook/WorkbookJourneySection.tsx` (NEW)
- `/src/components/parent-workbook/ParentWorkbookView.tsx`
- `/src/types/parent-workbook.ts`

**Add to ParentWorkbook:**
```typescript
interface ParentWorkbook {
  // ... existing fields
  monthlyFocusId?: string; // Link to current focus
  weeklyAssessment?: SpiderAssessment; // Weekly 6-layer check-in
}
```

**Tasks:**
- [x] Add journey context to workbook header
- [x] Show: Year Goal → Quarter → Month → Week
- [x] Weekly spider assessment at end of workbook
- [x] Progress visualization

**Acceptance Criteria:**
- Workbook shows goal context
- User sees where they are in journey
- Weekly assessment captures 6-layer scores
- Beautiful design

---

### Day 13-14: Manual Type Extensions

**Priorities:**
1. **Child manuals** (already exist, just add manualType)
2. **Marriage manuals** (new)
3. **Family manuals** (new)

**Files to Create:**
- `/src/components/manual/MarriageManualView.tsx`
- `/src/components/manual/FamilyManualView.tsx`
- `/src/pages/marriage/create.tsx`
- `/src/pages/family/create.tsx`

**Simplified Approach:**
- Reuse PersonManual structure
- Just change labels and context
- Marriage: "Our triggers", "What works for us"
- Family: "Household triggers", "Family systems"

**Tasks:**
- [x] Add manualType selector on create
- [x] Marriage manual onboarding (simplified)
- [x] Family manual onboarding (simplified)
- [x] Separate views with appropriate language

**Acceptance Criteria:**
- Can create child, marriage, family manuals
- Each has appropriate language
- Share same underlying structure
- All link to goal system

---

## Launch Day Readiness (Feb 8-15)

### Final Week: Bug Fixes & Polish

**Day 15-17: Testing**
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Mobile responsiveness

**Day 18-19: Documentation**
- [ ] User guide
- [ ] Help content
- [ ] Tooltips and hints

**Day 20-21: Launch Prep**
- [ ] Deploy to production
- [ ] Monitor errors
- [ ] User feedback system

---

## MVP Feature Set (Feb 1-15 Launch)

### ✅ What Ships

**Core Features:**
1. **6-Layer Manual Structure**
   - Triggers, strategies, boundaries tagged with layers
   - Child, Marriage, Family manual types
   - Beautiful manual views

2. **Goal System (Manual Creation)**
   - Create year goals with 6-layer baseline
   - User manually writes 4 quarterly focuses
   - System tracks monthly focuses (user-written)
   - Links to weekly workbooks

3. **Spider Diagram Visualization**
   - Weekly assessment (6 layers, 1-10 scale)
   - Beautiful radar chart
   - Baseline vs current vs target
   - Historical timeline

4. **Workbook Integration**
   - Journey context (Year → Quarter → Month → Week)
   - Weekly spider assessment
   - Progress tracking
   - Repair prompts

5. **Manual Types**
   - Child manuals ✅
   - Marriage manuals ✅
   - Family manuals ✅

### ❌ What's V2 (Post-Launch)

**Deferred to March-April:**
1. **AI-Generated Goal Breakdown**
   - AI analyzes manual and suggests quarterly focuses
   - AI generates monthly themes
   - Cloud Function integration

2. **Agentic System Generation**
   - Conversational chip system design
   - Checklist generation
   - Routine builder
   - CopilotKit integration

3. **Gap Detection & Active Filling**
   - AI identifies missing content
   - Targeted question prompts
   - Progressive manual building

4. **System Monitoring**
   - Effectiveness tracking
   - Proactive adjustments
   - Pattern detection

---

## Technical Decisions for Launch

### 1. AI Architecture: **Custom Anthropic SDK**
**Why:** Fastest for 2-week sprint
**What:** Template-based, manual inputs
**V2:** Add CopilotKit (self-hosted, free) for agents

### 2. Goal Breakdown: **Manual, Not AI**
**Why:** AI goal generation takes 1+ week to build/test
**What:** User writes quarterly focuses themselves
**V2:** AI suggests and generates breakdown

### 3. Spider Assessment: **Required Weekly**
**Why:** Core value prop, drives engagement
**What:** 6 quick sliders (2 minutes)
**Where:** End of weekly reflection

### 4. Manual Types: **All Three**
**Why:** Your priorities (parenting + spouse + family)
**What:** Shared structure, different labels
**How:** manualType field + conditional rendering

### 5. Workbook Generation: **Use Existing System**
**Why:** Already works, don't break it
**What:** Add journey context, spider assessment
**Enhancement:** Link to monthly focus

---

## Day-by-Day Checklist

### Week 1: Foundation

**Saturday, Jan 25**
- [ ] Extend PersonManual type (layerId fields)
- [ ] Create goal-hierarchy.ts types
- [ ] Add manualType field

**Sunday, Jan 26**
- [ ] Create Firestore collections
- [ ] Write security rules
- [ ] Test with Firebase emulator

**Monday, Jan 27**
- [ ] useGoalVolume hook
- [ ] useSpiderAssessment hook
- [ ] Test CRUD operations

**Tuesday, Jan 28**
- [ ] Install recharts
- [ ] Build SpiderDiagram component
- [ ] Layer detail cards

**Wednesday, Jan 29**
- [ ] Spider diagram polish
- [ ] Responsive design
- [ ] Print styles

**Thursday, Jan 30**
- [ ] SpiderDiagram integration test
- [ ] Sample data creation
- [ ] Visual QA

**Friday, Jan 31**
- [ ] Week 1 review
- [ ] Bug fixes
- [ ] Prep for Week 2

### Week 2: Integration

**Saturday, Feb 1**
- [ ] GoalVolumeWizard step 1 (goal input)
- [ ] GoalVolumeWizard step 2 (baseline assessment)
- [ ] Beautiful Typeform-style UI

**Sunday, Feb 2**
- [ ] GoalVolumeWizard step 3 (targets)
- [ ] GoalVolumeWizard step 4 (quarterly manual input)
- [ ] Save flow

**Monday, Feb 3**
- [ ] WorkbookJourneySection component
- [ ] Add to ParentWorkbookView
- [ ] Journey context display

**Tuesday, Feb 4**
- [ ] Weekly spider assessment in workbook
- [ ] Assessment submission flow
- [ ] Progress visualization

**Wednesday, Feb 5**
- [ ] Marriage manual create flow
- [ ] Marriage manual view
- [ ] Label customization

**Thursday, Feb 6**
- [ ] Family manual create flow
- [ ] Family manual view
- [ ] Test all three types

**Friday, Feb 7**
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance check

### Week 3: Launch

**Saturday-Tuesday, Feb 8-11**
- [ ] Final testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Help content

**Wednesday-Friday, Feb 12-14**
- [ ] Deploy to production
- [ ] Monitor errors
- [ ] User testing
- [ ] Feedback collection

**Saturday, Feb 15**
- [ ] 🚀 LAUNCH!

---

## Success Metrics (Launch Week)

**User Engagement:**
- [ ] 50% of users create a goal
- [ ] 80% complete first weekly assessment
- [ ] 30% create marriage/family manual

**Technical:**
- [ ] <2 second page load
- [ ] 0 critical bugs
- [ ] 99% uptime

**Quality:**
- [ ] Spider diagram renders on all devices
- [ ] Journey context shows correctly
- [ ] All manual types work

---

## Risk Mitigation

### Risk 1: Timeline Slip
**Mitigation:** Cut family manual if needed (keep child + marriage)

### Risk 2: Spider Diagram Complexity
**Mitigation:** Use recharts (proven library), start simple

### Risk 3: Data Migration
**Mitigation:** New fields optional, backwards compatible

### Risk 4: User Confusion (Manual Goal Input)
**Mitigation:** Clear instructions, tooltips, examples

---

## Post-Launch Roadmap (V2)

### March 2026: AI Intelligence
- AI-generated goal breakdown
- Cloud Function: generateGoalVolume
- Automatic quarterly/monthly progression

### April 2026: Agentic Features
- CopilotKit integration (self-hosted, free)
- Chip system generator
- Checklist builder
- Gap detection

### May 2026: Monitoring & Optimization
- System effectiveness tracking
- Proactive suggestions
- Pattern analysis

---

## Communication Plan

### User Education (Launch Week)
1. **Onboarding tour** - Show new features
2. **Help docs** - Explain 6-layer framework
3. **Video walkthrough** - Goal creation wizard
4. **Email campaign** - Highlight spider diagram

### Feedback Collection
- In-app feedback widget
- Weekly check-in emails
- User interviews (5-10 users)

---

## Questions Before We Start

1. **Existing users:** Do you have active users? Need migration plan?
2. **Testing:** Can you do daily testing/feedback?
3. **Design assets:** Need watercolor images for manuals?
4. **Help content:** Who writes user documentation?
5. **Monitoring:** Sentry or similar for error tracking?

---

## Let's Build! 🚀

**First Step:** I'll create the extended data models.

Want me to start with:
1. Data model extensions (types)
2. Firestore schema setup
3. Spider diagram component

Your call!
