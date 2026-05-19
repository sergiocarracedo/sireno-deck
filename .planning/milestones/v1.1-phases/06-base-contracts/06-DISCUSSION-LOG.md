# Phase 6 Discussion Log

**Date:** 2026-05-14
**Phase:** 6 - Base Contracts
**Mode:** standard

## Areas Selected

- JSX typing surface
- Refresh override contract

## Areas Not Selected

- Date-time config shape

## Discussion Record

### JSX typing surface

#### Decision point: How addon authors opt into typed custom JSX elements
- Options considered:
  - Explicit addon opt-in (recommended)
  - Global repo-wide JSX types
  - No JSX support yet
- User choice: `Explicit addon opt-in (Recommended)`
- Rationale captured: Keep typing local to addon authoring and avoid polluting JSX globally across the repo.

#### Decision point: How opt-in is delivered
- Options considered:
  - Dedicated exported types entrypoint (recommended)
  - Augment from main addon API entry
  - Example-only local declarations
- User choice: `Dedicated exported types entrypoint (Recommended)`
- Rationale captured: Keep runtime API separate from TypeScript-only authoring concerns and make the setup easy to document.

#### Decision point: How wide the JSX surface should be in Phase 6
- Options considered:
  - Only current elements and props (recommended)
  - Current elements plus reserved future props
  - Custom wrapper component API instead
- User choice: `Only current elements and props (Recommended)`
- Rationale captured: Keep Phase 6 focused on ergonomics and avoid locking future renderer API decisions early.

#### Decision point: Who the JSX entrypoint should optimize for first
- Options considered:
  - Both built-in and external addons (recommended)
  - External addons first
  - Built-in addons first
- User choice: `Both built-in and external addons (Recommended)`
- Rationale captured: Use one authoring contract and avoid separate first-party and third-party patterns.

### Refresh override contract

#### Decision point: Which cadence wins when both config and definition provide one
- Options considered:
  - `interval_ms` overrides `defaultIntervalMs` (recommended)
  - `defaultIntervalMs` always wins
  - Per-button opt-in flag required
- User choice: `interval_ms overrides defaultIntervalMs (Recommended)`
- Rationale captured: Match the milestone intent and keep scheduler ownership centralized in core.

#### Decision point: Which buttons may use `interval_ms`
- Options considered:
  - Only buttons with a default poll contract (recommended)
  - Any button may opt in via `interval_ms`
  - Whitelist specific built-in buttons only
- User choice: `Any button may opt in via interval_ms`
- Rationale captured: Treat `interval_ms` as a real runtime contract instead of a special-case override for only some live buttons.

#### Decision point: How to handle invalid or aggressive interval values
- Options considered:
  - Validate with a minimum floor (recommended)
  - Accept any positive number
  - Clamp silently at runtime
- User choice: `Validate with a minimum floor (Recommended)`
- Rationale captured: Keep runtime behavior predictable and fail invalid config explicitly.

#### Decision point: What minimum floor to use
- Initial options considered:
  - `250ms` (recommended)
  - `500ms`
  - `1000ms`
- Initial user choice: `500ms`
- Follow-up raised by user: `i want to check the min interval_ms to 100ms`
- Codebase evidence checked:
  - `packages/cli/src/render/scheduler.ts` uses default `75ms` jitter and computes delay as `intervalMs + baseOffset + jitter`
  - With `100ms`, effective scheduling for the first task can dip to `25ms`
  - Polling re-arms after each run completes, so small intervals amplify render/device churn
- Final options considered after code review:
  - Keep `500ms` (recommended)
  - Use `100ms` and change scheduler too
  - Use `250ms` and revisit later
- Final user choice: `Keep 500ms (Recommended)`
- Final rationale captured: The current scheduler shape makes `100ms` misleadingly aggressive unless Phase 6 also redesigns jitter behavior.

## Agent's Discretion

- Exact package/export naming for the dedicated JSX types entrypoint
- Exact schema location and error wording for `interval_ms` minimum validation

## Deferred Ideas

- Future text-behavior or wrapper props on custom render elements belong to Phase 7.
- Supporting sub-500ms polling safely would require scheduler work and is deferred beyond Phase 6.

---

This file is an audit trail for the discussion session. Downstream planning should use `06-CONTEXT.md` as the canonical decision source.
