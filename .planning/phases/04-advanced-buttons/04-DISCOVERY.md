# Phase 4: Advanced Buttons - Discovery

**Gathered:** 2026-05-12
**Mode:** direct codebase discovery
**Status:** Ready for `discuss-phase 4`

## Goal

Map the real code seams for Phase 4 before discussion/planning. The roadmap goal is to add toggle buttons, external-state buttons, CPU/memory/fan live-data buttons, and a media control button without breaking the Phase 3 runtime that already handles display, action, and change-deck buttons.

## Scope From Roadmap

Phase 4 covers these requirements from `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md`:

- `BTN-04`: internal toggle button cycles through configured states on tap
- `BTN-05`: external-state toggle button reflects a status command
- `BTN-07`: CPU usage button renders progress/text at a configured interval
- `BTN-08`: memory usage button renders progress/text at a configured interval
- `BTN-09`: fan speed button renders sensor data with a fallback when unavailable
- `BTN-10`: media control button toggles play/pause and renders current track state from external commands

## Current Runtime Shape

### What Exists And Is Reusable

- `packages/cli/src/core/schemas.ts`
  - Current built-in button union only includes `display`, `action`, and `change-deck`.
  - Validation already handles deck map integrity and missing `change-deck` targets.
- `packages/cli/src/deck/runtime.ts`
  - Owns tap handling, generated back-button handling, per-button state, per-button feedback, per-button display-command polling, and rendering callbacks.
  - Already has the right general boundary for button behavior, but it is still Phase-3-specific in its branching.
- `packages/cli/src/action/executor.ts`
  - Already provides the shell-command execution boundary used by actions and display polling.
  - This should likely remain the single command runner for toggle/media external commands too.
- `packages/cli/src/render/scheduler.ts`
  - Already gives interval polling with jitter and clean shutdown.
  - This is the obvious reuse point for live CPU/memory/fan/media state refresh.
- `packages/cli/src/render/text-image.ts`
  - Already renders a themed card with text and optional icon.
  - It is the current render bottleneck for richer visual states like progress bars, sensor fallback, or multi-line media text.
- `packages/cli/src/cli/commands/start.ts`
  - Orchestrates config load, runtime creation, render callbacks, and reconnect handling.
  - It stays a thin composition layer if Phase 4 work stays inside runtime/render/schema modules.

### What Does Not Exist Yet

- No button schemas for `toggle`, `cpu`, `memory`, `fan`, or `media`
- No runtime branch for anything beyond `action` and `change-deck`
- No state model for multi-state buttons
- No systeminformation integration yet for CPU, memory, or fan sensors
- No richer render description than `{ keyIndex, label, icon }`
- No tests covering advanced-button types or their polling/state transitions

## Concrete Code Findings

### 1. Runtime dispatch is hard-coded to Phase 3 button types

`packages/cli/src/deck/runtime.ts` currently does this in `handleTap()`:

- back button if current key is the reserved back key
- `change-deck` navigation
- `action` execution with `...` then `OK` or `ERR`
- everything else is ignored

That means every Phase 4 behavior currently has nowhere to plug in except more branching inside `handleTap()` and adjacent helpers.

### 2. Polling currently only starts for the initial active deck

`packages/cli/src/deck/runtime.ts` creates schedulers only inside `start()`, iterating over `getDeckButtons(deckController.getActiveDeck())` once.

That was good enough for Phase 3 because only the active startup deck needed polling at boot. It becomes a real design constraint for Phase 4 because:

- live-data buttons in sub-decks would not automatically start polling after navigation unless runtime logic is extended
- external-state toggle/media buttons in a newly active deck need polling lifecycle tied to deck activation, not only process startup
- polling teardown/restart on deck changes needs to be explicit or old deck tasks will keep running pointlessly

This is the biggest concrete runtime gap discovered.

### 3. Button state is too small for advanced buttons

`ButtonRuntimeState` in `packages/cli/src/deck/runtime.ts` currently holds only:

- `currentLabel?`
- `feedbackLabel?`
- `isRunning`

That works for display-command labels and action busy state. It is not enough for:

- current toggle state index
- externally observed state key/value
- live metric cache (cpu/memory/fan/media)
- media button display fields like track title/artist/time
- richer fallback/render mode decisions

Phase 4 likely needs the same state map shape, but with a broader stored value per key.

### 4. Render output is still label/icon-only

`packages/cli/src/render/reconciler.ts` and `packages/cli/src/render/text-image.ts` currently pass only:

- `keyIndex`
- `label`
- `icon`

That is enough for Phase 3. It is tight for Phase 4 because roadmap success criteria explicitly mention:

- progress bar or percentage text for CPU
- progress bar or text for memory
- fallback display for fan sensors
- track title, artist, or time for media control

A discovery-level conclusion: Phase 4 can probably keep the runtime-to-render boundary small, but it likely needs at least one richer render payload field beyond a single label string.

