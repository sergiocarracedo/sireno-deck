---
phase: 5
slug: addon-system
areas_discussed:
  - Addon Authoring Surface
  - Live Update Contract
  - Shared Visual Primitives
  - Theme Typography Contract
  - New Built-in Date/Time Buttons
  - Render Surface Evolution
created: 2026-05-14
---

# Phase 5: Addon System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 5-addon-system
**Areas discussed:** Addon Authoring Surface, Live Update Contract, Shared Visual Primitives, Theme Typography Contract, New Built-in Date/Time Buttons, Render Surface Evolution

---

## Addon Authoring Surface

| Option | Description | Selected |
|--------|-------------|----------|
| JSX + helpers | Add JSX typings for deck-button/deck-text/deck-surface while keeping helper functions available | ✓ |
| Helpers only | Keep addon authors on createElement/helper calls only | |
| Helpers only in v1, JSX later | Delay JSX support to reduce immediate scope | |

**User's choice:** `JSX + helpers (Recommended)`
**Notes:** The runtime should remain the same custom reconciler; the change is authoring ergonomics and typing clarity.

---

## Live Update Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Default + override | Definitions set `defaultIntervalMs`; configs may override with `interval_ms` | ✓ |
| Definition default only | Live buttons always use addon-defined defaults | |
| Instance-driven invalidate only | Buttons self-manage timing and call `invalidate()` directly | |

**User's choice:** `Default + override (Recommended)`
**Notes:** This preserves the earlier architecture that core owns scheduling.

### Refresh Cadence

| Option | Description | Selected |
|--------|-------------|----------|
| Per-button sensible defaults | Digital/analog update around 1000ms; calendar updates much more slowly | ✓ |
| Uniform 500ms everywhere | Reuse the generic scheduler cadence for all date/time widgets | |
| Uniform 1000ms everywhere | Simpler default, but still too frequent for a calendar tear sheet | |

**User's choice:** `Per-button sensible defaults (Recommended)`
**Notes:** Avoid unnecessary writes for slower-changing visuals.

---

## Shared Visual Primitives

| Option | Description | Selected |
|--------|-------------|----------|
| Shared core render primitive | Reusable wrapper near render system | |
| Date-time addon local only | Wrapper exists only inside builtin date-time addon | |
| Mandatory wrapper for all buttons | Force all buttons through one shell | |

**User's choice:** Initially selected `Mandatory wrapper for all buttons`, then clarified to `Optional shared wrapper (Recommended)`.
**Notes:** This was the main contradiction resolved during discussion. The final decision is optional wrapper, because analog clock and other bespoke visuals should be free to bypass it.

### Text Helpers

| Option | Description | Selected |
|--------|-------------|----------|
| Shared helper contract | Explicit shared behavior like marquee and ellipsis | ✓ |
| Inline per-button logic | Each button decides overflow handling itself | |
| Ellipsis only | Skip marquee in the first cut | |

**User's choice:** `Shared helper contract (Recommended)`
**Notes:** The user explicitly wants to avoid overflow behavior emerging accidentally from rendering quirks.

---

## Theme Typography Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Single font_family token | One global font family in the theme | |
| Full typography tokens | Theme carries a richer typography contract | ✓ |
| Addon-local font config | Each addon controls fonts independently | |

**User's choice:** `Full typography tokens`
**Notes:** This goes beyond the narrower recommendation and should be preserved exactly for planning.

### Overflow Behavior Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit text behavior modes | Named behaviors like marquee and ellipsis | ✓ |
| Renderer auto-decides | The renderer chooses based on available space | |
| No shared behavior contract | Leave overflow undefined and test visually per button | |

**User's choice:** `Explicit text behavior modes (Recommended)`
**Notes:** Tests should assert declared behavior, not accidental clipping or overflow.

---

## New Built-in Date/Time Buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Separate button types | `date-time`, `analog-clock`, and `calendar-sheet` are separate types within one addon | ✓ |
| One type with big variant union | Extend `date-time` with more variants | |
| New addon per visual type | Split each visual into its own built-in addon | |

**User's choice:** `Separate button types (Recommended)`
**Notes:** Keeps schemas and render logic cleaner.

### Calendar Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Today-focused tear sheet | Emphasize current day/date readability on one key | ✓ |
| Mini month grid | Show a tiny whole-month calendar | |
| Configurable both ways | Support multiple calendar layouts immediately | |

**User's choice:** `Today-focused tear sheet (Recommended)`
**Notes:** Chosen for readability on actual Stream Deck hardware.

---

## Render Surface Evolution

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal surface expansion | Keep deck-button/deck-text/deck-surface and extend only if needed | ✓ |
| Broader custom render API now | Introduce a richer render surface upfront | |
| Date-time addon local hacks | Special-case the new visuals in addon-local code | |

**User's choice:** `Minimal surface expansion (Recommended)`
**Notes:** Preserve addon API stability unless a real renderer limit appears.

---

## Agent's Discretion

- Exact naming of typography tokens may be decided during planning.
- Exact API shape of the optional wrapper component may be decided during planning.
- Exact slow-refresh cadence for `calendar-sheet` may be decided during planning, as long as it reflects day/date semantics.

## Deferred Ideas

- None explicitly deferred, but planning should call out if the requested typography expansion turns into a broader design-system initiative beyond the immediate addon/rendering work.

---

*Phase: 05-addon-system*
*Discussion log generated: 2026-05-14*
