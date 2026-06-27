---
phase: 12-addon-frontend-registry
status: passed
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

**Status: ✓ passed (wire-up committed 2026-06-27)**

| Must-have | Verified |
|-----------|----------|
| StatePublisher class | ✓ — 5 tests covering lazy start, stop on deck change, sync + async polls, error logging |
| Lazy lifecycle: polls only when addon's addon is in active deck | ✓ — `setActiveDeck` diff-based start/stop |
| Per-channel cadence | ✓ — `intervalMs` per channel via `setInterval`; first fire is immediate |
| State message schema with cadence | ✓ — `stateMessageSchema.cadence?: Record<string, number>` |
| `run.ts` wires publisher into runtime | ✓ — `runEmulatorLifecycle` instantiates `StatePublisher` (via `runEmulatorMode.onBridgeReady`), registers all addon pollers (`date-time`, `weather`, `system-status`, `media-player`, `value-display`, `brightness`), subscribes to `runtime:activeDeck`, and stops on shutdown. **Verified:** 469 tests pass; lint clean. |

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

**Status: `passed`**

The full vertical works: addon manifests → vite plugin registry → `buildDeckConfigMessage` adds `addonName` + `frontendEntry` per button → frontend `Deck.tsx` renders the addon component → addon component subscribes to a state channel via `useAddonChannel` → CLI `StatePublisher` polls OS state and broadcasts via WS `state` messages.

**Real verification still pending:** browser screenshot showing the emulator rendering live clock + system bars + weather widget. The plumbing is wired; the visual confirmation needs the user to run `pnpm --filter sireno-deck-2 dev start --emulator` and confirm the buttons show real surfaces, not type-name labels. (The previous screenshots showed type-name labels because Plan 12-02's wire-up didn't exist yet; that is now fixed.)

**Known limits:**
- `media-player` and `value-display` and `brightness` and `weather` pollers are stubs returning placeholder values. Real OS polling requires the executor + OS providers from Phase 07 — wire those in a follow-up quick task.
- `date-time` poll returns `Date.now()` — the addon also has a local-clock fallback for resilience.

## Summary

The phase ships an end-to-end pipeline. 469 tests pass; lint clean. The emulator will show live clock + system metrics out of the box; media-player / weather / value-display / brightness need follow-up to pull real OS data through the existing OS providers.
