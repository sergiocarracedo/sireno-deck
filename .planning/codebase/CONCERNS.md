# Concerns

Tech debt, fragile areas, security posture, and known unknowns. Anything in
here should be read before planning a feature that touches the area.

_Updated: 2026-07-14 · Source: full codebase scan (374 TS/TSX files, ~18.5K
non-test lines, ~11.5K test lines)_

---

## Tech Debt

### Dead / suspect code

- **`void exec` unused import** in `cli/commands/run.ts:715` — `exec` from
  `node:child_process` is imported at line 1 but only consumed by the
  `void exec` discard at EOF. The actual exec calls use `execa`. The import
  and void line are dead weight; remove both.
- **`void store`** in `deck/runtime.ts:324` — `store` is destructured from
  options but only silenced with `void store`. The store is threaded through
  the runtime interface but never read inside `createRuntime`. Verify whether
  the store needs to live here or belongs in the caller.
- **`test-buildin` addon registered in production** —
  `builtin-addons/test-buildin/` (note: typo "buildin" vs "builtin") ships
  with the production build and is registered in `register-builtins.ts:29`.
  It exists to exercise the icon pipeline. Should be gated behind a dev
  flag or removed from the production registration list.

### `process.env` as IPC bus

Seven production files mutate `process.env` at runtime to pass config to
child processes and Vite virtual modules:

| Variable | Set in | Purpose |
|---|---|---|
| `SIRENO_THEME_DIR` | `cli/commands/run.ts:320`, `emulator-mode.ts:239` | Frontend Vite reads it for `@source` scanning |
| `SIRENO_THEME` | `cli/commands/run.ts:321`, `emulator-mode.ts:234` | JSON blob of theme metadata |
| `SIRENO_THEME_NAME` | `cli/commands/run.ts:326` | Theme name for frontend |
| `SIRENO_ADDONS` | `cli/commands/run.ts:502` | JSON array of addon specs for virtual module |
| `SIRENO_LOG_VERBOSE` | `util/logger.ts:149` | Log verbosity flag |
| `SIRENO_LOG_JSON` | `util/logger.ts:150` | JSON log output flag |
| `SIRENO_CWD` | `cli/cwd.ts:2` | Original working directory snapshot |

`process.env` is global mutable state. Two startup paths (`run.ts` and
`emulator-mode.ts`) independently set the same variables. Not a bug today,
but a latent race if concurrent test runners or worker threads ever share
a process.

### Type assertion hot-spots

Files with the heaviest `as` usage (type assertions / casts):

| File | `as` count | Nature |
|---|---|---|
| `addon/registry.ts` | 6 | Deck factory vs definition discrimination |
| `addon/loader.ts` | 6 | Dynamic import result casting |
| `builtin-addons/core/index.ts` | 5 | Manifest type narrowing |
| `config/reference-expander.ts` | 4 | YAML unknown→object casts |
| `core/icon-asset-registry.ts` | 4 | Asset source type narrowing |

These are not unsafe per se (most guard with runtime checks first), but the
`addon/registry.ts` deck-factory discrimination (`entry as AddonDeckFactory`
/ `entry as AddonDeckDefinition`) is the most fragile — it's the dual
`AddonDeckFactory` vs `AddonDeckDefinition` shape that ARCHITECTURE.md §8
P4+P5 plans to deprecate.

### Outdated / RC dependencies

| Package | Version | Concern |
|---|---|---|
| `typescript` | `7.0.1-rc` | Release candidate. Watch for breaking changes before stable release. |
| `oxfmt` / `oxlint` | `latest` | Pinned to `latest` — reproducibility risk. Pin to a specific version. |
| `zod` | `^4.4.3` | Major version 4 is recent; verify all `safeParse` patterns are compatible. |
| `yargs` | `^18.0.0` | Major bump from 17; CLI arg parsing may have subtle behavior changes. |

---

## Circular Dependencies / Coupling Concerns

### `cli/commands/` ↔ `outputClient/` bidirectional import

- `cli/commands/run.ts` imports from `@/outputClient` (line 63)
- `outputClient/emulator.ts` imports from `../cli/commands/emulator-mode`
  (line 19, relative path)
- `outputClient/real.ts` imports from `../cli/commands/emulator-mode`
  (line 15, relative path)

This is not a runtime circular import (the files don't transitively import
each other), but it's a code-organization smell. The `emulator-mode.ts`
helpers (`killChild`, `spawnFrontendVite`, `spawnEmulatorVite`,
`resolveFrontendCwd`, `resolveEmulatorCwd`, `findWorkspaceRoot`) are
shared between both pipelines but live in `cli/commands/`. Consider
moving shared helpers to a `util/` or `render/` module.

