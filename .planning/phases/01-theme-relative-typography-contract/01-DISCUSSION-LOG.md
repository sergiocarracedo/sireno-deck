---
phase: 1
slug: theme-relative-typography-contract
areas_discussed:
  - Base-size ownership
  - Size scale shape
  - Theme UI boundary
  - Raw font-class migration
created: 2026-05-28
---

# Phase 1: Theme-Relative Typography Contract - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 01-theme-relative-typography-contract
**Areas discussed:** Base-size ownership, Size scale shape, Theme UI boundary, Raw font-class migration

---

## Base-size ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Role vars + Text scaling | `font-main` / `font-aux` / `font-mono` expose the typography role base, but shared `Text` size classes compute the final font-size from that base. | ✓ |
| Role classes own final size | Keep typography classes stamping the final font-size and try to layer relative sizing around them. | |
| Theme wrappers own size | Move final size behavior into theme UI wrappers. | |

**User's choice:** `Role vars + Text scaling (Recommended)`
**Notes:** The user agreed that shared `Text` should own final size semantics and the typography role classes should stop being the final sizing authority.

### Role Class Contract

| Option | Description | Selected |
|--------|-------------|----------|
| No direct font-size | Role classes set family, weight, tracking, and a role-base custom property only. | ✓ |
| Keep fallback font-size | Keep a direct role-class `font-size` fallback alongside the base variable. | |
| Split classes | Introduce separate role-family and role-size classes. | |

**User's choice:** `No direct font-size (Recommended)`
**Notes:** The user chose the clean cut rather than a compatibility half-step.

### Raw Caller Default

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate raw callers | Update affected callers to use `Text` or another explicit size path instead of preserving implicit typography defaults. | ✓ |
| Implicit inherited size | Let raw callers inherit whatever parent size exists after removing role-class `font-size`. | |
| Temporary compatibility fallback | Keep a temporary global fallback for raw typography callers. | |

**User's choice:** `Migrate raw callers (Recommended)`
**Notes:** The user preferred an honest migration over invisible fallback behavior.

---

## Size scale shape

| Option | Description | Selected |
|--------|-------------|----------|
| One shared proportional scale | Use one common multiplier ladder for all typography roles, with `md = 1.0`. | ✓ |
| Per-role scales | Give `main`, `aux`, and `mono` different multiplier ladders. | |
| Only near-base sizes | Keep all tokens but make the range very narrow. | |

**User's choice:** `One shared proportional scale (Recommended)`
**Notes:** The user wanted `size` to mean one thing regardless of typography role.

### Scale Intensity

| Option | Description | Selected |
|--------|-------------|----------|
| Moderate steps | Keep differences clearly visible but controlled across all three typography roles. | ✓ |
| Conservative steps | Stay very close to `md`. | |
| Bold steps | Make each size step more dramatic. | |

**User's choice:** `Moderate steps (Recommended)`
**Notes:** The user chose a useful but not aggressive ladder.

### Scale Configurability

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed core scale | Lock one shared multiplier ladder in core for Phase 1. | ✓ |
| Theme-configurable multipliers | Let themes tune the size ladder. | |
| Config-level overrides | Let user config override the ladder per project. | |

**User's choice:** `Fixed core scale (Recommended)`
**Notes:** The user kept Phase 1 narrow and did not want this to widen into a new theming/config surface.

---

## Theme UI boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Observe only | Themes receive `size` metadata but do not redefine the text-size contract. | ✓ |
| Decorate by size | Themes may branch wrapper-level visuals by `size` without changing size math. | |
| Theme-controlled sizing | Themes map `size` to their own final font-size behavior. | |

**User's choice:** `Observe only (Recommended)`
**Notes:** The user chose a strict core-owned contract for size semantics.

### Default Theme Text

| Option | Description | Selected |
|--------|-------------|----------|
| Expose metadata only | Add `size` metadata for observability/testing but keep font-size computation out of `ThemeText`. | ✓ |
| Ignore size entirely | Leave the default theme wrapper unchanged. | |
| Style by size | Make the default theme wrapper branch visually on `size`. | |

**User's choice:** `Expose metadata only (Recommended)`
**Notes:** The user wanted the default theme to stay honest and visible without becoming a second text-sizing engine.

### Theme Escape Hatch

| Option | Description | Selected |
|--------|-------------|----------|
| No escape hatch | Themes can choose bases, but cannot override shared size semantics in Phase 1. | ✓ |
| Unofficial escape hatch | Allow undocumented theme hacks around the contract. | |
| Supported theme override | Document a theme-level size-semantic override hook now. | |

**User's choice:** `No escape hatch (Recommended)`
**Notes:** The user chose to lock one honest contract rather than leaving ambiguity on day one.

---

## Raw font-class migration

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted migration | Only update raw callers that rely on old typography-class sizing. | |
| Sweep all raw callers | Normalize all raw `font-main` / `font-aux` / `font-mono` usage in Phase 1. | ✓ |
| No caller migration | Change the core contract and accept fallout in raw callers. | |

**User's choice:** `Sweep all raw callers`
**Notes:** The user chose a hard contract cut. I flagged that this increases scope churn, but it is coherent if kept mechanical and contract-driven.

### Migration Style

| Option | Description | Selected |
|--------|-------------|----------|
| Prefer Text for text nodes | Move real text content onto `Text` where practical; keep raw typography classes only for tightly owned non-`Text` markup. | ✓ |
| Add explicit size classes | Keep raw markup and pair it with explicit `text-*` classes everywhere. | |
| Case-by-case mix | Leave the migration style open per file. | |

**User's choice:** `Prefer Text for text nodes (Recommended)`
**Notes:** The user preferred consolidating text semantics on the shared component instead of duplicating text behavior around the repo.

### Migration Guardrails

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, make it explicit | Add tests/fixtures that prove implicit raw typography sizing is no longer the supported text path. | ✓ |
| Only indirect coverage | Rely on broader typography tests to catch regressions. | |
| No extra guardrails | Keep tests focused only on visible outcome. | |

**User's choice:** `Yes, make it explicit (Recommended)`
**Notes:** The user wanted the new contract intent to be visible in the regression layer, not just in code style.

---

## Agent's Discretion

- Exact multiplier values for the moderate shared size ladder.
- Exact CSS-variable names and class implementation used to publish role bases and apply shared size scaling.
- Exact sequencing of the raw-caller sweep as long as the final cut is real.
- Exact regression fixtures and assertions used to keep the old seam from creeping back.

## Deferred Ideas

- Theme-configurable size ladders.
- Theme-level overrides of shared `Text` size semantics.
- Rich formatting and live shrink-fit work from later phases.

---

*Phase: 01-theme-relative-typography-contract*
*Discussion log generated: 2026-05-28*
