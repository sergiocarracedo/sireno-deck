# Plan 10-02 Summary

**Completed:** 2026-07-21

## What was built

Extended the Wayland+GNOME active-app provider to call `FocusTitle` on the existing `Window Calls Extended` GNOME Shell extension over D-Bus, populating `snapshot.windowTitle` so VS Code and OpenCode overlays' `window_name` triggers match the focused window's title on Wayland sessions. The probe runs both `FocusClass` and `FocusTitle` on the same D-Bus connection and emits a consistent snapshot — no flicker between "no title" and "title available" states.

## Key files

- `packages/cli/src/system/providers/active-app/wayland-gnome.ts`: `ProbeResult` carries optional `focusTitle`; `poll()` runs `Promise.all([focusClass(), focusTitle?.() ?? Promise.resolve("")])`; emit() compares both name and title for change detection; `getActive()` and `subscribe()` return both fields.
- `packages/cli/src/system/providers/shared.ts`: `LinuxDbusInterface.FocusTitle?(): Promise<string>` added.
- `packages/cli/src/system/providers/active-app/__tests__/wayland-gnome.test.ts`: extended `makeBus` to accept optional `focusTitle`; 3 new tests (windowTitle populated, title-only changes emit, both methods available).

## Decisions made

- Used `Promise.all` so the first snapshot is consistent — never emits `(name, null)` then `(name, title)` on consecutive ticks.
- Used `Promise.resolve("")` as the second arg when `focusTitle` is undefined, so `Promise.all` always gets an array of length 2 (avoids the .all-vs-.allSettled pitfall and keeps the destructuring pattern clean).
- `emit` change-detection compares both `lastName` and `lastTitle` so a window-title change fires a new subscriber event even when the window class stays the same (important for OpenCode where `process_name` is the terminal, only `window_name` changes).
- Updated one existing test ("returns parsed snapshot from FocusClass") to `await vi.advanceTimersByTimeAsync(100)` before `getActive()` because `Promise.all` adds an extra microtask hop vs the previous single-await path.

## Notes for downstream

- The user must already have the Window Calls Extended GNOME extension installed for this to populate `windowTitle`. The existing install URL warning (`https://extensions.gnome.org/extension/4974/window-calls-extended/`) is unchanged.
- VS Code and OpenCode overlays' `window_name` triggers will now match on Wayland+GNOME without further code changes — the runtime's `applyOverlay` already handles trigger changes correctly per `.planning/solutions/logic-errors/overlay-trigger-changes-dismiss-previous-2026-07-17.md`.