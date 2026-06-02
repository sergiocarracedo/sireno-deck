---
phase: 35
slug: live-hardware-resampling-at-250ms
areas_discussed:
  - Capture ownership
  - Cadence contract
  - Cadence timing
  - Write strategy
  - Scope boundary
created: 2026-06-03
---

# Phase 35: Live hardware resampling at 250ms - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 35-live-hardware-resampling-at-250ms
**Areas discussed:** Capture ownership, Cadence contract, Cadence timing, Write strategy, Scope boundary

---

## Capture ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Renderer-owned loop | Keep the mounted page, version tracking, wait timing, and screenshot cadence inside `packages/cli/src/render/browser-renderer.ts`. | ✓ |
| Start-owned loop | Move timer/orchestration into `packages/cli/src/cli/commands/start.ts` and keep the renderer mostly stateless. | |
| Split ownership | Let the renderer own screenshots while `start.ts` decides repeated capture timing. | |

**User's choice:** `Renderer-owned loop (Recommended)`
**Notes:** User accepted keeping the live resampling loop inside the existing renderer seam because it already owns page lifetime, versioning, and capture machinery.

---

## Cadence contract

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse sample_interval_ms only | Only surfaces that already emit `data-sireno-media-sample-interval-ms` stay live on hardware. | |
| Add global fallback | Keep `sample_interval_ms`, but add a deck/global default 250ms hardware resampling cadence when no surface opts in. | |
| Always resample browser decks | Every browser-backed hardware deck runs a 250ms live capture loop by default. | ✓ |

**User's choice:** `Always resample browser decks`
**Notes:** User explicitly chose broader default live hardware behavior over preserving `sample_interval_ms` as the opt-in gate.

---

## Cadence timing

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate on change, 250ms steady-state | Capture immediately for fresh HTML/version changes, then use the ~250ms loop between changes for live motion. | ✓ |
| Strict 250ms tick only | Never capture faster than the 250ms timer, even after new HTML arrives. | |
| Mixed by surface hint | Use immediate capture only for some surfaces and timer-only for others. | |

**User's choice:** `Immediate on change, 250ms steady-state (Recommended)`
**Notes:** User chose responsiveness for taps, navigation, and content updates while still using a fixed live recapture cadence between changes.

---

## Write strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep per-key writes and dedupe | Stay on the current hardware contract: crop the full page and write only changed key buffers through `writeKeyBuffer(...)`. | ✓ |
| Parallelize changed key writes | Still write per-key, but send changed keys concurrently. | |
| Add new panel-level abstraction | Introduce a new whole-deck transport abstraction. | |

**User's choice:** `Keep per-key writes and dedupe (Recommended)`
**Notes:** User kept the phase focused on capture behavior instead of widening device transport scope.

---

## Scope boundary

| Option | Description | Selected |
|--------|-------------|----------|
| All browser-backed hardware decks | Any browser-rendered physical hardware deck stays live, including shared text blink/marquee as a consequence. | ✓ |
| Only explicit animated surfaces | Limit live resampling to media/sample-cadence surfaces. | |
| Text animation only | Special-case shared blink/marquee without broad live browser deck behavior. | |

**User's choice:** `All browser-backed hardware decks (Recommended)`
**Notes:** User chose the broad hardware browser-path fix rather than effect-specific patching.

---

## Agent's Discretion

- Exact renderer-internal loop/timer implementation for mixing immediate version captures with 250ms steady-state recaptures.
- Exact test/fixture shape for proving the new renderer behavior.
- Exact logging/observability wording around live hardware browser renders.

## Deferred Ideas

- Panel-level hardware batching or alternate transport APIs.
- Extra user-facing cadence configuration beyond the phase goal.
- Emulator-specific behavior changes outside the physical hardware browser-render path.

---

*Phase: 35-live-hardware-resampling-at-250ms*
*Discussion log generated: 2026-06-03*