### 5. `start.ts` is not the problem

`packages/cli/src/cli/commands/start.ts` is already thin enough. The right move is not to push Phase 4 logic back into startup orchestration. The pressure is inside runtime/render/schema, not startup.

### 6. Device layer already exposes the right input boundary

`packages/cli/src/device/stream-deck.ts` already provides:

- key down/up subscription
- reconnect handling
- per-key write dedupe
- replay of rendered buffers after reconnect

Nothing in discovery suggests the device layer needs conceptual expansion for Phase 4. The new work is above it.

## Likely Integration Points

If Phase 4 stays minimal and aligned with the current architecture, the main file touch points are:

- `packages/cli/src/core/schemas.ts`
  - add advanced built-in button schemas
  - validate per-button config shape for toggle/live-data/media buttons
- `packages/cli/src/deck/runtime.ts`
  - extend button state model
  - extend tap dispatch
  - move polling lifecycle to follow active-deck changes, not only initial startup
  - support externally refreshed button state
- `packages/cli/src/render/text-image.ts`
  - add richer visual treatment for metrics/fallback/media display
- `packages/cli/src/render/reconciler.ts`
  - widen render description shape if needed
- `packages/cli/src/cli/commands/start.ts`
  - likely only inject new dependencies if live-data providers need them
- `packages/cli/src/deck/runtime.test.ts`
  - primary behavior test surface for toggle, polling, and navigation interactions

Additional likely new module:

- a small live-data adapter module under `packages/cli/src/` for `systeminformation` calls rather than stuffing that directly into runtime

## Risks

### Risk 1: Runtime branching will turn to shit if every new button is in one giant `handleTap()`

Current code is still manageable, but Phase 4 adds enough behavior variation that piling all logic into one function will get brittle fast. The smallest sane move is probably helper functions per built-in advanced behavior, not a premature plugin system.

### Risk 2: Scheduler lifecycle is currently wrong for navigated decks

This is the main behavior risk. If polling stays startup-only, Phase 4 live buttons in sub-decks will be stale or dead.

### Risk 3: Rendering could get jammed by overloading a single `label`

Trying to encode progress bars, sensor fallback, and media metadata into one string may technically work, but it will fight the visuals immediately. Some richer render description is probably warranted.

### Risk 4: Fan sensors are inherently unreliable across machines

Roadmap already expects graceful fallback. Discovery confirms there is no existing sensor abstraction, so planning needs to decide the exact fallback contract rather than invent it mid-implementation.

### Risk 5: External-state toggle/media buttons need output normalization rules

`executeCommand()` normalizes whitespace, but Phase 4 still needs a real contract for how command output maps to button state. Discovery did not find an existing convention for this.

## Testing Gaps

Current tests cover:

- action tap handling
- ignored mismatched taps
- cleanup on stop
- action busy/success feedback
- polling shutdown
- generated back button on sub-decks

Current tests do not cover:

- toggle state transitions
- external-state refresh and display mapping
- live-data polling after deck navigation
- fan sensor fallback rendering
- media state rendering and play/pause action flow
- reconnect behavior for polled advanced buttons

## File Size / Complexity Hotspots

Measured during discovery:

- `packages/cli/src/deck/runtime.ts`: 288 lines
- `packages/cli/src/core/schemas.ts`: 206 lines
- `packages/cli/src/cli/commands/start.ts`: 171 lines
- `packages/cli/src/render/text-image.ts`: 170 lines

The hotspot is still `runtime.ts`. That is expected, because it already owns the Phase 3 button orchestration.

## Searches Run

- searched `packages/cli/src` for `TODO|FIXME|HACK|XXX`: no matches
- searched `packages/cli/src/**/*.test.ts` for `toggle|cpu|memory|fan|media`: no matches

## Discovery Conclusions

1. Phase 4 should extend the existing runtime rather than introduce a second button subsystem.
2. The first planning problem is polling lifecycle across deck activation, not sensor integration.
3. The second planning problem is choosing the minimal render payload that can support metrics and media info cleanly.
4. `systeminformation` is not yet wired anywhere, so planning should isolate it behind a narrow adapter.
5. `start.ts` and the device layer are already acceptable boundaries; most work belongs in schema, runtime, render, and tests.

## Recommended Discussion Topics For `discuss-phase 4`

- Toggle contract:
  - exact config shape for internal multi-state toggles
  - exact contract for external status command output
- Polling contract:
  - whether inactive decks should stop polling completely
  - default intervals for live-data buttons
- Rendering contract:
  - whether CPU/memory should support both `progress` and `text` display modes in v1
  - what fan fallback should say when sensors are absent
  - what subset of media metadata is required for v1
- Runtime structure:
  - whether to keep advanced button helpers inside `runtime.ts` or split a small built-in button behavior module now

---
*Phase: 04-advanced-buttons*
*Discovery gathered: 2026-05-12*
