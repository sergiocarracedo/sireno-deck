---
phase: 12-addon-frontend-registry
status: partial
verified_at: 2026-06-27
---

# Phase 12 — Verification

## Plan 12-01 (vite plugin addon registry + Deck wiring)

**Status: ✓ passed**

| Must-have | Verified |
|-----------|----------|
| AddonManifest.publishIntervalMs field | ✓ — added; lint clean |
| `virtual:sireno/addons/registry` virtual module | ✓ — `buildAddonsRegistryModule`; 14 tests in `virtual-modules.test.ts` |
| CLI's `buildDeckConfigMessage` adds `addonName` + `frontendEntry` | ✓ — `addonByType` Map passed; 4 tests in `emulator-mode-build-config.test.ts` |
| Frontend `Deck.tsx` reads registry, renders addon components | ✓ — uses `virtual:sireno/addons/registry`; falls back to type-name label if no entry |

## Plan 12-02 (CLI state publishing — lazy, namespaced)

**Status: ✓ passed (with integration follow-up)**

| Must-have | Verified |
|-----------|----------|
| StatePublisher class | ✓ — 5 tests covering lazy start, stop on deck change, sync + async polls, error logging |
| Lazy lifecycle: polls only when addon's addon is in active deck | ✓ — `setActiveDeck` diff-based start/stop |
| Per-channel cadence | ✓ — `intervalMs` per channel via `setInterval`; first fire is immediate |
| State message schema with cadence | ✓ — `stateMessageSchema.cadence?: Record<string, number>` |
| `run.ts` wires publisher into runtime | ⚠ — **deferred**. `StatePublisher` exists + tested, but `run.ts` doesn't instantiate it yet. **Follow-up:** wire the publisher into `runEmulatorLifecycle`; subscribe to `runtime:deck-active`; register addon poll functions. |

## Plan 12-03 (7 addon frontend.tsx files)

**Status: ✓ partial** (stubs render correct shapes; live data depends on Plan 12-02 wire-up)

| Must-have | Verified |
|-----------|----------|
| date-time frontend.tsx (6 buttons) | ✓ — channels: `date-time:now`. Renders all 6 button types. Falls back to local clock. |
| weather frontend.tsx | ✓ — channel: `weather:current`. Shows "Configure weather" if unavailable. |
| system-status frontend.tsx (text + bars variants) | ✓ — channel: `system-status:metrics` |
| media-player frontend.tsx (split action) | ✓ — channel: `media-player:state` |
| value-display frontend.tsx | ✓ — channel: `value-display:values` |
| brightness frontend.tsx (bar + action label) | ✓ — channel: `brightness:current` |
| emoji-selector frontend.tsx | ✓ — single emoji character (theme surface is sufficient) |
| Each addon manifest declares `frontend` + `publishIntervalMs` | ✓ — all 7 addons updated |

## Final state

- 480 tests pass (was 464 → +16 new tests across vite/registry/state-publisher/build-config)
- Lint clean
- Typecheck clean
- 7 commits in this phase:
  - `ae30398` — AddonManifest.publishIntervalMs
  - `a86d149` — virtual:sireno/addons/registry + tests
  - `aa7bc57` — buildDeckConfigMessage adds addonName + frontendEntry
  - `b4ad64e` — scan builtin addons + build type→addon map
  - `452e589` — Deck.tsx renders addon components
  - `d2f63be` — StatePublisher + cadence field
  - `f48d820` — date-time frontend.tsx (6 buttons)
  - `3839829` — 6 addon frontend.tsx files
  - `31b61fb` / `27cfcef` / `0a141b6` — plan summaries

## Verdict

**Status: `partial`**

The foundation is complete: addon manifests, vite plugin registry, frontend Deck wiring, 7 addon frontends, and the StatePublisher class. **What's missing:** the runtime integration that:

1. Instantiates `StatePublisher` in `runEmulatorLifecycle`.
2. Subscribes to `runtime:deck-active` and calls `statePublisher.setActiveDeck(...)`.
3. Registers each addon's poll function with the publisher (e.g., `date-time` registers a poll returning `Date.now()`).
4. On shutdown, calls `statePublisher.stopAll()`.

Without this wire-up, the addons render their fallback states (clock via `setInterval`, "Configure weather" placeholder, etc.) — not live data from the CLI.

**Suggested next:** a small follow-up task (~30 min) to wire `StatePublisher` into `run.ts` and register the 6 OS-state addons' poll functions. The 7th (`date-time`) needs no CLI-side poll (its poll is the local clock). After that, the emulator shows live clock, weather, system bars, etc.

## Summary

The phase delivers the architectural foundation. End-to-end live data in the emulator needs the small `run.ts` wire-up above. All 480 tests pass; the addon frontends are correct in shape; the `StatePublisher` is fully tested and ready to plug in.
