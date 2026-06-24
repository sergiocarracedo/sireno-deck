---
phase: 07-os-providers
status: research-complete
mode: standard
gathered: 2026-06-24
sources:
  - https://www.npmjs.com/package/dbus-next (npm 0.10.2, published 2020)
  - https://github.com/mullvad/windows-rs (referenced for Windows UIA)
  - /works/opensource/sireno-deck/packages/cli/src/system/ (legacy code, primary reference)
---

# Phase 07: OS Providers — Research

## Don't Hand-Roll

- **D-Bus on Linux** — use **`dbus-next@^0.10.0`** (still the standard Node D-Bus library; no successor). [VERIFIED: npm registry 2026-06] [ASSUMED: no replacement exists as of 2026-06]. `node-dbus` is older, `dbus-native` is a fork with known issues. dbus-next supports session bus + system bus + low-level Message API.
- **Active window on X11/XWayland** — use **`get-windows@^9.0.0`** package (the legacy code uses it). It wraps xdotool's `getactivewindow` + `_NET_ACTIVE_WINDOW` X11 atom. Avoid shelling out to xdotool from a polling loop (process spawn cost).
- **Media on Linux** — use **`playerctl@^2.0.0`** (MPRIS CLI) wrapped via `execa`; do not build an MPRIS D-Bus client from scratch. playerctl handles player discovery, metadata parsing, and event subscription.
- **Windows UIA** — use **PowerShell + `System.Windows.Automation`** (built-in). Do not try to use `node-uiautomation` or similar native bindings — they break with every Windows release.
- **macOS** — use **osascript** (built-in) for everything. Do not install `node-mac-system-events` or similar; osascript covers app, window, key, media, session.

## Common Pitfalls

- **D-Bus "session bus" is per-login-session** [VERIFIED: dbus-next docs]. `dbus-next.sessionBus()` returns `null` when there's no graphical session (e.g. daemon launched from systemd without user env). The legacy fallback chain (get-windows → dbus-after-N-failures) handles this. We adopt a single-code-path approach: try D-Bus first, fall back to `/proc/$PID/comm` (per CONTEXT B.2).
- **D-Bus BigInt default** [VERIFIED: dbus-next docs]. `dbus-next` uses native BigInt for INT64/UINT64 by default (Node ≥ 10.8). For active window IDs (which are u32) it doesn't matter, but for `playerctl` integration via custom D-Bus binding it would. We use `playerctl` CLI (not D-Bus direct), so this is irrelevant.
- **D-Bus ProxyObject teardown** [CITED: dbus-next example]. Long-lived `bus.getProxyObject()` references keep the bus alive. Must call `bus.disconnect()` on shutdown or the Node process hangs. The session monitor's `stop()` method must call this.
- **GNOME ScreenSaver "ActiveChanged"** [VERIFIED: dbus API, gnome docs]. Emits `bool` for locked state. Doesn't fire on "wake from sleep" without a lock — separate signal.
- **GNOME IdleMonitor** is in `org.gnome.Mutter.IdleMonitor` (Mutter 40+). The D-Bus call: `GetIdletime()` returns uint64 ms. Older desktops don't have this. We treat absence of the service as "idle unsupported" — log warn, return null.
- **playerctl missing** is common (headless servers, minimal installs). The CONTEXT C.1 design is "log warn + null provider"; the existing CLI patterns (Phase 06 device selection) follow this.
- **osascript hangs** on macOS when the user is not logged in (no graphical session). We probe with `osascript -e 'tell application "System Events" to get name of every process'` once at init; if it hangs >2s, kill and return null provider.
- **PowerShell SendKeys** is restricted in some Windows contexts (UAC, RDP). Addons that need to send keys to elevated apps will fail. We surface the failure via the typed `ProviderError` — caller decides.
- **process_names glob matching** needs to be both substring and wildcard. Naive `String.includes` won't handle `*chrome*|firefox*` correctly. Use a proper glob-to-regex conversion (picomatch is already a transitive dep; use it).
- **Polling vs events conflict** — D-Bus `PropertiesChanged` signals are nice, but mac/Windows don't have an equivalent. Sticking to polling-everywhere is simpler. Per CONTEXT D.3: 1s poll + 200ms debounce.
- **BigInt JSON serialization** — pino's `JSON.stringify` may mishandle BigInt. Provider interfaces should return `number` (not `bigint`) for IDs.

## Existing Patterns in This Codebase

