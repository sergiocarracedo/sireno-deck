# Phase 66 Discussion Log

## 2026-06-14 — discuss-phase

### Problem Statement
Phase 62 identified that three system-button implementations (SystemBackButton, SystemBackWithPendingOverlayButton, SystemSettingsEntryButton badge) each repeat similar dual-action patterns with bespoke layouts. The old approach (Phase 62) proposed `DynamicActionsButton` as a helper; the phase 66 discussion reframed this as a surface-level component.

### Discussion Flow

1. **Original proposal review**: Read the discuss-phase workbook, loaded ROADMAP/STATE/PROJECT.md. Phase 66 was labeled "DynamicActionsButton" from the Phase 62 kickoff.

2. **Codebase scouting**: Deep analysis of all three system buttons, the dispatcher (`system-buttons.ts`), runtime wiring, ButtonSurface, existing surfaces, and gesture handling. No existing diagonal/split/dual-surface patterns found.

3. **Gray areas identified** (8 questions):
   - Component location: system-buttons vs. ui/surfaces
   - API shape: children-based vs. props-based
   - Mode 1 (single surface) dbl-tap behavior
   - Diagonal orientation (`/` vs `\`)
   - Diagonal depth (how much of the diagonal)
   - Scaling approach (fixed vs responsive)
   - Which components to replace
   - Naming

4. **User decisions captured** (see CONTEXT.md for full details):
   - **Location**: `src/ui/surfaces/` — a surface component, not a system-button helper
   - **API**: Props-based with `primary` and `secondary` props
   - **Mode 1 dbl-tap**: No-op
   - **Diagonal**: `/`-style, 25% depth, centered
   - **Scaling**: CSS `transform`, original surfaces unaffected
   - **Replaces**: All three (SystemBackButton, SystemBackWithPendingOverlayButton, SystemSettingsEntryButton badge)
   - **Name**: `SplitActionSurface`

5. **Requirements**: User left requirement formalization to me (the planner). Will include in CONTEXT.md for PLAN.md consumption.

### Key Insight
Moving from "helper" to "surface" was the architectural pivot. A helper in `system-buttons/` would be tightly coupled to the system button pattern; a surface in `ui/surfaces/` is a composable primitive that any button (system or addon) can use. This is consistent with the existing surface pattern (MainLabelSurface, BarsSurface, etc.).
