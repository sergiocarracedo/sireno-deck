---
phase: 07-os-providers
status: ready
mode: standard
gathered: 2026-06-24
---

# Phase 07: OS Providers - Context

**Gathered:** 2026-06-24
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Cross-platform OS integration: per-platform implementations of active-app, session-monitor, key-macro, and media providers, behind common interfaces so addons stay cross-platform. Linux uses D-Bus (`dbus-next`) + `xdotool`/`ydotool`/`dotool` + `playerctl`; macOS uses `osascript`; Windows uses PowerShell + UIA. Pure-Wayland without gnome-shell remains unsupported (locked from PROJECT.md).

Out of scope (deferred to later phases): service-manager integration, the media-player *addon* itself (Phase 09), npm-published providers. This phase delivers the provider *interfaces* + per-platform implementations; addons consume them in Phase 09.

</domain>

<decisions>
## Implementation Decisions

### A. Provider interface scope

- **active-app:** returns `{ name: string, windowTitle: string | null, processId: number | null }`. No icon. No PID-based process handle (would be Linux-only and add nothing for the overlay-deck use case).
- **session-monitor:** emits `locked` / `unlocked` / `idle` events (idle after a configurable threshold, default 5 min). No suspend/resume tracking.
- **key-macro:** exposes `sendKey(comboOrText: string)`. The parser auto-detects: input matching the combo grammar (`mod+mod+key` where each `mod` is `ctrl`/`alt`/`shift`/`meta`/`super`/`hyper` and `key` is a key name OR a single literal character) is parsed as a combo; anything else is sent as literal keystrokes (works for emojis: `sendKey("😀")` types the emoji on the active app). This matches how `xdotool key` / `osascript keystroke` naturally behave.
- **media:** full transport (`play` / `pause` / `toggle` / `next` / `previous`) + metadata (`getCurrent(): { title, artist, album, artUrl } | null`) + `onChange(handler)` event subscription. Sufficient for the `media-player` addon to display live track info in Phase 09.

### B. Linux key-macro provider selection

- **Probe order at init:** `xdotool` → `ydotool` → `dotool`. First found wins. Choice cached in provider instance.
- **Session detection:** read `$XDG_SESSION_TYPE` once. On `x11` prefer `xdotool`; on `wayland` prefer `ydotool`; on anything else (or unset) walk the full fallback chain. Probe order is per-session, not hard-coded.
- **Active-app strategy:** try `org.gnome.Shell` D-Bus session-bus call (`Eval` to read `global.display.focus_window`) first; on any D-Bus error fall back to `/proc/$PID/comm` of the foreground process. This covers gnome-Wayland (D-Bus works) and pure-X11 without gnome-shell (D-Bus fails fast, /proc fallback works) in a single code path.

### C. Failure mode

- **Init failure** (no key-macro tool, D-Bus unreachable, no media service): provider factory logs a single `WARN` line naming the missing capability and returns a *null provider* — same interface, methods resolve with no effect (or return `null` for `getCurrent`). Addons see clear warnings; nothing crashes. The CLI startup does not block.
- **Per-call failure** (e.g. `sendKey` times out, `getCurrent` returns `null` while a player is restarting): provider **throws** a typed `ProviderError` with `.code: 'NOT_AVAILABLE' | 'TIMEOUT' | 'EXEC_FAILED' | 'PARSE_ERROR'`. The action executor (Phase 03) catches and logs `'action failed'`. No silent swallowing.

### D. process_names matching for overlay decks

- **Match language:** glob patterns. Each `process_names` entry is a glob (substr match; `*` wildcard; `|` alternation; case-insensitive). User's `decks.chrome.process_names: [chrome]` matches `'Google Chrome'`, `'Chromium'`, `'chrome'`. Power-user patterns like `['spotify|*apple music*']` work without new config syntax.
- **Match location:** runtime layer (`packages/cli/src/deck/runtime.ts`). Providers return raw `{ name, windowTitle, processId }` and know nothing about user config.
- **Poll cadence:** runtime polls active-app every **1s**, applies glob matching, and switches the active overlay deck on change. Switch is **debounced 200ms** to avoid overlay thrash when focus bounces between windows.
- **Match target:** substring of `name` OR `windowTitle` (so e.g. `'terminal'` matches whether the OS reports the app name or the window title).

### Carrying forward from earlier phases

- **Wrapper + interface pattern** (Phase 06): each provider is wrapped behind its own interface; native module calls (`dbus-next`, `execa`) never leak into callers. Mocked at module boundary with `vi.mock`.
- **Factory + probe pattern** (Phase 06 device-selection): `getActiveAppProvider({ platform, env, dbusClient, executor, logger })` — all probes and clients are injectable for tests.
- **Action executor** (Phase 03) already runs `/bin/sh -c "cmd"` on Linux. The new key-macro provider replaces the Linux shell-out for keys specifically (more reliable than `/bin/sh -c "xdotool key …"` for combo parsing).
- **Non-goal reaffirmed:** no pure-Wayland (gnome-shell or X11 only) — `Wayland gnome variant` is the only Wayland we support.

