# Quick Task 043 Summary

**Task:** Add a pure-Wayland + GNOME active-app provider that talks to the `window-calls-extended@hseliger.eu` GNOME Shell extension via DBus. When the extension is missing, log a one-time install hint with the extension URL and fall back to the no-op path.
**Completed:** 2026-06-09

## What was done

- Added a new `system/active-app/wayland-gnome.ts` provider that uses `dbus-next` (already in `package.json`, no new dep) to call the GNOME Shell extension's `FocusClass` method via the session bus.
- `createLinuxProvider` now dispatches to the new provider when `isPureWayland` is true (X11/XWayland hosts still use `get-windows` unchanged).
- Probes the extension once at construction time:
  - If reachable → returns a polling provider (`supportsActiveApp: true`)
  - If the extension is missing or the bus is unreachable → returns an `unsupported`-shaped provider (`supportsActiveApp: false`) AND logs a one-time info-level install hint with the extension URL: `https://extensions.gnome.org/extension/4974/window-calls-extended/`
- Same 5-strike poller cap pattern as the previous linux fix; transient DBus errors (e.g. service restart) recover automatically.
- DBus client is injectable via `ActiveAppProviderDeps.dbusClient` — the default falls back to `sessionBus()` from `dbus-next`, tests pass a fake. Same pattern as the `probe` injection for `get-windows`.
- `getActiveAppProvider` and `createLinuxProvider` are now `async` to accommodate the construction-time DBus probe. Two call sites in `start.ts` updated to `await`.

## Files changed

- `packages/cli/src/system/active-app/provider.ts` — added `DbusClient`/`DbusBus`/`DbusProxyObject`/`DbusProxyInterface` types, made `LoggerLike.info` required, added `dbusClient?: DbusClient` to `ActiveAppProviderDeps`
- `packages/cli/src/system/active-app/wayland-gnome.ts` (new) — DBus-backed polling provider
- `packages/cli/src/system/active-app/wayland-gnome.test.ts` (new) — 4 tests: present, missing, empty-class-then-real, failure cap
- `packages/cli/src/system/active-app/linux.ts` — async, dispatches to wayland-gnome on pure Wayland
- `packages/cli/src/system/active-app/index.ts` — async, preserves `dbusClient`/`probe` from options
- `packages/cli/src/system/active-app/get-provider.test.ts` — async + 2 new cases (pure Wayland present/missing)
- `packages/cli/src/system/active-app/linux.test.ts` — `await` added (X11 path unchanged)
- `packages/cli/src/cli/commands/start.ts` — both call sites `await getActiveAppProvider(...)`

## Verification

- `pnpm --filter sireno-deck-cli test src/system/active-app src/deck/__tests__/{system-buttons-dispatcher,internal-decks}.test.ts` — 30/30 pass
- `pnpm --filter sireno-deck-cli exec tsc --noEmit` — no new errors in active-app/start.ts (remaining are pre-existing WIP from phase 17/18)
- `pnpm exec oxlint packages/cli/src/system/active-app packages/cli/src/cli/commands/start.ts` — clean (one pre-existing unused-import warning in `active-app-monitor.test.ts`)
- On a real GNOME Wayland host with the extension installed, the provider should now successfully poll `FocusClass` via DBus and emit the same `ownerName` as the X11 path

## Notes for next time

- The `installUrl` is in the structured log field (Pino `context`) — tests should assert on the field, not the message string. The human-readable message says "install it to enable active-app detection on Wayland".
- The provider can't be created synchronously (DBus probe is async), so `createLinuxProvider` and `getActiveAppProvider` are now `async`. If you need to call them from a sync context, await at the boundary (the runtime does this via the existing `await` in `start.ts`).
- The default `dbusClient` uses `sessionBus()` from `dbus-next`. On a host with a graphical session, the bus is reachable; the probe will hit the extension or fall through to the install-hint path.
- KDE/Sway/other Wayland compositors: not in scope (no equivalent extension in the codebase). The probe will fail, log the install hint, and the daemon will be a no-op on those.

## Commit

`feat(quick-043): wayland-gnome active-app provider via DBus` — 8 files, +380/-28
