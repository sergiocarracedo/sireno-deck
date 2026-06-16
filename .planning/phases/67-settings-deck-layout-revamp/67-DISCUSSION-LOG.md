---
phase: 67
slug: settings-deck-layout-revamp
areas_discussed:
  - n-1 conflict (logo+version vs percent)
  - iconTextSurface resolution
  - keyCount-aware layout
created: 2026-06-15
---

# Phase 67: Settings Deck Layout Revamp - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `67-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-06-15
**Phase:** 67-settings-deck-layout-revamp
**Areas discussed:** n-1 conflict, iconTextSurface, keyCount-aware layout
**Mode:** standard (config.workflow.discuss_mode = "discuss")

---

## Area 1: n-1 Conflict (logo+version vs percent)

| Option | Description | Selected |
|--------|-------------|----------|
| Drop logo+version | SETTINGS-05 wins; SETTINGS-06 dropped/redefined. 3 buttons at n-3/n-2/n-1. | |
| Position 0 for logo+version | 4 buttons: pos 0 = logo+version, n-3 = darker, n-2 = brighter, n-1 = percent. SETTINGS-06 rephrased as "first button". | |
| 5+ button deck | 5+ buttons with logo+version at pos 0, n-3/n-2/n-1 for brightness cluster. | |

**User's choice:** "Not sure if I understand the question, but this is what I want to achive: The logo + version button must be created as internal builtin button and used in the settings deck"
**Notes:** User confirmed the logo+version button must remain in the settings deck. Mapped to the "Position 0 for logo+version" option (D-02 in CONTEXT.md). Both buttons stay; position 0 holds the logo, n-1 holds the percent.

---

## Area 2: `iconTextSurface` resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Build it new | Build a new `IconTextSurface` primitive in `packages/cli/src/ui/surfaces/`. | |
| Misnamed ref to existing | Use one of the existing surfaces (`MainLabelSurface` / `BarsSurface` / `SplitActionSurface` / `IconLabelSurface`). | ✓ |
| Keep current pattern | Ignore the reference; keep hand-rolled `<Icon>` + `<Text>` JSX. | |

**User's choice:** "Misnamed ref to existing"
**Notes:** User confirmed the `iconTextSurface` reference is misnamed. Scouting resolved it to `IconLabelSurface` (already exists at `packages/cli/src/ui/surfaces/IconLabelSurface.tsx`). D-04, D-05 in CONTEXT.md.

---

## Area 3: keyCount-aware layout

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic n-aware | Use `createInternalDecks(keyCount)` for n-3/n-2/n-1. Supports 6/9/15/32 keys. | ✓ |
| Static n=15 | Static n=15 layout only. Positions 12/13/14 for brightness, pos 0 for logo. | |
| Dynamic + tests | Dynamic layout plus table-driven test matrix for each keyCount. | |

**User's choice:** "Dynamic n-aware (Recommended)"
**Notes:** User chose dynamic layout. D-03 in CONTEXT.md. The test matrix shape (which keyCount values to test against) was deferred to the agent.

---

## Agent's Discretion

- Test matrix scope (which `keyCount` values get coverage for the position-0/n-3/n-2/n-1 invariants). User said "dynamic", but did not specify whether all 6/9/15/32 are tested or just 15.
- Whether to touch the standalone `brightness` user-installable addon. Assumed no; the user described work as scoped to the internal-settings deck.

## Deferred Ideas

- Harmonizing the standalone `brightness` user-installable addon with the internal-settings brightness cluster (e.g., 10% steps matching, or a single source of truth for brightness control). Out of scope for Phase 67; could be a future phase.
- Replacing the text-only "sireno" + "v1" render in `logo_version` with an actual logo image asset. The user chose to keep it text-only for this phase (D-07).

---
*Phase: 67-settings-deck-layout-revamp*
*Discussion log generated: 2026-06-15*
