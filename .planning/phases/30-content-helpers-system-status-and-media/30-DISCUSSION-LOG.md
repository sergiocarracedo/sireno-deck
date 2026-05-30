# Phase 30 Discussion Log

**Date:** 2026-05-30
**Mode:** standard
**Phase:** 30 - Content Helpers, System Status, and Media Player Addons

## Areas Discussed

The user selected all proposed gray areas:
- `Helper API shape (Recommended)`
- `System metrics contract`
- `Media player behavior`
- `Config flexibility boundaries`

## Options Considered And Choices

### Helper API Shape

#### Public surface
- Considered: `React components only`
- Considered: `Components plus data helpers`
- Considered: `Config-only helper registry`
- User choice: `React components only (Recommended)`
- Rationale: The repo already favors a component-first addon contract, so the new helper surface should deepen that direction instead of introducing a second helper or registry abstraction.

#### Label-value layout policy
- Considered: `Component auto-selects`
- Considered: `Explicit variant prop`
- Considered: `Both auto and override`
- User choice: `Component auto-selects (Recommended)`
- Rationale: The user wants distinct 1-line, 2-line, and 3-4-line presentations matching the mockups without forcing every caller to restate layout intent.

#### Formatting ownership
- Considered: `Caller formats values`
- Considered: `Helpers format everything`
- Considered: `Split by helper type`
- User choice: `Caller formats values (Recommended)`
- Rationale: The helper should stay mostly presentation-only. Numbro-backed formatting can exist in built-ins or callers without making the shared layout component own domain formatting policy.

### System Metrics Contract

#### Adapter contract
- Considered: `Canonical metric catalog`
- Considered: `Raw per-OS blobs`
- Considered: `Loose catalog with aliases`
- User choice: `Canonical metric catalog (Recommended)`
- Rationale: Cross-platform config validation and external-addon reuse need stable metric ids rather than OS-shaped blobs.

#### Built-in button model
- Considered: `Template-driven helpers`
- Considered: `Arbitrary render config DSL`
- Considered: `Fixed built-in presets`
- User choice: `Template-driven helpers (Recommended)`
- Rationale: The system-status addon should let users build custom buttons from bounded helper templates without turning this phase into a generic dashboard language.

#### Unavailable data behavior
- Considered: `Show unavailable in-place`
- Considered: `Hide unsupported rows`
- Considered: `Fail the whole button`
- User choice: `Show unavailable in-place (Recommended)`
- Rationale: The same config should remain honest and layout-stable across Linux, macOS, and Windows even when some metrics are unavailable.

### Media Player Behavior

#### Metadata contract
- Considered: `Status plus best-effort metadata`
- Considered: `All metadata required`
- Considered: `Status only`
- User choice: `Status plus best-effort metadata (Recommended)`
- Rationale: Playback status is the only field that must be universal. Title, artist, app name, and progress should degrade gracefully when adapters cannot supply them.

#### Tap and hold behavior
- Considered: `Tap toggles, hold configurable`
- Considered: `Tap toggles, hold next-track`
- Considered: `Both tap and hold configurable`
- User choice: `Tap toggles, hold configurable (Recommended)`
- Rationale: Tap-to-play/pause is a locked product behavior from the original request. Hold stays flexible without inventing extra hard-coded transport semantics.

#### Overflow policy
- Considered: `Use existing Text marquee`
- Considered: `Clip with ellipsis`
- Considered: `Custom media marquee`
- User choice: `Use existing Text marquee (Recommended)`
- Rationale: The repo already ships one shared marquee contract, so media text should reuse it instead of creating a second scrolling system.

### Config Flexibility Boundaries

#### Override scope
- Considered: `Metadata-only overrides`
- Considered: `Layout overrides too`
- Considered: `Minimal overrides only`
- User choice: `Metadata-only overrides (Recommended)`
- Rationale: The phase should expose meaningful per-button customization without widening into a generic layout authoring system.

## User-Supplied Direction Captured Verbatim

- The bars helper should support `1,2 or 3 bars`, and each bar should have `a title, color, value and max value`.
- The label/value helper should support `multiple lines (max 4)` and each line should have `an icon, label, value, value formater (use Numbro), units, color`.
- The system-status addon should expose system values such as `cpu usage, mem usage, swap usage, disk i/0, cpu freq, system load, uptime, fans speed, cpu max freq, cpu boots on off` and related host data.
- The system-status addon should let users create custom buttons with the helpers and `configure and execute an action on button tap or hold`.
- The media-player button should show playback state, title and artist, the playing app, and a completed-percent bar; `on tap we toggle between play and pause`.
- For Linux media control, the user suggested `playctrl` as the likely integration path to research.

## Areas Delegated To Agent's Discretion

- Exact helper file names, prop names, and export locations.
- Exact canonical metric ids inside the shared metric catalog.
- Exact unavailable-state copy and visual styling.
- Exact adapter implementation details and library choices for macOS and Windows.
- Exact config schema field names for helper-template buttons and formatter options.

## Deferred Ideas

- Generic config-authored layout composition for arbitrary dashboards.
- Deep layout overrides that let config reshape helper internals.
- Additional hard-coded media transport behaviors beyond play/pause tap and optional hold action.

---
*Audit log only - downstream planning should read `30-CONTEXT.md` instead.*
