# Quick Task 043: GNOME Wayland extension active-app provider - Plan

**Task:** Add a pure-Wayland + GNOME active-app provider that talks to the `window-calls-extended@hseliger.eu` GNOME Shell extension via DBus (using the already-installed `dbus-next` package). When the extension is missing, log a one-time install hint with the extension URL and fall back to the no-op path.

## Design Decisions

- **Provider shape:** mirror `system/active-app/darwin.ts` and `linux.ts` — `createWaylandGnomeProvider(deps)` returns an `ActiveAppProvider` with `supportsActiveApp: true` when the extension is reachable, `false` otherwise.
- **Bus client is injectable** via `ActiveAppProviderDeps.dbusClient` so the DBus path is testable without a real session bus. Same pattern as the `probe` injection we did for the linux failure-cap fix.
- **Detection happens at construction time**, not on every poll. `createWaylandGnomeProvider` calls `FocusClass` once synchronously (well, awaits) inside its `start()` lifecycle — no, actually: we want to know if it's reachable BEFORE returning the provider, so we can set `supportsActiveApp` correctly. So: try once inside the factory; on success return the polling provider; on failure return an `unsupported`-shaped provider that logs the install hint once.
- **Field mapping:** `FocusClass` → `ownerName` (matches the existing `ActiveAppSnapshot` contract). The extension's `FocusTitle`, `FocusPID`, `FocusClass` all return strings; `FocusClass` is the right one for app matching (e.g. `firefox`, `code`, `gnome-terminal`).
- **Polling:** 500ms (same as existing providers) — `setTimeout` loop calling `FocusClass` and emitting on change.
- **Failure cap:** mirror the linux fix — stop the poller after 5 consecutive DBus errors, log once, no spam. The DBus call site can throw on connection drop or service-unavailable.
- **Where it's invoked:** inside `createLinuxProvider`, **after** the `isPureWayland` check. So the dispatch becomes:
  1. X11 / XWayland → existing `get-windows` path (unchanged)
  2. Pure Wayland → `createWaylandGnomeProvider` (NEW); if extension missing → fallback to `unsupported` with install hint
- **No new dependency:** `dbus-next ^0.10.2` is already in `package.json` and used by `system/session-monitor.ts`.
- **Detection for the missing-extension case:** the DBus call returns `Error.ServiceUnknown` (or a generic dbus error) when the extension's name isn't on the bus. Catch any error from the proxy, log the hint ONCE with the extension URL and a brief reason, return an unsupported provider.

## Architecture

```
src/system/active-app/
  wayland-gnome.ts       # new — DBus-backed provider for GNOME Wayland
  wayland-gnome.test.ts # new — tests with injected dbus client
  linux.ts               # modified — dispatch to wayland-gnome on pure Wayland
  index.ts               # unchanged (the linux provider handles the dispatch)
```

No changes to:
- `provider.ts` (we already added `ActiveAppProbe` last task; for this one we add a separate `dbusClient` to keep concerns isolated)
- `darwin.ts`, `windows.ts`, `unsupported.ts` (other platforms)

Wait — the cleanest is to add `dbusClient` to `ActiveAppProviderDeps`. It's a separate concern from `probe` (probe = "get the active window", dbusClient = "talk to GNOME DBus"). Both are injectable test seams.

## Files to change

1. `packages/cli/src/system/active-app/provider.ts` — add `DbusClient` interface + `dbusClient?: DbusClient` to `ActiveAppProviderDeps`
2. `packages/cli/src/system/active-app/wayland-gnome.ts` (new) — DBus-backed provider, ~80 lines
3. `packages/cli/src/system/active-app/wayland-gnome.test.ts` (new) — tests for: extension present, extension missing, failure cap
4. `packages/cli/src/system/active-app/linux.ts` — in the pure-Wayland branch, delegate to `createWaylandGnomeProvider` (with fallback to `unsupported` + install hint)
5. `packages/cli/src/system/active-app/index.ts` — no change (linux provider handles dispatch)

