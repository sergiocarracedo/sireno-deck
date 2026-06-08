# Phase 55 Research: Active-app overlay decks

**Researcher:** learnship-phase-researcher (sequential mode, inline)
**Date:** 2026-06-08
**Confidence levels:** [VERIFIED] = confirmed via webfetch/npm; [CITED] = from docs; [ASSUMED] = inference; [CODEBASE] = confirmed in repo.

## Don't Hand-Roll

### Use `get-windows` (formerly `active-win`) for cross-platform foreground-window detection

[VERIFIED: https://github.com/sindresorhus/get-windows] `active-win` was renamed to `get-windows` (latest v9.3.0, Mar 2026). The new package is ESM-only (`import { activeWindow } from 'get-windows'`). Our package is already `"type": "module"` so this fits cleanly.

**What it gives us:** A single async call `await activeWindow()` returns `{ title, id, owner: { name, processId, bundleId, path }, ... }`. Works on macOS 10.14+, Linux (X11/XWayland only), Windows 7+.

**What it does NOT give us:** Pure Wayland support — explicitly unsupported due to Wayland's security model. This is the documented failure mode in the success criteria.

**Use `get-windows` instead of writing `xdotool` / `osascript` / PowerShell glue directly.** Saves hundreds of lines per platform and handles the macOS Accessibility permission prompt correctly. We do still need to abstract the package behind our own provider interface so:
1. Tests can inject a mock without `get-windows` running.
2. We can swap implementations if the package breaks on a future platform.
3. The runtime can boot on unsupported platforms (pure Wayland, unknown OS) without crashing.

### Mirror the existing `system-status` addon shape for the OS abstraction

[CODEBASE: `packages/cli/src/builtin-addons/system-status/`] The system-status addon uses `systeminformation` which handles cross-platform internally. The "OS abstraction pattern" in this repo is therefore not per-platform files inside that addon, but rather a clean module boundary that the runtime can use. For active-app, we need actual per-platform branching because `get-windows` returns nothing useful on pure Wayland — we need a sentinel "this platform is unsupported" return.

**Recommended shape** (new directory, separate from addons):
```
packages/cli/src/system/active-app/
├── index.ts          # getActiveAppProvider() factory + start/stop + re-exports
├── provider.ts       # ActiveAppProvider interface + ActiveAppSnapshot type
├── linux.ts          # uses get-windows; detects Wayland and returns unsupported
├── darwin.ts         # uses get-windows (with accessibilityPermission: false to skip the macOS prompt on first call)
├── windows.ts        # uses get-windows
└── unsupported.ts    # stub for unknown platforms / pure Wayland
```

**Factory:** `getActiveAppProvider()` returns the right provider for `process.platform` (with an env-var override `SIRENO_ACTIVE_APP_PROVIDER` for tests). The provider exposes:
```ts
interface ActiveAppProvider {
  readonly supportsActiveApp: boolean
  start(onChange: (snapshot: ActiveAppSnapshot | null) => void): void
  stop(): void
}
```

`snapshot.owner.name` is what we use for substring matching. The provider's `start()` polls every 500ms (or the default the success criteria calls for) and calls `onChange` only when the name actually changes (deduplicated).

## Common Pitfalls

### 1. Don't conflate the addon and the runtime overlay

[ASSUMED based on CONTEXT] The runtime has its own state for "what's currently being shown on the device", and addons are configurations. The overlay must be tracked on the runtime, NOT in the addon registry. The addon only declares "I have a deck that should appear when process X is foreground". The runtime is responsible for actually pushing that deck onto the device.

This means: the `process_names` field on `AddonGeneratedDeck` is metadata; the actual overlay push/pop is in `runtime.ts` (or a new helper that the runtime uses).

### 2. Don't let the overlay's own navigation pollute the base stack

[ASSUMED] The success criteria says "exiting the overlay leaves the base deck's stack exactly as it was". This is the entire point of an overlay vs a regular deck. We need a separate navigation state for the overlay, completely independent of the base deck's `deckController` stack. Concretely: when the overlay appears, snapshot the base stack; when the overlay dismisses, restore the snapshot. (Actually, simpler: the overlay doesn't TOUCH the base stack at all — it just renders on top. As long as the runtime renders the overlay's content INTO the base's slots, the base's `getActiveDeckId()` stays the same. The "history" is naturally preserved.)

### 3. Don't use `setTimeout` recursion for the 500ms poll — use a cancellable timer

[CODEBASE pattern: `packages/cli/src/render/scheduler.ts`] We have a `createPollingScheduler({ intervalMs })` already. The active-app monitor should use this (or mirror its shape) so the runtime can `stop()` it cleanly on shutdown. A raw `setInterval` is hard to test and leaks across hot-reloads.

### 4. Don't use `osascript` / PowerShell as a fallback when `get-windows` returns null

[VERIFIED via get-windows readme] When `get-windows` returns `undefined`, that means "no active window" (e.g., on the lock screen, or a transition state). It does NOT mean "the package is broken". Don't fall through to a different implementation — `undefined` is a valid value, and we should just emit `null` as the snapshot.

### 5. macOS Accessibility permission is a one-time prompt — don't repeatedly trigger it

[VERIFIED via get-windows readme] On macOS, the first call to `activeWindow()` triggers the Accessibility permission prompt. Subsequent calls reuse the permission. We should NOT make a synchronous "test" call to check if permission is granted — that would trigger the prompt before the user is ready. Instead: start the poll, and if it returns `undefined` for the first few seconds (typical on first run), the runtime just shows no overlay; the user can grant permission later.

### 6. Wayland detection must happen at provider selection time, not at every poll

[CODEBASE pattern: `packages/cli/src/system/host-context.ts`] We have an existing `hostContext.os` that already detects Wayland via `XDG_SESSION_TYPE === 'wayland' && !WAYLAND_DISPLAY` (or similar). The active-app provider should consult this same `hostContext` to decide which implementation to use. If the host says Wayland, return the `unsupported` provider immediately and log a one-time warning.

### 7. Process matching must normalize the OS-specific suffix

[ASSUMED based on success criteria] User writes `code` in YAML; on macOS the active process is `Code.app`; on Windows it's `code.exe`. We need a `normalizeProcessName(name, platform)` helper that strips `.app` / `.exe` / `.exe.exe` and lowercases before doing the substring match. Otherwise the user's "code" wouldn't match anything on macOS.

### 8. Duplicate process_name warning must fire once at startup, not on every poll

[ASSUMED] The success criteria says "first-match-wins with a startup log warning". This means: at addon registry load time, scan all addon-declared `process_names` arrays, detect collisions, and emit ONE warning per collision. Don't check for duplicates on every poll — that's noise.

## Existing Patterns in This Codebase

### `SessionMonitor` shape is the template for `ActiveAppMonitor`

[CODEBASE: `packages/cli/src/system/session-monitor.ts`] The session monitor has:
- `getSnapshot()` returns the current state
- `subscribe(listener)` for change events
- `stop()` for cleanup
- A `createSessionMonitorDouble` test helper that emits synthetic snapshots

The `ActiveAppMonitor` should mirror this exactly. Tests can use a `createActiveAppMonitorDouble` that emits synthetic process names.

### `system-back-injection.ts` has the gate pattern we need

[CODEBASE: `packages/cli/src/deck/system-back-injection.ts`] `shouldInjectSystemBack(deck, config, sessionState)` returns a boolean. The overlay is a parallel case: `shouldInjectOverlayToggle(deck, overlayState)` should return a boolean. The reserved-slot button for an overlay deck is the toggle; for a non-overlay deck it's the system-back.

### `getBundledAddons()` shows how to wire the OS provider selection

[CODEBASE: `packages/cli/src/addon/builtin.ts`] It's a simple function returning an array. The OS provider factory should be equally simple: `getActiveAppProvider(): ActiveAppProvider` returns one provider based on `process.platform` (with env override for tests).

### `ButtonSurface` wraps every button render — no per-button DOM exception needed

[CODEBASE: `packages/cli/src/addon/api.ts`] The overlay's "Base" toggle can be a regular `defineMountedButton` with `onTap` calling the new `dismissOverlay()` method. No special DOM rendering needed.

## Recommended Approach

1. **Add `process_names?: string[]` to `AddonGeneratedDeck` in `packages/cli/src/addon/api.ts`**, plus a passthrough in `packages/cli/src/core/schemas.ts`. Backwards-compatible (SIRENO_ADDON_API_VERSION stays 1).

2. **Create `packages/cli/src/system/active-app/`** with the per-platform providers and the `getActiveAppProvider()` factory. Use `get-windows` (the renamed active-win). Add a `WAYLAND_DETECTED` check that returns the unsupported provider on Linux pure Wayland.

3. **Create `packages/cli/src/system/active-app/ActiveAppMonitor.ts`** (or inline in the index) that wraps a provider, polls at 500ms via the existing `createPollingScheduler`, and emits a `change` event with the deduped process name. Provide a test double `createActiveAppMonitorDouble` for unit tests.

4. **Add the overlay state to the runtime's `runtimeDecks` map** as a parallel concept. When `ActiveAppMonitor` fires a change to a process that matches a registered active-app deck, the runtime pushes that deck on top. When the process changes to something that doesn't match, the runtime dismisses the overlay. When the process changes to a different declared process, the runtime dismisses the old overlay and pushes the new one.

5. **Add a `dismissOverlay()` method to the runtime** that the overlay deck's reserved-slot button calls. The reserved-slot is the standard "Base" toggle (icon + label). The `shouldInjectSystemBack` gate gains a parallel `shouldInjectOverlayToggle` that fires for overlay decks.

6. **Add a double-tap detector for the back gesture** with a 350ms window. This is small enough to live in the runtime's existing `handleTap`/`handleDblTap` flow (already in the codebase for the existing double-tap gestures). Track the timestamp of the last back-action; if a second back-action comes within 350ms AND an overlay is active, dismiss the overlay AND skip the base-stack pop.

7. **Settings deck layered on top of the overlay** — the settings affordance on the base deck pushes the settings deck as a regular navigation. From settings, the regular system-back returns to the base deck (overlay is still on top, behind settings). HOLD-back from settings skips the back pop and goes to the overlay.

8. **Process matching with normalization** — a `processNamesMatch(declared: string[], active: string, platform): boolean` helper that:
   - Lowercases both
   - Strips `.app` from the active name on darwin
   - Strips `.exe` from the active name on windows
   - Returns true if any declared name is a substring of the normalized active name

9. **Duplicate process_name detection at load time** — when the addon registry is built, scan all `process_names` arrays and emit one warning per duplicate group. No per-poll re-check.

10. **Graceful degradation** — if `getActiveAppProvider()` returns the `unsupported` provider (Wayland, unknown platform, install error), the runtime logs ONE warning at startup and never tries to push an overlay. The base deck works normally.

## Source citations

- [VERIFIED: github.com/sindresorhus/get-windows] — `active-win` renamed to `get-windows` (v9.3.0, Mar 2026), ESM-only, Wayland unsupported, macOS Accessibility permission flow
- [CODEBASE: `packages/cli/src/system/session-monitor.ts`] — the existing monitor shape to copy
- [CODEBASE: `packages/cli/src/deck/system-back-injection.ts`] — the gate pattern
- [CODEBASE: `packages/cli/src/render/scheduler.ts`] — the polling scheduler
- [CODEBASE: `packages/cli/src/addon/api.ts:36`] — the `AddonGeneratedDeck` interface to extend
- [CITED: `.planning/ROADMAP.md` phase 55 success criteria] — the source of truth for what to build
- [CITED: `.planning/phases/55-active-app-overlay-decks/55-CONTEXT.md`] — the user's locked decisions