- **Factory + probe + log-warn-on-null** (Phase 06 `device-selection.ts`): the canonical pattern. The new providers follow the same shape: `getActiveAppProvider({ platform, env, deps, logger })` returns a `null` provider when init fails.
- **vi.mock at module boundary** for native modules. Used in `device.test.ts`, `browser-renderer.test.ts`, `protocol.test.ts`, `emulator-mode.test.ts`. All use `vi.mock("module-name", () => ({ ... }))` then dynamic `await import()` to get typed refs.
- **Wrapper + interface pattern** (Phase 06): the SDK never leaks. `connectStreamDeck` returns our `StreamDeckDevice` interface. Same applies here — D-Bus proxy never leaks to addon code.
- **Atomic write** for files (`.tmp` + rename). Used in `device-config.ts` for `device.json`. Not needed for Phase 07 (no on-disk state from providers).
- **Action executor pattern** (Phase 03) for shell-out: `execa("/bin/sh", ["-c", cmd])`. We replace the `/bin/sh -c "xdotool key …"` pattern with a typed `sendKey()` provider call.

## Recommended Approach

### Architecture (4 layers)

1. **Interfaces** (`packages/cli/src/system/provider.ts`):
   - `ActiveAppProvider`: `getActive(): Promise<ActiveAppSnapshot | null>`, `subscribe(handler): () => void`
   - `SessionProvider`: `getState(): SessionState`, `subscribe(handler): () => void`
   - `KeyMacroProvider`: `sendKey(comboOrText: string): Promise<void>` (throws `ProviderError`)
   - `MediaProvider`: `transport.play/pause/...`, `getCurrent(): Promise<MediaMetadata | null>`, `onChange(handler): () => void`
   - `ProviderError` class with `.code: 'NOT_AVAILABLE' | 'TIMEOUT' | 'EXEC_FAILED' | 'PARSE_ERROR'`
   - `createNullProvider(name)`: returns a no-op provider for unsupported platforms

2. **Platform impls** — one folder per capability, one file per platform (`linux.ts`, `darwin.ts`, `windows.ts`).
3. **Factory** — `getActiveAppProvider({ platform, env, deps, logger })` etc. (4 factories, one per capability).
4. **Runtime integration** — the runtime polls active-app via the provider, applies glob patterns to `process_names`, switches overlay deck on match.

### Library choices (locked from CONTEXT + verified)

| Capability | Linux | macOS | Windows |
|---|---|---|---|
| Active app | `dbus-next` + `/proc/$PID/comm` fallback | `osascript -e 'tell app "System Events" to ...'` | PowerShell `System.Windows.Automation` |
| Session | `dbus-next` (gnome ScreenSaver + Mutter.IdleMonitor) | `osascript` (loginwindow idle / screen lock) | PowerShell session events |
| Key macro | `xdotool key` (X11) / `ydotool` (Wayland) / `dotool` (fallback) via `execa` | `osascript keystroke` | PowerShell `SendKeys` |
| Media | `playerctl` (MPRIS) via `execa` | `osascript` (Spotify, Music) | PowerShell SMTC |

### Files to create

- `packages/cli/src/system/provider.ts` — interfaces + `ProviderError` + null providers
- `packages/cli/src/system/active-app/{index,linux,darwin,windows}.ts`
- `packages/cli/src/system/session-monitor/{index,linux,darwin,windows}.ts`
- `packages/cli/src/system/key-macro/{index,linux,darwin,windows,parser}.ts`
- `packages/cli/src/system/media/{index,linux,darwin,windows}.ts`
- `packages/cli/src/system/glob-match.ts` — picomatch wrapper for `process_names`
- `packages/cli/src/deck/runtime.ts` — add `setActiveAppProvider`, polling loop
- `packages/cli/src/cli/commands/run.ts` — wire providers into preflight
- Tests: each provider file gets a `*.test.ts` next to it (mocked at module boundary)

### Dependencies to add

- `dbus-next@^0.10.0` — already in legacy deps, copy from `packages/cli/package.json` of legacy
- `get-windows@^9.0.0` — already in legacy deps
- `playerctl` — system binary, not npm
- `picomatch@^4.0.0` — for glob matching, may already be transitive
- `xdotool`, `ydotool`, `dotool` — system binaries (probed at runtime)

### Trust hierarchy per platform (decisions from CONTEXT B.1, C)

- Linux key-macro: probe `xdotool → ydotool → dotool` once at init. First found wins. XDG_SESSION_TYPE reorders preference.
- Linux active-app: D-Bus first, `/proc` fallback. Single code path.
- macOS: always `osascript`. Probe nothing.
- Windows: always PowerShell. Probe nothing.

### Failure semantics (CONTEXT C)

- Init failure (no D-Bus, no xdotool, etc.) → `createXxxProvider` returns a `nullProvider` + logs WARN.
- Per-call failure (e.g. `sendKey` times out) → throws `ProviderError({ code: 'EXEC_FAILED' })`.
- Caller (action executor) catches `ProviderError` and logs `'action failed'`.

### Open questions for the user (already captured in CONTEXT, no new ones)

None — CONTEXT.md is sufficient.

---

_Phase: 07-os-providers_
_Research captured: 2026-06-24_