### `deck/` imports from `cli/`

`cli/commands/addon-decks.ts` imports from `@/deck/` and
`cli/commands/run.ts` imports heavily from `@/deck/`. Meanwhile
`deck/addon-handler-bridge.ts` imports from
`@/cli/commands/addon-registry` (line 10). This creates a cross-layer
dependency between the CLI layer and the deck-runtime layer.

---

## Large Files (>300 lines, non-test)

| Lines | File | Risk |
|---|---|---|
| 717 | `cli/commands/run.ts` | God function — `runPipeline` + `loadConfigAndTheme` + `setupAddonServices` + `preflight` all in one file. Top candidate for decomposition. |
| 455 | `deck/runtime.ts` | Core runtime. Well-structured but the active-app overlay loop (lines 341–432) is embedded inside the runtime closure — could be extracted. |
| 390 | `addon/loader.ts` | Dynamic import + npm install logic. Mixed concerns (file I/O, child process, module loading). |
| 381 | `builtin-addons/emoji-selector/support.ts` | Emoji data + deck generation. Data-heavy but stable. |
| 378 | `deck/addon-handler-bridge.ts` | Wires addon backends to the runtime. Complex but well-factored. |
| 369 | `cli/commands/addon-registry.ts` | Addon scanning + manifest loading. Overlaps with `addon/loader.ts`. |
| 341 | `core/gesture-state.ts` | State machine. Well-tested. |
| 333 | `vite/virtual-modules.ts` | Code generation for virtual modules. Necessary complexity. |

`cli/commands/run.ts` at 717 lines is the biggest single concern. It
contains four distinct responsibilities (preflight, config loading, addon
service wiring, and the main pipeline) that would benefit from extraction.

---

## Security Patterns

### Token handling

- **Daemon token**: 32 random bytes, base64url-encoded, stored at
  `$XDG_RUNTIME_DIR/sireno-deck/sireno-deck.token` with mode `0o600`.
  Token is generated once at `start`, written to disk, and read back by
  the HTTP server for per-request injection. **Good**: file permissions
  are locked down. **Risk**: token on disk is the single auth factor;
  any process with read access to `$XDG_RUNTIME_DIR` can impersonate
  the frontend.
- **WS handshake**: `hello` message carries `token`; bridge closes with
  code 4001 on mismatch. Handshake timeout is 5 seconds (configurable).
  **No replay protection** — the token is static for the daemon lifetime.

### Command execution surface

Two paths execute shell commands:

1. **`action/executor.ts`** — `execa("/bin/sh", ["-c", interpolated])`.
   Replaces `{{ host.hostname }}` etc. placeholders. Used by addon
   backends that accept `command` from config. **No sandboxing.** The
   config is user-authored YAML, so this is by-design, but any addon
   that constructs commands from dynamic data must validate inputs.

2. **`addon/loader.ts:253`** — `execa("npm", ["install", ...])` for
   auto-installing npm addons. Runs in `~/.cache/sireno-deck/`.

Both inherit `process.env` by default. The executor passes `runOptions.env`
which merges with `process.env` (line 76–77 of `executor.ts`).

### Path traversal

`cli/http-server.ts:53-59` has `resolveSafePath()` that normalizes and
validates the requested path stays within `distDir`. Correct implementation:
normalizes the path, then checks it starts with `rootDir + sep`. Only
serves under `/assets/` — other routes return 404. **Adequate for local
use.**

### WebSocket binding

All WS/HTTP servers bind to `127.0.0.1` (localhost only). The
`ws-bridge.ts` defaults to `host: "127.0.0.1"`, the HTTP server defaults
to `host: "127.0.0.1"`. **Correct for a local tool.** Don't expose the
ports to the network.

### Input validation

Config is validated by Zod schemas (`config/schemas.ts`) at load time.
Button configs are validated against per-addon `configSchema` in
`config/validation.ts`. **However**: unknown keys in config produce
warnings, not errors (line 90: "New keys are warnings, not errors").
This means typos in config silently pass.

---

## Performance Bottlenecks

### Browser renderer screenshot loop

`render/browser-renderer.ts` runs a Playwright headless → sharp slice →
device write loop at 500ms intervals (default). Every tick:
1. Full-page screenshot via Playwright
2. Sharp `metadata()` call
3. Per-key `sharp.extract().resize(72,72).removeAlpha().raw().toBuffer()`
4. Hash comparison per key
5. HID write for changed keys

