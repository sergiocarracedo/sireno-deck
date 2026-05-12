# Phase 2 Discussion Log

**Date:** 2026-05-12
**Mode:** standard
**Phase:** 2 — Device + Rendering

## Area: Device Selection

### Decision Point: Default device choice
- Option A: Auto-pick one device when exactly one is connected. Recommended because it keeps the common case frictionless.
- Option B: Always require an explicit selector in config.
- Option C: Always use the first detected device.
- User choice: `Auto-pick one (Recommended)`

### Decision Point: Explicit selector field
- Option A: Serial number. Recommended because it is stable across reconnects and matches the roadmap success criteria.
- Option B: USB path.
- Option C: Model only.
- User choice: `Serial number (Recommended)`

### Decision Point: Multiple devices with no selector
- Option A: Fail and list devices. Recommended because guessing would be unsafe.
- Option B: Pick first and warn.
- Option C: Prompt interactively.
- User choice: `Fail and list devices (Recommended)`

## Area: Reconnect Behavior

### Decision Point: Disconnect strategy
- Option A: Stay alive and retry. Recommended because it matches the roadmap reconnect requirement.
- Option B: Exit with error.
- Option C: Stay alive but require manual resume.
- User choice: `Stay alive and retry max 5min`

### Decision Point: Retry logging
- Option A: Disconnect once, sparse retries. Recommended because it preserves operational visibility without log spam.
- Option B: Log every retry.
- Option C: Only log disconnect and final outcome.
- User choice: `Disconnect once, sparse retries (Recommended)`

### Decision Point: Reconnect restoration
- Option A: Restore last rendered state. Recommended because visible continuity matters.
- Option B: Blank device then wait for a later render.
- Option C: Reconnect only.
- User choice: `Last rendered state (Recommended)`

## Area: First Render Scope

### Decision Point: Initial device render scope
- Option A: One key plus blank rest. Recommended because it proves the path while keeping the device in a known state.
- Option B: One key only.
- Option C: All keys with the same placeholder.
- User choice: `One key + blank rest (Recommended)`

### Decision Point: First key target
- Option A: Top-left / key 0. Recommended because it is deterministic and easy to verify.
- Option B: Center key.
- Option C: Configurable key.
- User choice: `Top-left / key 0 (Recommended)`

### Decision Point: First visual content
- Option A: Simple text visual. Recommended because it isolates the render path from layout and asset complexity.
- Option B: Branded placeholder card.
- Option C: Theme preview tile.
- User choice: `Simple text visual (Recommended)`

## Area: Render Pipeline Shape

### Decision Point: Architecture ambition
- Option A: Real architecture, narrow feature. Recommended because it avoids throwaway code while keeping the tracer bullet small.
- Option B: Prototype first, refactor later.
- Option C: Only device plumbing now.
- User choice: `Real architecture, narrow feature (Recommended)`

### Decision Point: Initial renderer target
- Option A: Per-key image buffers. Recommended because it matches the hardware contract most directly.
- Option B: Virtual deck model first.
- Option C: Whole-device bitmap first.
- User choice: `Per-key image buffers (Recommended)`

### Decision Point: Write deduping
- Option A: Include dedupe now. Recommended because Phase 2 explicitly requires avoiding unnecessary writes.
- Option B: Allow redundant writes first.
- Option C: Only dedupe whole-frame renders.
- User choice: `Include dedupe now (Recommended)`

## Areas Delegated To Agent's Discretion
- Retry cadence and backoff details within the 5-minute reconnect window.
- Exact sparse retry logging cadence.
- Exact styling of the first static text render.
- Exact internal module decomposition across device, render, and reconciler layers.

## Deferred Ideas
- Interactive runtime selection when multiple devices are attached.
- Full multi-device support.
- Richer or theme-aware first-render visuals.
