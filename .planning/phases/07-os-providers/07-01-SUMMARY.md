---
phase: 07-os-providers
plan: 07-01
wave: 1
depends_on: []
files_created:
  - packages/cli/src/system/provider.ts
  - packages/cli/src/system/active-app/{linux.ts,index.ts,linux.test.ts}
  - packages/cli/src/system/session-monitor/{linux.ts,index.ts,linux.test.ts}
  - packages/cli/src/system/key-macro/{parser.ts,linux.ts,index.ts,parser.test.ts,linux.test.ts}
  - packages/cli/src/system/media/{linux.ts,index.ts,linux.test.ts}
files_modified:
  - packages/cli/package.json
  - pnpm-lock.yaml
autonomous: true
---

# Phase 07 Plan 01 — Interfaces + Linux Implementations

## What was built

- `provider.ts` — 4 provider interfaces (`ActiveAppProvider`, `SessionProvider`, `KeyMacroProvider`, `MediaProvider`), `ProviderError` with `.code` discriminator, null-provider factory for each, `withTimeout` helper.
- Linux active-app: D-Bus `org.gnome.Shell` Eval → JSON parse, with `/proc` fallback via `xdotool getactivewindow` / `xprop`.
- Linux session-monitor: `org.gnome.ScreenSaver` for `locked`/`unlocked` events + `org.gnome.Mutter.IdleMonitor` for idle polling. Resilient init: ScreenSaver works even without IdleMonitor.
- Linux key-macro: probe `xdotool → ydotool → dotool` at init (XDG_SESSION_TYPE reorders: `x11` prefers xdotool, `wayland` prefers ydotool), `parseCombo()` parser detects combo vs literal text (handles emojis), `type --` for literal.
- Linux media: `playerctl` probe, transport (play/pause/next/previous), metadata via `--format "{{ title }}\t{{ artist }}\t..."`, 2s onChange poll.
- Factory `index.ts` for each capability dispatches on platform. macOS/Windows throw `UNSUPPORTED_PLATFORM` (Plans 03, 04 will replace with real impls).

## Tests added (53)

- `parser.test.ts` (18): combo parsing, modifier aliases, case-insensitivity, emoji passthrough, known-key validation
- `key-macro/linux.test.ts` (7): probe order, wayland fallback, literal text, emoji, EXEC_FAILED, TIMEOUT
- `active-app/linux.test.ts` (5): D-Bus Eval, /proc fallback, null snapshot, subscriber change detection, stop disconnects
- `session-monitor/linux.test.ts` (5): initial state, locked state, ActiveChanged signal, null on init failure, stop disconnects
- `media/linux.test.ts` (5): probe, transport, getCurrent metadata, null on empty output, onChange polling

## must_haves

- [x] `provider.ts` exports all 4 provider interfaces + `ProviderError` + null providers + `withTimeout`
- [x] `dbus-next` and `get-windows` installed
- [x] Linux active-app: D-Bus first, /proc fallback, poll loop, null on init failure
- [x] Linux session: ScreenSaver signal + idle poll, null on init failure
- [x] Linux key-macro: probe xdotool/ydotool/dotool, parseCombo detection, literal text + emoji, null on init failure
- [x] Linux media: playerctl transport + metadata + onChange, null on init failure
- [x] Barrel `index.ts` files for each capability switch on platform
- [x] All tests pass (53)
- [x] typecheck + lint clean (0 warnings)

## Decisions / deviations

- `withTimeout` lives in `provider.ts` (not its own file) — small, used by 3 of 4 impls.
- `createNullMediaProvider` transport methods are `async` so they return rejected Promises (synchronous throws break `expect.rejects.toBeInstanceOf`).
- `parseMetadata` in media/linux.ts puts title FIRST in the format string to match column order in the parser. Reordered earlier draft had artist first.
- Linux session init is split into two try/catch blocks: ScreenSaver failure → null provider; IdleMonitor failure → keep ScreenSaver, just disable idle polling.
- `IDLE_MONITOR` interface uses `org.gnome.Mutter.IdleMonitor` (Mutter 40+). Older desktops don't have it; we treat that as "idle polling disabled" rather than total failure.

## Notes for downstream

- Plan 02 (Runtime integration) needs to call `setActiveAppProvider(provider)` on the runtime; provider interface is `ActiveAppProvider` from `provider.ts`.
- Plan 03 (macOS) and Plan 04 (Windows) replace the `throw UNSUPPORTED_PLATFORM` in the `index.ts` barrels with the new darwin/windows files.
- All Linux impls take a `CommandExecutor` / `LinuxDbusBus` injection — make sure Plan 02's preflight wiring instantiates these with `execa` and `dbus-next.sessionBus()`.
