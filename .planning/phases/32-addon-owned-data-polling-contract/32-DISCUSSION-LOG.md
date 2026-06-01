# Phase 32 Discussion Log

**Date:** 2026-06-01
**Mode:** standard
**Phase:** 32 - Addon-Owned Data Polling Contract

## Areas Discussed

User selected all proposed areas:
- `Ownership Boundary (Recommended)`
- `Polling Contract Shape`
- `Cross-Platform Adapter Placement`
- `Migration Strategy`

## Options Considered And Choices

### Ownership Boundary

#### Core runtime responsibility
- Considered: `Core is capability-agnostic`
- Considered: `Core keeps shared domain facades`
- Considered: `Hybrid transition boundary`
- User choice: `Core is capability-agnostic (Recommended)`
- Rationale: keep core focused on runtime/scheduling/render transport seams and prevent capability domain creep.

#### Domain type ownership
- Considered: `Addon-owned types`
- Considered: `Core-exported domain types`
- Considered: `Dual types with adapters`
- User choice: `Addon-owned types (Recommended)`
- Rationale: capability-specific data models should ship with the owning addon/domain, not as core API surface.

### Polling Contract Shape

#### Interval model
- Considered: `Split intervals`
- Considered: `Single interval only`
- Considered: `Addon-managed timers`
- User choice: `Split intervals (Recommended)`
- Rationale: data polling and render cadence should be separable to avoid over-polling and preserve explicit runtime scheduling behavior.

#### Config ownership for intervals
- Considered: `Addon schema owns it`
- Considered: `Core global interval contract`
- Considered: `Mixed ownership`
- User choice: `Addon schema owns it (Recommended)`
- Rationale: keep interval field semantics and defaults capability-local while core consumes resolved numeric schedules.

#### Data handoff model
- Considered: `Callback payload in render props`
- Considered: `Addon store only`
- Considered: `Render calls fetch directly`
- User choice: `Callback payload in render props (Recommended)`
- Rationale: matches desired callback -> typed payload -> render props flow and keeps render deterministic.

### Cross-Platform Adapter Placement

#### Adapter location
- Considered: `Inside addon domains`
- Considered: `Keep adapters in core /system`
- Considered: `New shared non-core platform package`
- User choice: `Inside addon domains (Recommended)`
- Rationale: OS adapters are capability-specific and should move with their owning addon domain.

### Migration Strategy

#### Rollout model
- Considered: `Bridge then remove`
- Considered: `Big-bang move`
- Considered: `Core facades forever`
- User choice: `Big-bang move`
- Rationale: user explicitly wants direct ownership realignment instead of prolonged compatibility facades.

## User-Supplied Direction Captured

- User identified architecture drift where capability-specific concerns moved into core system modules (`system-status`, `media-controller`, `linux-media-controller`, `macos-media-controller`, `live-metrics`, etc.).
- User wants addon-specific polling/command/data schemas to be addon-owned.
- User expects core to schedule callback execution and rendering transport, not own capability domains.
- User described desired runtime flow: interval triggers callback -> callback returns typed data -> core passes data into render props -> button rerenders -> core publishes rendered frame.
- User raised render interval vs polling interval separation as a meaningful contract decision.

## Areas Delegated To Agent's Discretion

- Exact naming for callback hooks/payload props.
- Exact schema field names/defaults for split intervals.
- Exact folder/package layout for addon-local shared helpers.
- Exact migration mechanics under the chosen big-bang strategy.

## Deferred Ideas

- Additional capabilities beyond ownership refactor and polling contract redesign.

---
*Audit log only - downstream planning should read `32-CONTEXT.md` instead.*
