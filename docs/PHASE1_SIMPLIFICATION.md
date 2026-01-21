# Phase 1 Simplification - Progress Report

## What We Decided

After discussion, we agreed on **Phase 1: Simple Person Manuals** architecture:

```
Dashboard → Person Manual (e.g., "Ella's Manual") → Content (direct)
```

**Key Principle:** All content lives directly in the person's manual. No role sections, no relationship manuals for MVP.

## Completed Tasks ✅

### 1. Fixed Dashboard 404 Error
- **Issue:** Dashboard was linking to `/children/[childId]/manual` (doesn't exist)
- **Solution:** Updated dashboard to use `/people/[personId]/manual` with `usePerson` hook
- **File:** [/src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)

### 2. Updated Type Definitions
- **File:** [/src/types/person-manual.ts](src/types/person-manual.ts)
- **Changes:**
  - Simplified `PersonManual` interface to include content directly
  - Added new content types: `ManualTrigger`, `ManualStrategy`, `ManualBoundary`, `ManualPattern`, `ManualProgressNote`
  - Removed dependency on role sections for content storage
  - Added `coreInfo` object for sensory needs, interests, strengths, notes

### 3. Created Comprehensive Tests
- **File:** [/__tests__/types/person-manual.test.ts](__tests__/types/person-manual.test.ts)
- **Coverage:** 14 passing tests covering all new type definitions
- **Result:** All tests pass ✅

### 4. Updated Person Manual Page ✅
- **File:** [/src/app/people/[personId]/manual/page.tsx](src/app/people/[personId]/manual/page.tsx)
- **Changes:**
  - Complete rewrite for Phase 1 simplified architecture
  - Removed all role section and relationship manual dependencies
  - Created tabbed interface: Overview, Triggers, Strategies, Boundaries, Patterns
  - Added stat cards showing content counts
  - Proper empty states for each content type

### 5. Updated usePersonManual Hook ✅
- **File:** [/src/hooks/usePersonManual.ts](src/hooks/usePersonManual.ts)
- **Changes:**
  - Updated `createManual` to initialize simplified structure with empty content arrays
  - Added CRUD methods for all content types:
    - Triggers: `addTrigger`, `updateTrigger`, `deleteTrigger`, `confirmTrigger`
    - Strategies: `addStrategy`, `updateStrategy`, `deleteStrategy` (for both whatWorks/whatDoesntWork)
    - Boundaries: `addBoundary`, `updateBoundary`, `deleteBoundary`
    - Patterns: `addPattern`, `updatePattern`, `deletePattern`
    - Progress Notes: `addProgressNote`, `deleteProgressNote`
    - Core Info: `updateCoreInfo`
  - Removed role section tracking methods (incrementRoleSectionCount, etc.)
  - All operations update counters (totalTriggers, totalStrategies, totalBoundaries)

### 6. Simplified Onboarding Flow ✅
- **Files Updated:**
  - [/src/app/people/[personId]/create-manual/page.tsx](src/app/people/[personId]/create-manual/page.tsx)
  - [/src/app/people/[personId]/manual/onboard/page.tsx](src/app/people/[personId]/manual/onboard/page.tsx)
  - [/src/hooks/useSaveManualContent.ts](src/hooks/useSaveManualContent.ts)
- **Changes:**
  - **create-manual page:** Removed multi-step flow and sections preview, simplified to single-page relationship selection
  - **onboard page:** Removed role section fetching, saves directly to PersonManual via `manual.manualId`
  - **useSaveManualContent:** Updated to save directly to `person_manuals` collection instead of `role_sections`
  - Maps AI-generated content to PersonManual fields (coreInfo, triggers, whatWorks, whatDoesntWork, boundaries)
  - Updates all counters (totalTriggers, totalStrategies, totalBoundaries)

## Remaining Tasks 📋

### 7. Archive Legacy Systems
- **Relationship Manuals:**
  - `/src/app/relationships/*` routes
  - `/src/hooks/useRelationshipManual.ts`
- **Role Sections:**
  - `/src/app/people/[personId]/roles/[roleSectionId]/page.tsx`
  - `/src/hooks/useRoleSection.ts`
- **Children System:**
  - `/src/app/children/*` routes
  - `/src/hooks/useChildren.ts`

## Data Structure Changes

### Before (Complex):
```typescript
Person → PersonManual → RoleSection[] (subcollection) → Content
                      ↓
              RelationshipManual[]
```

### After Phase 1 (Simplified):
```typescript
Person → PersonManual (with content directly inside)
{
  manualId, personId, personName,
  coreInfo: { sensoryNeeds, interests, strengths, notes },
  triggers: ManualTrigger[],
  whatWorks: ManualStrategy[],
  whatDoesntWork: ManualStrategy[],
  boundaries: ManualBoundary[],
  ...
}
```

### Phase 2 (Future):
- Add `involvedPeople` array to triggers/strategies
- Create filtered views showing content by relationship
- Same data, multiple views

## Architecture Benefits

### Phase 1 Wins:
1. ✅ Simpler mental model - content lives in one place
2. ✅ Easier to implement - no complex relationships
3. ✅ Faster development - fewer moving parts
4. ✅ Clear foundation for Phase 2 enhancements

### Phase 2 Possibilities:
1. 🔮 Filter views by relationship ("Show me Scott-Ella content")
2. 🔮 @mention tagging for automatic cross-referencing
3. 🔮 Smart suggestions based on patterns
4. 🔮 Collaborative editing with conflict resolution

## Next Steps

To continue implementation:

1. **Simplify Manual Page** - Remove role sections, display content directly
2. **Update usePersonManual Hook** - Add content management methods
3. **Simplify Onboarding** - Direct content creation without roles
4. **Archive Legacy Code** - Move old systems to /archive or delete

## Testing Strategy

- ✅ Unit tests for types (completed)
- 🔲 Integration tests for manual CRUD operations
- 🔲 E2E tests for onboarding flow
- 🔲 E2E tests for manual viewing/editing

## Files to Review

**Core Types:**
- `/src/types/person-manual.ts` - Updated ✅

**Pages:**
- `/src/app/dashboard/page.tsx` - Updated ✅
- `/src/app/people/[personId]/manual/page.tsx` - Needs simplification
- `/src/app/people/[personId]/create-manual/page.tsx` - Needs review
- `/src/app/people/[personId]/manual/onboard/page.tsx` - Needs simplification

**Hooks:**
- `/src/hooks/usePerson.ts` - OK
- `/src/hooks/usePersonManual.ts` - Needs update
- `/src/hooks/useManualOnboarding.ts` - Needs simplification

**To Archive/Remove:**
- `/src/app/relationships/**/*`
- `/src/app/people/[personId]/roles/**/*`
- `/src/hooks/useRelationshipManual.ts`
- `/src/hooks/useRoleSection.ts`
- Most of `/src/app/children/**/*`