For a 15-key device at 500ms, that's ~30 sharp operations per tick.
For a 32-key XL device, ~64 operations. **This is the throughput ceiling
for real mode.** The `BLANK_THRESHOLD = 20` detection (10 seconds of
no changes) helps diagnose HMR crashes but doesn't reduce load.

### State message fan-out

`state-publisher.ts` caches per-channel state and broadcasts on
`runtime.invalidate`. Addons with many channels (e.g., media with
player state + progress + volume) generate larger state messages. The
broadcast sends to all connected WS clients (typically 1–2, but
emulator + frontend is 2).

### Gesture state machine constants

`HOLD_ACTION_DELAY_MS` and `DOUBLE_TAP_DELAY_MS` are imported from
`core/gesture-state.ts` and used by both the real transport and the
emulator SPA. Currently hardcoded to 500ms each. ARCHITECTURE.md §7.4
mentions 200ms but the actual source code says 500ms — **verify which is
correct before adjusting timing.**

---

## Fragile Areas

### `cli/commands/run.ts` — `runPipeline`

The 717-line god function. It:
- Loads config and resolves theme
- Starts system providers (active-app, session, key-macro, clipboard)
- Builds the addon registry
- Starts the WS bridge
- Sets up addon services (bridge + subscriptions)
- Manages the device lifecycle
- Handles graceful shutdown

Any change here has a wide blast radius. The `setupAddonServices` function
(lines 136–272) is the most complex section — it subscribes to four
pub/sub channels and manages the addon lifecycle.

### `deck/system-back-injection.ts` — n-1 slot logic

Recently rewritten (`computeSystemButtonForSlotN1`). Returns the button
that fills the last slot on each deck based on deck type and nav stack
depth. Touch with care; coverage is partial.

### `addon-handler-bridge.ts` — addon lifecycle wiring

`bridgeAddonServices` (lines 38–378) wires every scanned addon's global
backend and per-button backends to the runtime. It:
- Imports each addon's module dynamically
- Sets up gesture listeners
- Registers pollers
- Calls `onLoad(ctx)` for global backends
- Mounts per-button handlers

The async nature (`await import(...)`) combined with the signal-based
cleanup makes error handling subtle.

### `builtin-addons/emoji-selector/` — deck generation

Emits per-category and per-page decks via `AddonDeckDefinition`. The
`support.ts` file (381 lines) contains the emoji data and deck
generation logic. Active area; depends on `defaultButton` semantics
that aren't yet fully resolved.

### `render/emulator-server.ts` and `render/vite-server.ts`

Both spawn child processes (`spawn()`) for Vite dev servers. They inherit
`process.env` via `{ ...(process.env as Record<string, string>) }` cast
(line 39 of `emulator-server.ts`). If env vars are modified between
spawns, the second server may see stale values.

---

## Known Bugs / Quirks

- **Emulator outer `ButtonFrame` no longer flashes on press.** The chrome
  SPA no longer tracks per-tile gesture state from server echoes; it only
  subscribes to `runtime:gesture:*` for the inner `ButtonSurface`. The
  outer frame's pressed/isHolding/holdProgress props are accepted but not
  driven. (ARCHITECTURE.md §9)
- **Two addon deck shapes coexist.** `AddonDeckFactory` (no config) and
  `AddonDeckDefinition` (config-aware) both live on `manifest.decks`. The
  factory shape is a footgun for addons needing per-instance config.
  Deprecation planned in P4+P5.
- **`gestureHandlers` default-deny** was just shipped. Pre-2026-07
  third-party addons may silently lose handlers. No compatibility shim
  decided yet.
- **Multi-row device support** (XL: 32 keys) ships as
  `DEFAULT_KEY_COUNT = 15`. XL users may get truncated layouts until
  grid computation handles multi-row properly.

---

## Areas to Plan Carefully

- **Any feature touching the addon manifest format** — propagates to all
  builtins + third-party addons. The dual shape (factory vs definition)
  is the main hazard.
- **Any change to the WS protocol** — must remain additive. Protocol
  version is still at 1 despite the gesture-stream changes.
- **Any change to gesture stream semantics** — three code paths must
  agree (real transport, emulator SPA, runtime listener).
- **Any refactor of `cli/commands/run.ts`** — the 717-line file needs
  decomposition, but the interleaved async lifecycle makes extraction
  non-trivial.
- **`process.env` IPC pattern** — if replacing with a proper config
  object, both `run.ts` and `emulator-mode.ts` set overlapping variables
  that Vite virtual modules read at import time.
