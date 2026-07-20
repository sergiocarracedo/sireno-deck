# Phase 9 Discussion Log

**Mode:** deep
**Date:** 2026-07-20

## Areas discussed (all 4 selected)

### 1. Service-logs IPC mechanism
**Question:** How does the CLI forward logs to the emulator?

Options presented:
- (A) NDJSON file tail (Recommended): CLI writes to XDG_RUNTIME_DIR/sireno-deck-logs.jsonl, emulator tails via chokidar. Survives restart.
- (B) **New WS sub-protocol message** ← user pick: `{type: "service-log", level, msg, ts}` published via existing bridge. Real-time; loses logs on disconnect.
- (C) stdio pipe from spawn: wrap CLI in child_process and read stdout. Noisy.

**User's choice:** New WS sub-protocol message. Rationale: real-time > durability for emulator use case.

### 2. Emulator side-panel routing
**Question:** 5-page menu: routes, tabs, or vertical nav?

Options:
- (A) State-driven active tab (Recommended): single React state, no router.
- (B) **react-router routes** ← user pick: `/emulator/device`, `/emulator/bridge-logs`, etc. Deep-linkable.
- (C) Vertical nav + content swap: state-driven but visually vertical.

**User's choice:** react-router routes. Rationale: emulator already uses react-router for deck routes, easy to nest.

### 3. Bridge-logs storage + filter UI shape
**Question:** How to store + filter all wsBridge messages?

Options:
- (A) **Ring buffer + 4 filters (Recommended)** ← user pick: ~1000 msg cap, oldest evicted. Direction + channel + type + content-substring + time-range.
- (B) No cap + simple filters: unbounded in-memory.
- (C) Channel-only tabs: per-channel tabs, no text search.

**User's choice:** Ring buffer + 4 filters. Agent's discretion on exact cap.

### 4. System-status addon port strategy
**Question:** Port from legacy or rewrite?

Options:
- (A) Port as-is, 4 split surfaces (Recommended): copy addon + helpers verbatim.
- (B) Consolidated single surface: 1 button slot, all metrics stacked.
- (C) **Rewrite to current architecture** ← user pick: re-implement against current addon API, 4 split surfaces (cpu/ram/disk/net), positions 0+5.

**User's choice:** Rewrite to current architecture with 4 split surfaces. Rationale: legacy is stale; current patterns matter.

## Agent's Discretion

- Exact ring buffer cap (suggested ~1000).
- Bridge-logs filter UI styling.
- Service-log message schema (level + msg + ts).
- Splash image encoding details.

## Deferred ideas

- Persistent bridge-log storage (disk).
- Config editor inside emulator.
- Multiple status metrics per surface.

---
*Audit trail — not referenced by downstream agents.*