### Agent's Discretion

- Exact idle threshold default (5 min chosen, but `provider.configure({ idleMs })` allows override).
- D-Bus connection retry/backoff within a single poll cycle.
- Parser tolerance: `Ctrl+T` vs `ctrl+t` (case), `super` vs `cmd` (Linux vs mac), ` ` (space) as separator vs `+` in combo strings.
- Whether to expose `pid → app name` reverse-lookup via D-Bus for richer metadata (not required for overlay matching).

</decisions>

<specifics>
## Specific Ideas

- User wants emojis to be sendable through `sendKey("😀")` (passthrough to platform key send), not parsed as combos.
- User wants glob patterns on `process_names` (not just substrings or exact match) — power-user friendly without exotic config syntax.
- "If a tool is missing, warn but don't crash" — preferred over hard fail at startup. The user often runs sireno-deck on machines where not every addon is fully wired; partial functionality is fine.
- Provider interfaces are intentionally narrow: most calls return a single object (not callbacks) so addons can use them with simple `await provider.getActive()` patterns. Exception: `onChange(handler)` is event-style because the runtime needs to react to media-player changes.
- The session-monitor is the *only* provider that emits events; active-app and key-macro are pull-based. This keeps the runtime loop simple (one timer per provider type).
- Idle event useful for the `system-status` addon (turn off LEDs to save power) — explicit user requirement.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PLAN.md` — section 16 (OS-specific providers)
- `.planning/PROJECT.md` — R15, R16, non-goals (no pure-Wayland)
- Legacy: `/works/opensource/sireno-deck/packages/cli/src/system/active-app/` — reference impls (do not copy)
- Legacy: `/works/opensource/sireno-deck/packages/cli/src/system/key-macro/parser.ts` — combo grammar reference
- Legacy: `/works/opensource/sireno-deck/packages/cli/src/system/session-monitor.ts` — session event types
- `@elgato-stream-deck/node` integration patterns from Phase 06 (mock + factory)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`@/deck/host-context.ts`** — `HostContext` already exists (hostname, platform, userInfo, arch). Providers can read it instead of pulling `os.platform()` themselves.
- **`@/action/executor.ts`** — `createActionExecutor({ host })` pattern is the right model for the new provider factories (`createXxxProvider({ platform, env, executor, logger })`).
- **`@/core/pub-sub`** — runtime already uses this for `runtime:activeDeck` / `runtime:invalidate`. Provider `onChange` events can publish to it directly, no separate event bus.
- **`@/device/registry.ts`** — module-level factory + injection pattern; providers should follow it.

### Established Patterns

- Wrapper + interface: provider exposes a stable TypeScript interface; the implementation module is mocked in tests.
- `vi.mock(...)` at module boundary: providers import `dbus-next` and `execa` at the top level; tests mock those modules.
- Probe + log + null-provider: same pattern Phase 06 uses for missing Stream Deck devices.
- Errors with `.code`: Phase 03 `Runtime` already exports a `RuntimeError` shape; new `ProviderError` should follow it.

### Integration Points

- **CLI `preflight` in `run.ts`** (Phase 06) is where providers get instantiated: `preflight` loads config → instantiates `AddonRegistry` → instantiates the runtime → passes the active-app provider to the runtime.
- **Runtime `createRuntime`** (Phase 03) needs new methods: `setActiveAppProvider(provider)`, internal polling loop for active-app + session + media.
- **Frontend WS protocol v3** (Phase 04) already carries `runtime:activeDeck`. New state events (`session:locked`, `idle`, `media:track-changed`) are *optional* additions — defer to a later phase if out of scope. Phase 07 just needs the provider interfaces; wiring to WS can land in Phase 09 (builtin-addons).
- **`@inquirer/prompts`** for any user-facing prompts (e.g. "missing key-macro tool, continue?"). Standard usage.

</code_context>

<deferred>
## Deferred Ideas

- **Front-end display of provider state** (which tool was picked, current active app) — UX layer; not needed for the provider interfaces themselves. Could land in Phase 08 (themes) or 09.
- **Wiring provider state to WS bridge** (broadcast `session:locked`, `media:track-changed` to frontend) — Phase 09 (builtin-addons) or later.
- **Provider hot-swap if a tool becomes available mid-session** (e.g. user installs ydotool while running) — out of v1 scope. Probe at startup is enough.
- **Per-app command routing** (e.g. only run `key_macro` when the foreground app is in `process_names`) — already covered by the overlay-deck mechanism; no new feature.
- **Multi-device overlay coordination** — Project non-goal (R3 mentions reserved slot but not multi-overlay coordination).

</deferred>

---
_Phase: 07-os-providers_
_Context gathered: 2026-06-24_