## Plan: 1 task (small, contained)

### Task 1 — Wayland GNOME extension provider + linux dispatch

**Files:** `provider.ts` (extend deps), `wayland-gnome.ts` (new), `wayland-gnome.test.ts` (new), `linux.ts` (dispatch)

**Action:**

- `provider.ts`: add `DbusClient` interface with `createSessionBus(): DbusBus` (mirroring the session-monitor pattern). Add `dbusClient?: DbusClient` to `ActiveAppProviderDeps`.
- `wayland-gnome.ts`:
  - Constants: `WAYLAND_GNOME_SERVICE = 'org.gnome.Shell'`, `WAYLAND_GNOME_PATH = '/org/gnome/Shell/Extensions/WindowsExt'`, `WAYLAND_GNOME_INTERFACE = 'org.gnome.Shell.Extensions.WindowsExt'`, `EXTENSION_INSTALL_URL = 'https://extensions.gnome.org/extension/4974/window-calls-extended/'`.
  - `createWaylandGnomeProvider(deps, env)`: synchronously attempts to connect to the bus and call `FocusClass`. Returns either:
    - A polling provider (success) with `supportsActiveApp: true`
    - An unsupported provider (DBus or extension missing) that warns ONCE with the install hint, with `supportsActiveApp: false`
  - Polling loop: 500ms `setTimeout`, call `FocusClass` via the same bus connection, emit on change, count consecutive failures, stop at 5.
  - The bus is connected lazily inside `start()` to avoid holding a connection if the provider is never started.
- `linux.ts`: in the `isPureWayland` branch, call `createWaylandGnomeProvider(deps, env)`. If it returns a `supportsActiveApp: true` provider, use it. If `false`, wrap the result in a one-time install-hint log (or let the provider itself do the log when started).
- `wayland-gnome.test.ts`:
  - Test: extension present — provider returns `supportsActiveApp: true`, emits snapshots on poll, stops on `stop()`.
  - Test: extension missing — `FocusClass` throws `ServiceUnknown`, provider returns `supportsActiveApp: false`, logs the install hint ONCE across multiple `start()` calls.
  - Test: 5-strike cap on transient DBus errors during polling.

**Verify:** `pnpm --filter sireno-deck-cli test src/system/active-app` passes; `pnpm --filter sireno-deck-cli exec tsc --noEmit` no new errors; `pnpm exec oxlint packages/cli/src/system/active-app` clean.

**Done:** Pure-Wayland + GNOME host with the extension installed gets the same active-app behavior as X11. Pure-Wayland + GNOME host without the extension gets a one-time install hint with the URL and explanation. Pure-Wayland + non-GNOME (KDE, etc.) silently no-ops like before.

## must_haves (post-execution verification)

- New `createWaylandGnomeProvider` exported from `src/system/active-app/wayland-gnome.ts`
- `linux.ts` dispatches to it on pure-Wayland via `isPureWayland`
- When the GNOME extension is reachable: `provider.supportsActiveApp === true`, snapshots emit on poll, `FocusClass` is the source of `ownerName`
- When the GNOME extension is missing: `provider.supportsActiveApp === false`, **one** warning logged at startup with the extension URL and the reason, no further warnings on repeated `start()`
- Failure cap (5 consecutive errors) matches the linux fix
- `dbusClient` is injectable for tests (no real bus connection in unit tests)
- All 18 existing active-app tests still pass; 3+ new tests pass
- `tsc --noEmit` clean; `oxlint` clean

## Out of scope

- KDE / Sway / other Wayland compositor support (no equivalent extension in this codebase's scope)
- Showing the install hint in a UI (it's just a log line; a future "first-run wizard" could surface it)
- Auto-installing the extension (extensions.gnome.org doesn't expose a CLI installer; gnome-browser-connector exists but adds a heavy dep)
- Persisting the install state (the detection is fast enough to repeat at every boot)
